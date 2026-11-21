import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Lock,
  LogOut,
  Package,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings2,
  Smartphone,
  Trash2,
  X,
} from 'lucide-react';
import { useMarket } from '../context/MarketContext.tsx';
import { STUDIO_PHONE_IMAGES } from '../data/phonesCatalog.ts';
import {
  CustomerOrder,
  OrderStatus,
  PhoneBrand,
  PhoneCategory,
  PhoneProduct,
  TelegramConfigSummary,
  TelegramDispatchLog,
} from '../types/market.ts';
import { formatDateUz, formatUzs } from '../utils/formatters.ts';

type AdminTab = 'orders' | 'phones' | 'telegram';

const ORDER_STATUSES: OrderStatus[] = [
  'Yangi',
  'Tasdiqlandi',
  'Yo‘lda',
  'Yetkazildi',
  'Bekor qilindi',
];

const BRAND_OPTIONS: PhoneBrand[] = ['Apple', 'Samsung', 'Xiaomi', 'Google', 'Nothing'];
const CATEGORY_OPTIONS: PhoneCategory[] = [
  'Olovrang nashr',
  'Flagman',
  'Buklanadigan',
  'O‘rta sinf',
];

const IMAGE_PRESETS = [
  { label: 'Olovrang Titan', url: STUDIO_PHONE_IMAGES.orange },
  { label: 'Qora Titan', url: STUDIO_PHONE_IMAGES.black },
  { label: 'Oq Keramika', url: STUDIO_PHONE_IMAGES.white },
  { label: 'Buklanadigan Qora', url: STUDIO_PHONE_IMAGES.foldable },
];

