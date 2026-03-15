-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS rfq_supplier_recommendations CASCADE;
DROP TABLE IF EXISTS supplier_certifications CASCADE;
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
  role TEXT NOT NULL,
  -- NLP Recommendation Engine extended attributes
  scc_codes TEXT[],                   -- Standard Commodity Codes
  material_groups TEXT[],             -- Material group tags
  country TEXT,                       -- Supplier country
  segment TEXT DEFAULT 'approved',    -- preferred | approved | conditional | new
  purchasing_block BOOLEAN DEFAULT false,
  -- Performance scoring
  sgp_total_score NUMERIC DEFAULT 70,
  supplier_evaluation_score NUMERIC DEFAULT 70,
  sustainability_audit_score NUMERIC DEFAULT 70,
  -- Risk / compliance
  risk_assessment_result TEXT,        -- A | B | C
  credit_check_score NUMERIC DEFAULT 70
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

-- ─── NLP Supplier Recommendation tables ──────────────────────────────────────

-- Stores AI-generated supplier recommendations per RFQ
CREATE TABLE rfq_supplier_recommendations (
  id BIGSERIAL PRIMARY KEY,
  rfq_id TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  rank INTEGER NOT NULL,
  final_score NUMERIC NOT NULL,
  enhanced_relevance_score NUMERIC,
  risk_compliance_score NUMERIC,
  performance_score NUMERIC,
  nlp_similarity_score NUMERIC,
  eligibility_reason TEXT DEFAULT 'Eligible',
  soft_warnings TEXT,         -- semicolon-separated list
  reasons TEXT,               -- pipe-separated list
  generated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (rfq_id, supplier_id)
);

CREATE INDEX IF NOT EXISTS idx_rfq_recs_rfq ON rfq_supplier_recommendations(rfq_id);

-- Tracks certification expiry dates per supplier
CREATE TABLE supplier_certifications (
  supplier_id TEXT PRIMARY KEY,
  qm_cert_expiry DATE,
  iso14001_expiry DATE,
  iso45001_expiry DATE,
  updated_at TIMESTAMPTZ DEFAULT now()
);

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
ALTER TABLE rfq_supplier_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_certifications ENABLE ROW LEVEL SECURITY;

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
CREATE POLICY "Allow all" ON rfq_supplier_recommendations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON supplier_certifications FOR ALL USING (true) WITH CHECK (true);

-- Enable Supabase Realtime on all tables that need live updates.
-- These settings allow the Realtime WebSocket channel to broadcast row-level
-- changes to connected clients so all dashboards see updates instantly.
ALTER TABLE rfqs REPLICA IDENTITY FULL;
ALTER TABLE rfq_suppliers REPLICA IDENTITY FULL;
ALTER TABLE quotations REPLICA IDENTITY FULL;
ALTER TABLE qcs REPLICA IDENTITY FULL;
ALTER TABLE messages REPLICA IDENTITY FULL;
ALTER TABLE notifications REPLICA IDENTITY FULL;

-- Add all realtime-enabled tables to the supabase_realtime publication.
-- Run this once in the Supabase SQL editor after applying the schema.
-- (If the publication already exists, use ALTER PUBLICATION instead of CREATE.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime FOR TABLE rfqs, rfq_suppliers, quotations, qcs, messages, notifications;
  ELSE
    ALTER PUBLICATION supabase_realtime ADD TABLE rfqs, rfq_suppliers, quotations, qcs, messages, notifications;
  END IF;
END $$;

-- Seed default suppliers (with NLP scoring attributes)
INSERT INTO suppliers (id, name, company, email, contact_name, rating, role,
  scc_codes, material_groups, country, segment,
  sgp_total_score, supplier_evaluation_score, sustainability_audit_score,
  risk_assessment_result, credit_check_score) VALUES
  ('SUP-001', 'Steel Corp GmbH', 'Steel Corp', 'contact@steelcorp.de', 'Hans Becker', 'A', 'supplier_a',
   ARRAY['steel','structural','plates','beams'], ARRAY['raw-materials','metal'], 'Germany', 'preferred',
   88, 85, 80, 'A', 90),
  ('SUP-002', 'MetalWorks AG', 'Industrial Metals', 'info@metalworks.de', 'Sabine Richter', 'B', 'supplier_b',
   ARRAY['machined','cnc','components','parts'], ARRAY['machined-components','precision'], 'Germany', 'approved',
   74, 72, 68, 'B', 75),
  ('SUP-003', 'Precision Parts Ltd', 'Precision Parts', 'sales@precisionparts.co.uk', 'James Wilson', 'A', 'supplier_c',
   ARRAY['bearings','fasteners','precision','assembly'], ARRAY['precision-parts','fasteners'], 'UK', 'preferred',
   90, 88, 85, 'A', 92),
  ('SUP-004', 'AlloyTech Industries', 'Global Steel', 'procurement@alloytech.com', 'Maria Garcia', 'B', 'supplier_d',
   ARRAY['aluminum','titanium','alloy','aerospace'], ARRAY['light-metals','alloys'], 'USA', 'conditional',
   65, 60, 55, 'B', 65),
  ('SUP-005', 'EuroForge SA', 'Euro Components', 'contact@euroforge.eu', 'Pierre Dubois', 'C', 'supplier_e',
   ARRAY['forging','casting','heavy','industrial'], ARRAY['forged-parts','castings'], 'France', 'approved',
   58, 55, 50, 'C', 55)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, company = EXCLUDED.company, email = EXCLUDED.email,
  contact_name = EXCLUDED.contact_name, rating = EXCLUDED.rating, role = EXCLUDED.role,
  scc_codes = EXCLUDED.scc_codes, material_groups = EXCLUDED.material_groups,
  country = EXCLUDED.country, segment = EXCLUDED.segment,
  sgp_total_score = EXCLUDED.sgp_total_score,
  supplier_evaluation_score = EXCLUDED.supplier_evaluation_score,
  sustainability_audit_score = EXCLUDED.sustainability_audit_score,
  risk_assessment_result = EXCLUDED.risk_assessment_result,
  credit_check_score = EXCLUDED.credit_check_score;
