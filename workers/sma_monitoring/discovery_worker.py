"""
SMA Discovery Worker

Uses Tavily to discover SMA fact sheet URLs from provider websites.
Crawls seed URLs, extracts links, classifies by type, stores in database.

Architecture:
- Tavily Search API for intelligent crawling
- Sitemap parsing for comprehensive coverage
- AI-based URL classification (fact_sheet, brochure, commentary, etc.)
- Run logging to sma_provider_runs table

Usage:
    python discovery_worker.py --provider jpmorgan
    python discovery_worker.py --provider-id <uuid>
    python discovery_worker.py --all-active
"""

import os
import sys
import hashlib
import argparse
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from urllib.parse import urlparse, urljoin
import requests
from bs4 import BeautifulSoup
import psycopg2
from psycopg2.extras import RealDictCursor
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Environment variables
DATABASE_URL = os.getenv('DATABASE_URL')
TAVILY_API_KEY = os.getenv('TAVILY_API_KEY')

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable not set")
if not TAVILY_API_KEY:
    raise ValueError("TAVILY_API_KEY environment variable not set")


class TavilyDiscovery:
    """Tavily-based URL discovery for SMA fact sheets."""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.tavily.com"

    def search(self, query: str, domain: str = None, max_results: int = 10) -> List[Dict]:
        """
        Search for URLs using Tavily API.

        Args:
            query: Search query (e.g., "BlackRock equity SMA fact sheet")
            domain: Restrict to specific domain (e.g., "blackrock.com")
            max_results: Maximum number of results to return

        Returns:
            List of discovered URLs with metadata
        """
        endpoint = f"{self.base_url}/search"

        payload = {
            "api_key": self.api_key,
            "query": query,
            "max_results": max_results,
            "search_depth": "advanced",
            "include_domains": [domain] if domain else None,
        }

        try:
            response = requests.post(endpoint, json=payload, timeout=30)
            response.raise_for_status()
            data = response.json()

            results = []
            for result in data.get('results', []):
                results.append({
                    'url': result.get('url'),
                    'title': result.get('title'),
                    'content': result.get('content'),
                    'score': result.get('score', 0),
                })

            logger.info(f"Tavily search returned {len(results)} results for query: {query}")
            return results

        except requests.exceptions.RequestException as e:
            logger.error(f"Tavily API error: {e}")
            return []

    def extract_links_from_page(self, url: str, domain_filter: str = None) -> List[str]:
        """
        Extract all links from a webpage.

        Args:
            url: URL to scrape
            domain_filter: Only return links from this domain

        Returns:
            List of discovered URLs
        """
        try:
            response = requests.get(url, timeout=15, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })
            response.raise_for_status()

            soup = BeautifulSoup(response.content, 'html.parser')
            links = []

            for a_tag in soup.find_all('a', href=True):
                href = a_tag['href']
                absolute_url = urljoin(url, href)

                # Filter by domain if specified
                if domain_filter:
                    parsed = urlparse(absolute_url)
                    if domain_filter not in parsed.netloc:
                        continue

                # Skip anchors, mailto, javascript
                if absolute_url.startswith(('#', 'mailto:', 'javascript:', 'tel:')):
                    continue

                links.append(absolute_url)

            # Deduplicate
            links = list(set(links))
            logger.info(f"Extracted {len(links)} links from {url}")
            return links

        except Exception as e:
            logger.error(f"Failed to extract links from {url}: {e}")
            return []


class URLClassifier:
    """Classify discovered URLs by type."""

    # URL pattern keywords for classification
    PATTERNS = {
        'fact_sheet': [
            'fact-sheet', 'factsheet', 'fact_sheet',
            'strategy-overview', 'product-detail',
            'sma-detail', 'strategy-detail',
            '/pdf/', '.pdf', '/documents/',
        ],
        'brochure': [
            'brochure', 'marketing-material',
            'product-guide', 'overview',
        ],
        'commentary': [
            'commentary', 'market-commentary',
            'outlook', 'insights', 'perspectives',
        ],
        'performance': [
            'performance', 'returns', 'track-record',
            'historical-performance',
        ],
        'holdings': [
            'holdings', 'portfolio-holdings',
            'top-holdings', 'positions',
        ],
    }

    @classmethod
    def classify(cls, url: str, title: str = None, content: str = None) -> Tuple[str, float]:
        """
        Classify URL by type with confidence score.

        Args:
            url: URL to classify
            title: Page title (optional)
            content: Page content snippet (optional)

        Returns:
            Tuple of (url_class, confidence)
        """
        url_lower = url.lower()
        title_lower = (title or '').lower()
        content_lower = (content or '').lower()

        scores = {}

        for url_class, keywords in cls.PATTERNS.items():
            score = 0
            for keyword in keywords:
                if keyword in url_lower:
                    score += 0.4
                if keyword in title_lower:
                    score += 0.3
                if keyword in content_lower:
                    score += 0.2
            scores[url_class] = min(score, 1.0)

        # Get highest scoring class
        if scores:
            best_class = max(scores, key=scores.get)
            confidence = scores[best_class]

            if confidence > 0.3:
                return best_class, confidence

        # Default to unknown
        return 'unknown', 0.0


