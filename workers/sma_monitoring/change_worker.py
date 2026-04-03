"""
SMA Change Detection Worker

Detects material changes between document versions using AI-powered comparison.

Architecture:
- Version comparison by content hash
- Field-level change detection
- MiniMax M2.7 for semantic change analysis
- Change event storage in fmss_sma_change_events
- Material change classification

Usage:
    python change_worker.py --provider jpmorgan
    python change_worker.py --all-active
    python change_worker.py --document-id <uuid>
"""

import os
import sys
import argparse
from datetime import datetime
from typing import List, Dict, Optional, Tuple
import psycopg2
from psycopg2.extras import RealDictCursor
import logging
import json
import requests

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Environment variables
DATABASE_URL = os.getenv('DATABASE_URL')
MINIMAX_API_KEY = os.getenv('MINIMAX_API_KEY')
MINIMAX_BASE_URL = os.getenv('MINIMAX_BASE_URL', 'https://api.minimax.chat/v1')

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable not set")
if not MINIMAX_API_KEY:
    raise ValueError("MINIMAX_API_KEY environment variable not set")


class FieldComparator:
    """
    Deterministic field-level comparison.
    """

    SIGNIFICANT_THRESHOLDS = {
        'aum_amount': 0.05,  # 5% change
        'minimum_investment': 0.10,  # 10% change
        'management_fee_bps': 5,  # 5 bps change
        'ytd_return': 2.0,  # 2% absolute change
        'one_year_return': 3.0,  # 3% absolute change
        'three_year_return': 2.0,
        'five_year_return': 1.5,
        'ten_year_return': 1.0,
    }

    @classmethod
    def compare_fields(cls, old_data: Dict, new_data: Dict) -> List[Dict]:
        """
        Compare two parsed documents field by field.
        Returns list of changes with severity classification.
        """
        changes = []

        # Text field changes
        text_fields = ['strategy_name', 'manager_name', 'benchmark']
        for field in text_fields:
            old_val = old_data.get(field)
            new_val = new_data.get(field)

            if old_val != new_val and (old_val or new_val):
                changes.append({
                    'field': field,
                    'old_value': old_val,
                    'new_value': new_val,
                    'change_type': 'text_change',
                    'severity': 'medium' if field == 'manager_name' else 'low'
                })

        # Numeric field changes
        numeric_fields = [
            'aum_amount', 'minimum_investment', 'management_fee_bps',
            'ytd_return', 'one_year_return', 'three_year_return',
            'five_year_return', 'ten_year_return', 'inception_return'
        ]

        for field in numeric_fields:
            old_val = old_data.get(field)
            new_val = new_data.get(field)

            if old_val is None or new_val is None:
                continue

            # Calculate change
            if field in ['aum_amount', 'minimum_investment']:
                # Percentage change
                if old_val > 0:
                    pct_change = abs((new_val - old_val) / old_val)
                    threshold = cls.SIGNIFICANT_THRESHOLDS.get(field, 0.05)

                    if pct_change >= threshold:
                        changes.append({
                            'field': field,
                            'old_value': old_val,
                            'new_value': new_val,
                            'change_type': 'percentage_change',
                            'change_magnitude': pct_change,
                            'severity': 'high' if pct_change >= 0.20 else 'medium'
                        })

            elif field == 'management_fee_bps':
                # Absolute basis points change
                abs_change = abs(new_val - old_val)
                threshold = cls.SIGNIFICANT_THRESHOLDS.get(field, 5)

                if abs_change >= threshold:
                    changes.append({
                        'field': field,
                        'old_value': old_val,
                        'new_value': new_val,
                        'change_type': 'fee_change',
                        'change_magnitude': abs_change,
                        'severity': 'high' if abs_change >= 10 else 'medium'
                    })

            elif 'return' in field:
                # Absolute percentage point change
                abs_change = abs(new_val - old_val)
                threshold = cls.SIGNIFICANT_THRESHOLDS.get(field, 2.0)

                if abs_change >= threshold:
                    changes.append({
                        'field': field,
                        'old_value': old_val,
                        'new_value': new_val,
                        'change_type': 'performance_change',
                        'change_magnitude': abs_change,
                        'severity': 'high' if abs_change >= 5.0 else 'medium'
                    })

        # Date field changes
        if old_data.get('inception_date') != new_data.get('inception_date'):
            changes.append({
                'field': 'inception_date',
                'old_value': old_data.get('inception_date'),
                'new_value': new_data.get('inception_date'),
                'change_type': 'date_change',
                'severity': 'low'
            })

        return changes


