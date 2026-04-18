-- COMPREHENSIVE SUPABASE SCHEMA UPDATE (v2.1)
-- This script ensures all tables, columns, and RLS policies match the current frontend implementation.
-- SAFE TO RUN MULTIPLE TIMES (Idempotent)

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLES

-- Profiles (User specific information)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  work_days TEXT[] DEFAULT '{}',
  work_start_time TEXT DEFAULT '08:00',
  work_end_time TEXT DEFAULT '18:00',
  service_hours TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- App Config (Theme, notifications, etc.)
CREATE TABLE IF NOT EXISTS app_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  notifications_enabled BOOLEAN DEFAULT true,
  dark_mode BOOLEAN DEFAULT false,
  theme_color TEXT DEFAULT '#3b82f6',
  backup_frequency TEXT DEFAULT 'manual',
  backup_format TEXT DEFAULT 'json',
  backup_email_enabled BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Settings (Store specific information)
CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  store_name TEXT DEFAULT 'Minha Loja B2B',
  store_phone TEXT,
  store_email TEXT,
  store_address TEXT,
  store_logo TEXT,
  currency TEXT DEFAULT 'R$',
  tax_id TEXT,
  whatsapp_message_template TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Public Catalogs (Slug-based access)
CREATE TABLE IF NOT EXISTS public_catalogs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  catalog_slug TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  purchase_price DECIMAL(10, 2) DEFAULT 0,
  sale_price DECIMAL(10, 2) DEFAULT 0,
  price DECIMAL(10, 2) DEFAULT 0, -- For compatibility
  stock INTEGER DEFAULT 0,
  description TEXT,
  image TEXT,
  available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Product Variations
CREATE TABLE IF NOT EXISTS product_variations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value TEXT NOT NULL,
  additional_price DECIMAL(10, 2) DEFAULT 0,
  stock INTEGER DEFAULT 0
);

-- Clients
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  establishment TEXT NOT NULL,
  phone TEXT,
  whatsapp TEXT,
  address TEXT,
  city TEXT,
  observations TEXT,
  active BOOLEAN DEFAULT true,
  source TEXT DEFAULT 'internal',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  total DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending' | 'confirmed' | 'delivered' | 'cancelled'
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL,
  price_at_time DECIMAL(10, 2) NOT NULL,
  variation_name TEXT
);

-- Backups
CREATE TABLE IF NOT EXISTS backups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  format TEXT DEFAULT 'json',
  size_bytes BIGINT,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. ROW LEVEL SECURITY (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_catalogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE backups ENABLE ROW LEVEL SECURITY;

-- 4. POLICIES (Using DROP IF EXISTS to avoid errors)

-- Profiles
DROP POLICY IF EXISTS "Users can manage their own profile" ON profiles;
CREATE POLICY "Users can manage their own profile" ON profiles FOR ALL USING (auth.uid() = id);

-- App Config
DROP POLICY IF EXISTS "Users can manage their own app_config" ON app_config;
CREATE POLICY "Users can manage their own app_config" ON app_config FOR ALL USING (auth.uid() = user_id);

-- Settings
DROP POLICY IF EXISTS "Users can manage their own settings" ON settings;
CREATE POLICY "Users can manage their own settings" ON settings FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public can view settings of active catalogs" ON settings;
CREATE POLICY "Public can view settings of active catalogs" ON settings FOR SELECT USING (
  EXISTS (SELECT 1 FROM public_catalogs WHERE public_catalogs.user_id = settings.user_id AND public_catalogs.is_active = true)
);

-- Public Catalogs
DROP POLICY IF EXISTS "Users can manage their own public_catalog" ON public_catalogs;
CREATE POLICY "Users can manage their own public_catalog" ON public_catalogs FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view active public catalogs" ON public_catalogs;
CREATE POLICY "Anyone can view active public catalogs" ON public_catalogs FOR SELECT USING (is_active = true);

-- Categories
DROP POLICY IF EXISTS "Users can manage their own categories" ON categories;
CREATE POLICY "Users can manage their own categories" ON categories FOR ALL USING (auth.uid() = user_id);

-- Products
DROP POLICY IF EXISTS "Users can manage their own products" ON products;
CREATE POLICY "Users can manage their own products" ON products FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public can view products of active catalogs" ON products;
CREATE POLICY "Public can view products of active catalogs" ON products FOR SELECT USING (
  EXISTS (SELECT 1 FROM public_catalogs WHERE public_catalogs.user_id = products.user_id AND public_catalogs.is_active = true)
);

-- Product Variations
DROP POLICY IF EXISTS "Users can manage their own variations" ON product_variations;
CREATE POLICY "Users can manage their own variations" ON product_variations FOR ALL USING (
  EXISTS (SELECT 1 FROM products WHERE products.id = product_variations.product_id AND products.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Public can view variations of active catalogs" ON product_variations;
CREATE POLICY "Public can view variations of active catalogs" ON product_variations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM products 
    JOIN public_catalogs ON public_catalogs.user_id = products.user_id
    WHERE products.id = product_variations.product_id AND public_catalogs.is_active = true
  )
);

-- Clients
DROP POLICY IF EXISTS "Users can manage their own clients" ON clients;
CREATE POLICY "Users can manage their own clients" ON clients FOR ALL USING (auth.uid() = user_id);

-- Orders
DROP POLICY IF EXISTS "Users can manage their own orders" ON orders;
CREATE POLICY "Users can manage their own orders" ON orders FOR ALL USING (auth.uid() = user_id);

-- Order Items
DROP POLICY IF EXISTS "Users can manage their own order_items" ON order_items;
CREATE POLICY "Users can manage their own order_items" ON order_items FOR ALL USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
);

