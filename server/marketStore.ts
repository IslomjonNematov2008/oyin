import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  CustomerOrder,
  PhoneProduct,
  TelegramConfigSummary,
  TelegramDispatchLog,
} from '../src/types/market.ts';
import { INITIAL_PHONES_CATALOG } from '../src/data/phonesCatalog.ts';

export interface MarketStoreData {
  phones: PhoneProduct[];
  orders: CustomerOrder[];
  nextOrderSeq: number;
  adminCredentialHash: string | null; // salt:scryptHash
  telegramBotToken: string | null; // Admin-configured fallback if env var unset
  telegramChannelId: string;
  autoSendOrders: boolean;
  autoSendStatusUpdates: boolean;
  telegramLogs: TelegramDispatchLog[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'market-store.json');

function createInitialStore(): MarketStoreData {
  const sampleOrders: CustomerOrder[] = [
    {
      id: 'ord-seed-1001',
      orderNumber: 'OB-1001',
      customerName: 'Javohir Karimov',
      phone: '+998 90 412 88 10',
      region: 'Toshkent shahri',
      address: 'Chilonzor tumani, 9-kvartal, 14-uy',
      deliveryMethod: 'Toshkent kuryer (2 soat)',
      paymentMethod: 'Click / Payme',
      note: 'Yetib kelishdan 15 daqiqa oldin qo‘ng‘iroq qiling.',
      items: [
        {
          phoneId: 'iphone-16-pro-max',
          brand: 'Apple',
          model: 'iPhone 16 Pro Max',
          storage: '256 GB',
          colorName: 'Olovrang Titan',
          unitPriceUzs: 16900000,
          quantity: 1,
          lineTotalUzs: 16900000,
        },
      ],
      subtotalUzs: 16900000,
      deliveryFeeUzs: 0,
      totalUzs: 16900000,
      status: 'Tasdiqlandi',
      telegramStatus: 'unconfigured',
      telegramMessageId: null,
      telegramError: null,
      createdAt: new Date(Date.now() - 3600_000 * 5).toISOString(),
      updatedAt: new Date(Date.now() - 3600_000 * 4).toISOString(),
    },
    {
      id: 'ord-seed-1002',
      orderNumber: 'OB-1002',
      customerName: 'Madina Rustamova',
      phone: '+998 93 775 21 04',
      region: 'Samarqand',
      address: 'Registon ko‘chasi, 42-uy',
      deliveryMethod: 'Viloyatlar (BTS / Express)',
      paymentMethod: 'Naqd pul (yetkazganda)',
      note: '',
      items: [
        {
          phoneId: 'samsung-s25-ultra',
          brand: 'Samsung',
          model: 'Galaxy S25 Ultra',
          storage: '512 GB',
          colorName: 'Qora Obsidiyan',
          unitPriceUzs: 16500000,
          quantity: 1,
          lineTotalUzs: 16500000,
        },
      ],
      subtotalUzs: 16500000,
      deliveryFeeUzs: 45000,
      totalUzs: 16545000,
      status: 'Yangi',
      telegramStatus: 'unconfigured',
      telegramMessageId: null,
      telegramError: null,
      createdAt: new Date(Date.now() - 3600_000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 3600_000 * 2).toISOString(),
    },
  ];

  return {
    phones: JSON.parse(JSON.stringify(INITIAL_PHONES_CATALOG)) as PhoneProduct[],
    orders: sampleOrders,
    nextOrderSeq: 1003,
    adminCredentialHash: null,
    telegramBotToken: null,
    telegramChannelId: (process.env.TELEGRAM_CHANNEL_ID || '-1004316865165').trim(),
    autoSendOrders: true,
    autoSendStatusUpdates: true,
    telegramLogs: [],
  };
}

class MarketStore {
  private data: MarketStoreData;

  constructor() {
    this.data = this.load();
  }

  private load(): MarketStoreData {
    try {
      if (fs.existsSync(STORE_PATH)) {
        const raw = fs.readFileSync(STORE_PATH, 'utf-8');
        const parsed = JSON.parse(raw) as MarketStoreData;
        if (parsed && Array.isArray(parsed.phones) && Array.isArray(parsed.orders)) {
          return {
            ...createInitialStore(),
            ...parsed,
            telegramChannelId:
              (parsed.telegramChannelId || process.env.TELEGRAM_CHANNEL_ID || '-1004316865165').trim(),
          };
        }
      }
    } catch (err) {
      console.error('Failed to load market store, reinitializing:', err);
    }
    const fresh = createInitialStore();
    this.saveData(fresh);
    return fresh;
  }

  private saveData(data: MarketStoreData) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tmp = `${STORE_PATH}.${crypto.randomBytes(4).toString('hex')}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tmp, STORE_PATH);
    } catch (err) {
      console.error('Failed to persist market store:', err);
    }
  }

  public save() {
    this.saveData(this.data);
  }

  public getState(): MarketStoreData {
    return this.data;
  }

  public nextOrderNumber(): string {
    const seq = this.data.nextOrderSeq || 1001;
    this.data.nextOrderSeq = seq + 1;
    return `OB-${seq}`;
  }

  public getEffectiveTelegramCredentials(): {
    botToken: string;
    tokenSource: 'env' | 'admin_store' | 'none';
    channelId: string;
  } {
    const envToken = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
    const storeToken = (this.data.telegramBotToken || '').trim();
    const envChannel = (process.env.TELEGRAM_CHANNEL_ID || '').trim();
    const channelId = (this.data.telegramChannelId || envChannel || '-1004316865165').trim();

    if (envToken) {
      return { botToken: envToken, tokenSource: 'env', channelId };
    }
    if (storeToken) {
      return { botToken: storeToken, tokenSource: 'admin_store', channelId };
    }
    return { botToken: '', tokenSource: 'none', channelId };
  }

  public getTelegramConfigSummary(): TelegramConfigSummary {
    const { botToken, tokenSource, channelId } = this.getEffectiveTelegramCredentials();
    let maskedToken: string | null = null;
    if (botToken.length >= 10) {
      maskedToken = `${botToken.slice(0, 6)}••••••${botToken.slice(-4)}`;
    } else if (botToken.length > 0) {
      maskedToken = '••••••';
    }
    return {
      hasBotToken: botToken.length > 0,
      tokenSource,
      maskedToken,
      channelId,
      autoSendOrders: this.data.autoSendOrders,
      autoSendStatusUpdates: this.data.autoSendStatusUpdates,
    };
  }

  public addTelegramLog(log: Omit<TelegramDispatchLog, 'id' | 'timestamp'>) {
    const entry: TelegramDispatchLog = {
      ...log,
      id: `tg-${crypto.randomBytes(4).toString('hex')}`,
      timestamp: new Date().toISOString(),
    };
    this.data.telegramLogs = [entry, ...this.data.telegramLogs].slice(0, 50);
    this.save();
    return entry;
  }
}

export const marketStore = new MarketStore();
