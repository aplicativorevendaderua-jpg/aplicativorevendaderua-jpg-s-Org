/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Settings, 
  Plus, 
  Search, 
  Bell, 
  ChevronRight, 
  ArrowLeft, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  Clock, 
  Calendar,
  XCircle,
  LogOut,
  PlusCircle,
  Trash2,
  Edit2,
  Send,
  MoreVertical,
  Filter,
  Store,
  Utensils,
  Coffee,
  Package2,
  UserPlus,
  CheckCircle,
  AlertCircle,
  Smartphone,
  MapPin,
  Phone,
  MessageSquare,
  Minus,
  ArrowRight,
  Banknote,
  CreditCard,
  QrCode,
  FileText,
  Camera,
  User,
  Shield,
  Building2,
  HelpCircle,
  PackagePlus,
  ChevronLeft,
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  History,
  ArrowUpCircle,
  ArrowDownCircle,
  Target,
  Zap,
  Award,
  Globe,
  TrendingUp as TrendingIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Page, Product, Client, Order, OrderStatus, Category, ProductVariation, AppSettings, UserAppConfig, BackupEntry, UserProfile, PublicCatalog, StockHistory, Transaction, FinanceSummary } from './types';
import { supabaseService } from './services/supabaseService';
import { getSupabase, isSupabaseConfigured } from './lib/supabase';

