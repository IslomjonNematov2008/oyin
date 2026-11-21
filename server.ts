import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import {
  AdminRequest,
  createAdminSessionToken,
  hashPasscode,
  rateLimit,
  requireAdmin,
  verifyAdminPasscode,
} from './server/auth.ts';
import { marketStore } from './server/marketStore.ts';
import {
  dispatchOrderToTelegram,
  dispatchStatusUpdateToTelegram,
  testTelegramBotConnection,
} from './server/telegram.ts';
import {
  CustomerOrder,
  DeliveryMethod,
  OrderLineItem,
  OrderStatus,
  PaymentMethod,
  PhoneBrand,
  PhoneCategory,
  PhoneProduct,
} from './src/types/market.ts';

const VALID_DELIVERY: DeliveryMethod[] = [
  'Toshkent kuryer (2 soat)',
  'Viloyatlar (BTS / Express)',
  'Do‘kondan olib ketish',
];

const VALID_PAYMENT: PaymentMethod[] = [
  'Naqd pul (yetkazganda)',
  'Click / Payme',
  'Muddatli to‘lov (0%)',
];

const VALID_STATUSES: OrderStatus[] = [
  'Yangi',
  'Tasdiqlandi',
  'Yo‘lda',
  'Yetkazildi',
  'Bekor qilindi',
];

const VALID_BRANDS: PhoneBrand[] = ['Apple', 'Samsung', 'Xiaomi', 'Google', 'Nothing'];
const VALID_CATEGORIES: PhoneCategory[] = [
  'Flagman',
  'O‘rta sinf',
  'Buklanadigan',
  'Olovrang nashr',
];

function computeDeliveryFee(method: DeliveryMethod, subtotalUzs: number): number {
  if (method === 'Do‘kondan olib ketish') return 0;
  if (method === 'Toshkent kuryer (2 soat)') return subtotalUzs >= 8_000_000 ? 0 : 35_000;
  return subtotalUzs >= 15_000_000 ? 0 : 45_000;
}

function normalizePhone(raw: string): string {
  return raw.replace(/[^\d+]/g, '').trim();
}

