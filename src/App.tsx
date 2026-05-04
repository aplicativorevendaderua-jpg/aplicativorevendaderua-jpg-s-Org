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
  ExternalLink,
  Download,
  Tag,
  Percent,
  Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Page, Product, Client, Order, OrderStatus, Category, ProductVariation, AppSettings, UserAppConfig, BackupEntry, UserProfile, PublicCatalog, StockHistory, Transaction, FinanceSummary, Promotion, PaymentAdjustment, WhatsAppConfig, WhatsAppMessageLog } from './types';
import { supabaseService } from './services/supabaseService';
import { getSupabase, isSupabaseConfigured } from './lib/supabase';
import { clearAppBadge, ensurePushSubscription, listenToServiceWorkerMessages, requestBadgeCountFromServiceWorker, setAppBadge } from './lib/pushNotifications';

function generateBoletoLine(amount: number) {
  const valueStr = Math.floor(amount * 100).toString().padStart(10, '0');
  return `34191.09008 63396.832742 71325.430006 1 ${valueStr}`;
}

function generatePixPayload(pixKey: string, amount: number, merchantName: string = 'LOJA', merchantCity: string = 'CIDADE', txId: string = '***') {
  const sanitize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9 ]/g, "").substring(0, 25);
  merchantName = sanitize(merchantName).toUpperCase() || 'LOJA';
  merchantCity = sanitize(merchantCity).toUpperCase() || 'CIDADE';

  // Sanitize PIX Key
  let cleanKey = pixKey.trim();
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanKey);
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanKey);
  
  if (!isEmail && !isUUID) {
    const numbers = cleanKey.replace(/\D/g, '');
    if (numbers.length === 11) {
      if (cleanKey.includes('(') || cleanKey.includes(')')) {
        cleanKey = '+55' + numbers;
      } else {
        cleanKey = numbers; 
      }
    } else if (numbers.length === 14) {
      cleanKey = numbers;
    } else if (numbers.length === 12 || numbers.length === 13) {
      cleanKey = '+' + numbers;
    } else {
      cleanKey = cleanKey.replace(/\s/g, '');
    }
  }

  const amountStr = amount.toFixed(2);
  const formatField = (id: string, value: string) => {
    const len = value.length.toString().padStart(2, '0');
    return `${id}${len}${value}`;
  };

  const gui = formatField('00', 'br.gov.bcb.pix');
  const key = formatField('01', cleanKey);
  const merchantAccountInfo = formatField('26', gui + key);
  const additionalData = formatField('62', formatField('05', txId));

  let payload = [
    formatField('00', '01'),
    merchantAccountInfo,
    formatField('52', '0000'),
    formatField('53', '0986'),
    formatField('54', amountStr),
    formatField('58', 'BR'),
    formatField('59', merchantName),
    formatField('60', merchantCity),
    additionalData,
    '6304'
  ].join('');

  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= (payload.charCodeAt(i) << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = (crc << 1);
      }
      crc &= 0xFFFF;
    }
  }
  return payload + crc.toString(16).toUpperCase().padStart(4, '0');
}

