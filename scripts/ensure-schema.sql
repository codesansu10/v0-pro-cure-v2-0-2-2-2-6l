-- Safe schema adjustments for ProCure Supabase tables
-- Uses "IF NOT EXISTS" to avoid errors on existing structures

-- ==================== RFQS TABLE ====================
CREATE TABLE IF NOT EXISTS rfqs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rfq_number TEXT UNIQUE,
  project TEXT NOT NULL,
  component TEXT NOT NULL,
  quantity INTEGER DEFAULT 0,
  budget NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Draft',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns if missing
ALTER TABLE rfqs ADD COLUMN IF NOT EXISTS rfq_number TEXT;
ALTER TABLE rfqs ADD COLUMN IF NOT EXISTS project TEXT;
ALTER TABLE rfqs ADD COLUMN IF NOT EXISTS component TEXT;
ALTER TABLE rfqs ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 0;
ALTER TABLE rfqs ADD COLUMN IF NOT EXISTS budget NUMERIC DEFAULT 0;
ALTER TABLE rfqs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Draft';
ALTER TABLE rfqs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ==================== SUPPLIERS TABLE ====================
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  contact_name TEXT,
  rating TEXT DEFAULT 'B',
  role TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns if missing
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS rating TEXT DEFAULT 'B';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ==================== RFQ_SUPPLIERS TABLE ====================
CREATE TABLE IF NOT EXISTS rfq_suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rfq_id TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  status TEXT DEFAULT 'RFQ Received',
  quoted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rfq_id, supplier_id)
);

-- Add columns if missing
ALTER TABLE rfq_suppliers ADD COLUMN IF NOT EXISTS rfq_id TEXT;
ALTER TABLE rfq_suppliers ADD COLUMN IF NOT EXISTS supplier_id TEXT;
ALTER TABLE rfq_suppliers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'RFQ Received';
ALTER TABLE rfq_suppliers ADD COLUMN IF NOT EXISTS quoted BOOLEAN DEFAULT FALSE;
ALTER TABLE rfq_suppliers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ==================== QUOTATIONS TABLE ====================
CREATE TABLE IF NOT EXISTS quotations (
  id TEXT PRIMARY KEY,
  rfq_id TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns if missing
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS rfq_id TEXT;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS supplier_id TEXT;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ==================== QUOTATION_ITEMS TABLE ====================
CREATE TABLE IF NOT EXISTS quotation_items (
  id TEXT PRIMARY KEY,
  quotation_id TEXT NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  total_price NUMERIC DEFAULT 0
);

-- Add columns if missing
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS quotation_id TEXT;
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS item_name TEXT;
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS unit_price NUMERIC DEFAULT 0;
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS total_price NUMERIC DEFAULT 0;

-- ==================== SEED DEFAULT SUPPLIERS ====================
INSERT INTO suppliers (id, name, company, email, contact_name, rating, role)
VALUES 
  ('SUP-001', 'Supplier A', 'Steel Corp', 'suppliera@steelcorp.com', 'Anna Keller', 'A', 'supplier_a'),
  ('SUP-002', 'Supplier B', 'Industrial Metals', 'supplierb@industrialmetals.com', 'Markus Weber', 'A', 'supplier_b'),
  ('SUP-003', 'Supplier C', 'Precision Parts', 'supplierc@precisionparts.com', 'Sophie Lang', 'A', 'supplier_c'),
  ('SUP-004', 'Supplier D', 'Global Steel', 'supplierd@globalsteel.com', 'Daniel Braun', 'B', 'supplier_d'),
  ('SUP-005', 'Supplier E', 'Euro Components', 'suppliere@eurocomponents.com', 'Laura Fischer', 'A', 'supplier_e')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  company = EXCLUDED.company,
  email = EXCLUDED.email,
  contact_name = EXCLUDED.contact_name,
  rating = EXCLUDED.rating,
  role = EXCLUDED.role;
