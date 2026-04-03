"""
SMA Parsing Worker

Extracts text from PDF fact sheets using PyMuPDF and parses structured fields.

Architecture:
- PyMuPDF (fitz) for PDF text extraction
- Deterministic regex patterns for field extraction
- Parsed data storage in fmss_sma_parsed_documents
- Fallback to AI extraction for complex/non-standard layouts

Usage:
    python parsing_worker.py --provider jpmorgan
    python parsing_worker.py --all-pending
    python parsing_worker.py --document-id <uuid>
"""

import os
import sys
import re
import argparse
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from pathlib import Path
import psycopg2
from psycopg2.extras import RealDictCursor
import logging
import json
from decimal import Decimal

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Environment variables
DATABASE_URL = os.getenv('DATABASE_URL')
STORAGE_PATH = os.getenv('STORAGE_PATH', './storage/fact_sheets')

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable not set")

# Import PyMuPDF
try:
    import fitz  # PyMuPDF
except ImportError:
    logger.error("PyMuPDF not installed. Run: pip install PyMuPDF")
    sys.exit(1)


class FieldExtractor:
    """
    Deterministic field extraction using regex patterns.

    Extracts common SMA fact sheet fields:
    - Strategy name
    - Manager name
    - Inception date
    - AUM
    - Minimum investment
    - Management fee
    - Performance metrics
    - Benchmark
    """

    # Common date patterns
    DATE_PATTERNS = [
        r'\b(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b',  # MM/DD/YYYY or MM-DD-YYYY
        r'\b([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})\b',  # January 1, 2024
        r'\b(\d{1,2}\s+[A-Z][a-z]+\s+\d{4})\b',  # 1 January 2024
    ]

    # Currency amount patterns
    CURRENCY_PATTERNS = [
        r'\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:million|mn|mm)?',
        r'(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:million|mn|mm)',
    ]

    # Percentage patterns
    PERCENTAGE_PATTERNS = [
        r'(\d+(?:\.\d+)?)\s*%',
        r'(\d+(?:\.\d+)?)\s*percent',
    ]

    @classmethod
    def extract_strategy_name(cls, text: str, filename: str = None) -> Optional[str]:
        """
        Extract strategy name from text or filename.
        Priority: Title line > filename > first header
        """
        # Try to find title (usually first non-empty line or largest font)
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        if lines:
            # First substantial line (not a date or number)
            for line in lines[:10]:
                if len(line) > 10 and not re.match(r'^[\d\s\-/]+$', line):
                    return line

        # Fallback to filename
        if filename:
            name = Path(filename).stem
            # Remove common suffixes
            name = re.sub(r'[-_](fact[-_]?sheet|fs|strategy).*$', '', name, flags=re.IGNORECASE)
            return name.replace('_', ' ').replace('-', ' ').strip()

        return None

    @classmethod
    def extract_manager_name(cls, text: str) -> Optional[str]:
        """Extract manager/firm name."""
        patterns = [
            r'(?:Manager|Managed by|Portfolio Manager|Adviser):\s*([A-Z][^\n]+)',
            r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+Asset Management',
            r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+Capital',
        ]

        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(1).strip()

        return None

    @classmethod
    def extract_inception_date(cls, text: str) -> Optional[str]:
        """Extract strategy inception date."""
        # Look for "inception" keyword nearby
        inception_section = re.search(
            r'(?:inception|established|commenced|started|since)[\s:]*([^\n]{1,50})',
            text,
            re.IGNORECASE
        )

        if inception_section:
            section_text = inception_section.group(1)
            for pattern in cls.DATE_PATTERNS:
                match = re.search(pattern, section_text)
                if match:
                    return match.group(1)

        return None

    @classmethod
    def extract_aum(cls, text: str) -> Optional[Dict]:
        """Extract assets under management."""
        aum_section = re.search(
            r'(?:AUM|Assets Under Management|Total Assets)[\s:]*([^\n]{1,100})',
            text,
            re.IGNORECASE
        )

        if aum_section:
            section_text = aum_section.group(1)
            for pattern in cls.CURRENCY_PATTERNS:
                match = re.search(pattern, section_text, re.IGNORECASE)
                if match:
                    amount_str = match.group(1).replace(',', '')
                    multiplier = 1
                    if 'million' in section_text.lower() or 'mn' in section_text.lower():
                        multiplier = 1_000_000
                    elif 'billion' in section_text.lower() or 'bn' in section_text.lower():
                        multiplier = 1_000_000_000

                    return {
                        'amount': float(amount_str) * multiplier,
                        'raw': match.group(0)
                    }

        return None

    @classmethod
    def extract_minimum_investment(cls, text: str) -> Optional[Dict]:
        """Extract minimum investment amount."""
        min_section = re.search(
            r'(?:Minimum Investment|Minimum|Account Minimum)[\s:]*([^\n]{1,100})',
            text,
            re.IGNORECASE
        )

        if min_section:
            section_text = min_section.group(1)
            for pattern in cls.CURRENCY_PATTERNS:
                match = re.search(pattern, section_text, re.IGNORECASE)
                if match:
                    amount_str = match.group(1).replace(',', '')
                    return {
                        'amount': float(amount_str),
                        'raw': match.group(0)
                    }

        return None

    @classmethod
    def extract_management_fee(cls, text: str) -> Optional[Dict]:
        """Extract management fee (basis points or percentage)."""
        fee_section = re.search(
            r'(?:Management Fee|Advisory Fee|Annual Fee|Fee)[\s:]*([^\n]{1,100})',
            text,
            re.IGNORECASE
        )

        if fee_section:
            section_text = fee_section.group(1)

            # Check for basis points
            bp_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:bps|basis points?)', section_text, re.IGNORECASE)
            if bp_match:
                return {
                    'bps': float(bp_match.group(1)),
                    'percentage': float(bp_match.group(1)) / 100,
                    'raw': bp_match.group(0)
                }

            # Check for percentage
            for pattern in cls.PERCENTAGE_PATTERNS:
                match = re.search(pattern, section_text)
                if match:
                    pct = float(match.group(1))
                    return {
                        'bps': pct * 100,
                        'percentage': pct,
                        'raw': match.group(0)
                    }

        return None

    @classmethod
    def extract_benchmark(cls, text: str) -> Optional[str]:
        """Extract primary benchmark."""
        benchmark_section = re.search(
            r'(?:Benchmark|Primary Benchmark|Index)[\s:]*([^\n]{1,150})',
            text,
            re.IGNORECASE
        )

        if benchmark_section:
            benchmark = benchmark_section.group(1).strip()
            # Clean up common patterns
            benchmark = re.sub(r'\s*\([^)]*\)\s*', '', benchmark)  # Remove parentheticals
            return benchmark[:150]  # Limit length

        return None

    @classmethod
    def extract_performance_metrics(cls, text: str) -> Dict[str, Optional[float]]:
        """
        Extract common performance metrics (YTD, 1Y, 3Y, 5Y, 10Y, Since Inception).
        Returns dict with keys: ytd, 1yr, 3yr, 5yr, 10yr, inception
        """
        metrics = {
            'ytd': None,
            '1yr': None,
            '3yr': None,
            '5yr': None,
            '10yr': None,
            'inception': None
        }

        # Look for performance table or section
        perf_section = re.search(
            r'(?:Performance|Returns|Annualized Returns?)[\s\S]{0,500}',
            text,
            re.IGNORECASE
        )

        if not perf_section:
            return metrics

        section_text = perf_section.group(0)

        # YTD
        ytd_match = re.search(r'(?:YTD|Year[- ]to[- ]Date)[\s:]*(-?\d+\.\d+)%?', section_text, re.IGNORECASE)
        if ytd_match:
            metrics['ytd'] = float(ytd_match.group(1))

        # 1 Year
        yr1_match = re.search(r'(?:1[- ]?Yr|1[- ]?Year|One Year)[\s:]*(-?\d+\.\d+)%?', section_text, re.IGNORECASE)
        if yr1_match:
            metrics['1yr'] = float(yr1_match.group(1))

        # 3 Year
        yr3_match = re.search(r'(?:3[- ]?Yr|3[- ]?Year|Three Year)[\s:]*(-?\d+\.\d+)%?', section_text, re.IGNORECASE)
        if yr3_match:
            metrics['3yr'] = float(yr3_match.group(1))

        # 5 Year
        yr5_match = re.search(r'(?:5[- ]?Yr|5[- ]?Year|Five Year)[\s:]*(-?\d+\.\d+)%?', section_text, re.IGNORECASE)
        if yr5_match:
            metrics['5yr'] = float(yr5_match.group(1))

        # 10 Year
        yr10_match = re.search(r'(?:10[- ]?Yr|10[- ]?Year|Ten Year)[\s:]*(-?\d+\.\d+)%?', section_text, re.IGNORECASE)
        if yr10_match:
            metrics['10yr'] = float(yr10_match.group(1))

        # Since Inception
        inception_match = re.search(r'(?:Since Inception|SI|Inception)[\s:]*(-?\d+\.\d+)%?', section_text, re.IGNORECASE)
        if inception_match:
            metrics['inception'] = float(inception_match.group(1))

        return metrics


