# =============================================================================
# Farther Prism — Terraform Outputs
# =============================================================================

# Cloud SQL
output "cloud_sql_connection_name" {
  description = "Cloud SQL instance connection name for Cloud SQL Proxy and federated queries."
  value       = google_sql_database_instance.prism_pg.connection_name
}

output "cloud_sql_private_ip" {
  description = "Private IP address of the Cloud SQL instance."
  value       = google_sql_database_instance.prism_pg.private_ip_address
  sensitive   = true
}

# BigQuery Dataset IDs
output "bigquery_dataset_plans" {
  description = "BigQuery dataset ID for plan calculation results."
  value       = google_bigquery_dataset.plans.dataset_id
}

output "bigquery_dataset_tax_tables" {
  description = "BigQuery dataset ID for versioned tax tables."
  value       = google_bigquery_dataset.tax_tables.dataset_id
}

output "bigquery_dataset_analytics" {
  description = "BigQuery dataset ID for analytics snapshots."
  value       = google_bigquery_dataset.analytics.dataset_id
}

output "bigquery_dataset_audit" {
  description = "BigQuery dataset ID for audit/activity logs."
  value       = google_bigquery_dataset.audit.dataset_id
}

output "bigquery_dataset_update_engine" {
  description = "BigQuery dataset ID for update engine logs."
  value       = google_bigquery_dataset.update_engine.dataset_id
}

output "bigquery_dataset_operational_mirror" {
  description = "BigQuery dataset ID for CDC-mirrored operational tables."
  value       = google_bigquery_dataset.operational_mirror.dataset_id
}

# Cloud Run Service URLs
output "api_server_url" {
  description = "URL of the Prism API server Cloud Run service."
  value       = google_cloud_run_v2_service.api_server.uri
}

# Pub/Sub Topics
output "pubsub_topic_plan_calculations" {
  description = "Pub/Sub topic ID for plan calculation requests."
  value       = google_pubsub_topic.plan_calculations.id
}

output "pubsub_topic_tax_table_updates" {
  description = "Pub/Sub topic ID for tax table update events."
  value       = google_pubsub_topic.tax_table_updates.id
}

output "pubsub_topic_advisor_alerts" {
  description = "Pub/Sub topic ID for advisor alert notifications."
  value       = google_pubsub_topic.advisor_alerts.id
}

# Storage Buckets
output "storage_bucket_vault" {
  description = "GCS bucket name for document vault storage."
  value       = google_storage_bucket.vault.name
}

output "storage_bucket_reports" {
  description = "GCS bucket name for generated report storage."
  value       = google_storage_bucket.reports.name
}

output "storage_bucket_update_sources" {
  description = "GCS bucket name for update engine source documents."
  value       = google_storage_bucket.update_engine_sources.name
}

# Service Accounts
output "service_account_api_server" {
  description = "Email of the API server service account."
  value       = google_service_account.api_server.email
}

output "service_account_calc_worker" {
  description = "Email of the calculation worker service account."
  value       = google_service_account.calc_worker.email
}

output "service_account_update_engine" {
  description = "Email of the update engine service account."
  value       = google_service_account.update_engine.email
}
