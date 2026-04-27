-- 1. Criação das tabelas base caso elas não existam de forma alguma
CREATE TABLE IF NOT EXISTS promotions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed')),
  value DECIMAL(10, 2) NOT NULL DEFAULT 0,
  active BOOLEAN DEFAULT true,
  min_order_value DECIMAL(10, 2) DEFAULT 0,
  apply_to TEXT NOT NULL DEFAULT 'all' CHECK (apply_to IN ('all', 'category', 'product')),
  target_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_adjustments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  method TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('fee', 'discount')),
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('percentage', 'fixed')),
  value DECIMAL(10, 2) NOT NULL DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, method)
);

-- 2. Atualizar a tabela promotions caso ela JÁ exista mas seja de uma versão anterior (sem as novas colunas)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'promotions' AND column_name = 'apply_to') THEN
    ALTER TABLE promotions ADD COLUMN apply_to TEXT NOT NULL DEFAULT 'all';
    ALTER TABLE promotions ADD CONSTRAINT promotions_apply_to_check CHECK (apply_to IN ('all', 'category', 'product'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'promotions' AND column_name = 'target_id') THEN
    ALTER TABLE promotions ADD COLUMN target_id TEXT;
  END IF;
END $$;

-- 3. Configurar e Habilitar RLS (Segurança)
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_adjustments ENABLE ROW LEVEL SECURITY;

-- Políticas para Promoções
DROP POLICY IF EXISTS "Users can manage their own promotions" ON promotions;
CREATE POLICY "Users can manage their own promotions" ON promotions FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public can view active promotions" ON promotions;
CREATE POLICY "Public can view active promotions" ON promotions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public_catalogs WHERE public_catalogs.user_id = promotions.user_id AND public_catalogs.is_active = true)
  AND active = true
);

-- Políticas para Ajustes de Pagamento
DROP POLICY IF EXISTS "Users can manage their own payment adjustments" ON payment_adjustments;
CREATE POLICY "Users can manage their own payment adjustments" ON payment_adjustments FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public can view active payment adjustments" ON payment_adjustments;
CREATE POLICY "Public can view active payment adjustments" ON payment_adjustments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public_catalogs WHERE public_catalogs.user_id = payment_adjustments.user_id AND public_catalogs.is_active = true)
  AND active = true
);