export default function App() {
  const [isConfigured] = useState(isSupabaseConfigured());
  useEffect(() => {
    console.log('App initialization - Configured:', isConfigured);
  }, [isConfigured]);
  const [currentPage, setCurrentPage] = useState<Page>('login');
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>({
    store_name: 'Minha Loja B2B',
    store_phone: '',
    store_email: '',
    store_address: '',
    store_logo: '',
    currency: 'R$',
    tax_id: '',
    whatsapp_message_template: ''
  });
  const [userAppConfig, setUserAppConfig] = useState<UserAppConfig>({
    notifications_enabled: true,
    dark_mode: false,
    theme_color: '#3b82f6',
    backup_frequency: 'manual',
    backup_format: 'json',
    backup_email_enabled: false
  });
  const [userProfile, setUserProfile] = useState<UserProfile>({
    id: '',
    full_name: '',
    avatar_url: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    work_days: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'],
    work_start_time: '08:00',
    work_end_time: '18:00',
    service_hours: ''
  });
  const [publicCatalog, setPublicCatalog] = useState<PublicCatalog | null>(null);
  const [publicCatalogSlug, setPublicCatalogSlug] = useState<string | null>(null);
  const [publicCatalogInfo, setPublicCatalogInfo] = useState<{ store_name: string; store_logo: string | null; theme_color: string | null } | null>(null);
  const [publicCatalogProducts, setPublicCatalogProducts] = useState<Array<{ id: string; name: string; category: string; sale_price: number; image: string; description: string; available: boolean; stock: number }>>([]);
  const [publicCatalogSearch, setPublicCatalogSearch] = useState('');
  const [publicCatalogIsLoading, setPublicCatalogIsLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [cart, setCart] = useState<{ productId: string; variationId?: string; quantity: number }[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedProductForVariation, setSelectedProductForVariation] = useState<Product | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderFilter, setOrderFilter] = useState<OrderStatus | 'all'>('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [productSearchForOrder, setProductSearchForOrder] = useState('');
  const [pendingQuantities, setPendingQuantities] = useState<Record<string, number>>({});
  const [clientFilter, setClientFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedClientForDetails, setSelectedClientForDetails] = useState<Client | null>(null);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [newClientPlaceholder, setNewClientPlaceholder] = useState<string | null>(null);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [orderToEdit, setOrderToEdit] = useState<Order | null>(null);
  const [replenishingProduct, setReplenishingProduct] = useState<Product | null>(null);
  const [viewingHistory, setViewingHistory] = useState<Product | null>(null);
  const [confirmingDelivery, setConfirmingDelivery] = useState<Order | null>(null);
  const [confirmingPayment, setConfirmingPayment] = useState<Order | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [isTotalPayment, setIsTotalPayment] = useState<boolean>(true);
  const [notifications, setNotifications] = useState<Array<{ 
    id: string; 
    title: string; 
    message: string; 
    date: string; 
    read: boolean; 
    orderId?: string;
    items?: Array<{ name: string; quantity: number; price: number }>;
    total?: number;
  }>>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playNotificationSound = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    }
    audioRef.current.play().catch(e => console.error('Error playing sound:', e));
  };

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${cleanPhone}`, '_blank');
  };

  const makeCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const openMap = (client: any) => {
    let query = '';
    if (client.rua) {
      query = `${client.rua}, ${client.numero || ''}, ${client.bairro || ''}, ${client.city}`;
    } else {
      query = `${client.address || ''}, ${client.city || ''}`;
    }
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank');
  };

  useEffect(() => {
    const supabase = getSupabase();
    
    // Subscribe to new orders
    const channel = supabase
      .channel('new-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        async (payload) => {
          const newOrder = payload.new as any;
          
          if (newOrder.user_id === userProfile.id && userProfile.id) {
            playNotificationSound();
            
            // Buscar itens do pedido e nome do cliente para a notificação
            let orderItems: any[] = [];
            let customerName = 'Novo Cliente';

            try {
              // 1. Buscar Itens
              const { data: items } = await supabase
                .from('order_items')
                .select('quantity, price_at_time, products(name)')
                .eq('order_id', newOrder.id);
              
              if (items) {
                orderItems = items.map((item: any) => ({
                  name: item.products?.name || 'Produto',
                  quantity: item.quantity,
                  price: item.price_at_time
                }));
              }

              // 2. Buscar Nome do Cliente
              if (newOrder.source === 'online') {
                customerName = newOrder.public_customer_name || 'Cliente Online';
              } else if (newOrder.client_id) {
                const { data: client } = await supabase
                  .from('clients')
                  .select('name, establishment')
                  .eq('id', newOrder.client_id)
                  .single();
                if (client) {
                  customerName = client.establishment || client.name;
                }
              }
            } catch (e) {
              console.error('Error fetching details for notification:', e);
            }

            const notification = {
              id: Math.random().toString(36).substr(2, 9),
              title: `Pedido de ${customerName}`,
              message: `Olá ${userProfile.full_name || 'Representante'}, você tem um novo pedido, venha conferir.`,
              date: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              read: false,
              orderId: newOrder.id,
              items: orderItems,
              total: Number(newOrder.total),
              isNewClient: !newOrder.client_id // Se client_id for nulo no payload inicial, pode ser um novo cliente sendo processado
            };
            
            setNotifications(prev => [notification, ...prev]);
            fetchData();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile.id]);

  const selectedClient = useMemo(() => 
    clients.find(c => c.id === selectedClientId) || null
  , [clients, selectedClientId]);

  const fetchDataInFlightRef = useRef(false);
  const fetchData = async () => {
    if (fetchDataInFlightRef.current) return;
    fetchDataInFlightRef.current = true;
    setIsLoading(true);
    try {
      const [productsData, clientsData, ordersData, categoriesData, settingsData, appConfigData, backupsData, profileData, publicCatalogData] = await Promise.all([
        supabaseService.getProducts(),
        supabaseService.getClients(),
        supabaseService.getOrders(),
        supabaseService.getCategories(),
        supabaseService.getSettings(),
        supabaseService.getAppConfig(),
        supabaseService.getBackups(),
        supabaseService.getProfile(),
        supabaseService.getPublicCatalog()
      ]);
      setProducts(productsData);
      setClients(clientsData);
      setOrders(ordersData);
      setCategories(categoriesData);
      setBackups(backupsData);
      if (settingsData) setAppSettings(settingsData);
      if (appConfigData) setUserAppConfig(appConfigData);
      if (profileData) setUserProfile(profileData);
      if (publicCatalogData) setPublicCatalog(publicCatalogData);
    } catch (error) {
      console.error('Error fetching data from Supabase:', error);
      const message =
        typeof error === 'object' && error && 'message' in error
          ? String((error as any).message)
          : 'Erro desconhecido';
      if (message.includes('auth-token') && message.includes('stole it')) {
        setTimeout(() => {
          fetchData();
        }, 250);
        return;
      }
      alert(`Aviso: Não foi possível carregar dados do Supabase. ${message}`);
    } finally {
      setIsLoading(false);
      fetchDataInFlightRef.current = false;
    }
  };

  const fetchPublicCatalog = async (slug: string) => {
    setPublicCatalogIsLoading(true);
    setPublicCatalogSlug(slug);
    try {
      const [info, products] = await Promise.all([
        supabaseService.getPublicCatalogInfo(slug),
        supabaseService.getPublicCatalogProducts(slug)
      ]);
      setPublicCatalogInfo(info);
      setPublicCatalogProducts(products);
    } catch (error: any) {
      console.error(error);
      const message = error?.message ? String(error.message) : 'Erro desconhecido';
      alert(`Não foi possível carregar o catálogo público. ${message}`);
      setPublicCatalogInfo(null);
      setPublicCatalogProducts([]);
    } finally {
      setPublicCatalogIsLoading(false);
    }
  };

  useEffect(() => {
    const supabase = getSupabase();
    let unsubscribed = false;

    const hash = window.location.hash || '';
    const match = hash.match(/^#\/c\/([^/?#]+)/i);
    const isPublicRoute = Boolean(match?.[1]);
    if (match?.[1]) {
      const slug = decodeURIComponent(match[1]);
      setCurrentPage('public-catalog');
      fetchPublicCatalog(slug).finally(() => setIsLoading(false));
    }

    let initialHandled = false;
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!initialHandled && event === 'INITIAL_SESSION') {
        initialHandled = true;
        if (!session) {
          if (!isPublicRoute) setCurrentPage('login');
          setIsLoading(false);
          return;
        }
        if (!isPublicRoute) {
          fetchData();
          setCurrentPage('dashboard');
        } else {
          setIsLoading(false);
        }
        return;
      }

      if (session) {
        if (!isPublicRoute) {
          fetchData();
          setCurrentPage('dashboard');
        }
      } else {
        setProducts([]);
        setClients([]);
        setOrders([]);
        setCategories([]);
        setBackups([]);
        if (!isPublicRoute) setCurrentPage('login');
      }
    });

    return () => {
      unsubscribed = true;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const navigate = (page: Page) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  const addToCart = (product: Product, quantity: number = 1, variationId?: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id && item.variationId === variationId);
      if (existing) {
        return prev.map(item => 
          (item.productId === product.id && item.variationId === variationId)
            ? { ...item, quantity: item.quantity + quantity } 
            : item
        );
      }
      return [...prev, { productId: product.id, variationId, quantity }];
    });
    setSelectedProductForVariation(null);
  };

  const removeFromCart = (productId: string, variationId?: string) => {
    setCart(prev => prev.filter(item => !(item.productId === productId && item.variationId === variationId)));
  };

  const updateCartQuantity = (productId: string, newQuantity: number, variationId?: string) => {
    if (newQuantity <= 0) {
      removeFromCart(productId, variationId);
      return;
    }
    setCart(prev => prev.map(item => 
      (item.productId === productId && item.variationId === variationId)
        ? { ...item, quantity: newQuantity } 
        : item
    ));
  };

  const cartWithDetails = useMemo(() => {
    return cart.map(item => {
      const product = products.find(p => p.id === item.productId);
      if (!product) return null;
      
      let price = product.price;
      let variationName = '';
      
      if (item.variationId && product.variations) {
        const variation = product.variations.find(v => v.id === item.variationId);
        if (variation) {
          price += variation.additional_price;
          variationName = `${variation.name}: ${variation.value}`;
        }
      }

      return {
        ...product,
        variationId: item.variationId,
        variationName,
        price,
        quantity: item.quantity,
        total: price * item.quantity
      };
    }).filter((item): item is (Product & { variationId?: string; variationName: string; quantity: number; total: number }) => item !== null);
  }, [cart, products]);

  const cartTotal = useMemo(() => {
    return cartWithDetails.reduce((acc, item) => acc + item.total, 0);
  }, [cartWithDetails]);

  const cartItemsCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  // --- Components ---

  const BottomNav = () => {
    const mainItems = [
      { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
      { id: 'products', label: 'Produtos', icon: Package },
      { id: 'orders', label: 'Pedidos', icon: ShoppingCart },
    ];

    const moreItems = [
      { id: 'clients', label: 'Clientes', icon: Users },
      { id: 'finance', label: 'Finanças', icon: BarChart3 },
      { id: 'settings', label: 'Ajustes', icon: Settings },
    ];

    const isMoreActive = moreItems.some(item => currentPage === item.id);

    return (
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-100 px-2 pb-8 pt-3 z-50">
        <div className="flex items-center justify-between max-w-md mx-auto relative">
          {mainItems.map((item) => {
            const isActive = currentPage === item.id;
            const Icon = item.icon;
            
            return (
              <button 
                key={item.id}
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  navigate(item.id as Page);
                }}
                className="flex flex-col items-center gap-1.5 flex-1 relative py-1 group"
              >
                <div className={`
                  relative z-10 p-2 rounded-2xl transition-all duration-200
                  ${isActive ? 'bg-primary/10 text-primary scale-110' : 'text-slate-400 group-hover:text-slate-600'}
                `}>
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                  {isActive && (
                    <div className="absolute inset-0 bg-primary/10 rounded-2xl -z-10" />
                  )}
                </div>
                <span className={`
                  text-[9px] font-black uppercase tracking-wider transition-all duration-200
                  ${isActive ? 'text-primary' : 'text-slate-400'}
                `}>
                  {item.label}
                </span>
                
                {isActive && (
                  <div className="absolute -top-3 w-1.5 h-1.5 bg-primary rounded-full" />
                )}
              </button>
            );
          })}

          {/* Botão MAIS */}
          <button 
            onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
            className="flex flex-col items-center gap-1.5 flex-1 relative py-1 group"
          >
            <div className={`
              relative z-10 p-2 rounded-2xl transition-all duration-200
              ${isMoreMenuOpen || isMoreActive ? 'bg-primary/10 text-primary scale-110' : 'text-slate-400 group-hover:text-slate-600'}
            `}>
              <MoreVertical size={22} strokeWidth={isMoreMenuOpen || isMoreActive ? 2.5 : 2} />
              {(isMoreMenuOpen || isMoreActive) && (
                <div className="absolute inset-0 bg-primary/10 rounded-2xl -z-10" />
              )}
            </div>
            <span className={`
              text-[9px] font-black uppercase tracking-wider transition-all duration-200
              ${isMoreMenuOpen || isMoreActive ? 'text-primary' : 'text-slate-400'}
            `}>
              Mais
            </span>
            {isMoreActive && !isMoreMenuOpen && (
              <div className="absolute -top-3 w-1.5 h-1.5 bg-primary rounded-full" />
            )}
          </button>

          {/* Menu Popup MAIS */}
          <AnimatePresence>
            {isMoreMenuOpen && (
              <>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsMoreMenuOpen(false)}
                  className="fixed inset-0 bg-black/5 -z-20"
                />
                <motion.div 
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.95 }}
                  className="absolute bottom-24 right-4 w-48 bg-white/90 backdrop-blur-xl border border-slate-200 rounded-[32px] p-2 shadow-2xl z-[60]"
                >
                  <div className="flex flex-col gap-1">
                    {moreItems.map((item) => {
                      const isActive = currentPage === item.id;
                      const Icon = item.icon;
                      
                      return (
                        <button 
                          key={item.id}
                          onClick={() => {
                            setIsMoreMenuOpen(false);
                            navigate(item.id as Page);
                          }}
                          className={`
                            flex items-center gap-3 w-full p-4 rounded-2xl transition-all duration-200
                            ${isActive ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-600 hover:bg-slate-50'}
                          `}
                        >
                          <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                          <span className="text-[11px] font-black uppercase tracking-widest">{item.label}</span>
                          {isActive && <div className="ml-auto size-1.5 bg-white rounded-full" />}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </nav>
    );
  };

  const Header = ({ title, showBack, onBack, rightElement }: { title: string; showBack?: boolean; onBack?: () => void; rightElement?: React.ReactNode }) => (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {showBack && (
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </button>
        )}
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
      </div>
      {rightElement}
    </header>
  );

  // --- Pages ---

  const PublicCatalogPage = () => {
    const [publicCart, setPublicCart] = useState<Array<{ productId: string; variationId?: string; quantity: number }>>([]);
    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerWhatsApp, setCustomerWhatsApp] = useState('');
    const [customerRua, setCustomerRua] = useState('');
    const [customerNumero, setCustomerNumero] = useState('');
    const [customerBairro, setCustomerBairro] = useState('');
    const [customerCity, setCustomerCity] = useState('');
    const [customerNotes, setCustomerNotes] = useState('');
    const [suggestedClients, setSuggestedClients] = useState<any[]>([]);
    const [isSearchingClient, setIsSearchingClient] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('Pix');
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const [shouldRegisterClient, setShouldRegisterClient] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
    const [selectedProductForVar, setSelectedProductForVar] = useState<any | null>(null);

    // Efeito para busca de cliente (Autocomplete Público)
    useEffect(() => {
      if (!customerName || customerName.length < 3 || !publicCatalogSlug) {
        setSuggestedClients([]);
        return;
      }

      const delayDebounceFn = setTimeout(async () => {
        setIsSearchingClient(true);
        try {
          const results = await supabaseService.searchPublicClients(publicCatalogSlug, customerName);
          setSuggestedClients(results);
        } catch (error) {
          console.error('Erro ao buscar clientes:', error);
        } finally {
          setIsSearchingClient(false);
        }
      }, 500);

      return () => clearTimeout(delayDebounceFn);
    }, [customerName, publicCatalogSlug]);

    const selectSuggestedClient = (client: any) => {
      setCustomerName(client.name);
      setCustomerPhone(client.phone || '');
      setCustomerWhatsApp(client.whatsapp || '');
      setCustomerRua(client.rua || '');
      setCustomerNumero(client.numero || '');
      setCustomerBairro(client.bairro || '');
      setCustomerCity(client.city || '');
      setSuggestedClients([]);
    };

    const cartCount = useMemo(() => publicCart.reduce((acc, i) => acc + i.quantity, 0), [publicCart]);
    
    const publicCatalogProductsWithDetails = useMemo(() => {
      return publicCart.map(item => {
        const product = publicCatalogProducts.find(p => p.id === item.productId);
        if (!product) return null;
        
        let price = Number(product.sale_price);
        let variationName = '';
        
        if (item.variationId && (product as any).variations) {
          const variation = (product as any).variations.find((v: any) => v.id === item.variationId);
          if (variation) {
            price += Number(variation.additional_price);
            variationName = `${variation.name}: ${variation.value}`;
          }
        }

        return {
          ...product,
          variationId: item.variationId,
          variationName,
          price,
          quantity: item.quantity,
          total: price * item.quantity
        };
      }).filter(item => item !== null);
    }, [publicCart, publicCatalogProducts]);

    const cartTotal = useMemo(() => {
      return publicCatalogProductsWithDetails.reduce((acc, item: any) => acc + item.total, 0);
    }, [publicCatalogProductsWithDetails]);

    const publicCategories = useMemo(() => {
      const cats = new Set(publicCatalogProducts.map(p => p.category));
      return ['Todas', ...Array.from(cats)].sort();
    }, [publicCatalogProducts]);

    const addToPublicCart = (product: any, variationId?: string) => {
      if (!variationId && product.variations && product.variations.length > 0) {
        setSelectedProductForVar(product);
        return;
      }

      setPublicCart(prev => {
        const existing = prev.find(i => i.productId === product.id && i.variationId === variationId);
        if (existing) return prev.map(i => (i.productId === product.id && i.variationId === variationId) ? { ...i, quantity: i.quantity + 1 } : i);
        return [...prev, { productId: product.id, variationId, quantity: 1 }];
      });
      setSelectedProductForVar(null);
    };

    const setPublicCartQty = (productId: string, qty: number, variationId?: string) => {
      setPublicCart(prev => {
        const nextQty = Math.max(0, qty);
        if (nextQty === 0) return prev.filter(i => !(i.productId === productId && i.variationId === variationId));
        const exists = prev.find(i => i.productId === productId && i.variationId === variationId);
        if (!exists) return [...prev, { productId, variationId, quantity: nextQty }];
        return prev.map(i => (i.productId === productId && i.variationId === variationId) ? { ...i, quantity: nextQty } : i);
      });
    };

    const placePublicOrder = async () => {
      if (!publicCatalogSlug) { alert('Catálogo inválido.'); return; }
      if (!customerName.trim()) { alert('Informe seu nome.'); return; }
      if (!customerWhatsApp.trim() && !customerPhone.trim()) { alert('Informe telefone ou WhatsApp.'); return; }
      if (publicCart.length === 0) { alert('Selecione pelo menos um item.'); return; }

      setIsPlacingOrder(true);
      try {
        const items = publicCart.map(i => ({ 
          product_id: i.productId, 
          variation_id: i.variationId,
          quantity: i.quantity 
        }));
        const orderId = await supabaseService.createPublicOrder({
          catalog_slug: publicCatalogSlug,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          customer_whatsapp: customerWhatsApp.trim(),
          customer_rua: customerRua.trim(),
          customer_numero: customerNumero.trim(),
          customer_bairro: customerBairro.trim(),
          customer_city: customerCity.trim(),
          payment_method: paymentMethod,
          notes: customerNotes.trim(),
          items,
          should_register_client: shouldRegisterClient
        });
        setPublicCart([]);
        setCheckoutOpen(false);
        alert(`Pedido enviado com sucesso! Aguarde o contato da loja.`);
      } catch (error: any) {
        alert('Erro ao criar pedido: ' + (error.message || 'Erro desconhecido'));
      } finally {
        setIsPlacingOrder(false);
      }
    };

    const filtered = useMemo(() => {
      const q = publicCatalogSearch.toLowerCase();
      return publicCatalogProducts.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
        const matchesCategory = selectedCategory === 'Todas' || p.category === selectedCategory;
        return matchesSearch && matchesCategory;
      });
    }, [publicCatalogProducts, publicCatalogSearch, selectedCategory]);

    return (
      <div className={`min-h-screen bg-background-light transition-all duration-300 ${cartCount > 0 ? 'pb-36' : 'pb-10'}`}>
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => {
              window.location.hash = '';
              navigate('login');
            }}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-lg font-black tracking-tight text-center flex-1">
            {publicCatalogInfo?.store_name || 'Catálogo'}
          </h1>
          <div className="w-10" />
        </header>

        <main className="p-4 space-y-4">
          <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              {publicCatalogInfo?.store_logo ? (
                <img src={publicCatalogInfo.store_logo} alt="" className="size-12 rounded-2xl object-cover border border-slate-100" />
              ) : (
                <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/10">
                  <Store size={22} />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loja Online</p>
                <p className="font-black text-slate-900 truncate">{publicCatalogInfo?.store_name || 'Catálogo'}</p>
                <p className="text-[10px] font-bold text-slate-400 truncate">Siga-nos para novidades</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={publicCatalogSearch}
              onChange={(e) => setPublicCatalogSearch(e.target.value)}
              className="w-full h-14 pl-11 pr-4 rounded-2xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary outline-none transition-all font-bold text-sm"
              placeholder="O que você procura hoje?"
            />
          </div>

          <div className="space-y-3">
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4">
              {publicCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-6 py-3 rounded-2xl whitespace-nowrap text-xs font-black uppercase tracking-widest transition-all shadow-sm border ${
                    selectedCategory === cat 
                      ? 'bg-primary text-white border-primary shadow-primary/20 scale-105' 
                      : 'bg-white text-slate-500 border-slate-100 hover:border-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {publicCatalogIsLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="animate-spin size-10 border-4 border-primary border-t-transparent rounded-full" />
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Carregando catálogo...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 shadow-sm border border-slate-200 text-center">
              <Package2 size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="text-sm font-bold text-slate-500 uppercase">Nenhum produto encontrado</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {filtered.map(p => (
                <div 
                  key={p.id} 
                  onClick={() => setSelectedProductForVar(p)}
                  className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-200 flex flex-col cursor-pointer active:scale-[0.98] transition-all"
                >
                  <div className="relative aspect-square">
                    <img src={p.image || 'https://picsum.photos/seed/public/400/400'} alt={p.name} className="w-full h-full object-cover" />
                    {p.stock <= 0 && (
                      <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center p-4">
                        <span className="bg-red-500 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-full shadow-lg">Esgotado</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{p.category}</p>
                    <h3 className="font-black text-slate-900 leading-tight line-clamp-2 text-sm mb-1">{p.name}</h3>
                    
                    {/* Unidade e Preço Unitário */}
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md uppercase">
                        {p.unidade_medida || 'UN'}
                      </span>
                      {p.quantidade_unidade > 1 && (
                        <span className="text-[10px] font-bold text-slate-400">
                          (R$ {(Number(p.sale_price) / p.quantidade_unidade).toFixed(2)}/un)
                        </span>
                      )}
                    </div>

                    <div className="mt-auto pt-2 flex items-center justify-between">
                      <p className="text-primary font-black text-base">R$ {Number(p.sale_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addToPublicCart(p);
                        }}
                        disabled={p.stock <= 0}
                        className="size-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center active:scale-90 transition-all disabled:opacity-20 shadow-lg shadow-slate-900/20"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* MODAL DE DETALHES DO PRODUTO */}
        <AnimatePresence>
          {selectedProductForVar && (
            <div className="fixed inset-0 z-[100] flex items-end justify-center">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedProductForVar(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-md bg-white rounded-t-[32px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/40 rounded-full z-10" />
                
                <div className="overflow-y-auto no-scrollbar pb-10">
                  {/* Imagem em Destaque */}
                  <div className="relative aspect-square w-full">
                    <img 
                      src={selectedProductForVar.image || 'https://picsum.photos/seed/public/400/400'} 
                      alt={selectedProductForVar.name} 
                      className="w-full h-full object-cover" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Cabeçalho */}
                    <div>
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">{selectedProductForVar.category}</p>
                          <h3 className="font-black text-2xl text-slate-900 leading-tight">{selectedProductForVar.name}</h3>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-black text-primary">R$ {Number(selectedProductForVar.sale_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedProductForVar.unidade_medida || 'Unidade'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Descrição */}
                    {selectedProductForVar.description && (
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Descrição</p>
                        <p className="text-sm font-medium text-slate-600 leading-relaxed">{selectedProductForVar.description}</p>
                      </div>
                    )}

                    {/* Variações (se existirem) */}
                    {selectedProductForVar.variations && selectedProductForVar.variations.length > 0 ? (
                      <div className="space-y-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Opções Disponíveis</p>
                        <div className="space-y-3">
                          {selectedProductForVar.variations.map((v: any) => (
                            <button
                              key={v.id}
                              onClick={() => addToPublicCart(selectedProductForVar, v.id)}
                              disabled={v.stock <= 0}
                              className="w-full p-4 rounded-2xl border-2 border-slate-100 hover:border-primary/30 flex items-center justify-between group transition-all disabled:opacity-40"
                            >
                              <div className="text-left">
                                <p className="text-[10px] font-black text-slate-400 uppercase">{v.name}</p>
                                <p className="font-black text-slate-900">{v.value}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-black text-primary">
                                  R$ {(Number(selectedProductForVar.sale_price) + Number(v.additional_price)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                                {v.stock <= 0 && <span className="text-[10px] font-black text-red-500 uppercase">Esgotado</span>}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      /* Botão de Compra Direta (se não houver variações) */
                      <button
                        onClick={() => addToPublicCart(selectedProductForVar)}
                        disabled={selectedProductForVar.stock <= 0}
                        className="w-full h-16 bg-slate-900 text-white rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-slate-900/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-20"
                      >
                        {selectedProductForVar.stock <= 0 ? 'Produto Esgotado' : 'Adicionar ao Carrinho'}
                        {selectedProductForVar.stock > 0 && <ShoppingCart size={20} />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Botão de Fechar flutuante */}
                <button 
                  onClick={() => setSelectedProductForVar(null)}
                  className="absolute top-4 right-4 size-10 bg-black/20 backdrop-blur-md text-white rounded-full flex items-center justify-center active:scale-90 transition-all z-20"
                >
                  <XCircle size={24} />
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {cartCount > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[min(420px,calc(100vw-2rem))] bg-slate-900/95 backdrop-blur-md text-white rounded-[28px] shadow-2xl shadow-slate-900/40 p-4 flex items-center justify-between z-50 border border-white/10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                <ShoppingCart size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{cartCount} itens</p>
                <p className="font-black text-lg">R$ {cartTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
            <button
              onClick={() => setCheckoutOpen(true)}
              className="h-12 px-6 rounded-2xl bg-white text-slate-900 font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
            >
              Finalizar
            </button>
          </div>
        )}

        <AnimatePresence>
          {checkoutOpen && (
            <div className="fixed inset-0 z-[80] flex items-end justify-center">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCheckoutOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-md bg-white rounded-t-[32px] p-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 shrink-0" />
                
                <div className="overflow-y-auto no-scrollbar flex-1 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resumo do Pedido</p>
                      <p className="text-2xl font-black text-slate-900">R$ {cartTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <button onClick={() => setCheckoutOpen(false)} className="p-2 rounded-2xl bg-slate-100 text-slate-700">
                      <XCircle size={24} />
                    </button>
                  </div>

                  {/* Itens do Carrinho */}
                  <div className="space-y-3">
                    {publicCatalogProductsWithDetails.map((item: any) => (
                      <div key={`${item.id}-${item.variationId}`} className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <img src={item.image} className="size-14 rounded-xl object-cover" />
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-sm text-slate-900 truncate">{item.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{item.variationName || item.category}</p>
                          <p className="font-black text-primary text-xs mt-1">{item.quantity}x R$ {item.price.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-2 bg-white rounded-xl p-1 border border-slate-200">
                          <button onClick={() => setPublicCartQty(item.id, item.quantity - 1, item.variationId)} className="p-1 text-slate-400"><Minus size={14} /></button>
                          <span className="text-xs font-black w-4 text-center">{item.quantity}</span>
                          <button onClick={() => setPublicCartQty(item.id, item.quantity + 1, item.variationId)} className="p-1 text-slate-400"><Plus size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dados de Entrega/Contato</p>
                    <div className="space-y-3">
                      <div className="relative">
                        <input 
                          value={customerName} 
                          onChange={(e) => setCustomerName(e.target.value)} 
                          className="w-full h-14 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-primary outline-none font-bold text-sm" 
                          placeholder="Seu Nome ou Nome da Loja" 
                        />
                        {isSearchingClient && (
                          <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <div className="animate-spin size-4 border-2 border-primary border-t-transparent rounded-full" />
                          </div>
                        )}
                        
                        {/* Lista de Sugestões de Clientes */}
                        <AnimatePresence>
                          {suggestedClients.length > 0 && (
                            <motion.div 
                              initial={{ opacity: 0, y: -10 }} 
                              animate={{ opacity: 1, y: 0 }} 
                              exit={{ opacity: 0, y: -10 }}
                              className="absolute top-full left-0 right-0 z-[90] bg-white border border-slate-200 rounded-xl mt-2 shadow-2xl overflow-hidden"
                            >
                              <div className="p-2 border-b border-slate-100 bg-slate-50">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Encontramos seu cadastro. Deseja usar?</p>
                              </div>
                              {suggestedClients.map(client => (
                                <button
                                  key={client.id}
                                  onClick={() => selectSuggestedClient(client)}
                                  className="w-full p-4 text-left hover:bg-slate-50 flex items-center justify-between group transition-all"
                                >
                                  <div>
                                    <p className="font-black text-sm text-slate-900">{client.name}</p>
                                    <p className="text-[10px] font-bold text-slate-400">{client.phone} • {client.bairro || client.city}</p>
                                  </div>
                                  <ArrowRight size={16} className="text-primary opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <input 
                          value={customerWhatsApp} 
                          onChange={(e) => setCustomerWhatsApp(e.target.value)} 
                          className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-primary outline-none font-bold text-sm" 
                          placeholder="WhatsApp" 
                        />
                        <select 
                          value={paymentMethod} 
                          onChange={(e) => setPaymentMethod(e.target.value)} 
                          className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-primary outline-none font-bold text-sm"
                        >
                          <option value="Pix">Pix</option>
                          <option value="Dinheiro">Dinheiro</option>
                          <option value="Cartão">Cartão (Maquininha)</option>
                        </select>
                      </div>

                      {/* Campos de Endereço Detalhados */}
                      <div className="grid grid-cols-1 gap-3">
                        <input 
                          value={customerRua} 
                          onChange={(e) => setCustomerRua(e.target.value)} 
                          className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-primary outline-none font-bold text-sm" 
                          placeholder="Rua / Avenida" 
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <input 
                            value={customerNumero} 
                            onChange={(e) => setCustomerNumero(e.target.value)} 
                            className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-primary outline-none font-bold text-sm" 
                            placeholder="Número" 
                          />
                          <input 
                            value={customerBairro} 
                            onChange={(e) => setCustomerBairro(e.target.value)} 
                            className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-primary outline-none font-bold text-sm" 
                            placeholder="Bairro" 
                          />
                        </div>
                        <input 
                          value={customerCity} 
                          onChange={(e) => setCustomerCity(e.target.value)} 
                          className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-primary outline-none font-bold text-sm" 
                          placeholder="Cidade" 
                        />
                      </div>

                      <textarea 
                        value={customerNotes} 
                        onChange={(e) => setCustomerNotes(e.target.value)} 
                        className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-primary outline-none font-bold text-sm resize-none" 
                        rows={2} 
                        placeholder="Observações adicionais..." 
                      />
                      
                      <button 
                        type="button"
                        onClick={() => setShouldRegisterClient(!shouldRegisterClient)}
                        className="flex items-center gap-3 p-1 group"
                      >
                        <div className={`size-5 rounded-lg border-2 transition-all flex items-center justify-center ${shouldRegisterClient ? 'bg-primary border-primary' : 'border-slate-200 bg-white'}`}>
                          {shouldRegisterClient && <CheckCircle size={14} className="text-white" />}
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${shouldRegisterClient ? 'text-slate-900' : 'text-slate-400'}`}>
                          Salvar meus dados para compras futuras
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-6 shrink-0">
                  <button
                    onClick={placePublicOrder}
                    disabled={isPlacingOrder || publicCart.length === 0}
                    className="w-full h-16 rounded-3xl bg-primary text-white font-black uppercase tracking-widest shadow-xl shadow-primary/30 disabled:opacity-50 active:scale-95 transition-all"
                  >
                    {isPlacingOrder ? 'Enviando Pedido...' : 'Confirmar e Enviar'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isAuthLoading, setIsAuthLoading] = useState(false);

    const handleLogin = async () => {
      if (!email.trim() || !password.trim()) {
        alert('Informe e-mail e senha.');
        return;
      }

      setIsAuthLoading(true);
      try {
        const supabase = getSupabase();
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });
        if (error) throw error;
      } catch (error: any) {
        console.error('Login error:', error);
        if (error.message === 'Failed to fetch') {
          alert('Erro de conexão: Não foi possível alcançar o servidor do Supabase. Verifique sua conexão ou se a URL no .env está correta.');
        } else {
          alert(error.message || 'Erro ao entrar.');
        }
      } finally {
        setIsAuthLoading(false);
      }
    };

    return (
      <div className="min-h-screen flex flex-col justify-center px-6 py-12 bg-white relative z-[60] pointer-events-auto">
      <header className="mb-10 text-left">
        <div className="mb-6 inline-flex items-center justify-center w-12 h-12 bg-primary rounded-twelve text-white">
          <ShoppingCart size={24} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Entrar</h1>
        <p className="text-slate-500 text-base leading-relaxed">
          Acesse sua conta para gerenciar seus produtos e pedidos.
        </p>
      </header>
      <div className="space-y-5">
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700 ml-1">E-mail</label>
          <input 
            type="email" 
            placeholder="seu@email.com"
            className="w-full h-14 px-4 bg-white border border-slate-200 rounded-twelve focus:ring-2 focus:ring-primary outline-none transition-all shadow-sm relative z-10 pointer-events-auto cursor-text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700 ml-1">Senha</label>
          <div className="relative">
            <input 
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className="w-full h-14 px-4 bg-white border border-slate-200 rounded-twelve focus:ring-2 focus:ring-primary outline-none transition-all shadow-sm relative z-10 pointer-events-auto cursor-text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(prev => !prev)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>
        <div className="text-right">
          <button onClick={() => navigate('recover-password')} className="text-sm font-medium text-primary hover:text-blue-700">
            Esqueci minha senha
          </button>
        </div>
        <div className="pt-4">
          <button 
            onClick={handleLogin}
            disabled={isAuthLoading}
            className="w-full h-14 bg-primary text-white font-bold text-lg rounded-twelve shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isAuthLoading ? 'Entrando...' : 'Entrar'}
          </button>
        </div>
      </div>
      <footer className="mt-12 text-center">
        <p className="text-slate-500 font-medium">
          Não tem uma conta? 
          <button onClick={() => navigate('register')} className="text-primary font-bold hover:underline ml-1">Criar conta</button>
        </p>
      </footer>
      </div>
    );
  };

  const RegisterPage = () => {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isAuthLoading, setIsAuthLoading] = useState(false);

    const handleRegister = async () => {
      if (!fullName.trim() || !email.trim() || !password.trim()) {
        alert('Preencha nome, e-mail e senha.');
        return;
      }
      if (password.length < 6) {
        alert('A senha deve ter pelo menos 6 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        alert('As senhas não conferem.');
        return;
      }

      setIsAuthLoading(true);
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName.trim() } }
        });
        if (error) throw error;

        if (!data.session) {
          alert('Conta criada! Verifique seu e-mail para confirmar o cadastro.');
          navigate('verify-email');
          return;
        }
      } catch (error: any) {
        alert(error.message || 'Erro ao criar conta.');
      } finally {
        setIsAuthLoading(false);
      }
    };

    return (
      <div className="min-h-screen bg-background-light relative z-[60] pointer-events-auto">
      <div className="flex items-center p-4 pb-2 justify-between">
        <button onClick={() => navigate('login')} className="size-12 flex items-center justify-center hover:bg-slate-200/50 rounded-full">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-lg font-bold flex-1 text-center pr-12">Criar conta</h2>
      </div>
      <div className="px-4 pt-6 pb-2">
        <h3 className="text-3xl font-bold">Criar conta</h3>
        <p className="text-slate-600 mt-2">Preencha os dados abaixo para começar a vender.</p>
      </div>
      <div className="flex flex-col gap-5 px-4 py-6">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold px-1">Nome completo</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white h-14 px-4 outline-none focus:ring-2 focus:ring-primary/20 relative z-10 pointer-events-auto cursor-text"
            placeholder="Seu nome completo"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold px-1">E-mail</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white h-14 px-4 outline-none focus:ring-2 focus:ring-primary/20 relative z-10 pointer-events-auto cursor-text"
            placeholder="exemplo@empresa.com.br"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold px-1">Senha</label>
          <div className="relative">
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white h-14 px-4 outline-none focus:ring-2 focus:ring-primary/20 relative z-10 pointer-events-auto cursor-text"
              type={showPassword ? 'text' : 'password'}
              placeholder="Mínimo 6 caracteres"
            />
            <button
              type="button"
              onClick={() => setShowPassword(prev => !prev)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold px-1">Confirmar senha</label>
          <input
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white h-14 px-4 outline-none focus:ring-2 focus:ring-primary/20 relative z-10 pointer-events-auto cursor-text"
            type={showPassword ? 'text' : 'password'}
            placeholder="Repita sua senha"
          />
        </div>
        <div className="pt-4">
          <button 
            onClick={handleRegister}
            disabled={isAuthLoading}
            className="w-full bg-primary text-white font-bold h-14 rounded-xl shadow-lg shadow-primary/20 active:scale-[0.98] disabled:opacity-50"
          >
            {isAuthLoading ? 'Criando...' : 'Criar conta'}
          </button>
        </div>
        <div className="pt-6 pb-12 flex flex-col items-center gap-4">
          <p className="text-slate-600 text-sm">
            Já tem uma conta? 
            <button onClick={() => navigate('login')} className="text-primary font-bold hover:underline ml-1">Entrar</button>
          </p>
        </div>
      </div>
      </div>
    );
  };

  const RecoverPasswordPage = () => (
    <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-xl border border-primary/5">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-6 bg-primary rounded-twelve text-white">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">Recuperar senha</h1>
          <p className="text-slate-600 text-sm leading-relaxed px-4">
            Informe seu e-mail para receber as instruções de recuperação.
          </p>
        </div>
        <div className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider ml-1">E-mail</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail size={18} />
              </div>
              <input className="block w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20" placeholder="exemplo@empresa.com.br" />
            </div>
          </div>
          <button 
            onClick={() => navigate('login')}
            className="w-full h-14 bg-primary text-white font-bold text-lg rounded-twelve shadow-lg shadow-blue-500/30 active:scale-[0.98]"
          >
            Enviar link
          </button>
        </div>
        <div className="mt-8 pt-8 border-t border-slate-100 text-center">
          <button onClick={() => navigate('login')} className="inline-flex items-center text-primary font-medium hover:underline text-sm group">
            <ArrowLeft size={16} className="mr-1.5 transition-transform group-hover:-translate-x-1" />
            Voltar para o login
          </button>
        </div>
      </div>
    </div>
  );

  const VerifyEmailPage = () => (
    <div className="min-h-screen bg-background-light flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md flex flex-col items-center text-center">
        <div className="mb-8 p-6 bg-primary/10 rounded-full text-primary">
          <Mail size={64} />
        </div>
        <h2 className="text-slate-900 text-3xl font-bold leading-tight mb-4 font-display">
          Verifique seu e-mail
        </h2>
        <p className="text-slate-600 text-base font-normal leading-relaxed mb-10 px-4">
          Enviamos um link de confirmação para o seu e-mail. Por favor, clique no link para ativar sua conta de representante.
        </p>
        <div className="w-full flex flex-col gap-4">
          <button className="flex items-center justify-center gap-2 w-full bg-primary text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-primary/20">
            <Smartphone size={20} />
            <span>Abrir aplicativo de e-mail</span>
          </button>
          <button className="flex items-center justify-center gap-2 w-full bg-white border border-slate-200 text-slate-700 font-semibold py-4 px-6 rounded-xl">
            <AlertCircle size={20} className="text-primary" />
            <span>Reenviar e-mail</span>
          </button>
        </div>
        <div className="mt-12">
          <button onClick={() => navigate('login')} className="flex items-center gap-1 text-primary font-semibold text-sm hover:underline">
            <ArrowLeft size={16} />
            Voltar para o login
          </button>
        </div>
      </div>
    </div>
  );

  const DashboardPage = () => {
    const [currentTime, setCurrentTime] = useState(new Date());
    useEffect(() => {
      const timer = setInterval(() => setCurrentTime(new Date()), 1000);
      return () => clearInterval(timer);
    }, []);

    const today = new Date().toLocaleDateString('pt-BR');
    const todayOrders = orders.filter(o => o.date === today);
    const todayTotal = todayOrders.reduce((acc, o) => acc + o.total, 0);
    const monthTotal = orders.reduce((acc, o) => acc + o.total, 0);
    const averageTicket = orders.length > 0 ? monthTotal / orders.length : 0;
    const lowStockProducts = products.filter(p => p.stock <= 5);

    return (
      <div className="min-h-screen bg-slate-50/50 pb-24">
        <header className="flex items-center justify-between p-6 bg-white border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary overflow-hidden">
                {userProfile.avatar_url ? (
                  <img src={userProfile.avatar_url} className="w-full h-full object-cover" alt="" />
                ) : (
                  <User size={28} />
                )}
              </div>
              <span className="absolute -bottom-1 -right-1 size-4 bg-green-500 border-2 border-white rounded-full"></span>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Bem-vindo de volta,</p>
              <h2 className="text-xl font-black text-slate-900 leading-tight">{userProfile.full_name || 'Representante'}</h2>
            </div>
          </div>
          <div className="flex gap-2 relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className={`relative p-3 rounded-2xl transition-all ${showNotifications ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
            >
              <Bell size={22} />
              {notifications.some(n => !n.read) && (
                <span className="absolute top-3 right-3 size-2 bg-red-500 rounded-full ring-2 ring-white animate-pulse"></span>
              )}
            </button>

            {/* Painel de Notificações */}
            <AnimatePresence>
              {showNotifications && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 top-16 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 z-[100] overflow-hidden"
                >
                  <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Notificações</h3>
                    <button 
                      onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                      className="text-[10px] font-bold text-primary uppercase hover:underline"
                    >
                      Limpar tudo
                    </button>
                  </div>
                  <div className="max-h-96 overflow-y-auto p-2 space-y-2">
                    {notifications.length === 0 ? (
                      <div className="py-12 text-center">
                        <Bell size={32} className="mx-auto text-slate-200 mb-2" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Nenhuma notificação</p>
                      </div>
                    ) : (
                      notifications.map(notification => (
                        <div 
                          key={notification.id}
                          className={`p-3 rounded-2xl transition-all cursor-pointer ${notification.read ? 'bg-white' : 'bg-primary/5 border border-primary/10'}`}
                          onClick={() => {
                            if (notification.orderId) {
                              const order = orders.find(o => o.id === notification.orderId);
                              if (order) {
                                setSelectedOrder(order);
                                navigate('orders');
                              }
                            }
                            setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
                            setShowNotifications(false);
                          }}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="text-xs font-black text-slate-900 leading-tight">{notification.title}</h4>
                            <span className="text-[9px] font-bold text-slate-400">{notification.date}</span>
                          </div>
                          <p className="text-[10px] text-slate-600 leading-relaxed mb-2">{notification.message}</p>
                          
                          {notification.isNewClient && (
                            <div className="mb-2 px-2 py-1 bg-green-50 border border-green-100 rounded-lg flex items-center gap-1.5">
                              <UserPlus size={10} className="text-green-600" />
                              <span className="text-[8px] font-black text-green-700 uppercase tracking-widest">Novo Cliente Cadastrado!</span>
                            </div>
                          )}
                          {notification.items && notification.items.length > 0 && (
                            <div className="bg-slate-50 p-2 rounded-xl space-y-1">
                              {notification.items.map((item, i) => (
                                <div key={i} className="flex justify-between items-center text-[9px] font-bold">
                                  <span className="text-slate-500 truncate max-w-[120px]">{item.quantity}x {item.name}</span>
                                  <span className="text-slate-900 shrink-0">R$ {item.price.toLocaleString('pt-BR')}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        {/* KPIs Principais */}
        <section className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2 p-6 rounded-[32px] bg-slate-900 text-white relative overflow-hidden shadow-xl shadow-slate-200">
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Faturamento Mensal</p>
                  <h3 className="text-4xl font-black mt-1">R$ {monthTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                </div>
                <div className="size-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                  <TrendingUp size={24} className="text-green-400" />
                </div>
              </div>
              
              <div className="flex items-center gap-4 mt-6 py-3 px-4 bg-white/5 rounded-2xl backdrop-blur-sm border border-white/10">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-primary" />
                  <span className="text-[11px] font-black uppercase tracking-widest opacity-80">
                    {currentTime.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <div className="w-px h-4 bg-white/10" />
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-primary" />
                  <span className="text-[11px] font-black uppercase tracking-widest">
                    {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
            <div className="absolute -right-10 -bottom-10 size-48 bg-primary/20 rounded-full blur-3xl"></div>
          </div>

          <div className="p-5 rounded-[28px] bg-white border border-slate-100 shadow-sm flex flex-col justify-between h-32">
            <div className="size-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShoppingCart size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hoje</p>
              <p className="text-lg font-black text-slate-900">R$ {todayTotal.toLocaleString('pt-BR')}</p>
            </div>
          </div>

          <div className="p-5 rounded-[28px] bg-white border border-slate-100 shadow-sm flex flex-col justify-between h-32">
            <div className="size-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Target size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ticket Médio</p>
              <p className="text-lg font-black text-slate-900">R$ {averageTicket.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
            </div>
          </div>
        </section>

        {/* Alertas de Estoque Crítico */}
        {lowStockProducts.length > 0 && (
          <section className="px-6 mb-6">
            <div className="p-4 rounded-3xl bg-red-50 border border-red-100 flex items-center gap-4">
              <div className="size-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertCircle size={24} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-black text-red-900 uppercase tracking-tight">Estoque Crítico!</p>
                <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest">
                  {lowStockProducts.length} produtos com poucas unidades.
                </p>
              </div>
              <button 
                onClick={() => navigate('products')}
                className="px-4 py-2 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
              >
                Ver
              </button>
            </div>
          </section>
        )}

        {/* Ações Rápidas */}
        <section className="px-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Atalhos Rápidos</h3>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              { id: 'order-form', label: 'Vender', icon: PlusCircle, color: 'bg-primary text-white shadow-primary/20' },
              { id: 'client-form', label: 'Cliente', icon: UserPlus, color: 'bg-white text-slate-600 border-slate-100 shadow-sm' },
              { id: 'products', label: 'Catálogo', icon: Package2, color: 'bg-white text-slate-600 border-slate-100 shadow-sm' },
              { id: 'finance', label: 'Caixa', icon: DollarSign, color: 'bg-white text-slate-600 border-slate-100 shadow-sm' },
            ].map(action => (
              <button 
                key={action.id}
                onClick={() => navigate(action.id as Page)}
                className="flex flex-col items-center gap-2 group"
              >
                <div className={`size-14 rounded-[20px] flex items-center justify-center transition-all group-active:scale-90 shadow-lg ${action.color}`}>
                  <action.icon size={24} />
                </div>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{action.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Últimos Pedidos */}
        <section className="px-6 pb-12">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Últimos Pedidos</h3>
            <button onClick={() => navigate('orders')} className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1">
              Ver Tudo <ChevronRight size={12} />
            </button>
          </div>
          <div className="space-y-3">
            {orders.slice(0, 5).map(order => (
              <div 
                key={order.id} 
                onClick={() => setSelectedOrder(order)}
                className="p-4 rounded-3xl bg-white border border-slate-100 shadow-sm hover:border-primary/20 transition-all active:scale-[0.98]"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-3 items-center">
                    <div className={`size-10 rounded-xl flex items-center justify-center ${
                      order.status === 'delivered' ? 'bg-green-100 text-green-600' : 
                      order.status === 'pending' ? 'bg-amber-100 text-amber-600' : 
                      'bg-blue-100 text-blue-600'
                    }`}>
                      {order.status === 'delivered' ? <CheckCircle size={20} /> : 
                       order.status === 'pending' ? <Clock size={20} /> : 
                       <Package size={20} />}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 leading-tight text-sm truncate max-w-[120px]">{order.clientName}</h4>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{order.date}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                    order.paymentStatus === 'paid' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    {order.paymentStatus === 'paid' ? 'Pago' : 'Pendente'}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                  <span className="text-sm font-black text-slate-900">R$ {order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <span>{order.items.length} itens</span>
                    <ChevronRight size={14} className="text-slate-300" />
                  </div>
                </div>
              </div>
            ))}
            {orders.length === 0 && (
              <div className="p-12 text-center bg-white rounded-[32px] border border-dashed border-slate-200">
                <ShoppingCart size={40} className="mx-auto text-slate-200 mb-3" />
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Nenhum pedido realizado</p>
              </div>
            )}
          </div>
        </section>
        <BottomNav />
      </div>
    );
  };

  const ProductsPage = () => {
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('Todas');
    const [historyData, setHistoryData] = useState<StockHistory[]>([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);

    const categoriesList = useMemo(() => ['Todas', ...Array.from(new Set(products.map(p => p.category)))].sort(), [products]);

    const filtered = useMemo(() => {
      return products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = filterCategory === 'Todas' || p.category === filterCategory;
        return matchesSearch && matchesCategory;
      });
    }, [products, search, filterCategory]);

    const fetchHistory = async (product: Product) => {
      setIsHistoryLoading(true);
      setViewingHistory(product);
      try {
        const data = await supabaseService.getProductHistory(product.id);
        setHistoryData(data);
      } catch (e) {
        alert('Erro ao carregar histórico.');
      } finally {
        setIsHistoryLoading(false);
      }
    };

    const handleDelete = async (id: string) => {
      if (!confirm('Tem certeza que deseja excluir este produto?')) return;
      try {
        await supabaseService.deleteProduct(id);
        setProducts(prev => prev.filter(p => p.id !== id));
      } catch (error) {
        alert('Erro ao excluir produto.');
      }
    };

    return (
      <div className="min-h-screen bg-background-light pb-24">
        <Header 
          title="Produtos" 
          rightElement={
            <button onClick={() => { setProductToEdit(null); navigate('product-form'); }} className="p-2 bg-primary text-white rounded-full">
              <Plus size={24} />
            </button>
          }
        />
        
        <section className="p-4 space-y-4">
          <div className="relative w-full">
            <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none font-bold" 
              placeholder="Buscar produtos..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
            {categoriesList.map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all whitespace-nowrap border ${
                  filterCategory === cat ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white text-slate-500 border-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        <main className="px-4 space-y-3">
          {filtered.map(product => (
            <div key={product.id} className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex gap-4">
              <div className="w-20 h-20 bg-slate-100 rounded-xl overflow-hidden shrink-0">
                <img src={product.image || 'https://picsum.photos/seed/prod/200/200'} alt={product.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h3 className="font-black text-sm text-slate-900 truncate">{product.name}</h3>
                  <div className="flex gap-2">
                    <button onClick={() => { setProductToEdit(product); navigate('product-form'); }} className="text-slate-300 hover:text-primary transition-colors">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(product.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{product.category}</p>
                <div className="mt-2 flex justify-between items-end">
                  <span className="text-primary font-black text-base">R$ {product.sale_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => fetchHistory(product)}
                      className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                      title="Histórico"
                    >
                      <Clock size={14} />
                    </button>
                    <button 
                      onClick={() => setReplenishingProduct(product)}
                      className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 flex items-center gap-1 text-[10px] font-black uppercase transition-colors"
                    >
                      <PlusCircle size={14} /> Repor
                    </button>
                  </div>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${product.stock <= 5 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                    Estoque: {product.stock} {product.unidade_medida}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </main>

        {/* MODAL DE REPOSIÇÃO */}
        <AnimatePresence>
          {replenishingProduct && (
            <div className="fixed inset-0 z-[100] flex items-end justify-center">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setReplenishingProduct(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-md bg-white rounded-t-[32px] p-6 shadow-2xl overflow-hidden">
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" />
                <h3 className="font-black text-lg mb-1">Reposição de Estoque</h3>
                <p className="text-xs font-bold text-slate-400 uppercase mb-6">{replenishingProduct.name}</p>
                
                <form className="space-y-4" onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const qty = parseInt((form.elements.namedItem('qty') as HTMLInputElement).value);
                  const cost = parseFloat((form.elements.namedItem('cost') as HTMLInputElement).value);
                  const notes = (form.elements.namedItem('notes') as HTMLTextAreaElement).value;
                  
                  try {
                    await supabaseService.replenishStock(replenishingProduct.id, qty, cost, notes);
                    await fetchData();
                    setReplenishingProduct(null);
                    alert('Estoque atualizado com sucesso!');
                  } catch (e) { alert('Erro ao atualizar estoque.'); }
                }}>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Qtd para Adicionar</label>
                      <input name="qty" type="number" required className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 font-black" placeholder="Ex: 50" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Custo Unitário (R$)</label>
                      <input name="cost" type="number" step="0.01" defaultValue={replenishingProduct.purchase_price} className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 font-black" placeholder="0,00" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Observações</label>
                    <textarea name="notes" className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 font-bold text-sm resize-none" rows={2} placeholder="Ex: Fornecedor X - Nota 123" />
                  </div>
                  <button type="submit" className="w-full h-16 bg-primary text-white rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all">
                    Confirmar Reposição
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL DE HISTÓRICO */}
        <AnimatePresence>
          {viewingHistory && (
            <div className="fixed inset-0 z-[100] flex items-end justify-center">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewingHistory(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-md bg-white rounded-t-[32px] p-6 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 shrink-0" />
                <h3 className="font-black text-lg mb-1">Histórico do Produto</h3>
                <p className="text-xs font-bold text-slate-400 uppercase mb-6">{viewingHistory.name}</p>

                <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pb-8">
                  {isHistoryLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <div className="animate-spin size-8 border-4 border-primary border-t-transparent rounded-full" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carregando...</p>
                    </div>
                  ) : historyData.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-100">
                      <p className="text-[10px] font-black text-slate-300 uppercase">Nenhuma movimentação encontrada</p>
                    </div>
                  ) : (
                    historyData.map(item => (
                      <div key={item.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`size-10 rounded-xl flex items-center justify-center ${item.change_type === 'purchase' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                            {item.change_type === 'purchase' ? <PlusCircle size={20} /> : <ShoppingCart size={20} />}
                          </div>
                          <div>
                            <p className={`text-[10px] font-black uppercase ${item.change_type === 'purchase' ? 'text-green-600' : 'text-orange-500'}`}>
                              {item.change_type === 'purchase' ? 'Entrada (Reposição)' : item.change_type === 'sale' ? 'Saída (Venda)' : 'Ajuste'}
                            </p>
                            <p className="text-xs font-black text-slate-900">{new Date(item.created_at).toLocaleDateString('pt-BR')} • {new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                            {item.notes && <p className="text-[10px] text-slate-400 font-bold italic mt-0.5 line-clamp-1">"{item.notes}"</p>}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-black text-lg ${item.change_type === 'purchase' ? 'text-green-600' : 'text-orange-500'}`}>
                            {item.change_type === 'purchase' ? '+' : '-'}{item.quantity}
                          </p>
                          {item.cost_at_time > 0 && <p className="text-[10px] font-black text-slate-400">R$ {item.cost_at_time.toFixed(2)}/un</p>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <BottomNav />
      </div>
    );
  };

  const ProductFormPage = () => {
    const [formData, setFormData] = useState({
      name: '',
      category: '',
      purchase_price: '',
      sale_price: '',
      stock: '',
      description: '',
      available: true,
      image: 'https://picsum.photos/seed/product/400/400',
      unidade_medida: 'Unidade',
      quantidade_unidade: '1',
      qtd_unidades_estoque: '', // Nova: quantidade de fardos/caixas
      controla_estoque: true,
      limite_por_pedido: ''
    });
    const [newCategory, setNewCategory] = useState('');
    const [newUnidade, setNewUnidade] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [variations, setVariations] = useState<Omit<ProductVariation, 'id' | 'product_id'>[]>([]);
    const [newVarName, setNewVarName] = useState('');
    const [newVarValue, setNewVarValue] = useState('');
    const [newVarPrice, setNewVarPrice] = useState('');
    const [newVarStock, setNewVarStock] = useState('');
    const [newVarSKU, setNewVarSKU] = useState('');

    const unidadesPadrao = ['Unidade', 'Caixa', 'Pacote', 'Litro', 'Kg'];

    // Cálculos Inteligentes
    const precoVendaNum = parseFloat(formData.sale_price) || 0;
    const precoCompraNum = parseFloat(formData.purchase_price) || 0;
    const qtdUnidadeNum = parseFloat(formData.quantidade_unidade) || 1;

    const precoUnitario = precoVendaNum / qtdUnidadeNum;
    const custoUnitario = precoCompraNum / qtdUnidadeNum;
    const margemValor = precoVendaNum - precoCompraNum;
    const margemPorcentagem = precoCompraNum > 0 ? (margemValor / precoCompraNum) * 100 : 0;

    // Atualização automática de estoque ao mudar quantidades por unidade
    useEffect(() => {
      const qtdUnid = parseInt(formData.qtd_unidades_estoque) || 0;
      const itensPorUnid = parseInt(formData.quantidade_unidade) || 1;
      if (qtdUnid > 0) {
        setFormData(prev => ({ ...prev, stock: String(qtdUnid * itensPorUnid) }));
      }
    }, [formData.qtd_unidades_estoque, formData.quantidade_unidade]);

    // Formatação de Estoque Inteligente
    const formatStockDisplay = (totalQty: number) => {
      if (qtdUnidadeNum <= 1) return `${totalQty} ${formData.unidade_medida}`;
      const unidadesInteiras = Math.floor(totalQty / qtdUnidadeNum);
      const sobraUnidades = totalQty % qtdUnidadeNum;
      
      if (unidadesInteiras > 0 && sobraUnidades > 0) {
        return `${unidadesInteiras} ${formData.unidade_medida} e ${sobraUnidades} un`;
      } else if (unidadesInteiras > 0) {
        return `${unidadesInteiras} ${formData.unidade_medida}`;
      } else {
        return `${sobraUnidades} un`;
      }
    };

    useEffect(() => {
      if (productToEdit) {
        setFormData({
          name: productToEdit.name,
          category: productToEdit.category,
          purchase_price: String(productToEdit.purchase_price),
          sale_price: String(productToEdit.sale_price),
          stock: String(productToEdit.stock),
          description: productToEdit.description,
          available: productToEdit.available,
          image: productToEdit.image,
          unidade_medida: productToEdit.unidade_medida,
          quantidade_unidade: String(productToEdit.quantidade_unidade),
          qtd_unidades_estoque: String(Math.floor(productToEdit.stock / (productToEdit.quantidade_unidade || 1))),
          controla_estoque: productToEdit.controla_estoque,
          limite_por_pedido: productToEdit.limite_por_pedido ? String(productToEdit.limite_por_pedido) : ''
        });
        setVariations(productToEdit.variations || []);
      }
    }, [productToEdit]);

    const addVariation = () => {
      if (!newVarName || !newVarValue) return;
      setVariations([...variations, {
        name: newVarName,
        value: newVarValue,
        additional_price: parseFloat(newVarPrice) || 0,
        stock: parseInt(newVarStock) || 0,
        sku: newVarSKU
      }]);
      setNewVarValue('');
      setNewVarPrice('');
      setNewVarStock('');
      setNewVarSKU('');
    };

    const removeVariation = (index: number) => {
      setVariations(variations.filter((_, i) => i !== index));
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsUploading(true);
      try {
        const url = await supabaseService.uploadProductImage(file);
        setFormData({ ...formData, image: url });
      } catch (error: any) {
        console.error(error);
        if (error.message?.includes('Bucket not found')) {
           alert('ERRO: O balde "imagens" não foi encontrado no seu Supabase. Por favor, verifique se o nome está correto no menu Storage.');
         } else {
          alert('Erro ao subir imagem: ' + error.message);
        }
      } finally {
        setIsUploading(false);
      }
    };

    const handleSave = async () => {
      if (!formData.name || !formData.sale_price || (!formData.category && !newCategory)) {
        alert('Preencha os campos obrigatórios (Nome, Preço de Venda e Categoria).');
        return;
      }
      setIsSaving(true);
      try {
        let categoryName = formData.category;
        if (newCategory) {
          const cat = await supabaseService.addCategory(newCategory);
          setCategories(prev => [...prev, cat]);
          categoryName = cat.name;
        }

        const productData = {
          name: formData.name,
          category: categoryName,
          purchase_price: parseFloat(formData.purchase_price) || 0,
          sale_price: parseFloat(formData.sale_price) || 0,
          price: parseFloat(formData.sale_price) || 0,
          stock: parseInt(formData.stock) || 0,
          description: formData.description,
          available: formData.available,
          unidade_medida: newUnidade || formData.unidade_medida,
          quantidade_unidade: parseInt(formData.quantidade_unidade) || 1,
          controla_estoque: formData.controla_estoque,
          limite_por_pedido: parseInt(formData.limite_por_pedido) || undefined,
          image: formData.image
        };

        if (productToEdit) {
          const updated = await supabaseService.updateProduct(productToEdit.id, productData);
          setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
        } else {
          const newProduct = await supabaseService.addProduct(productData, variations);
          setProducts(prev => [newProduct, ...prev]);
        }
        
        navigate('products');
      } catch (error: any) {
        console.error('Error saving product:', error);
        alert(`Erro ao salvar produto: ${error.message || 'Erro desconhecido'}`);
      } finally {
        setIsSaving(false);
      }
    };

    return (
      <div className="min-h-screen bg-background-light pb-24">
        <Header title={productToEdit ? "Editar Produto" : "Novo Produto"} showBack onBack={() => navigate('products')} />
        <main className="p-4 space-y-6 max-w-md mx-auto">
          
          {/* SEÇÃO 1: DADOS BÁSICOS */}
          <section className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 space-y-5">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Package2 size={16} className="text-primary" /> Dados Básicos
            </h3>

            {/* Foto do Produto */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Foto do Produto</label>
              <div className="relative aspect-video rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 overflow-hidden group">
                {isUploading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : formData.image ? (
                  <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                ) : null}
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                {!formData.image && !isUploading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                    <Camera size={32} />
                    <span className="text-[10px] font-black mt-2 uppercase">Subir Foto</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Nome do Produto</label>
                <input 
                  className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none focus:ring-2 focus:ring-primary/20 font-bold" 
                  placeholder="Ex: Coca-Cola 350ml" 
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Categoria</label>
                <div className="grid grid-cols-2 gap-2">
                  <select 
                    className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:ring-2 focus:ring-primary/20 text-sm font-bold"
                    value={formData.category}
                    onChange={e => {
                      setFormData({ ...formData, category: e.target.value });
                      if (e.target.value) setNewCategory('');
                    }}
                  >
                    <option value="">Selecionar...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                  <input 
                    className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none focus:ring-2 focus:ring-primary/20 text-sm font-bold" 
                    placeholder="Nova..." 
                    value={newCategory}
                    onChange={e => {
                      setNewCategory(e.target.value);
                      if (e.target.value) setFormData({ ...formData, category: '' });
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Descrição</label>
                <textarea 
                  className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-primary/20 resize-none font-medium text-sm" 
                  placeholder="Detalhes adicionais..." 
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
          </section>

          {/* SEÇÃO 2: PREÇO E UNIDADE */}
          <section className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 space-y-5">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Banknote size={16} className="text-primary" /> Preço e Unidade
            </h3>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Unidade</label>
                <select 
                  className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:ring-2 focus:ring-primary/20 text-sm font-bold"
                  value={formData.unidade_medida}
                  onChange={e => setFormData({ ...formData, unidade_medida: e.target.value })}
                >
                  {unidadesPadrao.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Qtd {formData.unidade_medida}s</label>
                <input 
                  type="number"
                  className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none focus:ring-2 focus:ring-primary/20 font-bold" 
                  placeholder="Ex: 10" 
                  value={formData.qtd_unidades_estoque}
                  onChange={e => setFormData({ ...formData, qtd_unidades_estoque: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Itens p/ {formData.unidade_medida}</label>
                <input 
                  type="number"
                  className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none focus:ring-2 focus:ring-primary/20 font-bold" 
                  placeholder="Ex: 12" 
                  value={formData.quantidade_unidade}
                  onChange={e => setFormData({ ...formData, quantidade_unidade: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Custo (R$)</label>
                <input 
                  type="number"
                  className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none focus:ring-2 focus:ring-primary/20 font-bold" 
                  placeholder="0,00" 
                  value={formData.purchase_price}
                  onChange={e => setFormData({ ...formData, purchase_price: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Venda (R$)</label>
                <input 
                  type="number"
                  className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none focus:ring-2 focus:ring-primary/20 font-bold text-primary" 
                  placeholder="0,00" 
                  value={formData.sale_price}
                  onChange={e => setFormData({ ...formData, sale_price: e.target.value })}
                />
              </div>
            </div>

            {/* Feedback Inteligente */}
            <div className="bg-slate-50 rounded-2xl p-4 grid grid-cols-2 gap-y-4 gap-x-4 border border-slate-100">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase">Custo Unitário</p>
                <p className="font-bold text-slate-600">R$ {custoUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase">Venda Unitária</p>
                <p className="font-bold text-primary">R$ {precoUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className="col-span-2 pt-2 border-t border-slate-200/60">
                <p className="text-[10px] font-black text-slate-400 uppercase">Margem de Lucro</p>
                <p className={`text-lg font-black ${margemPorcentagem >= 30 ? 'text-green-600' : 'text-orange-500'}`}>
                  {margemPorcentagem.toFixed(1)}% <span className="text-sm opacity-60 font-bold ml-1">(+ R$ {margemValor.toFixed(2)})</span>
                </p>
              </div>
            </div>
          </section>

          {/* SEÇÃO 3: ESTOQUE E LIMITES */}
          <section className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 space-y-5">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Package size={16} className="text-primary" /> Estoque e Limites
            </h3>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-700">Controlar estoque?</p>
                <p className="text-[10px] text-slate-400 uppercase font-black">Baixa automática nas vendas</p>
              </div>
              <button 
                onClick={() => setFormData({ ...formData, controla_estoque: !formData.controla_estoque })}
                className={`w-12 h-6 rounded-full transition-all relative ${formData.controla_estoque ? 'bg-primary' : 'bg-slate-200'}`}
              >
                <div className={`absolute top-1 size-4 bg-white rounded-full transition-all ${formData.controla_estoque ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            {formData.controla_estoque && (
              <div className="space-y-1">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Estoque Atual (em un)</label>
                  <span className="text-[10px] font-black text-primary uppercase">Equivale a: {formatStockDisplay(parseInt(formData.stock) || 0)}</span>
                </div>
                <input 
                  type="number"
                  className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none focus:ring-2 focus:ring-primary/20 font-bold" 
                  placeholder="0" 
                  value={formData.stock}
                  onChange={e => setFormData({ ...formData, stock: e.target.value })}
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Limite p/ Pedido (Opcional)</label>
              <input 
                type="number"
                className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none focus:ring-2 focus:ring-primary/20 font-bold" 
                placeholder="Ex: 5" 
                value={formData.limite_por_pedido}
                onChange={e => setFormData({ ...formData, limite_por_pedido: e.target.value })}
              />
            </div>
          </section>

          {/* SEÇÃO 4: VARIAÇÕES */}
          <section className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 space-y-5">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <PlusCircle size={16} className="text-primary" /> Variações de Produto
            </h3>
            
            <div className="grid grid-cols-2 gap-2">
              <input 
                className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold" 
                placeholder="Tipo (Ex: Tamanho)" 
                value={newVarName}
                onChange={e => setNewVarName(e.target.value)}
              />
              <input 
                className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold" 
                placeholder="Valor (Ex: Grande)" 
                value={newVarValue}
                onChange={e => setNewVarValue(e.target.value)}
              />
              <input 
                type="number"
                className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold" 
                placeholder="+ Preço (R$)" 
                value={newVarPrice}
                onChange={e => setNewVarPrice(e.target.value)}
              />
              <input 
                type="number"
                className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold" 
                placeholder="Estoque Var." 
                value={newVarStock}
                onChange={e => setNewVarStock(e.target.value)}
              />
              <input 
                className="col-span-2 h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold uppercase" 
                placeholder="SKU / Código (Opcional)" 
                value={newVarSKU}
                onChange={e => setNewVarSKU(e.target.value)}
              />
              <button 
                onClick={addVariation}
                className="col-span-2 h-12 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest"
              >
                Adicionar Variação
              </button>
            </div>

            {variations.length > 0 && (
              <div className="space-y-2 pt-2">
                {variations.map((v, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="flex flex-col">
                      <div className="flex gap-2 items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase">{v.name}:</span>
                        <span className="text-sm font-bold text-slate-900">{v.value}</span>
                      </div>
                      <div className="flex gap-3 mt-1">
                        {v.additional_price > 0 && <span className="text-[10px] font-bold text-green-600">+ R$ {v.additional_price.toFixed(2)}</span>}
                        {v.stock > 0 && <span className="text-[10px] font-bold text-slate-500">{formatStockDisplay(v.stock)}</span>}
                        {v.sku && <span className="text-[10px] font-bold text-slate-400">SKU: {v.sku}</span>}
                      </div>
                    </div>
                    <button onClick={() => removeVariation(i)} className="text-red-400 p-2 hover:bg-red-50 rounded-full transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* DISPONIBILIDADE NO CATÁLOGO */}
          <div className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-3xl shadow-sm">
            <div>
              <p className="font-bold text-slate-900">Exibir no Catálogo?</p>
              <p className="text-[10px] text-slate-400 uppercase font-black">Disponível para clientes</p>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-2xl">
              <button 
                onClick={() => setFormData({ ...formData, available: true })}
                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${formData.available ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400'}`}
              >
                SIM
              </button>
              <button 
                onClick={() => setFormData({ ...formData, available: false })}
                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${!formData.available ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'text-slate-400'}`}
              >
                NÃO
              </button>
            </div>
          </div>

          {/* BOTÕES DE AÇÃO */}
          <div className="pt-4 space-y-3">
            <button 
              onClick={handleSave} 
              disabled={isSaving || isUploading}
              className="w-full h-16 bg-primary text-white rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-3"
            >
              {isSaving ? 'Salvando...' : 'Salvar Produto'}
              {!isSaving && <CheckCircle size={24} />}
            </button>
            <button 
              onClick={() => navigate('products')} 
              className="w-full h-12 text-slate-400 font-bold text-sm uppercase tracking-widest"
            >
              Cancelar
            </button>
          </div>
        </main>
      </div>
    );
  };

  const ClientsPage = () => {
    const filteredClients = useMemo(() => {
      return clients.filter(client => {
        const matchesSearch = client.name.toLowerCase().includes(clientSearch.toLowerCase()) || 
          client.establishment.toLowerCase().includes(clientSearch.toLowerCase()) ||
          client.city.toLowerCase().includes(clientSearch.toLowerCase());
        
        const matchesStatus = clientFilter === 'all' || 
          (clientFilter === 'active' && client.active) || 
          (clientFilter === 'inactive' && !client.active);

        return matchesSearch && matchesStatus;
      });
    }, [clients, clientSearch, clientFilter]);

    const handleDelete = async (id: string) => {
      if (!confirm('Excluir cliente permanentemente?')) return;
      try {
        await supabaseService.deleteClient(id);
        setClients(prev => prev.filter(c => c.id !== id));
      } catch (e) { alert('Erro ao excluir.'); }
    };

    return (
      <div className="min-h-screen bg-background-light pb-24">
        <Header 
          title="Clientes" 
          rightElement={
            <button 
              onClick={() => { setClientToEdit(null); navigate('client-form'); }}
              className="p-2 bg-primary text-white rounded-full shadow-lg shadow-primary/20 active:scale-95 transition-all"
            >
              <UserPlus size={24} />
            </button>
          } 
        />
        
        <header className="bg-white px-4 py-4 flex flex-col gap-4 border-b border-slate-200 sticky top-0 z-30">
          <div className="relative w-full">
            <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              className="block w-full pl-10 pr-3 py-3 border-none bg-slate-100 rounded-xl focus:ring-2 focus:ring-primary text-sm placeholder-slate-500 outline-none" 
              placeholder="Buscar por nome, loja ou cidade..." 
              value={clientSearch}
              onChange={e => setClientSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {[
              { id: 'all', label: 'Todos', count: clients.length },
              { id: 'active', label: 'Ativos', count: clients.filter(c => c.active).length },
              { id: 'inactive', label: 'Inativos', count: clients.filter(c => !c.active).length }
            ].map((f) => (
              <button 
                key={f.id}
                onClick={() => setClientFilter(f.id as any)}
                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${clientFilter === f.id ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-slate-100 text-slate-400'}`}
              >
                {f.label} ({f.count})
              </button>
            ))}
          </div>
        </header>

        <main className="px-4 py-4 space-y-4">
          {filteredClients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 opacity-50">
              <Users size={64} strokeWidth={1} />
              <p className="mt-4 font-bold">Nenhum cliente encontrado</p>
            </div>
          ) : (
            filteredClients.map(client => (
              <div 
                key={client.id} 
                onClick={() => setSelectedClientForDetails(client)}
                className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 active:scale-[0.98] transition-all"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-4">
                    <div className="size-14 rounded-2xl bg-primary/5 flex items-center justify-center text-primary shrink-0 border border-primary/10">
                      {client.establishment.toLowerCase().includes('restaurante') ? <Utensils size={28} /> : 
                       client.establishment.toLowerCase().includes('café') ? <Coffee size={28} /> : 
                       <Store size={28} />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-black text-slate-900 text-lg leading-tight truncate">{client.establishment}</h3>
                        {client.source === 'online' && (
                          <span className="px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase tracking-widest border border-indigo-100 flex items-center gap-1">
                            <Globe size={10} /> Online
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-slate-400 truncate">{client.name}</p>
                      <div className="flex items-center mt-1 text-primary font-bold text-[10px] uppercase tracking-wider">
                        <MapPin size={12} className="mr-1" />
                        {client.city}
                      </div>
                    </div>
                  </div>
                  <div className={`size-3 rounded-full ${client.active ? 'bg-green-500' : 'bg-slate-300'} ring-4 ring-white shadow-sm`}></div>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-4 border-t border-slate-50">
                  <button 
                    onClick={(e) => { e.stopPropagation(); openWhatsApp(client.whatsapp || client.phone); }}
                    className="flex flex-col items-center justify-center gap-1 py-2 rounded-xl hover:bg-green-50 text-green-600 transition-colors"
                  >
                    <MessageSquare size={20} />
                    <span className="text-[8px] font-black uppercase">WhatsApp</span>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); makeCall(client.phone); }}
                    className="flex flex-col items-center justify-center gap-1 py-2 rounded-xl hover:bg-blue-50 text-blue-600 transition-colors"
                  >
                    <Phone size={20} />
                    <span className="text-[8px] font-black uppercase">Ligar</span>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); openMap(client); }}
                    className="flex flex-col items-center justify-center gap-1 py-2 rounded-xl hover:bg-indigo-50 text-indigo-600 transition-colors"
                  >
                    <MapPin size={20} />
                    <span className="text-[8px] font-black uppercase">Mapa</span>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setClientToEdit(client); navigate('client-form'); }}
                    className="flex flex-col items-center justify-center gap-1 py-2 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors"
                  >
                    <Edit2 size={20} />
                    <span className="text-[8px] font-black uppercase">Editar</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </main>

        {/* Modal de Detalhes do Cliente */}
        <AnimatePresence>
          {selectedClientForDetails && (
            <div className="fixed inset-0 z-[60] flex items-end justify-center">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                onClick={() => setSelectedClientForDetails(null)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ y: "100%" }} 
                animate={{ y: 0 }} 
                exit={{ y: "100%" }}
                className="relative w-full max-w-md bg-white rounded-t-[32px] p-6 shadow-2xl overflow-y-auto no-scrollbar max-h-[90vh]"
              >
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" />
                
                <div className="flex justify-between items-start mb-8">
                  <div className="flex gap-4">
                    <div className="size-16 rounded-3xl bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/20">
                      <Store size={32} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-2xl font-black text-slate-900">{selectedClientForDetails.establishment}</h2>
                        {selectedClientForDetails.source === 'online' && (
                          <span className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest border border-indigo-100 flex items-center gap-1">
                            <Globe size={12} /> Catálogo Online
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{selectedClientForDetails.name}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedClientForDetails(null)} className="p-2 bg-slate-100 rounded-full text-slate-400">
                    <XCircle size={24} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pedidos Realizados</p>
                    <p className="text-xl font-black text-slate-900">
                      {orders.filter(o => o.clientId === selectedClientForDetails.id).length}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Comprado</p>
                    <p className="text-xl font-black text-primary">
                      R$ {orders
                        .filter(o => o.clientId === selectedClientForDetails.id)
                        .reduce((acc, o) => acc + o.total, 0)
                        .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <section>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3 px-1">Histórico Recente</h3>
                    <div className="space-y-2">
                      {orders
                        .filter(o => o.clientId === selectedClientForDetails.id)
                        .slice(0, 3)
                        .map(order => (
                          <div key={order.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{order.date}</p>
                              <p className="text-xs font-bold text-slate-700">Pedido #{order.id.slice(0, 6)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-black text-slate-900">R$ {order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                              <p className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full inline-block ${
                                order.status === 'delivered' ? 'bg-green-100 text-green-600' : 
                                order.status === 'pending' ? 'bg-amber-100 text-amber-600' : 
                                'bg-blue-100 text-blue-600'
                              }`}>
                                {order.status}
                              </p>
                            </div>
                          </div>
                        ))}
                      {orders.filter(o => o.clientId === selectedClientForDetails.id).length === 0 && (
                        <p className="text-center py-4 text-xs font-bold text-slate-400 italic">Nenhum pedido realizado ainda.</p>
                      )}
                    </div>
                  </section>

                  <section>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3 px-1">Informações de Contato</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-2xl shadow-sm">
                        <div className="size-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><Phone size={20}/></div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase">Telefone</p>
                          <p className="font-bold text-slate-800">{selectedClientForDetails.phone}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-2xl shadow-sm">
                        <div className="size-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center"><MessageSquare size={20}/></div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase">WhatsApp</p>
                          <p className="font-bold text-slate-800">{selectedClientForDetails.whatsapp || selectedClientForDetails.phone}</p>
                        </div>
                      </div>
                      <div 
                        onClick={() => openMap(selectedClientForDetails)}
                        className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-2xl shadow-sm cursor-pointer active:scale-95 transition-all"
                      >
                        <div className="size-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center"><MapPin size={20}/></div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-slate-400 uppercase">Endereço de Entrega</p>
                          <p className="font-bold text-slate-800 truncate">
                            {selectedClientForDetails.rua ? (
                              `${selectedClientForDetails.rua}, ${selectedClientForDetails.numero || 'S/N'} - ${selectedClientForDetails.bairro}`
                            ) : (
                              selectedClientForDetails.address
                            )}, {selectedClientForDetails.city}
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>

                  {selectedClientForDetails.observations && (
                    <section>
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3 px-1">Observações</h3>
                      <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                        <p className="text-sm text-amber-900 italic">"{selectedClientForDetails.observations}"</p>
                      </div>
                    </section>
                  )}

                  <div className="pt-4 flex gap-3">
                    <button 
                      onClick={() => {
                        setSelectedClientId(selectedClientForDetails.id);
                        navigate('order-form');
                        setSelectedClientForDetails(null);
                      }}
                      className="flex-1 h-14 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
                    >
                      <ShoppingCart size={20} /> Novo Pedido
                    </button>
                    <button 
                      onClick={() => {
                        setClientToEdit(selectedClientForDetails);
                        navigate('client-form');
                        setSelectedClientForDetails(null);
                      }}
                      className="size-14 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center active:scale-95 transition-all"
                    >
                      <Edit2 size={24} />
                    </button>
                    <button 
                      onClick={() => {
                        handleDelete(selectedClientForDetails.id);
                        setSelectedClientForDetails(null);
                      }}
                      className="size-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center active:scale-95 transition-all"
                    >
                      <Trash2 size={24} />
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <BottomNav />
      </div>
    );
  };

  const ClientFormPage = () => {
    const [formData, setFormData] = useState({
      name: clientToEdit?.name || newClientPlaceholder || '',
      establishment: clientToEdit?.establishment || newClientPlaceholder || '',
      phone: clientToEdit?.phone || '',
      whatsapp: clientToEdit?.whatsapp || '',
      address: clientToEdit?.address || '',
      rua: clientToEdit?.rua || '',
      numero: clientToEdit?.numero || '',
      bairro: clientToEdit?.bairro || '',
      city: clientToEdit?.city || '',
      observations: clientToEdit?.observations || '',
      active: clientToEdit?.active ?? true
    });

    useEffect(() => {
      // Limpar placeholder após carregar no formulário
      if (newClientPlaceholder) setNewClientPlaceholder(null);
    }, []);

    const maskPhone = (value: string) => {
      const clean = value.replace(/\D/g, '');
      if (clean.length <= 10) {
        return clean.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
      }
      return clean.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').slice(0, 15);
    };

    const handleSave = async () => {
      if (!formData.name || !formData.establishment) { 
        alert('Nome e Estabelecimento são obrigatórios.'); 
        return; 
      }
      setIsSaving(true);
      try {
        if (clientToEdit) {
          const updatedClient = await supabaseService.updateClient(clientToEdit.id, formData);
          setClients(prev => prev.map(c => c.id === clientToEdit.id ? updatedClient : c));
          alert('Cliente atualizado com sucesso!');
        } else {
          const newClient = await supabaseService.addClient(formData);
          setClients(prev => [newClient, ...prev]);
          alert('Cliente cadastrado com sucesso!');
        }
        navigate('clients');
      } catch (e) { 
        alert('Erro ao salvar cliente.'); 
      } finally { 
        setIsSaving(false); 
      }
    };

    return (
      <div className="min-h-screen bg-background-light pb-24">
        <Header 
          title={clientToEdit ? 'Editar Cliente' : 'Novo Cliente'} 
          showBack 
          onBack={() => navigate('clients')} 
        />
        <main className="p-4 space-y-6 max-w-md mx-auto">
          <section className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-black text-slate-700 ml-1 uppercase tracking-widest text-[10px]">Estabelecimento *</label>
              <input 
                className="w-full h-14 px-4 rounded-2xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary outline-none transition-all font-bold" 
                placeholder="Ex: Mercadinho do João" 
                value={formData.establishment} 
                onChange={e => setFormData({...formData, establishment: e.target.value})} 
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-black text-slate-700 ml-1 uppercase tracking-widest text-[10px]">Nome do Responsável *</label>
              <input 
                className="w-full h-14 px-4 rounded-2xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary outline-none transition-all font-bold" 
                placeholder="Ex: João da Silva" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
              />
            </div>
          </section>

          <section className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-black text-slate-700 ml-1 uppercase tracking-widest text-[10px]">Telefone</label>
              <input 
                className="w-full h-14 px-4 rounded-2xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary outline-none transition-all font-bold" 
                placeholder="(00) 0000-0000" 
                value={formData.phone} 
                onChange={e => setFormData({...formData, phone: maskPhone(e.target.value)})} 
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-black text-slate-700 ml-1 uppercase tracking-widest text-[10px]">WhatsApp</label>
              <input 
                className="w-full h-14 px-4 rounded-2xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary outline-none transition-all font-bold" 
                placeholder="(00) 00000-0000" 
                value={formData.whatsapp} 
                onChange={e => setFormData({...formData, whatsapp: maskPhone(e.target.value)})} 
              />
            </div>
          </section>

          <section className="space-y-4 p-4 bg-slate-100/50 rounded-[24px]">
            <div className="space-y-1">
              <label className="text-sm font-black text-slate-700 ml-1 uppercase tracking-widest text-[10px]">Rua / Logradouro</label>
              <input 
                className="w-full h-14 px-4 rounded-2xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary outline-none transition-all font-bold" 
                placeholder="Rua, Avenida, etc..." 
                value={formData.rua} 
                onChange={e => setFormData({...formData, rua: e.target.value})} 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-black text-slate-700 ml-1 uppercase tracking-widest text-[10px]">Número</label>
                <input 
                  className="w-full h-14 px-4 rounded-2xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary outline-none transition-all font-bold" 
                  placeholder="Nº" 
                  value={formData.numero} 
                  onChange={e => setFormData({...formData, numero: e.target.value})} 
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-black text-slate-700 ml-1 uppercase tracking-widest text-[10px]">Bairro</label>
                <input 
                  className="w-full h-14 px-4 rounded-2xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary outline-none transition-all font-bold" 
                  placeholder="Bairro" 
                  value={formData.bairro} 
                  onChange={e => setFormData({...formData, bairro: e.target.value})} 
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-black text-slate-700 ml-1 uppercase tracking-widest text-[10px]">Cidade</label>
              <input 
                className="w-full h-14 px-4 rounded-2xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary outline-none transition-all font-bold" 
                placeholder="Ex: São Paulo - SP" 
                value={formData.city} 
                onChange={e => setFormData({...formData, city: e.target.value})} 
              />
            </div>
          </section>

          <section className="space-y-1">
            <label className="text-sm font-black text-slate-700 ml-1 uppercase tracking-widest text-[10px]">Observações</label>
            <textarea 
              className="w-full p-4 rounded-2xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary outline-none transition-all font-medium resize-none" 
              placeholder="Notas sobre entrega, horários, etc..." 
              rows={3}
              value={formData.observations} 
              onChange={e => setFormData({...formData, observations: e.target.value})} 
            />
          </section>

          <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-[24px] shadow-sm">
            <div>
              <p className="font-black text-slate-900">Cliente Ativo</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Permitir novas vendas</p>
            </div>
            <button 
              onClick={() => setFormData({ ...formData, active: !formData.active })}
              className={`w-14 h-8 rounded-full relative transition-all duration-300 ${formData.active ? 'bg-primary' : 'bg-slate-200'}`}
            >
              <div className={`absolute top-1 size-6 bg-white rounded-full shadow-md transition-all duration-300 ${formData.active ? 'right-1' : 'left-1'}`}></div>
            </button>
          </div>

          <div className="pt-4 flex flex-col gap-3">
            <button 
              onClick={handleSave} 
              disabled={isSaving} 
              className="w-full h-16 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {isSaving ? 'Processando...' : (clientToEdit ? 'Atualizar Cliente' : 'Salvar Cliente')}
              <CheckCircle size={24} />
            </button>
            <button 
              onClick={() => navigate('clients')} 
              className="w-full h-12 text-slate-400 font-bold text-sm"
            >
              Cancelar
            </button>
          </div>
        </main>
      </div>
    );
  };

  const OrdersPage = () => {
    const filteredOrders = useMemo(() => {
      return orders.filter(order => {
        const matchesStatus = orderFilter === 'all' || order.status === orderFilter;
        const matchesSearch = (order.clientName?.toLowerCase() || '').includes(orderSearch.toLowerCase()) || 
                             (order.id?.toLowerCase() || '').includes(orderSearch.toLowerCase());
        return matchesStatus && matchesSearch;
      });
    }, [orders, orderFilter, orderSearch]);

    const handleUpdateStatus = async (id: string, status: OrderStatus, extra: any = {}) => {
      try {
        const updated = await supabaseService.updateOrderStatus(id, status, extra);
        setOrders(prev => prev.map(o => o.id === id ? { ...o, ...updated } : o));
        if (selectedOrder?.id === id) {
          setSelectedOrder({ ...selectedOrder, ...updated });
        }
        setConfirmingDelivery(null);
        alert(`Pedido ${status === 'confirmed' ? 'Confirmado' : status === 'delivered' ? 'Entregue' : status === 'cancelled' ? 'Cancelado' : 'Pendente'}`);
      } catch (error: any) {
        console.error('Error updating order status:', error);
        alert(`Erro ao atualizar status: ${error.message || 'Erro desconhecido'}`);
      }
    };

    const handleConfirmPayment = async () => {
      if (!confirmingPayment) return;
      
      const total = Number(confirmingPayment.total);
      const alreadyPaid = Number(confirmingPayment.paid_amount || 0);
      const remaining = total - alreadyPaid;
      
      const amount = isTotalPayment ? remaining : Number(paymentAmount.replace(',', '.'));
      
      if (isNaN(amount) || amount <= 0) {
        alert('Informe um valor válido.');
        return;
      }

      if (amount > remaining + 0.01) {
        alert(`O valor (R$ ${amount.toLocaleString('pt-BR')}) não pode ser maior que o saldo devedor (R$ ${remaining.toLocaleString('pt-BR')}).`);
        return;
      }

      try {
        const updated = await supabaseService.confirmPayment(confirmingPayment.id, amount, isTotalPayment);
        setOrders(prev => prev.map(o => o.id === confirmingPayment.id ? { ...o, ...updated } : o));
        if (selectedOrder?.id === confirmingPayment.id) {
          setSelectedOrder(prev => prev ? { ...prev, ...updated } : null);
        }
        setConfirmingPayment(null);
        setPaymentAmount('');
        alert('Pagamento confirmado com sucesso!');
      } catch (error: any) {
        console.error(error);
        alert(`Erro ao confirmar pagamento: ${error.message || 'Erro desconhecido'}`);
      }
    };

    const shareToWhatsApp = (order: Order) => {
      const itemsText = order.items.map(item => 
        `• ${item.productName || 'Produto'} x${item.quantity} - R$ ${item.price.toLocaleString('pt-BR')}`
      ).join('\n');
      
      const text = `*PEDIDO #${order.id.slice(0, 8)}*\n\n` +
                   `*Cliente:* ${order.clientName}\n` +
                   `*Data:* ${order.date}\n` +
                   `*Total:* R$ ${order.total.toLocaleString('pt-BR')}\n\n` +
                   `*Itens:*\n${itemsText}\n\n` +
                   `*Status:* ${order.status.toUpperCase()}`;
      
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const generateDetailedReceipt = (order: Order) => {
      const itemsHtml = order.items.map(item => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee;">
            <div style="font-weight: bold; font-size: 14px;">${item.productName}</div>
            ${item.variationName ? `<div style="font-size: 10px; color: #666; text-transform: uppercase;">${item.variationName}</div>` : ''}
          </td>
          <td style="text-align: center; padding: 10px 0; border-bottom: 1px solid #eee;">${item.quantity}</td>
          <td style="text-align: right; padding: 10px 0; border-bottom: 1px solid #eee;">R$ ${item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
          <td style="text-align: right; padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold;">R$ ${(item.price * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
        </tr>
      `).join('');

      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      printWindow.document.write(`
        <html>
          <head>
            <title>Comprovante de Pedido #${order.id.slice(0, 8)}</title>
            <style>
              body { font-family: 'Inter', sans-serif; padding: 40px; color: #1a1a1a; max-width: 800px; margin: 0 auto; background: #f8fafc; }
              .receipt-card { background: white; padding: 40px; border-radius: 24px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
              .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; }
              .logo-placeholder { background: #3b82f6; color: white; width: 60px; height: 60px; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 24px; }
              .store-info { text-align: right; }
              .client-card { background: #f8fafc; padding: 20px; border-radius: 16px; margin-bottom: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
              .info-group h4 { margin: 0; font-size: 10px; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; }
              .info-group p { margin: 4px 0 0 0; font-weight: 700; font-size: 14px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th { text-align: left; font-size: 10px; text-transform: uppercase; color: #64748b; padding-bottom: 10px; border-bottom: 2px solid #f1f5f9; }
              .total-section { margin-top: 40px; border-top: 2px solid #f1f5f9; padding-top: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
              .status-badge { display: inline-block; padding: 4px 12px; border-radius: 99px; font-size: 10px; font-weight: 900; text-transform: uppercase; margin-top: 8px; }
              .footer { margin-top: 60px; text-align: center; color: #94a3b8; font-size: 12px; }
              @media print { body { background: white; padding: 0; } .receipt-card { box-shadow: none; border: 1px solid #eee; } .no-print { display: none; } }
            </style>
          </head>
          <body>
            <div class="receipt-card">
              <div class="header">
                <div class="logo-placeholder">${appSettings.store_name.charAt(0)}</div>
                <div class="store-info">
                  <h1 style="margin: 0; font-size: 20px;">${appSettings.store_name}</h1>
                  <p style="margin: 4px 0; font-size: 12px; color: #64748b;">${appSettings.store_phone}</p>
                </div>
              </div>

              <div style="margin-bottom: 30px;">
                <h2 style="margin: 0; font-size: 24px; font-weight: 900;">Pedido #${order.id.slice(0, 8)}</h2>
                <div class="status-badge" style="background: #f1f5f9; color: #475569;">${order.status.toUpperCase()}</div>
              </div>

              <div class="client-card">
                <div class="info-group">
                  <h4>Cliente</h4>
                  <p>${order.clientName}</p>
                </div>
                <div class="info-group">
                  <h4>Entrega Prevista</h4>
                  <p>${order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('pt-BR') : 'A definir'}</p>
                </div>
                <div class="info-group">
                  <h4>Pagamento</h4>
                  <p>${order.paymentMethod || 'Não informado'} (${order.paymentStatus === 'paid' ? 'PAGO' : 'PENDENTE'})</p>
                </div>
                <div class="info-group">
                  <h4>Total do Pedido</h4>
                  <p>R$ ${order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th style="text-align: center;">Qtd</th>
                    <th style="text-align: right;">Unitário</th>
                    <th style="text-align: right;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>

              <div class="total-section">
                <div>
                  ${order.notes ? `
                    <div style="margin-top: 20px;">
                      <h4 style="margin: 0; font-size: 10px; text-transform: uppercase; color: #64748b;">Observações</h4>
                      <p style="margin: 4px 0 0 0; font-size: 13px; font-style: italic; color: #475569;">${order.notes}</p>
                    </div>
                  ` : ''}
                </div>
                <div style="text-align: right;">
                  <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: 700;">VALOR TOTAL</p>
                  <p style="margin: 4px 0 0 0; font-size: 32px; font-weight: 900; color: #3b82f6;">R$ ${order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

              <div class="footer">
                <p>Obrigado pela preferência!</p>
                <p>Documento gerado em ${new Date().toLocaleString('pt-BR')}</p>
              </div>
            </div>
            <script>
              window.onload = function() { window.print(); window.close(); };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    };

    return (
      <div className="min-h-screen bg-background-light pb-24">
        <Header 
          title="Pedidos" 
          rightElement={
            <button className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <Bell size={24} className="text-slate-600" />
            </button>
          }
        />
        
        <header className="bg-white px-4 py-4 flex flex-col gap-4 border-b border-slate-200 sticky top-0 z-30">
          <div className="relative w-full">
            <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              className="block w-full pl-10 pr-3 py-3 border-none bg-slate-100 rounded-xl focus:ring-2 focus:ring-primary text-sm placeholder-slate-500 outline-none" 
              placeholder="Buscar por cliente ou ID..." 
              value={orderSearch}
              onChange={e => setOrderSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'pending', label: 'Pendentes' },
              { id: 'confirmed', label: 'Confirmados' },
              { id: 'delivered', label: 'Entregues' },
              { id: 'cancelled', label: 'Cancelados' }
            ].map((f) => (
              <button 
                key={f.id}
                onClick={() => setOrderFilter(f.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${orderFilter === f.id ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-slate-100 text-slate-500'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </header>

        <main className="px-4 py-4 flex flex-col gap-4">
          {filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 opacity-50">
              <ShoppingCart size={64} strokeWidth={1} />
              <p className="mt-4 font-bold">Nenhum pedido encontrado</p>
            </div>
          ) : (
            filteredOrders.map(order => (
              <div 
                key={order.id} 
                onClick={() => setSelectedOrder(order)}
                className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 active:scale-[0.98] transition-all"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-3 items-center">
                    <div className={`size-10 rounded-xl flex items-center justify-center ${
                      order.status === 'delivered' ? 'bg-green-100 text-green-600' : 
                      order.status === 'pending' ? 'bg-amber-100 text-amber-600' : 
                      order.status === 'confirmed' ? 'bg-blue-100 text-blue-600' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {order.status === 'delivered' ? <CheckCircle size={20} /> : 
                       order.status === 'pending' ? <Clock size={20} /> : 
                       order.status === 'confirmed' ? <Clock size={20} /> :
                       <XCircle size={20} />}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 leading-tight">{order.clientName}</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{order.date} • ID: #{order.id.slice(0, 8)}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                    order.status === 'delivered' ? 'bg-green-100 text-green-700' : 
                    order.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                    order.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {order.status === 'delivered' ? 'Entregue' : 
                     order.status === 'pending' ? 'Pendente' : 
                     order.status === 'confirmed' ? 'Confirmado' :
                     'Cancelado'}
                  </span>
                </div>
                {order.paymentStatus === 'partial' && (
                  <div className="mb-3 px-3 py-2 bg-amber-50 rounded-xl border border-amber-100 flex justify-between items-center">
                    <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Pagamento Parcial</span>
                    <span className="text-[10px] font-black text-amber-700">R$ {order.paid_amount?.toLocaleString('pt-BR')} / R$ {order.total.toLocaleString('pt-BR')}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                  <span className="text-lg font-black text-primary">R$ {order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); shareToWhatsApp(order); }}
                      className="p-2 text-slate-400 hover:text-green-500"
                    >
                      <MessageSquare size={20} />
                    </button>
                    <button className="p-2 text-slate-400">
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </main>

        {/* Modal de Detalhes do Pedido */}
        <AnimatePresence>
          {selectedOrder && (
            <div className="fixed inset-0 z-[60] flex items-end justify-center">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                onClick={() => setSelectedOrder(null)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ y: "100%" }} 
                animate={{ y: 0 }} 
                exit={{ y: "100%" }}
                className="relative w-full max-w-md bg-white rounded-t-[32px] p-6 shadow-2xl overflow-y-auto no-scrollbar max-h-[90vh]"
              >
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" />
                
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">Pedido #{selectedOrder.id.slice(0, 8)}</h2>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{selectedOrder.date}</p>
                  </div>
                  <button onClick={() => setSelectedOrder(null)} className="p-2 bg-slate-100 rounded-full text-slate-400">
                    <XCircle size={24} />
                  </button>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cliente</p>
                      <div className="flex items-center gap-3">
                        <div className="size-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                          <User size={20} />
                        </div>
                        <div>
                          <p className="font-black text-slate-900 leading-tight">{selectedOrder.clientName}</p>
                          <p className="text-xs font-bold text-slate-500">Pagamento: {selectedOrder.paymentMethod || 'Não informado'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Endereço de Entrega no Pedido */}
                  <div className="pt-4 border-t border-slate-200/60">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Local de Entrega</p>
                        <p className="text-xs font-bold text-slate-700 leading-relaxed">
                          {selectedOrder.client?.rua ? (
                            `${selectedOrder.client.rua}, ${selectedOrder.client.numero || 'S/N'}`
                          ) : (
                            selectedOrder.client?.address || selectedOrder.notes || 'Endereço não informado'
                          )}
                          <br />
                          {selectedOrder.client?.bairro && `${selectedOrder.client.bairro}, `}
                          {selectedOrder.client?.city || ''}
                        </p>
                      </div>
                      {selectedOrder.client && (
                        <button 
                          onClick={() => openMap(selectedOrder.client)}
                          className="size-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center active:scale-90 transition-all shadow-sm border border-indigo-100"
                        >
                          <MapPin size={24} />
                        </button>
                      )}
                      {!selectedOrder.client && (selectedOrder.notes || selectedOrder.clientName) && (
                        <button 
                          onClick={() => {
                            const query = encodeURIComponent(`${selectedOrder.notes || ''}, ${selectedOrder.clientName}`);
                            window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
                          }}
                          className="size-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center active:scale-90 transition-all shadow-sm border border-indigo-100"
                        >
                          <MapPin size={24} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Itens do Pedido</h3>
                  {selectedOrder.items?.map((item, i) => (
                    <div key={i} className="flex gap-4 items-center bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                      <div className="size-14 bg-slate-100 rounded-xl overflow-hidden shrink-0">
                        <img src={item.productImage || 'https://picsum.photos/seed/p/100/100'} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-sm text-slate-900">{item.productName}</h4>
                        {item.variationName && (
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.variationName}</p>
                        )}
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Qtd: {item.quantity} x R$ {item.price.toLocaleString('pt-BR')}</p>
                      </div>
                      <p className="font-black text-slate-900">R$ {(item.price * item.quantity).toLocaleString('pt-BR')}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-slate-900 p-6 rounded-3xl text-white space-y-4 mb-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-widest opacity-60">Valor Total</span>
                      <p className="text-3xl font-black">R$ {selectedOrder.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    {selectedOrder.paymentStatus !== 'paid' && (
                      <button 
                        onClick={() => {
                          setConfirmingPayment(selectedOrder);
                          setIsTotalPayment(true);
                        }}
                        className="bg-primary hover:bg-primary-dark text-white px-4 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-all"
                      >
                        <DollarSign size={18} /> Confirmar Pagamento
                      </button>
                    )}
                  </div>

                  {(selectedOrder.paid_amount || 0) > 0 && (
                    <div className="pt-4 border-t border-white/10 space-y-2">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="opacity-60 uppercase">Já Pago</span>
                        <span className="text-green-400">R$ {selectedOrder.paid_amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                      {selectedOrder.paymentStatus === 'partial' && (
                        <div className="flex justify-between text-xs font-bold">
                          <span className="opacity-60 uppercase">Saldo Restante</span>
                          <span className="text-amber-400">R$ {(selectedOrder.total - (selectedOrder.paid_amount || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/10">
                    <button 
                      onClick={() => shareToWhatsApp(selectedOrder)}
                      className="flex items-center justify-center gap-2 h-12 bg-green-500 text-white rounded-xl font-bold text-sm"
                    >
                      <MessageSquare size={18} /> WhatsApp
                    </button>
                    <button 
                      onClick={() => generateDetailedReceipt(selectedOrder)}
                      className="flex items-center justify-center gap-2 h-12 bg-white/10 text-white rounded-xl font-bold text-sm hover:bg-white/20 transition-all"
                    >
                      <FileText size={18} /> Gerar Comprovante
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Ações do Pedido</p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setConfirmingDelivery(selectedOrder)}
                      disabled={selectedOrder.status === 'confirmed'}
                      className="h-14 rounded-2xl bg-blue-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <CheckCircle2 size={18} /> Aceitar
                    </button>
                    <button 
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'cancelled')}
                      disabled={selectedOrder.status === 'cancelled'}
                      className="h-14 rounded-2xl bg-red-50 text-red-500 font-black text-xs uppercase tracking-widest border border-red-100 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <XCircle size={18} /> Cancelar
                    </button>
                  </div>

                  <button 
                    onClick={() => {
                      setOrderToEdit(selectedOrder);
                      navigate('order-form');
                      setSelectedOrder(null);
                    }}
                    className="w-full h-14 rounded-2xl bg-slate-100 text-slate-700 font-black text-xs uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Edit2 size={18} /> Editar Pedido
                  </button>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button 
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'delivered')}
                      className={`h-11 rounded-xl font-bold text-[10px] uppercase border transition-all ${selectedOrder.status === 'delivered' ? 'bg-green-100 border-green-200 text-green-700' : 'bg-white border-slate-200 text-slate-500'}`}
                    >
                      Marcar Entregue
                    </button>
                    <button 
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'pending')}
                      className={`h-11 rounded-xl font-bold text-[10px] uppercase border transition-all ${selectedOrder.status === 'pending' ? 'bg-amber-100 border-amber-200 text-amber-700' : 'bg-white border-slate-200 text-slate-500'}`}
                    >
                      Voltar Pendente
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL DE CONFIRMAÇÃO DE ENTREGA E PAGAMENTO INICIAL */}
        <AnimatePresence>
          {confirmingDelivery && (
            <div className="fixed inset-0 z-[100] flex items-end justify-center">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmingDelivery(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-md bg-white rounded-t-[32px] p-6 shadow-2xl">
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" />
                <h3 className="font-black text-lg mb-1 text-slate-900">Confirmar Pedido</h3>
                <p className="text-xs font-bold text-slate-400 uppercase mb-6">Defina os detalhes para o cliente</p>
                
                <form className="space-y-6" onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const date = (form.elements.namedItem('delivery_date') as HTMLInputElement).value;
                  const status = (form.elements.namedItem('payment_status') as HTMLSelectElement).value;
                  const paidAmount = status === 'partial' ? Number((form.elements.namedItem('initial_paid') as HTMLInputElement).value) : (status === 'paid' ? confirmingDelivery.total : 0);
                  
                  handleUpdateStatus(confirmingDelivery.id, 'confirmed', { 
                    deliveryDate: date, 
                    paymentStatus: status,
                    paid_amount: paidAmount
                  });
                }}>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Data de Entrega</label>
                    <input 
                      name="delivery_date" 
                      type="date" 
                      required 
                      defaultValue={new Date().toISOString().split('T')[0]}
                      className="w-full h-14 px-4 rounded-2xl border border-slate-200 bg-slate-50 font-black outline-none focus:ring-2 focus:ring-primary/20" 
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Status do Pagamento</label>
                    <select 
                      name="payment_status"
                      className="w-full h-14 px-4 rounded-2xl border border-slate-200 bg-slate-50 font-black outline-none focus:ring-2 focus:ring-primary/20"
                      onChange={(e) => {
                        const paidInput = document.getElementById('initial_paid_container');
                        if (paidInput) paidInput.style.display = e.target.value === 'partial' ? 'block' : 'none';
                      }}
                    >
                      <option value="pending">Pendente (Pagar na entrega)</option>
                      <option value="partial">Pagamento Parcial</option>
                      <option value="paid">Confirmado (Já pago totalmente)</option>
                    </select>
                  </div>

                  <div id="initial_paid_container" className="space-y-1" style={{ display: 'none' }}>
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Valor Já Pago (R$)</label>
                    <input 
                      name="initial_paid" 
                      type="number" 
                      step="0.01"
                      placeholder="0,00"
                      className="w-full h-14 px-4 rounded-2xl border border-slate-200 bg-slate-50 font-black outline-none focus:ring-2 focus:ring-primary/20" 
                    />
                  </div>

                  <div className="pt-2">
                    <button type="submit" className="w-full h-16 bg-primary text-white rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-primary/30 active:scale-95 transition-all flex items-center justify-center gap-2">
                      <CheckCircle2 size={20} /> Confirmar e Aceitar
                    </button>
                    <button 
                      type="button"
                      onClick={() => setConfirmingDelivery(null)}
                      className="w-full h-12 text-slate-400 font-bold text-xs uppercase tracking-widest mt-2"
                    >
                      Voltar
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL DE CONFIRMAÇÃO DE PAGAMENTO (TOTAL/PARCIAL) */}
        <AnimatePresence>
          {confirmingPayment && (
            <div className="fixed inset-0 z-[100] flex items-end justify-center">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmingPayment(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-md bg-white rounded-t-[32px] p-6 shadow-2xl">
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" />
                <h3 className="font-black text-lg mb-1 text-slate-900">Confirmar Pagamento</h3>
                <p className="text-xs font-bold text-slate-400 uppercase mb-6">Pedido #{confirmingPayment.id.slice(0, 8)}</p>
                
                <div className="space-y-6">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Devedor</p>
                      <p className="text-2xl font-black text-slate-900">R$ {(confirmingPayment.total - (confirmingPayment.paid_amount || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</p>
                      <p className="text-sm font-bold text-slate-500">R$ {confirmingPayment.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setIsTotalPayment(true)}
                      className={`h-14 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border ${isTotalPayment ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white text-slate-500 border-slate-200'}`}
                    >
                      Total
                    </button>
                    <button 
                      onClick={() => setIsTotalPayment(false)}
                      className={`h-14 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border ${!isTotalPayment ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white text-slate-500 border-slate-200'}`}
                    >
                      Parcial
                    </button>
                  </div>

                  {!isTotalPayment && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Valor a Confirmar (R$)</label>
                      <div className="relative">
                        <DollarSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="text"
                          inputMode="decimal"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          placeholder="0,00"
                          className="w-full h-14 pl-12 pr-4 rounded-2xl border border-slate-200 bg-slate-50 font-black outline-none focus:ring-2 focus:ring-primary/20" 
                        />
                      </div>
                    </div>
                  )}

                  <div className="pt-2">
                    <button 
                      onClick={handleConfirmPayment}
                      className="w-full h-16 bg-primary text-white rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-primary/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={20} /> Confirmar Pagamento
                    </button>
                    <button 
                      onClick={() => setConfirmingPayment(null)}
                      className="w-full h-12 text-slate-400 font-bold text-xs uppercase tracking-widest mt-2"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Botão Flutuante Otimizado */}
        <button 
          onClick={() => navigate('order-form')}
          className="fixed bottom-24 right-6 size-14 bg-primary text-white flex items-center justify-center rounded-2xl shadow-2xl shadow-primary/40 z-40 active:scale-90 transition-all group"
          title="Criar Novo Pedido"
        >
          <Plus size={28} className="group-hover:rotate-90 transition-transform duration-300" />
        </button>
        <BottomNav />
      </div>
    );
  };

  const OrderFormPage = () => {
    const [isSaving, setIsSaving] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('Pix');
    const [clientSearchTerm, setClientSearchTerm] = useState('');
    const [showClientSuggestions, setShowClientSuggestions] = useState(false);

    const filteredClientsForOrder = useMemo(() => {
      if (!clientSearchTerm) return [];
      return clients.filter(c => 
        c.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) || 
        c.establishment.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
        c.phone.includes(clientSearchTerm)
      ).slice(0, 5);
    }, [clients, clientSearchTerm]);

    const handleSelectClient = (client: any) => {
      setSelectedClientId(client.id);
      setClientSearchTerm(client.establishment || client.name);
      setShowClientSuggestions(false);
    };

    const filteredProducts = useMemo(() => {
      return products.filter(p => 
        p.name.toLowerCase().includes(productSearchForOrder.toLowerCase()) ||
        p.category.toLowerCase().includes(productSearchForOrder.toLowerCase())
      );
    }, [products, productSearchForOrder]);

    const getPendingQty = (productId: string) => pendingQuantities[productId] || 1;
    
    const setPendingQty = (productId: string, qty: number) => {
      setPendingQuantities(prev => ({ ...prev, [productId]: Math.max(1, qty) }));
    };

    const handleSaveOrder = async () => {
      if (!selectedClientId) { alert('Selecione um cliente.'); return; }
      if (cart.length === 0) { alert('Adicione pelo menos um produto.'); return; }
      
      setIsSaving(true);
      try {
        const orderData = {
          clientId: selectedClientId,
          clientName: selectedClient?.establishment || selectedClient?.name || 'Cliente',
          total: cartTotal,
          status: 'pending' as OrderStatus,
          paymentMethod,
          items: cartWithDetails.map(item => ({
            productId: item.id,
            variationId: item.variationId,
            variationName: item.variationName,
            quantity: item.quantity,
            price: item.price
          }))
        };

        const newOrder = await supabaseService.createOrder(orderData, cartWithDetails.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          price: item.price
        })));

        setOrders(prev => [newOrder as Order, ...prev]);
        setCart([]);
        setSelectedClientId(null);
        setPendingQuantities({});
        alert('Pedido salvo com sucesso!');
        navigate('orders');
      } catch (error) {
        console.error(error);
        alert('Erro ao salvar pedido.');
      } finally {
        setIsSaving(false);
      }
    };

    const sendWhatsApp = () => {
      if (!selectedClient) { alert('Selecione um cliente.'); return; }
      if (cart.length === 0) { alert('Adicione produtos ao pedido.'); return; }

      const itemsText = cartWithDetails.map(item => 
        `• ${item.name}${item.variationName ? ` (${item.variationName})` : ''} x${item.quantity} - R$ ${item.total.toLocaleString('pt-BR')}`
      ).join('\n');
      
      const text = `*NOVO PEDIDO*\n\n` +
                   `*Cliente:* ${selectedClient.establishment}\n` +
                   `*Data:* ${new Date().toLocaleDateString('pt-BR')}\n` +
                   `*Total:* R$ ${cartTotal.toLocaleString('pt-BR')}\n\n` +
                   `*Itens:*\n${itemsText}\n\n` +
                   `*Pagamento:* ${paymentMethod}`;
      
      const phone = selectedClient.whatsapp || selectedClient.phone;
      const cleanPhone = phone.replace(/\D/g, '');
      window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
    };

    return (
      <div className="min-h-screen bg-background-light pb-32">
        <header className="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate('orders')} className="p-1 text-slate-600">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-lg font-bold text-slate-900 flex-1 text-center">Criar Pedido</h1>
          <div className="w-8"></div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {/* Section 1: Selecionar Cliente */}
          <section className="p-4 space-y-3">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Selecionar Cliente</h2>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <div className="relative">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Cliente</span>
                <div className="relative">
                  <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    className="w-full h-14 pl-12 pr-4 rounded-xl border-slate-200 bg-slate-50 text-slate-900 focus:ring-primary focus:border-primary font-bold"
                    placeholder="Buscar por nome, loja ou telefone..."
                    value={clientSearchTerm}
                    onFocus={() => setShowClientSuggestions(true)}
                    onChange={(e) => {
                      setClientSearchTerm(e.target.value);
                      if (!e.target.value) setSelectedClientId(null);
                    }}
                  />
                  
                  <AnimatePresence>
                    {showClientSuggestions && filteredClientsForOrder.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 z-[60] bg-white border border-slate-200 rounded-xl mt-2 shadow-2xl overflow-hidden"
                      >
                        {filteredClientsForOrder.map(client => (
                          <button
                            key={client.id}
                            onClick={() => handleSelectClient(client)}
                            className="w-full p-4 text-left hover:bg-slate-50 flex items-center justify-between group transition-all"
                          >
                            <div>
                              <p className="font-black text-sm text-slate-900">{client.establishment || client.name}</p>
                              <p className="text-[10px] font-bold text-slate-400">{client.name} • {client.phone}</p>
                            </div>
                            <ArrowRight size={16} className="text-primary opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                          </button>
                        ))}
                        {clientSearchTerm.length >= 3 && !filteredClientsForOrder.find(c => (c.establishment || c.name).toLowerCase() === clientSearchTerm.toLowerCase()) && (
                          <button
                            onClick={() => {
                              setClientToEdit(null);
                              setNewClientPlaceholder(clientSearchTerm);
                              navigate('client-form');
                            }}
                            className="w-full p-4 text-left bg-primary/5 hover:bg-primary/10 flex items-center gap-3 transition-all"
                          >
                            <div className="size-8 rounded-full bg-primary text-white flex items-center justify-center">
                              <Plus size={16} />
                            </div>
                            <div>
                              <p className="font-black text-sm text-primary">Criar novo cliente "{clientSearchTerm}"</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Clique para cadastrar este nome</p>
                            </div>
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <button 
                onClick={() => { setClientToEdit(null); navigate('client-form'); }}
                className="mt-3 flex items-center gap-1 text-primary font-bold text-xs"
              >
                <PlusCircle size={16} /> Adicionar novo cliente
              </button>
            </div>
          </section>

          {/* Section 2: Produtos do Pedido */}
          <section className="p-4 space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Adicionar Produtos</h2>
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                className="w-full h-14 pl-10 pr-4 rounded-2xl border-slate-200 bg-white focus:ring-primary focus:border-primary font-medium" 
                placeholder="Buscar produtos..." 
                type="text"
                value={productSearchForOrder}
                onChange={(e) => setProductSearchForOrder(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              {filteredProducts.slice(0, 5).map(product => (
                <div key={product.id} className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex gap-4">
                  <img className="w-20 h-20 rounded-xl object-cover" src={product.image || 'https://picsum.photos/seed/prod/200/200'} alt={product.name} />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 truncate">{product.name}</h3>
                    <p className="text-primary font-black">R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center bg-slate-100 rounded-xl p-1">
                        <button 
                          onClick={() => setPendingQty(product.id, getPendingQty(product.id) - 1)}
                          className="p-1 text-slate-500 hover:text-primary"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="px-3 text-sm font-black w-8 text-center">{getPendingQty(product.id)}</span>
                        <button 
                          onClick={() => setPendingQty(product.id, getPendingQty(product.id) + 1)}
                          className="p-1 text-slate-500 hover:text-primary"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                      <button 
                        onClick={() => {
                          if (product.variations && product.variations.length > 0) {
                            setSelectedProductForVariation(product);
                          } else {
                            addToCart(product, getPendingQty(product.id));
                            setPendingQty(product.id, 1);
                          }
                        }}
                        className="bg-primary/10 text-primary px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-primary hover:text-white transition-all"
                      >
                        {product.variations && product.variations.length > 0 ? 'Opções' : 'Adicionar'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 3: Itens Selecionados (Cart) */}
          {cart.length > 0 && (
            <section className="p-4 space-y-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Itens no Pedido</h2>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <tr>
                      <th className="p-4">Item</th>
                      <th className="p-4 text-center">Qtd</th>
                      <th className="p-4 text-right">Subtotal</th>
                      <th className="p-4"></th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-50">
                    {cartWithDetails.map((item, idx) => (
                      <tr key={`${item.id}-${item.variationId || idx}`}>
                        <td className="p-4">
                          <div className="font-bold text-slate-800">{item.name}</div>
                          {item.variationName && <div className="text-[10px] font-bold text-slate-400 uppercase">{item.variationName}</div>}
                          <div className="text-[10px] font-bold text-primary">R$ {item.price.toLocaleString('pt-BR')}</div>
                        </td>
                        <td className="p-4 text-center">
                           <div className="flex items-center justify-center gap-2">
                             <button onClick={() => updateCartQuantity(item.id, item.quantity - 1, item.variationId)} className="text-slate-400"><Minus size={12}/></button>
                             <span className="font-black text-slate-900">{item.quantity}</span>
                             <button onClick={() => updateCartQuantity(item.id, item.quantity + 1, item.variationId)} className="text-slate-400"><Plus size={12}/></button>
                           </div>
                        </td>
                        <td className="p-4 text-right font-black text-slate-900">R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className="p-4 text-right">
                          <button onClick={() => removeFromCart(item.id, item.variationId)} className="text-red-400 p-1">
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Section 4: Resumo e Pagamento */}
          <section className="p-4 space-y-4">
            <div className="bg-slate-900 text-white p-6 rounded-[32px] shadow-xl shadow-slate-200">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold opacity-60 uppercase tracking-widest">Pagamento</span>
                <select 
                  className="bg-slate-800 border-none rounded-lg text-xs font-bold py-1 px-3 outline-none focus:ring-1 focus:ring-primary"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="Pix">Pix</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Cartão Credito">Cartão Credito</option>
                  <option value="Cartão Debito">Cartão Debito</option>
                  <option value="Boleto">Boleto</option>
                </select>
              </div>
              <div className="flex justify-between items-center opacity-60 text-xs font-bold mb-1">
                <span>TOTAL DE ITENS</span>
                <span>{cartItemsCount} unidades</span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-sm font-bold">VALOR TOTAL</span>
                <span className="text-3xl font-black text-primary">R$ {cartTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </section>

          {/* Actions */}
          <section className="p-4 space-y-3 pb-32">
            <button 
              onClick={handleSaveOrder}
              disabled={isSaving || cart.length === 0}
              className="w-full h-16 bg-primary text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.98] disabled:opacity-50 transition-all"
            >
              <CheckCircle size={24} />
              {isSaving ? 'Salvando...' : 'Salvar Pedido'}
            </button>
            <button 
              onClick={sendWhatsApp}
              disabled={cart.length === 0 || !selectedClientId}
              className="w-full h-16 bg-green-500 text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 active:scale-[0.98] disabled:opacity-50 transition-all"
            >
              <MessageSquare size={24} />
              Enviar por WhatsApp
            </button>
          </section>
        </main>
        
        {/* Reusing Modal de Variações */}
        <AnimatePresence>
          {selectedProductForVariation && (
            <div className="fixed inset-0 z-[70] flex items-end justify-center">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setSelectedProductForVariation(null)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                className="relative w-full max-w-md bg-white rounded-t-[32px] p-6 shadow-2xl"
              >
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" />
                <div className="flex gap-4 mb-6">
                  <img src={selectedProductForVariation.image} className="w-20 h-20 rounded-2xl object-cover" alt="" />
                  <div>
                    <h3 className="font-black text-lg text-slate-900">{selectedProductForVariation.name}</h3>
                    <p className="text-primary font-bold text-xl">R$ {selectedProductForVariation.price.toLocaleString('pt-BR')}</p>
                  </div>
                </div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Selecione uma opção</h4>
                <div className="space-y-3 max-h-[40vh] overflow-y-auto no-scrollbar">
                  {selectedProductForVariation.variations?.map(v => (
                    <button 
                      key={v.id}
                      onClick={() => {
                        addToCart(selectedProductForVariation, getPendingQty(selectedProductForVariation.id), v.id);
                        setPendingQty(selectedProductForVariation.id, 1);
                      }}
                      className="w-full p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:border-primary hover:bg-primary/5 transition-all flex items-center justify-between group"
                    >
                      <div className="text-left">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{v.name}</p>
                        <p className="font-black text-slate-800">{v.value}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {v.additional_price > 0 && <span className="text-sm font-black text-green-600">+ R$ {v.additional_price}</span>}
                        <div className="p-2 bg-white rounded-full text-primary group-hover:bg-primary group-hover:text-white shadow-sm transition-all">
                          <Plus size={20} />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <button onClick={() => setSelectedProductForVariation(null)} className="w-full mt-6 py-4 text-slate-400 font-bold text-sm uppercase tracking-widest">Cancelar</button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const CatalogPage = () => {
    const [selectedCategory, setSelectedCategory] = useState<string>('Todas');

    const internalCategories = useMemo(() => {
      const cats = new Set(products.map(p => p.category));
      return ['Todas', ...Array.from(cats)].sort();
    }, [products]);

    const filteredProducts = useMemo(() => {
      const q = productSearchForOrder.toLowerCase();
      return products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
        const matchesCategory = selectedCategory === 'Todas' || p.category === selectedCategory;
        return matchesSearch && matchesCategory;
      });
    }, [products, productSearchForOrder, selectedCategory]);

    return (
      <div className={`min-h-screen bg-background-light transition-all duration-300 ${cartItemsCount > 0 ? 'pb-48' : 'pb-24'}`}>
        <Header title="Catálogo" rightElement={<button onClick={() => navigate('cart')} className="relative p-2"><ShoppingCart size={24} />{cartItemsCount > 0 && <span className="absolute top-0 right-0 bg-primary text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">{cartItemsCount}</span>}</button>} />
        
        <section className="p-4 space-y-4">
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none shadow-sm focus:ring-2 focus:ring-primary/20" 
              placeholder="O que você procura hoje?" 
              value={productSearchForOrder}
              onChange={(e) => setProductSearchForOrder(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categorias</p>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4">
              {internalCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-5 py-2.5 rounded-xl whitespace-nowrap text-xs font-bold transition-all border ${
                    selectedCategory === cat 
                      ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-105' 
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </section>

        <main className="px-4 grid grid-cols-2 gap-4">
          {filteredProducts.map(product => (
          <div key={product.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 flex flex-col">
            <img src={product.image || 'https://picsum.photos/seed/prod/200/200'} className="aspect-square object-cover" alt={product.name} />
            <div className="p-3 flex-1 flex flex-col justify-between">
              <h3 className="font-bold text-sm truncate">{product.name}</h3>
              <p className="text-primary font-black mt-1">R$ {product.price.toLocaleString('pt-BR')}</p>
              <button 
                onClick={() => {
                  if (product.variations && product.variations.length > 0) {
                    setSelectedProductForVariation(product);
                  } else {
                    addToCart(product);
                  }
                }} 
                className="w-full mt-2 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1"
              >
                {product.variations && product.variations.length > 0 ? (
                  <>Opções <ChevronRight size={14}/></>
                ) : (
                  <>Adicionar <Plus size={14}/></>
                )}
              </button>
            </div>
          </div>
        ))}
      </main>

      {/* Modal de Variações */}
      <AnimatePresence>
        {selectedProductForVariation && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProductForVariation(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }}
              className="relative w-full max-w-md bg-white rounded-t-3xl p-6 shadow-2xl"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" />
              <div className="flex gap-4 mb-6">
                <img src={selectedProductForVariation.image} className="w-20 h-20 rounded-xl object-cover" alt="" />
                <div>
                  <h3 className="font-black text-lg text-slate-900">{selectedProductForVariation.name}</h3>
                  <p className="text-primary font-bold text-xl">R$ {selectedProductForVariation.price.toLocaleString('pt-BR')}</p>
                </div>
              </div>

              <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Escolha uma opção:</h4>
              <div className="space-y-3 max-h-[40vh] overflow-y-auto no-scrollbar">
                {selectedProductForVariation.variations?.map(v => (
                  <button 
                    key={v.id}
                    onClick={() => addToCart(selectedProductForVariation, 1, v.id)}
                    className="w-full p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:border-primary hover:bg-primary/5 transition-all flex items-center justify-between group"
                  >
                    <div className="text-left">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{v.name}</p>
                      <p className="font-bold text-slate-800">{v.value}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {v.additional_price > 0 && (
                        <span className="text-sm font-bold text-green-600">+ R$ {v.additional_price}</span>
                      )}
                      <div className="p-2 bg-white rounded-full text-primary group-hover:bg-primary group-hover:text-white shadow-sm transition-all">
                        <Plus size={20} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setSelectedProductForVariation(null)}
                className="w-full mt-6 py-4 text-slate-400 font-bold text-sm"
              >
                Voltar
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {cartItemsCount > 0 && (
        <div className="fixed bottom-28 left-4 right-4 z-40 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <button 
            onClick={() => navigate('cart')} 
            className="w-full bg-primary/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl shadow-primary/40 flex justify-between items-center border border-white/10 active:scale-95 transition-all"
          >
            <span className="font-bold">Ver Carrinho ({cartItemsCount})</span>
            <span className="font-black">R$ {cartTotal.toLocaleString('pt-BR')}</span>
          </button>
        </div>
      )}
      <BottomNav />
    </div>
  );
};

  const CartPage = () => (
    <div className="min-h-screen bg-background-light pb-32">
      <Header title="Carrinho" showBack onBack={() => navigate('catalog')} />
      <main className="p-4 space-y-4">
        {cartWithDetails.map((item, idx) => (
          <div key={`${item.id}-${item.variationId || idx}`} className="bg-white p-3 rounded-xl flex gap-4 items-center">
            <img src={item.image} className="w-16 h-16 rounded-lg object-cover" alt={item.name} />
            <div className="flex-1">
              <h4 className="font-bold text-sm">{item.name}</h4>
              {item.variationName && (
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.variationName}</p>
              )}
              <p className="text-primary font-bold">R$ {item.price.toLocaleString('pt-BR')}</p>
            </div>
            <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
              <button onClick={() => updateCartQuantity(item.id, item.quantity - 1, item.variationId)} className="p-1"><Minus size={14}/></button>
              <span className="font-bold text-sm w-4 text-center">{item.quantity}</span>
              <button onClick={() => updateCartQuantity(item.id, item.quantity + 1, item.variationId)} className="p-1"><Plus size={14}/></button>
            </div>
          </div>
        ))}
        {cart.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
            <button onClick={() => navigate('checkout')} className="w-full py-4 bg-primary text-white font-bold rounded-xl">Finalizar Pedido (R$ {cartTotal.toLocaleString('pt-BR')})</button>
          </div>
        )}
      </main>
    </div>
  );

  const CheckoutPage = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('Pix');

    const handleFinishOrder = async () => {
      if (!selectedClientId) { alert('Selecione um cliente.'); navigate('clients'); return; }
      setIsProcessing(true);
      try {
        const newOrder = await supabaseService.createOrder({
          clientId: selectedClientId,
          clientName: selectedClient?.establishment || '',
          total: cartTotal,
          status: 'pending',
          paymentMethod,
          items: cart.map(item => {
            const product = products.find(p => p.id === item.productId);
            const variation = product?.variations?.find(v => v.id === item.variationId);
            const basePrice = product?.price || 0;
            const finalPrice = basePrice + (variation?.additional_price || 0);
            
            return {
              productId: item.productId,
              variationId: item.variationId,
              variationName: variation ? `${variation.name}: ${variation.value}` : undefined,
              quantity: item.quantity,
              price: finalPrice
            };
          })
        }, cart.map(item => {
          const product = products.find(p => p.id === item.productId);
          const variation = product?.variations?.find(v => v.id === item.variationId);
          const basePrice = product?.price || 0;
          const finalPrice = basePrice + (variation?.additional_price || 0);

          return {
            productId: item.productId,
            quantity: item.quantity,
            price: finalPrice
          };
        }));
        setOrders(prev => [newOrder as Order, ...prev]);
        setCart([]);
        setSelectedClientId(null);
        navigate('orders');
        alert('Pedido realizado!');
      } catch (e) { alert('Erro ao processar.'); } finally { setIsProcessing(false); }
    };

    return (
      <div className="min-h-screen bg-background-light p-4">
        <Header title="Finalizar" showBack onBack={() => navigate('cart')} />
        <div className="space-y-6 mt-4">
          <div className="p-4 bg-white rounded-xl border">
            <h3 className="font-bold mb-2">Cliente Selecionado</h3>
            {selectedClient ? <p className="text-primary font-bold">{selectedClient.establishment}</p> : <button onClick={() => navigate('clients')} className="text-blue-500 font-bold">Selecionar Cliente +</button>}
          </div>
          <div className="p-4 bg-slate-900 text-white rounded-2xl">
            <div className="flex justify-between mb-4"><span className="opacity-60">Total</span><span className="text-2xl font-black">R$ {cartTotal.toLocaleString('pt-BR')}</span></div>
            <button onClick={handleFinishOrder} disabled={isProcessing || cart.length === 0} className="w-full py-4 bg-primary text-white font-bold rounded-xl">
              {isProcessing ? 'Processando...' : 'Confirmar Pedido'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const FinancePage = () => {
    const [financeSummary, setFinanceSummary] = useState<FinanceSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isAddingTransaction, setIsAddingTransaction] = useState(false);
    const [dateRange, setDateRange] = useState({
      start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
    });
    const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'reports'>('overview');
    
    const [newTransaction, setNewTransaction] = useState({
      type: 'expense' as 'income' | 'expense',
      category: 'Geral',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0]
    });

    const categories = {
      income: ['Venda', 'Ajuste', 'Investimento', 'Outros'],
      expense: ['Geral', 'Mercadoria', 'Aluguel', 'Energia', 'Internet', 'Marketing', 'Salário', 'Ajuste', 'Outros']
    };

    useEffect(() => {
      fetchFinanceData();
    }, [dateRange]);

    const fetchFinanceData = async () => {
      setIsLoading(true);
      try {
        const summary = await supabaseService.getFinanceSummary(
          new Date(dateRange.start).toISOString(), 
          new Date(dateRange.end + 'T23:59:59').toISOString()
        );
        setFinanceSummary(summary);
        
        const list = await supabaseService.getTransactions();
        setTransactions(list);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    const handleAddTransaction = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newTransaction.amount || !newTransaction.description) return;

      try {
        await supabaseService.addTransaction({
          type: newTransaction.type,
          category: newTransaction.category,
          amount: parseFloat(newTransaction.amount),
          description: newTransaction.description,
          date: newTransaction.date
        });
        setIsAddingTransaction(false);
        setNewTransaction({
          type: 'expense',
          category: 'Geral',
          amount: '',
          description: '',
          date: new Date().toISOString().split('T')[0]
        });
        fetchFinanceData();
      } catch (e) {
        alert('Erro ao salvar lançamento.');
      }
    };

    if (isLoading && !financeSummary) {
      return (
        <div className="min-h-screen bg-background-light flex items-center justify-center">
          <div className="animate-spin size-10 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background-light pb-32">
        <Header title="Financeiro" />
        
        <main className="p-4 space-y-6 max-w-md mx-auto">
          {/* Filtros de Data */}
          <section className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">De</label>
              <input 
                type="date" 
                className="w-full bg-slate-50 border-none rounded-xl text-xs font-bold p-2 outline-none focus:ring-1 focus:ring-primary"
                value={dateRange.start}
                onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Até</label>
              <input 
                type="date" 
                className="w-full bg-slate-50 border-none rounded-xl text-xs font-bold p-2 outline-none focus:ring-1 focus:ring-primary"
                value={dateRange.end}
                onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>
            <button 
              onClick={fetchFinanceData}
              className="mt-4 p-3 bg-primary/10 text-primary rounded-xl active:scale-95 transition-all"
            >
              <Search size={18} />
            </button>
          </section>

          {/* Tabs de Navegação */}
          <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-100">
            {(['overview', 'transactions', 'reports'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === tab ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400'}`}
              >
                {tab === 'overview' ? 'Resumo' : tab === 'transactions' ? 'Extrato' : 'Relatórios'}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Dashboard de Resumo */}
              <section className="grid grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-[32px] shadow-sm border border-slate-100 flex flex-col justify-between h-32">
                  <div className="size-10 rounded-2xl bg-green-100 text-green-600 flex items-center justify-center">
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Receita</p>
                    <p className="text-lg font-black text-slate-900">R$ {financeSummary?.total_income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-[32px] shadow-sm border border-slate-100 flex flex-col justify-between h-32">
                  <div className="size-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center">
                    <TrendingDown size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Despesas</p>
                    <p className="text-lg font-black text-slate-900">R$ {financeSummary?.total_expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>

                <div className="col-span-2 bg-slate-900 p-6 rounded-[32px] shadow-xl shadow-slate-200 text-white flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-black opacity-60 uppercase tracking-widest mb-1">Lucro Líquido</p>
                    <p className={`text-3xl font-black ${financeSummary && financeSummary.net_profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      R$ {financeSummary?.net_profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className={`size-12 rounded-2xl flex items-center justify-center ${financeSummary && financeSummary.net_profit >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    <DollarSign size={28} />
                  </div>
                </div>

                <div className="col-span-2 bg-amber-50 p-5 rounded-[32px] border border-amber-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="size-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
                      <Clock size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">A Receber (Pendentes)</p>
                      <p className="text-lg font-black text-slate-900">R$ {financeSummary?.pending_payments.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                  <button onClick={() => navigate('orders')} className="p-2 bg-white rounded-xl shadow-sm text-amber-600">
                    <ArrowRight size={20} />
                  </button>
                </div>
              </section>

              {/* Origem das Vendas */}
              <section className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <BarChart3 size={18} className="text-primary" /> Origem das Vendas
                  </h3>
                  <div className="flex gap-2">
                    <div className="flex items-center gap-1">
                      <div className="size-2 bg-primary rounded-full" />
                      <span className="text-[8px] font-black text-slate-400 uppercase">Manual</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="size-2 bg-indigo-500 rounded-full" />
                      <span className="text-[8px] font-black text-slate-400 uppercase">Online</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 relative overflow-hidden group">
                    <div className="relative z-10">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Manual</p>
                      <p className="text-lg font-black text-slate-900">R$ {financeSummary?.revenue_by_source.manual.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">{financeSummary?.revenue_by_source.manual.count} pedidos</p>
                    </div>
                    <div className="absolute right-[-10px] bottom-[-10px] opacity-5 group-hover:opacity-10 transition-opacity">
                      <ShoppingCart size={64} />
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 relative overflow-hidden group">
                    <div className="relative z-10">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Catálogo</p>
                      <p className="text-lg font-black text-indigo-600">R$ {financeSummary?.revenue_by_source.online.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">{financeSummary?.revenue_by_source.online.count} pedidos</p>
                    </div>
                    <div className="absolute right-[-10px] bottom-[-10px] opacity-5 group-hover:opacity-10 transition-opacity">
                      <Globe size={64} />
                    </div>
                  </div>
                </div>
              </section>

              {/* Projeção do Mês */}
              <section className="bg-gradient-to-br from-primary to-blue-700 p-6 rounded-[32px] shadow-xl text-white space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                    <Target size={18} /> Projeção do Mês
                  </h3>
                  <Zap size={18} className="text-yellow-400 animate-pulse" />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">Previsão Faturamento</p>
                    <p className="text-xl font-black">R$ {financeSummary?.projections.expected_revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">Previsão Lucro</p>
                    <p className="text-xl font-black text-green-300">R$ {financeSummary?.projections.expected_profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex justify-between text-[10px] font-black uppercase mb-2">
                    <span>Progresso do Mês</span>
                    <span>{Math.round((new Date().getDate() / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()) * 100)}%</span>
                  </div>
                  <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white rounded-full" 
                      style={{ width: `${(new Date().getDate() / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()) * 100}%` }}
                    />
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'transactions' && (
            <section className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <History size={16} className="text-primary" /> Lançamentos
                </h3>
                <button 
                  onClick={() => setIsAddingTransaction(true)}
                  className="text-[10px] font-black text-primary uppercase bg-primary/10 px-3 py-1.5 rounded-lg active:scale-95 transition-all"
                >
                  + Novo Lançamento
                </button>
              </div>

              <div className="space-y-3">
                {transactions.length === 0 ? (
                  <div className="bg-white p-10 rounded-[32px] text-center border border-dashed border-slate-200">
                    <DollarSign size={40} className="mx-auto text-slate-200 mb-2" />
                    <p className="text-xs font-bold text-slate-400 uppercase">Nenhum lançamento manual</p>
                  </div>
                ) : (
                  transactions.map(t => (
                    <div key={t.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className={`size-10 rounded-xl flex items-center justify-center ${t.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                          {t.type === 'income' ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900">{t.description}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{t.category} • {new Date(t.date).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                      <p className={`font-black text-sm ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {t.type === 'income' ? '+' : '-'} R$ {Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-6">
              {/* Top Produtos */}
              <section className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Award size={18} className="text-primary" /> Top Produtos & Lucro
                  </h3>
                  <BarChart3 size={18} className="text-slate-300" />
                </div>

                <div className="space-y-4">
                  {financeSummary?.top_products.map((product, idx) => (
                    <div key={product.id} className="space-y-2">
                      <div className="flex justify-between items-end">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-black text-slate-900 truncate">{idx + 1}. {product.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{product.quantity} unidades vendidas</p>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-sm font-black text-primary">R$ {product.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          <p className={`text-[10px] font-black uppercase ${product.margin >= 30 ? 'text-green-600' : 'text-orange-500'}`}>
                            Margem: {product.margin.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full opacity-80" 
                          style={{ width: `${(product.revenue / (financeSummary.top_products[0]?.revenue || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Fluxo de Caixa */}
              <section className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 space-y-6">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <PieChart size={16} className="text-primary" /> Fluxo de Caixa
                </h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase">
                      <span className="text-slate-400">Receitas</span>
                      <span className="text-green-600">{((financeSummary?.total_income || 0) / (Math.max(1, (financeSummary?.total_income || 0) + (financeSummary?.total_expense || 0))) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 rounded-full" 
                          style={{ width: `${(financeSummary?.total_income || 0) / (Math.max(1, (financeSummary?.total_income || 0) + (financeSummary?.total_expense || 0))) * 100}%` }}
                        />
                      </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase">
                      <span className="text-slate-400">Despesas</span>
                      <span className="text-red-600">{((financeSummary?.total_expense || 0) / (Math.max(1, (financeSummary?.total_income || 0) + (financeSummary?.total_expense || 0))) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-red-500 rounded-full" 
                          style={{ width: `${(financeSummary?.total_expense || 0) / (Math.max(1, (financeSummary?.total_income || 0) + (financeSummary?.total_expense || 0))) * 100}%` }}
                        />
                      </div>
                  </div>
                </div>
              </section>
            </div>
          )}
        </main>

        {/* Modal de Novo Lançamento */}
        <AnimatePresence>
          {isAddingTransaction && (
            <div className="fixed inset-0 z-[100] flex items-end justify-center">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddingTransaction(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-md bg-white rounded-t-[32px] p-6 shadow-2xl overflow-hidden">
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" />
                <h3 className="font-black text-lg mb-1 text-slate-900">Novo Lançamento</h3>
                <p className="text-xs font-bold text-slate-400 uppercase mb-6">Registre uma entrada ou saída manual</p>
                
                <form className="space-y-5" onSubmit={handleAddTransaction}>
                  <div className="flex bg-slate-100 p-1 rounded-2xl">
                    <button 
                      type="button"
                      onClick={() => setNewTransaction({ ...newTransaction, type: 'expense' })}
                      className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${newTransaction.type === 'expense' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'text-slate-400'}`}
                    >
                      Despesa
                    </button>
                    <button 
                      type="button"
                      onClick={() => setNewTransaction({ ...newTransaction, type: 'income' })}
                      className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${newTransaction.type === 'income' ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'text-slate-400'}`}
                    >
                      Receita
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Valor (R$)</label>
                      <input 
                        type="number" step="0.01" required
                        className="w-full h-14 px-4 rounded-2xl border border-slate-200 bg-slate-50 font-black outline-none focus:ring-2 focus:ring-primary/20"
                        value={newTransaction.amount}
                        onChange={e => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                        placeholder="0,00"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Data</label>
                      <input 
                        type="date" required
                        className="w-full h-14 px-4 rounded-2xl border border-slate-200 bg-slate-50 font-black outline-none focus:ring-2 focus:ring-primary/20"
                        value={newTransaction.date}
                        onChange={e => setNewTransaction({ ...newTransaction, date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Categoria</label>
                    <select 
                      className="w-full h-14 px-4 rounded-2xl border border-slate-200 bg-slate-50 font-black outline-none focus:ring-2 focus:ring-primary/20"
                      value={newTransaction.category}
                      onChange={e => setNewTransaction({ ...newTransaction, category: e.target.value })}
                    >
                      {categories[newTransaction.type].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Descrição</label>
                    <input 
                      type="text" required
                      className="w-full h-14 px-4 rounded-2xl border border-slate-200 bg-slate-50 font-black outline-none focus:ring-2 focus:ring-primary/20"
                      value={newTransaction.description}
                      onChange={e => setNewTransaction({ ...newTransaction, description: e.target.value })}
                      placeholder="Ex: Aluguel do mês"
                    />
                  </div>

                  <div className="pt-2">
                    <button type="submit" className="w-full h-16 bg-primary text-white rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-primary/30 active:scale-95 transition-all">
                      Confirmar Lançamento
                    </button>
                    <button 
                      type="button"
                      onClick={() => setIsAddingTransaction(false)}
                      className="w-full h-12 text-slate-400 font-bold text-xs uppercase tracking-widest mt-2"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <BottomNav />
      </div>
    );
  };

  const SettingsPage = () => {
    const [testResult, setTestTestResult] = useState<string | null>(null);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [isGeneratingBackup, setIsGeneratingBackup] = useState(false);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [localSettings, setLocalSettings] = useState<AppSettings>(appSettings);
    const [localAppConfig, setLocalAppConfig] = useState<UserAppConfig>(userAppConfig);
    const [localProfile, setLocalProfile] = useState<UserProfile>(userProfile);
    const [localPublicCatalog, setLocalPublicCatalog] = useState<PublicCatalog>(publicCatalog || { catalog_slug: '', is_active: false });
    const [newPassword, setNewPassword] = useState('');

    const maskPhone = (value: string) => {
      const clean = value.replace(/\D/g, '');
      if (clean.length <= 10) {
        return clean.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
      }
      return clean.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').slice(0, 15);
    };

    const runDiagnostic = async () => {
      setTestTestResult('Testando...');
      try {
        const buckets = await supabaseService.checkStorage();
        const names = buckets.map(b => b.name).join(', ') || 'Nenhum bucket encontrado';
        setTestTestResult(`Conectado! Buckets encontrados: ${names}`);
      } catch (error: any) {
        setTestTestResult(`Erro: ${error.message}`);
      }
    };

    const handleSaveSettings = async () => {
      setIsSavingSettings(true);
      try {
        let catalogToSave = { ...localPublicCatalog };
        // Gerar slug automático se estiver vazio mas ativo
        if (catalogToSave.is_active && !catalogToSave.catalog_slug) {
          const base = localSettings.store_name || localProfile.full_name || 'meu-catalogo';
          catalogToSave.catalog_slug = slugify(base) || `catalogo-${Math.floor(Math.random() * 9000 + 1000)}`;
          setLocalPublicCatalog(catalogToSave);
        }

        const promises: Promise<any>[] = [
          supabaseService.updateSettings(localSettings),
          supabaseService.updateAppConfig(localAppConfig),
          supabaseService.updateProfile(localProfile),
        ];

        // Só salvar catálogo se tiver slug (ou se geramos um acima)
        if (catalogToSave.catalog_slug) {
          promises.push(supabaseService.upsertPublicCatalog(catalogToSave));
        }

        if (newPassword.trim().length >= 6) {
          promises.push(supabaseService.updatePassword(newPassword));
        } else if (newPassword.trim().length > 0) {
          alert('A senha deve ter pelo menos 6 caracteres.');
          setIsSavingSettings(false);
          return;
        }

        await Promise.all(promises);
        setAppSettings(localSettings);
        setUserAppConfig(localAppConfig);
        setUserProfile(localProfile);
        setPublicCatalog(catalogToSave);
        setNewPassword('');
        alert('Configurações salvas com sucesso!');
      } catch (error: any) {
        console.error(error);
        const message = error?.message ? String(error.message) : 'Erro desconhecido';
        const details = error?.details ? String(error.details) : '';
        const hint = error?.hint ? String(error.hint) : '';
        const code = error?.code ? String(error.code) : '';
        const extra = [code && `Código: ${code}`, details && `Detalhes: ${details}`, hint && `Dica: ${hint}`]
          .filter(Boolean)
          .join('\n');
        alert(`Erro ao salvar configurações: ${message}${extra ? `\n\n${extra}` : ''}`);
      } finally {
        setIsSavingSettings(false);
      }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsUploadingLogo(true);
      try {
        const url = await supabaseService.uploadProductImage(file);
        setLocalSettings({ ...localSettings, store_logo: url });
      } catch (error: any) {
        alert('Erro ao subir logo: ' + error.message);
      } finally {
        setIsUploadingLogo(false);
      }
    };

    const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsUploadingAvatar(true);
      try {
        const url = await supabaseService.uploadProductImage(file);
        setLocalProfile({ ...localProfile, avatar_url: url });
      } catch (error: any) {
        alert('Erro ao subir foto: ' + error.message);
      } finally {
        setIsUploadingAvatar(false);
      }
    };

    const handleGenerateBackup = async () => {
      setIsGeneratingBackup(true);
      try {
        const newBackup = await supabaseService.generateBackup(
          localAppConfig.backup_format,
          localAppConfig.backup_email_enabled
        );
        setBackups(prev => [newBackup, ...prev]);
        alert(localAppConfig.backup_email_enabled 
          ? 'Backup gerado e enviado para o e-mail cadastrado!' 
          : 'Backup gerado com sucesso!');
      } catch (error: any) {
        console.error(error);
        alert('Erro ao gerar backup: ' + error.message);
      } finally {
        setIsGeneratingBackup(false);
      }
    };

    const handleDeleteBackup = async (id: string, storagePath: string) => {
      if (!confirm('Deseja realmente excluir este backup?')) return;
      try {
        await supabaseService.deleteBackup(id, storagePath);
        setBackups(prev => prev.filter(b => b.id !== id));
      } catch (error: any) {
        alert('Erro ao excluir backup: ' + error.message);
      }
    };

    const handleDownloadBackup = async (storagePath: string) => {
      try {
        const url = await supabaseService.getBackupDownloadUrl(storagePath);
        window.open(url, '_blank');
      } catch (error: any) {
        alert('Erro ao baixar backup: ' + (error.message || 'Erro desconhecido'));
      }
    };

    const slugify = (value: string) => {
      return value
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '')
        .slice(0, 48);
    };

    const publicCatalogLink = localPublicCatalog.catalog_slug
      ? `${window.location.origin}/#/c/${encodeURIComponent(localPublicCatalog.catalog_slug)}`
      : '';

    const fallbackCopyTextToClipboard = (text: string) => {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        const successful = document.execCommand('copy');
        if (successful) alert('Link copiado com sucesso!');
      } catch (err) {
        alert('Não foi possível copiar o link automaticamente. Por favor, copie manualmente: ' + text);
      }
      document.body.removeChild(textArea);
    };

    const sharePublicLink = async () => {
      if (!publicCatalogLink) return;
      
      const shareData = {
        title: localSettings.store_name || 'Meu Catálogo Digital',
        text: `Confira nossos produtos e faça seu pedido online no catálogo da ${localSettings.store_name || 'nossa loja'}!`,
        url: publicCatalogLink,
      };

      try {
        if (navigator.share) {
          await navigator.share(shareData);
        } else {
          // Tentar API moderna
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(publicCatalogLink);
            alert('Link copiado com sucesso!');
          } else {
            fallbackCopyTextToClipboard(publicCatalogLink);
          }
        }
      } catch (err: any) {
        if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
          fallbackCopyTextToClipboard(publicCatalogLink);
        } else if (err.name !== 'AbortError') {
          console.error('Erro ao compartilhar:', err);
          fallbackCopyTextToClipboard(publicCatalogLink);
        }
      }
    };

    const copyPublicLink = async () => {
      if (!publicCatalogLink) return;
      try {
        await navigator.clipboard.writeText(publicCatalogLink);
        alert('Link copiado com sucesso!');
      } catch {
        alert(publicCatalogLink);
      }
    };

    return (
      <div className="min-h-screen bg-background-light pb-32">
        <Header title="Configurações" />
        <main className="p-4 space-y-6 max-w-md mx-auto">
          {/* Perfil do Usuário (Etapa 3) */}
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
              <User size={16} className="text-primary" /> Meu Perfil
            </h4>
            <div className="flex items-center gap-4 mb-6">
              <div className="relative size-20 shrink-0">
                <div className="size-full bg-slate-100 rounded-full flex items-center justify-center text-slate-400 overflow-hidden border-2 border-white shadow-md">
                  {isUploadingAvatar ? (
                    <div className="size-full flex items-center justify-center bg-white/80">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                    </div>
                  ) : localProfile.avatar_url ? (
                    <img src={localProfile.avatar_url} className="size-full object-cover" alt="Avatar" />
                  ) : (
                    <User size={32} />
                  )}
                </div>
                <label className="absolute -bottom-1 -right-1 size-7 bg-primary text-white rounded-full shadow-md flex items-center justify-center cursor-pointer">
                  <Camera size={14} />
                  <input type="file" className="hidden" accept="image/*" onChange={handleProfilePhotoUpload} disabled={isUploadingAvatar} />
                </label>
              </div>
              <div className="flex-1">
                <input 
                  className="w-full text-lg font-black text-slate-900 bg-transparent border-b border-dashed border-slate-200 focus:border-primary outline-none"
                  placeholder="Seu Nome Completo"
                  value={localProfile.full_name}
                  onChange={e => setLocalProfile({...localProfile, full_name: e.target.value})}
                />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Perfil do Usuário</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefone Pessoal</label>
                <input 
                  className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-primary outline-none transition-all font-bold text-sm" 
                  value={localProfile.phone}
                  onChange={e => setLocalProfile({...localProfile, phone: maskPhone(e.target.value)})}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Endereço Residencial</label>
                <input 
                  className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-primary outline-none transition-all font-bold text-sm" 
                  value={localProfile.address}
                  onChange={e => setLocalProfile({...localProfile, address: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cidade</label>
                  <input 
                    className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-primary outline-none transition-all font-bold text-sm" 
                    value={localProfile.city}
                    onChange={e => setLocalProfile({...localProfile, city: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estado</label>
                  <input 
                    className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-primary outline-none transition-all font-bold text-sm" 
                    value={localProfile.state}
                    onChange={e => setLocalProfile({...localProfile, state: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Segurança (Etapa 3) */}
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <Shield size={16} className="text-primary" /> Segurança
            </h4>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nova Senha</label>
              <div className="relative">
                <input 
                  type="password"
                  className="w-full h-12 pl-4 pr-10 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-primary outline-none transition-all font-bold text-sm" 
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                />
                <Lock size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
              </div>
              <p className="text-[8px] text-slate-400 font-bold uppercase mt-1 px-1">Deixe em branco para manter a senha atual.</p>
            </div>
          </section>

          {/* Horários de Trabalho (Etapa 3) */}
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <Clock size={16} className="text-primary" /> Jornada de Trabalho
            </h4>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dias de Trabalho</label>
                <div className="flex flex-wrap gap-2">
                  {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'].map(day => (
                    <button 
                      key={day}
                      onClick={() => {
                        const days = localProfile.work_days.includes(day)
                          ? localProfile.work_days.filter(d => d !== day)
                          : [...localProfile.work_days, day];
                        setLocalProfile({ ...localProfile, work_days: days });
                      }}
                      className={`px-3 py-2 rounded-xl text-[10px] font-black transition-all ${localProfile.work_days.includes(day) ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Início</label>
                  <input 
                    type="time"
                    className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-primary outline-none transition-all font-bold text-sm" 
                    value={localProfile.work_start_time}
                    onChange={e => setLocalProfile({...localProfile, work_start_time: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Término</label>
                  <input 
                    type="time"
                    className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-primary outline-none transition-all font-bold text-sm" 
                    value={localProfile.work_end_time}
                    onChange={e => setLocalProfile({...localProfile, work_end_time: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Horário de Atendimento (Descrição)</label>
                <input 
                  className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-primary outline-none transition-all font-bold text-sm" 
                  placeholder="Ex: Seg-Sex das 08h às 18h"
                  value={localProfile.service_hours}
                  onChange={e => setLocalProfile({...localProfile, service_hours: e.target.value})}
                />
              </div>
            </div>
          </section>

          {/* Perfil da Loja */}
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-4 mb-6">
              <div className="relative size-20 shrink-0">
                <div className="size-full bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/30 overflow-hidden">
                  {isUploadingLogo ? (
                    <div className="size-full flex items-center justify-center bg-white/20 backdrop-blur-sm">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    </div>
                  ) : localSettings.store_logo ? (
                    <img src={localSettings.store_logo} className="size-full object-cover" alt="Logo" />
                  ) : (
                    <Building2 size={32} />
                  )}
                </div>
                <label className="absolute -bottom-2 -right-2 size-8 bg-white rounded-full shadow-md flex items-center justify-center text-primary cursor-pointer border border-slate-100">
                  <Camera size={16} />
                  <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={isUploadingLogo} />
                </label>
              </div>
              <div>
                <h3 className="font-black text-xl text-slate-900">{localSettings.store_name}</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Perfil da Empresa</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome da Loja</label>
                <input 
                  className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-primary outline-none transition-all font-bold text-sm" 
                  value={localSettings.store_name}
                  onChange={e => setLocalSettings({...localSettings, store_name: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp da Loja</label>
                <input 
                  className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-primary outline-none transition-all font-bold text-sm" 
                  placeholder="(00) 00000-0000"
                  value={localSettings.store_phone}
                  onChange={e => setLocalSettings({...localSettings, store_phone: maskPhone(e.target.value)})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CNPJ / CPF</label>
                <input 
                  className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-primary outline-none transition-all font-bold text-sm" 
                  value={localSettings.tax_id}
                  onChange={e => setLocalSettings({...localSettings, tax_id: e.target.value})}
                />
              </div>
            </div>
          </section>

          {/* Endereço e Contato */}
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <MapPin size={16} className="text-primary" /> Localização e Contato
            </h4>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Endereço Comercial</label>
                <textarea 
                  className="w-full p-4 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-primary outline-none transition-all font-bold text-sm resize-none" 
                  rows={2}
                  value={localSettings.store_address}
                  onChange={e => setLocalSettings({...localSettings, store_address: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail de Suporte</label>
                <input 
                  className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-primary outline-none transition-all font-bold text-sm" 
                  value={localSettings.store_email}
                  onChange={e => setLocalSettings({...localSettings, store_email: e.target.value})}
                />
              </div>
            </div>
          </section>

          {/* Preferências do Sistema */}
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <Settings size={16} className="text-primary" /> Preferências do Aplicativo
            </h4>
            
            <div className="space-y-4">
              {/* Notificações */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${localAppConfig.notifications_enabled ? 'bg-primary/10 text-primary' : 'bg-slate-200 text-slate-400'}`}>
                    <Bell size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Notificações</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Alertas de novos pedidos</p>
                  </div>
                </div>
                <button 
                  onClick={() => setLocalAppConfig({ ...localAppConfig, notifications_enabled: !localAppConfig.notifications_enabled })}
                  className={`w-12 h-6 rounded-full relative transition-all duration-300 ${localAppConfig.notifications_enabled ? 'bg-primary' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-1 size-4 bg-white rounded-full shadow-sm transition-all duration-300 ${localAppConfig.notifications_enabled ? 'right-1' : 'left-1'}`}></div>
                </button>
              </div>

              {/* Modo Dark */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${localAppConfig.dark_mode ? 'bg-slate-900 text-white' : 'bg-amber-100 text-amber-600'}`}>
                    {localAppConfig.dark_mode ? <Lock size={18} /> : <Settings size={18} />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Modo Escuro</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Interface com fundo preto</p>
                  </div>
                </div>
                <button 
                  onClick={() => setLocalAppConfig({ ...localAppConfig, dark_mode: !localAppConfig.dark_mode })}
                  className={`w-12 h-6 rounded-full relative transition-all duration-300 ${localAppConfig.dark_mode ? 'bg-slate-900' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-1 size-4 bg-white rounded-full shadow-sm transition-all duration-300 ${localAppConfig.dark_mode ? 'right-1' : 'left-1'}`}></div>
                </button>
              </div>

              {/* Seleção de Temas (Cores) */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cores do Aplicativo</p>
                <div className="flex gap-3 px-1">
                  {[
                    { id: 'blue', color: '#3b82f6', label: 'Azul' },
                    { id: 'green', color: '#10b981', label: 'Verde' },
                    { id: 'purple', color: '#8b5cf6', label: 'Roxo' },
                    { id: 'orange', color: '#f59e0b', label: 'Laranja' },
                    { id: 'red', color: '#ef4444', label: 'Vermelho' }
                  ].map((theme) => (
                    <button 
                      key={theme.id}
                      onClick={() => setLocalAppConfig({ ...localAppConfig, theme_color: theme.color })}
                      className={`size-10 rounded-2xl border-2 transition-all flex items-center justify-center ${localAppConfig.theme_color === theme.color ? 'border-primary scale-110 shadow-lg shadow-primary/20' : 'border-transparent opacity-60'}`}
                      style={{ backgroundColor: theme.color }}
                    >
                      {localAppConfig.theme_color === theme.color && <CheckCircle size={20} className="text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Moeda</label>
                  <input 
                    className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-primary outline-none transition-all font-bold text-sm" 
                    value={localSettings.currency}
                    onChange={e => setLocalSettings({...localSettings, currency: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Idioma</label>
                  <div className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-slate-50 flex items-center font-bold text-sm text-slate-400">
                    Português (BR)
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Gerenciamento de Backups (Etapa 2) */}
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <FileText size={16} className="text-primary" /> Backups e Segurança
              </h4>
              <button 
                onClick={handleGenerateBackup}
                disabled={isGeneratingBackup}
                className="p-2 bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-white transition-all disabled:opacity-50"
                title="Gerar Backup Agora"
              >
                {isGeneratingBackup ? <div className="size-5 animate-spin border-2 border-primary border-t-transparent rounded-full" /> : <Plus size={20} />}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Frequência</label>
                <select 
                  className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-primary outline-none transition-all font-bold text-sm"
                  value={localAppConfig.backup_frequency}
                  onChange={e => setLocalAppConfig({ ...localAppConfig, backup_frequency: e.target.value as any })}
                >
                  <option value="manual">Manual</option>
                  <option value="daily">Diário</option>
                  <option value="weekly">Semanal</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Formato</label>
                <select 
                  className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-primary outline-none transition-all font-bold text-sm"
                  value={localAppConfig.backup_format}
                  onChange={e => setLocalAppConfig({ ...localAppConfig, backup_format: e.target.value as any })}
                >
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                </select>
              </div>
            </div>

            {/* Envio por E-mail (Novo) */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${localAppConfig.backup_email_enabled ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-400'}`}>
                  <Mail size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Enviar para E-mail</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase truncate max-w-[150px]">
                    {localSettings.store_email || 'Configure seu e-mail acima'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  if (!localSettings.store_email) {
                    alert('Por favor, cadastre um e-mail de suporte acima antes de ativar esta opção.');
                    return;
                  }
                  setLocalAppConfig({ ...localAppConfig, backup_email_enabled: !localAppConfig.backup_email_enabled });
                }}
                className={`w-12 h-6 rounded-full relative transition-all duration-300 ${localAppConfig.backup_email_enabled ? 'bg-amber-500' : 'bg-slate-300'}`}
              >
                <div className={`absolute top-1 size-4 bg-white rounded-full shadow-sm transition-all duration-300 ${localAppConfig.backup_email_enabled ? 'right-1' : 'left-1'}`}></div>
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
              {backups.length === 0 ? (
                <p className="text-center py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Nenhum backup gerado</p>
              ) : (
                backups.map(backup => (
                  <div key={backup.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 group">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-slate-900 truncate uppercase">{backup.filename}</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase">
                        {new Date(backup.created_at).toLocaleString('pt-BR')} • {(backup.size_bytes / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleDownloadBackup(backup.file_url)}
                        className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      >
                        <ArrowRight size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteBackup(backup.id, backup.file_url)}
                        className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Store size={16} className="text-primary" /> Catálogo Público
              </h4>
              <button
                onClick={() => {
                  const next = !localPublicCatalog.is_active;
                  if (next && !localPublicCatalog.catalog_slug) {
                    const base = localSettings.store_name || localProfile.full_name || 'catalogo';
                    const generated = slugify(base) || `catalogo-${Math.floor(Math.random() * 9000 + 1000)}`;
                    setLocalPublicCatalog({ ...localPublicCatalog, catalog_slug: generated, is_active: true });
                    return;
                  }
                  setLocalPublicCatalog({ ...localPublicCatalog, is_active: next });
                }}
                className={`w-14 h-8 rounded-full relative transition-all duration-300 ${localPublicCatalog.is_active ? 'bg-primary' : 'bg-slate-200'}`}
              >
                <div className={`absolute top-1 size-6 bg-white rounded-full shadow-md transition-all duration-300 ${localPublicCatalog.is_active ? 'right-1' : 'left-1'}`}></div>
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Slug do Catálogo</label>
              <div className="flex gap-2">
                <input
                  className="flex-1 h-12 px-4 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-primary outline-none transition-all font-bold text-sm"
                  placeholder="ex: minha-loja"
                  value={localPublicCatalog.catalog_slug}
                  onChange={(e) => setLocalPublicCatalog({ ...localPublicCatalog, catalog_slug: slugify(e.target.value) })}
                />
                <button
                  onClick={() => {
                    const base = localSettings.store_name || localProfile.full_name || 'catalogo';
                    const generated = slugify(base) || `catalogo-${Math.floor(Math.random() * 9000 + 1000)}`;
                    setLocalPublicCatalog({ ...localPublicCatalog, catalog_slug: generated });
                  }}
                  className="h-12 px-4 rounded-xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest"
                >
                  Gerar
                </button>
              </div>
              <p className="text-[10px] font-bold text-slate-400 px-1">
                Link: {publicCatalogLink || '—'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={sharePublicLink}
                disabled={!publicCatalogLink || !localPublicCatalog.is_active}
                className="h-12 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send size={16} /> Compartilhar
              </button>
              <button
                onClick={() => {
                  if (!publicCatalogLink) return;
                  window.open(publicCatalogLink, '_blank');
                }}
                disabled={!publicCatalogLink || !localPublicCatalog.is_active}
                className="h-12 rounded-2xl bg-slate-100 text-slate-700 font-black text-xs uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Eye size={16} /> Abrir
              </button>
            </div>
          </section>

          {/* Diagnóstico */}
          <section className="bg-slate-900 rounded-3xl p-6 shadow-xl shadow-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-white uppercase tracking-widest">Status da Conexão</h4>
              <Shield size={20} className="text-primary" />
            </div>
            <p className="text-[10px] text-slate-400 font-bold leading-relaxed uppercase">
              Verifique se o armazenamento de imagens e o banco de dados estão operando corretamente.
            </p>
            <button 
              onClick={runDiagnostic}
              className="w-full py-3 bg-white/10 text-white font-black rounded-xl hover:bg-white/20 transition-all text-xs uppercase tracking-widest"
            >
              Executar Diagnóstico
            </button>
            {testResult && (
              <div className={`p-3 rounded-xl text-[10px] font-mono break-all ${testResult.includes('Erro') ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>
                {testResult}
              </div>
            )}
          </section>

          {/* Botões de Ação */}
          <div className="pt-4 space-y-3">
            <button 
              onClick={handleSaveSettings}
              disabled={isSavingSettings}
              className="w-full h-16 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
            >
              <CheckCircle size={24} />
              {isSavingSettings ? 'Salvando...' : 'Salvar Configurações'}
            </button>
            
            <button 
              onClick={async () => {
                try {
                  await getSupabase().auth.signOut();
                } finally {
                  navigate('login');
                }
              }} 
              className="w-full h-14 bg-red-50 text-red-500 rounded-2xl font-black flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <LogOut size={20} /> Sair do Sistema
            </button>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  };

  const renderPage = () => {
    if (!isConfigured) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center relative z-[100]">
          <div className="size-20 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-red-100/50">
            <AlertCircle size={40} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Configuração Necessária</h1>
          <p className="text-slate-500 font-bold mb-8 leading-relaxed">
            As variáveis de ambiente do Supabase não foram encontradas. 
            Se você está na Vercel, adicione <strong>VITE_SUPABASE_URL</strong> e <strong>VITE_SUPABASE_ANON_KEY</strong> nas configurações do projeto.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black shadow-lg active:scale-95 transition-all"
          >
            Tentar Novamente
          </button>
        </div>
      );
    }

    switch (currentPage) {
      case 'login': return <LoginPage />;
      case 'register': return <RegisterPage />;
      case 'recover-password': return <RecoverPasswordPage />;
      case 'verify-email': return <VerifyEmailPage />;
      case 'public-catalog': return <PublicCatalogPage />;
      case 'dashboard': return <DashboardPage />;
      case 'products': return <ProductsPage />;
      case 'product-form': return <ProductFormPage />;
      case 'clients': return <ClientsPage />;
      case 'client-form': return <ClientFormPage />;
      case 'orders': return <OrdersPage />;
      case 'order-form': return <OrderFormPage />;
      case 'finance': return <FinancePage />;
      case 'catalog': return <CatalogPage />;
      case 'cart': return <CartPage />;
      case 'checkout': return <CheckoutPage />;
      case 'settings': return <SettingsPage />;
      default: return <DashboardPage />;
    }
  };

  return (
    <div 
      className={`max-w-md mx-auto min-h-screen shadow-2xl relative font-sans transition-colors duration-300 ${userAppConfig.dark_mode ? 'dark bg-slate-900' : 'bg-white'}`}
      style={{ '--primary': userAppConfig.theme_color } as React.CSSProperties}
    >
      <style>{`
        :root { --primary-color: ${userAppConfig.theme_color}; }
        .text-primary { color: var(--primary-color) !important; }
        .bg-primary { background-color: var(--primary-color) !important; }
        .border-primary { border-color: var(--primary-color) !important; }
        .ring-primary { --tw-ring-color: var(--primary-color) !important; }
        .shadow-primary\\/20 { --tw-shadow-color: ${userAppConfig.theme_color}33 !important; }
        .shadow-primary\\/30 { --tw-shadow-color: ${userAppConfig.theme_color}4D !important; }
      `}</style>
      {renderPage()}
    </div>
  );
}