-- Backups
DROP POLICY IF EXISTS "Users can manage their own backups" ON backups;
CREATE POLICY "Users can manage their own backups" ON backups FOR ALL USING (auth.uid() = user_id);

-- 5. FUNCTIONS & RPCs (CREATE OR REPLACE is safe)

-- RPC for public catalog info
CREATE OR REPLACE FUNCTION get_public_catalog_info(catalog_slug TEXT)
RETURNS TABLE (
  store_name TEXT,
  store_logo TEXT,
  theme_color TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT s.store_name, s.store_logo, ac.theme_color
  FROM public_catalogs pc
  JOIN settings s ON pc.user_id = s.user_id
  JOIN app_config ac ON pc.user_id = ac.user_id
  WHERE pc.catalog_slug = get_public_catalog_info.catalog_slug AND pc.is_active = true;
END;
$$;

-- RPC for public catalog products
CREATE OR REPLACE FUNCTION get_public_catalog_products(catalog_slug TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  category TEXT,
  sale_price DECIMAL,
  image TEXT,
  description TEXT,
  available BOOLEAN,
  stock INTEGER
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.category, p.sale_price, p.image, p.description, p.available, p.stock
  FROM public_catalogs pc
  JOIN products p ON pc.user_id = p.user_id
  WHERE pc.catalog_slug = get_public_catalog_products.catalog_slug AND pc.is_active = true AND p.available = true;
END;
$$;

-- RPC to create a public order with auto-client registration
CREATE OR REPLACE FUNCTION create_public_order(
  catalog_slug TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  customer_whatsapp TEXT,
  payment_method TEXT,
  notes TEXT,
  items JSONB,
  should_register_client BOOLEAN DEFAULT TRUE
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID;
  v_order_id UUID;
  v_client_id UUID;
  v_item RECORD;
BEGIN
  -- 1. Find the owner of the catalog
  SELECT user_id INTO v_user_id FROM public_catalogs WHERE public_catalogs.catalog_slug = create_public_order.catalog_slug AND is_active = true;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Catalog not found or inactive';
  END IF;

  -- 2. Handle Client Registration/Recognition
  -- Try to find by both phone AND name to prevent duplicates
  SELECT id INTO v_client_id 
  FROM clients 
  WHERE user_id = v_user_id 
    AND (
      (phone = customer_phone AND (name = customer_name OR establishment = customer_name))
      OR phone = customer_phone
    )
  LIMIT 1;

  -- If not found by phone, try finding by name only (case insensitive)
  IF v_client_id IS NULL THEN
    SELECT id INTO v_client_id 
    FROM clients 
    WHERE user_id = v_user_id 
      AND (LOWER(name) = LOWER(customer_name) OR LOWER(establishment) = LOWER(customer_name))
    LIMIT 1;
  END IF;

  -- If still not found, create a new client ONLY IF should_register_client is TRUE
  IF v_client_id IS NULL AND should_register_client = TRUE THEN
    INSERT INTO clients (user_id, name, establishment, phone, whatsapp, active, source)
    VALUES (v_user_id, customer_name, customer_name, customer_phone, customer_whatsapp, true, 'online')
    RETURNING id INTO v_client_id;
  END IF;

  -- 3. Create the order linked to the client (v_client_id can be NULL now)
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
  )
  VALUES (
    v_user_id, 
    v_client_id, 
    0, 
    'pending', 
    payment_method, 
    notes,
    customer_name,
    customer_phone,
    customer_whatsapp,
    'online'
  )
  RETURNING id INTO v_order_id;

  -- 4. Create items and calculate total
  FOR v_item IN SELECT * FROM jsonb_to_recordset(items) AS x(product_id UUID, quantity INTEGER)
  LOOP
    INSERT INTO order_items (order_id, product_id, quantity, price_at_time)
    SELECT v_order_id, p.id, v_item.quantity, p.sale_price
    FROM products p WHERE p.id = v_item.product_id AND p.user_id = v_user_id;
  END LOOP;

  -- 5. Update order total
  UPDATE orders SET total = COALESCE((SELECT SUM(quantity * price_at_time) FROM order_items WHERE order_id = v_order_id), 0)
  WHERE id = v_order_id;

  RETURN v_order_id;
END;
$$;
