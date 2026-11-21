import React, { useState } from 'react';
import { GameItem } from '../../types/hub.ts';
import { ThreeDGameEngine } from './engines/ThreeDGames.tsx';
import { StrategyBoardEngine } from './engines/StrategyBoardGames.tsx';
import { useHub } from '../../context/HubContext.tsx';
import { Heart, RotateCcw, Trophy, X } from 'lucide-react';

interface GamePlayModalProps {
  game: GameItem | null;
  onClose: () => void;
}

export const GamePlayModal: React.FC<GamePlayModalProps> = ({ game, onClose }) => {
  const { user, completeGame, toggleFavorite } = useHub();
  const [result, setResult] = useState<{ score: number; won: boolean; xpEarned: number } | null>(null);
  const [runKey, setRunKey] = useState(1);

  if (!game) return null;

  const is3D = ['racer3d', 'maze3d', 'orb3d', 'stacker3d', 'defense3d'].includes(game.engine);
  const isFav = user?.favoriteGames.includes(game.id) ?? false;

  const handleFinish = async (score: number, won: boolean) => {
    try {
      const xpEarned = await completeGame(game.id, score, won);
      setResult({ score, won, xpEarned });
    } catch {
      setResult({ score, won, xpEarned: won ? game.xpReward : 25 });
    }
  };

  const restart = () => {
    setResult(null);
    setRunKey((k) => k + 1);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-4xl bg-[#0C0F17] border border-white/15 rounded-2xl overflow-hidden shadow-2xl my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-white/10 bg-[#090B11]">
          <div className="min-w-0">
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span>{game.category}</span>
              <span>·</span>
              <span>{game.difficulty}</span>
              <span>·</span>
              <span>+{game.xpReward} XP</span>
            </div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-white truncate">
              {game.title}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => toggleFavorite(game.id)}
              className={`p-2 rounded-xl border transition-colors ${
                isFav
                  ? 'border-[#FF6B00] bg-[#FF6B00]/15 text-[#FF6B00]'
                  : 'border-white/10 text-slate-400 hover:text-white'
              }`}
              title="Sevimlilarga qo‘shish"
            >
              <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5"
              aria-label="Yopish"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Instructions Bar */}
        <div className="px-5 py-2.5 bg-[#111622] border-b border-white/10 text-xs text-slate-300">
          <strong className="text-[#00D2FF] mr-1.5">Ko‘rsatma:</strong>
          {game.instructions}
        </div>

        {/* Active Game Stage or End Summary */}
        <div className="p-4 sm:p-6">
          {result ? (
            <div className="py-10 text-center max-w-md mx-auto space-y-5">
              <div
                className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center border ${
                  result.won
                    ? 'bg-[#FF6B00]/15 border-[#FF6B00]/40 text-[#FF6B00]'
                    : 'bg-slate-800/60 border-white/10 text-slate-300'
                }`}
              >
                <Trophy className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-display text-2xl font-bold text-white">
                  {result.won ? 'Tabriklaymiz, G‘alaba!' : 'O‘yin yakunlandi'}
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  Natijangiz reyting va profilingizga saqlandi.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 bg-[#111520] border border-white/10 rounded-xl p-4">
                <div>
                  <div className="text-xs text-slate-400">Umumiy ball</div>
                  <div className="font-mono text-xl font-bold text-white tabular-nums">{result.score}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Olingan tajriba</div>
                  <div className="font-mono text-xl font-bold text-[#00D2FF] tabular-nums">+{result.xpEarned} XP</div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={restart}
                  className="px-5 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF7D1F] text-white text-sm font-semibold flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" /> Qayta o‘ynash
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl border border-white/15 text-slate-200 hover:bg-white/5 text-sm font-semibold"
                >
                  Kutubxonaga qaytish
                </button>
              </div>
            </div>
          ) : is3D ? (
            <ThreeDGameEngine key={`${game.id}-${runKey}`} game={game} onFinish={handleFinish} />
          ) : (
            <StrategyBoardEngine key={`${game.id}-${runKey}`} game={game} onFinish={handleFinish} />
          )}
        </div>
      </div>
    </div>
  );
};
