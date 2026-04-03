# FMSS SMA Monitoring Workers - Railway Deployment Script (PowerShell)
# This script automates the deployment of Python workers to Railway with cron scheduling

$ErrorActionPreference = "Stop"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "FMSS SMA Monitoring System - Railway Deployment" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Railway CLI is installed
try {
    railway whoami | Out-Null
    Write-Host "✅ Railway CLI found" -ForegroundColor Green
} catch {
    Write-Host "❌ Railway CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "   npm install -g @railway/cli"
    exit 1
}

Write-Host ""

# Check if logged in
try {
    railway whoami | Out-Null
    Write-Host "✅ Logged in to Railway" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Not logged in to Railway. Logging in..." -ForegroundColor Yellow
    railway login
}

Write-Host ""

# Step 1: Link or create Railway project
Write-Host "Step 1: Railway Project Setup" -ForegroundColor Yellow
Write-Host "------------------------------"
$choice = Read-Host "Do you want to (1) Link existing project or (2) Create new project? [1/2]"

if ($choice -eq "1") {
    Write-Host "Linking to existing Railway project..."
    railway link
} elseif ($choice -eq "2") {
    Write-Host "Creating new Railway project..."
    railway init
} else {
    Write-Host "Invalid choice. Exiting." -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 2: Add PostgreSQL database
Write-Host "Step 2: Database Setup" -ForegroundColor Yellow
Write-Host "----------------------"
$add_db = Read-Host "Add Railway PostgreSQL database? [y/n]"

if ($add_db -eq "y") {
    Write-Host "Adding PostgreSQL database..."
    railway add --plugin postgresql
    Write-Host "✅ PostgreSQL database added (DATABASE_URL will be auto-provided)" -ForegroundColor Green
} else {
    Write-Host "⚠️  Skipping database setup. Ensure DATABASE_URL is configured manually." -ForegroundColor Yellow
}

Write-Host ""

# Step 3: Set environment variables
Write-Host "Step 3: Environment Variables" -ForegroundColor Yellow
Write-Host "-----------------------------"
Write-Host "Setting required environment variables..."
Write-Host ""

# Prompt for API keys
$tavily_key = Read-Host "Enter TAVILY_API_KEY (for web discovery)"
$bright_data_key = Read-Host "Enter BRIGHT_DATA_API_KEY (for web scraping)"
$minimax_key = Read-Host "Enter MINIMAX_API_KEY (for AI change detection)"

# Email alert variables (optional)
$configure_email = Read-Host "Configure email alerts? [y/n]"

if ($configure_email -eq "y") {
    $smtp_host = Read-Host "Enter SMTP_HOST (e.g., smtp.gmail.com)"
    $smtp_port = Read-Host "Enter SMTP_PORT (e.g., 587)"
    $smtp_user = Read-Host "Enter SMTP_USER (email address)"
    $smtp_password = Read-Host "Enter SMTP_PASSWORD" -AsSecureString
    $smtp_password_plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($smtp_password))
    $alert_from = Read-Host "Enter ALERT_FROM_EMAIL"
    $alert_to = Read-Host "Enter ALERT_TO_EMAILS (comma-separated)"
}

# Set variables in Railway
Write-Host ""
Write-Host "Setting environment variables in Railway..."

railway variables set "TAVILY_API_KEY=$tavily_key"
railway variables set "BRIGHT_DATA_API_KEY=$bright_data_key"
railway variables set "MINIMAX_API_KEY=$minimax_key"
railway variables set "STORAGE_PATH=/app/storage/fact_sheets"

if ($configure_email -eq "y") {
    railway variables set "SMTP_HOST=$smtp_host"
    railway variables set "SMTP_PORT=$smtp_port"
    railway variables set "SMTP_USER=$smtp_user"
    railway variables set "SMTP_PASSWORD=$smtp_password_plain"
    railway variables set "ALERT_FROM_EMAIL=$alert_from"
    railway variables set "ALERT_TO_EMAILS=$alert_to"
}

Write-Host "✅ Environment variables configured" -ForegroundColor Green
Write-Host ""

# Step 4: Add persistent volume (optional)
Write-Host "Step 4: Persistent Volume" -ForegroundColor Yellow
Write-Host "-------------------------"
$add_volume = Read-Host "Add persistent volume for PDF/HTML storage? [y/n]"

if ($add_volume -eq "y") {
    Write-Host "⚠️  Persistent volumes must be added via Railway Dashboard:" -ForegroundColor Yellow
    Write-Host "   1. Go to Railway Dashboard → Your Service → Volumes"
    Write-Host "   2. Click 'Add Volume'"
    Write-Host "   3. Mount path: /app/storage"
    Write-Host "   4. Size: 10 GB (adjust as needed)"
    Write-Host ""
    Read-Host "Press Enter when volume is configured..."
}

Write-Host ""

