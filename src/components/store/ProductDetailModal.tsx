import React, { useEffect, useState } from 'react';
import { Check, Cpu, BatteryCharging, Camera, MonitorSmartphone, ShieldCheck, ShoppingBag, X } from 'lucide-react';
import { useMarket } from '../../context/MarketContext.tsx';
import { formatUzs } from '../../utils/formatters.ts';
import { PhoneImage } from '../common/PhoneImage.tsx';

export const ProductDetailModal: React.FC = () => {
  const { selectedPhone, setSelectedPhone, addToCart, setIsCartOpen } = useMarket();
  const [storageIdx, setStorageIdx] = useState(0);
  const [colorIdx, setColorIdx] = useState(0);

  useEffect(() => {
    setStorageIdx(0);
    setColorIdx(0);
  }, [selectedPhone?.id]);

  if (!selectedPhone) return null;

  const activeStorage = selectedPhone.storageOptions[storageIdx] || selectedPhone.storageOptions[0];
  const activeColor = selectedPhone.colors[colorIdx] || selectedPhone.colors[0];
  const displayImage = activeColor?.imageUrl || selectedPhone.imageUrl;

  const handleAdd = (openCheckout: boolean) => {
    if (!selectedPhone.inStock || !activeStorage) return;
    addToCart({
      phoneId: selectedPhone.id,
      brand: selectedPhone.brand,
      model: selectedPhone.model,
      imageUrl: displayImage,
      storage: activeStorage.label,
      colorName: activeColor?.name || 'Standart',
      colorHex: activeColor?.hex || '#141418',
      unitPriceUzs: activeStorage.priceUzs,
    });
    setSelectedPhone(null);
    if (openCheckout) {
      setIsCartOpen(true);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto"
      onClick={() => setSelectedPhone(null)}
    >
      <div
        className="bg-white text-[#0B0B0F] w-full max-w-4xl rounded-2xl border border-[#E4E4E8] overflow-hidden shadow-2xl my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E4E4E8]">
          <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
            {selectedPhone.brand} <span aria-hidden="true">·</span> {selectedPhone.category}
          </div>
          <button
            type="button"
            onClick={() => setSelectedPhone(null)}
            aria-label="Oynani yopish"
            className="p-1.5 rounded-lg text-neutral-500 hover:text-[#0B0B0F] hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contiguous Purchase Module */}
        <div className="grid grid-cols-1 md:grid-cols-12">
          {/* Left: Studio Product Stage */}
          <div className="md:col-span-5 bg-[#F4F4F6] p-6 flex items-center justify-center">
            <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-white border border-[#E4E4E8]">
              <PhoneImage
                src={displayImage}
                alt={`${selectedPhone.brand} ${selectedPhone.model}`}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Right: Variant Selection & Buy CTA */}
          <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between gap-6">
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0B0B0F]">
                  {selectedPhone.model}
                </h2>
                <p className="text-sm text-neutral-600 mt-1.5 leading-relaxed">
                  {selectedPhone.shortDesc}
                </p>
              </div>

              {/* Price & Stock */}
              <div className="flex items-baseline justify-between gap-4 pb-4 border-b border-[#E4E4E8]">
                <span className="font-mono tabular-nums text-2xl font-bold text-[#0B0B0F]">
                  {formatUzs(activeStorage?.priceUzs || 0)}
                </span>
                <span
                  className={`text-xs font-semibold ${
                    selectedPhone.inStock ? 'text-emerald-700' : 'text-red-600'
                  }`}
                >
                  {selectedPhone.inStock
                    ? `Omborda mavjud (${selectedPhone.stockCount} dona)`
                    : 'Hozirda sotuvda yo‘q'}
                </span>
              </div>

              {/* Storage Picker */}
              <div>
                <p className="text-xs font-semibold text-neutral-500 mb-2">Xotira hajmi</p>
                <div className="flex flex-wrap gap-2">
                  {selectedPhone.storageOptions.map((opt, idx) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setStorageIdx(idx)}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                        idx === storageIdx
                          ? 'bg-[#0B0B0F] text-white border-[#0B0B0F]'
                          : 'bg-white text-[#0B0B0F] border-[#E4E4E8] hover:border-[#0B0B0F]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Picker */}
              <div>
                <p className="text-xs font-semibold text-neutral-500 mb-2">
                  Rang: <span className="text-[#0B0B0F]">{activeColor?.name}</span>
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {selectedPhone.colors.map((c, idx) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setColorIdx(idx)}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                        idx === colorIdx
                          ? 'border-[#FF5500] bg-[#FFF2EB] text-[#0B0B0F]'
                          : 'border-[#E4E4E8] bg-white text-neutral-700 hover:border-neutral-400'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/20"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span>{c.name}</span>
                      {idx === colorIdx && <Check className="w-3 h-3 text-[#FF5500]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Technical Specs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-xs text-neutral-700">
                <div className="flex items-start gap-2">
                  <MonitorSmartphone className="w-4 h-4 text-[#FF5500] shrink-0 mt-0.5" />
                  <span>{selectedPhone.specs.display}</span>
                </div>
                <div className="flex items-start gap-2">
                  <Cpu className="w-4 h-4 text-[#FF5500] shrink-0 mt-0.5" />
                  <span>{selectedPhone.specs.processor}</span>
                </div>
                <div className="flex items-start gap-2">
                  <Camera className="w-4 h-4 text-[#FF5500] shrink-0 mt-0.5" />
                  <span>{selectedPhone.specs.camera}</span>
                </div>
                <div className="flex items-start gap-2">
                  <BatteryCharging className="w-4 h-4 text-[#FF5500] shrink-0 mt-0.5" />
                  <span>{selectedPhone.specs.battery}</span>
                </div>
                <div className="sm:col-span-2 flex items-start gap-2 text-neutral-600">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{selectedPhone.specs.warranty}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                disabled={!selectedPhone.inStock}
                onClick={() => handleAdd(true)}
                className="flex-1 py-3 px-5 rounded-lg bg-[#FF5500] hover:bg-[#E04800] disabled:bg-neutral-200 disabled:text-neutral-500 text-white text-sm font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                Darhol buyurtma berish
              </button>
              <button
                type="button"
                disabled={!selectedPhone.inStock}
                onClick={() => handleAdd(false)}
                className="inline-flex items-center justify-center gap-2 py-3 px-5 rounded-lg bg-[#0B0B0F] hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-500 text-white text-sm font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Savatga qo‘shish</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
