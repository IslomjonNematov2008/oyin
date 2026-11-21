import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Minus,
  Plus,
  Send,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';
import { useMarket } from '../../context/MarketContext.tsx';
import { CustomerOrder, DeliveryMethod, PaymentMethod } from '../../types/market.ts';
import { formatUzs, UZ_REGIONS } from '../../utils/formatters.ts';
import { PhoneImage } from '../common/PhoneImage.tsx';

const DELIVERY_OPTIONS: DeliveryMethod[] = [
  'Toshkent kuryer (2 soat)',
  'Viloyatlar (BTS / Express)',
  'Do‘kondan olib ketish',
];

const PAYMENT_OPTIONS: PaymentMethod[] = [
  'Naqd pul (yetkazganda)',
  'Click / Payme',
  'Muddatli to‘lov (0%)',
];

export const CartCheckoutDrawer: React.FC = () => {
  const {
    cart,
    cartSubtotalUzs,
    isCartOpen,
    setIsCartOpen,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    refreshPhones,
    lastPlacedOrder,
    setLastPlacedOrder,
    notify,
  } = useMarket();

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('+998 ');
  const [region, setRegion] = useState('Toshkent shahri');
  const [address, setAddress] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('Toshkent kuryer (2 soat)');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Naqd pul (yetkazganda)');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!isCartOpen) return null;

  const estimatedDeliveryFee =
    deliveryMethod === 'Do‘kondan olib ketish'
      ? 0
      : deliveryMethod === 'Toshkent kuryer (2 soat)'
      ? cartSubtotalUzs >= 8_000_000
        ? 0
        : 35_000
      : cartSubtotalUzs >= 15_000_000
      ? 0
      : 45_000;

  const grandTotalUzs = cartSubtotalUzs + estimatedDeliveryFee;

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (cart.length === 0) {
      setFormError('Buyurtma berish uchun savatga kamida bitta telefon qo‘shing.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          phone,
          region,
          address,
          deliveryMethod,
          paymentMethod,
          note,
          items: cart.map((item) => ({
            phoneId: item.phoneId,
            storage: item.storage,
            colorName: item.colorName,
            quantity: item.quantity,
          })),
        }),
      });

      const data = (await res.json()) as { order?: CustomerOrder; error?: string };
      if (!res.ok || !data.order) {
        setFormError(data.error || 'Buyurtmani yuborishda xatolik yuz berdi.');
        return;
      }

      setLastPlacedOrder(data.order);
      clearCart();
      await refreshPhones();
      notify(`Buyurtma #${data.order.orderNumber} qabul qilindi!`, 'success');
    } catch {
      setFormError('Server bilan aloqa o‘rnatib bo‘lmadi. Qayta urinib ko‘ring.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setLastPlacedOrder(null);
    setFormError(null);
    setIsCartOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60"
      onClick={() => setIsCartOpen(false)}
    >
      <aside
        className="w-full max-w-lg bg-white text-[#0B0B0F] h-full flex flex-col border-l border-[#E4E4E8] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="px-6 py-4 bg-[#0B0B0F] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[#FF5500]" />
            <h2 className="font-display text-lg font-bold">
              {lastPlacedOrder ? 'Buyurtma rasmiylashtirildi' : 'Savat va Onlayn Buyurtma'}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setIsCartOpen(false)}
            aria-label="Savatni yopish"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {lastPlacedOrder ? (
            /* Post-Order Confirmation Receipt */
            <div className="space-y-5">
              <div className="p-5 rounded-xl bg-[#F6F6F8] border border-[#E4E4E8] space-y-3">
                <div className="flex items-center gap-2.5 text-emerald-700">
                  <CheckCircle2 className="w-6 h-6 shrink-0" />
                  <div>
                    <p className="font-display text-lg font-bold text-[#0B0B0F]">
                      Buyurtma #{lastPlacedOrder.orderNumber} qabul qilindi
                    </p>
                    <p className="text-xs text-neutral-600">
                      Operatorlarimiz tez orada {lastPlacedOrder.phone} raqamiga bog‘lanadi.
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E4E4E8] text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Mijoz:</span>
                    <span className="font-medium text-[#0B0B0F]">{lastPlacedOrder.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Yetkazish:</span>
                    <span className="font-medium text-[#0B0B0F]">{lastPlacedOrder.deliveryMethod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Jami summa:</span>
                    <span className="font-mono tabular-nums font-bold text-[#FF5500]">
                      {formatUzs(lastPlacedOrder.totalUzs)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Telegram Real-Time Dispatch Feedback */}
              <div
                className={`p-4 rounded-xl border text-xs flex items-start gap-2.5 ${
                  lastPlacedOrder.telegramStatus === 'sent'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : lastPlacedOrder.telegramStatus === 'unconfigured'
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}
              >
                <Send className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">
                    {lastPlacedOrder.telegramStatus === 'sent'
                      ? 'Buyurtma Telegram kanalga real vaqtda yuborildi'
                      : lastPlacedOrder.telegramStatus === 'unconfigured'
                      ? 'Telegram bot tokeni hali Admin Panelda ulanmagan'
                      : 'Telegram kanalga yuborishda xatolik'}
                  </p>
                  {lastPlacedOrder.telegramStatus === 'sent' && lastPlacedOrder.telegramMessageId && (
                    <p className="mt-0.5 text-emerald-700 font-mono">
                      Xabar ID: #{lastPlacedOrder.telegramMessageId}
                    </p>
                  )}
                  {lastPlacedOrder.telegramError && (
                    <p className="mt-0.5 opacity-90">{lastPlacedOrder.telegramError}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Buyurtma tarkibi
                </p>
                {lastPlacedOrder.items.map((item, idx) => (
                  <div
                    key={`${item.phoneId}-${idx}`}
                    className="flex items-center justify-between text-sm py-2 border-b border-[#F0F0F4]"
                  >
                    <div>
                      <p className="font-semibold text-[#0B0B0F]">
                        {item.brand} {item.model}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {item.storage} · {item.colorName} × {item.quantity}
                      </p>
                    </div>
                    <span className="font-mono tabular-nums font-semibold">
                      {formatUzs(item.lineTotalUzs)}
                    </span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={resetAndClose}
                className="w-full py-3 px-5 rounded-lg bg-[#0B0B0F] hover:bg-neutral-800 text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                Xaridni davom ettirish
              </button>
            </div>
          ) : cart.length === 0 ? (
            /* Empty Cart State */
            <div className="py-16 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-[#F4F4F6] flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-neutral-400" />
              </div>
              <div>
                <p className="font-display text-lg font-semibold text-[#0B0B0F]">
                  Savatingiz hozircha bo‘sh
                </p>
                <p className="text-sm text-neutral-500 mt-1">
                  Katalogdan o‘zingizga yoqqan smartfonni tanlang va savatga qo‘shing.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="px-5 py-2.5 rounded-lg bg-[#FF5500] hover:bg-[#E04800] text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Katalogga o‘tish
              </button>
            </div>
          ) : (
            /* Cart Items + Checkout Form */
            <>
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.key}
                    className="flex gap-3.5 p-3 rounded-xl border border-[#E4E4E8] bg-[#FAFAFB]"
                  >
                    <div className="w-20 h-16 rounded-lg overflow-hidden bg-white border border-[#E4E4E8] shrink-0">
                      <PhoneImage
                        src={item.imageUrl}
                        alt={item.model}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-display text-sm font-bold text-[#0B0B0F] truncate">
                            {item.model}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {item.storage} · {item.colorName}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.key)}
                          aria-label={`${item.model} o‘chirish`}
                          className="text-neutral-400 hover:text-red-600 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between gap-2">
                        <div className="inline-flex items-center border border-[#E4E4E8] rounded-lg bg-white">
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.key, item.quantity - 1)}
                            aria-label="Miqdorni kamaytirish"
                            className="p-1.5 text-neutral-600 hover:text-[#0B0B0F] cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-2.5 text-xs font-mono tabular-nums font-semibold">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.key, item.quantity + 1)}
                            aria-label="Miqdorni oshirish"
                            className="p-1.5 text-neutral-600 hover:text-[#0B0B0F] cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <span className="font-mono tabular-nums text-xs font-bold text-[#0B0B0F]">
                          {formatUzs(item.unitPriceUzs * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals Summary */}
              <div className="p-4 rounded-xl bg-[#F6F6F8] border border-[#E4E4E8] space-y-2 text-xs">
                <div className="flex justify-between text-neutral-600">
                  <span>Mahsulotlar qiymati</span>
                  <span className="font-mono tabular-nums font-semibold text-[#0B0B0F]">
                    {formatUzs(cartSubtotalUzs)}
                  </span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Yetkazib berish</span>
                  <span className="font-mono tabular-nums font-semibold text-[#0B0B0F]">
                    {estimatedDeliveryFee === 0 ? 'Bepul' : formatUzs(estimatedDeliveryFee)}
                  </span>
                </div>
                <div className="pt-2 border-t border-[#E4E4E8] flex justify-between text-sm font-bold text-[#0B0B0F]">
                  <span>Jami to‘lov</span>
                  <span className="font-mono tabular-nums text-[#FF5500]">
                    {formatUzs(grandTotalUzs)}
                  </span>
                </div>
              </div>

              {/* Online Order Form */}
              <form id="checkout-form" onSubmit={handleSubmitOrder} className="space-y-4">
                <h3 className="font-display text-base font-bold text-[#0B0B0F]">
                  Buyurtma ma’lumotlari
                </h3>

                {formError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Ism va familiya *
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Masalan: Azizbek Alimov"
                      className="w-full px-3 py-2 rounded-lg border border-[#E4E4E8] text-sm focus:outline-none focus:border-[#FF5500]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Telefon raqam *
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+998 90 123 45 67"
                      className="w-full px-3 py-2 rounded-lg border border-[#E4E4E8] text-sm font-mono focus:outline-none focus:border-[#FF5500]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Hudud / Shahar *
                    </label>
                    <select
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#E4E4E8] text-sm bg-white focus:outline-none focus:border-[#FF5500]"
                    >
                      {UZ_REGIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Yetkazib berish usuli
                    </label>
                    <select
                      value={deliveryMethod}
                      onChange={(e) => setDeliveryMethod(e.target.value as DeliveryMethod)}
                      className="w-full px-3 py-2 rounded-lg border border-[#E4E4E8] text-sm bg-white focus:outline-none focus:border-[#FF5500]"
                    >
                      {DELIVERY_OPTIONS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {deliveryMethod !== 'Do‘kondan olib ketish' && (
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Aniq manzil (tuman, ko‘cha, uy) *
                    </label>
                    <input
                      type="text"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Yunusobod tumani, 4-mavze, 18-uy"
                      className="w-full px-3 py-2 rounded-lg border border-[#E4E4E8] text-sm focus:outline-none focus:border-[#FF5500]"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                    To‘lov turi
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {PAYMENT_OPTIONS.map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`px-3 py-2 rounded-lg border text-xs font-medium text-center transition-colors cursor-pointer ${
                          paymentMethod === method
                            ? 'bg-[#0B0B0F] text-white border-[#0B0B0F]'
                            : 'bg-white text-neutral-700 border-[#E4E4E8] hover:border-neutral-400'
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Qo‘shimcha izoh (ixtiyoriy)
                  </label>
                  <textarea
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Masalan: Kuryer soat 18:00 dan keyin kelsin"
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E4E8] text-sm focus:outline-none focus:border-[#FF5500]"
                  />
                </div>
              </form>
            </>
          )}
        </div>

        {/* Sticky Checkout Submit Footer */}
        {!lastPlacedOrder && cart.length > 0 && (
          <div className="p-5 border-t border-[#E4E4E8] bg-white shrink-0">
            <button
              type="submit"
              form="checkout-form"
              disabled={submitting}
              className="w-full py-3.5 px-6 rounded-lg bg-[#FF5500] hover:bg-[#E04800] disabled:opacity-60 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>
                {submitting
                  ? 'Buyurtma yuborilmoqda...'
                  : `Buyurtma berish · ${formatUzs(grandTotalUzs)}`}
              </span>
            </button>
          </div>
        )}
      </aside>
    </div>
  );
};
