import React, { useState } from 'react';

export const AVATAR_OPTIONS = [
  { id: 'cyber_helmet', label: 'Kiber Shlem' },
  { id: 'neon_visor', label: 'Plazma Vizor' },
  { id: 'orange_titan', label: 'Olovli Titan' },
  { id: 'aqua_falcon', label: 'Moviy Lochin' },
  { id: 'gold_sentinel', label: 'Oltin Qalqon' },
  { id: 'obsidian_core', label: 'Kvant Yadro' },
];

export const AvatarVisual: React.FC<{
  avatarId: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ avatarId, size = 'md', className = '' }) => {
  const [imgFailed, setImgFailed] = useState(false);

  const sizeClass =
    size === 'sm' ? 'w-9 h-9' : size === 'lg' ? 'w-20 h-20' : 'w-12 h-12';

  if (avatarId === 'cyber_helmet' && !imgFailed) {
    return (
      <div
        className={`${sizeClass} rounded-xl overflow-hidden border border-white/15 bg-[#0D1017] shrink-0 ${className}`}
      >
        <img
          src="/src/assets/images/avatar_cyber_champion_1795273636504.jpg"
          alt="O‘yinchi avatari"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  const paletteMap: Record<string, { a: string; b: string }> = {
    cyber_helmet: { a: '#FF6B00', b: '#00D2FF' },
    neon_visor: { a: '#00D2FF', b: '#38BDF8' },
    orange_titan: { a: '#FF6B00', b: '#F59E0B' },
    aqua_falcon: { a: '#0EA5E9', b: '#22D3EE' },
    gold_sentinel: { a: '#F59E0B', b: '#FBBF24' },
    obsidian_core: { a: '#F97316', b: '#00D2FF' },
  };

  const colors = paletteMap[avatarId] || paletteMap.cyber_helmet;

  return (
    <div
      className={`${sizeClass} rounded-xl border border-white/15 bg-[#0E121B] flex items-center justify-center shrink-0 overflow-hidden ${className}`}
    >
      <svg viewBox="0 0 64 64" className="w-4/5 h-4/5" aria-hidden="true">
        <defs>
          <linearGradient id={`grad-${avatarId}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={colors.a} />
            <stop offset="100%" stopColor={colors.b} />
          </linearGradient>
        </defs>
        <polygon
          points="32,6 56,20 56,44 32,58 8,44 8,20"
          fill="#131824"
          stroke={`url(#grad-${avatarId})`}
          strokeWidth="3"
        />
        <polygon
          points="32,16 46,24 46,40 32,48 18,40 18,24"
          fill={`url(#grad-${avatarId})`}
          fillOpacity="0.22"
        />
        <path
          d="M22 28 L32 22 L42 28 L32 34 Z"
          fill={colors.a}
        />
        <rect x="24" y="37" width="16" height="4" rx="2" fill={colors.b} />
      </svg>
    </div>
  );
};
