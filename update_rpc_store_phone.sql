-- Atualiza a função que o catálogo público chama para buscar os dados da loja
-- Essa atualização adiciona o número de telefone da loja (store_phone) para o redirecionamento do WhatsApp

-- 1. Primeiro apagamos a função antiga, pois estamos alterando as colunas de retorno (RETURNS TABLE)
DROP FUNCTION IF EXISTS public.get_public_catalog_info(text);

-- 2. Criamos a função nova com a coluna store_phone
CREATE OR REPLACE FUNCTION public.get_public_catalog_info(catalog_slug text)
RETURNS TABLE(store_name text, store_logo text, theme_color text, store_phone text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(s.store_name, 'Catálogo') AS store_name,
    s.store_logo,
    COALESCE(ac.theme_color, '#3b82f6') AS theme_color,
    s.store_phone
  FROM public_catalogs pc
  LEFT JOIN settings s ON s.user_id = pc.user_id
  LEFT JOIN app_config ac ON ac.user_id = pc.user_id
  WHERE pc.catalog_slug = get_public_catalog_info.catalog_slug
    AND pc.is_active = true
  LIMIT 1
$$;

-- 3. Garante que todos possam executar a função
GRANT EXECUTE ON FUNCTION public.get_public_catalog_info(text) TO anon, authenticated;
