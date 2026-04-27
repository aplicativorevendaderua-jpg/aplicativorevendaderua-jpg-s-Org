-- 1. Adicionar coluna delivery_date se não existir
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='delivery_date') THEN
        ALTER TABLE orders ADD COLUMN delivery_date TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 2. Atualizar a função create_public_order_v2 para aceitar automaticamente e definir data de entrega
CREATE OR REPLACE FUNCTION create_public_order_v2(
  p_catalog_slug TEXT,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_customer_whatsapp TEXT,
  p_customer_rua TEXT,
  p_customer_numero TEXT,
  p_customer_bairro TEXT,
  p_customer_city TEXT DEFAULT NULL,
  p_payment_method TEXT DEFAULT 'Pix',
  p_notes TEXT DEFAULT NULL,
  p_items JSONB DEFAULT '[]'::JSONB,
  p_should_register_client BOOLEAN DEFAULT TRUE,
  p_total DECIMAL DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID;
  v_order_id UUID;
  v_client_id UUID;
  v_item RECORD;
  v_price DECIMAL;
  v_variation_name TEXT;
  v_customer_phone TEXT;
  v_customer_whatsapp TEXT;
BEGIN
  -- 1. Encontrar o dono do catálogo
  SELECT user_id INTO v_user_id FROM public_catalogs WHERE catalog_slug = p_catalog_slug AND is_active = true;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Catálogo não encontrado ou inativo';
  END IF;

  -- Normalizar inputs
  v_customer_phone := NULLIF(TRIM(p_customer_phone), '');
  v_customer_whatsapp := NULLIF(TRIM(p_customer_whatsapp), '');

  -- 2. Gerenciar Cliente
  IF p_should_register_client = TRUE THEN
    IF v_customer_phone IS NOT NULL THEN
      INSERT INTO clients (
        user_id, name, establishment, phone, whatsapp, rua, numero, bairro, city, active, source
      )
      VALUES (
        v_user_id, p_customer_name, p_customer_name, v_customer_phone, v_customer_whatsapp, 
        p_customer_rua, p_customer_numero, p_customer_bairro, p_customer_city, true, 'online'
      )
      ON CONFLICT (user_id, phone) 
      DO UPDATE SET 
        name = EXCLUDED.name,
        establishment = EXCLUDED.establishment,
        whatsapp = COALESCE(EXCLUDED.whatsapp, clients.whatsapp),
        rua = EXCLUDED.rua,
        numero = EXCLUDED.numero,
        bairro = EXCLUDED.bairro,
        city = COALESCE(EXCLUDED.city, clients.city),
        updated_at = NOW()
      RETURNING id INTO v_client_id;
    ELSE
      SELECT id INTO v_client_id FROM clients 
      WHERE user_id = v_user_id AND LOWER(name) = LOWER(p_customer_name) LIMIT 1;

      IF v_client_id IS NULL THEN
        INSERT INTO clients (
          user_id, name, establishment, phone, whatsapp, rua, numero, bairro, city, active, source
        )
        VALUES (
          v_user_id, p_customer_name, p_customer_name, v_customer_phone, v_customer_whatsapp, 
          p_customer_rua, p_customer_numero, p_customer_bairro, p_customer_city, true, 'online'
        )
        RETURNING id INTO v_client_id;
      ELSE
        UPDATE clients SET 
          rua = p_customer_rua,
          numero = p_customer_numero,
          bairro = p_customer_bairro,
          city = COALESCE(p_customer_city, city)
        WHERE id = v_client_id;
      END IF;
    END IF;
  ELSE
    IF v_customer_phone IS NOT NULL THEN
      SELECT id INTO v_client_id FROM clients WHERE user_id = v_user_id AND phone = v_customer_phone LIMIT 1;
    END IF;
    IF v_client_id IS NULL THEN
      SELECT id INTO v_client_id FROM clients WHERE user_id = v_user_id AND LOWER(name) = LOWER(p_customer_name) LIMIT 1;
    END IF;
  END IF;

  -- 3. Criar o pedido (Status 'confirmed' e entrega amanhã)
  INSERT INTO orders (
    user_id, client_id, total, status, payment_method, notes,
    public_customer_name, public_customer_phone, public_customer_whatsapp, source,
    delivery_date
  )
  VALUES (
    v_user_id, v_client_id, COALESCE(p_total, 0), 'confirmed', p_payment_method, p_notes,
    p_customer_name, v_customer_phone, v_customer_whatsapp, 'online',
    (NOW() + INTERVAL '1 day')::DATE
  )
  RETURNING id INTO v_order_id;

  -- 4. Inserir itens
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INTEGER, variation_id UUID)
  LOOP
    v_price := 0;
    v_variation_name := NULL;

    SELECT sale_price INTO v_price FROM products WHERE id = v_item.product_id AND user_id = v_user_id;

    IF v_item.variation_id IS NOT NULL THEN
      SELECT (v_price + additional_price), (name || ': ' || value) 
      INTO v_price, v_variation_name 
      FROM product_variations 
      WHERE id = v_item.variation_id AND product_id = v_item.product_id;
    END IF;

    INSERT INTO order_items (order_id, product_id, variation_id, variation_name, quantity, price_at_time)
    VALUES (v_order_id, v_item.product_id, v_item.variation_id, v_variation_name, v_item.quantity, v_price);
  END LOOP;

  -- 5. Atualizar total apenas se p_total não foi fornecido
  IF p_total IS NULL THEN
    UPDATE orders SET total = COALESCE((SELECT SUM(quantity * price_at_time) FROM order_items WHERE order_id = v_order_id), 0)
    WHERE id = v_order_id;
  END IF;

  RETURN v_order_id;
END;
$$;