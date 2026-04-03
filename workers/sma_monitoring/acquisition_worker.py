"""
SMA Acquisition Worker

Downloads fact sheet PDFs and HTML pages using Bright Data Web Unlocker.
Validates content, calculates SHA-256 hashes, tracks versions.

Architecture:
- Bright Data Web Unlocker (primary)
- Direct HTTP fetch (fallback)
- PDF validation with PyPDF2
- Content hashing for change detection
- Version tracking in fmss_sma_fact_sheet_versions

Usage:
    python acquisition_worker.py --provider jpmorgan
    python acquisition_worker.py --all-pending
    python acquisition_worker.py --url-id <uuid>
"""

import os
import sys
import hashlib
import argparse
import tempfile
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from pathlib import Path
import requests
import psycopg2
from psycopg2.extras import RealDictCursor
import logging
import time
import mimetypes

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Environment variables
DATABASE_URL = os.getenv('DATABASE_URL')
BRIGHT_DATA_API_KEY = os.getenv('BRIGHT_DATA_API_KEY')
STORAGE_PATH = os.getenv('STORAGE_PATH', './storage/fact_sheets')

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable not set")

# Create storage directory
Path(STORAGE_PATH).mkdir(parents=True, exist_ok=True)


class BrightDataFetcher:
    """Bright Data Web Unlocker for fetching protected content."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
        self.base_url = "https://api.brightdata.com/zone/unlocker"
        self.enabled = api_key is not None

    def fetch(self, url: str, timeout: int = 30) -> Tuple[Optional[bytes], Dict]:
        """
        Fetch URL content using Bright Data Web Unlocker.

        Args:
            url: URL to fetch
            timeout: Request timeout in seconds

        Returns:
            Tuple of (content_bytes, metadata)
        """
        if not self.enabled:
            logger.warning("Bright Data API key not configured, skipping")
            return None, {'error': 'Bright Data not configured'}

        start_time = time.time()

        try:
            # Bright Data Web Unlocker endpoint
            proxy_url = f"{self.base_url}?url={url}"

            response = requests.get(
                proxy_url,
                headers={
                    'Authorization': f'Bearer {self.api_key}',
                    'User-Agent': 'FMSS-Acquisition-Worker/1.0'
                },
                timeout=timeout
            )

            response.raise_for_status()

            duration_ms = int((time.time() - start_time) * 1000)

            metadata = {
                'status_code': response.status_code,
                'content_type': response.headers.get('Content-Type', 'unknown'),
                'content_length': len(response.content),
                'duration_ms': duration_ms,
                'via': 'bright_data',
            }

            logger.info(f"Bright Data fetch successful: {url} ({metadata['content_length']} bytes)")
            return response.content, metadata

        except requests.exceptions.RequestException as e:
            logger.error(f"Bright Data fetch failed for {url}: {e}")
            return None, {'error': str(e), 'via': 'bright_data'}


class DirectFetcher:
    """Direct HTTP fetch as fallback."""

    @staticmethod
    def fetch(url: str, timeout: int = 30) -> Tuple[Optional[bytes], Dict]:
        """
        Fetch URL content directly via HTTP.

        Args:
            url: URL to fetch
            timeout: Request timeout in seconds

        Returns:
            Tuple of (content_bytes, metadata)
        """
        start_time = time.time()

        try:
            response = requests.get(
                url,
                headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout=timeout,
                allow_redirects=True
            )

            response.raise_for_status()

            duration_ms = int((time.time() - start_time) * 1000)

            metadata = {
                'status_code': response.status_code,
                'content_type': response.headers.get('Content-Type', 'unknown'),
                'content_length': len(response.content),
                'duration_ms': duration_ms,
                'via': 'direct_fetch',
            }

            logger.info(f"Direct fetch successful: {url} ({metadata['content_length']} bytes)")
            return response.content, metadata

        except requests.exceptions.RequestException as e:
            logger.error(f"Direct fetch failed for {url}: {e}")
            return None, {'error': str(e), 'via': 'direct_fetch'}


class ContentValidator:
    """Validate downloaded content."""

    @staticmethod
    def validate(content: bytes, url: str, expected_type: str = None) -> Tuple[bool, str, Dict]:
        """
        Validate content quality and type.

        Args:
            content: Content bytes
            url: Source URL
            expected_type: Expected content type (pdf, html, etc.)

        Returns:
            Tuple of (is_valid, document_type, validation_info)
        """
        if not content or len(content) == 0:
            return False, 'empty', {'error': 'Empty content'}

        # Minimum size check
        if len(content) < 100:
            return False, 'too_small', {'error': 'Content too small', 'size': len(content)}

        # Detect document type
        document_type = 'unknown'

        # Check for PDF signature
        if content[:4] == b'%PDF':
            document_type = 'pdf'

            # Validate PDF structure
            if b'%%EOF' not in content[-1024:]:
                logger.warning(f"PDF may be incomplete: {url}")

            # Check PDF size (typical fact sheets: 100KB - 10MB)
            size_mb = len(content) / (1024 * 1024)
            if size_mb > 20:
                logger.warning(f"PDF unusually large: {size_mb:.2f}MB")

        # Check for HTML
        elif b'<html' in content[:1000].lower() or b'<!doctype html' in content[:1000].lower():
            document_type = 'html'

        # Check for DOCX (ZIP archive with specific structure)
        elif content[:2] == b'PK' and b'word/' in content[:1000]:
            document_type = 'docx'

        # Infer from URL extension
        elif url.lower().endswith('.pdf'):
            document_type = 'pdf'
        elif url.lower().endswith('.html') or url.lower().endswith('.htm'):
            document_type = 'html'
        elif url.lower().endswith('.docx'):
            document_type = 'docx'

        validation_info = {
            'size_bytes': len(content),
            'detected_type': document_type,
        }

        is_valid = document_type != 'unknown' and len(content) >= 100

        if is_valid:
            logger.info(f"Content valid: {document_type}, {len(content)} bytes")
        else:
            logger.warning(f"Content validation failed: {validation_info}")

        return is_valid, document_type, validation_info


class AcquisitionWorker:
    """Main acquisition worker orchestrator."""

    def __init__(self, db_url: str, bright_data_key: Optional[str] = None):
        self.db_url = db_url
        self.bright_data = BrightDataFetcher(bright_data_key)
        self.direct = DirectFetcher()
        self.validator = ContentValidator()
        self.storage_path = Path(STORAGE_PATH)

    def get_db_connection(self):
        """Create database connection."""
        return psycopg2.connect(self.db_url, cursor_factory=RealDictCursor)

    def get_pending_urls(self, provider_id: str = None, limit: int = 100) -> List[Dict]:
        """Get pending discovered URLs for acquisition."""
        with self.get_db_connection() as conn:
            with conn.cursor() as cur:
                if provider_id:
                    cur.execute(
                        """
                        SELECT du.*, p.provider_name, p.provider_key
                        FROM fmss_sma_discovered_urls du
                        JOIN fmss_sma_providers p ON du.provider_id = p.id
                        WHERE du.provider_id = %s
                          AND du.acquisition_status = 'pending'
                          AND du.url_class IN ('fact_sheet', 'brochure', 'performance')
                        ORDER BY du.classification_confidence DESC
                        LIMIT %s
                        """,
                        (provider_id, limit)
                    )
                else:
                    cur.execute(
                        """
                        SELECT du.*, p.provider_name, p.provider_key
                        FROM fmss_sma_discovered_urls du
                        JOIN fmss_sma_providers p ON du.provider_id = p.id
                        WHERE du.acquisition_status = 'pending'
                          AND du.url_class IN ('fact_sheet', 'brochure', 'performance')
                        ORDER BY p.provider_rank ASC, du.classification_confidence DESC
                        LIMIT %s
                        """,
                        (limit,)
                    )
                return cur.fetchall()

    def calculate_content_hash(self, content: bytes) -> str:
        """Calculate SHA-256 hash of content."""
        return hashlib.sha256(content).hexdigest()

    def save_content_to_disk(self, content: bytes, url_hash: str, document_type: str) -> str:
        """
        Save content to disk and return file path.

        Args:
            content: Content bytes
            url_hash: SHA-256 hash of URL
            document_type: File type (pdf, html, docx)

        Returns:
            Relative file path
        """
        # Create subdirectory by first 2 chars of hash (for distribution)
        subdir = url_hash[:2]
        directory = self.storage_path / subdir
        directory.mkdir(parents=True, exist_ok=True)

        # Generate filename
        extension = document_type if document_type != 'unknown' else 'bin'
        filename = f"{url_hash}.{extension}"
        filepath = directory / filename

        # Write content
        filepath.write_bytes(content)

        # Return relative path
        relative_path = f"{subdir}/{filename}"
        logger.info(f"Saved content to disk: {relative_path}")
        return relative_path

    def get_or_create_document(self, discovered_url: Dict) -> str:
        """Get existing document or create new one. Returns document_id."""
        url = discovered_url['discovered_url']
        url_hash = discovered_url['url_hash']
        provider_id = discovered_url['provider_id']

        with self.get_db_connection() as conn:
            with conn.cursor() as cur:
                # Check if document exists
                cur.execute(
                    "SELECT id FROM fmss_sma_fact_sheet_documents WHERE canonical_url = %s",
                    (url,)
                )
                existing = cur.fetchone()

                if existing:
                    return existing['id']

                # Create new document
                cur.execute(
                    """
                    INSERT INTO fmss_sma_fact_sheet_documents
                    (provider_id, discovered_url_id, canonical_url, document_type,
                     first_seen, acquisition_status, parse_status)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    (
                        provider_id,
                        discovered_url['id'],
                        url,
                        None,  # Will be set after acquisition
                        datetime.utcnow(),
                        'pending',
                        'pending'
                    )
                )
                document_id = cur.fetchone()['id']
                conn.commit()
                return document_id

    def create_version(
        self,
        document_id: str,
        content_hash: str,
        content_size: int,
        acquired_via: str,
        duration_ms: int,
        file_path: str
    ) -> str:
        """Create a new document version. Returns version_id."""
        with self.get_db_connection() as conn:
            with conn.cursor() as cur:
                # Get current version count
                cur.execute(
                    "SELECT COALESCE(MAX(version_number), 0) as max_version FROM fmss_sma_fact_sheet_versions WHERE document_id = %s",
                    (document_id,)
                )
                max_version = cur.fetchone()['max_version']
                new_version_number = max_version + 1

                # Create version
                cur.execute(
                    """
                    INSERT INTO fmss_sma_fact_sheet_versions
                    (document_id, version_number, content_hash, content_size_bytes,
                     acquired_at, acquired_via, acquisition_duration_ms, raw_content_s3_key)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    (
                        document_id,
                        new_version_number,
                        content_hash,
                        content_size,
                        datetime.utcnow(),
                        acquired_via,
                        duration_ms,
                        file_path  # Using local path for now, S3 in production
                    )
                )
                version_id = cur.fetchone()['id']

                # Update document with current version
                cur.execute(
                    """
                    UPDATE fmss_sma_fact_sheet_documents
                    SET current_version_id = %s,
                        current_content_hash = %s,
                        version_count = %s,
                        last_checked = %s,
                        acquisition_status = 'active'
                    WHERE id = %s
                    """,
                    (version_id, content_hash, new_version_number, datetime.utcnow(), document_id)
                )

                conn.commit()
                return version_id

    def update_discovered_url_status(self, url_id: str, status: str):
        """Update acquisition status of discovered URL."""
        with self.get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE fmss_sma_discovered_urls
                    SET acquisition_status = %s, acquired_at = %s, updated_at = %s
                    WHERE id = %s
                    """,
                    (status, datetime.utcnow(), datetime.utcnow(), url_id)
                )
                conn.commit()

    def check_content_changed(self, document_id: str, new_hash: str) -> bool:
        """Check if content hash differs from current version."""
        with self.get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT current_content_hash FROM fmss_sma_fact_sheet_documents WHERE id = %s",
                    (document_id,)
                )
                result = cur.fetchone()
                if not result or not result['current_content_hash']:
                    return True  # First version
                return result['current_content_hash'] != new_hash

    def acquire_url(self, discovered_url: Dict) -> Dict:
        """
        Acquire content for a single discovered URL.

        Returns:
            Dict with acquisition stats
        """
        url = discovered_url['discovered_url']
        url_id = discovered_url['id']

        logger.info(f"Acquiring: {url}")

        stats = {
            'success': False,
            'content_hash': None,
            'document_type': None,
            'version_id': None,
            'changed': False,
        }

        try:
            # Try Bright Data first
            content, metadata = self.bright_data.fetch(url)

            # Fallback to direct fetch
            if content is None:
                logger.info(f"Trying direct fetch for {url}")
                content, metadata = self.direct.fetch(url)

            # If still failed, mark as failed
            if content is None:
                self.update_discovered_url_status(url_id, 'failed')
                return stats

            # Validate content
            is_valid, document_type, validation_info = self.validator.validate(content, url)

            if not is_valid:
                logger.warning(f"Content validation failed for {url}: {validation_info}")
                self.update_discovered_url_status(url_id, 'failed')
                return stats

            # Calculate content hash
            content_hash = self.calculate_content_hash(content)
            stats['content_hash'] = content_hash
            stats['document_type'] = document_type

            # Get or create document
            document_id = self.get_or_create_document(discovered_url)

            # Check if content changed
            changed = self.check_content_changed(document_id, content_hash)
            stats['changed'] = changed

            if not changed:
                logger.info(f"Content unchanged for {url}, skipping version creation")
                self.update_discovered_url_status(url_id, 'acquired')
                stats['success'] = True
                return stats

            # Save content to disk
            file_path = self.save_content_to_disk(content, discovered_url['url_hash'], document_type)

            # Create version
            version_id = self.create_version(
                document_id=document_id,
                content_hash=content_hash,
                content_size=len(content),
                acquired_via=metadata.get('via', 'unknown'),
                duration_ms=metadata.get('duration_ms', 0),
                file_path=file_path
            )

            stats['version_id'] = version_id
            stats['success'] = True

            # Update discovered URL status
            self.update_discovered_url_status(url_id, 'acquired')

            logger.info(f"✅ Acquired: {url} (version {version_id}, {len(content)} bytes)")
            return stats

        except Exception as e:
            logger.error(f"Acquisition failed for {url}: {e}")
            self.update_discovered_url_status(url_id, 'failed')
            return stats

    def acquire_provider(self, provider_key: str, limit: int = 100) -> Dict:
        """
        Acquire fact sheets for a provider.

        Returns:
            Dict with acquisition stats
        """
        logger.info(f"Starting acquisition for provider: {provider_key}")

        # Get provider
        with self.get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT id, provider_name FROM fmss_sma_providers WHERE provider_key = %s",
                    (provider_key,)
                )
                provider = cur.fetchone()

        if not provider:
            logger.error(f"Provider not found: {provider_key}")
            return {'success': False, 'error': 'Provider not found'}

        provider_id = provider['id']
        provider_name = provider['provider_name']

        # Get pending URLs
        pending_urls = self.get_pending_urls(provider_id, limit)
        logger.info(f"Found {len(pending_urls)} pending URLs for {provider_name}")

        stats = {
            'total': len(pending_urls),
            'acquired': 0,
            'failed': 0,
            'unchanged': 0,
            'new_versions': 0,
        }

        # Process each URL
        for url_data in pending_urls:
            result = self.acquire_url(url_data)

            if result['success']:
                stats['acquired'] += 1
                if result['changed']:
                    stats['new_versions'] += 1
                else:
                    stats['unchanged'] += 1
            else:
                stats['failed'] += 1

            # Rate limiting: 2 second delay between requests
            time.sleep(2)

        logger.info(f"✅ Acquisition complete for {provider_name}: {stats}")
        return stats


