#!/usr/bin/env python3
"""
Cron Entry Point: Daily Parsing + Change Detection Worker

Scheduled: Every day at 6:00 UTC
Command: python cron_parsing_change.py
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
    """Execute daily parsing and change detection."""

    logger.info("="*60)
    logger.info("SMA PARSING + CHANGE DETECTION - DAILY CRON")
    logger.info("="*60)
    logger.info(f"Started at: {datetime.utcnow().isoformat()} UTC")

    success = True

    # Step 1: Parsing
    try:
        logger.info("\n" + "="*60)
        logger.info("STEP 1: PARSING WORKER")
        logger.info("="*60)

        from sma_monitoring.parsing_worker import main as parsing_main

        # Override sys.argv to simulate --all-pending flag
        sys.argv = ['parsing_worker.py', '--all-pending']

        # Execute parsing
        parsing_main()

        logger.info("Parsing complete - SUCCESS")

    except Exception as e:
        logger.error(f"Parsing failed: {e}", exc_info=True)
        success = False

    # Step 2: Change Detection
    try:
        logger.info("\n" + "="*60)
        logger.info("STEP 2: CHANGE DETECTION WORKER")
        logger.info("="*60)

        from sma_monitoring.change_worker import main as change_main

        # Override sys.argv to simulate --all-active flag
        sys.argv = ['change_worker.py', '--all-active']

        # Execute change detection
        change_main()

        logger.info("Change detection complete - SUCCESS")

    except Exception as e:
        logger.error(f"Change detection failed: {e}", exc_info=True)
        success = False

    # Final status
    logger.info("\n" + "="*60)
    if success:
        logger.info("PARSING + CHANGE DETECTION COMPLETE - SUCCESS")
    else:
        logger.error("PARSING + CHANGE DETECTION COMPLETE - PARTIAL FAILURE")
    logger.info("="*60)

    return 0 if success else 1

if __name__ == '__main__':
    exit_code = main()
    sys.exit(exit_code)
