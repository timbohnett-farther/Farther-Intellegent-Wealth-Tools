#!/bin/bash

# FMSS SMA Monitoring Workers - Railway Deployment Script
# This script automates the deployment of Python workers to Railway with cron scheduling

set -e  # Exit on error

echo "=================================================="
echo "FMSS SMA Monitoring System - Railway Deployment"
echo "=================================================="
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "   npm install -g @railway/cli"
    echo "   or: curl -fsSL https://railway.app/install.sh | sh"
    exit 1
fi

echo "✅ Railway CLI found"
echo ""

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo "⚠️  Not logged in to Railway. Logging in..."
    railway login
fi

echo "✅ Logged in to Railway"
echo ""

# Step 1: Link or create Railway project
echo "Step 1: Railway Project Setup"
echo "------------------------------"
read -p "Do you want to (1) Link existing project or (2) Create new project? [1/2]: " choice

if [ "$choice" == "1" ]; then
    echo "Linking to existing Railway project..."
    railway link
elif [ "$choice" == "2" ]; then
    echo "Creating new Railway project..."
    railway init
else
    echo "Invalid choice. Exiting."
    exit 1
fi

echo ""

# Step 2: Add PostgreSQL database
echo "Step 2: Database Setup"
echo "----------------------"
read -p "Add Railway PostgreSQL database? [y/n]: " add_db

if [ "$add_db" == "y" ]; then
    echo "Adding PostgreSQL database..."
    railway add --plugin postgresql
    echo "✅ PostgreSQL database added (DATABASE_URL will be auto-provided)"
else
    echo "⚠️  Skipping database setup. Ensure DATABASE_URL is configured manually."
fi

echo ""

# Step 3: Set environment variables
echo "Step 3: Environment Variables"
echo "-----------------------------"
echo "Setting required environment variables..."
echo ""

# Prompt for API keys
read -p "Enter TAVILY_API_KEY (for web discovery): " tavily_key
read -p "Enter BRIGHT_DATA_API_KEY (for web scraping): " bright_data_key
read -p "Enter MINIMAX_API_KEY (for AI change detection): " minimax_key

# Email alert variables (optional)
read -p "Configure email alerts? [y/n]: " configure_email

if [ "$configure_email" == "y" ]; then
    read -p "Enter SMTP_HOST (e.g., smtp.gmail.com): " smtp_host
    read -p "Enter SMTP_PORT (e.g., 587): " smtp_port
    read -p "Enter SMTP_USER (email address): " smtp_user
    read -p "Enter SMTP_PASSWORD: " smtp_password
    read -p "Enter ALERT_FROM_EMAIL: " alert_from
    read -p "Enter ALERT_TO_EMAILS (comma-separated): " alert_to
fi

# Set variables in Railway
echo ""
echo "Setting environment variables in Railway..."

railway variables set TAVILY_API_KEY="$tavily_key"
railway variables set BRIGHT_DATA_API_KEY="$bright_data_key"
railway variables set MINIMAX_API_KEY="$minimax_key"
railway variables set STORAGE_PATH="/app/storage/fact_sheets"

if [ "$configure_email" == "y" ]; then
    railway variables set SMTP_HOST="$smtp_host"
    railway variables set SMTP_PORT="$smtp_port"
    railway variables set SMTP_USER="$smtp_user"
    railway variables set SMTP_PASSWORD="$smtp_password"
    railway variables set ALERT_FROM_EMAIL="$alert_from"
    railway variables set ALERT_TO_EMAILS="$alert_to"
fi

echo "✅ Environment variables configured"
echo ""

# Step 4: Add persistent volume (optional)
echo "Step 4: Persistent Volume"
echo "-------------------------"
read -p "Add persistent volume for PDF/HTML storage? [y/n]: " add_volume

if [ "$add_volume" == "y" ]; then
    echo "⚠️  Persistent volumes must be added via Railway Dashboard:"
    echo "   1. Go to Railway Dashboard → Your Service → Volumes"
    echo "   2. Click 'Add Volume'"
    echo "   3. Mount path: /app/storage"
    echo "   4. Size: 10 GB (adjust as needed)"
    echo ""
    read -p "Press Enter when volume is configured..."
