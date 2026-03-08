-- HMS Seed Data
-- Run this AFTER schema.sql and rls.sql in Supabase SQL Editor

-- ============================================
-- Categories
-- ============================================
INSERT INTO categories (name) VALUES
  ('Plumbing'),
  ('Electrical'),
  ('Hardware');

-- ============================================
-- Products (prices in cents: 150000 = TSh 1,500)
-- ============================================
INSERT INTO products (name, sku, category_id, cost_price, selling_price, stock_quantity, unit) VALUES
  (
    'PVC Pipe 1 inch (3m)',
    'PLB-001',
    (SELECT id FROM categories WHERE name = 'Plumbing'),
    350000,
    500000,
    50,
    'piece'
  ),
  (
    'Ball Valve 1/2 inch',
    'PLB-002',
    (SELECT id FROM categories WHERE name = 'Plumbing'),
    800000,
    1200000,
    30,
    'piece'
  ),
  (
    'Electric Cable 2.5mm (per meter)',
    'ELC-001',
    (SELECT id FROM categories WHERE name = 'Electrical'),
    150000,
    250000,
    200,
    'meter'
  ),
  (
    'Light Switch Single',
    'ELC-002',
    (SELECT id FROM categories WHERE name = 'Electrical'),
    300000,
    500000,
    75,
    'piece'
  ),
  (
    'Cement Nail 3 inch (per kg)',
    'HDW-001',
    (SELECT id FROM categories WHERE name = 'Hardware'),
    250000,
    400000,
    100,
    'kg'
  );
