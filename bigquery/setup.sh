#!/usr/bin/env bash
# ============================================================================
# FARTHER WEALTH — BigQuery One-Click Setup
# ============================================================================
#
# This script creates ALL BigQuery tables for every program in the platform.
# It handles everything: authentication, dataset creation, and table creation.
#
# USAGE:
#   chmod +x bigquery/setup.sh
#   ./bigquery/setup.sh
#
# PREREQUISITES:
#   1. A Google Cloud account (free tier works)
#   2. A Google Cloud project (the script will help you create one if needed)
#
# The script will walk you through everything step by step.
# ============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Get the directory where this script lives
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

print_header() {
  echo ""
  echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║${NC}  ${BOLD}Farther Intelligent Wealth Tools — BigQuery Setup${NC}          ${CYAN}║${NC}"
  echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
  echo ""
}

print_step() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}  Step $1: $2${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}

print_success() {
  echo -e "${GREEN}  ✓ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}  ⚠ $1${NC}"
}

print_error() {
  echo -e "${RED}  ✗ $1${NC}"
}

print_info() {
  echo -e "  $1"
}

# ============================================================================
# STEP 0: Print welcome
# ============================================================================

print_header

echo "  This script will set up ALL BigQuery tables for every program:"
echo ""
echo "    • Core Entities (Firms, Advisors, Households, Clients, Plans)"
echo "    • Box Spread Calculator"
echo "    • Tax Planning (FP-TaxIQ)"
echo "    • Prism Financial Planning (FP-Prism)"
echo "    • Debt Analysis (FP-DebtIQ)"
echo "    • Risk Profiling (FP-Focus)"
echo "    • Proposal Engine (FP-Propose)"
echo "    • Practice Analytics (FP-Pulse)"
echo "    • AI Engine (Insights & Recommendations)"
echo "    • Compliance & Audit Trail"
echo "    • Market Data & Regulatory Updates"
echo "    • Calculation Event Log"
echo ""
echo -e "  Total: ${BOLD}55 tables + 5 pre-built views${NC}"
echo ""

# ============================================================================
# STEP 1: Check for Google Cloud SDK
# ============================================================================

print_step "1" "Checking for Google Cloud SDK"

if command -v gcloud &>/dev/null; then
  GCLOUD_VERSION=$(gcloud version 2>/dev/null | head -1)
  print_success "Google Cloud SDK found: $GCLOUD_VERSION"
else
  print_error "Google Cloud SDK (gcloud) not found."
  echo ""
  echo "  To install it:"
  echo ""
  echo "    macOS:   brew install google-cloud-sdk"
  echo "    Linux:   curl https://sdk.cloud.google.com | bash"
  echo "    Windows: Download from https://cloud.google.com/sdk/docs/install"
  echo ""
  echo "  After installing, restart your terminal and run this script again."
  exit 1
fi

if ! command -v bq &>/dev/null; then
  print_error "BigQuery CLI (bq) not found. It should come with gcloud."
  echo "  Try: gcloud components install bq"
  exit 1
fi
print_success "BigQuery CLI (bq) found"

# ============================================================================
# STEP 2: Authenticate
# ============================================================================

print_step "2" "Authentication"

CURRENT_ACCOUNT=$(gcloud auth list --filter="status:ACTIVE" --format="value(account)" 2>/dev/null || true)

if [ -n "$CURRENT_ACCOUNT" ]; then
  print_success "Already authenticated as: $CURRENT_ACCOUNT"
  echo ""
  read -p "  Use this account? (Y/n): " USE_CURRENT
  if [[ "${USE_CURRENT,,}" == "n" ]]; then
    echo "  Opening browser for authentication..."
    gcloud auth login --update-adc
    CURRENT_ACCOUNT=$(gcloud auth list --filter="status:ACTIVE" --format="value(account)" 2>/dev/null)
  fi
else
  echo "  You need to log in to Google Cloud."
  echo "  A browser window will open — sign in with your Google account."
  echo ""
  read -p "  Press Enter to open the login page..."
  gcloud auth login --update-adc
  CURRENT_ACCOUNT=$(gcloud auth list --filter="status:ACTIVE" --format="value(account)" 2>/dev/null)
fi

print_success "Authenticated as: $CURRENT_ACCOUNT"

# ============================================================================
# STEP 3: Select or create project
# ============================================================================

print_step "3" "Google Cloud Project"

CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null || true)