function isSafeImagePath(url: string): boolean {
  const clean = url.trim();
  if (clean.startsWith('/src/assets/')) return true;
  try {
    const parsed = new URL(clean);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

async function bootstrap() {
  const app = express();
  const server = http.createServer(app);
  app.use(express.json({ limit: '256kb' }));

  // ========================================================
  // PUBLIC STOREFRONT ENDPOINTS
  // ========================================================
  app.get('/api/phones', (req, res) => {
    const brand = req.query.brand ? String(req.query.brand) : '';
    const category = req.query.category ? String(req.query.category) : '';
    const q = req.query.q ? String(req.query.q).trim().toLowerCase() : '';

    let phones = marketStore.getState().phones;
    if (brand && brand !== 'Barchasi') {
      phones = phones.filter((p) => p.brand === brand);
    }
    if (category && category !== 'Barchasi') {
      phones = phones.filter((p) => p.category === category);
    }
    if (q) {
      phones = phones.filter(
        (p) =>
          p.model.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.shortDesc.toLowerCase().includes(q) ||
          p.specs.processor.toLowerCase().includes(q)
      );
    }
    res.json({ phones });
  });

  // Real-time online order submission + immediate Telegram channel dispatch
  app.post('/api/orders', rateLimit(15, 60_000), async (req, res) => {
    const body = req.body || {};
    const customerName = String(body.customerName || '').trim().slice(0, 80);
    const phone = String(body.phone || '').trim().slice(0, 30);
    const region = String(body.region || '').trim().slice(0, 60);
    const address = String(body.address || '').trim().slice(0, 200);
    const deliveryMethod = String(body.deliveryMethod || '') as DeliveryMethod;
    const paymentMethod = String(body.paymentMethod || '') as PaymentMethod;
    const note = String(body.note || '').trim().slice(0, 250);
    const rawItems = Array.isArray(body.items) ? body.items : [];

    if (customerName.length < 2) {
      return res.status(400).json({ error: 'Iltimos, ismingizni to‘liq kiriting.' });
    }
    const digitsCount = normalizePhone(phone).replace(/\D/g, '').length;
    if (digitsCount < 9 || digitsCount > 15) {
      return res.status(400).json({ error: 'Iltimos, to‘g‘ri telefon raqamini kiriting (+998...).' });
    }
    if (!region) {
      return res.status(400).json({ error: 'Hudud / shaharni tanlang.' });
    }
    if (deliveryMethod !== 'Do‘kondan olib ketish' && address.length < 4) {
      return res.status(400).json({ error: 'Yetkazib berish manzilini kiriting.' });
    }
    if (!VALID_DELIVERY.includes(deliveryMethod)) {
      return res.status(400).json({ error: 'Yetkazib berish usuli noto‘g‘ri.' });
    }
    if (!VALID_PAYMENT.includes(paymentMethod)) {
      return res.status(400).json({ error: 'To‘lov turi noto‘g‘ri.' });
    }
    if (rawItems.length === 0 || rawItems.length > 20) {
      return res.status(400).json({ error: 'Buyurtma savati bo‘sh.' });
    }

    const state = marketStore.getState();
    const verifiedItems: OrderLineItem[] = [];

    for (const rawItem of rawItems) {
      const phoneId = String(rawItem?.phoneId || '');
      const storage = String(rawItem?.storage || '');
      const colorName = String(rawItem?.colorName || '').trim().slice(0, 50);
      const quantity = Math.floor(Number(rawItem?.quantity) || 0);

      if (quantity < 1 || quantity > 10) {
        return res.status(400).json({ error: 'Mahsulot miqdori 1 dan 10 gacha bo‘lishi kerak.' });
      }

      const product = state.phones.find((p) => p.id === phoneId);
      if (!product) {
        return res.status(404).json({ error: 'Tanlangan telefon katalogda topilmadi.' });
      }
      if (!product.inStock || product.stockCount < quantity) {
        return res.status(409).json({
          error: `${product.model} hozirda yetarli miqdorda mavjud emas.`,
        });
      }

      const storageOpt = product.storageOptions.find((s) => s.label === storage);
      if (!storageOpt) {
        return res.status(400).json({
          error: `${product.model} uchun tanlangan xotira hajmi mavjud emas.`,
        });
      }

      const validColor =
        product.colors.find((c) => c.name === colorName)?.name ||
        product.colors[0]?.name ||
        'Standart';

      verifiedItems.push({
        phoneId: product.id,
        brand: product.brand,
        model: product.model,
        storage: storageOpt.label,
        colorName: validColor,
        unitPriceUzs: storageOpt.priceUzs,
        quantity,
        lineTotalUzs: storageOpt.priceUzs * quantity,
      });
    }

    // Decrement stock cleanly after validating all lines
    for (const item of verifiedItems) {
      const product = state.phones.find((p) => p.id === item.phoneId);
      if (product) {
        product.stockCount = Math.max(0, product.stockCount - item.quantity);
        if (product.stockCount === 0) {
          product.inStock = false;
        }
      }
    }

    const subtotalUzs = verifiedItems.reduce((sum, i) => sum + i.lineTotalUzs, 0);
    const deliveryFeeUzs = computeDeliveryFee(deliveryMethod, subtotalUzs);
    const totalUzs = subtotalUzs + deliveryFeeUzs;
    const now = new Date().toISOString();

    const order: CustomerOrder = {
      id: `ord-${crypto.randomUUID()}`,
      orderNumber: marketStore.nextOrderNumber(),
      customerName,
      phone,
      region,
      address: address || 'Do‘kondan olib ketish (Toshkent, Malika B-12)',
      deliveryMethod,
      paymentMethod,
      note,
      items: verifiedItems,
      subtotalUzs,
      deliveryFeeUzs,
      totalUzs,
      status: 'Yangi',
      telegramStatus: 'unconfigured',
      telegramMessageId: null,
      telegramError: null,
      createdAt: now,
      updatedAt: now,
    };

    if (state.autoSendOrders) {
      const tgResult = await dispatchOrderToTelegram(order, 'new_order');
      order.telegramStatus = tgResult.status;
      order.telegramMessageId = tgResult.messageId;
      order.telegramError = tgResult.error;
    }

    state.orders.unshift(order);
    marketStore.save();

    res.status(201).json({ order });
  });

  // Public Order Status Lookup (returns sanitized fields only)
  app.get('/api/orders/track', rateLimit(30, 60_000), (req, res) => {
    const query = String(req.query.q || '').trim().toUpperCase().replace(/^#/, '');
    if (!query || query.length < 4) {
      return res.status(400).json({
        error: 'Buyurtma raqamini (masalan, OB-1001) yoki telefon raqamingizni kiriting.',
      });
    }

    const queryDigits = query.replace(/\D/g, '');
    const matches = marketStore.getState().orders.filter((o) => {
      if (o.orderNumber.toUpperCase() === query) return true;
      if (queryDigits.length >= 7) {
        const orderDigits = o.phone.replace(/\D/g, '');
        return orderDigits.endsWith(queryDigits) || orderDigits === queryDigits;
      }
      return false;
    });

    if (matches.length === 0) {
      return res.status(404).json({ error: 'Ushbu ma’lumot bo‘yicha buyurtma topilmadi.' });
    }

    const results = matches.slice(0, 5).map((o) => ({
      orderNumber: o.orderNumber,
      customerName: o.customerName,
      region: o.region,
      deliveryMethod: o.deliveryMethod,
      paymentMethod: o.paymentMethod,
      totalUzs: o.totalUzs,
      status: o.status,
      telegramStatus: o.telegramStatus,
      itemsCount: o.items.reduce((sum, i) => sum + i.quantity, 0),
      itemsSummary: o.items.map((i) => ({
        model: `${i.brand} ${i.model}`,
        storage: i.storage,
        quantity: i.quantity,
      })),
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    }));

    res.json({ orders: results });
  });

  // ========================================================
  // ADMIN AUTHENTICATION & MANAGEMENT ROUTES
  // ========================================================
  app.get('/api/admin/status', (_req, res) => {
    const hasEnvPasscode = Boolean((process.env.ADMIN_PASSCODE || '').trim());
    const hasStoredHash = Boolean(marketStore.getState().adminCredentialHash);
    res.json({
      configured: hasEnvPasscode || hasStoredHash,
    });
  });

  app.post('/api/admin/bootstrap', rateLimit(6, 60_000), (req, res) => {
    const hasEnvPasscode = Boolean((process.env.ADMIN_PASSCODE || '').trim());
    if (hasEnvPasscode || marketStore.getState().adminCredentialHash) {
      return res.status(403).json({
        error: 'Administrator paroli allaqachon o‘rnatilgan.',
      });
    }
    const passcode = String(req.body?.passcode || '').trim();
    if (passcode.length < 6) {
      return res.status(400).json({
        error: 'Parol kamida 6 ta belgidan iborat bo‘lishi kerak.',
      });
    }
    marketStore.getState().adminCredentialHash = hashPasscode(passcode);
    marketStore.save();

    const token = createAdminSessionToken();
    res.json({ token });
  });

  app.post('/api/admin/login', rateLimit(10, 60_000), (req, res) => {
    const passcode = String(req.body?.passcode || '').trim();
    if (!verifyAdminPasscode(passcode)) {
      return res.status(401).json({ error: 'Administrator paroli noto‘g‘ri.' });
    }
    const token = createAdminSessionToken();
    res.json({ token });
  });

  app.get('/api/admin/overview', requireAdmin, (_req: AdminRequest, res) => {
    const state = marketStore.getState();
    res.json({
      orders: state.orders,
      phones: state.phones,
      telegramConfig: marketStore.getTelegramConfigSummary(),
      telegramLogs: state.telegramLogs,
    });
  });

  // Update order status + optional Telegram notification
  app.patch('/api/admin/orders/:id/status', requireAdmin, async (req, res) => {
    const order = marketStore.getState().orders.find((o) => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'Buyurtma topilmadi.' });

    const nextStatus = String(req.body?.status || '') as OrderStatus;
    if (!VALID_STATUSES.includes(nextStatus)) {
      return res.status(400).json({ error: 'Buyurtma holati noto‘g‘ri.' });
    }

    const prevStatus = order.status;
    if (prevStatus !== nextStatus) {
      order.status = nextStatus;
      order.updatedAt = new Date().toISOString();
      marketStore.save();
      await dispatchStatusUpdateToTelegram(order, prevStatus);
    }

    res.json({
      order,
      orders: marketStore.getState().orders,
      telegramLogs: marketStore.getState().telegramLogs,
    });
  });

  // Resend order to Telegram channel manually
  app.post('/api/admin/orders/:id/resend-telegram', requireAdmin, async (req, res) => {
    const order = marketStore.getState().orders.find((o) => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'Buyurtma topilmadi.' });

    const tgResult = await dispatchOrderToTelegram(order, 'manual_resend');
    order.telegramStatus = tgResult.status;
    order.telegramMessageId = tgResult.messageId;
    order.telegramError = tgResult.error;
    order.updatedAt = new Date().toISOString();
    marketStore.save();

    if (tgResult.status !== 'sent') {
      return res.status(502).json({
        error: tgResult.error || 'Telegramga yuborishda xatolik yuz berdi.',
        order,
        telegramLogs: marketStore.getState().telegramLogs,
      });
    }

    res.json({
      order,
      orders: marketStore.getState().orders,
      telegramLogs: marketStore.getState().telegramLogs,
    });
  });

  app.delete('/api/admin/orders/:id', requireAdmin, (req, res) => {
    const state = marketStore.getState();
    const exists = state.orders.some((o) => o.id === req.params.id);
    if (!exists) return res.status(404).json({ error: 'Buyurtma topilmadi.' });
    state.orders = state.orders.filter((o) => o.id !== req.params.id);
    marketStore.save();
    res.json({ orders: state.orders });
  });

  // Phone catalog CRUD
  app.post('/api/admin/phones', requireAdmin, (req, res) => {
    const b = req.body || {};
    const brand = String(b.brand || '') as PhoneBrand;
    const model = String(b.model || '').trim().slice(0, 80);
    const category = String(b.category || 'Flagman') as PhoneCategory;
    const shortDesc = String(b.shortDesc || '').trim().slice(0, 220);
    const imageUrl = String(b.imageUrl || '/src/assets/images/phone_pro_titanium_1795274759653.jpg').trim();
    const basePrice = Math.max(500_000, Math.round(Number(b.basePriceUzs) || 0));
    const storageLabel = String(b.storageLabel || '256 GB').trim().slice(0, 20);
    const stockCount = Math.max(0, Math.min(999, Math.floor(Number(b.stockCount) || 10)));
    const featured = Boolean(b.featured);

    if (!VALID_BRANDS.includes(brand)) {
      return res.status(400).json({ error: 'Brend noto‘g‘ri tanlangan.' });
    }
    if (model.length < 2) {
      return res.status(400).json({ error: 'Telefon modelini kiriting.' });
    }
    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Kategoriya noto‘g‘ri.' });
    }
    if (!isSafeImagePath(imageUrl)) {
      return res.status(400).json({ error: 'Rasm manzili noto‘g‘ri.' });
    }

    const newPhone: PhoneProduct = {
      id: `${brand.toLowerCase()}-${model.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
      brand,
      model,
      category,
      shortDesc: shortDesc || `${brand} ${model} — rasmiy kafolat va tezkor yetkazish.`,
      imageUrl,
      featured,
      inStock: stockCount > 0,
      stockCount,
      storageOptions: [
        { label: storageLabel, priceUzs: basePrice },
        { label: storageLabel === '512 GB' ? '1 TB' : '512 GB', priceUzs: basePrice + 1_600_000 },
      ],
      colors: [
        { name: 'Qora Titan', hex: '#18181D', imageUrl },
        { name: 'Olovrang', hex: '#FF5500', imageUrl: '/src/assets/images/phone_orange_edition_1795274760448.jpg' },
        { name: 'Oq', hex: '#F2F2F4', imageUrl: '/src/assets/images/phone_white_ceramic_1795274760028.jpg' },
      ],
      specs: {
        display: String(b.display || '6.7" AMOLED 120 Hz').slice(0, 80),
        processor: String(b.processor || 'Flagman Protsessor').slice(0, 80),
        camera: String(b.camera || '50 MP OIS Pro Kamera').slice(0, 80),
        battery: String(b.battery || '5000 mAh · Tezkor quvvat').slice(0, 80),
        warranty: '1 yil rasmiy kafolat + IMEI',
      },
      createdAt: new Date().toISOString(),
    };

    marketStore.getState().phones.unshift(newPhone);
    marketStore.save();
    res.status(201).json({ phone: newPhone, phones: marketStore.getState().phones });
  });

  app.patch('/api/admin/phones/:id', requireAdmin, (req, res) => {
    const phone = marketStore.getState().phones.find((p) => p.id === req.params.id);
    if (!phone) return res.status(404).json({ error: 'Telefon topilmadi.' });

    const b = req.body || {};
    if (typeof b.model === 'string' && b.model.trim().length >= 2) {
      phone.model = b.model.trim().slice(0, 80);
    }
    if (typeof b.shortDesc === 'string' && b.shortDesc.trim().length > 0) {
      phone.shortDesc = b.shortDesc.trim().slice(0, 220);
    }
    if (typeof b.stockCount === 'number' && Number.isFinite(b.stockCount)) {
      phone.stockCount = Math.max(0, Math.min(999, Math.floor(b.stockCount)));
      phone.inStock = phone.stockCount > 0;
    }
    if (typeof b.inStock === 'boolean') {
      phone.inStock = b.inStock;
      if (!b.inStock) phone.stockCount = 0;
      else if (phone.stockCount === 0) phone.stockCount = 5;
    }
    if (typeof b.featured === 'boolean') {
      phone.featured = b.featured;
    }
    if (typeof b.basePriceUzs === 'number' && b.basePriceUzs >= 500_000) {
      const diff = Math.round(b.basePriceUzs) - phone.storageOptions[0].priceUzs;
      phone.storageOptions = phone.storageOptions.map((opt) => ({
        ...opt,
        priceUzs: Math.max(500_000, opt.priceUzs + diff),
      }));
    }

    marketStore.save();
    res.json({ phone, phones: marketStore.getState().phones });
  });

  app.delete('/api/admin/phones/:id', requireAdmin, (req, res) => {
    const state = marketStore.getState();
    state.phones = state.phones.filter((p) => p.id !== req.params.id);
    marketStore.save();
    res.json({ phones: state.phones });
  });

  // Telegram Bot Configuration & Live Test
  app.post('/api/admin/telegram/config', requireAdmin, (req, res) => {
    const b = req.body || {};
    const state = marketStore.getState();

    if (typeof b.botToken === 'string' && b.botToken.trim().length > 0) {
      const cleanToken = b.botToken.trim();
      if (!/^\d+:[A-Za-z0-9_-]{20,}$/.test(cleanToken)) {
        return res.status(400).json({
          error: 'Telegram bot token formati noto‘g‘ri (masalan: 123456:ABC-DEF...).',
        });
      }
      state.telegramBotToken = cleanToken;
    }

    if (typeof b.channelId === 'string' && b.channelId.trim().length > 0) {
      const cleanChannel = b.channelId.trim();
      if (!/^(@[A-Za-z0-9_]{4,}|-?\d{5,20})$/.test(cleanChannel)) {
        return res.status(400).json({
          error: 'Kanal ID noto‘g‘ri (masalan: -1004316865165 yoki @kanal_nomi).',
        });
      }
      state.telegramChannelId = cleanChannel;
    }

    if (typeof b.autoSendOrders === 'boolean') {
      state.autoSendOrders = b.autoSendOrders;
    }
    if (typeof b.autoSendStatusUpdates === 'boolean') {
      state.autoSendStatusUpdates = b.autoSendStatusUpdates;
    }

    marketStore.save();
    res.json({
      telegramConfig: marketStore.getTelegramConfigSummary(),
      telegramLogs: state.telegramLogs,
    });
  });

  app.post('/api/admin/telegram/test', requireAdmin, async (req, res) => {
    const b = req.body || {};
    const tokenOverride = typeof b.botToken === 'string' && b.botToken.trim() ? b.botToken.trim() : undefined;
    const channelOverride = typeof b.channelId === 'string' && b.channelId.trim() ? b.channelId.trim() : undefined;

    const result = await testTelegramBotConnection(tokenOverride, channelOverride);
    if (!result.ok) {
      return res.status(400).json({
        error: result.error,
        botUsername: result.botUsername,
        telegramLogs: marketStore.getState().telegramLogs,
      });
    }

    res.json({
      ok: true,
      botUsername: result.botUsername,
      messageId: result.messageId,
      telegramLogs: marketStore.getState().telegramLogs,
    });
  });

  // ========================================================
  // VITE DEV / PRODUCTION STATIC SERVING ON PORT 3000
  // ========================================================
  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const PORT = Number(process.env.PORT || 3000);
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`OLOV MOBILE server running on http://0.0.0.0:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});
