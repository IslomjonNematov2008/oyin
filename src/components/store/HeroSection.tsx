import React from 'react';
import { ArrowRight, CheckCircle2, ShieldCheck, Truck, Zap } from 'lucide-react';
import { PhoneImage } from '../common/PhoneImage.tsx';

export const HeroSection: React.FC = () => {
  const scrollToCatalog = () => {
    document.getElementById('katalog')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToTracking = () => {
    document.getElementById('kuzatuv')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="bg-[#0B0B0F] text-white border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-12 lg:pt-14 lg:pb-16">
        {/* 2-Column Balanced Split Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center py-2">
            <p className="text-xs sm:text-sm font-medium text-[#FF5500] mb-4">
              Rasmiy kafolat · IMEI ro‘yxatdan o‘tgan · Tezkor yetkazish
            </p>

            <h1 className="font-display font-extrabold tracking-tight text-white text-[clamp(2.25rem,4vw,3.75rem)] leading-[1.08] mb-5">
              Yangi avlod smartfonlari — bir bosishda
            </h1>

            <p className="text-base text-neutral-300 leading-relaxed max-w-xl mb-8">
              Apple, Samsung, Xiaomi, Google Pixel va Nothing flagmanlari eng maqbul narxlarda.
              Onlayn buyurtma bering — so‘rovingiz bir zumda Telegram tizimimiz orqali qabul qilinadi.
            </p>

            <div className="flex flex-wrap items-center gap-5">
              <button
                type="button"
                onClick={scrollToCatalog}
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-lg bg-[#FF5500] hover:bg-[#E04800] text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Katalogni ko‘rish</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={scrollToTracking}
                className="text-sm font-medium text-neutral-300 hover:text-white underline underline-offset-4 decoration-white/30 hover:decoration-[#FF5500] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Buyurtma holatini tekshirish
              </button>
            </div>
          </div>

          <div className="lg:col-span-6 min-h-[260px] lg:min-h-[400px] rounded-xl overflow-hidden bg-[#141419] border border-white/10 relative">
            <PhoneImage
              src="/src/assets/images/hero_flagship_phones_1795274760802.jpg"
              alt="Olovrang va qora titan flagman smartfonlar"
              className="w-full h-full object-cover"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-[#0B0B0F]/70 via-transparent to-transparent pointer-events-none"
              aria-hidden="true"
            />
            <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between text-xs text-neutral-200">
              <span className="font-medium">Olovrang Titan &amp; Qora Obsidiyan kolleksiyasi</span>
              <span className="font-mono tabular-nums text-[#FF5500]">2026 Flagmanlar</span>
            </div>
          </div>
        </div>

        {/* Full-Width 4-Column Trust & Benefit Strip */}
        <div className="mt-10 pt-8 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#FF5500] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-white">1 yil rasmiy kafolat</p>
              <p className="text-xs text-neutral-400 mt-0.5">Har bir qurilma servis kafolati bilan</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Truck className="w-5 h-5 text-[#FF5500] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-white">Toshkent bo‘ylab 2 soatda</p>
              <p className="text-xs text-neutral-400 mt-0.5">Viloyatlarga 24 soatda express pochta</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-[#FF5500] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-white">Real vaqt Telegram tasdiq</p>
              <p className="text-xs text-neutral-400 mt-0.5">Buyurtma darhol operator kanaliga tushadi</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#FF5500] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-white">100% original va UzIMEI</p>
              <p className="text-xs text-neutral-400 mt-0.5">Quti ochilmagan holatda tekshirib oling</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
