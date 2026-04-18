import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!(supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder-url'));
}

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!isSupabaseConfigured()) {
      console.error('Supabase configuration is missing or using placeholders:', { 
        url: supabaseUrl ? 'Set' : 'Missing', 
        key: supabaseAnonKey ? 'Set' : 'Missing' 
      });
      // Em vez de lançar um erro fatal, retornamos o cliente (que falhará nas chamadas, mas não no render)
      // Ou melhor, lançamos apenas se realmente tentarem usar sem configurar
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Configuração do Supabase ausente ou inválida. Verifique as variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no Vercel.');
      }
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