if [ -n "$CURRENT_PROJECT" ] && [ "$CURRENT_PROJECT" != "(unset)" ]; then
  print_info "Current project: $CURRENT_PROJECT"
  echo ""
  read -p "  Use this project? (Y/n): " USE_PROJECT
  if [[ "${USE_PROJECT,,}" == "n" ]]; then
    CURRENT_PROJECT=""
  fi
fi

if [ -z "$CURRENT_PROJECT" ] || [ "$CURRENT_PROJECT" == "(unset)" ]; then
  echo ""
  echo "  Available projects:"
  gcloud projects list --format="table(projectId, name)" 2>/dev/null || true
  echo ""
  read -p "  Enter project ID (or 'new' to create one): " PROJECT_INPUT

  if [ "$PROJECT_INPUT" == "new" ]; then
    read -p "  New project name (e.g., farther-wealth): " NEW_PROJECT
    echo "  Creating project '$NEW_PROJECT'..."
    gcloud projects create "$NEW_PROJECT" --name="Farther Wealth Tools"
    CURRENT_PROJECT="$NEW_PROJECT"
  else
    CURRENT_PROJECT="$PROJECT_INPUT"
  fi

  gcloud config set project "$CURRENT_PROJECT"
fi

print_success "Using project: $CURRENT_PROJECT"

# ============================================================================
# STEP 4: Enable BigQuery API
# ============================================================================

print_step "4" "Enabling BigQuery API"

if gcloud services list --enabled --filter="name:bigquery.googleapis.com" --format="value(name)" 2>/dev/null | grep -q bigquery; then
  print_success "BigQuery API already enabled"
else
  echo "  Enabling BigQuery API..."
  gcloud services enable bigquery.googleapis.com
  print_success "BigQuery API enabled"
fi

# ============================================================================
# STEP 5: Choose dataset location
# ============================================================================

print_step "5" "Dataset Location"

echo "  Where should your data be stored?"
echo ""
echo "    1) US (multi-region)      — recommended"
echo "    2) EU (multi-region)"
echo "    3) us-east1  (Virginia)"
echo "    4) us-west1  (Oregon)"
echo "    5) us-central1 (Iowa)"
echo ""
read -p "  Choose (1-5, default 1): " LOCATION_CHOICE

case "${LOCATION_CHOICE:-1}" in
  1) BQ_LOCATION="US" ;;
  2) BQ_LOCATION="EU" ;;
  3) BQ_LOCATION="us-east1" ;;
  4) BQ_LOCATION="us-west1" ;;
  5) BQ_LOCATION="us-central1" ;;
  *) BQ_LOCATION="US" ;;
esac

print_success "Location: $BQ_LOCATION"

# ============================================================================
# STEP 6: Create the dataset
# ============================================================================

print_step "6" "Creating BigQuery Dataset"

DATASET="farther_wealth"

if bq ls --dataset "${CURRENT_PROJECT}:${DATASET}" &>/dev/null; then
  print_warning "Dataset '${DATASET}' already exists"
  read -p "  Continue and add/update tables? (Y/n): " CONTINUE
  if [[ "${CONTINUE,,}" == "n" ]]; then
    echo "  Exiting."
    exit 0
  fi
else
  echo "  Creating dataset '${DATASET}'..."
  bq mk \
    --dataset \
    --location="$BQ_LOCATION" \
    --description="Farther Intelligent Wealth Tools — complete analytics warehouse covering all programs (Box Spread, TaxIQ, Prism, DebtIQ, Focus, Propose, Pulse, AI Engine, Compliance)" \
    --label="platform:farther_wealth" \
    --label="env:production" \
    "${CURRENT_PROJECT}:${DATASET}"
  print_success "Dataset '${DATASET}' created"
fi

# ============================================================================
# STEP 7: Run the schema SQL
# ============================================================================

print_step "7" "Creating All Tables"

SCHEMA_FILE="${SCRIPT_DIR}/schema.sql"

if [ ! -f "$SCHEMA_FILE" ]; then
  print_error "Schema file not found at: $SCHEMA_FILE"
  exit 1
fi

# Count total statements for progress tracking
TOTAL_STATEMENTS=$(grep -c "^CREATE " "$SCHEMA_FILE" || true)
CURRENT=0
ERRORS=0

echo "  Creating ${TOTAL_STATEMENTS} tables and views..."
echo ""

