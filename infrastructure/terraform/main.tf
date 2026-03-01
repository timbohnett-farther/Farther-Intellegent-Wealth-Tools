# =============================================================================
# Farther Prism — Terraform Infrastructure
# =============================================================================
# Provisions all GCP resources for the Farther Prism financial planning
# platform: Cloud SQL, BigQuery, Pub/Sub, Cloud Run, Storage, and IAM.
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  backend "gcs" {
    bucket = "farther-prism-terraform-state"
    prefix = "terraform/state"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# =============================================================================
# Networking
# =============================================================================

resource "google_compute_network" "prism_vpc" {
  name                    = "prism-vpc-${var.environment}"
  auto_create_subnetworks = false
  description             = "VPC for Farther Prism ${var.environment} environment"
}

resource "google_compute_subnetwork" "prism_subnet" {
  name          = "prism-subnet-${var.environment}"
  ip_cidr_range = "10.0.0.0/20"
  region        = var.region
  network       = google_compute_network.prism_vpc.id

  private_ip_google_access = true

  log_config {
    aggregation_interval = "INTERVAL_5_SEC"
    flow_sampling        = 0.5
    metadata             = "INCLUDE_ALL_METADATA"
  }
}

resource "google_compute_global_address" "private_ip_range" {
  name          = "prism-private-ip-${var.environment}"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.prism_vpc.id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.prism_vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_range.name]
}

# =============================================================================
# Cloud SQL — PostgreSQL 16
# =============================================================================

resource "google_sql_database_instance" "prism_pg" {
  name             = "prism-pg-${var.environment}"
  database_version = "POSTGRES_16"
  region           = var.region

  depends_on = [google_service_networking_connection.private_vpc_connection]

  settings {
    tier              = var.environment == "production" ? "db-custom-4-16384" : "db-custom-2-8192"
    availability_type = var.environment == "production" ? "REGIONAL" : "ZONAL"
    disk_size         = var.environment == "production" ? 100 : 20
    disk_type         = "PD_SSD"
    disk_autoresize   = true

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.prism_vpc.id
    }

    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7

      backup_retention_settings {
        retained_backups = 30
        retention_unit   = "COUNT"
      }
    }

    maintenance_window {
      day          = 7 # Sunday
      hour         = 4
      update_track = "stable"
    }

    database_flags {
      name  = "log_checkpoints"
      value = "on"
    }

    database_flags {
      name  = "log_connections"
      value = "on"
    }

    database_flags {
      name  = "log_disconnections"
      value = "on"
    }

    insights_config {
      query_insights_enabled  = true
      query_plans_per_minute  = 5
      query_string_length     = 1024
      record_application_tags = true
      record_client_address   = true
    }
  }

  deletion_protection = var.environment == "production"
}

resource "google_sql_database" "prism_db" {
  name     = "farther_prism"
  instance = google_sql_database_instance.prism_pg.name
}

# =============================================================================
# BigQuery Datasets
# =============================================================================

resource "google_bigquery_dataset" "plans" {
  dataset_id  = "farther_plans"
  description = "Financial plan calculation results including Monte Carlo simulations, annual projections, and goal tracking."
  location    = "US"

  labels = {
    platform    = "farther_prism"
    environment = var.environment
  }

  access {
    role          = "OWNER"
    special_group = "projectOwners"
  }

  access {
    role          = "READER"
    user_by_email = google_service_account.api_server.email
  }

  access {
    role          = "WRITER"
    user_by_email = google_service_account.calc_worker.email
  }
}

resource "google_bigquery_dataset" "tax_tables" {
  dataset_id  = "farther_tax_tables"
  description = "Versioned tax tables for federal and state income tax brackets, FICA rates, and deductions."
  location    = "US"

  labels = {
    platform    = "farther_prism"
    environment = var.environment
  }

  access {
    role          = "OWNER"
    special_group = "projectOwners"
  }

  access {
    role          = "READER"
    user_by_email = google_service_account.api_server.email
  }

  access {
    role          = "READER"
    user_by_email = google_service_account.calc_worker.email
  }

  access {
    role          = "WRITER"
    user_by_email = google_service_account.update_engine.email
  }
}

