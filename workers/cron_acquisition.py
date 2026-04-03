#!/usr/bin/env python3
"""
Cron Entry Point: Daily Acquisition Worker

Scheduled: Every day at 5:00 UTC
Command: python cron_acquisition.py
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
    """Execute daily acquisition for all pending URLs."""

    logger.info("="*60)
    logger.info("SMA ACQUISITION WORKER - DAILY CRON")
    logger.info("="*60)
    logger.info(f"Started at: {datetime.utcnow().isoformat()} UTC")

    try:
        # Import worker
        from sma_monitoring.acquisition_worker import main as acquisition_main

        # Override sys.argv to simulate --all-pending flag
        sys.argv = ['acquisition_worker.py', '--all-pending']

        # Execute acquisition
        acquisition_main()

        logger.info("="*60)
        logger.info("ACQUISITION COMPLETE - SUCCESS")
        logger.info("="*60)
        return 0

    except Exception as e:
        logger.error("="*60)
        logger.error("ACQUISITION FAILED")
        logger.error(f"Error: {e}", exc_info=True)
        logger.error("="*60)
        return 1

if __name__ == '__main__':
    exit_code = main()
    sys.exit(exit_code)
