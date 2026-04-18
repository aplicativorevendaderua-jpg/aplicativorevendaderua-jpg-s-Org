import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder-url')) {
      console.error('Supabase configuration is missing or using placeholders:', { 
        url: supabaseUrl ? 'Set' : 'Missing', 
        key: supabaseAnonKey ? 'Set' : 'Missing' 
      });
      throw new Error('Configuração do Supabase ausente ou inválida. Verifique seu arquivo .env');
    }
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
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
