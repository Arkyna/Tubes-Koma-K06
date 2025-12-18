terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 4.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# =================================================================
# 1. NETWORK (Existing Default VPC)
# =================================================================
# Kita referensi network 'default' yang sudah ada
data "google_compute_network" "default" {
  name = "default"
}

# VPC Connector (Jembatan ke Redis/SQL)
resource "google_vpc_access_connector" "connector" {
  name          = var.vpc_connector_name
  region        = var.region
  network       = data.google_compute_network.default.name
  ip_cidr_range = "10.8.0.0/28" 
}

# =================================================================
# 2. DATABASE (Cloud SQL)
# =================================================================
resource "google_sql_database_instance" "postgres" {
  name             = var.db_instance_name
  database_version = "POSTGRES_14"
  region           = var.region
  deletion_protection = false

  settings {
    tier = "db-f1-micro"
    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc_network.id
    }
  }
}

resource "google_sql_database" "database" {
  name     = var.db_name
  instance = google_sql_database_instance.postgres.name
}

# =================================================================
# 3. CACHE (Redis)
# =================================================================
resource "google_redis_instance" "cache" {
  name           = var.redis_instance_name
  tier           = "BASIC"
  memory_size_gb = 1
  region         = var.region
  authorized_network = data.google_compute_network.default.id
}

# =================================================================
# 4. COMPUTE (Cloud Run with SECRETS)
# =================================================================

# --- BACKEND SERVICE ---
resource "google_cloud_run_service" "backend" {
  name     = var.backend_service_name
  location = var.region

  template {
    spec {
      containers {
        image = var.backend_image_url
        
        # Env Biasa
        env {
          name = "DB_HOST"
          value = google_sql_database_instance.postgres.private_ip_address
        }
        env {
          name = "REDIS_HOST"
          value = google_redis_instance.cache.host
        }
        
        # Env dari SECRET MANAGER (Sesuai list kamu)
        env {
          name = "DB_PASS"
          value_from {
            secret_key_ref {
              name = "db_pass" # Nama secret di GCP
              key  = "latest"
            }
          }
        }
        env {
          name = "JWT_SECRET"
          value_from {
            secret_key_ref {
              name = "jwt_secret"
              key  = "latest"
            }
          }
        }
         env {
          name = "ADMIN_USER"
          value_from {
            secret_key_ref {
              name = "admin_user"
              key  = "latest"
            }
          }
        }
         env {
          name = "ADMIN_PASS"
          value_from {
            secret_key_ref {
              name = "admin_pass"
              key  = "latest"
            }
          }
        }
      }
    }
    metadata {
      annotations = {
        "run.googleapis.com/vpc-access-connector" = google_vpc_access_connector.connector.name
        "run.googleapis.com/vpc-access-egress"    = "private-ranges-only"
      }
    }
  }
}

# --- FRONTEND SERVICE ---
resource "google_cloud_run_service" "frontend" {
  name     = var.frontend_service_name
  location = var.region

  template {
    spec {
      containers {
        image = var.frontend_image_url
      }
    }
  }
}

# =================================================================
# 5. GLOBAL LOAD BALANCER (The Complex Part)
# =================================================================

# 1. IP Public Global
resource "google_compute_global_address" "lb_ip" {
  name = "frontend-lb-ip"
}

# 2. Network Endpoint Group (NEG) buat Frontend Cloud Run
resource "google_compute_region_network_endpoint_group" "frontend_neg" {
  name                  = "frontend-neg"
  network_endpoint_type = "SERVERLESS"
  region                = var.region
  cloud_run {
    service = google_cloud_run_service.frontend.name
  }
}

# 3. Backend Service (Global)
resource "google_compute_backend_service" "lb_backend" {
  name        = "frontend-backend"
  protocol    = "HTTP"
  timeout_sec = 30
  
  backend {
    group = google_compute_region_network_endpoint_group.frontend_neg.id
  }
}

# 4. URL Map (Routing Rule)
resource "google_compute_url_map" "default" {
  name            = "frontend-lb-config"
  default_service = google_compute_backend_service.lb_backend.id
}

# 5. SSL Certificate (Managed)
resource "google_compute_managed_ssl_certificate" "default" {
  name = "frontend-cert"
  managed {
    domains = ["example.com"] # Placeholder di TF, realitanya kamu isi domainmu
  }
}

# 6. HTTPS Proxy
resource "google_compute_target_https_proxy" "default" {
  name             = "frontend-lb-proxy"
  url_map          = google_compute_url_map.default.id
  ssl_certificates = [google_compute_managed_ssl_certificate.default.id]
}

# 7. Forwarding Rule (Pintu Masuk Utama)
resource "google_compute_global_forwarding_rule" "default" {
  name       = "frontend-lb"
  target     = google_compute_target_https_proxy.default.id
  port_range = "443"
  ip_address = google_compute_global_address.lb_ip.address
}