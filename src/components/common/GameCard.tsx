import React from 'react';
import { GameItem } from '../../types/hub.ts';
import { GameCoverArt } from './GameCoverArt.tsx';
import { Play } from 'lucide-react';

interface GameCardProps {
  game: GameItem;
  onPlay: (game: GameItem) => void;
}

export const GameCard: React.FC<GameCardProps> = ({ game, onPlay }) => {
  return (
    <article className="group bg-[#0D1018] border border-white/10 hover:border-[#FF6B00]/50 rounded-2xl overflow-hidden transition-all duration-200 flex flex-col">
      <div className="h-40 relative">
        <GameCoverArt game={game} className="w-full h-full" />
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mb-1 truncate">
            <span>{game.ageGroup} yosh</span>
            <span aria-hidden="true">·</span>
            <span>{game.category}</span>
            <span aria-hidden="true">·</span>
            <span>{game.difficulty}</span>
          </div>
          <h3 className="font-display text-base font-bold text-white group-hover:text-[#FF6B00] transition-colors truncate">
            {game.title}
          </h3>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
            {game.description}
          </p>
        </div>

        <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
          <div className="text-[11px] font-mono text-slate-400 tabular-nums">
            {game.mode} · +{game.xpReward} XP
          </div>
          <button
            type="button"
            onClick={() => onPlay(game)}
            className="px-3.5 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#FF7D1F] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>O‘ynash</span>
          </button>
        </div>
      </div>
    </article>
  );
};