class PDFParser:
    """
    PDF text extraction using PyMuPDF.
    """

    @staticmethod
    def extract_text(pdf_path: str) -> Tuple[str, Dict]:
        """
        Extract text from PDF.
        Returns: (text, metadata)
        """
        try:
            doc = fitz.open(pdf_path)

            # Extract metadata
            metadata = {
                'page_count': doc.page_count,
                'title': doc.metadata.get('title'),
                'author': doc.metadata.get('author'),
                'subject': doc.metadata.get('subject'),
                'creator': doc.metadata.get('creator'),
                'producer': doc.metadata.get('producer'),
                'creation_date': doc.metadata.get('creationDate'),
            }

            # Extract text from all pages
            text_parts = []
            for page_num in range(doc.page_count):
                page = doc[page_num]
                text_parts.append(page.get_text())

            full_text = '\n'.join(text_parts)

            doc.close()

            logger.info(f"Extracted {len(full_text)} characters from {doc.page_count} pages")
            return full_text, metadata

        except Exception as e:
            logger.error(f"Failed to extract text from PDF: {e}")
            raise


class ParsingWorker:
    """
    Main parsing worker orchestrator.
    """

    def __init__(self, db_url: str):
        self.db_url = db_url
        self.storage_path = Path(STORAGE_PATH)

    def get_unparsed_documents(self, provider_id: Optional[str] = None, document_id: Optional[str] = None) -> List[Dict]:
        """
        Get documents that haven't been parsed yet.
        """
        conn = psycopg2.connect(self.db_url)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        try:
            query = """
                SELECT d.id, d.provider_id, d.url, d.file_path, d.document_type,
                       p.provider_key, p.provider_name
                FROM fmss_sma_fact_sheet_documents d
                JOIN fmss_sma_providers p ON d.provider_id = p.id
                WHERE d.id NOT IN (SELECT document_id FROM fmss_sma_parsed_documents)
                  AND d.file_path IS NOT NULL
                  AND d.document_type = 'pdf'
            """

            params = []

            if provider_id:
                query += " AND d.provider_id = %s"
                params.append(provider_id)

            if document_id:
                query += " AND d.id = %s"
                params.append(document_id)

            query += " ORDER BY d.created_at DESC LIMIT 100"

            cursor.execute(query, params)
            results = cursor.fetchall()

            return [dict(row) for row in results]

        finally:
            cursor.close()
            conn.close()

    def parse_document(self, document: Dict) -> Optional[Dict]:
        """
        Parse a single document and extract structured fields.
        """
        document_id = document['id']
        file_path = document['file_path']

        logger.info(f"Parsing document: {document_id} ({file_path})")

        # Construct full path
        full_path = self.storage_path / file_path

        if not full_path.exists():
            logger.error(f"File not found: {full_path}")
            return None

        try:
            # Extract text from PDF
            text, pdf_metadata = PDFParser.extract_text(str(full_path))

            # Extract structured fields
            parsed_data = {
                'document_id': document_id,
                'raw_text': text[:50000],  # Limit to 50k chars
                'page_count': pdf_metadata['page_count'],
                'strategy_name': FieldExtractor.extract_strategy_name(text, file_path),
                'manager_name': FieldExtractor.extract_manager_name(text),
                'inception_date': FieldExtractor.extract_inception_date(text),
                'aum': FieldExtractor.extract_aum(text),
                'minimum_investment': FieldExtractor.extract_minimum_investment(text),
                'management_fee': FieldExtractor.extract_management_fee(text),
                'benchmark': FieldExtractor.extract_benchmark(text),
                'performance': FieldExtractor.extract_performance_metrics(text),
                'pdf_metadata': pdf_metadata,
                'extraction_method': 'deterministic',
            }

            # Log extraction success
            extracted_fields = [k for k, v in parsed_data.items() if v is not None and k not in ['document_id', 'raw_text', 'page_count']]
            logger.info(f"Extracted {len(extracted_fields)} fields: {', '.join(extracted_fields)}")

            return parsed_data

        except Exception as e:
            logger.error(f"Failed to parse document {document_id}: {e}")
            return None

    def save_parsed_data(self, parsed_data: Dict) -> bool:
        """
        Save parsed data to database.
        """
        conn = psycopg2.connect(self.db_url)
        cursor = conn.cursor()

        try:
            query = """
                INSERT INTO fmss_sma_parsed_documents (
                    id, document_id, raw_text, strategy_name, manager_name,
                    inception_date, aum_amount, minimum_investment,
                    management_fee_bps, benchmark, ytd_return, one_year_return,
                    three_year_return, five_year_return, ten_year_return,
                    inception_return, extraction_method, metadata_json,
                    parsed_at, updated_at
                )
                VALUES (
                    gen_random_uuid(), %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW()
                )
                ON CONFLICT (document_id) DO UPDATE SET
                    raw_text = EXCLUDED.raw_text,
                    strategy_name = EXCLUDED.strategy_name,
                    manager_name = EXCLUDED.manager_name,
                    inception_date = EXCLUDED.inception_date,
                    aum_amount = EXCLUDED.aum_amount,
                    minimum_investment = EXCLUDED.minimum_investment,
                    management_fee_bps = EXCLUDED.management_fee_bps,
                    benchmark = EXCLUDED.benchmark,
                    ytd_return = EXCLUDED.ytd_return,
                    one_year_return = EXCLUDED.one_year_return,
                    three_year_return = EXCLUDED.three_year_return,
                    five_year_return = EXCLUDED.five_year_return,
                    ten_year_return = EXCLUDED.ten_year_return,
                    inception_return = EXCLUDED.inception_return,
                    extraction_method = EXCLUDED.extraction_method,
                    metadata_json = EXCLUDED.metadata_json,
                    updated_at = NOW()
            """

            # Extract values
            aum = parsed_data.get('aum')
            aum_amount = aum['amount'] if aum else None

            min_inv = parsed_data.get('minimum_investment')
            min_inv_amount = min_inv['amount'] if min_inv else None

            mgmt_fee = parsed_data.get('management_fee')
            mgmt_fee_bps = mgmt_fee['bps'] if mgmt_fee else None

            perf = parsed_data.get('performance', {})

            # Build metadata JSON
            metadata = {
                'pdf_metadata': parsed_data.get('pdf_metadata', {}),
                'aum_raw': aum.get('raw') if aum else None,
                'min_inv_raw': min_inv.get('raw') if min_inv else None,
                'mgmt_fee_raw': mgmt_fee.get('raw') if mgmt_fee else None,
            }

            cursor.execute(query, (
                parsed_data['document_id'],
                parsed_data.get('raw_text'),
                parsed_data.get('strategy_name'),
                parsed_data.get('manager_name'),
                parsed_data.get('inception_date'),
                aum_amount,
                min_inv_amount,
                mgmt_fee_bps,
                parsed_data.get('benchmark'),
                perf.get('ytd'),
                perf.get('1yr'),
                perf.get('3yr'),
                perf.get('5yr'),
                perf.get('10yr'),
                perf.get('inception'),
                parsed_data.get('extraction_method'),
                json.dumps(metadata)
            ))

            conn.commit()
            logger.info(f"Saved parsed data for document {parsed_data['document_id']}")
            return True

        except Exception as e:
            logger.error(f"Failed to save parsed data: {e}")
            conn.rollback()
            return False
        finally:
            cursor.close()
            conn.close()

    def run(self, provider_key: Optional[str] = None, all_pending: bool = False, document_id: Optional[str] = None):
        """
        Main execution method.
        """
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
                    logger.info(f"Starting parsing for provider: {provider_name}")
                else:
                    logger.error(f"Provider not found: {provider_key}")
                    return
            finally:
                cursor.close()
                conn.close()

        # Get unparsed documents
        documents = self.get_unparsed_documents(provider_id=provider_id, document_id=document_id)

        if not documents:
            logger.info("No unparsed documents found")
            return

        logger.info(f"Found {len(documents)} unparsed documents")

        # Parse each document
        success_count = 0
        fail_count = 0

        for doc in documents:
            parsed_data = self.parse_document(doc)
            if parsed_data:
                if self.save_parsed_data(parsed_data):
                    success_count += 1
                else:
                    fail_count += 1
            else:
                fail_count += 1

        logger.info(f"\n✅ Parsing complete:")
        logger.info(f"   Documents parsed: {success_count}")
        logger.info(f"   Failures: {fail_count}")


def main():
    parser = argparse.ArgumentParser(description='SMA Parsing Worker')
    parser.add_argument('--provider', help='Provider key to parse documents for')
    parser.add_argument('--all-pending', action='store_true', help='Parse all pending documents')
    parser.add_argument('--document-id', help='Specific document ID to parse')

    args = parser.parse_args()

    if not any([args.provider, args.all_pending, args.document_id]):
        parser.print_help()
        sys.exit(1)

    worker = ParsingWorker(DATABASE_URL)
    worker.run(
        provider_key=args.provider,
        all_pending=args.all_pending,
        document_id=args.document_id
    )


if __name__ == '__main__':
    main()