# Split the SQL file by semicolons and execute each statement
# We process CREATE TABLE and CREATE OR REPLACE VIEW statements
while IFS= read -r -d ';' STATEMENT; do
  # Skip empty or comment-only statements
  TRIMMED=$(echo "$STATEMENT" | sed '/^--/d' | sed '/^$/d' | tr -s '[:space:]' ' ' | xargs)
  if [ -z "$TRIMMED" ]; then
    continue
  fi

  # Check if this is a CREATE statement
  if echo "$TRIMMED" | grep -qiE "^CREATE"; then
    CURRENT=$((CURRENT + 1))

    # Extract the table/view name for display
    TABLE_NAME=$(echo "$TRIMMED" | grep -oP '`farther_wealth\.\K[^`]+' | head -1 || echo "unknown")

    # Replace dataset references with fully qualified project.dataset
    QUALIFIED_STATEMENT=$(echo "$STATEMENT;" | sed "s/\`farther_wealth\./\`${CURRENT_PROJECT}.${DATASET}./g")

    # Execute the statement
    if bq query --use_legacy_sql=false --nouse_cache "$QUALIFIED_STATEMENT" &>/dev/null; then
      printf "  ${GREEN}✓${NC} [%2d/%d] %s\n" "$CURRENT" "$TOTAL_STATEMENTS" "$TABLE_NAME"
    else
      printf "  ${YELLOW}⚠${NC} [%2d/%d] %s (may already exist)\n" "$CURRENT" "$TOTAL_STATEMENTS" "$TABLE_NAME"
      ERRORS=$((ERRORS + 1))
    fi
  fi
done < "$SCHEMA_FILE"

echo ""

# ============================================================================
# STEP 8: Also run the existing infrastructure SQL (Prism-specific)
# ============================================================================

print_step "8" "Creating Prism-Specific Tables (infrastructure/bigquery/)"

INFRA_DIR="${SCRIPT_DIR}/../infrastructure/bigquery"

if [ -d "$INFRA_DIR" ]; then
  for SQL_FILE in "$INFRA_DIR"/*.sql; do
    FILENAME=$(basename "$SQL_FILE")
    echo -e "  Running ${BOLD}${FILENAME}${NC}..."

    if bq query --use_legacy_sql=false --nouse_cache < "$SQL_FILE" &>/dev/null; then
      print_success "$FILENAME"
    else
      print_warning "$FILENAME (may already exist or has project-specific refs)"
    fi
  done
else
  print_info "No infrastructure/bigquery/ directory found, skipping."
fi

# ============================================================================
# STEP 9: Verify
# ============================================================================

print_step "9" "Verification"

echo "  Tables in ${DATASET}:"
echo ""

TABLE_LIST=$(bq ls --format=pretty "${CURRENT_PROJECT}:${DATASET}" 2>/dev/null || true)
TABLE_COUNT=$(echo "$TABLE_LIST" | grep -c "TABLE\|VIEW" || true)

echo "$TABLE_LIST"
echo ""
print_success "Total objects created: ${TABLE_COUNT}"

if [ "$ERRORS" -gt 0 ]; then
  print_warning "${ERRORS} statements had warnings (usually means table already existed)"
fi

# ============================================================================
# DONE
# ============================================================================

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}  ${GREEN}${BOLD}Setup Complete!${NC}                                            ${CYAN}║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "  Your BigQuery warehouse is ready."
echo ""
echo "  ${BOLD}Project:${NC}  $CURRENT_PROJECT"
echo "  ${BOLD}Dataset:${NC}  $DATASET"
echo "  ${BOLD}Location:${NC} $BQ_LOCATION"
echo "  ${BOLD}Tables:${NC}   $TABLE_COUNT"
echo ""
echo "  ${BOLD}Next steps:${NC}"
echo ""
echo "    1. Open BigQuery Console:"
echo "       https://console.cloud.google.com/bigquery?project=$CURRENT_PROJECT"
echo ""
echo "    2. Set the BIGQUERY_PROJECT env var in your .env:"
echo "       BIGQUERY_PROJECT=$CURRENT_PROJECT"
echo "       BIGQUERY_DATASET=$DATASET"
echo ""
echo "    3. For service account auth (production), create a key:"
echo "       gcloud iam service-accounts create farther-bq \\"
echo "         --display-name='Farther BigQuery Service Account'"
echo "       gcloud projects add-iam-policy-binding $CURRENT_PROJECT \\"
echo "         --member='serviceAccount:farther-bq@${CURRENT_PROJECT}.iam.gserviceaccount.com' \\"
echo "         --role='roles/bigquery.dataEditor'"
echo "       gcloud iam service-accounts keys create bigquery-key.json \\"
echo "         --iam-account='farther-bq@${CURRENT_PROJECT}.iam.gserviceaccount.com'"
echo ""
echo "    4. View the table mapping reference:"
echo "       cat bigquery/TABLE_MAP.md"
echo ""