# Step 5: Deploy workers
Write-Host "Step 5: Deploy Workers Service" -ForegroundColor Yellow
Write-Host "-------------------------------"
Write-Host "Deploying Python workers to Railway..."
Write-Host ""

Set-Location workers
railway up

Write-Host ""
Write-Host "✅ Workers service deployed" -ForegroundColor Green
Write-Host ""

# Step 6: Configure cron services
Write-Host "Step 6: Configure Cron Schedules" -ForegroundColor Yellow
Write-Host "---------------------------------"
Write-Host ""
Write-Host "Railway Cron requires creating separate services for each scheduled job."
Write-Host "We need to create 3 cron services:"
Write-Host ""
Write-Host "  1. Discovery Worker (Weekly: Monday 4:00 UTC)" -ForegroundColor Cyan
Write-Host "  2. Acquisition Worker (Daily: 5:00 UTC)" -ForegroundColor Cyan
Write-Host "  3. Parsing + Change Worker (Daily: 6:00 UTC)" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  Cron services must be created via Railway Dashboard." -ForegroundColor Yellow
Write-Host ""
Write-Host "For each cron job, follow these steps:"
Write-Host ""
Write-Host "1. Railway Dashboard → New Service → Empty Service"
Write-Host "2. Settings → General → Service Name (e.g., 'sma-discovery-cron')"
Write-Host "3. Settings → Deploy:"
Write-Host "   - Builder: Nixpacks"
Write-Host "   - Root Directory: /workers"
Write-Host "   - Build Command: pip install -r requirements.txt"
Write-Host "4. Settings → Cron:"
Write-Host "   - Enable Cron"
Write-Host "   - Set schedule (see below)"
Write-Host "5. Variables → Copy all environment variables from main service"
Write-Host ""
Write-Host "CRON SCHEDULES:" -ForegroundColor Green
Write-Host "==============="
Write-Host ""
Write-Host "Service 1: sma-discovery-cron" -ForegroundColor Cyan
Write-Host "  Schedule: 0 4 * * 1"
Write-Host "  Start Command: python cron_discovery.py"
Write-Host ""
Write-Host "Service 2: sma-acquisition-cron" -ForegroundColor Cyan
Write-Host "  Schedule: 0 5 * * *"
Write-Host "  Start Command: python cron_acquisition.py"
Write-Host ""
Write-Host "Service 3: sma-parsing-change-cron" -ForegroundColor Cyan
Write-Host "  Schedule: 0 6 * * *"
Write-Host "  Start Command: python cron_parsing_change.py"
Write-Host ""
Write-Host "Service 4 (Optional): sma-alert-cron" -ForegroundColor Cyan
Write-Host "  Schedule: 0 7 * * *"
Write-Host "  Start Command: python -m sma_monitoring.alert_worker --send-pending"
Write-Host ""
Read-Host "Press Enter when all cron services are configured..."

Write-Host ""

# Step 7: Verify deployment
Write-Host "Step 7: Verify Deployment" -ForegroundColor Yellow
Write-Host "-------------------------"
Write-Host ""
Write-Host "Checking Railway deployment status..."
railway status

Write-Host ""
Write-Host "View logs:"
Write-Host "  railway logs"
Write-Host ""
Write-Host "View cron logs:"
Write-Host "  railway logs -s sma-discovery-cron"
Write-Host "  railway logs -s sma-acquisition-cron"
Write-Host "  railway logs -s sma-parsing-change-cron"
Write-Host ""

# Step 8: Manual test run
Write-Host "Step 8: Manual Test Run (Optional)" -ForegroundColor Yellow
Write-Host "-----------------------------------"
$run_test = Read-Host "Run manual discovery test? [y/n]"

if ($run_test -eq "y") {
    Write-Host "Running discovery worker for JPMorgan..."
    railway run python -m sma_monitoring.discovery_worker --provider jpmorgan
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "✅ DEPLOYMENT COMPLETE" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "----------"
Write-Host "1. Monitor first cron runs in Railway logs"
Write-Host "2. Check admin UI at /admin/sma-runs"
Write-Host "3. Verify data in /admin/sma-documents"
Write-Host "4. Configure email alerts if needed"
Write-Host ""
Write-Host "Cron Schedule:" -ForegroundColor Cyan
Write-Host "  - Discovery: Every Monday at 4:00 UTC"
Write-Host "  - Acquisition: Every day at 5:00 UTC"
Write-Host "  - Parsing/Change: Every day at 6:00 UTC"
Write-Host ""
Write-Host "Admin URLs:" -ForegroundColor Cyan
Write-Host "  - /admin/sma-runs (execution history)"
Write-Host "  - /admin/sma-documents (document tracking)"
Write-Host "  - /admin/sma-changes (change events)"
Write-Host ""
Write-Host "FMSS SMA Monitoring System is now live! 🎉" -ForegroundColor Green
Write-Host ""
