-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS qcs CASCADE;
DROP TABLE IF EXISTS quotation_items CASCADE;
DROP TABLE IF EXISTS quotations CASCADE;
DROP TABLE IF EXISTS rfq_suppliers CASCADE;
DROP TABLE IF EXISTS rfqs CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;

-- Suppliers table
CREATE TABLE suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  contact_name TEXT,
  rating TEXT DEFAULT 'B',
  role TEXT NOT NULL
);

-- RFQs table  
CREATE TABLE rfqs (
  id BIGSERIAL PRIMARY KEY,
  rfq_number TEXT UNIQUE NOT NULL,
  project TEXT NOT NULL DEFAULT '',
  component TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 0,
  budget NUMERIC NOT NULL DEFAULT 0,
  delivery_time INTEGER DEFAULT 4,
  plant TEXT DEFAULT '',
  psp_element TEXT DEFAULT '',
  technical_contact TEXT DEFAULT '',
  on_site_visit_required BOOLEAN DEFAULT false,
  request_type TEXT DEFAULT 'Manufacturing',
  status TEXT NOT NULL DEFAULT 'Draft',
  created_by TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RFQ-Supplier assignments
CREATE TABLE rfq_suppliers (
  id BIGSERIAL PRIMARY KEY,
  rfq_id TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  status TEXT DEFAULT 'RFQ Received',
  quoted BOOLEAN DEFAULT false,
  UNIQUE(rfq_id, supplier_id)
);

-- Quotations
CREATE TABLE quotations (
  id TEXT PRIMARY KEY,
  rfq_id TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  total_price NUMERIC DEFAULT 0,
  bonus_malus NUMERIC DEFAULT 0,
  delivery_time INTEGER DEFAULT 4,
  payment_terms TEXT DEFAULT 'Net 30',
  incoterms TEXT DEFAULT 'EXW',
  notes TEXT DEFAULT '',
  quotation_pdf_url TEXT,
  supporting_docs_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Quotation line items
CREATE TABLE quotation_items (
  id TEXT PRIMARY KEY,
  quotation_id TEXT NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  item_name TEXT DEFAULT '',
  description TEXT DEFAULT '',
  quantity INTEGER DEFAULT 0,
  unit_price NUMERIC DEFAULT 0,
  total_price NUMERIC DEFAULT 0
);

-- QCS (Quotation Comparison Sheets)
CREATE TABLE qcs (
  id TEXT PRIMARY KEY,
  rfq_id TEXT NOT NULL,
  created_by_user_id TEXT DEFAULT '',
  buyer TEXT DEFAULT '',
  project TEXT DEFAULT '',
  psp_element TEXT DEFAULT '',
  budget NUMERIC DEFAULT 0,
  impact_savings NUMERIC DEFAULT 0,
  comment TEXT DEFAULT '',
  status TEXT DEFAULT 'draft',
  submitted_to_hop_at TIMESTAMPTZ,
  hop_decision_at TIMESTAMPTZ,
  hop_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Messages
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  rfq_id TEXT,
  qcs_id TEXT,
  thread_type TEXT NOT NULL,
  supplier_id TEXT,
  sender TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  sender_role TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notifications
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  user_id TEXT,
  rfq_id TEXT,
  qcs_id TEXT,
  supplier_id TEXT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  read BOOLEAN DEFAULT false
);

-- Supplier access tokens for passwordless supplier portal access
CREATE TABLE IF NOT EXISTS supplier_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  supplier_id TEXT NOT NULL,
  rfq_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false
);

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_supplier_tokens_token ON supplier_tokens(token);
CREATE INDEX IF NOT EXISTS idx_supplier_tokens_supplier ON supplier_tokens(supplier_id);

-- Enable RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfq_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE qcs ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_tokens ENABLE ROW LEVEL SECURITY;

-- Allow all access (for development)
CREATE POLICY "Allow all" ON suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON rfqs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON rfq_suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON quotations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON quotation_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON qcs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on supplier_tokens" ON supplier_tokens FOR ALL USING (true) WITH CHECK (true);

-- Seed default suppliers
INSERT INTO suppliers (id, name, company, email, contact_name, rating, role) VALUES
  ('SUP-001', 'Steel Corp GmbH', 'Steel Corp', 'contact@steelcorp.de', 'Hans Becker', 'A', 'supplier_a'),
  ('SUP-002', 'MetalWorks AG', 'Industrial Metals', 'info@metalworks.de', 'Sabine Richter', 'B', 'supplier_b'),
  ('SUP-003', 'Precision Parts Ltd', 'Precision Parts', 'sales@precisionparts.co.uk', 'James Wilson', 'A', 'supplier_c'),
  ('SUP-004', 'AlloyTech Industries', 'Global Steel', 'procurement@alloytech.com', 'Maria Garcia', 'B', 'supplier_d'),
  ('SUP-005', 'EuroForge SA', 'Euro Components', 'contact@euroforge.eu', 'Pierre Dubois', 'C', 'supplier_e')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, company = EXCLUDED.company, email = EXCLUDED.email, contact_name = EXCLUDED.contact_name, rating = EXCLUDED.rating, role = EXCLUDED.role;
