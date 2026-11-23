-- =====================================================================
-- DigiCreative Database Schema (MySQL 8.0+ / MariaDB 10.6+)
-- Ecosystem: kelasdigi.id
-- =====================================================================

CREATE DATABASE IF NOT EXISTS digicreative_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE digicreative_db;

-- ---------------------------------------------------------------------
-- 1. USERS (Admin, Konsultan, & Customer)
-- ---------------------------------------------------------------------
CREATE TABLE users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(30) NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'consultant', 'customer') NOT NULL DEFAULT 'customer',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 2. SERVICES (6 Layanan Utama DigiCreative)
-- ---------------------------------------------------------------------
CREATE TABLE services (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  tagline VARCHAR(180) NOT NULL,
  badge_label VARCHAR(50) NULL,
  short_description TEXT NOT NULL,
  price_hint VARCHAR(60) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 3. PACKAGES (Paket Harga per Layanan)
-- ---------------------------------------------------------------------
CREATE TABLE packages (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  service_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL,
  billing_cycle ENUM('one_time', 'monthly', 'custom') NOT NULL DEFAULT 'one_time',
  price DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  is_popular TINYINT(1) NOT NULL DEFAULT 0,
  features_json JSON NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_packages_service
    FOREIGN KEY (service_id) REFERENCES services(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 4. PROMO_CODES (Kode Diskon Payment Gateway)
-- ---------------------------------------------------------------------
CREATE TABLE promo_codes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  label VARCHAR(120) NOT NULL,
  discount_type ENUM('percent', 'fixed') NOT NULL,
  discount_value DECIMAL(14, 2) NOT NULL,
  max_uses INT UNSIGNED NULL,
  used_count INT UNSIGNED NOT NULL DEFAULT 0,
  valid_from DATETIME NULL,
  valid_until DATETIME NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 5. ORDERS (Pemesanan Paket Layanan)
-- ---------------------------------------------------------------------
CREATE TABLE orders (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invoice_id VARCHAR(40) NOT NULL UNIQUE,
  user_id BIGINT UNSIGNED NULL,
  package_id BIGINT UNSIGNED NOT NULL,
  promo_code_id BIGINT UNSIGNED NULL,
  customer_name VARCHAR(120) NOT NULL,
  customer_email VARCHAR(150) NOT NULL,
  customer_phone VARCHAR(30) NOT NULL,
  company_name VARCHAR(150) NULL,
  subtotal DECIMAL(14, 2) NOT NULL,
  discount_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  admin_fee DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(14, 2) NOT NULL,
  status ENUM('PENDING', 'PAID', 'EXPIRED', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
  expires_at DATETIME NOT NULL,
  paid_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_orders_status (status),
  INDEX idx_orders_email (customer_email),
  CONSTRAINT fk_orders_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_orders_package
    FOREIGN KEY (package_id) REFERENCES packages(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_orders_promo
    FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 6. PAYMENTS (Transaksi & Log Webhook Payment Gateway)
-- ---------------------------------------------------------------------
CREATE TABLE payments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  gateway_provider VARCHAR(50) NOT NULL DEFAULT 'digipay',
  gateway_reference VARCHAR(120) NULL UNIQUE,
  method_group ENUM('qris', 'va', 'ewallet', 'card') NOT NULL,
  method_detail VARCHAR(100) NOT NULL,
  va_number VARCHAR(40) NULL,
  qris_nmid VARCHAR(60) NULL,
  amount DECIMAL(14, 2) NOT NULL,
  payment_status ENUM('INITIATED', 'WAITING', 'SETTLEMENT', 'FAILED', 'EXPIRED') NOT NULL DEFAULT 'WAITING',
  webhook_payload JSON NULL,
  paid_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_payments_order (order_id),
  CONSTRAINT fk_payments_order
    FOREIGN KEY (order_id) REFERENCES orders(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 7. LEADS (Form Konsultasi, Kampus, In-House, Potrait, Kontak)
-- ---------------------------------------------------------------------
CREATE TABLE leads (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  source_page ENUM(
    'beranda',
    'kontak',
    'in_house_training',
    'kelas_campus',
    'digi_potrait',
    'booking_modal'
  ) NOT NULL,
  service_id BIGINT UNSIGNED NULL,
  full_name VARCHAR(120) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  email VARCHAR(150) NULL,
  organization_name VARCHAR(150) NULL,
  estimated_participants VARCHAR(60) NULL,
  preferred_date DATE NULL,
  notes TEXT NULL,
  status ENUM('NEW', 'CONTACTED', 'PROPOSAL_SENT', 'WON', 'LOST') NOT NULL DEFAULT 'NEW',
  assigned_to BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_leads_status (status),
  CONSTRAINT fk_leads_service
    FOREIGN KEY (service_id) REFERENCES services(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_leads_assignee
    FOREIGN KEY (assigned_to) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 8. ARTICLES (Pusat Edukasi Digital & Link Eksternal)
-- ---------------------------------------------------------------------
CREATE TABLE articles (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(120) NOT NULL UNIQUE,
  title VARCHAR(220) NOT NULL,
  category VARCHAR(80) NOT NULL,
  filter_key VARCHAR(60) NOT NULL,
  badge VARCHAR(60) NULL,
  excerpt TEXT NOT NULL,
  source_domain VARCHAR(100) NOT NULL,
  external_url VARCHAR(500) NOT NULL,
  author_name VARCHAR(100) NOT NULL,
  author_role VARCHAR(100) NULL,
  author_initials VARCHAR(5) NOT NULL,
  read_time VARCHAR(30) NOT NULL DEFAULT '5 Menit',
  cover_image_url VARCHAR(500) NOT NULL,
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  published_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_articles_filter (filter_key)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 9. PORTFOLIOS (Showcase Karya Desain, Web, & Sosial Media)
-- ---------------------------------------------------------------------
CREATE TABLE portfolios (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(100) NOT NULL UNIQUE,
  service_id BIGINT UNSIGNED NOT NULL,
  category VARCHAR(80) NOT NULL,
  badge VARCHAR(60) NOT NULL,
  year_location VARCHAR(80) NULL,
  title VARCHAR(160) NOT NULL,
  subtitle TEXT NOT NULL,
  impact_result VARCHAR(180) NOT NULL,
  is_dark_theme TINYINT(1) NOT NULL DEFAULT 0,
  monogram_code VARCHAR(4) NOT NULL,
  accent_class VARCHAR(80) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_portfolios_service
    FOREIGN KEY (service_id) REFERENCES services(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 10. TEAM_MEMBERS (Profil Perusahaan - Tim Ahli di Balik Layar)
-- ---------------------------------------------------------------------
CREATE TABLE team_members (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  role_title VARCHAR(100) NOT NULL,
  specialty VARCHAR(120) NOT NULL,
  photo_url VARCHAR(500) NOT NULL,
  linkedin_url VARCHAR(300) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 11. TESTIMONIALS (Testimoni Klien per Layanan)
-- ---------------------------------------------------------------------
CREATE TABLE testimonials (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  service_id BIGINT UNSIGNED NULL,
  client_name VARCHAR(120) NOT NULL,
  client_role VARCHAR(150) NOT NULL,
  client_initials VARCHAR(5) NOT NULL,
  metric_badge VARCHAR(60) NULL,
  rating TINYINT UNSIGNED NOT NULL DEFAULT 5,
  quote TEXT NOT NULL,
  is_featured TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_testimonials_service
    FOREIGN KEY (service_id) REFERENCES services(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;
