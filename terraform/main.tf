provider "google" {
  project = var.project_id
  region  = var.region
}

# --- PRESENTATION TIER: Load Balancer & Custom Domain ---
resource "google_compute_global_forwarding_rule" "frontend_lb_config" {
  name                  = "frontend-lb-config"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  ip_address            = google_compute_global_address.frontend_lb_ip.address
  ip_protocol           = "TCP"
  port_range            = "443-443"
  target                = google_compute_target_https_proxy.frontend_lb_target_proxy.id
}

resource "google_compute_global_address" "frontend_lb_ip" {
  name         = "frontend-lb-ip"
  address_type = "EXTERNAL"
}

resource "google_compute_managed_ssl_certificate" "facility_ssl_cert" {
  name = "facility-managed-ssl"
  managed {
    domains = [var.domain_name]
  }
}

resource "google_compute_target_https_proxy" "frontend_lb_target_proxy" {
  name             = "frontend-lb-target-proxy"
  ssl_certificates = [google_compute_managed_ssl_certificate.facility_ssl_cert.id]
  url_map          = google_compute_url_map.frontend_lb.id
}

resource "google_compute_url_map" "frontend_lb" {
  name            = "frontend-lb"
  default_service = google_compute_backend_service.frontend_backend.id
}

resource "google_compute_backend_service" "frontend_backend" {
  name                  = "frontend-backend"
  protocol              = "HTTPS"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  enable_cdn            = true

  backend {
    group = google_compute_region_network_endpoint_group.serverless_neg.id
  }
}

resource "google_compute_region_network_endpoint_group" "serverless_neg" {
  name                  = "serverless-neg"
  network_endpoint_type = "SERVERLESS"
  region                = var.region
  cloud_run {
    service = google_cloud_run_v2_service.frontend_service.name
  }
}

# --- APPLICATION TIER: Cloud Run Services ---
resource "google_cloud_run_v2_service" "backend_service" {
  name     = "backend-service"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/facility-repo/backend:latest"
      
      # Environment Variables dari Secret Manager
      env { name = "DB_HOST"; value = "172.18.97.3" }
      env { name = "DB_NAME"; value = "facility_db" }
      env { name = "DB_USER"; value = "postgres" }
      env { name = "REDIS_HOST"; value = "172.18.96.3" }
      env {
        name = "DB_PASS"
        value_source { 
          secret_key_ref { 
            secret = google_secret_manager_secret.db_pass.secret_id
            version = "latest" 
          } 
        }
      }
      # Tambahkan env lain (JWT_SECRET, dll) dengan pola yang sama
    }
    vpc_access {
      connector = google_vpc_access_connector.redis_connector.id
      egress    = "PRIVATE_RANGES_ONLY"
    }
  }
}

resource "google_cloud_run_v2_service" "frontend_service" {
  name     = "frontend-service"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"

  template {
    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/facility-repo/frontend:latest"
    }
  }
}

resource "google_cloud_run_v2_service" "image_resize_service" {
  name     = "image-resize-service"
  location = var.region
  template {
    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/cloud-run-source-deploy/image-resize-service:latest"
    }
  }
}

# --- DATA TIER: SQL, Redis, & Storage ---
resource "google_sql_database_instance" "facility_sql" {
  name             = "facility-sql"
  database_version = "POSTGRES_14"
  region           = var.region
  settings {
    tier = "db-f1-micro"
    ip_configuration {
      ipv4_enabled    = false
      private_network = "projects/${var.project_id}/global/networks/default"
    }
  }
}

resource "google_redis_instance" "facility_cache" {
  name               = "facility-cache"
  tier               = "BASIC"
  memory_size_gb     = 1
  authorized_network = "projects/${var.project_id}/global/networks/default"
  connect_mode       = "PRIVATE_SERVICE_ACCESS"
}

resource "google_storage_bucket" "freports_evidence_001" {
  name                        = "freports-evidence-001"
  location                    = "ASIA-SOUTHEAST2"
  uniform_bucket_level_access = true
}

# --- NETWORKING & SECURITY ---
resource "google_vpc_access_connector" "redis_connector" {
  name          = "redis-connector"
  ip_cidr_range = "10.8.0.0/28"
  network       = "default"
  region        = var.region
}

# Secret Management Resources
resource "google_secret_manager_secret" "db_pass" { secret_id = "DB_PASS" }
resource "google_secret_manager_secret" "jwt_secret" { secret_id = "JWT_SECRET" }
resource "google_secret_manager_secret" "admin_pass" { secret_id = "ADMIN_PASS" }