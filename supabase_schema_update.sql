-- 1. Criar tabela de categorias (se não existir)
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID DEFAULT auth.uid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Garantir colunas e restrições em categories
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='user_id') THEN
        ALTER TABLE categories ADD COLUMN user_id UUID DEFAULT auth.uid();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'categories_user_id_name_key') THEN
        ALTER TABLE categories ADD CONSTRAINT categories_user_id_name_key UNIQUE (user_id, name);
    END IF;
END $$;

-- 2. Atualizar a tabela de produtos existente (adicionando campos novos com segurança)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='user_id') THEN
        ALTER TABLE products ADD COLUMN user_id UUID DEFAULT auth.uid();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='purchase_price') THEN
        ALTER TABLE products ADD COLUMN purchase_price DECIMAL(10, 2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='sale_price') THEN
        ALTER TABLE products ADD COLUMN sale_price DECIMAL(10, 2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='stock') THEN
        ALTER TABLE products ADD COLUMN stock INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='description') THEN
        ALTER TABLE products ADD COLUMN description TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='image') THEN
        ALTER TABLE products ADD COLUMN image TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='available') THEN
        ALTER TABLE products ADD COLUMN available BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='price') THEN
        ALTER TABLE products ADD COLUMN price DECIMAL(10, 2) DEFAULT 0;
    END IF;
END $$;

-- 3. Criar tabela de clientes (se não existir)
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID DEFAULT auth.uid(),
  name TEXT NOT NULL,
  establishment TEXT NOT NULL,
  phone TEXT,
  whatsapp TEXT,
  address TEXT,
  city TEXT,
  observations TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Garantir user_id em clients caso a tabela já exista
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='user_id') THEN
        ALTER TABLE clients ADD COLUMN user_id UUID DEFAULT auth.uid();
    END IF;
END $$;

-- 4. Criar tabela de pedidos (se não existir)
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID DEFAULT auth.uid(),
  client_id UUID REFERENCES clients(id),
  total DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending',
  payment_method TEXT,
  notes TEXT,
  public_customer_name TEXT,
  public_customer_phone TEXT,
  public_customer_whatsapp TEXT,
  source TEXT DEFAULT 'internal',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Garantir user_id em orders caso a tabela já exista
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='user_id') THEN
        ALTER TABLE orders ADD COLUMN user_id UUID DEFAULT auth.uid();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='public_customer_name') THEN
        ALTER TABLE orders ADD COLUMN public_customer_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='public_customer_phone') THEN
        ALTER TABLE orders ADD COLUMN public_customer_phone TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='public_customer_whatsapp') THEN
        ALTER TABLE orders ADD COLUMN public_customer_whatsapp TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='source') THEN
        ALTER TABLE orders ADD COLUMN source TEXT DEFAULT 'internal';
    END IF;
END $$;

-- 5. Criar tabela de itens do pedido (se não existir)
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  variation_id UUID REFERENCES product_variations(id),
  variation_name TEXT,
  quantity INTEGER NOT NULL,
  price_at_time DECIMAL(10, 2) NOT NULL
);

-- Garantir colunas novas em order_items caso ela já exista
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='order_items' AND column_name='variation_id') THEN
        ALTER TABLE order_items ADD COLUMN variation_id UUID REFERENCES product_variations(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='order_items' AND column_name='variation_name') THEN
        ALTER TABLE order_items ADD COLUMN variation_name TEXT;
    END IF;
END $$;

-- 6. Criar tabela de variações de produtos (se não existir)
CREATE TABLE IF NOT EXISTS product_variations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., 'Sabor', 'Tamanho'
  value TEXT NOT NULL, -- e.g., 'Chocolate', 'G'
  additional_price DECIMAL(10, 2) DEFAULT 0,
  stock INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Criar tabela de configurações (se não existir)
CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID DEFAULT auth.uid() UNIQUE, -- Adicionando UNIQUE para upsert funcionar
  store_name TEXT DEFAULT 'Minha Loja B2B',
  store_phone TEXT,
  store_email TEXT,
  store_address TEXT,
  store_logo TEXT,
  currency TEXT DEFAULT 'R$',
  tax_id TEXT, -- CNPJ
  whatsapp_message_template TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Garantir user_id e UNIQUE em settings caso a tabela já exista
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='settings' AND column_name='user_id') THEN
        ALTER TABLE settings ADD COLUMN user_id UUID DEFAULT auth.uid();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'settings_user_id_key') THEN
        ALTER TABLE settings ADD CONSTRAINT settings_user_id_key UNIQUE (user_id);
    END IF;
END $$;

-- 7.1. Criar tabela de configurações de aplicativo (Etapa 1: Notificações, Tema, Cores)
CREATE TABLE IF NOT EXISTS app_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID DEFAULT auth.uid() UNIQUE,
  notifications_enabled BOOLEAN DEFAULT true,
  dark_mode BOOLEAN DEFAULT false,
  theme_color TEXT DEFAULT '#3b82f6',
  backup_frequency TEXT DEFAULT 'manual', -- manual, daily, weekly
  backup_format TEXT DEFAULT 'json', -- json, csv
  backup_email_enabled BOOLEAN DEFAULT false, -- Nova preferência para e-mail
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Garantir user_id e UNIQUE em app_config caso a tabela já exista
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='app_config' AND column_name='user_id') THEN
        ALTER TABLE app_config ADD COLUMN user_id UUID DEFAULT auth.uid();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'app_config_user_id_key') THEN
        ALTER TABLE app_config ADD CONSTRAINT app_config_user_id_key UNIQUE (user_id);
    END IF;
