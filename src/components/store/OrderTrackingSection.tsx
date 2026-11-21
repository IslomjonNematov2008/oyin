import React, { useState } from 'react';
import { CheckCircle2, Clock, PackageCheck, Search, Truck, XCircle } from 'lucide-react';
import { OrderStatus, OrderTrackingInfo } from '../../types/market.ts';
import { formatDateUz, formatUzs } from '../../utils/formatters.ts';

function getStatusMeta(status: OrderStatus) {
  switch (status) {
    case 'Yangi':
      return { icon: Clock, color: 'text-[#FF5500]', label: 'Yangi — operator tasdiqlashi kutilmoqda' };
    case 'Tasdiqlandi':
      return { icon: CheckCircle2, color: 'text-emerald-400', label: 'Tasdiqlandi — jo‘natishga tayyorlanmoqda' };
    case 'Yo‘lda':
      return { icon: Truck, color: 'text-sky-400', label: 'Yo‘lda — kuryer yetkazib bermoqda' };
    case 'Yetkazildi':
      return { icon: PackageCheck, color: 'text-emerald-400', label: 'Muvaffaqiyatli yetkazib berildi' };
    case 'Bekor qilindi':
      return { icon: XCircle, color: 'text-red-400', label: 'Bekor qilingan' };
  }
}

export const OrderTrackingSection: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<OrderTrackingInfo[] | null>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResults(null);
    const clean = query.trim();
    if (!clean) {
      setError('Buyurtma raqami (masalan, OB-1001) yoki telefon raqamingizni kiriting.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/orders/track?q=${encodeURIComponent(clean)}`);
      const data = (await res.json()) as { orders?: OrderTrackingInfo[]; error?: string };
      if (!res.ok || !data.orders) {
        setError(data.error || 'Buyurtma topilmadi.');
        return;
      }
      setResults(data.orders);
    } catch {
      setError('Server bilan bog‘lanib bo‘lmadi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="kuzatuv" className="bg-[#0B0B0F] text-white py-14 sm:py-16 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#FF5500]">
            Real vaqt kuzatuvi
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
            Buyurtma holatini tekshiring
          </h2>
          <p className="text-sm text-neutral-300 leading-relaxed">
            Har bir onlayn buyurtmaga unikal raqam beriladi va darhol Telegram kanalimizga
            yuboriladi. Buyurtma raqami (masalan, <span className="font-mono text-white">OB-1001</span>)
            yoki telefon raqamingiz orqali joriy holatni ko‘rishingiz mumkin.
          </p>
        </div>

        <div className="lg:col-span-7 bg-[#141419] border border-white/10 rounded-xl p-6 space-y-5">
          <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buyurtma raqami (OB-1001) yoki telefon raqam..."
                className="w-full pl-10 pr-4 py-3 rounded-lg bg-[#0B0B0F] border border-white/15 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#FF5500]"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-lg bg-[#FF5500] hover:bg-[#E04800] disabled:opacity-60 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {loading ? 'Tekshirilmoqda...' : 'Tekshirish'}
            </button>
          </form>

          {error && (
            <p className="text-xs text-red-400 bg-red-950/40 border border-red-500/30 rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          {results && (
            <div className="space-y-3">
              {results.map((ord) => {
                const meta = getStatusMeta(ord.status);
                const Icon = meta.icon;
                return (
                  <div
                    key={ord.orderNumber}
                    className="p-4 rounded-xl bg-[#0B0B0F] border border-white/10 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-mono text-sm font-bold text-white">
                          #{ord.orderNumber}
                        </span>
                        <span className="text-xs text-neutral-400 ml-2">
                          · {ord.customerName} ({ord.region})
                        </span>
                      </div>
                      <span className="font-mono tabular-nums text-sm font-bold text-[#FF5500]">
                        {formatUzs(ord.totalUzs)}
                      </span>
                    </div>

                    <div className={`flex items-center gap-2 text-xs font-medium ${meta.color}`}>
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{meta.label}</span>
                    </div>

                    <div className="text-xs text-neutral-400 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
                      <span>
                        {ord.itemsSummary
                          .map((i) => `${i.model} (${i.storage}) × ${i.quantity}`)
                          .join(', ')}
                      </span>
                      <span className="font-mono">{formatDateUz(ord.updatedAt)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