export const AdminPage: React.FC = () => {
  const { adminToken, setAdminToken, notify, refreshPhones } = useMarket();

  const [configured, setConfigured] = useState<boolean | null>(null);
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>('orders');
  const [loadingData, setLoadingData] = useState(false);

  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [phones, setPhones] = useState<PhoneProduct[]>([]);
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfigSummary | null>(null);
  const [telegramLogs, setTelegramLogs] = useState<TelegramDispatchLog[]>([]);

  // Order filters & detail modal
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatus | 'Barchasi'>('Barchasi');
  const [orderSearch, setOrderSearch] = useState('');
  const [inspectOrder, setInspectOrder] = useState<CustomerOrder | null>(null);
  const [resendingOrderId, setResendingOrderId] = useState<string | null>(null);

  // Add Phone form state
  const [showAddPhone, setShowAddPhone] = useState(false);
  const [newBrand, setNewBrand] = useState<PhoneBrand>('Apple');
  const [newModel, setNewModel] = useState('');
  const [newCategory, setNewCategory] = useState<PhoneCategory>('Flagman');
  const [newPrice, setNewPrice] = useState('12500000');
  const [newStorage, setNewStorage] = useState('256 GB');
  const [newStock, setNewStock] = useState('10');
  const [newImage, setNewImage] = useState<string>(STUDIO_PHONE_IMAGES.orange);
  const [newDesc, setNewDesc] = useState('');
  const [newProcessor, setNewProcessor] = useState('');
  const [newFeatured, setNewFeatured] = useState(true);
  const [savingPhone, setSavingPhone] = useState(false);

  // Telegram settings form state
  const [tgTokenInput, setTgTokenInput] = useState('');
  const [tgChannelInput, setTgChannelInput] = useState('-1004316865165');
  const [autoSendOrders, setAutoSendOrders] = useState(true);
  const [autoSendStatusUpdates, setAutoSendStatusUpdates] = useState(true);
  const [savingTg, setSavingTg] = useState(false);
  const [testingTg, setTestingTg] = useState(false);
  const [tgFeedback, setTgFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const checkAdminStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/status');
      const data = (await res.json()) as { configured: boolean };
      setConfigured(Boolean(data.configured));
    } catch {
      setConfigured(true);
    }
  }, []);

  useEffect(() => {
    checkAdminStatus();
  }, [checkAdminStatus]);

  const loadOverview = useCallback(
    async (token: string) => {
      setLoadingData(true);
      try {
        const res = await fetch('/api/admin/overview', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          setAdminToken(null);
          return;
        }
        const data = (await res.json()) as {
          orders: CustomerOrder[];
          phones: PhoneProduct[];
          telegramConfig: TelegramConfigSummary;
          telegramLogs: TelegramDispatchLog[];
        };
        setOrders(data.orders || []);
        setPhones(data.phones || []);
        setTelegramConfig(data.telegramConfig || null);
        setTelegramLogs(data.telegramLogs || []);
        if (data.telegramConfig) {
          setTgChannelInput(data.telegramConfig.channelId || '-1004316865165');
          setAutoSendOrders(data.telegramConfig.autoSendOrders);
          setAutoSendStatusUpdates(data.telegramConfig.autoSendStatusUpdates);
        }
      } catch {
        notify('Admin ma’lumotlarini yuklashda xatolik yuz berdi.', 'error');
      } finally {
        setLoadingData(false);
      }
    },
    [notify, setAdminToken]
  );

  useEffect(() => {
    if (adminToken) {
      loadOverview(adminToken);
    }
  }, [adminToken, loadOverview]);

  const handleBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (passcode.length < 6) {
      setAuthError('Parol kamida 6 ta belgidan iborat bo‘lishi kerak.');
      return;
    }
    if (passcode !== confirmPasscode) {
      setAuthError('Parollar mos kelmadi.');
      return;
    }
    setAuthLoading(true);
    try {
      const res = await fetch('/api/admin/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      });
      const data = (await res.json()) as { token?: string; error?: string };
      if (!res.ok || !data.token) {
        setAuthError(data.error || 'Parol o‘rnatishda xatolik.');
        return;
      }
      setPasscode('');
      setConfirmPasscode('');
      setConfigured(true);
      setAdminToken(data.token);
      notify('Administrator paroli o‘rnatildi', 'success');
    } catch {
      setAuthError('Server bilan bog‘lanib bo‘lmadi.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      });
      const data = (await res.json()) as { token?: string; error?: string };
      if (!res.ok || !data.token) {
        setAuthError(data.error || 'Parol noto‘g‘ri.');
        return;
      }
      setPasscode('');
      setAdminToken(data.token);
      notify('Admin panelga muvaffaqiyatli kirdingiz', 'success');
    } catch {
      setAuthError('Server bilan bog‘lanib bo‘lmadi.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleOrderStatusChange = async (orderId: string, status: OrderStatus) => {
    if (!adminToken) return;
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = (await res.json()) as {
        orders?: CustomerOrder[];
        telegramLogs?: TelegramDispatchLog[];
        error?: string;
      };
      if (!res.ok) {
        notify(data.error || 'Holatni yangilab bo‘lmadi', 'error');
        return;
      }
      if (data.orders) setOrders(data.orders);
      if (data.telegramLogs) setTelegramLogs(data.telegramLogs);
      notify(`Buyurtma holati "${status}" ga o‘zgartirildi`, 'success');
    } catch {
      notify('Server xatoligi.', 'error');
    }
  };

  const handleResendTelegram = async (orderId: string) => {
    if (!adminToken) return;
    setResendingOrderId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/resend-telegram`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = (await res.json()) as {
        orders?: CustomerOrder[];
        telegramLogs?: TelegramDispatchLog[];
        error?: string;
      };
      if (data.orders) setOrders(data.orders);
      if (data.telegramLogs) setTelegramLogs(data.telegramLogs);
      if (!res.ok) {
        notify(data.error || 'Telegramga yuborib bo‘lmadi.', 'error');
        return;
      }
      notify('Buyurtma Telegram kanalga muvaffaqiyatli yuborildi!', 'success');
    } catch {
      notify('Tarmoq xatoligi.', 'error');
    } finally {
      setResendingOrderId(null);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!adminToken) return;
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = (await res.json()) as { orders?: CustomerOrder[]; error?: string };
      if (!res.ok) {
        notify(data.error || 'O‘chirib bo‘lmadi', 'error');
        return;
      }
      if (data.orders) setOrders(data.orders);
      if (inspectOrder?.id === orderId) setInspectOrder(null);
      notify('Buyurtma o‘chirildi', 'info');
    } catch {
      notify('Server xatoligi.', 'error');
    }
  };

  const handleAddPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;
    setSavingPhone(true);
    try {
      const res = await fetch('/api/admin/phones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          brand: newBrand,
          model: newModel,
          category: newCategory,
          basePriceUzs: Number(newPrice),
          storageLabel: newStorage,
          stockCount: Number(newStock),
          imageUrl: newImage,
          shortDesc: newDesc,
          processor: newProcessor,
          featured: newFeatured,
        }),
      });
      const data = (await res.json()) as { phones?: PhoneProduct[]; error?: string };
      if (!res.ok || !data.phones) {
        notify(data.error || 'Telefon qo‘shishda xatolik.', 'error');
        return;
      }
      setPhones(data.phones);
      setShowAddPhone(false);
      setNewModel('');
      setNewDesc('');
      setNewProcessor('');
      await refreshPhones();
      notify('Yangi smartfon katalogga qo‘shildi', 'success');
    } catch {
      notify('Server xatoligi.', 'error');
    } finally {
      setSavingPhone(false);
    }
  };

  const handleToggleStock = async (phone: PhoneProduct) => {
    if (!adminToken) return;
    try {
      const res = await fetch(`/api/admin/phones/${phone.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ inStock: !phone.inStock }),
      });
      const data = (await res.json()) as { phones?: PhoneProduct[] };
      if (res.ok && data.phones) {
        setPhones(data.phones);
        await refreshPhones();
      }
    } catch {
      notify('Holatni o‘zgartirishda xatolik.', 'error');
    }
  };

  const handleDeletePhone = async (phoneId: string) => {
    if (!adminToken) return;
    try {
      const res = await fetch(`/api/admin/phones/${phoneId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = (await res.json()) as { phones?: PhoneProduct[] };
      if (res.ok && data.phones) {
        setPhones(data.phones);
        await refreshPhones();
        notify('Mahsulot o‘chirildi', 'info');
      }
    } catch {
      notify('O‘chirishda xatolik.', 'error');
    }
  };

  const handleSaveTelegramConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;
    setSavingTg(true);
    setTgFeedback(null);
    try {
      const res = await fetch('/api/admin/telegram/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          botToken: tgTokenInput.trim() || undefined,
          channelId: tgChannelInput.trim(),
          autoSendOrders,
          autoSendStatusUpdates,
        }),
      });
      const data = (await res.json()) as {
        telegramConfig?: TelegramConfigSummary;
        telegramLogs?: TelegramDispatchLog[];
        error?: string;
      };
      if (!res.ok) {
        setTgFeedback({ ok: false, text: data.error || 'Saqlashda xatolik yuz berdi.' });
        return;
      }
      if (data.telegramConfig) setTelegramConfig(data.telegramConfig);
      if (data.telegramLogs) setTelegramLogs(data.telegramLogs);
      setTgTokenInput('');
      setTgFeedback({
        ok: true,
        text: 'Telegram sozlamalari serverda xavfsiz saqlandi.',
      });
      notify('Telegram sozlamalari saqlandi', 'success');
    } catch {
      setTgFeedback({ ok: false, text: 'Server bilan aloqa xatosi.' });
    } finally {
      setSavingTg(false);
    }
  };

  const handleTestTelegram = async () => {
    if (!adminToken) return;
    setTestingTg(true);
    setTgFeedback(null);
    try {
      const res = await fetch('/api/admin/telegram/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          botToken: tgTokenInput.trim() || undefined,
          channelId: tgChannelInput.trim() || undefined,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        botUsername?: string;
        messageId?: number;
        telegramLogs?: TelegramDispatchLog[];
        error?: string;
      };
      if (data.telegramLogs) setTelegramLogs(data.telegramLogs);
      if (!res.ok || !data.ok) {
        setTgFeedback({
          ok: false,
          text: data.error || 'Test xabarini yuborib bo‘lmadi.',
        });
        return;
      }
      setTgFeedback({
        ok: true,
        text: `@${data.botUsername} boti orqali kanalga test xabar (#${data.messageId}) muvaffaqiyatli yuborildi!`,
      });
      notify('Telegram kanalga test xabari yuborildi!', 'success');
    } catch {
      setTgFeedback({ ok: false, text: 'Server bilan bog‘lanib bo‘lmadi.' });
    } finally {
      setTestingTg(false);
    }
  };

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    return orders.filter((o) => {
      if (orderStatusFilter !== 'Barchasi' && o.status !== orderStatusFilter) return false;
      if (q) {
        const hay = `${o.orderNumber} ${o.customerName} ${o.phone} ${o.region}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [orders, orderStatusFilter, orderSearch]);

  const kpis = useMemo(() => {
    const totalOrders = orders.length;
    const newOrders = orders.filter((o) => o.status === 'Yangi').length;
    const activeRevenue = orders
      .filter((o) => o.status !== 'Bekor qilindi')
      .reduce((sum, o) => sum + o.totalUzs, 0);
    const telegramSent = orders.filter((o) => o.telegramStatus === 'sent').length;
    return { totalOrders, newOrders, activeRevenue, telegramSent };
  }, [orders]);

  // ========================================================
  // LOGIN / FIRST-RUN BOOTSTRAP GATE
  // ========================================================
  if (!adminToken) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[#F6F6F8] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-[#E4E4E8] rounded-2xl p-7 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#0B0B0F] text-[#FF5500] flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-[#0B0B0F]">
                {configured === false
                  ? 'Admin parolini yaratish'
                  : 'Admin Panelga kirish'}
              </h1>
              <p className="text-xs text-neutral-500">
                {configured === false
                  ? 'Birinchi ishga tushirish: boshqaruv paneli uchun parol belgilang'
                  : 'Buyurtmalar, katalog va Telegram bot boshqaruvi'}
              </p>
            </div>
          </div>

          {authError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs">
              {authError}
            </div>
          )}

          {configured === false ? (
            <form onSubmit={handleBootstrap} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Yangi administrator paroli (kamida 6 ta belgi)
                </label>
                <input
                  type="password"
                  required
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E8] text-sm focus:outline-none focus:border-[#FF5500]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Parolni tasdiqlang
                </label>
                <input
                  type="password"
                  required
                  value={confirmPasscode}
                  onChange={(e) => setConfirmPasscode(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E8] text-sm focus:outline-none focus:border-[#FF5500]"
                />
              </div>
              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 rounded-lg bg-[#FF5500] hover:bg-[#E04800] text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                {authLoading ? 'Saqlanmoqda...' : 'Parolni saqlash va kirish'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Administrator paroli
                </label>
                <input
                  type="password"
                  required
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Parolni kiriting"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E8] text-sm focus:outline-none focus:border-[#FF5500]"
                />
              </div>
              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 rounded-lg bg-[#0B0B0F] hover:bg-neutral-800 text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                {authLoading ? 'Tekshirilmoqda...' : 'Kirish'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // ========================================================
  // AUTHENTICATED ADMIN CONSOLE
  // ========================================================
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F6F6F8] text-[#0B0B0F]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar Navigation */}
        <aside className="lg:col-span-3 space-y-4">
          <div className="bg-white border border-[#E4E4E8] rounded-xl p-4 space-y-1">
            <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Boshqaruv bo‘limlari
            </p>
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-[#0B0B0F] text-white'
                  : 'text-neutral-700 hover:bg-[#F4F4F6]'
              }`}
            >
              <span className="inline-flex items-center gap-2.5">
                <Package className="w-4 h-4 text-[#FF5500]" />
                Buyurtmalar
              </span>
              <span className="font-mono tabular-nums text-xs opacity-80">{orders.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('phones')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'phones'
                  ? 'bg-[#0B0B0F] text-white'
                  : 'text-neutral-700 hover:bg-[#F4F4F6]'
              }`}
            >
              <span className="inline-flex items-center gap-2.5">
                <Smartphone className="w-4 h-4 text-[#FF5500]" />
                Telefonlar katalogi
              </span>
              <span className="font-mono tabular-nums text-xs opacity-80">{phones.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('telegram')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'telegram'
                  ? 'bg-[#0B0B0F] text-white'
                  : 'text-neutral-700 hover:bg-[#F4F4F6]'
              }`}
            >
              <span className="inline-flex items-center gap-2.5">
                <Send className="w-4 h-4 text-[#FF5500]" />
                Telegram Bot
              </span>
              <span
                className={`text-[11px] font-medium ${
                  telegramConfig?.hasBotToken ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {telegramConfig?.hasBotToken ? 'Faol' : 'Sozlanmagan'}
              </span>
            </button>
          </div>

          <div className="bg-white border border-[#E4E4E8] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-500">Kanal ID</span>
              <span className="font-mono font-semibold text-[#0B0B0F]">
                {telegramConfig?.channelId || '-1004316865165'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setAdminToken(null)}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-[#E4E4E8] text-xs font-medium text-neutral-700 hover:bg-[#F4F4F6] transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Chiqish</span>
            </button>
          </div>
        </aside>

        {/* Main Workspace */}
        <div className="lg:col-span-9 space-y-6">
          {/* Top Breadcrumb & Refresh */}
          <div className="bg-white border border-[#E4E4E8] rounded-xl px-5 py-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs text-neutral-500">
                Admin Panel /{' '}
                <span className="text-[#0B0B0F] font-medium">
                  {activeTab === 'orders'
                    ? 'Buyurtmalar'
                    : activeTab === 'phones'
                    ? 'Mahsulotlar'
                    : 'Telegram Bot'}
                </span>
              </p>
              <h1 className="font-display text-xl font-bold text-[#0B0B0F]">
                OLOV MOBILE Boshqaruv Konsoli
              </h1>
            </div>

            <button
              type="button"
              onClick={() => loadOverview(adminToken)}
              disabled={loadingData}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#E4E4E8] bg-white hover:bg-[#F4F4F6] text-xs font-semibold transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
              <span>Yangilash</span>
            </button>
          </div>

          {/* Telegram Unconfigured Alert Banner */}
          {telegramConfig && !telegramConfig.hasBotToken && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900">
                  <p className="font-semibold">
                    Telegram bot tokeni hali serverga kiritilmagan
                  </p>
                  <p className="mt-0.5 text-amber-800">
                    Buyurtmalar real vaqtda <span className="font-mono">{telegramConfig.channelId}</span>{' '}
                    kanaliga yuborilishi uchun Telegram Bot bo‘limida tokenni saqlang.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('telegram')}
                className="px-4 py-2 rounded-lg bg-[#FF5500] hover:bg-[#E04800] text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Botni sozlash
              </button>
            </div>
          )}

          {/* KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-[#E4E4E8] rounded-xl p-4">
              <p className="text-xs text-neutral-500">Jami buyurtmalar</p>
              <p className="font-mono tabular-nums text-2xl font-bold text-[#0B0B0F] mt-1">
                {kpis.totalOrders}
              </p>
            </div>
            <div className="bg-white border border-[#E4E4E8] rounded-xl p-4">
              <p className="text-xs text-neutral-500">Yangi buyurtmalar</p>
              <p className="font-mono tabular-nums text-2xl font-bold text-[#FF5500] mt-1">
                {kpis.newOrders}
              </p>
            </div>
            <div className="bg-white border border-[#E4E4E8] rounded-xl p-4">
              <p className="text-xs text-neutral-500">Faol savdo hajmi</p>
              <p className="font-mono tabular-nums text-lg font-bold text-[#0B0B0F] mt-2 truncate">
                {formatUzs(kpis.activeRevenue)}
              </p>
            </div>
            <div className="bg-white border border-[#E4E4E8] rounded-xl p-4">
              <p className="text-xs text-neutral-500">Telegramga yuborildi</p>
              <p className="font-mono tabular-nums text-2xl font-bold text-emerald-700 mt-1">
                {kpis.telegramSent}
              </p>
            </div>
          </div>

          {/* TAB 1: ORDERS */}
          {activeTab === 'orders' && (
            <div className="bg-white border border-[#E4E4E8] rounded-xl overflow-hidden">
              <div className="p-4 border-b border-[#E4E4E8] flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                  {(['Barchasi', ...ORDER_STATUSES] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setOrderStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                        orderStatusFilter === st
                          ? 'bg-[#0B0B0F] text-white'
                          : 'bg-[#F6F6F8] text-neutral-700 hover:bg-neutral-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <div className="relative w-full md:w-64">
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Raqam, ism yoki telefon..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#E4E4E8] text-xs focus:outline-none focus:border-[#FF5500]"
                  />
                </div>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="p-10 text-center text-sm text-neutral-500">
                  Tanlangan mezon bo‘yicha buyurtmalar topilmadi.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#FAFAFB] border-b border-[#E4E4E8] text-neutral-500">
                        <th className="py-3 px-4 font-semibold">Buyurtma</th>
                        <th className="py-3 px-4 font-semibold">Mijoz</th>
                        <th className="py-3 px-4 font-semibold">Mahsulotlar</th>
                        <th className="py-3 px-4 font-semibold text-right">Summa</th>
                        <th className="py-3 px-4 font-semibold">Telegram</th>
                        <th className="py-3 px-4 font-semibold">Holat</th>
                        <th className="py-3 px-4 font-semibold text-right">Amallar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0F0F4]">
                      {filteredOrders.map((ord) => (
                        <tr key={ord.id} className="hover:bg-[#FAFAFB]">
                          <td className="py-3 px-4 align-top">
                            <span className="font-mono font-bold text-[#0B0B0F]">
                              #{ord.orderNumber}
                            </span>
                            <div className="text-[11px] text-neutral-500 mt-0.5 font-mono">
                              {formatDateUz(ord.createdAt)}
                            </div>
                          </td>
                          <td className="py-3 px-4 align-top">
                            <p className="font-semibold text-[#0B0B0F]">{ord.customerName}</p>
                            <p className="text-neutral-600 font-mono">{ord.phone}</p>
                            <p className="text-neutral-500">{ord.region}</p>
                          </td>
                          <td className="py-3 px-4 align-top max-w-[220px]">
                            {ord.items.map((it, idx) => (
                              <p key={idx} className="text-[#0B0B0F] truncate">
                                {it.model} ({it.storage}) × {it.quantity}
                              </p>
                            ))}
                          </td>
                          <td className="py-3 px-4 align-top text-right font-mono tabular-nums font-bold text-[#0B0B0F] whitespace-nowrap">
                            {formatUzs(ord.totalUzs)}
                          </td>
                          <td className="py-3 px-4 align-top whitespace-nowrap">
                            <span
                              className={`font-medium ${
                                ord.telegramStatus === 'sent'
                                  ? 'text-emerald-700'
                                  : ord.telegramStatus === 'failed'
                                  ? 'text-red-600'
                                  : 'text-amber-700'
                              }`}
                            >
                              {ord.telegramStatus === 'sent'
                                ? 'Yuborilgan'
                                : ord.telegramStatus === 'failed'
                                ? 'Xatolik'
                                : 'Sozlanmagan'}
                            </span>
                          </td>
                          <td className="py-3 px-4 align-top">
                            <select
                              value={ord.status}
                              onChange={(e) =>
                                handleOrderStatusChange(ord.id, e.target.value as OrderStatus)
                              }
                              aria-label={`${ord.orderNumber} holati`}
                              className="px-2 py-1 rounded border border-[#E4E4E8] bg-white text-xs font-medium focus:outline-none focus:border-[#FF5500] cursor-pointer"
                            >
                              {ORDER_STATUSES.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3 px-4 align-top text-right whitespace-nowrap space-x-1">
                            <button
                              type="button"
                              title="Batafsil ko‘rish"
                              onClick={() => setInspectOrder(ord)}
                              className="p-1.5 rounded border border-[#E4E4E8] hover:border-[#0B0B0F] text-neutral-700 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Telegram kanalga qayta yuborish"
                              disabled={resendingOrderId === ord.id}
                              onClick={() => handleResendTelegram(ord.id)}
                              className="p-1.5 rounded border border-[#E4E4E8] hover:border-[#FF5500] text-[#FF5500] disabled:opacity-50 cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Buyurtmani o‘chirish"
                              onClick={() => handleDeleteOrder(ord.id)}
                              className="p-1.5 rounded border border-[#E4E4E8] hover:border-red-500 text-red-600 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PHONES INVENTORY */}
          {activeTab === 'phones' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-[#0B0B0F]">
                  Smartfonlar ombori
                </h2>
                <button
                  type="button"
                  onClick={() => setShowAddPhone((prev) => !prev)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FF5500] hover:bg-[#E04800] text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{showAddPhone ? 'Yopish' : 'Yangi telefon qo‘shish'}</span>
                </button>
              </div>

              {showAddPhone && (
                <form
                  onSubmit={handleAddPhone}
                  className="bg-white border border-[#E4E4E8] rounded-xl p-5 space-y-4"
                >
                  <h3 className="font-display text-base font-bold">Yangi model qo‘shish</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 mb-1">
                        Brend
                      </label>
                      <select
                        value={newBrand}
                        onChange={(e) => setNewBrand(e.target.value as PhoneBrand)}
                        className="w-full px-3 py-2 rounded-lg border border-[#E4E4E8] text-sm bg-white"
                      >
                        {BRAND_OPTIONS.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 mb-1">
                        Model nomi *
                      </label>
                      <input
                        type="text"
                        required
                        value={newModel}
                        onChange={(e) => setNewModel(e.target.value)}
                        placeholder="Masalan: iPhone 17 Air"
                        className="w-full px-3 py-2 rounded-lg border border-[#E4E4E8] text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 mb-1">
                        Toifa
                      </label>
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value as PhoneCategory)}
                        className="w-full px-3 py-2 rounded-lg border border-[#E4E4E8] text-sm bg-white"
                      >
                        {CATEGORY_OPTIONS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 mb-1">
                        Narx (so‘m) *
                      </label>
                      <input
                        type="number"
                        required
                        min={500000}
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-[#E4E4E8] text-sm font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 mb-1">
                        Xotira
                      </label>
                      <input
                        type="text"
                        value={newStorage}
                        onChange={(e) => setNewStorage(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-[#E4E4E8] text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 mb-1">
                        Ombor soni
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={newStock}
                        onChange={(e) => setNewStock(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-[#E4E4E8] text-sm font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 mb-1">
                        Rasm tanlang
                      </label>
                      <select
                        value={newImage}
                        onChange={(e) => setNewImage(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-[#E4E4E8] text-sm bg-white"
                      >
                        {IMAGE_PRESETS.map((img) => (
                          <option key={img.url} value={img.url}>
                            {img.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 mb-1">
                        Protsessor
                      </label>
                      <input
                        type="text"
                        value={newProcessor}
                        onChange={(e) => setNewProcessor(e.target.value)}
                        placeholder="Snapdragon 8 Elite"
                        className="w-full px-3 py-2 rounded-lg border border-[#E4E4E8] text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 mb-1">
                        Qisqa tavsif
                      </label>
                      <input
                        type="text"
                        value={newDesc}
                        onChange={(e) => setNewDesc(e.target.value)}
                        placeholder="Titan korpus va 120Hz OLED displey"
                        className="w-full px-3 py-2 rounded-lg border border-[#E4E4E8] text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <label className="inline-flex items-center gap-2 text-xs font-medium text-neutral-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newFeatured}
                        onChange={(e) => setNewFeatured(e.target.checked)}
                        className="accent-[#FF5500]"
                      />
                      <span>Tanlangan model sifatida ko‘rsatish</span>
                    </label>

                    <button
                      type="submit"
                      disabled={savingPhone}
                      className="px-5 py-2.5 rounded-lg bg-[#0B0B0F] hover:bg-neutral-800 text-white text-xs font-semibold cursor-pointer"
                    >
                      {savingPhone ? 'Saqlanmoqda...' : 'Katalogga qo‘shish'}
                    </button>
                  </div>
                </form>
              )}

              <div className="bg-white border border-[#E4E4E8] rounded-xl overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#FAFAFB] border-b border-[#E4E4E8] text-neutral-500">
                      <th className="py-3 px-4 font-semibold">Model</th>
                      <th className="py-3 px-4 font-semibold">Toifa</th>
                      <th className="py-3 px-4 font-semibold text-right">Boshlang‘ich narx</th>
                      <th className="py-3 px-4 font-semibold text-right">Ombor</th>
                      <th className="py-3 px-4 font-semibold">Holat</th>
                      <th className="py-3 px-4 font-semibold text-right">Amal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F0F4]">
                    {phones.map((ph) => (
                      <tr key={ph.id} className="hover:bg-[#FAFAFB]">
                        <td className="py-3 px-4">
                          <p className="font-semibold text-[#0B0B0F]">
                            {ph.brand} {ph.model}
                          </p>
                          <p className="text-[11px] text-neutral-500">{ph.specs.processor}</p>
                        </td>
                        <td className="py-3 px-4 text-neutral-600">{ph.category}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-bold">
                          {formatUzs(ph.storageOptions[0]?.priceUzs || 0)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          {ph.stockCount} dona
                        </td>
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => handleToggleStock(ph)}
                            className={`px-2.5 py-1 rounded border text-[11px] font-semibold cursor-pointer ${
                              ph.inStock
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-red-200 bg-red-50 text-red-700'
                            }`}
                          >
                            {ph.inStock ? 'Sotuvda' : 'Tugagan'}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeletePhone(ph.id)}
                            title="O‘chirish"
                            className="p-1.5 rounded border border-[#E4E4E8] hover:border-red-500 text-red-600 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: TELEGRAM BOT & CHANNEL INTEGRATION */}
          {activeTab === 'telegram' && (
            <div className="space-y-6">
              <div className="bg-white border border-[#E4E4E8] rounded-xl p-6 space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-[#E4E4E8]">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#0B0B0F] text-[#FF5500] flex items-center justify-center shrink-0">
                      <Settings2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-display text-lg font-bold text-[#0B0B0F]">
                        Telegram Bot va Kanal Integratsiyasi
                      </h2>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        Har bir yangi buyurtma real vaqtda ko‘rsatilgan Telegram kanalga yuboriladi.
                      </p>
                    </div>
                  </div>

                  <div className="text-right text-xs">
                    <span
                      className={`font-semibold ${
                        telegramConfig?.hasBotToken ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {telegramConfig?.hasBotToken
                        ? `Token ulangan (${telegramConfig.maskedToken})`
                        : 'Bot tokeni kiritilmagan'}
                    </span>
                  </div>
                </div>

                {tgFeedback && (
                  <div
                    className={`p-3.5 rounded-lg border text-xs flex items-start gap-2 ${
                      tgFeedback.ok
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-red-50 border-red-200 text-red-900'
                    }`}
                  >
                    {tgFeedback.ok ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    )}
                    <span>{tgFeedback.text}</span>
                  </div>
                )}

                <form onSubmit={handleSaveTelegramConfig} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-neutral-700 mb-1">
                        Telegram Bot Token
                      </label>
                      <input
                        type="password"
                        value={tgTokenInput}
                        onChange={(e) => setTgTokenInput(e.target.value)}
                        placeholder={
                          telegramConfig?.hasBotToken
                            ? 'O‘zgartirish uchun yangi token kiriting...'
                            : 'Masalan: 123456789:AAH...'
                        }
                        className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E8] text-sm font-mono focus:outline-none focus:border-[#FF5500]"
                      />
                      <p className="text-[11px] text-neutral-500 mt-1">
                        Token server xotirasida saqlanadi va brauzerga qaytarilmaydi.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-700 mb-1">
                        Telegram Kanal ID
                      </label>
                      <input
                        type="text"
                        required
                        value={tgChannelInput}
                        onChange={(e) => setTgChannelInput(e.target.value)}
                        placeholder="-1004316865165"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E8] text-sm font-mono focus:outline-none focus:border-[#FF5500]"
                      />
                      <p className="text-[11px] text-neutral-500 mt-1">
                        Bot ushbu kanalda administrator (xabar yozish huquqi bilan) bo‘lishi shart.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <label className="flex items-center gap-2.5 text-xs font-medium text-neutral-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoSendOrders}
                        onChange={(e) => setAutoSendOrders(e.target.checked)}
                        className="accent-[#FF5500]"
                      />
                      <span>Yangi buyurtmalarni real vaqtda avtomatik kanalga yuborish</span>
                    </label>

                    <label className="flex items-center gap-2.5 text-xs font-medium text-neutral-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoSendStatusUpdates}
                        onChange={(e) => setAutoSendStatusUpdates(e.target.checked)}
                        className="accent-[#FF5500]"
                      />
                      <span>Buyurtma holati o‘zgartirilganda kanalga yangilanish yuborish</span>
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={savingTg}
                      className="px-5 py-2.5 rounded-lg bg-[#0B0B0F] hover:bg-neutral-800 text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      {savingTg ? 'Saqlanmoqda...' : 'Sozlamalarni saqlash'}
                    </button>

                    <button
                      type="button"
                      disabled={testingTg}
                      onClick={handleTestTelegram}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#FF5500] hover:bg-[#E04800] text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{testingTg ? 'Yuborilmoqda...' : 'Test Xabar Yuborish'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Telegram Dispatch Log */}
              <div className="bg-white border border-[#E4E4E8] rounded-xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#E4E4E8]">
                  <h3 className="font-display text-sm font-bold text-[#0B0B0F]">
                    Telegram jo‘natmalari jurnali
                  </h3>
                </div>
                {telegramLogs.length === 0 ? (
                  <p className="p-6 text-xs text-neutral-500 text-center">
                    Hozircha Telegram jo‘natmalari qayd etilmagan.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#FAFAFB] border-b border-[#E4E4E8] text-neutral-500">
                          <th className="py-2.5 px-4 font-semibold">Vaqt</th>
                          <th className="py-2.5 px-4 font-semibold">Buyurtma</th>
                          <th className="py-2.5 px-4 font-semibold">Kanal</th>
                          <th className="py-2.5 px-4 font-semibold">Holat</th>
                          <th className="py-2.5 px-4 font-semibold">Izoh</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F0F0F4]">
                        {telegramLogs.map((log) => (
                          <tr key={log.id}>
                            <td className="py-2.5 px-4 font-mono text-[11px] text-neutral-500 whitespace-nowrap">
                              {formatDateUz(log.timestamp)}
                            </td>
                            <td className="py-2.5 px-4 font-mono font-semibold">
                              {log.orderNumber}
                            </td>
                            <td className="py-2.5 px-4 font-mono">{log.channelId}</td>
                            <td className="py-2.5 px-4">
                              <span
                                className={`font-semibold ${
                                  log.success ? 'text-emerald-700' : 'text-red-600'
                                }`}
                              >
                                {log.success ? 'Yuborildi' : 'Xatolik'}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-neutral-600">{log.detail}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Order Detail Modal */}
      {inspectOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setInspectOrder(null)}
        >
          <div
            className="bg-white w-full max-w-lg rounded-2xl border border-[#E4E4E8] p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E4E4E8]">
              <div>
                <h3 className="font-display text-lg font-bold">
                  Buyurtma #{inspectOrder.orderNumber}
                </h3>
                <p className="text-xs text-neutral-500">{formatDateUz(inspectOrder.createdAt)}</p>
              </div>
              <button
                type="button"
                onClick={() => setInspectOrder(null)}
                className="p-1.5 rounded-lg hover:bg-neutral-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p>
                <span className="text-neutral-500">Mijoz:</span>{' '}
                <strong className="text-[#0B0B0F]">{inspectOrder.customerName}</strong>
              </p>
              <p>
                <span className="text-neutral-500">Telefon:</span>{' '}
                <span className="font-mono font-semibold">{inspectOrder.phone}</span>
              </p>
              <p>
                <span className="text-neutral-500">Manzil:</span> {inspectOrder.region},{' '}
                {inspectOrder.address}
              </p>
              <p>
                <span className="text-neutral-500">Yetkazish:</span> {inspectOrder.deliveryMethod}
              </p>
              <p>
                <span className="text-neutral-500">To‘lov:</span> {inspectOrder.paymentMethod}
              </p>
              {inspectOrder.note && (
                <p>
                  <span className="text-neutral-500">Izoh:</span> {inspectOrder.note}
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-[#E4E4E8] space-y-2">
              {inspectOrder.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs">
                  <span>
                    {item.brand} {item.model} ({item.storage} · {item.colorName}) × {item.quantity}
                  </span>
                  <span className="font-mono tabular-nums font-semibold">
                    {formatUzs(item.lineTotalUzs)}
                  </span>
                </div>
              ))}
              <div className="pt-2 border-t border-[#E4E4E8] flex justify-between text-sm font-bold">
                <span>Jami:</span>
                <span className="font-mono tabular-nums text-[#FF5500]">
                  {formatUzs(inspectOrder.totalUzs)}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleResendTelegram(inspectOrder.id)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#FF5500] hover:bg-[#E04800] text-white text-xs font-semibold cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Telegramga yuborish</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
