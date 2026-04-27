-- 1. Adiciona a coluna pix_key na tabela settings caso não exista
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='settings' AND column_name='pix_key') THEN
        ALTER TABLE settings ADD COLUMN pix_key TEXT;
    END IF;
END $$;

-- 2. Atualiza a função do catálogo público para retornar a chave pix
DROP FUNCTION IF EXISTS public.get_public_catalog_info(text);

CREATE OR REPLACE FUNCTION public.get_public_catalog_info(catalog_slug text)
RETURNS TABLE(store_name text, store_logo text, theme_color text, store_phone text, pix_key text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(s.store_name, 'Catálogo') AS store_name,
    s.store_logo,
    COALESCE(ac.theme_color, '#3b82f6') AS theme_color,
    s.store_phone,
    s.pix_key
  FROM public_catalogs pc
  LEFT JOIN settings s ON s.user_id = pc.user_id
  LEFT JOIN app_config ac ON ac.user_id = pc.user_id
  WHERE pc.catalog_slug = get_public_catalog_info.catalog_slug
    AND pc.is_active = true
  LIMIT 1
$$;

-- 3. Garante acesso
GRANT EXECUTE ON FUNCTION public.get_public_catalog_info(text) TO anon, authenticated;