END $$;

-- Garantir colunas novas em app_config caso ela já exista (evita PGRST204 no schema cache)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='app_config' AND column_name='notifications_enabled') THEN
        ALTER TABLE app_config ADD COLUMN notifications_enabled BOOLEAN DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='app_config' AND column_name='dark_mode') THEN
        ALTER TABLE app_config ADD COLUMN dark_mode BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='app_config' AND column_name='theme_color') THEN
        ALTER TABLE app_config ADD COLUMN theme_color TEXT DEFAULT '#3b82f6';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='app_config' AND column_name='backup_frequency') THEN
        ALTER TABLE app_config ADD COLUMN backup_frequency TEXT DEFAULT 'manual';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='app_config' AND column_name='backup_format') THEN
        ALTER TABLE app_config ADD COLUMN backup_format TEXT DEFAULT 'json';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='app_config' AND column_name='backup_email_enabled') THEN
        ALTER TABLE app_config ADD COLUMN backup_email_enabled BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='app_config' AND column_name='created_at') THEN
        ALTER TABLE app_config ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='app_config' AND column_name='updated_at') THEN
        ALTER TABLE app_config ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
    END IF;
END $$;

-- 7.2. Criar tabela de backups (Etapa 2)
CREATE TABLE IF NOT EXISTS backups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID DEFAULT auth.uid(),
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  format TEXT NOT NULL,
  size_bytes INTEGER,
  status TEXT DEFAULT 'completed', -- completed, failed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Garantir user_id em backups caso a tabela já exista
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='backups' AND column_name='user_id') THEN
        ALTER TABLE backups ADD COLUMN user_id UUID DEFAULT auth.uid();
    END IF;
END $$;

-- 7.3. Criar tabela de perfis (Etapa 3)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  work_days JSONB DEFAULT '["Seg", "Ter", "Qua", "Qui", "Sex"]',
  work_start_time TIME DEFAULT '08:00',
  work_end_time TIME DEFAULT '18:00',
  service_hours TEXT,
  location_lat DECIMAL(9,6),
  location_lng DECIMAL(9,6),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7.4. Criar tabela de catálogo público (Etapa 4.1)
CREATE TABLE IF NOT EXISTS public_catalogs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID DEFAULT auth.uid() UNIQUE,
  catalog_slug TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='public_catalogs' AND column_name='user_id') THEN
    ALTER TABLE public_catalogs ADD COLUMN user_id UUID DEFAULT auth.uid();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='public_catalogs' AND column_name='catalog_slug') THEN
    ALTER TABLE public_catalogs ADD COLUMN catalog_slug TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='public_catalogs' AND column_name='is_active') THEN
    ALTER TABLE public_catalogs ADD COLUMN is_active BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'public_catalogs_user_id_key') THEN
    ALTER TABLE public_catalogs ADD CONSTRAINT public_catalogs_user_id_key UNIQUE (user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'public_catalogs_catalog_slug_key') THEN
    ALTER TABLE public_catalogs ADD CONSTRAINT public_catalogs_catalog_slug_key UNIQUE (catalog_slug);
  END IF;
END $$;

-- 8. Habilitar Segurança (RLS) e Criar Políticas (se não existirem)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_catalogs ENABLE ROW LEVEL SECURITY;

-- Políticas de Isolamento por Usuário (RLS)
-- Nota: Usando políticas que verificam auth.uid() para multi-tenant
DO $$ 
BEGIN 
    -- Profiles
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own profile') THEN
        CREATE POLICY "Users can manage their own profile" ON profiles 
        FOR ALL USING (auth.uid() = id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own public catalog') THEN
        CREATE POLICY "Users can manage their own public catalog" ON public_catalogs
        FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;

    -- App Config
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own app config') THEN
        CREATE POLICY "Users can manage their own app config" ON app_config 
        FOR ALL USING (auth.uid() = user_id);
    END IF;

    -- Backups
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own backups') THEN
        CREATE POLICY "Users can manage their own backups" ON backups 
        FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
    
    -- Categories
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own categories') THEN
        CREATE POLICY "Users can manage their own categories" ON categories 
        FOR ALL USING (auth.uid() = user_id);
    END IF;
    
    -- Products
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own products') THEN
        CREATE POLICY "Users can manage their own products" ON products 
        FOR ALL USING (auth.uid() = user_id);
    END IF;
    
    -- Clients
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own clients') THEN
        CREATE POLICY "Users can manage their own clients" ON clients 
        FOR ALL USING (auth.uid() = user_id);
    END IF;
    
    -- Orders
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own orders') THEN
        CREATE POLICY "Users can manage their own orders" ON orders 
        FOR ALL USING (auth.uid() = user_id);
    END IF;
    
    -- Order Items (Isolamento via orders)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own order items') THEN
        CREATE POLICY "Users can manage their own order items" ON order_items 
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM orders 
                WHERE orders.id = order_items.order_id 
                AND orders.user_id = auth.uid()
            )
        );
    END IF;
    
    -- Product Variations (Isolamento via products)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own product variations') THEN
        CREATE POLICY "Users can manage their own product variations" ON product_variations 
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM products 
                WHERE products.id = product_variations.product_id 
                AND products.user_id = auth.uid()
            )
        );
    END IF;

    -- Settings
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own settings') THEN
        CREATE POLICY "Users can manage their own settings" ON settings 
        FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_public_catalog_info(catalog_slug text)