resource "google_bigquery_dataset" "analytics" {
  dataset_id  = "farther_analytics"
  description = "Aggregated analytics snapshots for firm dashboards and advisor performance metrics."
  location    = "US"

  labels = {
    platform    = "farther_prism"
    environment = var.environment
  }

  access {
    role          = "OWNER"
    special_group = "projectOwners"
  }

  access {
    role          = "READER"
    user_by_email = google_service_account.api_server.email
  }

  access {
    role          = "WRITER"
    user_by_email = google_service_account.calc_worker.email
  }
}

resource "google_bigquery_dataset" "audit" {
  dataset_id  = "farther_audit"
  description = "Compliance audit trail for all platform actions."
  location    = "US"

  labels = {
    platform    = "farther_prism"
    environment = var.environment
    compliance  = "sec_finra"
  }

  access {
    role          = "OWNER"
    special_group = "projectOwners"
  }

  access {
    role          = "WRITER"
    user_by_email = google_service_account.api_server.email
  }
}

resource "google_bigquery_dataset" "update_engine" {
  dataset_id  = "farther_update_engine"
  description = "Automated update engine run logs and detected regulatory changes."
  location    = "US"

  labels = {
    platform    = "farther_prism"
    environment = var.environment
  }

  access {
    role          = "OWNER"
    special_group = "projectOwners"
  }

  access {
    role          = "READER"
    user_by_email = google_service_account.api_server.email
  }

  access {
    role          = "WRITER"
    user_by_email = google_service_account.update_engine.email
  }
}

resource "google_bigquery_dataset" "operational_mirror" {
  dataset_id  = "operational_mirror"
  description = "CDC mirror of Cloud SQL operational tables via Datastream for federated queries."
  location    = "US"

  labels = {
    platform    = "farther_prism"
    environment = var.environment
  }

  access {
    role          = "OWNER"
    special_group = "projectOwners"
  }

  access {
    role          = "READER"
    user_by_email = google_service_account.api_server.email
  }
}

# =============================================================================
# Datastream — CDC from Cloud SQL to BigQuery
# =============================================================================

resource "google_datastream_connection_profile" "cloudsql_source" {
  display_name          = "prism-cloudsql-source-${var.environment}"
  location              = var.region
  connection_profile_id = "prism-cloudsql-source-${var.environment}"

  postgresql_profile {
    hostname = google_sql_database_instance.prism_pg.private_ip_address
    port     = 5432
    username = "datastream_user"
    password = "placeholder"
    database = "farther_prism"
  }
}

resource "google_datastream_connection_profile" "bigquery_dest" {
  display_name          = "prism-bigquery-dest-${var.environment}"
  location              = var.region
  connection_profile_id = "prism-bigquery-dest-${var.environment}"

  bigquery_profile {}
}

resource "google_datastream_stream" "cloudsql_to_bigquery" {
  display_name = "prism-cdc-${var.environment}"
  location     = var.region
  stream_id    = "prism-cdc-${var.environment}"

  desired_state = "RUNNING"

  source_config {
    source_connection_profile = google_datastream_connection_profile.cloudsql_source.id

    postgresql_source_config {
      publication    = "farther_prism_publication"
      replication_slot = "farther_prism_slot"

      include_objects {
        postgresql_schemas {
          schema = "public"

          postgresql_tables {
            table = "clients"
          }
          postgresql_tables {
            table = "advisors"
          }
          postgresql_tables {
            table = "plans"
          }
          postgresql_tables {
            table = "accounts"
          }
          postgresql_tables {
            table = "goals"
          }
        }
      }
    }
  }

  destination_config {
    destination_connection_profile = google_datastream_connection_profile.bigquery_dest.id

    bigquery_destination_config {
      single_target_dataset {
        dataset_id = google_bigquery_dataset.operational_mirror.id
      }
    }
  }

  backfill_all {}
}

# =============================================================================
# Cloud Scheduler — Cron Jobs
# =============================================================================

