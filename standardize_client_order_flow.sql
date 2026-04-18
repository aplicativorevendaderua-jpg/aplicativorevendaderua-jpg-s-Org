-- Script de correção definitiva para duplicidade de clientes

-- 1. Garantir que a restrição de unicidade esteja correta
-- Primeiro removemos índices conflitantes que possam ter sido criados
DROP INDEX IF EXISTS idx_clients_user_id_phone;
DROP INDEX IF EXISTS idx_clients_user_id_phone_clean;

-- Garantimos que a restrição UNIQUE (user_id, phone) existe
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clients_user_id_phone_key') THEN
        ALTER TABLE clients ADD CONSTRAINT clients_user_id_phone_key UNIQUE (user_id, phone);
    END IF;
END $$;

-- 2. Atualizar a função principal com lógica ATÔMICA (ON CONFLICT)
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
  p_should_register_client BOOLEAN DEFAULT TRUE
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

  -- Normalizar inputs (vazio vira NULL para não violar unicidade de strings vazias)
  v_customer_phone := NULLIF(TRIM(p_customer_phone), '');
  v_customer_whatsapp := NULLIF(TRIM(p_customer_whatsapp), '');

  -- 2. Gerenciar Cliente de forma atômica
  IF p_should_register_client = TRUE THEN
    -- Se tiver telefone, usamos ON CONFLICT no telefone
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
      -- Se não tiver telefone, tentamos buscar pelo nome antes de inserir
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
    -- Se não for para registrar, apenas tenta encontrar um ID existente para vincular o pedido
    IF v_customer_phone IS NOT NULL THEN
      SELECT id INTO v_client_id FROM clients WHERE user_id = v_user_id AND phone = v_customer_phone LIMIT 1;
    END IF;
    
    IF v_client_id IS NULL THEN
      SELECT id INTO v_client_id FROM clients WHERE user_id = v_user_id AND LOWER(name) = LOWER(p_customer_name) LIMIT 1;
    END IF;
  END IF;

  -- 3. Criar o pedido (v_client_id pode ser NULL se p_should_register_client for false e não for encontrado)
  INSERT INTO orders (
    user_id, client_id, total, status, payment_method, notes,
    public_customer_name, public_customer_phone, public_customer_whatsapp, source
  )
  VALUES (
    v_user_id, v_client_id, 0, 'pending', p_payment_method, p_notes,
    p_customer_name, v_customer_phone, v_customer_whatsapp, 'online'
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

  -- 5. Atualizar total
  UPDATE orders SET total = COALESCE((SELECT SUM(quantity * price_at_time) FROM order_items WHERE order_id = v_order_id), 0)
  WHERE id = v_order_id;

  RETURN v_order_id;
END;
$$;
