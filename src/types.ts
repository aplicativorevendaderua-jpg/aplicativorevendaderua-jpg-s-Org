export type OrderStatus = 'pending' | 'confirmed' | 'delivered' | 'cancelled';

export interface Category {
  id: string;
  name: string;
  created_at?: string;
}

export interface ProductVariation {
  id: string;
  user_id?: string;
  product_id: string;
  name: string; // e.g., "Sabor", "Tamanho", "Cor"
  value: string; // e.g., "Morango", "G", "Azul"
  additional_price: number;
  stock: number;
  sku?: string;
}

export interface Product {
  id: string;
  user_id?: string;
  name: string;
  category: string;
  purchase_price: number;
  sale_price: number;
  price: number; // For compatibility with existing components (mapped to sale_price)
  stock: number;
  description: string;
  image: string;
  available: boolean;
  unidade_medida: string;
  quantidade_unidade: number;
  controla_estoque: boolean;
  limite_por_pedido?: number;
  variations?: ProductVariation[];
  created_at?: string;
}

export interface StockHistory {
  id: string;
  user_id: string;
  product_id: string;
  variation_id?: string;
  change_type: 'purchase' | 'sale' | 'adjustment';
  quantity: number;
  cost_at_time: number;
  notes?: string;
  created_at: string;
}

export interface Client {
  id: string;
  name: string;
  establishment: string;
  phone: string;
  whatsapp: string;
  address: string;
  rua?: string;
  numero?: string;
  bairro?: string;
  city: string;
  observations: string;
  active: boolean;
  source?: 'internal' | 'online';
}

export interface OrderItem {
  productId: string;
  productName?: string;
  productImage?: string;
  variationId?: string;
  variationName?: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  clientId: string;
  clientName: string;
  client?: Client;
  date: string;
  total: number;
  paid_amount?: number;
  status: OrderStatus;
  paymentMethod?: string;
  paymentStatus?: 'pending' | 'partial' | 'paid';
  deliveryDate?: string;
  items: OrderItem[];
  notes?: string;
}

export interface Promotion {
  id: string;
  user_id?: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  active: boolean;
  min_order_value?: number;
  apply_to: 'all' | 'category' | 'product';
  target_id?: string;
  created_at?: string;
}

export interface PaymentAdjustment {
  id: string;
  user_id?: string;
  method: string;
  type: 'fee' | 'discount';
  adjustment_type: 'percentage' | 'fixed';
  value: number;
  active: boolean;
  created_at?: string;
}

export type Page = 
  | 'login' 
  | 'register' 
  | 'recover-password' 
  | 'verify-email' 
  | 'public-catalog'
  | 'catalog'
  | 'dashboard' 
  | 'products' 
  | 'product-form' 
  | 'clients' 
  | 'client-form' 
  | 'orders' 
  | 'order-form' 
  | 'cart' 
  | 'checkout' 
  | 'finance' 
  | 'settings' 
  | 'profile' 
  | 'promotions';

export interface Transaction {
  id: string;
  user_id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  date: string;
  order_id?: string;
  stock_history_id?: string;
  created_at: string;
}

export interface FinanceSummary {
  total_income: number;
  total_expense: number;
  net_profit: number;
  pending_payments: number;
  by_category: { category: string; amount: number; type: 'income' | 'expense' }[];
  last_transactions: Transaction[];
  top_products: {
    id: string;
    name: string;
    quantity: number;
    revenue: number;
    profit: number;
    margin: number;
  }[];
  projections: {
    expected_revenue: number;
    expected_profit: number;
    growth_rate: number;
  };
  revenue_by_source: {
    manual: { revenue: number; count: number };
    online: { revenue: number; count: number };
  };
}

export interface AppSettings {
  id?: string;
  store_name: string;
  store_phone: string;
  store_email: string;
  store_address: string;
  store_logo: string;
  currency: string;
  tax_id: string;
  whatsapp_message_template: string;
  pix_key?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
}

export interface UserAppConfig {
  id?: string;
  user_id?: string;
  notifications_enabled: boolean;
  dark_mode: boolean;
  theme_color: string;
  backup_frequency: 'manual' | 'daily' | 'weekly';
  backup_format: 'json' | 'csv';
  backup_email_enabled: boolean;
}

export interface BackupEntry {
  id: string;
  user_id?: string;
  filename: string;
  file_url: string;
  format: string;
  size_bytes: number;
  status: 'completed' | 'failed';
  created_at: string;
}

export interface UserProfile {
  id: string;
  full_name: string;
  avatar_url: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  work_days: string[];
  work_start_time: string;
  work_end_time: string;
  service_hours: string;
  location_lat?: number;
  location_lng?: number;
}

export interface PublicCatalog {
  id?: string;
  user_id?: string;
  catalog_slug: string;
  is_active: boolean;
}
