-- =====================================================================
-- TindaOrder (System 1 - Online Ordering System) database
-- Import this in phpMyAdmin (XAMPP) -> Import -> choose this file -> Go
-- This is a SEPARATE database from TindaTrack's "tindatrack" database.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS tindaorder CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE tindaorder;

DROP TABLE IF EXISTS api_logs;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS customers;

-- Online customers of System 1 (System 2 only receives the customer_code)
CREATE TABLE customers (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) NULL,
    address VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Orders placed in System 1. status is decided by System 2's response.
CREATE TABLE orders (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL UNIQUE,              -- e.g. ORD-20261019-0001 (sent to System 2)
    customer_id INT UNSIGNED NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',     -- pending | confirmed | rejected | failed
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    api_http_status SMALLINT NULL,                     -- last HTTP status returned by System 2
    api_message VARCHAR(500) NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id)
) ENGINE=InnoDB;

-- Order lines. available_quantity / stock_status are copied from System 2's response.
CREATE TABLE order_items (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NOT NULL,                  -- TindaTrack product id
    product_name VARCHAR(255) NULL,
    quantity INT UNSIGNED NOT NULL,
    unit_price DECIMAL(12,2) NULL,
    available_quantity INT NULL,
    stock_status VARCHAR(30) NULL,
    CONSTRAINT fk_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Every API call System 1 makes to System 2 (request + response JSON)
CREATE TABLE api_logs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id VARCHAR(50) NULL,
    method VARCHAR(10) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    request_body TEXT NULL,
    response_body MEDIUMTEXT NULL,
    http_status SMALLINT NOT NULL,
    duration_ms INT NOT NULL,
    created_at DATETIME NOT NULL
) ENGINE=InnoDB;

INSERT INTO customers (customer_code, name, email, address) VALUES
('CUST-001', 'Maria Santos',   'maria.santos@example.com', 'Purok 1, Brgy. San Isidro'),
('CUST-002', 'Jose Rizal Cruz', 'jose.cruz@example.com',   'Purok 2, Brgy. San Isidro'),
('CUST-003', 'Ana Reyes',      'ana.reyes@example.com',    'Purok 3, Brgy. San Isidro');