resource "google_cloud_scheduler_job" "quarterly_tax_update" {
  name        = "prism-quarterly-tax-update-${var.environment}"
  description = "Quarterly check for IRS revenue procedure and tax table updates"
  schedule    = "0 6 1 1,4,7,10 *" # 6 AM on 1st of Jan, Apr, Jul, Oct
  time_zone   = "America/New_York"

  pubsub_target {
    topic_name = google_pubsub_topic.tax_table_updates.id
    data       = base64encode("{\"trigger\": \"quarterly_scheduled\", \"scope\": \"all\"}")
  }
}

resource "google_cloud_scheduler_job" "monthly_analytics" {
  name        = "prism-monthly-analytics-${var.environment}"
  description = "Monthly aggregation of firm and advisor analytics"
  schedule    = "0 2 1 * *" # 2 AM on 1st of each month
  time_zone   = "America/New_York"

  pubsub_target {
    topic_name = google_pubsub_topic.advisor_alerts.id
    data       = base64encode("{\"trigger\": \"monthly_analytics\", \"scope\": \"all_firms\"}")
  }
}

resource "google_cloud_scheduler_job" "daily_snapshots" {
  name        = "prism-daily-snapshots-${var.environment}"
  description = "Daily firm and advisor analytics snapshots"
  schedule    = "0 1 * * *" # 1 AM every day
  time_zone   = "America/New_York"

  pubsub_target {
    topic_name = google_pubsub_topic.advisor_alerts.id
    data       = base64encode("{\"trigger\": \"daily_snapshot\", \"scope\": \"all_firms\"}")
  }
}

# =============================================================================
# Pub/Sub Topics
# =============================================================================

resource "google_pubsub_topic" "plan_calculations" {
  name = "prism-plan-calculations-${var.environment}"

  labels = {
    platform    = "farther_prism"
    environment = var.environment
  }

  message_retention_duration = "86400s" # 24 hours
}

resource "google_pubsub_topic" "tax_table_updates" {
  name = "prism-tax-table-updates-${var.environment}"

  labels = {
    platform    = "farther_prism"
    environment = var.environment
  }

  message_retention_duration = "604800s" # 7 days
}

resource "google_pubsub_topic" "advisor_alerts" {
  name = "prism-advisor-alerts-${var.environment}"

  labels = {
    platform    = "farther_prism"
    environment = var.environment
  }

  message_retention_duration = "86400s" # 24 hours
}

# Subscriptions for Cloud Run services
resource "google_pubsub_subscription" "calc_worker_sub" {
  name  = "prism-calc-worker-sub-${var.environment}"
  topic = google_pubsub_topic.plan_calculations.id

  ack_deadline_seconds = 600 # 10 minutes for long calculations

  push_config {
    push_endpoint = "${google_cloud_run_v2_service.api_server.uri}/api/internal/calculate"

    oidc_token {
      service_account_email = google_service_account.calc_worker.email
    }
  }

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }
}

# =============================================================================
# Cloud Storage Buckets
# =============================================================================

resource "google_storage_bucket" "vault" {
  name          = "farther-prism-vault-${var.environment}"
  location      = "US"
  force_destroy = var.environment != "production"
  storage_class = "STANDARD"

  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = 365
    }
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
  }

  labels = {
    platform    = "farther_prism"
    environment = var.environment
  }
}

resource "google_storage_bucket" "reports" {
  name          = "farther-prism-reports-${var.environment}"
  location      = "US"
  force_destroy = var.environment != "production"
  storage_class = "STANDARD"

  uniform_bucket_level_access = true

  versioning {
    enabled = false
  }

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }

  labels = {
    platform    = "farther_prism"
    environment = var.environment
  }
}

resource "google_storage_bucket" "update_engine_sources" {
  name          = "farther-prism-update-sources-${var.environment}"
  location      = "US"
  force_destroy = var.environment != "production"
  storage_class = "STANDARD"

  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  labels = {
    platform    = "farther_prism"
    environment = var.environment
  }
}

# =============================================================================
# Cloud Run — Services and Jobs
# =============================================================================

