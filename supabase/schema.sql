-- =============================================
-- نظام إدارة عروض الأسعار - Supabase Schema V2
-- =============================================
-- ⚠️ شغّل هذا الملف في Supabase SQL Editor
-- إذا كانت الجداول القديمة موجودة، احذفها أولاً:
-- DROP TABLE IF EXISTS quote_items, quote_timeline, quotes, quote_templates, template_items, projects, clients, quote_sequences CASCADE;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- جدول العملاء
-- =============================================
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- جدول قوالب عروض الأسعار
-- =============================================
CREATE TABLE IF NOT EXISTS quote_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  default_notes TEXT,
  default_valid_days INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- بنود القوالب
-- =============================================
CREATE TABLE IF NOT EXISTS template_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES quote_templates(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

-- =============================================
-- جدول عروض الأسعار (محدّث)
-- =============================================
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  quote_number TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','accepted','rejected','expired')),
  notes TEXT,
  total NUMERIC(12,2) DEFAULT 0,
  valid_until DATE,
  next_followup_date DATE,
  lost_reason TEXT,
  renewed_from UUID REFERENCES quotes(id),
  pdf_url TEXT,
  template_id UUID REFERENCES quote_templates(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- جدول بنود عروض الأسعار
-- =============================================
CREATE TABLE IF NOT EXISTS quote_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- جدول Timeline (سجل أحداث العرض)
-- =============================================
CREATE TABLE IF NOT EXISTS quote_timeline (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details TEXT,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- جدول المشاريع (تحويل العرض المقبول)
-- =============================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quote_id UUID REFERENCES quotes(id),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','on_hold','completed','cancelled')),
  budget NUMERIC(12,2) DEFAULT 0,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- جدول تسلسل أرقام العروض
-- =============================================
CREATE TABLE IF NOT EXISTS quote_sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_number INTEGER DEFAULT 0
);

-- =============================================
-- الفهارس
-- =============================================
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_valid_until ON quotes(valid_until);
CREATE INDEX IF NOT EXISTS idx_quotes_followup ON quotes(next_followup_date);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_timeline_quote_id ON quote_timeline(quote_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_quote_id ON projects(quote_id);
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON quote_templates(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_quotes_number_user ON quotes(quote_number, user_id);

-- =============================================
-- Row Level Security (RLS)
-- =============================================
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- سياسات RLS
DO $$ BEGIN
  -- clients
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='users_own_clients') THEN
    CREATE POLICY "users_own_clients" ON clients FOR ALL USING (auth.uid() = user_id);
  END IF;
  -- quotes
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='users_own_quotes') THEN
    CREATE POLICY "users_own_quotes" ON quotes FOR ALL USING (auth.uid() = user_id);
  END IF;
  -- quote_items
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='users_own_quote_items') THEN
    CREATE POLICY "users_own_quote_items" ON quote_items FOR ALL USING (
      EXISTS (SELECT 1 FROM quotes WHERE quotes.id = quote_items.quote_id AND quotes.user_id = auth.uid())
    );
  END IF;
  -- quote_sequences
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='users_own_sequences') THEN
    CREATE POLICY "users_own_sequences" ON quote_sequences FOR ALL USING (auth.uid() = user_id);
  END IF;
  -- quote_timeline
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='users_own_timeline') THEN
    CREATE POLICY "users_own_timeline" ON quote_timeline FOR ALL USING (auth.uid() = user_id);
  END IF;
  -- quote_templates
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='users_own_templates') THEN
    CREATE POLICY "users_own_templates" ON quote_templates FOR ALL USING (auth.uid() = user_id);
  END IF;
  -- template_items
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='users_own_template_items') THEN
    CREATE POLICY "users_own_template_items" ON template_items FOR ALL USING (
      EXISTS (SELECT 1 FROM quote_templates WHERE quote_templates.id = template_items.template_id AND quote_templates.user_id = auth.uid())
    );
  END IF;
  -- projects
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='users_own_projects') THEN
    CREATE POLICY "users_own_projects" ON projects FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- =============================================
-- Triggers
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS clients_updated_at ON clients;
CREATE TRIGGER clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS quotes_updated_at ON quotes;
CREATE TRIGGER quotes_updated_at BEFORE UPDATE ON quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS projects_updated_at ON projects;
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- دالة توليد رقم العرض التلقائي
-- =============================================
CREATE OR REPLACE FUNCTION generate_quote_number(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE v_next INTEGER; v_year TEXT;
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');
  INSERT INTO quote_sequences (user_id, last_number) VALUES (p_user_id, 1)
  ON CONFLICT (user_id) DO UPDATE SET last_number = quote_sequences.last_number + 1
  RETURNING last_number INTO v_next;
  RETURN 'QT-' || v_year || '-' || LPAD(v_next::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- دالة حساب إجمالي العرض
-- =============================================
CREATE OR REPLACE FUNCTION update_quote_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE quotes SET total = (
    SELECT COALESCE(SUM(quantity * unit_price), 0) FROM quote_items WHERE quote_id = COALESCE(NEW.quote_id, OLD.quote_id)
  ) WHERE id = COALESCE(NEW.quote_id, OLD.quote_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS quote_items_total_insert ON quote_items;
CREATE TRIGGER quote_items_total_insert AFTER INSERT ON quote_items FOR EACH ROW EXECUTE FUNCTION update_quote_total();
DROP TRIGGER IF EXISTS quote_items_total_update ON quote_items;
CREATE TRIGGER quote_items_total_update AFTER UPDATE ON quote_items FOR EACH ROW EXECUTE FUNCTION update_quote_total();
DROP TRIGGER IF EXISTS quote_items_total_delete ON quote_items;
CREATE TRIGGER quote_items_total_delete AFTER DELETE ON quote_items FOR EACH ROW EXECUTE FUNCTION update_quote_total();

-- =============================================
-- Supabase Storage Bucket for PDF files
-- ⚠️ شغّل هذا القسم بعد إنشاء الجداول أعلاه
-- =============================================

-- إنشاء bucket لملفات PDF
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('quote-pdfs', 'quote-pdfs', true, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- سياسة: المستخدم يمكنه رفع PDF في مجلده الخاص
CREATE POLICY "Users can upload PDFs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'quote-pdfs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- سياسة: المستخدم يمكنه تحديث ملفاته
CREATE POLICY "Users can update own PDFs"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'quote-pdfs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- سياسة: المستخدم يمكنه حذف ملفاته
CREATE POLICY "Users can delete own PDFs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'quote-pdfs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- سياسة: أي شخص يمكنه قراءة ملفات PDF (عامة)
CREATE POLICY "Public read PDFs"
ON storage.objects FOR SELECT
USING (bucket_id = 'quote-pdfs');
