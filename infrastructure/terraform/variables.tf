# =============================================================================
# Farther Prism — Terraform Input Variables
# =============================================================================

variable "project_id" {
  description = "The GCP project ID where all resources will be created."
  type        = string

  validation {
    condition     = length(var.project_id) > 0
    error_message = "project_id must not be empty."
  }
}

variable "region" {
  description = "The GCP region for resource deployment."
  type        = string
  default     = "us-central1"

  validation {
    condition     = can(regex("^[a-z]+-[a-z]+[0-9]+$", var.region))
    error_message = "region must be a valid GCP region (e.g. us-central1, us-east4)."
  }
}

variable "environment" {
  description = "The deployment environment (production, staging, development)."
  type        = string
  default     = "development"

  validation {
    condition     = contains(["production", "staging", "development"], var.environment)
    error_message = "environment must be one of: production, staging, development."
  }
}