resource "google_cloud_run_v2_service" "api_server" {
  name     = "prism-api-${var.environment}"
  location = var.region

  template {
    scaling {
      min_instance_count = var.environment == "production" ? 2 : 0
      max_instance_count = var.environment == "production" ? 20 : 5
    }

    containers {
      image = "gcr.io/${var.project_id}/prism-api:latest"

      ports {
        container_port = 3000
      }

      env {
        name  = "NODE_ENV"
        value = var.environment
      }

      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }

      env {
        name  = "CLOUD_SQL_CONNECTION"
        value = google_sql_database_instance.prism_pg.connection_name
      }

      env {
        name  = "BQ_DATASET_PLANS"
        value = google_bigquery_dataset.plans.dataset_id
      }

      env {
        name  = "BQ_DATASET_TAX_TABLES"
        value = google_bigquery_dataset.tax_tables.dataset_id
      }

      env {
        name  = "BQ_DATASET_ANALYTICS"
        value = google_bigquery_dataset.analytics.dataset_id
      }

      env {
        name  = "BQ_DATASET_AUDIT"
        value = google_bigquery_dataset.audit.dataset_id
      }

      resources {
        limits = {
          cpu    = var.environment == "production" ? "2" : "1"
          memory = var.environment == "production" ? "2Gi" : "1Gi"
        }
      }
    }

    service_account = google_service_account.api_server.email

    vpc_access {
      connector = google_vpc_access_connector.prism_connector.id
      egress    = "PRIVATE_RANGES_ONLY"
    }
  }
}

resource "google_cloud_run_v2_job" "calc_worker" {
  name     = "prism-calc-worker-${var.environment}"
  location = var.region

  template {
    task_count = 1

    template {
      containers {
        image = "gcr.io/${var.project_id}/prism-calc-worker:latest"

        env {
          name  = "NODE_ENV"
          value = var.environment
        }

        env {
          name  = "GCP_PROJECT_ID"
          value = var.project_id
        }

        env {
          name  = "CLOUD_SQL_CONNECTION"
          value = google_sql_database_instance.prism_pg.connection_name
        }

        resources {
          limits = {
            cpu    = "4"
            memory = "8Gi"
          }
        }
      }

      timeout     = "1800s" # 30 minutes max per calculation
      max_retries = 2

      service_account = google_service_account.calc_worker.email

      vpc_access {
        connector = google_vpc_access_connector.prism_connector.id
        egress    = "PRIVATE_RANGES_ONLY"
      }
    }
  }
}

resource "google_cloud_run_v2_job" "update_engine" {
  name     = "prism-update-engine-${var.environment}"
  location = var.region

  template {
    task_count = 1

    template {
      containers {
        image = "gcr.io/${var.project_id}/prism-update-engine:latest"

        env {
          name  = "NODE_ENV"
          value = var.environment
        }

        env {
          name  = "GCP_PROJECT_ID"
          value = var.project_id
        }

        env {
          name  = "BQ_DATASET_TAX_TABLES"
          value = google_bigquery_dataset.tax_tables.dataset_id
        }

        env {
          name  = "BQ_DATASET_UPDATE_ENGINE"
          value = google_bigquery_dataset.update_engine.dataset_id
        }

        resources {
          limits = {
            cpu    = "2"
            memory = "4Gi"
          }
        }
      }

      timeout     = "3600s" # 1 hour max per run
      max_retries = 1

      service_account = google_service_account.update_engine.email

      vpc_access {
        connector = google_vpc_access_connector.prism_connector.id
        egress    = "PRIVATE_RANGES_ONLY"
      }
    }
  }
}

# VPC Access Connector for Cloud Run
resource "google_vpc_access_connector" "prism_connector" {
  name          = "prism-connector-${var.environment}"
  region        = var.region
  network       = google_compute_network.prism_vpc.name
  ip_cidr_range = "10.8.0.0/28"
  min_instances = 2
  max_instances = var.environment == "production" ? 10 : 3
}

# =============================================================================
# Secret Manager
# =============================================================================