RETURNS TABLE(store_name text, store_logo text, theme_color text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(s.store_name, 'Catálogo') AS store_name,
    s.store_logo,
    COALESCE(ac.theme_color, '#3b82f6') AS theme_color
  FROM public_catalogs pc
  LEFT JOIN settings s ON s.user_id = pc.user_id
  LEFT JOIN app_config ac ON ac.user_id = pc.user_id
  WHERE pc.catalog_slug = get_public_catalog_info.catalog_slug
    AND pc.is_active = true
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_public_catalog_products(catalog_slug text)
RETURNS TABLE(
  id uuid,
  name text,
  category text,
  sale_price numeric,
  image text,
  description text,
  available boolean,
  stock integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.name,
    p.category,
    p.sale_price,
    p.image,
    p.description,
    p.available,
    p.stock
  FROM public_catalogs pc
  JOIN products p ON p.user_id = pc.user_id
  WHERE pc.catalog_slug = get_public_catalog_products.catalog_slug
    AND pc.is_active = true
    AND p.available = true
  ORDER BY p.name
$$;

GRANT EXECUTE ON FUNCTION public.get_public_catalog_info(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_catalog_products(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_public_order(
  catalog_slug text,
  customer_name text,
  customer_phone text,
  customer_whatsapp text,
  payment_method text,
  notes text,
  items jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_order_id uuid;
  v_total numeric := 0;
  v_item jsonb;
  v_product_id uuid;
  v_qty integer;
  v_price numeric;
BEGIN
  SELECT pc.user_id INTO v_user_id
  FROM public_catalogs pc
  WHERE pc.catalog_slug = create_public_order.catalog_slug
    AND pc.is_active = true
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Catálogo inválido ou inativo';
  END IF;

  IF items IS NULL OR jsonb_typeof(items) <> 'array' OR jsonb_array_length(items) = 0 THEN
    RAISE EXCEPTION 'Itens inválidos';
  END IF;

  FOREACH v_item IN ARRAY (SELECT jsonb_array_elements(items))
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty := GREATEST(1, (v_item->>'quantity')::int);

    SELECT p.sale_price INTO v_price
    FROM products p
    WHERE p.id = v_product_id
      AND p.user_id = v_user_id
      AND p.available = true
    LIMIT 1;

    IF v_price IS NULL THEN
      RAISE EXCEPTION 'Produto inválido no catálogo';
    END IF;

    v_total := v_total + (v_price * v_qty);
  END LOOP;

  INSERT INTO orders (
    user_id,
    client_id,
    total,
    status,
    payment_method,
    notes,
    public_customer_name,
    public_customer_phone,
    public_customer_whatsapp,
    source
  ) VALUES (
    v_user_id,
    NULL,
    v_total,
    'pending',
    payment_method,
    notes,
    customer_name,
    customer_phone,
    customer_whatsapp,
    'public_catalog'
  ) RETURNING id INTO v_order_id;

  FOREACH v_item IN ARRAY (SELECT jsonb_array_elements(items))
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty := GREATEST(1, (v_item->>'quantity')::int);

    SELECT p.sale_price INTO v_price
    FROM products p
    WHERE p.id = v_product_id
      AND p.user_id = v_user_id
      AND p.available = true
    LIMIT 1;

    INSERT INTO order_items (
      order_id,
      product_id,
      variation_id,
      variation_name,
      quantity,
      price_at_time
    ) VALUES (
      v_order_id,
      v_product_id,
      NULL,
      NULL,
      v_qty,
      v_price
    );
  END LOOP;

  RETURN v_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_public_order(text, text, text, text, text, text, jsonb) TO anon, authenticated;

-- Storage: Bucket e políticas de backups (evita erro "new row violates row-level security policy" no upload)
INSERT INTO storage.buckets (id, name, public)
VALUES ('backups', 'backups', false)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can upload their backups'
  ) THEN
    CREATE POLICY "Users can upload their backups"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'backups'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can read their backups'
  ) THEN
    CREATE POLICY "Users can read their backups"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'backups'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can delete their backups'
  ) THEN
    CREATE POLICY "Users can delete their backups"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'backups'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

-- 9. Inserir alguns dados de exemplo (Opcional - remova se não desejar)
-- INSERT INTO categories (name) VALUES ('Bebidas'), ('Alimentos'), ('Eletrônicos') ON CONFLICT (name) DO NOTHING;