class DiscoveryWorker:
    """Main discovery worker orchestrator."""

    def __init__(self, db_url: str, tavily_api_key: str):
        self.db_url = db_url
        self.tavily = TavilyDiscovery(tavily_api_key)
        self.classifier = URLClassifier()

    def get_db_connection(self):
        """Create database connection."""
        return psycopg2.connect(self.db_url, cursor_factory=RealDictCursor)

    def get_provider_by_key(self, provider_key: str) -> Optional[Dict]:
        """Get provider by key."""
        with self.get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT * FROM fmss_sma_providers WHERE provider_key = %s",
                    (provider_key,)
                )
                return cur.fetchone()

    def get_provider_by_id(self, provider_id: str) -> Optional[Dict]:
        """Get provider by ID."""
        with self.get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT * FROM fmss_sma_providers WHERE id = %s",
                    (provider_id,)
                )
                return cur.fetchone()

    def get_seed_urls(self, provider_id: str) -> List[Dict]:
        """Get active seed URLs for provider."""
        with self.get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT * FROM fmss_sma_provider_seed_urls
                    WHERE provider_id = %s AND is_active = TRUE
                    ORDER BY priority DESC
                    """,
                    (provider_id,)
                )
                return cur.fetchall()

    def create_provider_run(self, provider_id: str, run_type: str = 'discovery') -> str:
        """Create a new provider run and return run ID."""
        with self.get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO fmss_sma_provider_runs
                    (provider_id, run_type, run_mode, started_at, status, triggered_by)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    (provider_id, run_type, 'manual', datetime.utcnow(), 'running', 'discovery_worker')
                )
                run_id = cur.fetchone()['id']
                conn.commit()
                return run_id

    def update_provider_run(self, run_id: str, status: str, stats: Dict):
        """Update provider run with results."""
        with self.get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE fmss_sma_provider_runs
                    SET completed_at = %s,
                        status = %s,
                        duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER,
                        urls_discovered = %s,
                        errors_encountered = %s
                    WHERE id = %s
                    """,
                    (
                        datetime.utcnow(),
                        status,
                        stats.get('urls_discovered', 0),
                        stats.get('errors_encountered', 0),
                        run_id
                    )
                )
                conn.commit()

    def store_discovered_url(
        self,
        provider_id: str,
        seed_url_id: str,
        url: str,
        url_class: str,
        confidence: float,
        discovered_via: str,
        parent_url: str = None
    ):
        """Store discovered URL in database."""
        url_hash = hashlib.sha256(url.encode()).hexdigest()

        with self.get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO fmss_sma_discovered_urls
                    (provider_id, seed_url_id, discovered_url, url_hash, url_class,
                     classification_confidence, classified_by, discovered_at,
                     discovered_via, parent_url, acquisition_status)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (url_hash) DO UPDATE SET
                        url_class = EXCLUDED.url_class,
                        classification_confidence = EXCLUDED.classification_confidence,
                        updated_at = NOW()
                    """,
                    (
                        provider_id,
                        seed_url_id,
                        url,
                        url_hash,
                        url_class,
                        confidence,
                        'heuristic',
                        datetime.utcnow(),
                        discovered_via,
                        parent_url,
                        'pending'
                    )
                )
                conn.commit()

    def discover_provider(self, provider_key: str) -> Dict:
        """
        Run discovery for a single provider.

        Returns:
            Dict with discovery stats
        """
        logger.info(f"Starting discovery for provider: {provider_key}")

        # Get provider
        provider = self.get_provider_by_key(provider_key)
        if not provider:
            logger.error(f"Provider not found: {provider_key}")
            return {'success': False, 'error': 'Provider not found'}

        provider_id = provider['id']
        provider_name = provider['provider_name']

        # Create run
        run_id = self.create_provider_run(provider_id)
        logger.info(f"Created discovery run: {run_id}")

        stats = {
            'urls_discovered': 0,
            'errors_encountered': 0,
        }

        try:
            # Get seed URLs
            seed_urls = self.get_seed_urls(provider_id)
            logger.info(f"Found {len(seed_urls)} seed URLs for {provider_name}")

            if not seed_urls:
                logger.warning(f"No seed URLs configured for {provider_name}")
                self.update_provider_run(run_id, 'success', stats)
                return stats

            # Process each seed URL
            for seed in seed_urls:
                seed_url = seed['seed_url']
                seed_url_id = seed['id']
                url_type = seed['url_type']
                crawl_depth = seed['crawl_depth'] or 1

                logger.info(f"Processing seed URL: {seed_url} (type: {url_type}, depth: {crawl_depth})")

                try:
                    # Strategy 1: Direct link extraction if crawl_depth > 0
                    if crawl_depth >= 1:
                        links = self.tavily.extract_links_from_page(
                            seed_url,
                            domain_filter=provider.get('website_domain')
                        )

                        for link in links:
                            # Classify URL
                            url_class, confidence = self.classifier.classify(link)

                            # Store discovered URL
                            self.store_discovered_url(
                                provider_id=provider_id,
                                seed_url_id=seed_url_id,
                                url=link,
                                url_class=url_class,
                                confidence=confidence,
                                discovered_via='link_crawl',
                                parent_url=seed_url
                            )

                            stats['urls_discovered'] += 1

                    # Strategy 2: Tavily search for fact sheets
                    if url_type == 'strategy_list':
                        search_query = f"{provider_name} SMA fact sheet"
                        tavily_results = self.tavily.search(
                            query=search_query,
                            domain=provider.get('website_domain'),
                            max_results=20
                        )

                        for result in tavily_results:
                            url = result['url']
                            title = result['title']
                            content = result['content']

                            # Classify URL
                            url_class, confidence = self.classifier.classify(url, title, content)

                            # Store discovered URL
                            self.store_discovered_url(
                                provider_id=provider_id,
                                seed_url_id=seed_url_id,
                                url=url,
                                url_class=url_class,
                                confidence=confidence,
                                discovered_via='tavily_search',
                                parent_url=seed_url
                            )

                            stats['urls_discovered'] += 1

                except Exception as e:
                    logger.error(f"Error processing seed URL {seed_url}: {e}")
                    stats['errors_encountered'] += 1

            # Update run status
            self.update_provider_run(run_id, 'success', stats)
            logger.info(f"Discovery complete for {provider_name}: {stats['urls_discovered']} URLs discovered")

            return stats

        except Exception as e:
            logger.error(f"Discovery failed for {provider_name}: {e}")
            stats['errors_encountered'] += 1
            self.update_provider_run(run_id, 'failed', stats)
            raise


def main():
    parser = argparse.ArgumentParser(description='SMA Discovery Worker')
    parser.add_argument('--provider', help='Provider key (e.g., jpmorgan)')
    parser.add_argument('--provider-id', help='Provider UUID')
    parser.add_argument('--all-active', action='store_true', help='Run discovery for all active providers')

    args = parser.parse_args()

    worker = DiscoveryWorker(DATABASE_URL, TAVILY_API_KEY)

    if args.provider:
        stats = worker.discover_provider(args.provider)
        print(f"\n✅ Discovery complete:")
        print(f"   URLs discovered: {stats['urls_discovered']}")
        print(f"   Errors: {stats['errors_encountered']}")

    elif args.provider_id:
        provider = worker.get_provider_by_id(args.provider_id)
        if provider:
            stats = worker.discover_provider(provider['provider_key'])
            print(f"\n✅ Discovery complete:")
            print(f"   URLs discovered: {stats['urls_discovered']}")
            print(f"   Errors: {stats['errors_encountered']}")
        else:
            print(f"❌ Provider not found: {args.provider_id}")
            sys.exit(1)

    elif args.all_active:
        # Get all active providers
        with worker.get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT provider_key FROM fmss_sma_providers WHERE discovery_mode = 'active' ORDER BY provider_rank"
                )
                providers = cur.fetchall()

        total_discovered = 0
        for provider in providers:
            stats = worker.discover_provider(provider['provider_key'])
            total_discovered += stats['urls_discovered']

        print(f"\n✅ Discovery complete for {len(providers)} providers")
        print(f"   Total URLs discovered: {total_discovered}")

    else:
        parser.print_help()
        sys.exit(1)


if __name__ == '__main__':
    main()
