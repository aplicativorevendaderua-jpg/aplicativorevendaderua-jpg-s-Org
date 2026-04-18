import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const isPlaceholder = !supabaseUrl || supabaseUrl.includes('placeholder-url') || !supabaseAnonKey || supabaseAnonKey.includes('your-');
  
  try {
    if (supabaseUrl) new URL(supabaseUrl);
  } catch (e) {
    return false;
  }
  
  return !!(supabaseUrl && supabaseAnonKey && !isPlaceholder);
}

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!isSupabaseConfigured()) {
      console.error('Supabase configuration is missing or invalid:', {
        url: supabaseUrl,
        key: supabaseAnonKey ? 'Set (hidden)' : 'Missing'
      });
      // Em vez de lançar um erro fatal, lançamos apenas se as variáveis estiverem realmente vazias
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Configuração do Supabase ausente. Adicione VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
      }
    }

    try {
      supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
    } catch (e: any) {
      console.error('Falha ao criar cliente Supabase:', e);
      throw new Error('Erro ao inicializar Supabase: ' + e.message);
    }
  }
  return supabaseInstance;
}

// For backward compatibility or simpler usage where we know it's initialized
export const supabase = (function() {
  try {
    return getSupabase();
  } catch (e) {
    console.warn('Supabase not initialized yet:', e);
    return null as unknown as SupabaseClient;
  }
})();
