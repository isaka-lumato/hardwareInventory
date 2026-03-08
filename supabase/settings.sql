-- Settings table (single-row config)
-- Run this after schema.sql in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  store_name TEXT NOT NULL DEFAULT 'Hardware Store',
  currency_symbol TEXT NOT NULL DEFAULT 'TSh',
  invoice_footer TEXT NOT NULL DEFAULT 'Thank you for your business!',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default row
INSERT INTO settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- RLS: all authenticated can read, only admins can update
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can read settings"
  ON settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can update settings"
  ON settings FOR UPDATE
  USING (auth.user_role() = 'admin');
