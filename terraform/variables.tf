variable "project_id" {}
variable "project_number" {}
variable "region" { default = "asia-southeast2" }
variable "DB_PASS" { sensitive = true }
variable "JWT_SECRET" { sensitive = true }
variable "REG_CODE" { sensitive = true }
variable "ADMIN_USER" { sensitive = true }
variable "ADMIN_PASS" { sensitive = true }
variable "domain_name" {description = "sesuaikan dengan domain yang dipunya"}