export type PhoneBrand = 'Apple' | 'Samsung' | 'Xiaomi' | 'Google' | 'Nothing';

export type PhoneCategory =
  | 'Flagman'
  | 'O‘rta sinf'
  | 'Buklanadigan'
  | 'Olovrang nashr';

export interface StorageOption {
  label: string; // e.g., "256 GB"
  priceUzs: number;
}

export interface ColorVariant {
  name: string;
  hex: string;
  imageUrl?: string;
}

export interface PhoneSpecs {
  display: string;
  processor: string;
  camera: string;
  battery: string;
  warranty: string;
}

export interface PhoneProduct {
  id: string;
  brand: PhoneBrand;
  model: string;
  category: PhoneCategory;
  shortDesc: string;
  imageUrl: string;
  featured: boolean;
  inStock: boolean;
  stockCount: number;
  storageOptions: StorageOption[];
  colors: ColorVariant[];
  specs: PhoneSpecs;
  createdAt: string;
}

export interface CartItem {
  key: string; // phoneId__storage__color
  phoneId: string;
  brand: PhoneBrand;
  model: string;
  imageUrl: string;
  storage: string;
  colorName: string;
  colorHex: string;
  unitPriceUzs: number;
  quantity: number;
}

export type DeliveryMethod =
  | 'Toshkent kuryer (2 soat)'
  | 'Viloyatlar (BTS / Express)'
  | 'Do‘kondan olib ketish';

export type PaymentMethod =
  | 'Naqd pul (yetkazganda)'
  | 'Click / Payme'
  | 'Muddatli to‘lov (0%)';

export type OrderStatus =
  | 'Yangi'
  | 'Tasdiqlandi'
  | 'Yo‘lda'
  | 'Yetkazildi'
  | 'Bekor qilindi';

export interface OrderLineItem {
  phoneId: string;
  brand: string;
  model: string;
  storage: string;
  colorName: string;
  unitPriceUzs: number;
  quantity: number;
  lineTotalUzs: number;
}

export type TelegramDeliveryState = 'sent' | 'failed' | 'unconfigured';

export interface CustomerOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  region: string;
  address: string;
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentMethod;
  note: string;
  items: OrderLineItem[];
  subtotalUzs: number;
  deliveryFeeUzs: number;
  totalUzs: number;
  status: OrderStatus;
  telegramStatus: TelegramDeliveryState;
  telegramMessageId: number | null;
  telegramError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TelegramDispatchLog {
  id: string;
  orderNumber: string;
  event: 'new_order' | 'status_update' | 'test_message' | 'manual_resend';
  success: boolean;
  channelId: string;
  messageId: number | null;
  detail: string;
  timestamp: string;
}

export interface TelegramConfigSummary {
  hasBotToken: boolean;
  tokenSource: 'env' | 'admin_store' | 'none';
  maskedToken: string | null;
  channelId: string;
  autoSendOrders: boolean;
  autoSendStatusUpdates: boolean;
}

export interface OrderTrackingInfo {
  orderNumber: string;
  customerName: string;
  region: string;
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentMethod;
  totalUzs: number;
  status: OrderStatus;
  telegramStatus: TelegramDeliveryState;
  itemsCount: number;
  itemsSummary: Array<{ model: string; storage: string; quantity: number }>;
  createdAt: string;
  updatedAt: string;
}