resource "google_secret_manager_secret" "database_url" {
  secret_id = "prism-database-url-${var.environment}"

  replication {
    auto {}
  }

  labels = {
    platform    = "farther_prism"
    environment = var.environment
  }
}

resource "google_secret_manager_secret" "hubspot_api_key" {
  secret_id = "prism-hubspot-api-key-${var.environment}"

  replication {
    auto {}
  }

  labels = {
    platform    = "farther_prism"
    environment = var.environment
  }
}

resource "google_secret_manager_secret" "schwab_api_key" {
  secret_id = "prism-schwab-api-key-${var.environment}"

  replication {
    auto {}
  }

  labels = {
    platform    = "farther_prism"
    environment = var.environment
  }
}

resource "google_secret_manager_secret" "openai_api_key" {
  secret_id = "prism-openai-api-key-${var.environment}"

  replication {
    auto {}
  }

  labels = {
    platform    = "farther_prism"
    environment = var.environment
  }
}

resource "google_secret_manager_secret" "fred_api_key" {
  secret_id = "prism-fred-api-key-${var.environment}"

  replication {
    auto {}
  }

  labels = {
    platform    = "farther_prism"
    environment = var.environment
  }
}

# =============================================================================
# Service Accounts and IAM
# =============================================================================

resource "google_service_account" "api_server" {
  account_id   = "prism-api-${var.environment}"
  display_name = "Farther Prism API Server (${var.environment})"
  description  = "Service account for the Prism API server Cloud Run service."
}

resource "google_service_account" "calc_worker" {
  account_id   = "prism-calc-${var.environment}"
  display_name = "Farther Prism Calc Worker (${var.environment})"
  description  = "Service account for the financial plan calculation worker."
}

resource "google_service_account" "update_engine" {
  account_id   = "prism-update-${var.environment}"
  display_name = "Farther Prism Update Engine (${var.environment})"
  description  = "Service account for the automated tax/regulatory update engine."
}

# API Server IAM bindings
resource "google_project_iam_member" "api_server_sql" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.api_server.email}"
}

resource "google_project_iam_member" "api_server_bq" {
  project = var.project_id
  role    = "roles/bigquery.dataViewer"
  member  = "serviceAccount:${google_service_account.api_server.email}"
}

resource "google_project_iam_member" "api_server_bq_job" {
  project = var.project_id
  role    = "roles/bigquery.jobUser"
  member  = "serviceAccount:${google_service_account.api_server.email}"
}

resource "google_project_iam_member" "api_server_pubsub" {
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.api_server.email}"
}

resource "google_project_iam_member" "api_server_secrets" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.api_server.email}"
}

resource "google_project_iam_member" "api_server_storage" {
  project = var.project_id
  role    = "roles/storage.objectViewer"
  member  = "serviceAccount:${google_service_account.api_server.email}"
}

# Calc Worker IAM bindings
resource "google_project_iam_member" "calc_worker_sql" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.calc_worker.email}"
}

resource "google_project_iam_member" "calc_worker_bq" {
  project = var.project_id
  role    = "roles/bigquery.dataEditor"
  member  = "serviceAccount:${google_service_account.calc_worker.email}"
}

resource "google_project_iam_member" "calc_worker_bq_job" {
  project = var.project_id
  role    = "roles/bigquery.jobUser"
  member  = "serviceAccount:${google_service_account.calc_worker.email}"
}

resource "google_project_iam_member" "calc_worker_secrets" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.calc_worker.email}"
}

# Update Engine IAM bindings
resource "google_project_iam_member" "update_engine_bq" {
  project = var.project_id
  role    = "roles/bigquery.dataEditor"
  member  = "serviceAccount:${google_service_account.update_engine.email}"
}

resource "google_project_iam_member" "update_engine_bq_job" {
  project = var.project_id
  role    = "roles/bigquery.jobUser"
  member  = "serviceAccount:${google_service_account.update_engine.email}"
}

resource "google_project_iam_member" "update_engine_storage" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.update_engine.email}"
}

resource "google_project_iam_member" "update_engine_secrets" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.update_engine.email}"
}

resource "google_project_iam_member" "update_engine_pubsub" {
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.update_engine.email}"
}