export default function App() {
  const [isConfigured] = useState(isSupabaseConfigured());
  useEffect(() => {
    console.log('App initialization - Configured:', isConfigured);
  }, [isConfigured]);
  const [reduceMotion] = useState(() => {
    try {
      return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    } catch {
      return false;
    }
  });
  const [currentPage, setCurrentPage] = useState<Page>('login');
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [paymentAdjustments, setPaymentAdjustments] = useState<PaymentAdjustment[]>([]);
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
  const [publicCatalogInfo, setPublicCatalogInfo] = useState<{ store_name: string; store_logo: string | null; theme_color: string | null; store_phone?: string | null; store_address?: string | null; tax_id?: string | null; instagram?: string | null; facebook?: string | null; tiktok?: string | null; pix_key?: string | null } | null>(null);
  const [publicCatalogProducts, setPublicCatalogProducts] = useState<Array<{ id: string; name: string; category: string; sale_price: number; image: string; description: string; available: boolean; stock: number }>>([]);
  const [publicCatalogSearch, setPublicCatalogSearch] = useState('');
  const [publicCatalogIsLoading, setPublicCatalogIsLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [cart, setCart] = useState<{ productId: string; variationId?: string; quantity: number }[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedProductForVariation, setSelectedProductForVariation] = useState<Product | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderToEdit, setOrderToEdit] = useState<Order | null>(null);
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
  const [replenishingProduct, setReplenishingProduct] = useState<Product | null>(null);
  const [viewingHistory, setViewingHistory] = useState<Product | null>(null);
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
  const [swBadgeCount, setSwBadgeCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showInstallCard, setShowInstallCard] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'default' | 'granted' | 'denied'>('default');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('flux_notifications');
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) setNotifications(parsed);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('flux_notifications', JSON.stringify(notifications.slice(0, 50)));
    } catch {}
  }, [notifications]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const cleanup = listenToServiceWorkerMessages({
      onBadgeCount: (count) => setSwBadgeCount(count),
    });
    requestBadgeCountFromServiceWorker();
    return cleanup;
  }, []);

  useEffect(() => {
    const unread = notifications.filter(n => !n.read).length;
    const effective = Math.max(unread, swBadgeCount);
    if (effective > 0) {
      setAppBadge(effective);
    } else {
      clearAppBadge();
    }
  }, [notifications, swBadgeCount]);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('Este navegador não suporta notificações.');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        console.log('Permissão para notificações concedida!');
        new Notification('FLUX', {
          body: 'Notificações ativadas! Você receberá alertas de novos pedidos.',
          icon: '/icon.png',
          badge: '/icon.png'
        });
        if (userProfile.id) {
          ensurePushSubscription(getSupabase(), userProfile.id).catch(() => {});
        }
      }
    } catch (error) {
      console.error('Erro ao solicitar permissão de notificações:', error);
    }
  };

  const sendLocalNotification = (title: string, body: string, data?: { orderId?: string }) => {
    if (notificationPermission === 'granted' && 'Notification' in window) {
      const n = new Notification(title, {
        body,
        icon: '/icon.png',
        badge: '/pwa-72x72.png',
        tag: data?.orderId ? `order-${data.orderId}` : `flux-${Date.now()}`,
        renotify: true,
        requireInteraction: true,
        silent: false,
        data
      } as NotificationOptions);
      n.onclick = () => {
        window.focus();
        if (data?.orderId) navigate('orders');
      };
    }
  };

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (!userProfile.id) return;
    if (notificationPermission !== 'granted') return;
    if (userAppConfig && userAppConfig.notifications_enabled === false) return;
    ensurePushSubscription(getSupabase(), userProfile.id).catch(() => {});
  }, [userProfile.id, notificationPermission, userAppConfig?.notifications_enabled]);

  useEffect(() => {
    // Detectar iOS
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIosDevice);

    window.addEventListener('beforeinstallprompt', (e: any) => {
      console.log('PWA: beforeinstallprompt fired');
      e.preventDefault();
      setDeferredPrompt(e);
    });

    // Se for iOS e não estiver instalado, OU se o app demorar para disparar o prompt, mostramos um botão manual nos ajustes
    if (isIosDevice && !(window.navigator as any).standalone) {
      // Logic for iOS install manual display if needed
    }

    // DEBUG: Forçar exibição do card após 5 segundos se não estiver instalado para teste
    const timer = setTimeout(() => {
      if (!window.matchMedia('(display-mode: standalone)').matches && !deferredPrompt) {
        console.log('App not installed yet');
      }
    }, 5000);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      if (isIOS) {
        alert('Para instalar no iPhone:\n1. Clique no ícone de compartilhar (quadrado com seta)\n2. Role para baixo e selecione "Adicionar à Tela de Início".');
      } else {
        alert('Para instalar no Android/PC:\n1. Clique nos três pontos (menu) do navegador\n2. Selecione "Instalar Aplicativo" ou "Adicionar à Tela Inicial".');
      }
      return;
    }
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstallCard(false);
      
      setTimeout(() => {
        requestNotificationPermission();
      }, 1000);
    }
  };

  const currentCatalogLink = useMemo(() => {
    if (!publicCatalog?.catalog_slug) return '';
    return `${window.location.origin}/#/c/${encodeURIComponent(publicCatalog.catalog_slug)}`;
  }, [publicCatalog]);

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
            if (userAppConfig && userAppConfig.notifications_enabled === false) return;
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

            const notification: any = {
              id: Math.random().toString(36).substring(2, 9),
              title: `Pedido de ${customerName}`,
              message: `Olá ${userProfile.full_name || 'Representante'}, você tem um novo pedido, venha conferir.`,
              date: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              read: false,
              orderId: newOrder.id,
              items: orderItems,
              total: Number(newOrder.total),
              isNewClient: !newOrder.client_id
            };
            
            sendLocalNotification(notification.title, notification.message, { orderId: newOrder.id });
            setNotifications((prev: any[]) => [notification, ...prev]);
            fetchOrdersOnly();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile.id, userAppConfig?.notifications_enabled, notificationPermission]);

  const selectedClient = useMemo(() => 
    clients.find((c: Client) => c.id === selectedClientId) || null
  , [clients, selectedClientId]);

  const fetchDataInFlightRef = useRef(false);
  const fetchData = async (opts?: { silent?: boolean }) => {
    if (fetchDataInFlightRef.current) return;
    fetchDataInFlightRef.current = true;
    if (!opts?.silent) setIsLoading(true);
    try {
      // Usar catch individual para cada promise para evitar que uma falha trave todo o app
      const [
        productsData, 
        clientsData, 
        ordersData, 
        categoriesData, 
        settingsData, 
        appConfigData, 
        profileData, 
        publicCatalogData
      ] = await Promise.all([
        supabaseService.getProductsLite().catch(() => [] as Product[]),
        supabaseService.getClientsLite().catch(() => [] as Client[]),
        supabaseService.getOrdersLite().catch(() => [] as Order[]),
        supabaseService.getCategories().catch(() => [] as Category[]),
        supabaseService.getSettings().catch(() => null),
        supabaseService.getAppConfig().catch(() => null),
        supabaseService.getProfile().catch(() => null),
        supabaseService.getPublicCatalog().catch(() => null)
      ]);

      setProducts(productsData);
      setClients(clientsData);
      setOrders(ordersData);
      setCategories(categoriesData);
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
      if (!opts?.silent) setIsLoading(false);
      fetchDataInFlightRef.current = false;
    }
  };

  const fetchOrdersOnly = async () => {
    const data = await supabaseService.getOrdersLite().catch(() => [] as Order[]);
    setOrders(data);
  };

  const backupsLoadedRef = useRef(false);
  const loadBackups = async () => {
    if (backupsLoadedRef.current) return;
    backupsLoadedRef.current = true;
    const data = await supabaseService.getBackups().catch(() => [] as BackupEntry[]);
    setBackups(data);
  };

  const promotionsLoadedRef = useRef(false);
  const loadPromotions = async () => {
    if (promotionsLoadedRef.current) return;
    promotionsLoadedRef.current = true;
    const data = await supabaseService.getPromotions().catch(() => [] as Promotion[]);
    setPromotions(data);
  };

  const adjustmentsLoadedRef = useRef(false);
  const loadPaymentAdjustments = async () => {
    if (adjustmentsLoadedRef.current) return;
    adjustmentsLoadedRef.current = true;
    const data = await supabaseService.getPaymentAdjustments().catch(() => [] as PaymentAdjustment[]);
    setPaymentAdjustments(data);
  };

  useEffect(() => {
    if (currentPage === 'settings') {
      loadBackups();
    }
    if (currentPage === 'promotions' || currentPage === 'catalog' || currentPage === 'order-form') {
      loadPromotions();
      loadPaymentAdjustments();
    }
  }, [currentPage]);

  const fetchPublicCatalog = async (slug: string) => {
    setPublicCatalogIsLoading(true);
    setPublicCatalogSlug(slug);
    try {
      const [info, products, promotionsData, adjustmentsData] = await Promise.all([
        supabaseService.getPublicCatalogInfo(slug),
        supabaseService.getPublicCatalogProducts(slug),
        supabaseService.getPublicPromotions(slug).catch(() => [] as Promotion[]),
        supabaseService.getPublicPaymentAdjustments(slug).catch(() => [] as PaymentAdjustment[])
      ]);
      setPublicCatalogInfo(info);
      setPublicCatalogProducts(products);
      setPromotions(promotionsData);
      setPaymentAdjustments(adjustmentsData);
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

  const ensureProductVariationsLoaded = async (product: Product) => {
    if (Array.isArray(product.variations)) return product;
    const variations = await supabaseService.getProductVariations(product.id).catch(() => [] as ProductVariation[]);
    const updated: Product = { ...product, variations };
    setProducts((prev: Product[]) => prev.map((p: Product) => p.id === product.id ? updated : p));
    return updated;
  };



  const cartItemsCount = useMemo(() => {
    return cart.reduce((acc: number, item: { quantity: number }) => acc + item.quantity, 0);
  }, [cart]);

  const updateCartQuantity = (productId: string, quantity: number, variationId?: string) => {
    setCart((prev: Array<{ productId: string; variationId?: string; quantity: number }>) => {
      const existing = prev.find(i => i.productId === productId && i.variationId === variationId);
      if (existing) {
        if (quantity <= 0) return prev.filter(i => !(i.productId === productId && i.variationId === variationId));
        return prev.map(i => (i.productId === productId && i.variationId === variationId) ? { ...i, quantity } : i);
      }
      if (quantity <= 0) return prev;
      return [...prev, { productId, variationId, quantity }];
    });
  };

  const removeFromCart = (productId: string, variationId?: string) => {
    setCart((prev: Array<{ productId: string; variationId?: string; quantity: number }>) => prev.filter(item => !(item.productId === productId && item.variationId === variationId)));
  };

  const clearCart = () => setCart([]);

  const cartWithDetails = useMemo(() => {
    return cart.map((item: { productId: string; variationId?: string; quantity: number }) => {
      const product = products.find((p: Product) => p.id === item.productId);
      if (!product) return null;
      
      let price = product.sale_price;
      let variationName = '';
      
      if (item.variationId && product.variations) {
        const variation = product.variations.find((v: ProductVariation) => v.id === item.variationId);
        if (variation) {
          price += (variation.additional_price || 0);
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
    }).filter((item): item is (Product & { variationId?: string; variationName: string; quantity: number; total: number; price: number }) => item !== null);
  }, [cart, products]);

  const cartSubtotal = useMemo(() => {
    return cartWithDetails.reduce((acc: number, item: { total: number }) => acc + item.total, 0);
  }, [cartWithDetails]);

  const activePromotion = useMemo(() => {
    // Busca a melhor promoção ativa (por enquanto pega a primeira)
    return promotions.find((p: Promotion) => p.active && cartSubtotal >= (p.min_order_value || 0)) || null;
  }, [promotions, cartSubtotal]);

  const promotionDiscount = useMemo(() => {
    if (!activePromotion) return 0;
    
    let applicableSubtotal = 0;
    cartWithDetails.forEach((item: any) => {
      let applies = false;
      if (!activePromotion.apply_to || activePromotion.apply_to === 'all') applies = true;
      else if (activePromotion.apply_to === 'category' && item.category === activePromotion.target_id) applies = true;
      else if (activePromotion.apply_to === 'product' && item.id === activePromotion.target_id) applies = true;
      
      if (applies) applicableSubtotal += item.total;
    });

    if (applicableSubtotal === 0) return 0;

    if (activePromotion.type === 'percentage') {
      return Number(((applicableSubtotal * activePromotion.value) / 100).toFixed(2));
    }
    return Math.min(activePromotion.value, applicableSubtotal);
  }, [activePromotion, cartWithDetails]);

  const totalAfterPromotion = useMemo(() => Math.max(0, cartSubtotal - promotionDiscount), [cartSubtotal, promotionDiscount]);

  const getPaymentAdjustment = (method: string) => {
    const adj = paymentAdjustments.find((a: PaymentAdjustment) => a.active && a.method === method);
    if (!adj) return 0;
    
    let value = 0;
    if (adj.adjustment_type === 'percentage') {
      value = Number(((totalAfterPromotion * adj.value) / 100).toFixed(2));
    } else {
      value = adj.value;
    }
    
    return adj.type === 'fee' ? value : -value;
  };

  // --- Components ---

  const Sidebar = () => {
    const navItems = [
      { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
      { id: 'products', label: 'Produtos', icon: Package },
      { id: 'orders', label: 'Pedidos', icon: ShoppingCart },
      { id: 'clients', label: 'Clientes', icon: Users },
      { id: 'promotions', label: 'Promoções', icon: Tag },
      { id: 'finance', label: 'Finanças', icon: BarChart3 },
      { id: 'settings', label: 'Ajustes', icon: Settings },
    ];

    return (
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-100 h-screen sticky top-0 p-6 overflow-y-auto">
        <div className="flex justify-center mb-10 px-2">
          <img src="/logo.png" alt="FLUX" className="h-20 w-auto object-contain" onError={(e) => {
            (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="%23137fec" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>';
          }} />
        </div>

        <nav className="flex-1 space-y-2">
          {currentCatalogLink && (
            <button
              onClick={() => window.open(currentCatalogLink, '_blank')}
              className="flex items-center gap-4 w-full p-4 rounded-2xl transition-all duration-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 mb-4 border border-indigo-100/50"
            >
              <Globe size={20} strokeWidth={2.5} />
              <span className="text-xs font-black uppercase tracking-widest text-left">Ver Catálogo</span>
              <ExternalLink size={14} className="ml-auto opacity-50" />
            </button>
          )}
          {navItems.map((item) => {
            const isActive = currentPage === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id as Page)}
                className={`
                  flex items-center gap-4 w-full p-4 rounded-2xl transition-all duration-200 group
                  ${isActive ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
                `}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className={isActive ? '' : 'group-hover:scale-110 transition-transform'} />
                <span className="text-xs font-black uppercase tracking-widest">{item.label}</span>
                {isActive && <div className="ml-auto size-1.5 bg-white rounded-full" />}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-50">
          <button 
            onClick={async () => {
              try {
                await getSupabase().auth.signOut();
              } finally {
                navigate('login');
              }
            }}
            className="flex items-center gap-4 w-full p-4 rounded-2xl text-red-500 hover:bg-red-50 transition-all group"
          >
            <LogOut size={20} />
            <span className="text-xs font-black uppercase tracking-widest">Sair</span>
          </button>
        </div>
      </aside>
    );
  };

  const BottomNav = () => {
    const mainItems = [
      { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
      { id: 'products', label: 'Produtos', icon: Package },
      { id: 'orders', label: 'Pedidos', icon: ShoppingCart },
    ];

    const moreItems = [
      { id: 'clients', label: 'Clientes', icon: Users },
      { id: 'promotions', label: 'Promoções', icon: Tag },
      { id: 'finance', label: 'Finanças', icon: BarChart3 },
      { id: 'settings', label: 'Ajustes', icon: Settings },
    ];

    const isMoreActive = moreItems.some(item => currentPage === item.id);

    return (
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-100 px-2 pb-8 pt-3 z-50 md:hidden">
        <div className="flex items-center justify-between max-w-lg mx-auto relative">
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
    const [completedOrder, setCompletedOrder] = useState<any>(null);

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

    const cartSubtotal = useMemo(() => {
      return publicCatalogProductsWithDetails.reduce((acc, item: any) => acc + item.total, 0);
    }, [publicCatalogProductsWithDetails]);

    const activePromotion = useMemo(() => {
      return promotions.find(p => p.active && cartSubtotal >= (p.min_order_value || 0)) || null;
    }, [promotions, cartSubtotal]);

    const promotionDiscount = useMemo(() => {
      if (!activePromotion) return 0;
      
      let applicableSubtotal = 0;
      publicCatalogProductsWithDetails.forEach((item: any) => {
        let applies = false;
        if (!activePromotion.apply_to || activePromotion.apply_to === 'all') applies = true;
        else if (activePromotion.apply_to === 'category' && item.category === activePromotion.target_id) applies = true;
        else if (activePromotion.apply_to === 'product' && item.id === activePromotion.target_id) applies = true;
        
        if (applies) applicableSubtotal += item.total;
      });

      if (applicableSubtotal === 0) return 0;

      if (activePromotion.type === 'percentage') {
        return Number(((applicableSubtotal * activePromotion.value) / 100).toFixed(2));
      }
      return Math.min(activePromotion.value, applicableSubtotal);
    }, [activePromotion, publicCatalogProductsWithDetails]);

    const totalAfterPromotion = useMemo(() => Math.max(0, cartSubtotal - promotionDiscount), [cartSubtotal, promotionDiscount]);

    const getPublicPaymentAdjustment = (method: string) => {
      const adj = paymentAdjustments.find((a: PaymentAdjustment) => a.active && a.method === method);
      if (!adj) return 0;
      
      let value = 0;
      if (adj.adjustment_type === 'percentage') {
        value = Number(((totalAfterPromotion * adj.value) / 100).toFixed(2));
      } else {
        value = adj.value;
      }
      
      return adj.type === 'fee' ? value : -value;
    };

    const paymentAdjustment = useMemo(() => getPublicPaymentAdjustment(paymentMethod), [paymentMethod, totalAfterPromotion, paymentAdjustments]);
    const cartTotal = useMemo(() => Math.max(0, totalAfterPromotion + paymentAdjustment), [totalAfterPromotion, paymentAdjustment]);

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
        
        // 1. Salvar no banco (isso já dispara notificação interna via realtime)
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
          notes: `${customerNotes.trim()}\nPromoção: ${activePromotion?.name || 'Nenhuma'} | Ajuste: R$ ${paymentAdjustment.toFixed(2)}`,
          items,
          should_register_client: shouldRegisterClient,
          total: cartTotal
        });

        // 2. Salvar dados para o Comprovante (Recibo)
        const storePhone = (publicCatalogInfo as any)?.store_phone || '';
        const receiptData = {
          orderId,
          storeName: publicCatalogInfo?.store_name || 'Catálogo',
          storePhone,
          date: new Date().toLocaleString('pt-BR'),
          customerName: customerName.trim(),
          customerContact: customerWhatsApp.trim() || customerPhone.trim(),
          address: customerRua ? `${customerRua.trim()}, ${customerNumero.trim()} - ${customerBairro.trim()}, ${customerCity.trim()}` : null,
          items: publicCatalogProductsWithDetails.map((i: any) => ({...i})),
          paymentMethod,
          paymentAdjustment,
          promotionDiscount,
          cartSubtotal,
          cartTotal,
          notes: customerNotes.trim(),
          pixKey: (publicCatalogInfo as any)?.pix_key || null
        };

        setCompletedOrder(receiptData);
        setPublicCart([]);
        setCheckoutOpen(false);
      } catch (error: any) {
        alert('Erro ao criar pedido: ' + (error.message || 'Erro desconhecido'));
      } finally {
        setIsPlacingOrder(false);
      }
    };

    const filtered = useMemo(() => {
      const q = publicCatalogSearch.toLowerCase();
      return publicCatalogProducts.filter(p => {
        const matchesSearch = (p.name?.toLowerCase() || '').includes(q) || (p.category?.toLowerCase() || '').includes(q);
        const matchesCategory = selectedCategory === 'Todas' || p.category === selectedCategory;
        return matchesSearch && matchesCategory;
      });
    }, [publicCatalogProducts, publicCatalogSearch, selectedCategory]);

    return (
      <div className={`min-h-screen bg-background-light transition-all duration-300 ${cartCount > 0 ? 'pb-36' : 'pb-10'}`}>
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-4 flex items-center justify-center">
          <div className="w-full max-w-3xl flex items-center justify-between">
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
          </div>
        </header>

        <main className="p-4 space-y-6 max-w-3xl mx-auto">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <div className="flex flex-col items-center text-center gap-3">
              {publicCatalogInfo?.store_logo ? (
                <img src={publicCatalogInfo.store_logo} alt="" className="size-20 rounded-2xl object-cover border border-slate-100 shadow-sm" />
              ) : (
                <div className="size-20 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/10">
                  <Store size={32} />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Loja Online</p>
                <p className="font-black text-xl text-slate-900 truncate">{publicCatalogInfo?.store_name || 'Catálogo'}</p>
                <p className="text-xs font-bold text-slate-400 truncate mt-1">Siga-nos para novidades</p>
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

          {promotions.filter(p => p.active).length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center md:justify-center gap-2 px-1">
                <Tag size={16} /> Promoções
              </h3>
              <div className="flex gap-3 md:justify-center overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 md:mx-0 md:px-0">
                {promotions.filter(p => p.active).map(p => (
                  <div key={p.id} className="min-w-[240px] bg-indigo-50 border border-indigo-100 rounded-2xl p-4 shrink-0 flex items-start gap-3 relative overflow-hidden">
                    <div className="absolute -right-4 -bottom-4 text-indigo-100 opacity-50">
                      <Percent size={80} />
                    </div>
                    <div className="size-10 bg-indigo-100 rounded-xl flex flex-col items-center justify-center text-indigo-600 relative z-10 shrink-0">
                      <Tag size={20} />
                    </div>
                    <div className="relative z-10">
                      <p className="font-black text-indigo-900 text-sm leading-tight mb-1">{p.name}</p>
                      <p className="text-[10px] font-bold text-indigo-700 uppercase">
                        {p.type === 'percentage' ? `${p.value}% OFF` : `R$ ${p.value.toFixed(2)} OFF`}
                        {p.apply_to === 'category' ? ` em ${p.target_id}` : ''}
                        {p.apply_to === 'product' ? ` em produtos selecionados` : ''}
                        {p.apply_to === 'all' || !p.apply_to ? ` em toda a loja` : ''}
                      </p>
                      {p.min_order_value > 0 && (
                        <p className="text-[9px] font-bold text-indigo-500 uppercase mt-1">
                          Acima de R$ {p.min_order_value.toLocaleString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex md:flex-wrap md:justify-center gap-2 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 md:mx-0 md:px-0">
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-6">
              {filtered.map(p => (
                <div 
                  key={p.id} 
                  onClick={() => setSelectedProductForVar(p)}
                  className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-200 flex flex-col cursor-pointer active:scale-[0.98] transition-all"
                >
                  <div className="relative aspect-square w-full bg-slate-100 overflow-hidden border-b border-slate-100">
                    <img src={p.image || 'https://picsum.photos/seed/public/500/500'} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    {p.stock <= 0 && (
                      <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center p-4">
                        <span className="bg-red-500 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-full shadow-lg">Esgotado</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex-1 flex flex-col items-center text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{p.category}</p>
                    <div className="min-h-[2.5rem] flex items-center justify-center w-full mb-1">
                      <h3 className="font-black text-slate-900 leading-tight line-clamp-2 text-sm">{p.name}</h3>
                    </div>
                    
                    {/* Unidade e Preço Unitário */}
                    <div className="flex flex-col items-center gap-1 mb-2">
                      <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md uppercase">
                        {p.unidade_medida || 'UN'}
                      </span>
                      {p.quantidade_unidade > 1 && (
                        <span className="text-[10px] font-bold text-slate-400">
                          (R$ {(Number(p.sale_price) / p.quantidade_unidade).toFixed(2)}/un)
                        </span>
                      )}
                    </div>

                    <div className="mt-auto pt-3 flex flex-col items-center gap-2 w-full">
                      <p className="text-primary font-black text-lg">R$ {Number(p.sale_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addToPublicCart(p);
                        }}
                        disabled={p.stock <= 0}
                        className="w-full h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-20 shadow-lg shadow-slate-900/20 text-xs font-black uppercase tracking-widest"
                      >
                        <Plus size={16} /> Adicionar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer do Catálogo */}
          <footer className="mt-12 mb-8 bg-white rounded-[2rem] p-8 md:p-10 shadow-sm border border-slate-200 flex flex-col items-center text-center space-y-8 relative overflow-hidden">
            {/* Decoração sutil no fundo */}
            <div className="absolute -top-24 -right-24 size-48 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-24 -left-24 size-48 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>

            {/* Título do Footer */}
            <div className="space-y-2 relative z-10">
              <h2 className="font-black text-slate-900 text-2xl tracking-tight">{publicCatalogInfo?.store_name || 'Catálogo Online'}</h2>
              {publicCatalogInfo?.tax_id && (
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">CNPJ/CPF: {publicCatalogInfo.tax_id}</p>
              )}
            </div>

            <div className="w-16 h-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent rounded-full mx-auto relative z-10"></div>

            {/* Informações de Contato */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg relative z-10">
              {publicCatalogInfo?.store_phone && (
                <a href={`https://wa.me/55${publicCatalogInfo.store_phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100 hover:border-slate-200 transition-all">
                  <div className="size-10 rounded-full bg-green-500 text-white flex items-center justify-center shrink-0">
                    <Phone size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">WhatsApp</p>
                    <p className="text-sm font-bold text-slate-700">{publicCatalogInfo.store_phone}</p>
                  </div>
                </a>
              )}
              {publicCatalogInfo?.store_address && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="size-10 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
                    <MapPin size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Endereço</p>
                    <p className="text-sm font-bold text-slate-700 leading-relaxed">{publicCatalogInfo.store_address}</p>
                  </div>
                </div>
              )}
              {publicCatalogInfo?.store_email && (
                <a href={`mailto:${publicCatalogInfo.store_email}`} className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100 hover:border-slate-200 transition-all">
                  <div className="size-10 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0">
                    <Mail size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">E-mail</p>
                    <p className="text-sm font-bold text-slate-700">{publicCatalogInfo.store_email}</p>
                  </div>
                </a>
              )}
              {publicCatalogInfo?.pix_key && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="size-10 rounded-full bg-purple-500 text-white flex items-center justify-center shrink-0">
                    <QrCode size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">PIX</p>
                    <p className="text-sm font-bold text-slate-700">{publicCatalogInfo.pix_key}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Redes Sociais */}
            {(publicCatalogInfo?.instagram || publicCatalogInfo?.facebook || publicCatalogInfo?.tiktok) && (
              <div className="space-y-4 relative z-10 w-full">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Siga-nos nas redes sociais</p>
                <div className="flex items-center justify-center gap-4">
                  {publicCatalogInfo.instagram && (
                    <a href={publicCatalogInfo.instagram.startsWith('http') ? publicCatalogInfo.instagram : `https://instagram.com/${publicCatalogInfo.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="size-14 rounded-2xl bg-slate-50 border border-slate-100 text-slate-600 flex items-center justify-center hover:-translate-y-2 hover:bg-gradient-to-tr hover:from-amber-500 hover:via-pink-500 hover:to-purple-500 hover:text-white transition-all duration-300 shadow-md hover:shadow-pink-500/40">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-6"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                    </a>
                  )}
                  {publicCatalogInfo.facebook && (
                    <a href={publicCatalogInfo.facebook.startsWith('http') ? publicCatalogInfo.facebook : `https://facebook.com/${publicCatalogInfo.facebook}`} target="_blank" rel="noreferrer" className="size-14 rounded-2xl bg-slate-50 border border-slate-100 text-slate-600 flex items-center justify-center hover:-translate-y-2 hover:bg-blue-600 hover:text-white transition-all duration-300 shadow-md hover:shadow-blue-600/40">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-6"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                    </a>
                  )}
                  {publicCatalogInfo.tiktok && (
                    <a href={publicCatalogInfo.tiktok.startsWith('http') ? publicCatalogInfo.tiktok : `https://tiktok.com/@${publicCatalogInfo.tiktok.replace('@', '')}`} target="_blank" rel="noreferrer" className="size-14 rounded-2xl bg-slate-50 border border-slate-100 text-slate-600 flex items-center justify-center hover:-translate-y-2 hover:bg-black hover:text-white transition-all duration-300 shadow-md hover:shadow-black/40">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-6"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path></svg>
                    </a>
                  )}
                </div>
              </div>
            )}

            <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent relative z-10"></div>

            {/* Seção do FLUX */}
            <div className="space-y-4 relative z-10 w-full">
              <div className="flex items-center justify-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-primary/5 to-indigo-50 border border-primary/10">
                <img src="/logo.png" alt="FLUX" className="h-12 w-auto object-contain" onError={(e) => {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="%23137fec" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>';
                }} />
                <div className="text-left">
                  <h3 className="font-black text-slate-800 text-lg">FLUX</h3>
                  <p className="text-xs font-bold text-slate-500">Sistema de Vendas e Catálogo Online</p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-bold text-slate-600">Quer ter seu próprio catálogo?</p>
                <p className="text-[11px] text-slate-500">Use o FLUX para gerenciar seu negócio, criar catálogos online e receber pedidos de forma simples e profissional.</p>
              </div>
            </div>
            
            <div className="pt-2 opacity-40 relative z-10">
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">© {new Date().getFullYear()} {publicCatalogInfo?.store_name || 'Catálogo Online'} • Todos os direitos reservados</p>
               <p className="text-[9px] font-bold text-slate-400 mt-1">Powered by FLUX</p>
            </div>
          </footer>
        </main>
        {/* MODAL DE DETALHES DO PRODUTO */}
        <AnimatePresence>
          {selectedProductForVar && (
            <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedProductForVar(null)} className="absolute inset-0 bg-black/60" />
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-md bg-white rounded-t-[32px] md:rounded-[32px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/40 rounded-full z-10 md:hidden" />
                
                <div className="overflow-y-auto no-scrollbar pb-10 md:pb-0">
                  {/* Imagem em Destaque */}
                  <div className="relative aspect-square w-full bg-slate-100">
                    <img 
                      src={selectedProductForVar.image || 'https://picsum.photos/seed/public/500/500'} 
                      alt={selectedProductForVar.name} 
                      className="w-full h-full object-cover" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Cabeçalho */}
                    <div className="text-center">
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">{selectedProductForVar.category}</p>
                      <h3 className="font-black text-2xl text-slate-900 leading-tight mb-2">{selectedProductForVar.name}</h3>
                      <p className="text-2xl font-black text-primary">R$ {Number(selectedProductForVar.sale_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedProductForVar.unidade_medida || 'Unidade'}</p>
                    </div>

                    {/* Descrição */}
                    {selectedProductForVar.description && (
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Descrição</p>
                        <p className="text-sm font-medium text-slate-600 leading-relaxed">{selectedProductForVar.description}</p>
                      </div>
                    )}

                    {/* Variações (se existirem) */}
                    {selectedProductForVar.variations && selectedProductForVar.variations.length > 0 ? (
                      <div className="space-y-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Opções Disponíveis</p>
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
            <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center md:p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCheckoutOpen(false)} className="absolute inset-0 bg-black/60" />
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-md md:max-w-2xl bg-white rounded-t-[32px] md:rounded-[32px] p-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 shrink-0 md:hidden" />
                
                <div className="overflow-y-auto no-scrollbar flex-1 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resumo do Pedido</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-black text-slate-900">R$ {cartTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        {promotionDiscount > 0 && <span className="text-xs font-bold text-green-600">(-R$ {promotionDiscount.toFixed(2)})</span>}
                      </div>
                    </div>
                    <button onClick={() => setCheckoutOpen(false)} className="p-2 rounded-2xl bg-slate-100 text-slate-700">
                      <XCircle size={24} />
                    </button>
                  </div>

                  {/* Detalhes de Preço */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                    <div className="flex justify-between text-xs font-bold text-slate-500">
                      <span>Subtotal Itens</span>
                      <span>R$ {cartSubtotal.toLocaleString('pt-BR')}</span>
                    </div>
                    {promotionDiscount > 0 && (
                      <div className="flex justify-between text-xs font-bold text-green-600">
                        <span>Desconto Promoção</span>
                        <span>- R$ {promotionDiscount.toLocaleString('pt-BR')}</span>
                      </div>
                    )}
                    {paymentAdjustment !== 0 && (
                      <div className={`flex justify-between text-xs font-bold ${paymentAdjustment > 0 ? 'text-red-500' : 'text-green-600'}`}>
                        <span>{paymentAdjustment > 0 ? 'Taxa' : 'Desconto'} Pagamento ({paymentMethod})</span>
                        <span>{paymentAdjustment > 0 ? '+' : '-'} R$ {Math.abs(paymentAdjustment).toLocaleString('pt-BR')}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                      <span>Total Final</span>
                      <span>R$ {cartTotal.toLocaleString('pt-BR')}</span>
                    </div>
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
                          <option value="Cartão Debito">Cartão de Débito</option>
                          <option value="Cartão Credito">Cartão de Crédito</option>
                          <option value="Boleto">Boleto</option>
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

        {/* COMPROVANTE (RECIBO) DO PEDIDO */}
        <AnimatePresence>
          {completedOrder && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-sm bg-white rounded-3xl shadow-2xl flex flex-col max-h-full overflow-hidden"
              >
                <div className="p-6 overflow-y-auto no-scrollbar" id="receipt-content">
                  <div className="text-center space-y-2 mb-6">
                    <div className="mx-auto w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2">
                      <CheckCircle size={32} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Pedido Enviado!</h2>
                    <p className="text-sm font-medium text-slate-500">
                      Loja será notificada em breve.
                    </p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
                    <div className="text-center pb-4 border-b border-slate-200 border-dashed">
                      <p className="font-black text-lg text-slate-900 uppercase tracking-tight">{completedOrder.storeName}</p>
                      <p className="text-xs font-bold text-slate-400 mt-1">{completedOrder.date}</p>
                    </div>
                    
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cliente</p>
                      <p className="font-bold text-sm text-slate-900">{completedOrder.customerName}</p>
                      <p className="text-xs font-medium text-slate-600">{completedOrder.customerContact}</p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Itens</p>
                      {completedOrder.items.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-xs font-medium text-slate-700">
                          <span className="truncate pr-2">{item.quantity}x {item.name} {item.variationName ? `(${item.variationName})` : ''}</span>
                          <span className="shrink-0 font-bold">R$ {item.total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-3 border-t border-slate-200 border-dashed space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-500">
                        <span>Subtotal</span>
                        <span>R$ {completedOrder.cartSubtotal.toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
                      </div>
                      {completedOrder.promotionDiscount > 0 && (
                        <div className="flex justify-between text-xs font-bold text-green-600">
                          <span>Desconto</span>
                          <span>-R$ {completedOrder.promotionDiscount.toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
                        </div>
                      )}
                      {completedOrder.paymentAdjustment !== 0 && (
                        <div className={`flex justify-between text-xs font-bold ${completedOrder.paymentAdjustment > 0 ? 'text-slate-500' : 'text-green-600'}`}>
                          <span>{completedOrder.paymentMethod}</span>
                          <span>{completedOrder.paymentAdjustment > 0 ? '+' : ''}R$ {completedOrder.paymentAdjustment.toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-black text-slate-900 pt-2">
                        <span>TOTAL</span>
                        <span>R$ {completedOrder.cartTotal.toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
                      </div>
                    </div>
                  </div>

                  {completedOrder.paymentMethod === 'Pix' && completedOrder.pixKey && (
                    <div className="bg-green-50 p-4 rounded-2xl border border-green-100 mt-4 space-y-3 flex flex-col items-center">
                      <p className="text-[10px] font-black text-green-700 uppercase tracking-widest text-center">Chave PIX da Loja</p>
                      
                      <div className="w-full space-y-2">
                        <div className="flex items-center justify-center bg-white px-4 py-4 rounded-xl border border-green-200 shadow-sm text-center">
                          <span className="font-black text-base text-slate-800 select-all break-all">
                            {completedOrder.pixKey}
                          </span>
                        </div>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(completedOrder.pixKey);
                            alert('Chave PIX copiada!');
                          }}
                          className="w-full h-12 flex items-center justify-center gap-2 bg-green-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20 active:scale-95"
                        >
                          Copiar Chave PIX
                        </button>
                      </div>
                    </div>
                  )}

                  {completedOrder.paymentMethod === 'Boleto' && (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mt-4 space-y-3 flex flex-col items-center relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-slate-900"></div>
                      <div className="flex items-center gap-2 mb-1">
                        <Banknote size={20} className="text-slate-900" />
                        <h4 className="font-black text-slate-900 uppercase tracking-widest text-xs">Boleto Bancário</h4>
                      </div>
                      
                      <div className="w-full space-y-3">
                        <div className="flex flex-col items-center justify-center bg-white px-4 py-4 rounded-xl border border-slate-200 shadow-sm text-center gap-3">
                          <div className="flex flex-col gap-1 items-center opacity-80">
                            <div className="flex h-12 items-end justify-center gap-[2px]">
                              {[2, 1, 3, 1, 1, 2, 4, 1, 2, 1, 1, 3, 2, 2, 1, 4, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 4, 2].map((w, i) => (
                                <div key={i} className="bg-slate-900" style={{ width: w + 'px', height: (i % 3 === 0 ? 100 : 80) + '%' }}></div>
                              ))}
                            </div>
                          </div>
                          
                          <span className="font-black text-xs md:text-sm text-slate-800 select-all break-all tracking-wider font-mono">
                            {generateBoletoLine(completedOrder.cartTotal)}
                          </span>
                        </div>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(generateBoletoLine(completedOrder.cartTotal));
                            alert('Código do boleto copiado!');
                          }}
                          className="w-full h-12 flex items-center justify-center gap-2 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20 active:scale-95"
                        >
                          Copiar Código
                        </button>
                      </div>
                      <p className="text-[9px] font-bold text-slate-400 text-center px-4 leading-tight mt-2">
                        Este é um boleto de demonstração. Em breve via Mercado Pago.
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-3 shrink-0">
                  <button 
                    onClick={() => {
                      const printContent = document.getElementById('receipt-content')?.innerHTML;
                      const originalContent = document.body.innerHTML;
                      if (printContent) {
                        document.body.innerHTML = `<div style="padding:20px;max-width:400px;margin:0 auto;font-family:sans-serif;">${printContent}</div>`;
                        window.print();
                        document.body.innerHTML = originalContent;
                        window.location.reload();
                      }
                    }}
                    className="w-full h-12 flex items-center justify-center gap-2 bg-slate-900 text-white rounded-xl font-bold uppercase tracking-widest text-xs transition-transform active:scale-95"
                  >
                    <Download size={16} />
                    Salvar PDF / Imprimir
                  </button>

                  <button 
                    onClick={() => {
                      let msg = `=================================\n`;
                      msg += `      COMPROVANTE DE PEDIDO      \n`;
                      msg += `=================================\n\n`;
                      msg += `*LOJA:* ${completedOrder.storeName}\n`;
                      msg += `*DATA:* ${completedOrder.date}\n`;
                      msg += `*PEDIDO:* #${completedOrder.orderId.split('-')[0].toUpperCase()}\n\n`;
                      
                      msg += `---------------------------------\n`;
                      msg += `*DADOS DO CLIENTE*\n`;
                      msg += `Nome: ${completedOrder.customerName}\n`;
                      msg += `Contato: ${completedOrder.customerContact}\n`;
                      if (completedOrder.address) {
                        msg += `Endereço: ${completedOrder.address}\n`;
                      }
                      msg += `\n`;
                      
                      msg += `---------------------------------\n`;
                      msg += `*ITENS DO PEDIDO*\n\n`;
                      completedOrder.items.forEach((item: any) => {
                        msg += `${item.quantity}x ${item.name} ${item.variationName ? `(${item.variationName})` : ''}\n`;
                        msg += `   R$ ${item.total.toLocaleString('pt-BR', {minimumFractionDigits:2})}\n`;
                      });
                      msg += `\n`;
                      
                      msg += `---------------------------------\n`;
                      msg += `*RESUMO*\n`;
                      msg += `Subtotal: R$ ${completedOrder.cartSubtotal.toLocaleString('pt-BR', {minimumFractionDigits:2})}\n`;
                      if (completedOrder.promotionDiscount > 0) {
                        msg += `Desconto: -R$ ${completedOrder.promotionDiscount.toLocaleString('pt-BR', {minimumFractionDigits:2})}\n`;
                      }
                      if (completedOrder.paymentAdjustment !== 0) {
                        msg += `Pgto (${completedOrder.paymentMethod}): ${completedOrder.paymentAdjustment > 0 ? '+' : ''}R$ ${completedOrder.paymentAdjustment.toLocaleString('pt-BR', {minimumFractionDigits:2})}\n`;
                      }
                      
                      msg += `\n`;
                      msg += `*TOTAL: R$ ${completedOrder.cartTotal.toLocaleString('pt-BR', {minimumFractionDigits:2})}*\n`;
                      msg += `=================================`;

                      if (completedOrder.notes) {
                        msg += `\n\n*OBSERVAÇÕES:*\n${completedOrder.notes}`;
                      }

                      // Codifica e abre no WhatsApp
                      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                    }}
                    id="btn-wa-share"
                    className="w-full h-12 flex items-center justify-center gap-2 bg-[#25D366] text-white rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-[#25D366]/20 transition-transform active:scale-95"
                  >
                    <Share2 size={16} />
                    Enviar para meu WhatsApp
                  </button>

                  <button 
                    onClick={() => setCompletedOrder(null)}
                    className="w-full h-12 flex items-center justify-center font-bold text-slate-500 uppercase tracking-widest text-xs"
                  >
                    Fechar
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
      <header className="mb-10 text-left flex flex-col">
        <img src="/logo.png" alt="FLUX" className="h-16 w-auto object-contain object-left mb-6" onError={(e) => {
          (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="%23137fec" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>';
        }} />
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Entrar</h1>
        <p className="text-slate-500 text-base leading-relaxed">
          Acesse sua conta no FLUX para gerenciar vendas e produtos.
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

    const startOfLocalDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const toDayKey = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    const parseOrderDate = (raw: string): Date | null => {
      if (!raw) return null;
      const value = String(raw).trim();
      if (!value) return null;

      const lower = value.toLowerCase();
      const now = new Date();
      if (lower.startsWith('hoje')) return startOfLocalDay(now);
      if (lower.startsWith('ontem')) {
        const d = startOfLocalDay(now);
        d.setDate(d.getDate() - 1);
        return d;
      }

      const br = value.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
      if (br) {
        const dd = Number(br[1]);
        const mm = Number(br[2]);
        const yyyy = Number(br[3].length === 2 ? `20${br[3]}` : br[3]);
        const d = new Date(yyyy, mm - 1, dd);
        if (!Number.isNaN(d.getTime())) return startOfLocalDay(d);
      }

      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) return startOfLocalDay(parsed);
      return null;
    };

    const todayStart = startOfLocalDay(currentTime);
    const todayKey = toDayKey(todayStart);

    const dashboard = useMemo(() => {
      const withDates = orders
        .map((order) => {
          const d = parseOrderDate(order.date);
          const day = d ? toDayKey(d) : null;
          return { order, date: d, day };
        })
        .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));

      const sumBy = (list: Array<{ order: Order }>) => list.reduce((acc, x) => acc + Number(x.order.total || 0), 0);
      const countBy = (predicate: (o: Order) => boolean) => orders.reduce((acc, o) => acc + (predicate(o) ? 1 : 0), 0);

      const todayOrders = withDates.filter(x => x.day === todayKey);
      const todayTotal = sumBy(todayOrders);

      const monthOrders = withDates.filter(x => x.date && x.date.getFullYear() === todayStart.getFullYear() && x.date.getMonth() === todayStart.getMonth());
      const monthTotal = sumBy(monthOrders);

      const totalAll = sumBy(withDates);
      const averageTicket = orders.length > 0 ? totalAll / orders.length : 0;

      const last7Start = new Date(todayStart);
      last7Start.setDate(last7Start.getDate() - 6);
      const prev7Start = new Date(todayStart);
      prev7Start.setDate(prev7Start.getDate() - 13);
      const prev7End = new Date(todayStart);
      prev7End.setDate(prev7End.getDate() - 7);

      const last7Orders = withDates.filter(x => x.date && x.date >= last7Start && x.date <= todayStart);
      const prev7Orders = withDates.filter(x => x.date && x.date >= prev7Start && x.date <= prev7End);
      const last7Total = sumBy(last7Orders);
      const prev7Total = sumBy(prev7Orders);
      const growth7 = prev7Total > 0 ? ((last7Total - prev7Total) / prev7Total) * 100 : (last7Total > 0 ? 100 : 0);

      const series7d = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(last7Start);
        d.setDate(d.getDate() + i);
        const key = toDayKey(d);
        const total = sumBy(withDates.filter(x => x.day === key));
        return { key, date: d, total };
      });

      const pendingCount = countBy(o => o.status === 'pending' || o.status === 'confirmed');
      const deliveredCount = countBy(o => o.status === 'delivered');
      const cancelledCount = countBy(o => o.status === 'cancelled');

      const unpaidCount = countBy(o => (o.paymentStatus && o.paymentStatus !== 'paid') || (!o.paymentStatus && (o.status === 'pending' || o.status === 'confirmed')));

      const lowStockProducts = products
        .filter(p => p.controla_estoque && Number(p.stock || 0) <= 5)
        .sort((a, b) => Number(a.stock || 0) - Number(b.stock || 0));

      const productRevenue = new Map<string, { productId: string; name: string; revenue: number; qty: number }>();
      for (const o of orders) {
        for (const item of (o.items || [])) {
          const pid = String(item.productId || '');
          if (!pid) continue;
          const qty = Number(item.quantity || 0);
          const revenue = qty * Number(item.price || 0);
          const current = productRevenue.get(pid) || { productId: pid, name: item.productName || 'Produto', revenue: 0, qty: 0 };
          current.revenue += revenue;
          current.qty += qty;
          if (item.productName) current.name = item.productName;
          productRevenue.set(pid, current);
        }
      }
      const topProducts = Array.from(productRevenue.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

      const clientRevenue = new Map<string, { clientId: string; name: string; revenue: number; ordersCount: number }>();
      for (const o of orders) {
        const cid = String(o.clientId || o.clientName || '');
        if (!cid) continue;
        const current = clientRevenue.get(cid) || { clientId: cid, name: o.clientName || 'Cliente', revenue: 0, ordersCount: 0 };
        current.revenue += Number(o.total || 0);
        current.ordersCount += 1;
        if (o.clientName) current.name = o.clientName;
        clientRevenue.set(cid, current);
      }
      const topClients = Array.from(clientRevenue.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

      const activeClients = clients.filter(c => c.active).length;
      const inactiveClients = clients.filter(c => !c.active).length;
      const activeProducts = products.filter(p => p.available).length;
      const outOfStock = products.filter(p => p.controla_estoque && Number(p.stock || 0) <= 0).length;
      const promotionsActive = promotions.filter(p => p.active).length;

      const insights: Array<{ id: string; level: 'alta' | 'media' | 'baixa'; title: string; detail: string; action?: { label: string; page: Page } }> = [];
      if (pendingCount > 0) {
        insights.push({
          id: 'pending',
          level: 'alta',
          title: 'Pedidos pendentes precisam de ação',
          detail: `${pendingCount} pedido(s) aguardando confirmação/entrega. Priorize os mais recentes.`,
          action: { label: 'Ir para Pedidos', page: 'orders' },
        });
      }
      if (unpaidCount > 0) {
        insights.push({
          id: 'unpaid',
          level: 'alta',
          title: 'Pagamentos pendentes detectados',
          detail: `${unpaidCount} pedido(s) ainda não estão marcados como pagos. Reduz risco de inadimplência.`,
          action: { label: 'Abrir Pedidos', page: 'orders' },
        });
      }
      if (lowStockProducts.length > 0) {
        const topLow = lowStockProducts.slice(0, 2).map(p => `${p.name} (${p.stock})`).join(', ');
        insights.push({
          id: 'stock',
          level: 'media',
          title: 'Estoque crítico em produtos importantes',
          detail: `${lowStockProducts.length} produto(s) com estoque baixo. Atenção: ${topLow}${lowStockProducts.length > 2 ? '…' : ''}`,
          action: { label: 'Ver Produtos', page: 'products' },
        });
      }
      if (orders.length === 0) {
        insights.push({
          id: 'first-sale',
          level: 'media',
          title: 'Sem pedidos ainda',
          detail: 'Cadastre produtos e clientes e faça a primeira venda para ativar as métricas do painel.',
          action: { label: 'Cadastrar Produto', page: 'product-form' },
        });
      } else if (todayTotal === 0) {
        insights.push({
          id: 'no-today',
          level: 'baixa',
          title: 'Nenhuma venda registrada hoje',
          detail: 'Considere acionar clientes recorrentes e reforçar promoções do dia.',
          action: { label: 'Ver Clientes', page: 'clients' },
        });
      }
      if (promotionsActive === 0) {
        insights.push({
          id: 'promo',
          level: 'baixa',
          title: 'Nenhuma promoção ativa',
          detail: 'Ative promoções para aumentar giro e ticket médio.',
          action: { label: 'Criar Promo', page: 'promotions' },
        });
      }
      if (growth7 < -10) {
        insights.push({
          id: 'drop',
          level: 'media',
          title: 'Queda na receita (7 dias)',
          detail: `Receita dos últimos 7 dias caiu ${Math.abs(growth7).toFixed(0)}% em relação aos 7 anteriores. Revise mix e abordagem.`,
          action: { label: 'Ver Caixa', page: 'finance' },
        });
      } else if (growth7 > 10) {
        insights.push({
          id: 'growth',
          level: 'baixa',
          title: 'Crescimento detectado (7 dias)',
          detail: `Receita dos últimos 7 dias subiu ${growth7.toFixed(0)}% em relação aos 7 anteriores. Repita as ações que funcionaram.`,
        });
      }

      return {
        todayTotal,
        monthTotal,
        totalAll,
        averageTicket,
        last7Total,
        growth7,
        series7d,
        pendingCount,
        deliveredCount,
        cancelledCount,
        unpaidCount,
        lowStockProducts,
        topProducts,
        topClients,
        activeClients,
        inactiveClients,
        activeProducts,
        outOfStock,
        promotionsActive,
        insights: insights.slice(0, 6),
      };
    }, [orders, products, clients, promotions, todayKey]);

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
            {currentCatalogLink && (
              <button 
                onClick={() => window.open(currentCatalogLink, '_blank')}
                className="relative p-3 rounded-2xl transition-all bg-primary/10 text-primary hover:bg-primary/20 flex items-center gap-2 group"
                title="Abrir Catálogo Público"
              >
                <Globe size={22} className="group-hover:rotate-12 transition-transform" />
                <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">Catálogo</span>
              </button>
            )}
            <button 
              onClick={() => {
                const next = !showNotifications;
                setShowNotifications(next);
                if (next) {
                  setSwBadgeCount(0);
                  clearAppBadge();
                }
              }}
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
                      onClick={() => {
                        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                        setSwBadgeCount(0);
                        clearAppBadge();
                      }}
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
        <section className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="col-span-2 md:col-span-2 p-6 rounded-[32px] bg-slate-900 text-white relative overflow-hidden shadow-xl shadow-slate-200">
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Faturamento (Mês Atual)</p>
                  <h3 className="text-4xl font-black mt-1">R$ {dashboard.monthTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                </div>
                <div className="size-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                  <TrendingUp size={24} className={dashboard.growth7 >= 0 ? 'text-green-400' : 'text-red-300'} />
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
                <div className="ml-auto px-2 py-1 rounded-lg bg-white/10 border border-white/10 text-[9px] font-black uppercase tracking-widest">
                  7D {dashboard.growth7 >= 0 ? '+' : ''}{dashboard.growth7.toFixed(0)}%
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
              <p className="text-lg font-black text-slate-900">R$ {dashboard.todayTotal.toLocaleString('pt-BR')}</p>
            </div>
          </div>

          <div className="p-5 rounded-[28px] bg-white border border-slate-100 shadow-sm flex flex-col justify-between h-32">
            <div className="size-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Target size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ticket Médio</p>
              <p className="text-lg font-black text-slate-900">R$ {dashboard.averageTicket.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
            </div>
          </div>

          <div className="p-5 rounded-[28px] bg-white border border-slate-100 shadow-sm flex flex-col justify-between h-32">
            <div className="size-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pendentes</p>
              <p className="text-lg font-black text-slate-900">{dashboard.pendingCount}</p>
            </div>
          </div>
        </section>

        {/* Alertas de Estoque Crítico */}
        {dashboard.lowStockProducts.length > 0 && (
          <section className="px-6 mb-6">
            <div className="p-4 rounded-3xl bg-red-50 border border-red-100 flex items-center gap-4">
              <div className="size-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertCircle size={24} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-black text-red-900 uppercase tracking-tight">Estoque Crítico!</p>
                <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest">
                  {dashboard.lowStockProducts.length} produtos com poucas unidades.
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

        <section className="px-6 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-6 rounded-[32px] bg-white border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Inteligência • Tendência 7 Dias</h3>
                  <p className="text-sm font-black text-slate-900 mt-1">R$ {dashboard.last7Total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className={`px-3 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest ${dashboard.growth7 >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {dashboard.growth7 >= 0 ? '+' : ''}{dashboard.growth7.toFixed(0)}%
                </div>
              </div>
              <div className="flex items-end gap-2 h-24">
                {(() => {
                  const max = Math.max(1, ...dashboard.series7d.map(d => d.total));
                  return dashboard.series7d.map(d => {
                    const height = Math.max(4, Math.round((d.total / max) * 96));
                    const isToday = toDayKey(d.date) === todayKey;
                    return (
                      <div key={d.key} className="flex-1 flex flex-col items-center gap-2">
                        <div className={`w-full rounded-2xl ${isToday ? 'bg-primary' : 'bg-slate-100'} transition-all`} style={{ height }} />
                        <span className="text-[9px] font-black text-slate-400 uppercase">{d.date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            <div className="p-6 rounded-[32px] bg-slate-900 text-white shadow-xl shadow-slate-200 relative overflow-hidden">
              <div className="relative z-10 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Central de Inteligência</h3>
                  <p className="text-lg font-black mt-2 leading-tight">Ações recomendadas com base nos seus dados</p>
                </div>
                <div className="size-12 rounded-2xl bg-white/10 flex items-center justify-center">
                  <Zap size={22} className="text-primary" />
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {dashboard.insights.length === 0 ? (
                  <div className="p-4 rounded-3xl bg-white/5 border border-white/10">
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Tudo certo por aqui</p>
                    <p className="text-sm font-black mt-1">Sem alertas críticos no momento.</p>
                  </div>
                ) : (
                  dashboard.insights.map((insight) => (
                    <div key={insight.id} className="p-4 rounded-3xl bg-white/5 border border-white/10 flex items-center gap-3">
                      <div className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                        insight.level === 'alta' ? 'bg-red-500/20 text-red-200' :
                        insight.level === 'media' ? 'bg-amber-500/20 text-amber-200' :
                        'bg-white/10 text-white/80'
                      }`}>
                        {insight.level}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black truncate">{insight.title}</p>
                        <p className="text-[10px] font-bold opacity-70 leading-relaxed mt-1">{insight.detail}</p>
                      </div>
                      {insight.action && (
                        <button
                          onClick={() => navigate(insight.action!.page)}
                          className="shrink-0 px-3 py-2 rounded-2xl bg-white text-slate-900 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
                        >
                          {insight.action.label}
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="absolute -left-20 -top-20 size-64 bg-primary/20 rounded-full blur-3xl"></div>
              <div className="absolute -right-20 -bottom-20 size-64 bg-blue-500/10 rounded-full blur-3xl"></div>
            </div>
          </div>
        </section>

        <section className="px-6 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="p-6 rounded-[32px] bg-white border border-slate-100 shadow-sm">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Operação</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Entregues</p>
                  <p className="text-xl font-black text-slate-900 mt-1">{dashboard.deliveredCount}</p>
                </div>
                <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cancelados</p>
                  <p className="text-xl font-black text-slate-900 mt-1">{dashboard.cancelledCount}</p>
                </div>
                <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Clientes</p>
                  <p className="text-xl font-black text-slate-900 mt-1">{dashboard.activeClients}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{dashboard.inactiveClients} inativos</p>
                </div>
                <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Produtos</p>
                  <p className="text-xl font-black text-slate-900 mt-1">{dashboard.activeProducts}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{dashboard.outOfStock} sem estoque</p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-[32px] bg-white border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Top Produtos</h3>
                <button onClick={() => navigate('products')} className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1">
                  Abrir <ChevronRight size={12} />
                </button>
              </div>
              <div className="space-y-3">
                {dashboard.topProducts.length === 0 ? (
                  <div className="p-10 text-center bg-slate-50 rounded-[28px] border border-dashed border-slate-200">
                    <Package size={28} className="mx-auto text-slate-200 mb-2" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sem dados suficientes</p>
                  </div>
                ) : (
                  dashboard.topProducts.map((p) => (
                    <div key={p.productId} className="flex items-center justify-between p-3 rounded-3xl bg-slate-50 border border-slate-100">
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-900 truncate">{p.name}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{p.qty} un</p>
                      </div>
                      <p className="text-xs font-black text-slate-900">R$ {p.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-6 rounded-[32px] bg-white border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Top Clientes</h3>
                <button onClick={() => navigate('clients')} className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1">
                  Abrir <ChevronRight size={12} />
                </button>
              </div>
              <div className="space-y-3">
                {dashboard.topClients.length === 0 ? (
                  <div className="p-10 text-center bg-slate-50 rounded-[28px] border border-dashed border-slate-200">
                    <Users size={28} className="mx-auto text-slate-200 mb-2" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sem dados suficientes</p>
                  </div>
                ) : (
                  dashboard.topClients.map((c) => (
                    <div key={c.clientId} className="flex items-center justify-between p-3 rounded-3xl bg-slate-50 border border-slate-100">
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-900 truncate">{c.name}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{c.ordersCount} pedido(s)</p>
                      </div>
                      <p className="text-xs font-black text-slate-900">R$ {c.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.slice(0, 6).map(order => (
              <div 
                key={order.id} 
                onClick={() => setSelectedOrder(order)}
                className="p-4 rounded-3xl bg-white border border-slate-100 shadow-sm hover:border-primary/20 transition-all active:scale-[0.98] cursor-pointer"
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
    const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
    const [bulkCsvFile, setBulkCsvFile] = useState<File | null>(null);
    const [bulkImageFiles, setBulkImageFiles] = useState<File[]>([]);
    const [isBulkImporting, setIsBulkImporting] = useState(false);
    const [bulkImportProgress, setBulkImportProgress] = useState<{ total: number; processed: number; added: number; skipped: number; failed: number } | null>(null);
    const [bulkImportMessages, setBulkImportMessages] = useState<string[]>([]);

    const categoriesList = useMemo(() => ['Todas', ...Array.from(new Set(products.map(p => p.category)))].sort(), [products]);

    const filtered = useMemo(() => {
      const q = search.toLowerCase();
      return products.filter(p => {
        const matchesSearch = (p.name?.toLowerCase() || '').includes(q);
        const matchesCategory = filterCategory === 'Todas' || p.category === filterCategory;
        return matchesSearch && matchesCategory;
      });
    }, [products, search, filterCategory]);

    const toggleSelection = (id: string) => {
      setSelectedProducts(prev => 
        prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
      );
    };

    const toggleAll = () => {
      if (selectedProducts.length === filtered.length && filtered.length > 0) {
        setSelectedProducts([]);
      } else {
        setSelectedProducts(filtered.map(p => p.id));
      }
    };

    const handleBulkAvailability = async (available: boolean) => {
      if (selectedProducts.length === 0) return;
      try {
        await supabaseService.updateProductsAvailability(selectedProducts, available);
        setProducts(prev => prev.map(p => selectedProducts.includes(p.id) ? { ...p, available } : p));
        setSelectedProducts([]);
      } catch (e) {
        alert('Erro ao atualizar produtos.');
      }
    };

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

    const downloadTextFile = (filename: string, content: string, mime: string) => {
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    };

    const csvEscape = (value: any, delimiter: string) => {
      const s = String(value ?? '');
      const needs = s.includes('"') || s.includes('\n') || s.includes('\r') || s.includes(delimiter);
      if (!needs) return s;
      return `"${s.replace(/"/g, '""')}"`;
    };

    const handleDownloadProductsTemplate = () => {
      const delimiter = ';';
      const headers = [
        'name',
        'category',
        'purchase_price',
        'sale_price',
        'stock',
        'description',
        'available',
        'unidade_medida',
        'quantidade_unidade',
        'controla_estoque',
        'limite_por_pedido',
        'image_url',
        'image_filename'
      ];
      const sample = {
        name: 'Produto Exemplo',
        category: 'Categoria Exemplo',
        purchase_price: 10.5,
        sale_price: 19.9,
        stock: 25,
        description: 'Descrição do produto',
        available: true,
        unidade_medida: 'un',
        quantidade_unidade: 1,
        controla_estoque: true,
        limite_por_pedido: '',
        image_url: '',
        image_filename: 'foto-produto-exemplo.jpg'
      };
      const lines = [
        headers.join(delimiter),
        headers.map(h => csvEscape((sample as any)[h], delimiter)).join(delimiter)
      ];
      downloadTextFile('modelo_importacao_produtos.csv', lines.join('\n'), 'text/csv;charset=utf-8');
    };

    const splitCsvLine = (line: string, delimiter: string) => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
          continue;
        }
        if (!inQuotes && ch === delimiter) {
          result.push(current);
          current = '';
          continue;
        }
        current += ch;
      }
      result.push(current);
      return result.map(v => v.trim());
    };

    const parseCsv = (text: string) => {
      const rawLines = String(text || '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0);
      if (rawLines.length === 0) return { headers: [] as string[], rows: [] as string[][], delimiter: ';' };
      const headerLine = rawLines[0];
      const commaCount = (headerLine.match(/,/g) || []).length;
      const semiCount = (headerLine.match(/;/g) || []).length;
      const delimiter = semiCount >= commaCount ? ';' : ',';
      const headers = splitCsvLine(headerLine, delimiter).map(h => h.trim());
      const rows = rawLines.slice(1).map(line => splitCsvLine(line, delimiter));
      return { headers, rows, delimiter };
    };

    const parseBool = (value: any, defaultValue: boolean) => {
      if (value === undefined || value === null || String(value).trim() === '') return defaultValue;
      const s = String(value).trim().toLowerCase();
      if (['1', 'true', 'sim', 's', 'yes', 'y'].includes(s)) return true;
      if (['0', 'false', 'nao', 'não', 'n', 'no'].includes(s)) return false;
      return defaultValue;
    };

    const parseNumberPt = (value: any, defaultValue: number) => {
      if (value === undefined || value === null) return defaultValue;
      const raw = String(value).trim();
      if (!raw) return defaultValue;
      const normalized = raw.replace(/\./g, '').replace(',', '.');
      const n = Number(normalized);
      return Number.isFinite(n) ? n : defaultValue;
    };

    const startBulkImport = async () => {
      if (isBulkImporting) return;
      if (!bulkCsvFile) {
        alert('Selecione o arquivo CSV da lista de produtos.');
        return;
      }
      setIsBulkImporting(true);
      setBulkImportMessages([]);
      setBulkImportProgress(null);
      try {
        const text = await bulkCsvFile.text();
        const { headers, rows } = parseCsv(text);
        if (headers.length === 0) throw new Error('CSV vazio.');

        const headerMap = new Map<string, number>();
        headers.forEach((h, idx) => headerMap.set(String(h).trim().toLowerCase(), idx));

        const get = (row: string[], keys: string[]) => {
          for (const key of keys) {
            const idx = headerMap.get(key);
            if (idx === undefined) continue;
            return row[idx] ?? '';
          }
          return '';
        };

        const imageMap = new Map<string, File>();
        for (const f of bulkImageFiles) {
          imageMap.set(f.name, f);
        }

        const existingByName = new Set(products.map(p => (p.name || '').trim().toLowerCase()).filter(Boolean));
        const total = rows.length;
        const progress = { total, processed: 0, added: 0, skipped: 0, failed: 0 };
        setBulkImportProgress({ ...progress });

        const messages: string[] = [];
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const line = i + 2;

          const name = String(get(r, ['name', 'nome'])).trim();
          const category = String(get(r, ['category', 'categoria'])).trim();
          if (!name || !category) {
            progress.failed += 1;
            messages.push(`Linha ${line}: nome e categoria são obrigatórios.`);
            progress.processed += 1;
            setBulkImportProgress({ ...progress });
            continue;
          }

          const key = name.toLowerCase();
          if (existingByName.has(key)) {
            progress.skipped += 1;
            messages.push(`Linha ${line}: "${name}" já existe, ignorado.`);
            progress.processed += 1;
            setBulkImportProgress({ ...progress });
            continue;
          }

          const purchase_price = parseNumberPt(get(r, ['purchase_price', 'preco_custo', 'custo']), 0);
          const sale_price = parseNumberPt(get(r, ['sale_price', 'preco_venda', 'preco']), 0);
          const stock = Math.max(0, Math.floor(parseNumberPt(get(r, ['stock', 'estoque']), 0)));
          const description = String(get(r, ['description', 'descricao', 'descrição'])).trim();
          const available = parseBool(get(r, ['available', 'ativo', 'disponivel', 'disponível']), true);
          const unidade_medida = String(get(r, ['unidade_medida', 'unidade'])).trim() || 'un';
          const quantidade_unidade = Math.max(1, parseNumberPt(get(r, ['quantidade_unidade']), 1));
          const controla_estoque = parseBool(get(r, ['controla_estoque']), true);
          const limiteRaw = String(get(r, ['limite_por_pedido'])).trim();
          const limite_por_pedido = limiteRaw ? Math.max(1, Math.floor(parseNumberPt(limiteRaw, 0))) : undefined;

          const image_url_raw = String(get(r, ['image_url', 'imagem_url', 'url_imagem', 'image'])).trim();
          const image_filename = String(get(r, ['image_filename', 'imagem_arquivo', 'arquivo_imagem'])).trim();

          let image = image_url_raw;
          if (image_filename) {
            const file = imageMap.get(image_filename);
            if (file) {
              try {
                image = await supabaseService.uploadProductImage(file);
              } catch (e: any) {
                messages.push(`Linha ${line}: falha ao subir imagem "${image_filename}".`);
              }
            } else {
              messages.push(`Linha ${line}: imagem "${image_filename}" não encontrada nos arquivos selecionados.`);
            }
          }

          try {
            const created = await supabaseService.addProduct({
              name,
              category,
              purchase_price,
              sale_price,
              price: sale_price,
              stock,
              description,
              image,
              available,
              unidade_medida,
              quantidade_unidade,
              controla_estoque,
              limite_por_pedido,
            } as any);
            existingByName.add(key);
            progress.added += 1;
            if (created) {
              setProducts(prev => [created as any, ...prev]);
            }
          } catch (e: any) {
            progress.failed += 1;
            messages.push(`Linha ${line}: erro ao importar "${name}".`);
          } finally {
            progress.processed += 1;
            setBulkImportProgress({ ...progress });
          }
        }

        try {
          const updated = await supabaseService.getProducts();
          setProducts(updated);
        } catch {}

        setBulkImportMessages(messages.slice(0, 200));
        if (progress.failed === 0) {
          alert(`Importação concluída: ${progress.added} adicionados, ${progress.skipped} ignorados.`);
        } else {
          alert(`Importação concluída: ${progress.added} adicionados, ${progress.skipped} ignorados, ${progress.failed} com erro.`);
        }
      } catch (e: any) {
        alert('Erro ao importar: ' + (e?.message || 'Erro desconhecido'));
      } finally {
        setIsBulkImporting(false);
      }
    };

    return (
      <div className="min-h-screen bg-background-light pb-24">
        <Header 
          title="Produtos" 
          rightElement={
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsBulkImportOpen(true)}
                className="p-2 bg-white border border-slate-200 text-slate-700 rounded-full"
                title="Importar lista"
              >
                <FileText size={22} />
              </button>
              <button onClick={() => { setProductToEdit(null); navigate('product-form'); }} className="p-2 bg-primary text-white rounded-full">
                <Plus size={24} />
              </button>
            </div>
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

          <div className="flex items-center justify-between">
            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 flex-1">
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
            {filtered.length > 0 && (
              <label className="flex items-center gap-2 ml-4 shrink-0 cursor-pointer p-2 rounded-xl hover:bg-slate-100 text-sm font-bold text-slate-600 transition-colors">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                  checked={selectedProducts.length === filtered.length && filtered.length > 0}
                  onChange={toggleAll}
                />
                <span className="hidden sm:inline">Selecionar Todos</span>
              </label>
            )}
          </div>
        </section>

        <main className="px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-32">
          {filtered.map(product => (
            <div key={product.id} className="relative bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex gap-4 hover:border-primary/20 transition-all">
              <div className="absolute top-2 left-2 z-10 bg-white/90 backdrop-blur-sm rounded-lg p-1 shadow-sm border border-slate-100">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                  checked={selectedProducts.includes(product.id)}
                  onChange={() => toggleSelection(product.id)}
                />
              </div>
              <div className={`w-20 h-20 rounded-xl overflow-hidden shrink-0 transition-opacity ${!product.available ? 'opacity-40 grayscale' : 'bg-slate-100'}`}>
                <img src={product.image || 'https://picsum.photos/seed/prod/200/200'} alt={product.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h3 className={`font-black text-sm truncate ${!product.available ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{product.name}</h3>
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
                  <span className={`font-black text-base ${!product.available ? 'text-slate-400' : 'text-primary'}`}>R$ {product.sale_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
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
                <div className="mt-1 flex items-center flex-wrap gap-1">
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${product.stock <= 5 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                    Estoque: {product.stock} {product.unidade_medida}
                  </span>
                  {!product.available && (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">
                      Oculto
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </main>

        {/* Bulk Action Bar */}
        <AnimatePresence>
          {selectedProducts.length > 0 && (
            <motion.div 
              initial={{ y: 100, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: 100, opacity: 0 }}
              className="fixed bottom-20 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-max z-[90] bg-slate-900 text-white rounded-2xl p-4 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 border border-slate-800"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-sm font-bold shadow-lg shadow-primary/20">{selectedProducts.length}</span>
                <span className="text-sm font-black uppercase tracking-widest text-slate-200">Selecionados</span>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button 
                  onClick={() => handleBulkAvailability(true)}
                  className="flex-1 sm:flex-none px-4 py-3 sm:py-2 bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all text-center"
                >
                  Exibir no Catálogo
                </button>
                <button 
                  onClick={() => handleBulkAvailability(false)}
                  className="flex-1 sm:flex-none px-4 py-3 sm:py-2 bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all text-center"
                >
                  Ocultar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isBulkImportOpen && (
            <div className="fixed inset-0 z-[110] flex items-end justify-center">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  if (isBulkImporting) return;
                  setIsBulkImportOpen(false);
                }}
                className="absolute inset-0 bg-black/60"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="relative w-full max-w-md md:max-w-3xl bg-white rounded-t-[32px] md:rounded-[32px] p-6 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
              >
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" />
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-black text-lg mb-1">Importar Lista de Produtos</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      CSV + fotos opcionais por nome do arquivo
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (isBulkImporting) return;
                      setIsBulkImportOpen(false);
                    }}
                    className="p-2 rounded-full hover:bg-slate-100 text-slate-500"
                  >
                    <XCircle size={20} />
                  </button>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-3xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Modelo</p>
                      <button
                        onClick={handleDownloadProductsTemplate}
                        className="px-3 py-2 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                      >
                        <Download size={14} /> Baixar CSV Modelo
                      </button>
                    </div>
                    <p className="text-xs font-bold text-slate-600 leading-relaxed">
                      Preencha o CSV e, para fotos, use a coluna image_filename (ex: foto1.jpg) e selecione as imagens junto com o CSV.
                    </p>
                  </div>

                  <div className="p-4 rounded-3xl bg-white border border-slate-200 space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Arquivo CSV</label>
                      <input
                        type="file"
                        accept=".csv,text/csv"
                        disabled={isBulkImporting}
                        onChange={(e) => setBulkCsvFile(e.target.files?.[0] || null)}
                        className="w-full"
                      />
                      {bulkCsvFile && (
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{bulkCsvFile.name}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fotos (opcional)</label>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        disabled={isBulkImporting}
                        onChange={(e) => setBulkImageFiles(Array.from(e.target.files || []))}
                        className="w-full"
                      />
                      {bulkImageFiles.length > 0 && (
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{bulkImageFiles.length} arquivo(s) selecionado(s)</p>
                      )}
                    </div>
                  </div>
                </div>

                {bulkImportProgress && (
                  <div className="mt-5 p-4 rounded-3xl bg-slate-900 text-white border border-slate-800">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                        Progresso: {bulkImportProgress.processed}/{bulkImportProgress.total}
                      </p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                        OK {bulkImportProgress.added} • Ign {bulkImportProgress.skipped} • Err {bulkImportProgress.failed}
                      </p>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${bulkImportProgress.total > 0 ? Math.min(100, Math.round((bulkImportProgress.processed / bulkImportProgress.total) * 100)) : 0}%` }}
                      />
                    </div>
                  </div>
                )}

                {bulkImportMessages.length > 0 && (
                  <div className="mt-5 p-4 rounded-3xl bg-white border border-slate-200 overflow-auto">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Mensagens</p>
                    <div className="space-y-2">
                      {bulkImportMessages.slice(0, 30).map((m, idx) => (
                        <div key={idx} className="text-xs font-bold text-slate-600 break-words">
                          {m}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-auto pt-6 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      if (isBulkImporting) return;
                      setIsBulkImportOpen(false);
                    }}
                    className="h-14 rounded-2xl bg-slate-100 text-slate-700 font-black uppercase tracking-widest text-xs active:scale-95 transition-all"
                  >
                    Fechar
                  </button>
                  <button
                    onClick={startBulkImport}
                    disabled={isBulkImporting}
                    className="h-14 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 disabled:opacity-60 active:scale-95 transition-all"
                  >
                    {isBulkImporting ? 'Importando...' : 'Importar'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL DE REPOSIÇÃO */}
        <AnimatePresence>
          {replenishingProduct && (
            <div className="fixed inset-0 z-[100] flex items-end justify-center">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setReplenishingProduct(null)} className="absolute inset-0 bg-black/60" />
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-md md:max-w-2xl bg-white rounded-t-[32px] md:rounded-[32px] p-6 shadow-2xl overflow-hidden">
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
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewingHistory(null)} className="absolute inset-0 bg-black/60" />
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-md md:max-w-3xl bg-white rounded-t-[32px] md:rounded-[32px] p-6 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
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
        <main className="p-4 space-y-6 max-w-4xl mx-auto">
          
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
      const q = clientSearch.toLowerCase();
      return clients.filter(client => {
        const matchesSearch = (client.name?.toLowerCase() || '').includes(q) || 
          (client.establishment?.toLowerCase() || '').includes(q) ||
          (client.city?.toLowerCase() || '').includes(q);
        
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

        <main className="px-4 py-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400 opacity-50">
              <Users size={64} strokeWidth={1} />
              <p className="mt-4 font-bold">Nenhum cliente encontrado</p>
            </div>
          ) : (
            filteredClients.map(client => (
              <div 
                key={client.id} 
                onClick={() => setSelectedClientForDetails(client)}
                className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 active:scale-[0.98] transition-all cursor-pointer hover:border-primary/20"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-4">
                    <div className="size-14 rounded-2xl bg-primary/5 flex items-center justify-center text-primary shrink-0 border border-primary/10">
                      {(client.establishment?.toLowerCase() || '').includes('restaurante') ? <Utensils size={28} /> : 
                       (client.establishment?.toLowerCase() || '').includes('café') ? <Coffee size={28} /> : 
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
                className="absolute inset-0 bg-black/60"
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
        <main className="p-4 space-y-6 max-w-4xl mx-auto">
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
    const [isLoadingOrderDetails, setIsLoadingOrderDetails] = useState(false);

    const filteredOrders = useMemo(() => {
      return orders.filter(order => {
        const matchesStatus = orderFilter === 'all' || order.status === orderFilter;
        const matchesSearch = (order.clientName?.toLowerCase() || '').includes(orderSearch.toLowerCase()) || 
                             (order.id?.toLowerCase() || '').includes(orderSearch.toLowerCase());
        return matchesStatus && matchesSearch;
      });
    }, [orders, orderFilter, orderSearch]);

    const fetchOrderItemsForDisplay = async (orderId: string) => {
      const items = await supabaseService.getOrderItems(orderId);
      return (items || []).map((item: any) => ({
        productId: item.product_id,
        productName: item.products?.name || 'Produto',
        productImage: item.products?.image,
        variationName: item.variation_name,
        quantity: item.quantity,
        price: item.price_at_time
      })) as Array<{ productId: string; productName: string; productImage?: string; variationName?: string; quantity: number; price: number }>;
    };

    const ensureOrderItemsLoaded = async (order: Order) => {
      if (Array.isArray(order.items) && order.items.length > 0) return order;
      setIsLoadingOrderDetails(true);
      try {
        const items = await fetchOrderItemsForDisplay(order.id);
        setOrders((prev: Order[]) => prev.map((o: Order) => o.id === order.id ? { ...o, items } : o));
        setSelectedOrder((prev: Order | null) => prev && prev.id === order.id ? { ...prev, items } : prev);
        return { ...order, items };
      } finally {
        setIsLoadingOrderDetails(false);
      }
    };

    const handleDeleteOrder = async (order: Order) => {
      if (!confirm(`Excluir este pedido permanentemente?\n\nID: #${order.id.slice(0, 8)}`)) return;
      try {
        await supabaseService.deleteOrder(order.id);
        setOrders((prev: Order[]) => prev.filter((o: Order) => o.id !== order.id));
        setSelectedOrder((prev: Order | null) => (prev?.id === order.id ? null : prev));
      } catch (error: any) {
        alert('Erro ao excluir pedido: ' + (error?.message || 'Erro desconhecido'));
      }
    };

    const handleUpdateStatus = async (id: string, status: OrderStatus, extra: any = {}) => {
      try {
        const updated = await supabaseService.updateOrderStatus(id, status, extra);
        setOrders((prev: Order[]) => prev.map((o: Order) => o.id === id ? { ...o, ...updated } : o));
        if (selectedOrder?.id === id) {
          setSelectedOrder({ ...selectedOrder, ...updated });
        }
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
        setOrders((prev: Order[]) => prev.map((o: Order) => o.id === confirmingPayment.id ? { ...o, ...updated } : o));
        if (selectedOrder?.id === confirmingPayment.id) {
          setSelectedOrder((prev: Order | null) => prev ? { ...prev, ...updated } : null);
        }
        setConfirmingPayment(null);
        setPaymentAmount('');
        alert('Pagamento confirmado com sucesso!');
      } catch (error: any) {
        console.error(error);
        alert(`Erro ao confirmar pagamento: ${error.message || 'Erro desconhecido'}`);
      }
    };

    const shareToWhatsApp = async (order: Order) => {
      const full = await ensureOrderItemsLoaded(order);
      const itemsText = full.items.map((item: any) => 
        `• ${item.productName || 'Produto'} x${item.quantity} - R$ ${item.price.toLocaleString('pt-BR')}`
      ).join('\n');
      
      const text = `*PEDIDO #${full.id.slice(0, 8)}*\n\n` +
                   `*Cliente:* ${full.clientName}\n` +
                   `*Data:* ${full.date}\n` +
                   `*Total:* R$ ${full.total.toLocaleString('pt-BR')}\n\n` +
                   `*Itens:*\n${itemsText}\n\n` +
                   `*Status:* ${full.status.toUpperCase()}`;
      
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const generateDetailedReceipt = async (order: Order) => {
      const full = await ensureOrderItemsLoaded(order);
      const itemsHtml = full.items.map((item: any) => `
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
            <title>Comprovante de Pedido #${full.id.slice(0, 8)}</title>
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
                <h2 style="margin: 0; font-size: 24px; font-weight: 900;">Pedido #${full.id.slice(0, 8)}</h2>
                <div class="status-badge" style="background: #f1f5f9; color: #475569;">${full.status.toUpperCase()}</div>
              </div>

              <div class="client-card">
                <div class="info-group">
                  <h4>Cliente</h4>
                  <p>${full.clientName}</p>
                </div>
                <div class="info-group">
                  <h4>Entrega Prevista</h4>
                  <p>${full.deliveryDate ? new Date(full.deliveryDate).toLocaleDateString('pt-BR') : 'A definir'}</p>
                </div>
                <div class="info-group">
                  <h4>Pagamento</h4>
                  <p>${full.paymentMethod || 'Não informado'} (${full.paymentStatus === 'paid' ? 'PAGO' : 'PENDENTE'})</p>
                </div>
                <div class="info-group">
                  <h4>Total do Pedido</h4>
                  <p>R$ ${full.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
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
                  ${full.notes ? `
                    <div style="margin-top: 20px;">
                      <h4 style="margin: 0; font-size: 10px; text-transform: uppercase; color: #64748b;">Observações</h4>
                      <p style="margin: 4px 0 0 0; font-size: 13px; font-style: italic; color: #475569;">${full.notes}</p>
                    </div>
                  ` : ''}
                </div>
                <div style="text-align: right;">
                  <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: 700;">VALOR TOTAL</p>
                  <p style="margin: 4px 0 0 0; font-size: 32px; font-weight: 900; color: #3b82f6;">R$ ${full.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
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

        <main className="px-4 py-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400 opacity-50">
              <ShoppingCart size={64} strokeWidth={1} />
              <p className="mt-4 font-bold">Nenhum pedido encontrado</p>
            </div>
          ) : (
            filteredOrders.map(order => (
              <div 
                key={order.id} 
                onClick={() => {
                  setSelectedOrder(order);
                  ensureOrderItemsLoaded(order);
                }}
                className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 active:scale-[0.98] transition-all cursor-pointer hover:border-primary/20"
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
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order); }}
                      className="p-2 text-slate-400 hover:text-red-500"
                      title="Excluir pedido"
                    >
                      <Trash2 size={20} />
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
                transition={{ duration: reduceMotion ? 0 : 0.12 }}
                onClick={() => setSelectedOrder(null)}
                className="absolute inset-0 bg-black/60"
              />
              <motion.div 
                initial={{ y: "100%" }} 
                animate={{ y: 0 }} 
                exit={{ y: "100%" }}
                transition={{ duration: reduceMotion ? 0 : 0.18 }}
                className="relative w-full max-w-md bg-white rounded-t-[32px] p-6 shadow-2xl overflow-y-auto no-scrollbar max-h-[90vh]"
              >
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" />
                
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">Pedido #{selectedOrder.id.slice(0, 8)}</h2>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{selectedOrder.date}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDeleteOrder(selectedOrder)}
                      className="p-2 bg-red-50 rounded-full text-red-500"
                      title="Excluir pedido"
                    >
                      <Trash2 size={22} />
                    </button>
                    <button onClick={() => setSelectedOrder(null)} className="p-2 bg-slate-100 rounded-full text-slate-400">
                      <XCircle size={24} />
                    </button>
                  </div>
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
                    {selectedOrder.deliveryDate && (
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Entrega</p>
                        <div className="flex items-center gap-1 justify-end text-primary font-black">
                          <Clock size={14} />
                          <span className="text-sm">{selectedOrder.deliveryDate}</span>
                        </div>
                      </div>
                    )}
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
                  {isLoadingOrderDetails && (!selectedOrder.items || selectedOrder.items.length === 0) && (
                    <div className="flex items-center justify-center py-6">
                      <div className="animate-spin size-6 border-2 border-primary border-t-transparent rounded-full" />
                    </div>
                  )}
                  {!isLoadingOrderDetails && selectedOrder.items?.length === 0 && (
                    <p className="text-center py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Itens não carregados</p>
                  )}
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
                  
                  <div className="grid grid-cols-1 gap-3">
                    <button 
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'cancelled')}
                      disabled={selectedOrder.status === 'cancelled'}
                      className="h-14 rounded-2xl bg-red-50 text-red-500 font-black text-xs uppercase tracking-widest border border-red-100 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <XCircle size={18} /> Cancelar Pedido
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

        {/* MODAL DE CONFIRMAÇÃO DE PAGAMENTO (TOTAL/PARCIAL) */}
        <AnimatePresence>
          {confirmingPayment && (
            <div className="fixed inset-0 z-[100] flex items-end justify-center">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmingPayment(null)} className="absolute inset-0 bg-black/60" />
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
      const q = clientSearchTerm.toLowerCase();
      return clients.filter(c => 
        (c.name?.toLowerCase() || '').includes(q) || 
        (c.establishment?.toLowerCase() || '').includes(q) ||
        (c.phone || '').includes(clientSearchTerm)
      ).slice(0, 5);
    }, [clients, clientSearchTerm]);

    const handleSelectClient = (client: Client) => {
      setSelectedClientId(client.id);
      setClientSearchTerm(client.establishment || client.name);
      setShowClientSuggestions(false);
      
      // Auto-fill payment method based on client preference if exists
      // (Assuming we might have this in the future, for now just standard)
      setPaymentMethod('Pix');
    };

    const filteredProducts = useMemo(() => {
      const q = productSearchForOrder.toLowerCase();
      return products.filter(p => 
        (p.name?.toLowerCase() || '').includes(q) ||
        (p.category?.toLowerCase() || '').includes(q)
      );
    }, [products, productSearchForOrder]);

    const getPendingQty = (productId: string) => pendingQuantities[productId] || 1;
    
    const setPendingQty = (productId: string, qty: number) => {
      setPendingQuantities(prev => ({ ...prev, [productId]: Math.max(1, qty) }));
    };

    const paymentAdjustment = useMemo(() => getPaymentAdjustment(paymentMethod), [paymentMethod, totalAfterPromotion]);
    const finalTotal = useMemo(() => Math.max(0, totalAfterPromotion + paymentAdjustment), [totalAfterPromotion, paymentAdjustment]);

    const handleSaveOrder = async () => {
      if (!selectedClientId) { alert('Selecione um cliente.'); return; }
      if (cart.length === 0) { alert('Adicione pelo menos um produto.'); return; }
      
      setIsSaving(true);
      try {
        const orderData: any = {
          clientId: selectedClientId,
          clientName: selectedClient?.establishment || selectedClient?.name || 'Cliente',
          total: finalTotal,
          status: 'pending' as OrderStatus,
          paymentMethod,
          notes: `Promoção: ${activePromotion?.name || 'Nenhuma'} | Ajuste: R$ ${paymentAdjustment.toFixed(2)}`,
          items: cartWithDetails.map((item: any) => ({
            productId: item.id,
            variationId: item.variationId,
            variationName: item.variationName,
            quantity: item.quantity,
            price: item.price
          }))
        };

        const newOrder = await supabaseService.createOrder(orderData, cartWithDetails.map((item: any) => ({
          productId: item.id,
          quantity: item.quantity,
          price: item.price
        })));

        setOrders((prev: Order[]) => [newOrder as Order, ...prev]);
        setCart([]);
        setSelectedClientId(null);
        setPendingQuantities({});
        
        // Perguntar se deseja enviar o comprovante
        if (confirm('Pedido salvo com sucesso! Deseja enviar o comprovante pelo WhatsApp agora?')) {
          sendWhatsApp();
        }
        
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

      const itemsText = cartWithDetails.map((item: any) => 
        `• *${item.name}*${item.variationName ? ` (${item.variationName})` : ''}\n  Qtd: ${item.quantity} x R$ ${item.price.toLocaleString('pt-BR')} = *R$ ${item.total.toLocaleString('pt-BR')}*`
      ).join('\n\n');
      
      let text = `*📄 COMPROVANTE DE PEDIDO*\n\n` +
                   `*🏠 Cliente:* ${selectedClient.establishment || selectedClient.name}\n` +
                   `*👤 Responsável:* ${selectedClient.name}\n` +
                   `*📅 Data:* ${new Date().toLocaleDateString('pt-BR')}\n` +
                   `*💳 Pagamento:* ${paymentMethod}\n\n` +
                   `*🛒 Itens:*\n${itemsText}\n\n`;

      if (promotionDiscount > 0) {
        text += `*🎁 Desconto (${activePromotion?.name}): - R$ ${promotionDiscount.toLocaleString('pt-BR')}*\n`;
      }
      
      if (paymentAdjustment !== 0) {
        text += `*${paymentAdjustment > 0 ? '⚠️ Taxa' : '✅ Desconto'} Pagamento: ${paymentAdjustment > 0 ? '+' : '-'} R$ ${Math.abs(paymentAdjustment).toLocaleString('pt-BR')}*\n`;
      }

      text += `\n*💰 TOTAL FINAL: R$ ${finalTotal.toLocaleString('pt-BR')}*\n\n` +
                   `*Obrigado pela preferência!*`;
      
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
              {!selectedClient ? (
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
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="size-14 rounded-2xl bg-primary/5 flex items-center justify-center text-primary border border-primary/10">
                      {selectedClient.establishment?.toLowerCase().includes('restaurante') ? <Utensils size={28} /> : 
                       selectedClient.establishment?.toLowerCase().includes('café') ? <Coffee size={28} /> : 
                       <Store size={28} />}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Cliente Selecionado</p>
                      <h3 className="font-black text-lg text-slate-900">{selectedClient.establishment || selectedClient.name}</h3>
                      <p className="text-xs font-bold text-slate-500">{selectedClient.name} • {selectedClient.phone}</p>
                      {(selectedClient.rua || selectedClient.city) && (
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">
                          {selectedClient.rua}, {selectedClient.numero} - {selectedClient.bairro}, {selectedClient.city}
                        </p>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedClientId(null);
                      setClientSearchTerm('');
                    }}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Edit2 size={20} />
                  </button>
                </div>
              )}
              
              {!selectedClient && (
                <button 
                  onClick={() => { setClientToEdit(null); navigate('client-form'); }}
                  className="mt-3 flex items-center gap-1 text-primary font-bold text-xs"
                >
                  <PlusCircle size={16} /> Adicionar novo cliente
                </button>
              )}
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
                        onClick={async () => {
                          const withVars = await ensureProductVariationsLoaded(product);
                          if (withVars.variations && withVars.variations.length > 0) {
                            setSelectedProductForVariation(withVars);
                          } else {
                            addToCart(withVars, getPendingQty(withVars.id));
                            setPendingQty(withVars.id, 1);
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
                <span>SUBTOTAL DOS ITENS</span>
                <span>R$ {cartSubtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              
              {promotionDiscount > 0 && (
                <div className="flex justify-between items-center text-green-400 text-xs font-bold mb-1">
                  <span>PROMOÇÃO: {activePromotion?.name}</span>
                  <span>- R$ {promotionDiscount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              )}

              {paymentAdjustment !== 0 && (
                <div className={`flex justify-between items-center text-xs font-bold mb-1 ${paymentAdjustment > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  <span>{paymentAdjustment > 0 ? 'TAXA' : 'DESCONTO'} PAGAMENTO</span>
                  <span>{paymentAdjustment > 0 ? '+' : '-'} R$ {Math.abs(paymentAdjustment).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              )}

              <div className="flex justify-between items-end border-t border-white/10 pt-4 mt-2">
                <span className="text-sm font-bold">VALOR TOTAL</span>
                <span className="text-3xl font-black text-primary">R$ {finalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
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
                transition={{ duration: reduceMotion ? 0 : 0.12 }}
                onClick={() => setSelectedProductForVariation(null)}
                className="absolute inset-0 bg-black/60"
              />
              <motion.div 
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ duration: reduceMotion ? 0 : 0.18 }}
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
      const cats = new Set(products.map((p: Product) => p.category));
      return ['Todas', ...Array.from(cats)].sort();
    }, [products]);

    const filteredProducts = useMemo(() => {
      const q = productSearchForOrder.toLowerCase();
      return products.filter((p: Product) => {
        const matchesSearch = (p.name?.toLowerCase() || '').includes(q) || (p.category?.toLowerCase() || '').includes(q);
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
                onClick={async () => {
                  const withVars = await ensureProductVariationsLoaded(product);
                  if (withVars.variations && withVars.variations.length > 0) {
                    setSelectedProductForVariation(withVars);
                  } else {
                    addToCart(withVars);
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
              transition={{ duration: reduceMotion ? 0 : 0.12 }}
              onClick={() => setSelectedProductForVariation(null)}
              className="absolute inset-0 bg-black/40"
            />
            <motion.div 
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }}
              transition={{ duration: reduceMotion ? 0 : 0.18 }}
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
            <div className="text-right">
              {promotionDiscount > 0 && <p className="text-[10px] font-bold opacity-70 line-through">R$ {cartSubtotal.toLocaleString('pt-BR')}</p>}
              <p className="font-black">R$ {totalAfterPromotion.toLocaleString('pt-BR')}</p>
            </div>
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
          <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t space-y-3 shadow-2xl">
            <div className="flex justify-between items-center px-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Subtotal</span>
              <span className="font-bold text-slate-900">R$ {cartSubtotal.toLocaleString('pt-BR')}</span>
            </div>
            {promotionDiscount > 0 && (
              <div className="flex justify-between items-center px-2 text-green-600">
                <span className="text-xs font-bold uppercase tracking-widest">Promoção: {activePromotion?.name}</span>
                <span className="font-bold">- R$ {promotionDiscount.toLocaleString('pt-BR')}</span>
              </div>
            )}
            <button onClick={() => navigate('checkout')} className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-lg shadow-primary/20 uppercase tracking-widest">
              Continuar (R$ {totalAfterPromotion.toLocaleString('pt-BR')})
            </button>
          </div>
        )}
      </main>
    </div>
  );

  const CheckoutPage = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('Pix');

    const paymentAdjustment = useMemo(() => getPaymentAdjustment(paymentMethod), [paymentMethod, totalAfterPromotion]);
    const finalTotal = useMemo(() => Math.max(0, totalAfterPromotion + paymentAdjustment), [totalAfterPromotion, paymentAdjustment]);

    const handleFinishOrder = async () => {
      if (!selectedClientId) { alert('Selecione um cliente.'); navigate('clients'); return; }
      setIsProcessing(true);
      try {
        const newOrder = await supabaseService.createOrder({
          clientId: selectedClientId,
          clientName: selectedClient?.establishment || '',
          total: finalTotal,
          status: 'pending',
          paymentMethod,
          notes: `Promoção: ${activePromotion?.name || 'Nenhuma'} | Ajuste: R$ ${paymentAdjustment.toFixed(2)}`,
          items: cart.map((item: any) => {
            const product = products.find((p: Product) => p.id === item.productId);
            const variation = product?.variations?.find((v: ProductVariation) => v.id === item.variationId);
            const basePrice = product?.sale_price || 0;
            const finalPrice = basePrice + (variation?.additional_price || 0);
            
            return {
              productId: item.productId,
              variationId: item.variationId,
              variationName: variation ? `${variation.name}: ${variation.value}` : undefined,
              quantity: item.quantity,
              price: finalPrice
            };
          })
        }, cart.map((item: any) => {
          const product = products.find((p: Product) => p.id === item.productId);
          const variation = product?.variations?.find((v: ProductVariation) => v.id === item.variationId);
          const basePrice = product?.sale_price || 0;
          const finalPrice = basePrice + (variation?.additional_price || 0);

          return {
            productId: item.productId,
            quantity: item.quantity,
            price: finalPrice
          };
        }));
        setOrders((prev: Order[]) => [newOrder as Order, ...prev]);
        setCart([]);
        setSelectedClientId(null);
        navigate('orders');
        alert('Pedido realizado!');
      } catch (e: any) { alert('Erro ao processar.'); } finally { setIsProcessing(false); }
    };

    return (
      <div className="min-h-screen bg-background-light p-4">
        <Header title="Finalizar" showBack onBack={() => navigate('cart')} />
        <div className="space-y-6 mt-4">
          <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Cliente Selecionado</h3>
            {selectedClient ? (
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <User size={20} />
                </div>
                <p className="font-black text-slate-900">{selectedClient.establishment || selectedClient.name}</p>
              </div>
            ) : (
              <button onClick={() => navigate('clients')} className="w-full py-4 border-2 border-dashed border-primary/20 text-primary font-black rounded-xl hover:bg-primary/5 transition-all">
                Selecionar Cliente +
              </button>
            )}
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Forma de Pagamento</h3>
            <div className="grid grid-cols-2 gap-2">
              {['Pix', 'Dinheiro', 'Cartão Credito', 'Cartão Debito', 'Boleto'].map(method => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`py-3 px-2 rounded-xl text-[10px] font-black uppercase border transition-all ${paymentMethod === method ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-slate-50 text-slate-400 border-slate-100'}`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6 bg-slate-900 text-white rounded-[32px] shadow-2xl space-y-4">
            <div className="space-y-2 pb-4 border-b border-white/10">
              <div className="flex justify-between text-xs font-bold opacity-60">
                <span>Subtotal</span>
                <span>R$ {cartSubtotal.toLocaleString('pt-BR')}</span>
              </div>
              {promotionDiscount > 0 && (
                <div className="flex justify-between text-xs font-bold text-green-400">
                  <span>Promoção: {activePromotion?.name}</span>
                  <span>- R$ {promotionDiscount.toLocaleString('pt-BR')}</span>
                </div>
              )}
              {paymentAdjustment !== 0 && (
                <div className={`flex justify-between text-xs font-bold ${paymentAdjustment > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  <span>{paymentAdjustment > 0 ? 'Taxa' : 'Desconto'} Pagamento</span>
                  <span>{paymentAdjustment > 0 ? '+' : '-'} R$ {Math.abs(paymentAdjustment).toLocaleString('pt-BR')}</span>
                </div>
              )}
            </div>
            
            <div className="flex justify-between items-end pt-2">
              <span className="text-sm font-bold opacity-60 uppercase tracking-widest">Valor Final</span>
              <span className="text-3xl font-black text-primary">R$ {finalTotal.toLocaleString('pt-BR')}</span>
            </div>
            
            <button 
              onClick={handleFinishOrder} 
              disabled={isProcessing || cart.length === 0 || !selectedClient} 
              className="w-full py-5 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/40 uppercase tracking-widest active:scale-[0.98] transition-all disabled:opacity-50"
            >
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
        
        <main className="p-4 space-y-6 max-w-4xl mx-auto">
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
              <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-24">
                {transactions.length === 0 ? (
                  <div className="col-span-full bg-white p-10 rounded-[32px] text-center border border-dashed border-slate-200">
                    <DollarSign size={40} className="mx-auto text-slate-200 mb-2" />
                    <p className="text-xs font-bold text-slate-400 uppercase">Nenhum lançamento manual</p>
                  </div>
                ) : (
                  transactions.map(t => (
                    <div key={t.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:border-primary/20 transition-all">
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
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddingTransaction(false)} className="absolute inset-0 bg-black/60" />
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

  const PromotionsPage = () => {
    const [activeTab, setActiveTab] = useState<'promotions' | 'payments'>('promotions');
    const [isAddingPromotion, setIsAddingPromotion] = useState(false);
    const [isAddingAdjustment, setIsAddingAdjustment] = useState(false);
    const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
    const [editingAdjustment, setEditingAdjustment] = useState<PaymentAdjustment | null>(null);

    const [newPromotion, setNewPromotion] = useState<Omit<Promotion, 'id' | 'user_id' | 'created_at'>>({
      name: '',
      type: 'percentage',
      value: 0,
      active: true,
      min_order_value: 0,
      apply_to: 'all'
    });

    const [newAdjustment, setNewAdjustment] = useState<Omit<PaymentAdjustment, 'id' | 'user_id' | 'created_at'>>({
      method: 'Pix',
      type: 'discount',
      adjustment_type: 'percentage',
      value: 0,
      active: true
    });

    const handleSavePromotion = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        const payload: any = editingPromotion ? { ...editingPromotion, ...newPromotion } : newPromotion;
        const saved = await supabaseService.upsertPromotion(payload);
        if (editingPromotion) {
          setPromotions((prev: Promotion[]) => prev.map((p: Promotion) => p.id === saved.id ? saved : p));
        } else {
          setPromotions((prev: Promotion[]) => [saved, ...prev]);
        }
        setIsAddingPromotion(false);
        setEditingPromotion(null);
        setNewPromotion({ name: '', type: 'percentage', value: 0, active: true, min_order_value: 0, apply_to: 'all' });
      } catch (e: any) {
        alert('Erro ao salvar promoção.');
      }
    };

    const handleSaveAdjustment = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        const payload: any = editingAdjustment ? { ...editingAdjustment, ...newAdjustment } : newAdjustment;
        const saved = await supabaseService.upsertPaymentAdjustment(payload);
        if (editingAdjustment) {
          setPaymentAdjustments((prev: PaymentAdjustment[]) => prev.map((a: PaymentAdjustment) => a.id === saved.id ? saved : a));
        } else {
          setPaymentAdjustments((prev: PaymentAdjustment[]) => [...prev, saved]);
        }
        setIsAddingAdjustment(false);
        setEditingAdjustment(null);
        setNewAdjustment({ method: 'Pix', type: 'discount', adjustment_type: 'percentage', value: 0, active: true });
      } catch (e: any) {
        alert('Erro ao salvar ajuste de pagamento.');
      }
    };

    const handleDeletePromotion = async (id: string) => {
      if (!confirm('Deseja excluir esta promoção?')) return;
      try {
        await supabaseService.deletePromotion(id);
        setPromotions(prev => prev.filter(p => p.id !== id));
      } catch (e) { alert('Erro ao excluir.'); }
    };

    const handleDeleteAdjustment = async (id: string) => {
      if (!confirm('Deseja excluir este ajuste?')) return;
      try {
        await supabaseService.deletePaymentAdjustment(id);
        setPaymentAdjustments(prev => prev.filter(a => a.id !== id));
      } catch (e) { alert('Erro ao excluir.'); }
    };

    return (
      <div className="min-h-screen bg-background-light pb-32">
        <Header title="Promoções e Taxas" />
        
        <main className="p-4 space-y-6 max-w-4xl mx-auto">
          {/* Tabs */}
          <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-100">
            <button
              onClick={() => setActiveTab('promotions')}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'promotions' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400'}`}
            >
              Promoções Gerais
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'payments' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400'}`}
            >
              Taxas por Pagamento
            </button>
          </div>

          {activeTab === 'promotions' ? (
            <section className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Tag size={16} className="text-primary" /> Promoções Ativas
                </h3>
                <button 
                  onClick={() => {
                    setEditingPromotion(null);
                    setNewPromotion({ name: '', type: 'percentage', value: 0, active: true, min_order_value: 0, apply_to: 'all' });
                    setIsAddingPromotion(true);
                  }}
                  className="text-[10px] font-black text-primary uppercase bg-primary/10 px-3 py-1.5 rounded-lg active:scale-95 transition-all"
                >
                  + Nova Promoção
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {promotions.length === 0 ? (
                  <div className="col-span-full bg-white p-10 rounded-[32px] text-center border border-dashed border-slate-200">
                    <Tag size={40} className="mx-auto text-slate-200 mb-2" />
                    <p className="text-xs font-bold text-slate-400 uppercase">Nenhuma promoção cadastrada</p>
                  </div>
                ) : (
                  promotions.map(p => (
                    <div key={p.id} className="bg-white p-5 rounded-[32px] shadow-sm border border-slate-100 flex flex-col justify-between hover:border-primary/20 transition-all group">
                      <div className="flex justify-between items-start mb-4">
                        <div className={`size-10 rounded-2xl flex items-center justify-center ${p.active ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                          <Percent size={20} />
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              setEditingPromotion(p);
                              setNewPromotion({ ...p });
                              setIsAddingPromotion(true);
                            }}
                            className="p-2 text-slate-400 hover:text-primary transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeletePromotion(p.id)}
                            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900 mb-1">{p.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">
                          {p.type === 'percentage' ? `${p.value}% de desconto` : `R$ ${p.value} de desconto`}
                        </p>
                        {p.min_order_value > 0 && (
                          <p className="text-[9px] font-bold text-primary uppercase mt-1">
                            Min: R$ {p.min_order_value.toLocaleString('pt-BR')}
                          </p>
                        )}
                        {p.apply_to === 'category' && (
                          <p className="text-[9px] font-bold text-indigo-500 uppercase mt-1">
                            Aplica à Categoria: {p.target_id}
                          </p>
                        )}
                        {p.apply_to === 'product' && (
                          <p className="text-[9px] font-bold text-indigo-500 uppercase mt-1">
                            Aplica ao Produto: {products.find(prod => prod.id === p.target_id)?.name || 'Específico'}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          ) : (
            <section className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <CreditCard size={16} className="text-primary" /> Taxas e Descontos
                </h3>
                <button 
                  onClick={() => {
                    setEditingAdjustment(null);
                    setNewAdjustment({ method: 'Pix', type: 'discount', adjustment_type: 'percentage', value: 0, active: true });
                    setIsAddingAdjustment(true);
                  }}
                  className="text-[10px] font-black text-primary uppercase bg-primary/10 px-3 py-1.5 rounded-lg active:scale-95 transition-all"
                >
                  + Novo Ajuste
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paymentAdjustments.length === 0 ? (
                  <div className="col-span-full bg-white p-10 rounded-[32px] text-center border border-dashed border-slate-200">
                    <CreditCard size={40} className="mx-auto text-slate-200 mb-2" />
                    <p className="text-xs font-bold text-slate-400 uppercase">Nenhum ajuste cadastrado</p>
                  </div>
                ) : (
                  paymentAdjustments.map(a => (
                    <div key={a.id} className="bg-white p-5 rounded-[32px] shadow-sm border border-slate-100 flex items-center justify-between group hover:border-primary/20 transition-all">
                      <div className="flex items-center gap-4">
                        <div className={`size-12 rounded-2xl flex items-center justify-center ${a.type === 'discount' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                          {a.method === 'Pix' ? <QrCode size={24} /> : a.method.includes('Cartão') ? <CreditCard size={24} /> : <Banknote size={24} />}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900">{a.method}</p>
                          <p className={`text-[10px] font-bold uppercase ${a.type === 'discount' ? 'text-green-600' : 'text-red-600'}`}>
                            {a.type === 'discount' ? 'Desconto' : 'Taxa'} de {a.adjustment_type === 'percentage' ? `${a.value}%` : `R$ ${a.value}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => {
                            setEditingAdjustment(a);
                            setNewAdjustment({ ...a });
                            setIsAddingAdjustment(true);
                          }}
                          className="p-2 text-slate-300 hover:text-primary transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteAdjustment(a.id)}
                          className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}
        </main>

        {/* Modal Nova Promoção */}
        <AnimatePresence>
          {isAddingPromotion && (
            <div className="fixed inset-0 z-[100] flex items-end justify-center">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddingPromotion(false)} className="absolute inset-0 bg-black/60" />
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-md bg-white rounded-t-[32px] p-6 shadow-2xl">
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" />
                <h3 className="font-black text-lg mb-1 text-slate-900">{editingPromotion ? 'Editar Promoção' : 'Nova Promoção'}</h3>
                <p className="text-xs font-bold text-slate-400 uppercase mb-6">Configure o desconto para seus pedidos</p>
                
                <form className="space-y-4" onSubmit={handleSavePromotion}>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nome da Promoção</label>
                    <input 
                      type="text" required
                      className="w-full h-14 px-4 rounded-xl border border-slate-200 bg-slate-50 font-bold outline-none focus:ring-2 focus:ring-primary/20"
                      value={newPromotion.name}
                      onChange={e => setNewPromotion({ ...newPromotion, name: e.target.value })}
                      placeholder="Ex: Desconto de Inauguração"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Tipo</label>
                      <select 
                        className="w-full h-14 px-4 rounded-xl border border-slate-200 bg-slate-50 font-bold outline-none focus:ring-2 focus:ring-primary/20"
                        value={newPromotion.type}
                        onChange={e => setNewPromotion({ ...newPromotion, type: e.target.value as any })}
                      >
                        <option value="percentage">Porcentagem (%)</option>
                        <option value="fixed">Valor Fixo (R$)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Valor</label>
                      <input 
                        type="number" step="0.01" required
                        className="w-full h-14 px-4 rounded-xl border border-slate-200 bg-slate-50 font-bold outline-none focus:ring-2 focus:ring-primary/20"
                        value={newPromotion.value}
                        onChange={e => setNewPromotion({ ...newPromotion, value: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Valor Mínimo do Pedido (R$)</label>
                    <input 
                      type="number" step="0.01"
                      className="w-full h-14 px-4 rounded-xl border border-slate-200 bg-slate-50 font-bold outline-none focus:ring-2 focus:ring-primary/20"
                      value={newPromotion.min_order_value}
                      onChange={e => setNewPromotion({ ...newPromotion, min_order_value: Number(e.target.value) })}
                      placeholder="0,00 (Opcional)"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Aplicar a</label>
                    <select 
                      className="w-full h-14 px-4 rounded-xl border border-slate-200 bg-slate-50 font-bold outline-none focus:ring-2 focus:ring-primary/20"
                      value={newPromotion.apply_to || 'all'}
                      onChange={e => setNewPromotion({ ...newPromotion, apply_to: e.target.value as any, target_id: '' })}
                    >
                      <option value="all">Todos os Produtos</option>
                      <option value="category">Uma Categoria Específica</option>
                      <option value="product">Um Produto Específico</option>
                    </select>
                  </div>

                  {newPromotion.apply_to === 'category' && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Selecione a Categoria</label>
                      <select 
                        className="w-full h-14 px-4 rounded-xl border border-slate-200 bg-slate-50 font-bold outline-none focus:ring-2 focus:ring-primary/20"
                        value={newPromotion.target_id || ''}
                        onChange={e => setNewPromotion({ ...newPromotion, target_id: e.target.value })}
                        required
                      >
                        <option value="">Selecione...</option>
                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                  )}

                  {newPromotion.apply_to === 'product' && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Selecione o Produto</label>
                      <select 
                        className="w-full h-14 px-4 rounded-xl border border-slate-200 bg-slate-50 font-bold outline-none focus:ring-2 focus:ring-primary/20"
                        value={newPromotion.target_id || ''}
                        onChange={e => setNewPromotion({ ...newPromotion, target_id: e.target.value })}
                        required
                      >
                        <option value="">Selecione...</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                  )}

                  <div className="pt-2">
                    <button type="submit" className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/30 active:scale-95 transition-all">
                      Salvar Promoção
                    </button>
                    <button type="button" onClick={() => setIsAddingPromotion(false)} className="w-full h-12 text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">Cancelar</button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal Novo Ajuste de Pagamento */}
        <AnimatePresence>
          {isAddingAdjustment && (
            <div className="fixed inset-0 z-[100] flex items-end justify-center">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddingAdjustment(false)} className="absolute inset-0 bg-black/60" />
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-md bg-white rounded-t-[32px] p-6 shadow-2xl">
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" />
                <h3 className="font-black text-lg mb-1 text-slate-900">{editingAdjustment ? 'Editar Ajuste' : 'Novo Ajuste de Pagamento'}</h3>
                <p className="text-xs font-bold text-slate-400 uppercase mb-6">Adicione taxas ou descontos por forma de pagamento</p>
                
                <form className="space-y-4" onSubmit={handleSaveAdjustment}>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Forma de Pagamento</label>
                    <select 
                      className="w-full h-14 px-4 rounded-xl border border-slate-200 bg-slate-50 font-bold outline-none focus:ring-2 focus:ring-primary/20"
                      value={newAdjustment.method}
                      onChange={e => setNewAdjustment({ ...newAdjustment, method: e.target.value })}
                    >
                      <option value="Pix">Pix</option>
                      <option value="Dinheiro">Dinheiro</option>
                      <option value="Cartão Credito">Cartão Credito</option>
                      <option value="Cartão Debito">Cartão Debito</option>
                      <option value="Boleto">Boleto</option>
                    </select>
                  </div>

                  <div className="flex bg-slate-100 p-1 rounded-2xl">
                    <button 
                      type="button"
                      onClick={() => setNewAdjustment({ ...newAdjustment, type: 'discount' })}
                      className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${newAdjustment.type === 'discount' ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'text-slate-400'}`}
                    >
                      Desconto
                    </button>
                    <button 
                      type="button"
                      onClick={() => setNewAdjustment({ ...newAdjustment, type: 'fee' })}
                      className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${newAdjustment.type === 'fee' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'text-slate-400'}`}
                    >
                      Taxa (Acréscimo)
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Tipo de Ajuste</label>
                      <select 
                        className="w-full h-14 px-4 rounded-xl border border-slate-200 bg-slate-50 font-bold outline-none focus:ring-2 focus:ring-primary/20"
                        value={newAdjustment.adjustment_type}
                        onChange={e => setNewAdjustment({ ...newAdjustment, adjustment_type: e.target.value as any })}
                      >
                        <option value="percentage">Porcentagem (%)</option>
                        <option value="fixed">Valor Fixo (R$)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Valor</label>
                      <input 
                        type="number" step="0.01" required
                        className="w-full h-14 px-4 rounded-xl border border-slate-200 bg-slate-50 font-bold outline-none focus:ring-2 focus:ring-primary/20"
                        value={newAdjustment.value}
                        onChange={e => setNewAdjustment({ ...newAdjustment, value: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button type="submit" className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/30 active:scale-95 transition-all">
                      Salvar Ajuste
                    </button>
                    <button type="button" onClick={() => setIsAddingAdjustment(false)} className="w-full h-12 text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">Cancelar</button>
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
    const [isResettingData, setIsResettingData] = useState(false);
    const [localSettings, setLocalSettings] = useState<AppSettings>(appSettings);
    const [localAppConfig, setLocalAppConfig] = useState<UserAppConfig>(userAppConfig);
    const [localProfile, setLocalProfile] = useState<UserProfile>(userProfile);
    const [localPublicCatalog, setLocalPublicCatalog] = useState<PublicCatalog>(publicCatalog || { catalog_slug: '', is_active: false });
    const [newPassword, setNewPassword] = useState('');
    const tabCategoryMap: Record<string, string> = {
      install: 'app',
      notifications: 'app',
      preferences: 'app',
      whatsapp: 'app',
      profile: 'account',
      security: 'account',
      work: 'account',
      company: 'store',
      contact: 'store',
      social: 'store',
      catalog: 'store',
      backups: 'system',
      diagnostic: 'system',
      danger: 'system',
    };

    const categoryFirstTabMap: Record<string, string> = {
      app: 'install',
      account: 'profile',
      store: 'company',
      system: 'backups',
    };

    const [activeSettingsTab, setActiveSettingsTab] = useState<string>(() => {
      try {
        return localStorage.getItem('settings_active_subtab') || localStorage.getItem('settings_active_tab') || 'company';
      } catch {
        return 'company';
      }
    });
    const [activeSettingsCategory, setActiveSettingsCategory] = useState<string>(() => {
      try {
        const storedCategory = localStorage.getItem('settings_active_category') || '';
        const derived = tabCategoryMap[activeSettingsTab] || 'store';
        return storedCategory || derived;
      } catch {
        return tabCategoryMap[activeSettingsTab] || 'store';
      }
    });

    useEffect(() => {
      const derived = tabCategoryMap[activeSettingsTab];
      if (!derived) return;
      if (activeSettingsCategory !== derived) {
        setActiveSettingsCategory(derived);
      }
    }, [activeSettingsTab]);

    useEffect(() => {
      try {
        localStorage.setItem('settings_active_subtab', activeSettingsTab);
      } catch {}
    }, [activeSettingsTab]);

    useEffect(() => {
      try {
        localStorage.setItem('settings_active_category', activeSettingsCategory);
      } catch {}
    }, [activeSettingsCategory]);

    const settingsCategories: Array<{
      id: string;
      label: string;
      icon: React.ElementType;
      tabs: Array<{ id: string; label: string; icon: React.ElementType }>;
    }> = [
      {
        id: 'store',
        label: 'Loja',
        icon: Store,
        tabs: [
          { id: 'company', label: 'Empresa', icon: Building2 },
          { id: 'contact', label: 'Contato', icon: MapPin },
          { id: 'social', label: 'Redes', icon: Globe },
          { id: 'catalog', label: 'Catálogo', icon: Store },
        ],
      },
      {
        id: 'account',
        label: 'Conta',
        icon: User,
        tabs: [
          { id: 'profile', label: 'Perfil', icon: User },
          { id: 'security', label: 'Segurança', icon: Shield },
          { id: 'work', label: 'Jornada', icon: Clock },
        ],
      },
      {
        id: 'app',
        label: 'Aplicativo',
        icon: Smartphone,
        tabs: [
          { id: 'install', label: 'Instalação', icon: Smartphone },
          { id: 'notifications', label: 'Notificações', icon: Bell },
          { id: 'preferences', label: 'Preferências', icon: Settings },
          { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
        ],
      },
      {
        id: 'system',
        label: 'Sistema',
        icon: Shield,
        tabs: [
          { id: 'backups', label: 'Backups', icon: FileText },
          { id: 'diagnostic', label: 'Diagnóstico', icon: Shield },
          { id: 'danger', label: 'Perigo', icon: Trash2 },
        ],
      },
    ];

    const activeCategory = settingsCategories.find(c => c.id === activeSettingsCategory) || settingsCategories[0];

    useEffect(() => {
      const validTabs = new Set(activeCategory.tabs.map(t => t.id));
      if (validTabs.has(activeSettingsTab)) return;
      const fallback = categoryFirstTabMap[activeCategory.id] || activeCategory.tabs[0]?.id || 'company';
      setActiveSettingsTab(fallback);
    }, [activeSettingsCategory]);

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

    const clearLocalAppData = async () => {
      try { localStorage.clear(); } catch {}
      try { sessionStorage.clear(); } catch {}
      try {
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
        }
      } catch {}
      try {
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map(r => r.unregister()));
        }
      } catch {}
      try {
        const anyIDB: any = indexedDB as any;
        if (typeof anyIDB.databases === 'function') {
          const dbs = await anyIDB.databases();
          await Promise.all((dbs || []).map((db: any) => db?.name ? new Promise<void>((resolve) => {
            const req = indexedDB.deleteDatabase(db.name);
            req.onsuccess = () => resolve();
            req.onerror = () => resolve();
            req.onblocked = () => resolve();
          }) : Promise.resolve()));
        }
      } catch {}
    };

    const handleResetAllData = async () => {
      if (isResettingData) return;
      if (!confirm('Isso irá excluir permanentemente TODOS os dados salvos no aplicativo e no banco de dados da sua conta.')) return;
      const typed = prompt('Digite EXCLUIR para confirmar a exclusão total dos dados:');
      if (typed !== 'EXCLUIR') {
        alert('Ação cancelada.');
        return;
      }
      setIsResettingData(true);
      try {
        await supabaseService.resetUserData();
        await clearLocalAppData();
        try {
          await getSupabase().auth.signOut();
        } catch {}
        window.location.hash = '#/login';
        window.location.reload();
      } catch (error: any) {
        alert('Erro ao excluir dados: ' + (error?.message || 'Erro desconhecido'));
      } finally {
        setIsResettingData(false);
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
        <main className="p-4 space-y-6 max-w-4xl mx-auto pb-24">
          <section className="bg-white rounded-3xl p-3 shadow-sm border border-slate-200">
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {settingsCategories.map((category) => {
                const Icon = category.icon;
                const isActive = activeSettingsCategory === category.id;
                return (
                  <button
                    key={category.id}
                    onClick={() => {
                      setActiveSettingsCategory(category.id);
                      const fallback = categoryFirstTabMap[category.id] || category.tabs[0]?.id || 'company';
                      setActiveSettingsTab(fallback);
                    }}
                    className={`shrink-0 px-4 py-3 rounded-2xl border transition-all flex items-center gap-2 ${
                      isActive
                        ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                        : 'bg-slate-50 text-slate-700 border-slate-100 hover:bg-slate-100'
                    }`}
                  >
                    <Icon size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">{category.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="bg-white rounded-3xl p-3 shadow-sm border border-slate-200">
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {activeCategory.tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeSettingsTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSettingsTab(tab.id)}
                    className={`shrink-0 px-4 py-3 rounded-2xl border transition-all flex items-center gap-2 ${
                      isActive
                        ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                        : 'bg-slate-50 text-slate-700 border-slate-100 hover:bg-slate-100'
                    }`}
                  >
                    <Icon size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {activeSettingsTab === 'install' && (
            window.matchMedia('(display-mode: standalone)').matches ? (
              <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-3">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <Smartphone size={16} className="text-primary" /> Instalação
                </h4>
                <p className="text-sm font-bold text-slate-600">
                  O aplicativo já está instalado neste dispositivo.
                </p>
              </section>
            ) : (
              <section className="bg-gradient-to-br from-primary to-blue-600 rounded-3xl p-6 shadow-xl shadow-primary/20 text-white relative overflow-hidden group">
                <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
                  <div className="size-20 bg-white rounded-[28px] flex items-center justify-center text-primary shadow-2xl group-hover:rotate-6 transition-transform shrink-0">
                    <Smartphone size={40} />
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <h4 className="text-xl font-black mb-1">Instalar no Aparelho</h4>
                    <p className="text-xs font-bold opacity-80 uppercase tracking-widest leading-relaxed">
                      {isIOS
                        ? 'Acesse rápido pela tela inicial do seu iPhone'
                        : 'Tenha acesso instantâneo e offline no seu Android ou PC'}
                    </p>
                    <button
                      onClick={handleInstallClick}
                      className="mt-5 w-full sm:w-auto px-8 py-4 bg-white text-primary rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <Download size={18} /> {isIOS ? 'Como Instalar' : 'Instalar Agora'}
                    </button>
                  </div>
                </div>
                <div className="absolute -right-10 -bottom-10 size-48 bg-white/10 rounded-full blur-3xl"></div>
              </section>
            )
          )}

          {activeSettingsTab === 'notifications' && (
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Bell size={16} className="text-primary" /> Notificações
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-700">Permitir Notificações</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                      Receba alertas de novos pedidos instantaneamente
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {notificationPermission === 'granted' ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 size={20} />
                        <span className="text-xs font-black uppercase tracking-widest">Ativado</span>
                      </div>
                    ) : notificationPermission === 'denied' ? (
                      <div className="flex items-center gap-2 text-red-500">
                        <XCircle size={20} />
                        <span className="text-xs font-black uppercase tracking-widest">Bloqueado</span>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Padrão</span>
                    )}
                  </div>
                </div>
                {notificationPermission !== 'granted' && (
                  <button
                    onClick={requestNotificationPermission}
                    className="w-full py-4 bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Bell size={16} /> Ativar Notificações
                  </button>
                )}
                {notificationPermission === 'granted' && (
                  <button
                    onClick={() => sendLocalNotification('Teste de Notificação', 'Funciona! Você receberá alertas de novos pedidos.')}
                    className="w-full py-4 bg-slate-100 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Bell size={16} /> Testar Notificação
                  </button>
                )}
              </div>
            </section>
          )}

          {/* Perfil do Usuário (Etapa 3) */}
          {activeSettingsTab === 'profile' && (
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
                    onChange={e => setLocalProfile({ ...localProfile, full_name: e.target.value })}
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
                    onChange={e => setLocalProfile({ ...localProfile, phone: maskPhone(e.target.value) })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Endereço Residencial</label>
                  <input
                    className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-primary outline-none transition-all font-bold text-sm"
                    value={localProfile.address}
                    onChange={e => setLocalProfile({ ...localProfile, address: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cidade</label>
                    <input
                      className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-primary outline-none transition-all font-bold text-sm"
                      value={localProfile.city}
                      onChange={e => setLocalProfile({ ...localProfile, city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estado</label>
                    <input
                      className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-primary outline-none transition-all font-bold text-sm"
                      value={localProfile.state}
                      onChange={e => setLocalProfile({ ...localProfile, state: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Segurança (Etapa 3) */}
          {activeSettingsTab === 'security' && (
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
          )}

          {/* Horários de Trabalho (Etapa 3) */}
          {activeSettingsTab === 'work' && (
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
                          const currentDays = localProfile.work_days || [];
                          const days = currentDays.includes(day)
                            ? currentDays.filter(d => d !== day)
                            : [...currentDays, day];
                          setLocalProfile({ ...localProfile, work_days: days });
                        }}
                        className={`px-3 py-2 rounded-xl text-[10px] font-black transition-all ${(localProfile.work_days || []).includes(day) ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}
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
                      onChange={e => setLocalProfile({ ...localProfile, work_start_time: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Término</label>
                    <input
                      type="time"
                      className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-primary outline-none transition-all font-bold text-sm"
                      value={localProfile.work_end_time}
                      onChange={e => setLocalProfile({ ...localProfile, work_end_time: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Horário de Atendimento (Descrição)</label>
                  <input
                    className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-primary outline-none transition-all font-bold text-sm"
                    placeholder="Ex: Seg-Sex das 08h às 18h"
                    value={localProfile.service_hours}
                    onChange={e => setLocalProfile({ ...localProfile, service_hours: e.target.value })}
                  />
                </div>
              </div>
            </section>
          )}

          {/* Perfil da Loja */}
          {activeSettingsTab === 'company' && (
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
                    onChange={e => setLocalSettings({ ...localSettings, store_name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp da Loja</label>
                  <input
                    className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-primary outline-none transition-all font-bold text-sm"
                    placeholder="(00) 00000-0000"
                    value={localSettings.store_phone}
                    onChange={e => setLocalSettings({ ...localSettings, store_phone: maskPhone(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CNPJ / CPF</label>
                  <input
                    className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-primary outline-none transition-all font-bold text-sm"
                    value={localSettings.tax_id}
                    onChange={e => setLocalSettings({ ...localSettings, tax_id: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Chave PIX (Para Recebimentos)</label>
                  <input
                    className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-primary outline-none transition-all font-bold text-sm"
                    placeholder="E-mail, CPF, Celular ou Aleatória"
                    value={localSettings.pix_key || ''}
                    onChange={e => setLocalSettings({ ...localSettings, pix_key: e.target.value })}
                  />
                </div>
              </div>
            </section>
          )}

          {/* Endereço e Contato */}
          {activeSettingsTab === 'contact' && (
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
                    onChange={e => setLocalSettings({ ...localSettings, store_address: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail de Suporte</label>
                  <input
                    className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-primary outline-none transition-all font-bold text-sm"
                    value={localSettings.store_email}
                    onChange={e => setLocalSettings({ ...localSettings, store_email: e.target.value })}
                  />
                </div>
              </div>
            </section>
          )}

          {/* Redes Sociais */}
          {activeSettingsTab === 'social' && (
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Globe size={16} className="text-primary" /> Redes Sociais
              </h4>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Instagram</label>
                  <input
                    className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-primary outline-none transition-all font-bold text-sm"
                    placeholder="@seuperfil ou Link"
                    value={localSettings.instagram || ''}
                    onChange={e => setLocalSettings({ ...localSettings, instagram: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Facebook</label>
                  <input
                    className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-primary outline-none transition-all font-bold text-sm"
                    placeholder="Nome da página ou Link"
                    value={localSettings.facebook || ''}
                    onChange={e => setLocalSettings({ ...localSettings, facebook: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">TikTok</label>
                  <input
                    className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-primary outline-none transition-all font-bold text-sm"
                    placeholder="@seuperfil ou Link"
                    value={localSettings.tiktok || ''}
                    onChange={e => setLocalSettings({ ...localSettings, tiktok: e.target.value })}
                  />
                </div>
              </div>
            </section>
          )}

          {/* Preferências do Sistema */}
          {activeSettingsTab === 'preferences' && (
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Settings size={16} className="text-primary" /> Preferências do Aplicativo
              </h4>

              <div className="space-y-4">
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
                      onChange={e => setLocalSettings({ ...localSettings, currency: e.target.value })}
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
          )}

          {/* Integração WhatsApp */}
          {activeSettingsTab === 'whatsapp' && (
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <MessageSquare size={16} className="text-primary" /> Integração WhatsApp
              </h4>
              <p className="text-sm font-bold text-slate-500">
                Envie notificações automáticas de pedidos via WhatsApp para você e seus clientes!
              </p>
              <button
                onClick={() => navigate('whatsapp-config')}
                className="w-full h-14 bg-primary text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
              >
                <Settings size={20} /> Configurar WhatsApp
              </button>
            </section>
          )}

          {/* Gerenciamento de Backups (Etapa 2) */}
          {activeSettingsTab === 'backups' && (
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
          )}

          {activeSettingsTab === 'catalog' && (
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
          )}

          {/* Diagnóstico */}
          {activeSettingsTab === 'diagnostic' && (
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
          )}

          {activeSettingsTab === 'danger' && (
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-red-200 space-y-4">
            <h4 className="text-xs font-black text-red-600 uppercase tracking-widest flex items-center gap-2">
              <Trash2 size={16} /> Zona de Perigo
            </h4>
            <p className="text-[10px] text-slate-500 font-bold leading-relaxed uppercase">
              Exclui produtos, clientes, pedidos, estoque, financeiro, promoções, backups, catálogo público e configurações salvas desta conta.
            </p>
            <button
              onClick={handleResetAllData}
              disabled={isResettingData}
              className="w-full h-14 bg-red-500 text-white rounded-2xl font-black flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-60"
            >
              <Trash2 size={20} /> {isResettingData ? 'Excluindo...' : 'Excluir Todos os Dados'}
            </button>
          </section>
          )}

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

  const WhatsAppConfigPage = () => {
    const [whatsappConfig, setWhatsappConfig] = useState<WhatsAppConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [localConfig, setLocalConfig] = useState<WhatsAppConfig>({
      service_provider: 'evolution',
      enable_owner_notifications: true,
      enable_customer_notifications: true,
      customer_notification_delay_minutes: 5,
    });

    useEffect(() => {
      loadConfig();
    }, []);

    const loadConfig = async () => {
      try {
        const config = await supabaseService.getWhatsAppConfig();
        if (config) {
          setWhatsappConfig(config);
          setLocalConfig({
            ...config,
            service_provider: 'evolution',
          });
        }
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const handleSave = async () => {
      setIsSaving(true);
      try {
        const saved = await supabaseService.upsertWhatsAppConfig({
          ...localConfig,
          service_provider: 'evolution',
        });
        setWhatsappConfig(saved);
        alert('Configurações salvas com sucesso!');
      } catch (error: any) {
        alert('Erro ao salvar: ' + (error.message || 'Erro desconhecido'));
      } finally {
        setIsSaving(false);
      }
    };

    const handleTest = async () => {
      if (!localConfig.owner_whatsapp_number) {
        alert('Informe o seu número de WhatsApp primeiro!');
        return;
      }
      setIsTesting(true);
      setTestResult(null);
      try {
        const supabase = getSupabase();
        const { error } = await supabase.functions.invoke('send-whatsapp-message', {
          body: {
            test: true,
            testNumber: localConfig.owner_whatsapp_number
          }
        });
        if (error) throw error;
        setTestResult({ success: true, message: 'Mensagem de teste enviada com sucesso!' });
      } catch (error: any) {
        setTestResult({ success: false, message: 'Erro: ' + (error.message || 'Falha ao enviar') });
      } finally {
        setIsTesting(false);
      }
    };

    if (isLoading) {
      return (
        <div className="min-h-screen bg-background-light flex items-center justify-center">
          <div className="animate-spin size-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background-light pb-32">
        <Header title="WhatsApp" showBack onBack={() => navigate('settings')} />
        <main className="p-4 space-y-4 max-w-4xl mx-auto">
          {/* Provedor */}
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <MessageSquare size={16} className="text-primary" /> Provedor de Serviço
            </h4>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Evolution API URL</label>
                <input
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                  placeholder="Ex: https://SEU-SERVIDOR:8080"
                  value={localConfig.api_url || ''}
                  onChange={(e) => setLocalConfig({ ...localConfig, api_url: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">API Key (apikey)</label>
                <input
                  type="password"
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                  placeholder="Cole sua apikey"
                  value={localConfig.api_key || ''}
                  onChange={(e) => setLocalConfig({ ...localConfig, api_key: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Instance ID</label>
                <input
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                  placeholder="Ex: minha-instancia"
                  value={localConfig.instance_id || ''}
                  onChange={(e) => setLocalConfig({ ...localConfig, instance_id: e.target.value })}
                />
              </div>
            </div>
          </section>

          {/* Número do Dono */}
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Phone size={16} className="text-primary" /> Seu WhatsApp
            </h4>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Número do WhatsApp</label>
              <input 
                className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                placeholder="(11) 99999-9999"
                value={localConfig.owner_whatsapp_number || ''}
                onChange={(e) => setLocalConfig({ ...localConfig, owner_whatsapp_number: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-700">Notificações para você</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  Receba alertas de novos pedidos
                </p>
              </div>
              <button 
                onClick={() => setLocalConfig({ ...localConfig, enable_owner_notifications: !localConfig.enable_owner_notifications })}
                className={`w-12 h-6 rounded-full transition-all relative ${localConfig.enable_owner_notifications ? 'bg-primary' : 'bg-slate-200'}`}
              >
                <div className={`absolute top-1 size-4 bg-white rounded-full transition-all ${localConfig.enable_owner_notifications ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </section>

          {/* Notificações para Clientes */}
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Users size={16} className="text-primary" /> Notificações para Clientes
            </h4>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-700">Enviar confirmação para clientes</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  Envie comprovante automático após o pedido
                </p>
              </div>
              <button 
                onClick={() => setLocalConfig({ ...localConfig, enable_customer_notifications: !localConfig.enable_customer_notifications })}
                className={`w-12 h-6 rounded-full transition-all relative ${localConfig.enable_customer_notifications ? 'bg-primary' : 'bg-slate-200'}`}
              >
                <div className={`absolute top-1 size-4 bg-white rounded-full transition-all ${localConfig.enable_customer_notifications ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
            {localConfig.enable_customer_notifications && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Delay (minutos)</label>
                <input 
                  type="number"
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                  placeholder="5"
                  value={localConfig.customer_notification_delay_minutes}
                  onChange={(e) => setLocalConfig({ ...localConfig, customer_notification_delay_minutes: parseInt(e.target.value) || 5 })}
                />
              </div>
            )}
          </section>

          {/* Ações */}
          <section className="space-y-3">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="w-full h-16 bg-primary text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.98] disabled:opacity-50 transition-all"
            >
              <CheckCircle2 size={20} /> {isSaving ? 'Salvando...' : 'Salvar Configurações'}
            </button>
            <button 
              onClick={handleTest}
              disabled={isTesting}
              className="w-full h-16 bg-green-500 text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 active:scale-[0.98] disabled:opacity-50 transition-all"
            >
              <Send size={20} /> {isTesting ? 'Enviando...' : 'Testar Configuração'}
            </button>
            {testResult && (
              <div className={`p-4 rounded-2xl text-center ${testResult.success ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                <p className="font-black text-sm">{testResult.message}</p>
              </div>
            )}
            <button 
              onClick={() => navigate('whatsapp-logs')}
              className="w-full h-16 bg-slate-900 text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20 active:scale-[0.98] transition-all"
            >
              <History size={20} /> Ver Histórico de Mensagens
            </button>
          </section>
        </main>
        <BottomNav />
      </div>
    );
  };

  const WhatsAppLogsPage = () => {
    const [logs, setLogs] = useState<WhatsAppMessageLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      loadLogs();
    }, []);

    const loadLogs = async () => {
      try {
        const data = await supabaseService.getWhatsAppMessageLogs();
        setLogs(data);
      } catch (error) {
        console.error('Erro ao carregar logs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'sent': return 'bg-green-50 text-green-600 border-green-200';
        case 'delivered': return 'bg-blue-50 text-blue-600 border-blue-200';
        case 'failed': return 'bg-red-50 text-red-600 border-red-200';
        default: return 'bg-slate-50 text-slate-600 border-slate-200';
      }
    };

    const getStatusText = (status: string) => {
      switch (status) {
        case 'sent': return 'Enviada';
        case 'delivered': return 'Entregue';
        case 'failed': return 'Falha';
        default: return 'Pendente';
      }
    };

    return (
      <div className="min-h-screen bg-background-light pb-32">
        <Header title="Histórico WhatsApp" showBack onBack={() => navigate('whatsapp-config')} />
        <main className="p-4 space-y-4 max-w-4xl mx-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="animate-spin size-8 border-4 border-primary border-t-transparent rounded-full" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carregando...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
              <MessageSquare size={40} className="mx-auto text-slate-200 mb-3" />
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Nenhuma mensagem enviada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${getStatusColor(log.status)}`}>
                          {getStatusText(log.status)}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${log.recipient_type === 'test' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {log.recipient_type === 'owner' ? 'Dono' : log.recipient_type === 'customer' ? 'Cliente' : 'Teste'}
                        </span>
                      </div>
                      <p className="font-black text-slate-900">{log.recipient_number}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                        {new Date(log.created_at!).toLocaleDateString('pt-BR')} às {new Date(log.created_at!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {log.error_message && (
                        <p className="text-xs text-red-500 mt-2 font-bold">Erro: {log.error_message}</p>
                      )}
                    </div>
                    {log.order_id && (
                      <span className="text-xs font-black text-slate-400 uppercase">
                        Pedido #{log.order_id.slice(0, 8)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
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
      case 'promotions': return <PromotionsPage />;
      case 'cart': return <CartPage />;
      case 'checkout': return <CheckoutPage />;
      case 'settings': return <SettingsPage />;
      case 'whatsapp-config': return <WhatsAppConfigPage />;
      case 'whatsapp-logs': return <WhatsAppLogsPage />;
      default: return <DashboardPage />;
    }
  };

  return (
    <div 
      className={`min-h-screen flex flex-col md:flex-row transition-colors duration-300 ${userAppConfig.dark_mode ? 'dark bg-slate-900' : 'bg-slate-50'}`}
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
      
      {/* Sidebar para Desktop */}
      {isConfigured && !['login', 'register', 'recover-password', 'verify-email', 'public-catalog'].includes(currentPage) && <Sidebar />}

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-w-0 max-w-7xl mx-auto w-full">
        {renderPage()}
      </div>
    </div>
  );
}