fi

echo ""

# Step 5: Deploy workers
echo "Step 5: Deploy Workers Service"
echo "-------------------------------"
echo "Deploying Python workers to Railway..."
echo ""

cd workers
railway up

echo ""
echo "✅ Workers service deployed"
echo ""

# Step 6: Configure cron services
echo "Step 6: Configure Cron Schedules"
echo "---------------------------------"
echo ""
echo "Railway Cron requires creating separate services for each scheduled job."
echo "We need to create 3 cron services:"
echo ""
echo "  1. Discovery Worker (Weekly: Monday 4:00 UTC)"
echo "  2. Acquisition Worker (Daily: 5:00 UTC)"
echo "  3. Parsing + Change Worker (Daily: 6:00 UTC)"
echo ""
echo "⚠️  Cron services must be created via Railway Dashboard."
echo ""
echo "For each cron job, follow these steps:"
echo ""
echo "1. Railway Dashboard → New Service → Empty Service"
echo "2. Settings → General → Service Name (e.g., 'sma-discovery-cron')"
echo "3. Settings → Deploy:"
echo "   - Builder: Nixpacks"
echo "   - Root Directory: /workers"
echo "   - Build Command: pip install -r requirements.txt"
echo "4. Settings → Cron:"
echo "   - Enable Cron"
echo "   - Set schedule (see below)"
echo "5. Variables → Copy all environment variables from main service"
echo ""
echo "CRON SCHEDULES:"
echo "==============="
echo ""
echo "Service 1: sma-discovery-cron"
echo "  Schedule: 0 4 * * 1"
echo "  Start Command: python cron_discovery.py"
echo ""
echo "Service 2: sma-acquisition-cron"
echo "  Schedule: 0 5 * * *"
echo "  Start Command: python cron_acquisition.py"
echo ""
echo "Service 3: sma-parsing-change-cron"
echo "  Schedule: 0 6 * * *"
echo "  Start Command: python cron_parsing_change.py"
echo ""
echo "Service 4 (Optional): sma-alert-cron"
echo "  Schedule: 0 7 * * *"
echo "  Start Command: python -m sma_monitoring.alert_worker --send-pending"
echo ""
read -p "Press Enter when all cron services are configured..."

echo ""

# Step 7: Verify deployment
echo "Step 7: Verify Deployment"
echo "-------------------------"
echo ""
echo "Checking Railway deployment status..."
railway status

echo ""
echo "View logs:"
echo "  railway logs"
echo ""
echo "View cron logs:"
echo "  railway logs -s sma-discovery-cron"
echo "  railway logs -s sma-acquisition-cron"
echo "  railway logs -s sma-parsing-change-cron"
echo ""

# Step 8: Manual test run
echo "Step 8: Manual Test Run (Optional)"
echo "-----------------------------------"
read -p "Run manual discovery test? [y/n]: " run_test

if [ "$run_test" == "y" ]; then
    echo "Running discovery worker for JPMorgan..."
    railway run python -m sma_monitoring.discovery_worker --provider jpmorgan
fi

echo ""
echo "=================================================="
echo "✅ DEPLOYMENT COMPLETE"
echo "=================================================="
echo ""
echo "Next Steps:"
echo "----------"
echo "1. Monitor first cron runs in Railway logs"
echo "2. Check admin UI at /admin/sma-runs"
echo "3. Verify data in /admin/sma-documents"
echo "4. Configure email alerts if needed"
echo ""
echo "Cron Schedule:"
echo "  - Discovery: Every Monday at 4:00 UTC"
echo "  - Acquisition: Every day at 5:00 UTC"
echo "  - Parsing/Change: Every day at 6:00 UTC"
echo ""
echo "Admin URLs:"
echo "  - /admin/sma-runs (execution history)"
echo "  - /admin/sma-documents (document tracking)"
echo "  - /admin/sma-changes (change events)"
echo ""
echo "FMSS SMA Monitoring System is now live! 🎉"
echo ""
