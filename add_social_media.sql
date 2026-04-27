-- Add social media fields to settings table
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS instagram text,
ADD COLUMN IF NOT EXISTS facebook text,
ADD COLUMN IF NOT EXISTS tiktok text;

-- Atualiza a função do RPC que busca o catalogo, caso a aplicação ainda dependa disso de alguma forma
DROP FUNCTION IF EXISTS get_public_catalog_info(text);

CREATE OR REPLACE FUNCTION get_public_catalog_info(catalog_slug TEXT)
RETURNS TABLE (
  store_name TEXT,
  store_logo TEXT,
  theme_color TEXT,
  store_phone TEXT,
  pix_key TEXT,
  store_address TEXT,
  tax_id TEXT,
  instagram TEXT,
  facebook TEXT,
  tiktok TEXT
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Obtem o user_id do catalogo ativo
  SELECT user_id INTO v_user_id
  FROM public_catalogs
  WHERE public_catalogs.catalog_slug = get_public_catalog_info.catalog_slug
    AND is_active = true
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    COALESCE(s.store_name, 'Catálogo') as store_name,
    s.store_logo,
    c.theme_color,
    s.store_phone,
    s.pix_key,
    s.store_address,
    s.tax_id,
    s.instagram,
    s.facebook,
    s.tiktok
  FROM settings s
  LEFT JOIN app_config c ON c.user_id = s.user_id
  WHERE s.user_id = v_user_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
