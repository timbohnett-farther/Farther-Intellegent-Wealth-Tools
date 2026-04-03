#!/usr/bin/env python3
"""
Cron Entry Point: Weekly Discovery Worker

Scheduled: Every Monday at 4:00 UTC
Command: python cron_discovery.py
"""

import sys
import os
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    """Execute weekly discovery for all active providers."""

    logger.info("="*60)
    logger.info("SMA DISCOVERY WORKER - WEEKLY CRON")
    logger.info("="*60)
    logger.info(f"Started at: {datetime.utcnow().isoformat()} UTC")

    try:
        # Import worker
        from sma_monitoring.discovery_worker import main as discovery_main

        # Override sys.argv to simulate --all-active flag
        sys.argv = ['discovery_worker.py', '--all-active']

        # Execute discovery
        discovery_main()

        logger.info("="*60)
        logger.info("DISCOVERY COMPLETE - SUCCESS")
        logger.info("="*60)
        return 0

    except Exception as e:
        logger.error("="*60)
        logger.error("DISCOVERY FAILED")
        logger.error(f"Error: {e}", exc_info=True)
        logger.error("="*60)
        return 1

if __name__ == '__main__':
    exit_code = main()
    sys.exit(exit_code)