def main():
    parser = argparse.ArgumentParser(description='SMA Acquisition Worker')
    parser.add_argument('--provider', help='Provider key (e.g., jpmorgan)')
    parser.add_argument('--all-pending', action='store_true', help='Acquire all pending URLs')
    parser.add_argument('--limit', type=int, default=100, help='Max URLs to process')

    args = parser.parse_args()

    worker = AcquisitionWorker(DATABASE_URL, BRIGHT_DATA_API_KEY)

    if args.provider:
        stats = worker.acquire_provider(args.provider, args.limit)
        print(f"\n✅ Acquisition complete:")
        print(f"   Total: {stats['total']}")
        print(f"   Acquired: {stats['acquired']}")
        print(f"   New versions: {stats['new_versions']}")
        print(f"   Unchanged: {stats['unchanged']}")
        print(f"   Failed: {stats['failed']}")

    elif args.all_pending:
        pending_urls = worker.get_pending_urls(limit=args.limit)

        total_stats = {
            'total': len(pending_urls),
            'acquired': 0,
            'failed': 0,
            'new_versions': 0,
        }

        for url_data in pending_urls:
            result = worker.acquire_url(url_data)

            if result['success']:
                total_stats['acquired'] += 1
                if result['changed']:
                    total_stats['new_versions'] += 1
            else:
                total_stats['failed'] += 1

            # Rate limiting
            time.sleep(2)

        print(f"\n✅ Acquisition complete:")
        print(f"   Total: {total_stats['total']}")
        print(f"   Acquired: {total_stats['acquired']}")
        print(f"   New versions: {total_stats['new_versions']}")
        print(f"   Failed: {total_stats['failed']}")

    else:
        parser.print_help()
        sys.exit(1)


if __name__ == '__main__':
    main()
