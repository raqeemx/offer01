-- =============================================
-- نظام إدارة عروض الأسعار - Supabase Schema
-- =============================================

-- تفعيل UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- جدول العملاء
-- =============================================
CREATE TABLE clients (
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
-- جدول عروض الأسعار
-- =============================================
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  quote_number TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
  notes TEXT,
  total NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- جدول بنود عروض الأسعار
-- =============================================
CREATE TABLE quote_items (
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
-- جدول تسلسل أرقام العروض
-- =============================================
CREATE TABLE quote_sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_number INTEGER DEFAULT 0
);

-- =============================================
-- الفهارس
-- =============================================
CREATE INDEX idx_clients_user_id ON clients(user_id);
CREATE INDEX idx_quotes_user_id ON quotes(user_id);
CREATE INDEX idx_quotes_client_id ON quotes(client_id);
CREATE INDEX idx_quote_items_quote_id ON quote_items(quote_id);
CREATE UNIQUE INDEX idx_quotes_number_user ON quotes(quote_number, user_id);

-- =============================================
-- Row Level Security (RLS)
-- =============================================

-- تفعيل RLS على جميع الجداول
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_sequences ENABLE ROW LEVEL SECURITY;

-- سياسات العملاء
CREATE POLICY "users_own_clients" ON clients
  FOR ALL USING (auth.uid() = user_id);

-- سياسات عروض الأسعار
CREATE POLICY "users_own_quotes" ON quotes
  FOR ALL USING (auth.uid() = user_id);

-- سياسات بنود العروض
CREATE POLICY "users_own_quote_items" ON quote_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM quotes WHERE quotes.id = quote_items.quote_id AND quotes.user_id = auth.uid()
    )
  );

-- سياسات تسلسل الأرقام
CREATE POLICY "users_own_sequences" ON quote_sequences
  FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- دالة تحديث updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- دالة توليد رقم العرض التلقائي
-- =============================================
CREATE OR REPLACE FUNCTION generate_quote_number(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_next_number INTEGER;
  v_year TEXT;
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');
  
  INSERT INTO quote_sequences (user_id, last_number)
  VALUES (p_user_id, 1)
  ON CONFLICT (user_id)
  DO UPDATE SET last_number = quote_sequences.last_number + 1
  RETURNING last_number INTO v_next_number;
  
  RETURN 'QT-' || v_year || '-' || LPAD(v_next_number::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- دالة حساب إجمالي العرض تلقائيًا
-- =============================================
CREATE OR REPLACE FUNCTION update_quote_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE quotes 
  SET total = (
    SELECT COALESCE(SUM(quantity * unit_price), 0) 
    FROM quote_items 
    WHERE quote_id = COALESCE(NEW.quote_id, OLD.quote_id)
  )
  WHERE id = COALESCE(NEW.quote_id, OLD.quote_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quote_items_total_insert
  AFTER INSERT ON quote_items
  FOR EACH ROW EXECUTE FUNCTION update_quote_total();

CREATE TRIGGER quote_items_total_update
  AFTER UPDATE ON quote_items
  FOR EACH ROW EXECUTE FUNCTION update_quote_total();

CREATE TRIGGER quote_items_total_delete
  AFTER DELETE ON quote_items
  FOR EACH ROW EXECUTE FUNCTION update_quote_total();
