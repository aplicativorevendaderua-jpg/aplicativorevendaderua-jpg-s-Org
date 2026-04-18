-- Script de correção para registro de clientes via catálogo público

-- 1. Garantir colunas na tabela clients
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='source') THEN
        ALTER TABLE clients ADD COLUMN source TEXT DEFAULT 'internal';
    END IF;
END $$;

-- 2. Garantir colunas na tabela orders
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='public_customer_name') THEN
        ALTER TABLE orders ADD COLUMN public_customer_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='public_customer_phone') THEN
        ALTER TABLE orders ADD COLUMN public_customer_phone TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='public_customer_whatsapp') THEN
        ALTER TABLE orders ADD COLUMN public_customer_whatsapp TEXT;
    END IF;
END $$;

-- 3. Atualizar a função create_public_order para ser mais robusta e suportar variações
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
  v_price DECIMAL;
  v_variation_name TEXT;
BEGIN
  -- 1. Encontrar o dono do catálogo
  SELECT user_id INTO v_user_id FROM public_catalogs WHERE public_catalogs.catalog_slug = create_public_order.catalog_slug AND is_active = true;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Catálogo não encontrado ou inativo';
  END IF;

  -- 2. Gerenciar Registro/Reconhecimento de Cliente
  -- Tentar encontrar por telefone
  IF customer_phone IS NOT NULL AND customer_phone <> '' THEN
    SELECT id INTO v_client_id 
    FROM clients 
    WHERE user_id = v_user_id 
      AND (phone = customer_phone OR whatsapp = customer_phone)
    LIMIT 1;
  END IF;

  -- Se não encontrar por telefone, tentar por whatsapp
  IF v_client_id IS NULL AND customer_whatsapp IS NOT NULL AND customer_whatsapp <> '' THEN
    SELECT id INTO v_client_id 
    FROM clients 
    WHERE user_id = v_user_id 
      AND (phone = customer_whatsapp OR whatsapp = customer_whatsapp)
    LIMIT 1;
  END IF;

  -- Se ainda não encontrar, tentar por nome (case insensitive)
  IF v_client_id IS NULL THEN
    SELECT id INTO v_client_id 
    FROM clients 
    WHERE user_id = v_user_id 
      AND (LOWER(name) = LOWER(customer_name) OR LOWER(establishment) = LOWER(customer_name))
    LIMIT 1;
  END IF;

  -- Se ainda não encontrar, criar um novo cliente se should_register_client for TRUE
  IF v_client_id IS NULL AND should_register_client = TRUE THEN
    INSERT INTO clients (user_id, name, establishment, phone, whatsapp, active, source)
    VALUES (v_user_id, customer_name, customer_name, customer_phone, customer_whatsapp, true, 'online')
    RETURNING id INTO v_client_id;
  END IF;

  -- 3. Criar o pedido vinculado ao cliente (v_client_id pode ser NULL)
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

  -- 4. Criar itens e calcular total
  FOR v_item IN SELECT * FROM jsonb_to_recordset(items) AS x(product_id UUID, quantity INTEGER, variation_id UUID)
  LOOP
    v_price := 0;
    v_variation_name := NULL;

    -- Obter preço base do produto
    SELECT sale_price INTO v_price FROM products WHERE id = v_item.product_id AND user_id = v_user_id;

    -- Se houver variação, ajustar preço e obter nome
    IF v_item.variation_id IS NOT NULL THEN
      SELECT (v_price + additional_price), (name || ': ' || value) 
      INTO v_price, v_variation_name 
      FROM product_variations 
      WHERE id = v_item.variation_id AND product_id = v_item.product_id;
    END IF;

    INSERT INTO order_items (order_id, product_id, variation_id, variation_name, quantity, price_at_time)
    VALUES (v_order_id, v_item.product_id, v_item.variation_id, v_variation_name, v_item.quantity, v_price);
  END LOOP;

  -- 5. Atualizar total do pedido
  UPDATE orders SET total = COALESCE((SELECT SUM(quantity * price_at_time) FROM order_items WHERE order_id = v_order_id), 0)
  WHERE id = v_order_id;

  RETURN v_order_id;
END;
$$;
