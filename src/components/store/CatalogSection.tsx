import React, { useMemo, useState } from 'react';
import { ArrowUpDown, Plus, Search, SlidersHorizontal, X } from 'lucide-react';
import { SortOrder, useMarket } from '../../context/MarketContext.tsx';
import { PhoneBrand, PhoneCategory, PhoneProduct } from '../../types/market.ts';
import { formatUzs } from '../../utils/formatters.ts';
import { PhoneImage } from '../common/PhoneImage.tsx';

const BRANDS: Array<PhoneBrand | 'Barchasi'> = [
  'Barchasi',
  'Apple',
  'Samsung',
  'Xiaomi',
  'Google',
  'Nothing',
];

const CATEGORIES: Array<PhoneCategory | 'Barchasi'> = [
  'Barchasi',
  'Olovrang nashr',
  'Flagman',
  'Buklanadigan',
  'O‘rta sinf',
];

const PhoneCard: React.FC<{ phone: PhoneProduct }> = ({ phone }) => {
  const { addToCart, setSelectedPhone } = useMarket();
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);

  const activeColor = phone.colors[selectedColorIdx] || phone.colors[0];
  const baseStorage = phone.storageOptions[0];
  const displayImg = activeColor?.imageUrl || phone.imageUrl;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!phone.inStock || !baseStorage) return;
    addToCart({
      phoneId: phone.id,
      brand: phone.brand,
      model: phone.model,
      imageUrl: displayImg,
      storage: baseStorage.label,
      colorName: activeColor?.name || 'Standart',
      colorHex: activeColor?.hex || '#141418',
      unitPriceUzs: baseStorage.priceUzs,
    });
  };

  return (
    <article
      onClick={() => setSelectedPhone(phone)}
      className="group bg-white border border-[#E4E4E8] rounded-xl overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-[#0B0B0F]/30 cursor-pointer"
    >
      {/* Image Stage (~68% visual weight, uniform 4:3 aspect) */}
      <div className="relative aspect-[4/3] bg-[#F4F4F6] overflow-hidden">
        <PhoneImage
          src={displayImg}
          alt={`${phone.brand} ${phone.model}`}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {phone.featured && (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded bg-[#0B0B0F] text-white text-[11px] font-medium tracking-wide">
            Tanlangan model
          </span>
        )}
      </div>

      {/* Uniform Card Body */}
      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
        <div>
          {/* Unboxed clean metadata with typographic separator */}
          <div className="flex items-center justify-between gap-2 text-xs text-neutral-500 uppercase tracking-wider mb-1.5">
            <span>
              {phone.brand} <span aria-hidden="true">·</span> {baseStorage?.label}
            </span>
            <span className={phone.inStock ? 'text-emerald-700 font-medium normal-case' : 'text-red-600 font-medium normal-case'}>
              {phone.inStock ? `Omborda: ${phone.stockCount}` : 'Sotuvda yo‘q'}
            </span>
          </div>

          <h3 className="font-display text-lg font-semibold text-[#0B0B0F] leading-snug">
            {phone.model}
          </h3>

          <p className="text-xs text-neutral-600 mt-1.5 line-clamp-2 leading-relaxed">
            {phone.shortDesc}
          </p>
        </div>

        <div className="pt-3 border-t border-[#F0F0F4] space-y-3">
          {/* Interactive Color Swatches */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {phone.colors.map((c, idx) => (
                <button
                  key={c.name}
                  type="button"
                  title={c.name}
                  aria-label={`${phone.model} rang: ${c.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedColorIdx(idx);
                  }}
                  className={`w-4 h-4 rounded-full border transition-transform cursor-pointer ${
                    idx === selectedColorIdx
                      ? 'ring-2 ring-[#FF5500] ring-offset-1 border-black/20 scale-110'
                      : 'border-black/15 hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
              <span className="text-xs text-neutral-500 ml-1 truncate max-w-[110px]">
                {activeColor?.name}
              </span>
            </div>

            <span className="text-xs text-neutral-500">{phone.category}</span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="block text-[11px] text-neutral-500">Boshlang‘ich narx</span>
              <span className="font-mono tabular-nums text-[15px] font-bold text-[#0B0B0F]">
                {formatUzs(baseStorage?.priceUzs || 0)}
              </span>
            </div>

            <button
              type="button"
              disabled={!phone.inStock}
              onClick={handleQuickAdd}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#FF5500] hover:bg-[#E04800] disabled:bg-neutral-200 disabled:text-neutral-500 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Savatga</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};

export const CatalogSection: React.FC = () => {
  const {
    phones,
    loadingPhones,
    brandFilter,
    setBrandFilter,
    categoryFilter,
    setCategoryFilter,
    searchQuery,
    setSearchQuery,
    sortOrder,
    setSortOrder,
  } = useMarket();

  const filteredPhones = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = phones.filter((p) => {
      if (brandFilter !== 'Barchasi' && p.brand !== brandFilter) return false;
      if (categoryFilter !== 'Barchasi' && p.category !== categoryFilter) return false;
      if (q) {
        const hay = `${p.brand} ${p.model} ${p.shortDesc} ${p.specs.processor}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (sortOrder === 'price-asc') {
      return [...list].sort(
        (a, b) => (a.storageOptions[0]?.priceUzs || 0) - (b.storageOptions[0]?.priceUzs || 0)
      );
    }
    if (sortOrder === 'price-desc') {
      return [...list].sort(
        (a, b) => (b.storageOptions[0]?.priceUzs || 0) - (a.storageOptions[0]?.priceUzs || 0)
      );
    }
    return [...list].sort((a, b) => Number(b.featured) - Number(a.featured));
  }, [phones, brandFilter, categoryFilter, searchQuery, sortOrder]);

  const hasActiveFilters =
    brandFilter !== 'Barchasi' || categoryFilter !== 'Barchasi' || searchQuery.trim() !== '';

  return (
    <section id="katalog" className="bg-white py-14 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Heading & Count */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#FF5500] mb-2">
              Smartfonlar katalogi
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0B0B0F] tracking-tight">
              Ommabop va yangi modellar
            </h2>
          </div>

          <p className="text-sm text-neutral-500 font-mono tabular-nums">
            Ko‘rsatilmoqda: {filteredPhones.length} / {phones.length} ta model
          </p>
        </div>

        {/* Interactive Menu & Filter Bar */}
        <div className="bg-[#F6F6F8] border border-[#E4E4E8] rounded-xl p-4 mb-8 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Brand Segmented Menu */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
              {BRANDS.map((brand) => (
                <button
                  key={brand}
                  type="button"
                  onClick={() => setBrandFilter(brand)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    brandFilter === brand
                      ? 'bg-[#0B0B0F] text-white'
                      : 'bg-white text-neutral-700 border border-[#E4E4E8] hover:border-[#0B0B0F]/40'
                  }`}
                >
                  {brand}
                </button>
              ))}
            </div>

            {/* Search & Sort */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Model yoki chip qidirish..."
                  className="w-full pl-9 pr-8 py-2 rounded-lg bg-white border border-[#E4E4E8] text-sm text-[#0B0B0F] placeholder:text-neutral-400 focus:outline-none focus:border-[#FF5500]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Qidiruvni tozalash"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-[#0B0B0F] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="relative flex items-center">
                <ArrowUpDown className="w-3.5 h-3.5 text-neutral-500 absolute left-3 pointer-events-none" />
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                  aria-label="Saralash"
                  className="pl-8 pr-4 py-2 rounded-lg bg-white border border-[#E4E4E8] text-xs font-medium text-[#0B0B0F] focus:outline-none focus:border-[#FF5500] cursor-pointer"
                >
                  <option value="featured">Tavsiya etilgan</option>
                  <option value="price-asc">Narx: arzondan qimmatga</option>
                  <option value="price-desc">Narx: qimmatdan arzonga</option>
                </select>
              </div>
            </div>
          </div>

          {/* Category Sub-Menu */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E4E4E8]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 mr-1">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Toifa:
              </span>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    categoryFilter === cat
                      ? 'bg-[#FF5500] text-white'
                      : 'text-neutral-700 hover:bg-white hover:text-[#0B0B0F]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setBrandFilter('Barchasi');
                  setCategoryFilter('Barchasi');
                  setSearchQuery('');
                }}
                className="text-xs font-medium text-[#FF5500] hover:underline cursor-pointer"
              >
                Filtrlarni tozalash
              </button>
            )}
          </div>
        </div>

        {/* Product Grid */}
        {loadingPhones ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="border border-[#E4E4E8] rounded-xl overflow-hidden bg-white animate-pulse"
              >
                <div className="aspect-[4/3] bg-[#F4F4F6]" />
                <div className="p-5 space-y-3">
                  <div className="h-3 bg-neutral-200 rounded w-1/3" />
                  <div className="h-5 bg-neutral-200 rounded w-2/3" />
                  <div className="h-3 bg-neutral-100 rounded w-full" />
                  <div className="h-9 bg-neutral-200 rounded w-full mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredPhones.length === 0 ? (
          <div className="border border-[#E4E4E8] rounded-xl bg-[#F6F6F8] p-12 text-center">
            <p className="font-display text-lg font-semibold text-[#0B0B0F]">
              Mos keladigan smartfon topilmadi
            </p>
            <p className="text-sm text-neutral-600 mt-1">
              Qidiruv so‘zini o‘zgartiring yoki barcha filtrlarni tozalang.
            </p>
            <button
              type="button"
              onClick={() => {
                setBrandFilter('Barchasi');
                setCategoryFilter('Barchasi');
                setSearchQuery('');
              }}
              className="mt-5 px-5 py-2.5 rounded-lg bg-[#0B0B0F] text-white text-xs font-semibold hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              Barcha modellarni ko‘rsatish
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPhones.map((phone) => (
              <PhoneCard key={phone.id} phone={phone} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
