import { getSupabase } from '../lib/supabase';
import { Product, Client, Order, Category, ProductVariation, AppSettings, UserAppConfig, BackupEntry, UserProfile, PublicCatalog, StockHistory, Transaction, FinanceSummary, Promotion, PaymentAdjustment, WhatsAppConfig, WhatsAppMessageLog } from '../types';

export const supabaseService = {
  // --- PROMOTIONS ---
  async getPromotions(): Promise<Promotion[]> {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Promotion[];
  },

  async upsertPromotion(promotion: Partial<Promotion>): Promise<Promotion> {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autenticado');

    const { data, error } = await supabase
      .from('promotions')
      .upsert({ ...promotion, user_id: user.id, updated_at: new Date().toISOString() })
      .select()
      .single();
    
    if (error) throw error;
    return data as Promotion;
  },

  async deletePromotion(id: string): Promise<void> {
    const { error } = await getSupabase()
      .from('promotions')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // --- PAYMENT ADJUSTMENTS ---
  async getPaymentAdjustments(): Promise<PaymentAdjustment[]> {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('payment_adjustments')
      .select('*')
      .eq('user_id', user.id);
    
    if (error) throw error;
    return data as PaymentAdjustment[];
  },

  async upsertPaymentAdjustment(adjustment: Partial<PaymentAdjustment>): Promise<PaymentAdjustment> {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autenticado');

    const { data, error } = await supabase
      .from('payment_adjustments')
      .upsert({ ...adjustment, user_id: user.id, updated_at: new Date().toISOString() })
      .select()
      .single();
    
    if (error) throw error;
    return data as PaymentAdjustment;
  },

  async deletePaymentAdjustment(id: string): Promise<void> {
    const { error } = await getSupabase()
      .from('payment_adjustments')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // --- FINANCE ---
  async getFinanceSummary(startDate: string, endDate: string): Promise<FinanceSummary> {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        total_income: 0, total_expense: 0, net_profit: 0, pending_payments: 0,
        by_category: [], last_transactions: [], top_products: [],
        projections: { expected_revenue: 0, expected_profit: 0, growth_rate: 0 },
        revenue_by_source: { manual: { revenue: 0, count: 0 }, online: { revenue: 0, count: 0 } }
      };
    }

    // 1. Buscar Entradas (Pedidos)
    const { data: incomes, error: incomesError } = await supabase
      .from('orders')
      .select('id, total, paid_amount, status, paymentStatus, source, created_at, order_items(product_id, quantity, price_at_time, products(name, purchase_price))')
      .eq('user_id', user.id)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (incomesError) throw incomesError;

    // 2. Buscar Saídas (Reposições de Estoque)
    const { data: expenses, error: expensesError } = await supabase
      .from('stock_history')
      .select('quantity, cost_at_time, created_at')
      .eq('user_id', user.id)
      .eq('change_type', 'purchase')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (expensesError) throw expensesError;

    // 3. Buscar Transações Manuais
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (transactionsError) throw transactionsError;

    const safeNum = (val: any) => isNaN(Number(val)) ? 0 : Number(val);

    const totalIncome = (incomes || [])
      .reduce((acc, o) => {
        if (o.status === 'cancelled') return acc;
        if (o.paymentStatus === 'paid') return acc + safeNum(o.total);
        return acc + safeNum(o.paid_amount);
      }, 0) +
      (transactions || [])
      .filter(t => t.type === 'income')
      .reduce((acc, t) => acc + safeNum(t.amount), 0);

    const totalExpense = (expenses || [])
      .reduce((acc, e) => acc + (safeNum(e.quantity) * safeNum(e.cost_at_time)), 0) +
      (transactions || [])
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => acc + safeNum(t.amount), 0);

    const pendingPayments = (incomes || [])
      .filter(o => o.status !== 'cancelled')
      .reduce((acc, o) => {
        const total = safeNum(o.total);
        const paid = o.paymentStatus === 'paid' ? total : safeNum(o.paid_amount);
        return acc + Math.max(0, total - paid);
      }, 0);

    // 4. Calcular Produtos mais vendidos e Lucratividade
    const productStats: Record<string, { name: string; quantity: number; revenue: number; cost: number }> = {};
    
    (incomes || []).forEach(order => {
      if (order.status === 'cancelled') return;
      
      (order.order_items || []).forEach((item: any) => {
        const pid = item.product_id;
        const qty = Number(item.quantity);
        const price = Number(item.price_at_time);
        const purchasePrice = Number(item.products?.purchase_price || 0);
        
        if (!productStats[pid]) {
          productStats[pid] = { name: item.products?.name || 'Produto', quantity: 0, revenue: 0, cost: 0 };
        }
        
        productStats[pid].quantity += qty;
        productStats[pid].revenue += (qty * price);
        productStats[pid].cost += (qty * purchasePrice);
      });
    });

    const topProducts = Object.entries(productStats)
      .map(([id, stats]) => {
        const profit = stats.revenue - stats.cost;
        return {
          id,
          name: stats.name,
          quantity: stats.quantity,
          revenue: stats.revenue,
          profit: profit,
          margin: stats.revenue > 0 ? (profit / stats.revenue) * 100 : 0
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10); // Aumentado para 10 para relatórios mais completos

    // 5. Projeções (Simplificadas baseadas no período selecionado)
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    
    const dailyAvg = totalIncome / diffDays;
    
    // Projeção para o resto do mês atual se o filtro incluir hoje
    const today = new Date();
    const isCurrentMonth = start.getMonth() === today.getMonth() && start.getFullYear() === today.getFullYear();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    
    const expectedRevenue = isCurrentMonth ? dailyAvg * daysInMonth : totalIncome;
    const expectedProfit = isCurrentMonth ? (totalIncome - totalExpense) / (today.getDate() || 1) * daysInMonth : (totalIncome - totalExpense);

    // 6. Faturamento por Origem
    const revenueBySource = {
      manual: { revenue: 0, count: 0 },
      online: { revenue: 0, count: 0 }
    };

    (incomes || []).forEach(o => {
      if (o.status === 'cancelled') return;
      const amount = Number(o.total);
      if (o.source === 'public_catalog') {
        revenueBySource.online.revenue += amount;
        revenueBySource.online.count += 1;
      } else {
        revenueBySource.manual.revenue += amount;
        revenueBySource.manual.count += 1;
      }
    });

    return {
      total_income: totalIncome,
      total_expense: totalExpense,
      net_profit: totalIncome - totalExpense,
      pending_payments: pendingPayments,
      by_category: [],
      last_transactions: (transactions || []).slice(0, 10) as Transaction[],
      top_products: topProducts,
      projections: {
        expected_revenue: expectedRevenue,
        expected_profit: expectedProfit,
        growth_rate: 0 // Pode ser implementado comparando com o mês anterior
      },
      revenue_by_source: revenueBySource
    };
  },

  async addTransaction(transaction: Omit<Transaction, 'id' | 'user_id' | 'created_at'>) {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autenticado');

    const { data, error } = await supabase
      .from('transactions')
      .insert({ ...transaction, user_id: user.id })
      .select()
      .single();
    
    if (error) throw error;
    return data as Transaction;
  },

  async getTransactions(limit = 50) {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data as Transaction[];
  },

  // --- PROFILE (Etapa 3) ---
  async getProfile() {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data as UserProfile;
  },

  async updateProfile(profile: Partial<UserProfile>) {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autenticado');

    const { data, error } = await supabase
      .from('profiles')
      .upsert({ ...profile, id: user.id, updated_at: new Date().toISOString() })
      .select()
      .single();

    if (error) throw error;
    return data as UserProfile;
  },

  async updatePassword(newPassword: string) {
    const { error } = await getSupabase().auth.updateUser({ password: newPassword });
    if (error) throw error;
    return true;
  },

  async getPublicCatalog() {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('public_catalogs')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;
    return data as PublicCatalog;
  },

  async upsertPublicCatalog(catalog: Partial<PublicCatalog>) {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autenticado');
    if (!catalog.catalog_slug) throw new Error('Slug inválido');

    const { data, error } = await supabase
      .from('public_catalogs')
      .upsert({
        user_id: user.id,
        catalog_slug: catalog.catalog_slug,
        is_active: catalog.is_active ?? false,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;
    return data as PublicCatalog;
  },

  async getPublicCatalogInfo(catalog_slug: string) {
    const supabase = getSupabase();
    const { data: catalog, error: catalogError } = await supabase
      .from('public_catalogs')
      .select('user_id')
      .eq('catalog_slug', catalog_slug)
      .eq('is_active', true)
      .maybeSingle();

    if (catalogError) throw catalogError;
    if (!catalog) throw new Error('Catálogo não encontrado ou inativo.');

    const { data: settings } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', catalog.user_id)
      .maybeSingle();

    const { data: config } = await supabase
      .from('app_config')
      .select('theme_color')
      .eq('user_id', catalog.user_id)
      .maybeSingle();

    return { 
      store_name: settings?.store_name || 'Catálogo', 
      store_logo: settings?.store_logo || null, 
      theme_color: config?.theme_color || null, 
      store_phone: settings?.store_phone || null, 
      pix_key: settings?.pix_key || null,
      store_address: settings?.store_address || null,
      tax_id: settings?.tax_id || null,
      instagram: settings?.instagram || null,
      facebook: settings?.facebook || null,
      tiktok: settings?.tiktok || null
    };
  },

  async getPublicCatalogProducts(catalog_slug: string) {
    const { data, error } = await getSupabase()
      .rpc('get_public_catalog_products', { catalog_slug });
    if (error) throw error;
    return (data || []) as Array<{
      id: string;
      name: string;
      category: string;
      sale_price: number;
      image: string;
      description: string;
      available: boolean;
      stock: number;
      unidade_medida: string;
      quantidade_unidade: number;
      variations: any[];
    }>;
  },

  async getPublicPromotions(catalog_slug: string): Promise<Promotion[]> {
    const supabase = getSupabase();
    // 1. Get user_id from slug
    const { data: catalog } = await supabase
      .from('public_catalogs')
      .select('user_id')
      .eq('catalog_slug', catalog_slug)
      .eq('is_active', true)
      .maybeSingle();
    
    if (!catalog) return [];

    // 2. Get active promotions
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('user_id', catalog.user_id)
      .eq('active', true);
    
    if (error) throw error;
    return data as Promotion[];
  },

  async getPublicPaymentAdjustments(catalog_slug: string): Promise<PaymentAdjustment[]> {
    const supabase = getSupabase();
    // 1. Get user_id from slug
    const { data: catalog } = await supabase
      .from('public_catalogs')
      .select('user_id')
      .eq('catalog_slug', catalog_slug)
      .eq('is_active', true)
      .maybeSingle();
    
    if (!catalog) return [];

    // 2. Get active adjustments
    const { data, error } = await supabase
      .from('payment_adjustments')
      .select('*')
      .eq('user_id', catalog.user_id)
      .eq('active', true);
    
    if (error) throw error;
    return data as PaymentAdjustment[];
  },

  async createPublicOrder(payload: {
    catalog_slug: string;
    customer_name: string;
    customer_phone: string;
    customer_whatsapp: string;
    customer_rua: string;
    customer_numero: string;
    customer_bairro: string;
    customer_city: string;
    payment_method: string;
    notes: string;
    items: Array<{ product_id: string; quantity: number; variation_id?: string }>;
    should_register_client?: boolean;
    total?: number;
  }) {
    const { data, error } = await getSupabase().rpc('create_public_order_v2', {
      p_catalog_slug: payload.catalog_slug,
      p_customer_name: payload.customer_name,
      p_customer_phone: payload.customer_phone,
      p_customer_whatsapp: payload.customer_whatsapp,
      p_customer_rua: payload.customer_rua,
      p_customer_numero: payload.customer_numero,
      p_customer_bairro: payload.customer_bairro,
      p_customer_city: payload.customer_city,
      p_payment_method: payload.payment_method,
      p_notes: payload.notes,
      p_items: payload.items,
      p_should_register_client: payload.should_register_client ?? true,
      p_total: payload.total
    });
    if (error) throw error;
    return data;
  },

  async searchPublicClients(catalog_slug: string, query: string) {
    const { data, error } = await getSupabase()
      .rpc('search_public_clients', {
        p_catalog_slug: catalog_slug,
        p_search_query: query
      });
    if (error) throw error;
    return (data || []) as Array<{
      id: string;
      name: string;
      phone: string;
      whatsapp: string;
      rua: string;
      numero: string;
      bairro: string;
      city: string;
    }>;
  },

  // --- BACKUPS (Etapa 2) ---
  async getBackups() {
    const { data, error } = await getSupabase()
      .from('backups')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as BackupEntry[];
  },

  async getBackupDownloadUrl(storagePath: string, expiresInSeconds: number = 60) {
    const supabase = getSupabase();
    const { data, error } = await supabase.storage.from('backups').createSignedUrl(storagePath, expiresInSeconds);
    if (error) throw error;
    return data.signedUrl;
  },

  async generateBackup(format: 'json' | 'csv' = 'json', sendEmail: boolean = false) {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autenticado');
    
    // 1. Coletar todos os dados
    const [products, clients, orders, categories, settings] = await Promise.all([
      this.getProducts(),
      this.getClients(),
      this.getOrders(),
      this.getCategories(),
      this.getSettings()
    ]);

    const backupData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      store: settings?.store_name || 'Minha Loja',
      data: { products, clients, orders, categories }
    };

    const content = JSON.stringify(backupData, null, 2);
    const fileName = `backup_${new Date().getTime()}.json`;
    const filePath = `${user.id}/${fileName}`;

    // 2. Upload para o Storage (Bucket: 'backups')
    const { error: uploadError } = await supabase
      .storage
      .from('backups')
      .upload(filePath, new Blob([content], { type: 'application/json' }));

    if (uploadError) throw uploadError;

    // 3. Simulação de Envio de E-mail
    if (sendEmail && settings?.store_email) {
      console.log(`[SIMULAÇÃO] Enviando backup para o e-mail: ${settings.store_email}`);
      // Nota: Para envio real, você deve configurar uma Supabase Edge Function ou usar um serviço como SendGrid/Resend.
    }

    // 4. Registrar no Banco
    const { data: backupRecord, error: dbError } = await supabase
      .from('backups')
      .insert({
        filename: fileName,
        file_url: filePath,
        format: format,
        size_bytes: content.length,
        status: 'completed'
      })
      .select()
      .single();

    if (dbError) throw dbError;
    return backupRecord as BackupEntry;
  },

  async deleteBackup(id: string, filename: string) {
    const supabase = getSupabase();
    
    // Remover do Storage
    const { error: storageError } = await supabase.storage.from('backups').remove([filename]);
    if (storageError) console.error('Erro ao remover do storage:', storageError);

    // Remover do Banco
    const { error: dbError } = await supabase.from('backups').delete().eq('id', id);
    if (dbError) throw dbError;
  },

  // --- APP CONFIG (Etapa 1) ---
  async getAppConfig() {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('app_config')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (error) throw error;
    return data as UserAppConfig;
  },

  async updateAppConfig(config: Partial<UserAppConfig>) {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autenticado');

    const { data, error } = await supabase
      .from('app_config')
      .upsert({ 
        ...config, 
        user_id: user.id, 
        updated_at: new Date().toISOString() 
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;
    return data as UserAppConfig;
  },

  // --- SETTINGS ---
  async getSettings() {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;
    return data as AppSettings;
  },

  async updateSettings(settings: Partial<AppSettings>) {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autenticado');

    const { data, error } = await supabase
      .from('settings')
      .upsert({ 
        ...settings, 
        user_id: user.id, 
        updated_at: new Date().toISOString() 
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;
    return data as AppSettings;
  },

  // --- CATEGORIES ---
  async getCategories() {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('name');
    if (error) throw error;
    return data as Category[];
  },

  async addCategory(name: string) {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado.');

    // 1. Tentar encontrar categoria já existente para este usuário (Case Insensitive)
    const { data: existing } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .ilike('name', name)
      .maybeSingle();

    if (existing) return existing as Category;

    // 2. Se não existir, criar nova
    const { data, error } = await supabase
      .from('categories')
      .insert({ name, user_id: user.id })
      .select()
      .single();
    
    if (error) {
      // Se houver erro de duplicidade (corrida de rede), tenta buscar uma última vez
      if (error.code === '23505') {
        const { data: retry } = await supabase
          .from('categories')
          .select('*')
          .eq('user_id', user.id)
          .ilike('name', name)
          .single();
        if (retry) return retry as Category;
      }
      throw error;
    }
    return data as Category;
  },

  async updateCategoryName(categoryId: string, name: string) {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado.');

    const trimmed = String(name || '').trim();
    if (!trimmed) throw new Error('Nome da categoria inválido.');

    const { data, error } = await supabase
      .from('categories')
      .update({ name: trimmed })
      .eq('id', categoryId)
      .eq('user_id', user.id)
      .select()
      .single();
    if (error) throw error;
    return data as Category;
  },

  async renameProductsCategory(oldName: string, newName: string) {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado.');

    const from = String(oldName || '').trim();
    const to = String(newName || '').trim();
    if (!from || !to) return;
    if (from === to) return;

    const { error } = await supabase
      .from('products')
      .update({ category: to })
      .eq('user_id', user.id)
      .eq('category', from);
    if (error) throw error;
  },

  // --- PRODUCTS ---
  async getProducts() {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('products')
      .select('*, product_variations(*)')
      .eq('user_id', user.id)
      .order('name');
    if (error) throw error;
    return data.map(p => ({
      ...p,
      price: p.sale_price || p.price, // Compatibility
      variations: p.product_variations
    })) as Product[];
  },

  async getProductsLite() {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', user.id)
      .order('name');
    if (error) throw error;
    return (data || []).map((p: any) => ({
      ...p,
      price: p.sale_price || p.price,
      variations: Array.isArray(p.product_variations) ? p.product_variations : undefined
    })) as Product[];
  },

  async getProductVariations(productId: string) {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('product_variations')
      .select('*')
      .eq('product_id', productId);
    if (error) throw error;
    return (data || []) as ProductVariation[];
  },

  async addProduct(product: Omit<Product, 'id' | 'variations'>, variations: Omit<ProductVariation, 'id' | 'product_id'>[] = []) {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Sessão expirada. Por favor, entre novamente.');

    const { data: productData, error: productError } = await supabase
      .from('products')
      .insert({
        user_id: user.id,
        name: product.name,
        category: product.category,
        purchase_price: product.purchase_price,
        sale_price: product.sale_price,
        price: product.sale_price, // Compatibilidade
        stock: product.stock,
        description: product.description,
        available: product.available,
        image: product.image,
        unidade_medida: product.unidade_medida || 'Unidade',
        quantidade_unidade: product.quantidade_unidade || 1,
        controla_estoque: product.controla_estoque ?? true,
        limite_por_pedido: product.limite_por_pedido || null
      })
      .select()
      .single();
    
    if (productError) throw productError;

    let variationsWithIds: ProductVariation[] = [];
    if (variations.length > 0) {
      const variationData = variations.map(v => ({
        ...v,
        product_id: productData.id,
        user_id: user.id
      }));
      const { data: varData, error: variationError } = await supabase
        .from('product_variations')
        .insert(variationData)
        .select();
      if (variationError) throw variationError;
      variationsWithIds = varData as ProductVariation[];
    }

    return { 
      ...productData, 
      price: productData.sale_price, 
      variations: variationsWithIds 
    } as Product;
  },

  async updateProduct(id: string, product: Partial<Product>) {
    const updateData: any = { ...product };
    if (product.sale_price !== undefined) {
      updateData.price = product.sale_price;
    }
    
    const { data, error } = await getSupabase()
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return { ...data, price: data.sale_price } as Product;
  },

  async upsertProductVariations(
    productId: string,
    variations: Array<{ id?: string; name: string; value: string; additional_price: number; stock: number; sku?: string }>
  ) {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Sessão expirada. Por favor, entre novamente.');

    const cleaned = (Array.isArray(variations) ? variations : [])
      .map(v => ({
        id: v.id ? String(v.id) : undefined,
        name: String(v.name || '').trim(),
        value: String(v.value || '').trim(),
        additional_price: Number(v.additional_price || 0),
        stock: Math.max(0, Math.floor(Number(v.stock || 0))),
        sku: v.sku ? String(v.sku).trim() : ''
      }))
      .filter(v => v.name.length > 0 && v.value.length > 0);

    const { data: existingIdsData, error: existingIdsError } = await supabase
      .from('product_variations')
      .select('id')
      .eq('product_id', productId);
    if (existingIdsError) throw existingIdsError;

    const existingIds = new Set<string>((existingIdsData || []).map((r: any) => String(r.id)));
    const incomingIds = new Set<string>(cleaned.filter(v => v.id).map(v => String(v.id)));
    const toDelete = Array.from(existingIds).filter(id => !incomingIds.has(id));

    const toUpsert = cleaned
      .filter(v => v.id)
      .map(v => ({
        id: v.id,
        user_id: user.id,
        product_id: productId,
        name: v.name,
        value: v.value,
        additional_price: v.additional_price,
        stock: v.stock,
        sku: v.sku || null
      }));

    const toInsert = cleaned
      .filter(v => !v.id)
      .map(v => ({
        user_id: user.id,
        product_id: productId,
        name: v.name,
        value: v.value,
        additional_price: v.additional_price,
        stock: v.stock,
        sku: v.sku || null
      }));

    if (toDelete.length > 0) {
      const { error } = await supabase
        .from('product_variations')
        .delete()
        .in('id', toDelete);
      if (error) throw error;
    }

    if (toUpsert.length > 0) {
      const { error } = await supabase
        .from('product_variations')
        .upsert(toUpsert, { onConflict: 'id' });
      if (error) throw error;
    }

    if (toInsert.length > 0) {
      const { error } = await supabase
        .from('product_variations')
        .insert(toInsert);
      if (error) throw error;
    }

    const { data, error } = await supabase
      .from('product_variations')
      .select('*')
      .eq('product_id', productId);
    if (error) throw error;
    return (data || []) as ProductVariation[];
  },

  async updateProductsAvailability(ids: string[], available: boolean) {
    const { error } = await getSupabase()
      .from('products')
      .update({ available })
      .in('id', ids);
    if (error) throw error;
  },

  async deleteProduct(id: string) {
    const { error } = await getSupabase()
      .from('products')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // --- STOCK HISTORY & REPLENISHMENT ---
  async replenishStock(productId: string, quantity: number, cost: number, notes?: string, variationId?: string) {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autenticado');

    // 1. Atualizar estoque do produto ou variação
    if (variationId) {
      const { error: varError } = await supabase.rpc('increment_variation_stock', {
        v_id: variationId,
        v_qty: quantity
      });
      if (varError) throw varError;
    } else {
      const { error: prodError } = await supabase.rpc('increment_product_stock', {
        p_id: productId,
        p_qty: quantity
      });
      if (prodError) throw prodError;
    }

    // 2. Registrar no histórico
    const { error: historyError } = await supabase
      .from('stock_history')
      .insert({
        user_id: user.id,
        product_id: productId,
        variation_id: variationId,
        change_type: 'purchase',
        quantity,
        cost_at_time: cost,
        notes: notes || 'Reposição de estoque'
      });
    
    if (historyError) throw historyError;
    return true;
  },

  async getProductHistory(productId: string) {
    const { data, error } = await getSupabase()
      .from('stock_history')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as StockHistory[];
  },

  // --- IMAGE UPLOAD ---
  async uploadProductImage(file: File) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `products/${fileName}`;

    const { data, error } = await getSupabase()
      .storage
      .from('imagens')
      .upload(filePath, file);

    if (error) throw error;

    const { data: { publicUrl } } = getSupabase()
      .storage
      .from('imagens')
      .getPublicUrl(filePath);

    return publicUrl;
  },

  async checkStorage() {
    const { data, error } = await getSupabase().storage.listBuckets();
    if (error) throw error;
    return data;
  },

  // --- CLIENTS ---
  async getClients() {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .order('name');
    if (error) throw error;
    return data as Client[];
  },

  async getClientsLite() {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('clients')
      .select('id, name, establishment, phone, whatsapp, address, city, observations, active, source')
      .eq('user_id', user.id)
      .order('name');
    if (error) throw error;
    return (data || []) as Client[];
  },

  async addClient(client: Omit<Client, 'id'>) {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('clients')
      .insert({ ...client, user_id: user?.id })
      .select()
      .single();
    if (error) throw error;
    return data as Client;
  },

  async updateClient(id: string, client: Partial<Client>) {
    const { data, error } = await getSupabase()
      .from('clients')
      .update(client)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Client;
  },

  async deleteClient(id: string) {
    const { error } = await getSupabase()
      .from('clients')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // --- ORDERS ---
  async getOrders() {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('orders')
      .select('*, clients(*), order_items(*, products(name, image))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    
    return data.map(order => ({
      ...order,
      clientId: order.client_id,
      clientName: order.clients?.establishment || order.clients?.name || order.public_customer_name || 'Cliente Desconhecido',
      client: order.clients,
      date: new Date(order.created_at).toLocaleDateString('pt-BR'),
      paymentMethod: order.payment_method,
      paymentStatus: order.paymentStatus,
      paid_amount: order.paid_amount,
      notes: order.notes,
      deliveryDate: order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('pt-BR') : undefined,
      items: (order.order_items || []).map((item: any) => ({
        productId: item.product_id,
        productName: item.products?.name || 'Produto',
        productImage: item.products?.image,
        variationName: item.variation_name,
        quantity: item.quantity,
        price: item.price_at_time
      }))
    })) as Order[];
  },

  async getOrdersLite() {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('orders')
      .select('*, clients(name, establishment, phone, whatsapp, address, city)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;

    return (data || []).map((order: any) => ({
      ...order,
      clientId: order.client_id,
      clientName: order.clients?.establishment || order.clients?.name || order.public_customer_name || 'Cliente Desconhecido',
      client: order.clients,
      date: order.created_at ? new Date(order.created_at).toLocaleDateString('pt-BR') : '',
      paymentMethod: order.payment_method,
      paymentStatus: order.paymentStatus,
      paid_amount: order.paid_amount,
      notes: order.notes,
      deliveryDate: order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('pt-BR') : undefined,
      items: []
    })) as Order[];
  },

  async deleteOrder(id: string) {
    const { error } = await getSupabase()
      .from('orders')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async confirmPayment(orderId: string, amount: number, isTotal: boolean) {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autenticado');

    // 1. Buscar pedido atual
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('total, paid_amount')
      .eq('id', orderId)
      .single();

    if (fetchError) throw fetchError;

    const currentPaid = Number(order.paid_amount || 0);
    const newPaidAmount = isTotal ? Number(order.total) : currentPaid + amount;
    const paymentStatus = newPaidAmount >= Number(order.total) ? 'paid' : 'partial';

    // 2. Atualizar pedido
    const { data, error: updateError } = await supabase
      .from('orders')
      .update({
        paid_amount: newPaidAmount,
        paymentStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) throw updateError;

    // 3. Registrar transação financeira se houver valor pago
    if (amount > 0) {
      await this.addTransaction({
        type: 'income',
        category: 'Venda (Pedido)',
        amount: amount,
        description: `Pagamento ${isTotal ? 'Total' : 'Parcial'} - Pedido #${orderId.slice(0, 8)}`,
        date: new Date().toISOString(),
        order_id: orderId
      });
    }

    return data as Order;
  },

  async createOrder(order: Omit<Order, 'id' | 'date'>, items: { productId: string; quantity: number; price: number; variationId?: string; variationName?: string }[]) {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    
    // Entrega sempre amanhã
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 1);

    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user?.id,
        client_id: order.clientId,
        total: order.total,
        status: 'confirmed', // Sempre entra como aceito
        payment_method: (order as any).paymentMethod,
        notes: (order as any).notes,
        delivery_date: deliveryDate.toISOString()
      })
      .select()
      .single();

    if (orderError) throw orderError;

    const orderItems = items.map(item => ({
      order_id: orderData.id,
      product_id: item.productId,
      variation_id: item.variationId,
      variation_name: item.variationName,
      quantity: item.quantity,
      price_at_time: item.price
    }));

    const { error: itemsError } = await getSupabase()
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;

    if (user?.id) {
      try {
        const totalFormatted = Number(order.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        const payload = {
          body: {
            user_id: user.id,
            title: `Pedido de ${order.clientName || 'Cliente'}`,
            body: `Novo pedido no valor de R$ ${totalFormatted}.`,
            data: {
              orderId: orderData.id,
              url: `/#/orders?orderId=${encodeURIComponent(orderData.id)}`
            }
          }
        };

        const primary = await supabase.functions.invoke('send-push-notification', payload);
        if ((primary as any)?.error) {
          await supabase.functions.invoke('enviar-notificacao-push', payload);
        }
      } catch {}
    }

    return {
      ...orderData,
      clientId: orderData.client_id,
      date: new Date(orderData.created_at).toLocaleDateString('pt-BR'),
      deliveryDate: deliveryDate.toLocaleDateString('pt-BR'),
      status: 'confirmed',
      items: items
    };
  },

  async updateOrderStatus(id: string, status: string, extraData: Partial<Order> = {}) {
    const { data, error } = await getSupabase()
      .from('orders')
      .update({ 
        status, 
        updated_at: new Date().toISOString(),
        ...extraData 
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Order;
  },

  async getOrderItems(orderId: string) {
    const { data, error } = await getSupabase()
      .from('order_items')
      .select('*, products(name, image)')
      .eq('order_id', orderId);
    if (error) throw error;
    return data;
  },

  // --- WHATSAPP INTEGRATION ---
  async getWhatsAppConfig(): Promise<WhatsAppConfig | null> {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data as WhatsAppConfig | null;
  },

  async upsertWhatsAppConfig(config: Partial<WhatsAppConfig>): Promise<WhatsAppConfig> {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autenticado');

    const { data, error } = await supabase
      .from('whatsapp_config')
      .upsert({ 
        ...config, 
        user_id: user.id, 
        updated_at: new Date().toISOString() 
      }, { onConflict: 'user_id' })
      .select()
      .single();
    
    if (error) throw error;
    return data as WhatsAppConfig;
  },

  async getWhatsAppMessageLogs(limit = 50): Promise<WhatsAppMessageLog[]> {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('whatsapp_message_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data as WhatsAppMessageLog[];
  },

  async addWhatsAppMessageLog(log: Omit<WhatsAppMessageLog, 'id' | 'user_id' | 'created_at'>): Promise<WhatsAppMessageLog> {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autenticado');

    const { data, error } = await supabase
      .from('whatsapp_message_logs')
      .insert({ ...log, user_id: user.id })
      .select()
      .single();
    
    if (error) throw error;
    return data as WhatsAppMessageLog;
  },

  async resetUserData(): Promise<void> {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autenticado');

    try {
      const bucket = supabase.storage.from('backups');
      let offset = 0;
      const limit = 100;
      while (true) {
        const { data: items, error } = await bucket.list(user.id, { limit, offset });
        if (error) break;
        const files = (items || []).filter(i => i.name && (i as any).id !== null).map(i => `${user.id}/${i.name}`);
        if (files.length > 0) {
          await bucket.remove(files);
        }
        if (!items || items.length < limit) break;
        offset += limit;
      }
    } catch {}

    const { error: rpcError } = await supabase.rpc('reset_user_data_v1');
    if (!rpcError) return;

    const msg = String((rpcError as any)?.message || '');
    const code = String((rpcError as any)?.code || '');
    const isMissingFunction =
      msg.includes('Could not find the function') ||
      msg.includes('schema cache') ||
      code === 'PGRST202';

    if (!isMissingFunction) {
      throw rpcError;
    }

    const errors: string[] = [];
    const safeDeleteByUserId = async (table: string) => {
      try {
        const { error } = await supabase.from(table).delete().eq('user_id', user.id);
        if (error) errors.push(`${table}: ${error.message}`);
      } catch (e: any) {
        errors.push(`${table}: ${e?.message || 'erro'}`);
      }
    };

    await safeDeleteByUserId('whatsapp_message_logs');
    await safeDeleteByUserId('whatsapp_config');
    await safeDeleteByUserId('payment_adjustments');
    await safeDeleteByUserId('promotions');
    await safeDeleteByUserId('transactions');
    await safeDeleteByUserId('stock_history');
    await safeDeleteByUserId('backups');
    await safeDeleteByUserId('orders');
    await safeDeleteByUserId('clients');
    await safeDeleteByUserId('products');
    await safeDeleteByUserId('categories');
    await safeDeleteByUserId('public_catalogs');
    await safeDeleteByUserId('settings');
    await safeDeleteByUserId('app_config');

    try {
      const { error } = await supabase.from('profiles').delete().eq('id', user.id);
      if (error) errors.push(`profiles: ${error.message}`);
    } catch (e: any) {
      errors.push(`profiles: ${e?.message || 'erro'}`);
    }

    if (errors.length > 0) {
      throw new Error(`Falha ao excluir alguns dados:\n${errors.slice(0, 12).join('\n')}${errors.length > 12 ? '\n…' : ''}`);
    }
  },
};
