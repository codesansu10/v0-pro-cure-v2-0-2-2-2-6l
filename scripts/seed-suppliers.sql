-- Update suppliers table to support all required fields
-- Add missing columns if they don't exist

-- Add contact_name column if not exists
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS contact_name TEXT;

-- Add company column if not exists  
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS company TEXT;

-- Add email column if not exists
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS email TEXT;

-- Add role column for mapping to app roles
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS role TEXT;

-- Add created_at column if not exists
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Clear existing suppliers and insert all 5 suppliers
DELETE FROM suppliers;

INSERT INTO suppliers (id, name, company, email, contact_name, rating, role, created_at)
VALUES 
  ('SUP-001', 'Supplier A', 'Steel Corp', 'suppliera@steelcorp.com', 'Anna Keller', 'A', 'supplier_a', NOW()),
  ('SUP-002', 'Supplier B', 'Industrial Metals', 'supplierb@industrialmetals.com', 'Markus Weber', 'A', 'supplier_b', NOW()),
  ('SUP-003', 'Supplier C', 'Precision Parts', 'supplierc@precisionparts.com', 'Sophie Lang', 'A', 'supplier_c', NOW()),
  ('SUP-004', 'Supplier D', 'Global Steel', 'supplierd@globalsteel.com', 'Daniel Braun', 'B', 'supplier_d', NOW()),
  ('SUP-005', 'Supplier E', 'Euro Components', 'suppliere@eurocomponents.com', 'Laura Fischer', 'A', 'supplier_e', NOW());
