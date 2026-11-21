import React, { useState } from 'react';
import { GameItem } from '../../types/hub.ts';

export const GameCoverArt: React.FC<{
  game: GameItem;
  className?: string;
}> = ({ game, className = '' }) => {
  const [imgError, setImgError] = useState(false);
  const { accentHex, secondaryHex } = game.engineConfig;

  if (game.coverUrl && !imgError) {
    return (
      <div className={`relative overflow-hidden bg-[#0D1017] ${className}`}>
        <img
          src={game.coverUrl}
          alt={game.title}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0D13] via-[#0B0D13]/25 to-transparent" />
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden bg-[#0B0E16] flex items-center justify-center ${className}`}
      style={{
        backgroundImage: `radial-gradient(circle at 20% 25%, ${accentHex}24 0%, transparent 55%), radial-gradient(circle at 80% 80%, ${secondaryHex}22 0%, transparent 55%)`,
      }}
    >
      <svg
        viewBox="0 0 320 180"
        className="w-full h-full opacity-90"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`g-${game.id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={accentHex} />
            <stop offset="100%" stopColor={secondaryHex} />
          </linearGradient>
        </defs>
        {/* Perspective grid floor */}
        <g stroke={secondaryHex} strokeOpacity="0.16" strokeWidth="1">
          <line x1="0" y1="130" x2="320" y2="130" />
          <line x1="0" y1="150" x2="320" y2="150" />
          <line x1="0" y1="170" x2="320" y2="170" />
          <line x1="80" y1="115" x2="20" y2="180" />
          <line x1="160" y1="115" x2="160" y2="180" />
          <line x1="240" y1="115" x2="300" y2="180" />
        </g>

        {/* Engine-specific geometric silhouette */}
        {game.engine === 'racer3d' && (
          <g>
            <path d="M70 120 L125 82 L195 82 L250 120 Z" fill="#131926" stroke={`url(#g-${game.id})`} strokeWidth="2.5" />
            <polygon points="135,88 185,88 210,108 110,108" fill={secondaryHex} fillOpacity="0.28" />
            <rect x="82" y="114" width="38" height="7" rx="3" fill={accentHex} />
            <rect x="200" y="114" width="38" height="7" rx="3" fill={accentHex} />
          </g>
        )}

        {(game.engine === 'chess' || game.engine === 'sudoku') && (
          <g transform="translate(105, 32)">
            {[0, 1, 2, 3].map((r) =>
              [0, 1, 2, 3].map((c) => (
                <rect
                  key={`${r}-${c}`}
                  x={c * 26}
                  y={r * 26}
                  width="24"
                  height="24"
                  rx="3"
                  fill={(r + c) % 2 === 0 ? '#182030' : '#0E131D'}
                  stroke={r === 1 && c === 2 ? accentHex : '#263147'}
                  strokeWidth={r === 1 && c === 2 ? 2 : 1}
                />
              ))
            )}
            <circle cx="64" cy="38" r="7" fill={accentHex} />
            <circle cx="38" cy="64" r="7" fill={secondaryHex} />
          </g>
        )}

        {(game.engine === 'maze3d' || game.engine === 'circuit') && (
          <g stroke={`url(#g-${game.id})`} strokeWidth="3" fill="none">
            <rect x="92" y="34" width="136" height="96" rx="6" strokeOpacity="0.4" />
            <path d="M110 54 H170 V84 H135 V110 H210" />
            <circle cx="110" cy="54" r="5" fill={accentHex} />
            <circle cx="210" cy="110" r="5" fill={secondaryHex} />
          </g>
        )}

        {(game.engine === 'orb3d' || game.engine === 'defense3d' || game.engine === 'reflex') && (
          <g>
            <circle cx="160" cy="82" r="42" fill="none" stroke={secondaryHex} strokeOpacity="0.35" strokeWidth="2" strokeDasharray="8 6" />
            <circle cx="160" cy="82" r="26" fill="none" stroke={accentHex} strokeWidth="2.5" />
            <circle cx="160" cy="82" r="9" fill={accentHex} />
            <line x1="106" y1="82" x2="124" y2="82" stroke={secondaryHex} strokeWidth="2" />
            <line x1="196" y1="82" x2="214" y2="82" stroke={secondaryHex} strokeWidth="2" />
            <line x1="160" y1="28" x2="160" y2="46" stroke={secondaryHex} strokeWidth="2" />
          </g>
        )}

        {(game.engine === 'stacker3d' || game.engine === 'empire' || game.engine === 'memory' || game.engine === 'wordsearch') && (
          <g>
            <rect x="110" y="96" width="100" height="18" rx="3" fill="#171E2E" stroke={secondaryHex} strokeWidth="1.5" />
            <rect x="120" y="74" width="80" height="18" rx="3" fill="#1B2438" stroke={accentHex} strokeWidth="1.5" />
            <rect x="132" y="52" width="56" height="18" rx="3" fill={accentHex} fillOpacity="0.28" stroke={accentHex} strokeWidth="2" />
            <rect x="144" y="32" width="32" height="16" rx="3" fill={secondaryHex} fillOpacity="0.3" stroke={secondaryHex} strokeWidth="1.5" />
          </g>
        )}
      </svg>
      <div className="absolute inset-0 bg-gradient-to-t from-[#0B0D13] via-transparent to-transparent" />
    </div>
  );
};
