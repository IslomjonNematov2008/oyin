import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  CartItem,
  CustomerOrder,
  PhoneBrand,
  PhoneCategory,
  PhoneProduct,
} from '../types/market.ts';

export type SortOrder = 'featured' | 'price-asc' | 'price-desc';

export interface ToastItem {
  id: string;
  type: 'info' | 'success' | 'error';
  text: string;
}

interface MarketContextValue {
  phones: PhoneProduct[];
  loadingPhones: boolean;
  refreshPhones: () => Promise<void>;
  cart: CartItem[];
  cartCount: number;
  cartSubtotalUzs: number;
  addToCart: (item: Omit<CartItem, 'key' | 'quantity'>, qty?: number) => void;
  updateCartQuantity: (key: string, quantity: number) => void;
  removeFromCart: (key: string) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  selectedPhone: PhoneProduct | null;
  setSelectedPhone: (phone: PhoneProduct | null) => void;
  brandFilter: PhoneBrand | 'Barchasi';
  setBrandFilter: (brand: PhoneBrand | 'Barchasi') => void;
  categoryFilter: PhoneCategory | 'Barchasi';
  setCategoryFilter: (cat: PhoneCategory | 'Barchasi') => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  sortOrder: SortOrder;
  setSortOrder: (sort: SortOrder) => void;
  lastPlacedOrder: CustomerOrder | null;
  setLastPlacedOrder: (order: CustomerOrder | null) => void;
  adminToken: string | null;
  setAdminToken: (token: string | null) => void;
  toasts: ToastItem[];
  notify: (text: string, type?: ToastItem['type']) => void;
}

const MarketContext = createContext<MarketContextValue | null>(null);

export const MarketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [phones, setPhones] = useState<PhoneProduct[]>([]);
  const [loadingPhones, setLoadingPhones] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedPhone, setSelectedPhone] = useState<PhoneProduct | null>(null);
  const [brandFilter, setBrandFilter] = useState<PhoneBrand | 'Barchasi'>('Barchasi');
  const [categoryFilter, setCategoryFilter] = useState<PhoneCategory | 'Barchasi'>('Barchasi');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('featured');
  const [lastPlacedOrder, setLastPlacedOrder] = useState<CustomerOrder | null>(null);
  // Admin Bearer token kept strictly in React memory (never localStorage/sessionStorage)
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const notify = useCallback((text: string, type: ToastItem['type'] = 'info') => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3800);
  }, []);

  const refreshPhones = useCallback(async () => {
    try {
      const res = await fetch('/api/phones');
      if (!res.ok) throw new Error('Katalogni yuklab bo‘lmadi');
      const data = (await res.json()) as { phones: PhoneProduct[] };
      setPhones(data.phones || []);
    } catch {
      notify('Telefonlar katalogini yuklashda xatolik yuz berdi.', 'error');
    } finally {
      setLoadingPhones(false);
    }
  }, [notify]);

  useEffect(() => {
    refreshPhones();
  }, [refreshPhones]);

  const addToCart = useCallback(
    (item: Omit<CartItem, 'key' | 'quantity'>, qty = 1) => {
      const key = `${item.phoneId}__${item.storage}__${item.colorName}`;
      setLastPlacedOrder(null);
      setCart((prev) => {
        const existing = prev.find((c) => c.key === key);
        if (existing) {
          return prev.map((c) =>
            c.key === key ? { ...c, quantity: Math.min(10, c.quantity + qty) } : c
          );
        }
        return [...prev, { ...item, key, quantity: Math.max(1, Math.min(10, qty)) }];
      });
      notify(`${item.model} (${item.storage}) savatga qo‘shildi`, 'success');
    },
    [notify]
  );

  const updateCartQuantity = useCallback((key: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((c) => c.key !== key));
      return;
    }
    setCart((prev) =>
      prev.map((c) => (c.key === key ? { ...c, quantity: Math.min(10, quantity) } : c))
    );
  }, []);

  const removeFromCart = useCallback((key: string) => {
    setCart((prev) => prev.filter((c) => c.key !== key));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotalUzs = cart.reduce((sum, item) => sum + item.unitPriceUzs * item.quantity, 0);

  return (
    <MarketContext.Provider
      value={{
        phones,
        loadingPhones,
        refreshPhones,
        cart,
        cartCount,
        cartSubtotalUzs,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        isCartOpen,
        setIsCartOpen,
        selectedPhone,
        setSelectedPhone,
        brandFilter,
        setBrandFilter,
        categoryFilter,
        setCategoryFilter,
        searchQuery,
        setSearchQuery,
        sortOrder,
        setSortOrder,
        lastPlacedOrder,
        setLastPlacedOrder,
        adminToken,
        setAdminToken,
        toasts,
        notify,
      }}
    >
      {children}
    </MarketContext.Provider>
  );
};

export function useMarket(): MarketContextValue {
  const ctx = useContext(MarketContext);
  if (!ctx) throw new Error('useMarket must be used within MarketProvider');
  return ctx;
}