class MinimaxChangeAnalyzer:
    """
    AI-powered semantic change analysis using MiniMax M2.7.
    """

    def __init__(self, api_key: str, base_url: str):
        self.api_key = api_key
        self.base_url = base_url

    def analyze_changes(
        self,
        old_text: str,
        new_text: str,
        field_changes: List[Dict]
    ) -> Dict:
        """
        Use MiniMax to generate human-readable change summary.
        """
        prompt = self._build_change_prompt(old_text, new_text, field_changes)

        try:
            response = requests.post(
                f"{self.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "minimax-2.7",
                    "messages": [
                        {"role": "system", "content": "You are an expert financial analyst reviewing SMA strategy changes."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.1,
                    "max_tokens": 1000
                },
                timeout=30
            )

            response.raise_for_status()
            result = response.json()

            content = result['choices'][0]['message']['content']

            # Parse JSON response
            try:
                analysis = json.loads(content)
                return analysis
            except json.JSONDecodeError:
                # If not valid JSON, try to extract from markdown code block
                if '```json' in content:
                    json_str = content.split('```json')[1].split('```')[0].strip()
                    analysis = json.loads(json_str)
                    return analysis
                else:
                    # Fallback to raw text
                    return {
                        'summary': content,
                        'material_changes': [],
                        'severity': 'medium',
                        'advisor_action_required': False
                    }

        except Exception as e:
            logger.error(f"MiniMax change analysis failed: {e}")
            return {
                'summary': f"Change detection completed with {len(field_changes)} field changes",
                'material_changes': [c['field'] for c in field_changes],
                'severity': 'medium',
                'advisor_action_required': len(field_changes) > 3,
                'error': str(e)
            }

    def _build_change_prompt(self, old_text: str, new_text: str, field_changes: List[Dict]) -> str:
        """Build prompt for MiniMax change analysis."""

        field_summary = "\n".join([
            f"- {c['field']}: {c['old_value']} → {c['new_value']} (severity: {c['severity']})"
            for c in field_changes
        ])

        prompt = f"""You are analyzing changes between two versions of an SMA fact sheet.

**Detected Field Changes:**
{field_summary}

**Old Document Excerpt (first 1000 chars):**
{old_text[:1000]}

**New Document Excerpt (first 1000 chars):**
{new_text[:1000]}

**Task:**
Analyze these changes and provide:
1. A concise summary (1-2 sentences) of what changed
2. List of material changes that advisors should know about
3. Overall severity (low/medium/high)
4. Whether advisor action is required (true/false)

**Output JSON format:**
{{
  "summary": "Brief description of changes",
  "material_changes": ["change 1", "change 2"],
  "severity": "low|medium|high",
  "advisor_action_required": true|false,
  "recommended_actions": ["action 1", "action 2"] (if applicable)
}}

Focus on changes that impact investment decisions: performance, fees, strategy changes, manager changes.
"""
        return prompt


class ChangeWorker:
    """
    Main change detection orchestrator.
    """

    def __init__(self, db_url: str, minimax_api_key: str, minimax_base_url: str):
        self.db_url = db_url
        self.minimax = MinimaxChangeAnalyzer(minimax_api_key, minimax_base_url)

    def get_documents_with_multiple_versions(
        self,
        provider_id: Optional[str] = None,
        document_id: Optional[str] = None
    ) -> List[Dict]:
        """
        Get documents that have multiple versions (potential changes).
        """
        conn = psycopg2.connect(self.db_url)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        try:
            query = """
                SELECT d.id, d.provider_id, d.url, d.current_content_hash,
                       p.provider_key, p.provider_name,
                       COUNT(v.id) as version_count
                FROM fmss_sma_fact_sheet_documents d
                JOIN fmss_sma_providers p ON d.provider_id = p.id
                LEFT JOIN fmss_sma_fact_sheet_versions v ON d.id = v.document_id
                WHERE 1=1
            """

            params = []

            if provider_id:
                query += " AND d.provider_id = %s"
                params.append(provider_id)

            if document_id:
                query += " AND d.id = %s"
                params.append(document_id)

            query += """
                GROUP BY d.id, d.provider_id, d.url, d.current_content_hash,
                         p.provider_key, p.provider_name
                HAVING COUNT(v.id) > 1
                ORDER BY d.updated_at DESC
                LIMIT 100
            """

            cursor.execute(query, params)
            results = cursor.fetchall()

            return [dict(row) for row in results]

        finally:
            cursor.close()
            conn.close()

    def get_document_versions(self, document_id: str) -> List[Dict]:
        """Get all versions of a document, sorted by acquisition time."""
        conn = psycopg2.connect(self.db_url)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        try:
            cursor.execute("""
                SELECT id, document_id, version_number, content_hash,
                       file_path, file_size_bytes, acquired_at
                FROM fmss_sma_fact_sheet_versions
                WHERE document_id = %s
                ORDER BY acquired_at ASC
            """, (document_id,))

            results = cursor.fetchall()
            return [dict(row) for row in results]

        finally:
            cursor.close()
            conn.close()

    def get_parsed_data(self, document_id: str) -> Optional[Dict]:
        """Get parsed data for a document version."""
        conn = psycopg2.connect(self.db_url)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        try:
            cursor.execute("""
                SELECT *
                FROM fmss_sma_parsed_documents
                WHERE document_id = %s
            """, (document_id,))

            result = cursor.fetchone()
            return dict(result) if result else None

        finally:
            cursor.close()
            conn.close()

    def detect_changes(self, document: Dict) -> Optional[Dict]:
        """
        Detect changes for a document with multiple versions.
        """
        document_id = document['id']
        logger.info(f"Detecting changes for document: {document_id}")

        # Get all versions
        versions = self.get_document_versions(document_id)

        if len(versions) < 2:
            logger.info(f"Document {document_id} has only {len(versions)} version(s), skipping")
            return None

        # Compare latest two versions
        old_version = versions[-2]
        new_version = versions[-1]

        logger.info(f"Comparing version {old_version['version_number']} → {new_version['version_number']}")

        # Get parsed data (if available)
        parsed_data = self.get_parsed_data(document_id)

        if not parsed_data:
            logger.warning(f"No parsed data for document {document_id}, skipping change analysis")
            return None

        # For simplicity, we'll treat the parsed data as the "new" version
        # In a real implementation, you'd want to store parsed data per version
        # For now, we'll do field-level comparison if we have old parsed data

        # Deterministic field comparison
        # TODO: Get old parsed data for proper comparison
        # For now, we'll just use content hash difference
        content_changed = old_version['content_hash'] != new_version['content_hash']

        if not content_changed:
            logger.info(f"Content hashes match, no changes detected")
            return None

        # Get raw text from parsed data
        new_text = parsed_data.get('raw_text', '')

        # For demo purposes, we'll create a simple field changes list
        field_changes = [
            {
                'field': 'content_hash',
                'old_value': old_version['content_hash'][:16],
                'new_value': new_version['content_hash'][:16],
                'change_type': 'content_update',
                'severity': 'medium'
            }
        ]

        # AI-powered change analysis
        logger.info("Running AI-powered change analysis...")
        ai_analysis = self.minimax.analyze_changes(
            old_text='',  # We don't have old raw text easily accessible
            new_text=new_text,
            field_changes=field_changes
        )

        # Combine results
        change_data = {
            'document_id': document_id,
            'old_version_id': old_version['id'],
            'new_version_id': new_version['id'],
            'change_summary': ai_analysis.get('summary', 'Content updated'),
            'material_changes': ai_analysis.get('material_changes', []),
            'severity': ai_analysis.get('severity', 'medium'),
            'advisor_action_required': ai_analysis.get('advisor_action_required', False),
            'recommended_actions': ai_analysis.get('recommended_actions', []),
            'field_changes': field_changes,
        }

        return change_data

    def save_change_event(self, change_data: Dict) -> bool:
        """Save detected change to database."""
        conn = psycopg2.connect(self.db_url)
        cursor = conn.cursor()

        try:
            cursor.execute("""
                INSERT INTO fmss_sma_change_events (
                    id, document_id, old_version_id, new_version_id,
                    change_summary, material_changes_json, severity,
                    advisor_action_required, field_changes_json,
                    detected_at, created_at
                )
                VALUES (
                    gen_random_uuid(), %s, %s, %s, %s, %s, %s, %s, %s,
                    NOW(), NOW()
                )
            """, (
                change_data['document_id'],
                change_data['old_version_id'],
                change_data['new_version_id'],
                change_data['change_summary'],
                json.dumps(change_data['material_changes']),
                change_data['severity'],
                change_data['advisor_action_required'],
                json.dumps(change_data['field_changes'])
            ))

            conn.commit()
            logger.info(f"Saved change event for document {change_data['document_id']}")
            return True

        except Exception as e:
            logger.error(f"Failed to save change event: {e}")
            conn.rollback()
            return False
        finally:
            cursor.close()
            conn.close()

    def run(
        self,
        provider_key: Optional[str] = None,
        all_active: bool = False,
        document_id: Optional[str] = None
    ):
        """Main execution method."""

        # Get provider ID if provider_key provided
        provider_id = None
        if provider_key:
            conn = psycopg2.connect(self.db_url)
            cursor = conn.cursor()
            try:
                cursor.execute("SELECT id, provider_name FROM fmss_sma_providers WHERE provider_key = %s", (provider_key,))
                result = cursor.fetchone()
                if result:
                    provider_id, provider_name = result
                    logger.info(f"Starting change detection for provider: {provider_name}")
                else:
                    logger.error(f"Provider not found: {provider_key}")
                    return
            finally:
                cursor.close()
                conn.close()

        # Get documents with multiple versions
        documents = self.get_documents_with_multiple_versions(
            provider_id=provider_id,
            document_id=document_id
        )

        if not documents:
            logger.info("No documents with multiple versions found")
            return

        logger.info(f"Found {len(documents)} documents with multiple versions")

        # Detect changes for each document
        changes_detected = 0
        errors = 0

        for doc in documents:
            try:
                change_data = self.detect_changes(doc)
                if change_data:
                    if self.save_change_event(change_data):
                        changes_detected += 1
                    else:
                        errors += 1
            except Exception as e:
                logger.error(f"Error detecting changes for document {doc['id']}: {e}")
                errors += 1

        logger.info(f"\n✅ Change detection complete:")
        logger.info(f"   Documents analyzed: {len(documents)}")
        logger.info(f"   Changes detected: {changes_detected}")
        logger.info(f"   Errors: {errors}")


def main():
    parser = argparse.ArgumentParser(description='SMA Change Detection Worker')
    parser.add_argument('--provider', help='Provider key to detect changes for')
    parser.add_argument('--all-active', action='store_true', help='Detect changes for all active documents')
    parser.add_argument('--document-id', help='Specific document ID to analyze')

    args = parser.parse_args()

    if not any([args.provider, args.all_active, args.document_id]):
        parser.print_help()
        sys.exit(1)

    worker = ChangeWorker(DATABASE_URL, MINIMAX_API_KEY, MINIMAX_BASE_URL)
    worker.run(
        provider_key=args.provider,
        all_active=args.all_active,
        document_id=args.document_id
    )


if __name__ == '__main__':
    main()
