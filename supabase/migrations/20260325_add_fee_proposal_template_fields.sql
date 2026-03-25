-- Step 1: Extend quote_templates and quotes for fee proposal template engine
-- NOTE: quotes.template_id already exists in current schema, so it is not re-added.

ALTER TABLE quote_templates
  ADD COLUMN IF NOT EXISTS content TEXT,
  ADD COLUMN IF NOT EXISTS variables_json JSONB,
  ADD COLUMN IF NOT EXISTS template_type TEXT,
  ADD COLUMN IF NOT EXISTS service_type TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES quote_templates(id),
  ADD COLUMN IF NOT EXISTS template_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS variables_json JSONB,
  ADD COLUMN IF NOT EXISTS editable_content TEXT,
  ADD COLUMN IF NOT EXISTS rendered_content TEXT,
  ADD COLUMN IF NOT EXISTS pdf_file_path TEXT,
  ADD COLUMN IF NOT EXISTS quote_type TEXT;
