import React, { useEffect, useMemo, useState } from 'react';
import { GameItem } from '../../../types/hub.ts';
import { soundFx } from '../../../utils/soundFx.ts';
import { Lightbulb, RotateCcw } from 'lucide-react';

interface EngineProps {
  game: GameItem;
  onFinish: (score: number, won: boolean) => void;
}

// ====================================================
// 1. CHESS ENGINE (Legal moves + Bot opponent)
// ====================================================
type Piece = string | null; // 'wK','wQ','wR','wB','wN','wP' / 'b...'
const PIECE_GLYPHS: Record<string, string> = {
  wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
  bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟',
};
const PIECE_VALUES: Record<string, number> = { K: 900, Q: 90, R: 50, B: 30, N: 30, P: 10 };

function initialChessBoard(): Piece[][] {
  return [
    ['bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR'],
    ['bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP'],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ['wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP'],
    ['wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR'],
  ];
}

function getPseudoMoves(board: Piece[][], r: number, c: number): Array<[number, number]> {
  const p = board[r][c];
  if (!p) return [];
  const color = p[0];
  const type = p[1];
  const moves: Array<[number, number]> = [];
  const inBounds = (rr: number, cc: number) => rr >= 0 && rr < 8 && cc >= 0 && cc < 8;
  const isEnemy = (rr: number, cc: number) => Boolean(board[rr][cc] && board[rr][cc]![0] !== color);
  const isEmpty = (rr: number, cc: number) => !board[rr][cc];

  if (type === 'P') {
    const dir = color === 'w' ? -1 : 1;
    const startRow = color === 'w' ? 6 : 1;
    if (inBounds(r + dir, c) && isEmpty(r + dir, c)) {
      moves.push([r + dir, c]);
      if (r === startRow && isEmpty(r + dir * 2, c)) moves.push([r + dir * 2, c]);
    }
    for (const dc of [-1, 1]) {
      if (inBounds(r + dir, c + dc) && isEnemy(r + dir, c + dc)) moves.push([r + dir, c + dc]);
    }
  } else if (type === 'N') {
    for (const [dr, dc] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) {
      const nr = r + dr, nc = c + dc;
      if (inBounds(nr, nc) && (isEmpty(nr, nc) || isEnemy(nr, nc))) moves.push([nr, nc]);
    }
  } else if (type === 'K') {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr, nc = c + dc;
        if (inBounds(nr, nc) && (isEmpty(nr, nc) || isEnemy(nr, nc))) moves.push([nr, nc]);
      }
    }
  } else {
    const dirs: Array<[number, number]> = [];
    if (type === 'R' || type === 'Q') dirs.push([1, 0], [-1, 0], [0, 1], [0, -1]);
    if (type === 'B' || type === 'Q') dirs.push([1, 1], [1, -1], [-1, 1], [-1, -1]);
    for (const [dr, dc] of dirs) {
      let nr = r + dr, nc = c + dc;
      while (inBounds(nr, nc)) {
        if (isEmpty(nr, nc)) moves.push([nr, nc]);
        else {
          if (isEnemy(nr, nc)) moves.push([nr, nc]);
          break;
        }
        nr += dr;
        nc += dc;
      }
    }
  }
  return moves;
}

const ChessGame: React.FC<EngineProps> = ({ game, onFinish }) => {
  const [board, setBoard] = useState<Piece[][]>(() => initialChessBoard());
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [turn, setTurn] = useState<'w' | 'b'>('w');
  const [log, setLog] = useState<string[]>([]);
  const [score, setScore] = useState(0);

  const validTargets = useMemo(() => {
    if (!selected || turn !== 'w') return [];
    return getPseudoMoves(board, selected[0], selected[1]);
  }, [board, selected, turn]);

  const makeMove = (b: Piece[][], fr: number, fc: number, tr: number, tc: number): { next: Piece[][]; captured: Piece } => {
    const next = b.map((row) => [...row]);
    const captured = next[tr][tc];
    let piece = next[fr][fc]!;
    if (piece === 'wP' && tr === 0) piece = 'wQ';
    if (piece === 'bP' && tr === 7) piece = 'bQ';
    next[tr][tc] = piece;
    next[fr][fc] = null;
    return { next, captured };
  };

  useEffect(() => {
    if (turn !== 'b') return;
    const timer = setTimeout(() => {
      const allMoves: Array<{ fr: number; fc: number; tr: number; tc: number; val: number }> = [];
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (board[r][c]?.[0] === 'b') {
            for (const [tr, tc] of getPseudoMoves(board, r, c)) {
              const target = board[tr][tc];
              const val = (target ? PIECE_VALUES[target[1]] * 10 : 0) + (tr > r ? 2 : 0) + Math.random() * 2;
              allMoves.push({ fr: r, fc: c, tr, tc, val });
            }
          }
        }
      }
      if (allMoves.length === 0) {
        onFinish(score + 200, true);
        return;
      }
      allMoves.sort((a, b) => b.val - a.val);
      const depth = game.engineConfig.aiDepth || 1;
      const pick = depth >= 2 ? allMoves[0] : allMoves[Math.min(allMoves.length - 1, Math.floor(Math.random() * 3))];
      const { next, captured } = makeMove(board, pick.fr, pick.fc, pick.tr, pick.tc);
      soundFx.click();
      setBoard(next);
      setLog((prev) => [`Bot: ${String.fromCharCode(65 + pick.fc)}${8 - pick.fr}→${String.fromCharCode(65 + pick.tc)}${8 - pick.tr}`, ...prev].slice(0, 6));
      if (captured === 'wK') {
        onFinish(score, false);
        return;
      }
      setTurn('w');
    }, 550);
    return () => clearTimeout(timer);
  }, [turn, board, game.engineConfig.aiDepth, onFinish, score]);

  const handleCellClick = (r: number, c: number) => {
    if (turn !== 'w') return;
    const isTarget = validTargets.some(([tr, tc]) => tr === r && tc === c);
    if (selected && isTarget) {
      const { next, captured } = makeMove(board, selected[0], selected[1], r, c);
      const pts = captured ? PIECE_VALUES[captured[1]] * 5 : 5;
      const newScore = score + pts;
      setScore(newScore);
      setBoard(next);
      setSelected(null);
      soundFx.collect();
      setLog((prev) => [`Siz: ${String.fromCharCode(65 + selected[1])}${8 - selected[0]}→${String.fromCharCode(65 + c)}${8 - r}`, ...prev].slice(0, 6));
      if (captured === 'bK') {
        onFinish(newScore + 300, true);
        return;
      }
      setTurn('b');
      return;
    }

    if (board[r][c]?.[0] === 'w') {
      setSelected([r, c]);
      soundFx.click();
    } else {
      setSelected(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-4 items-start">
      <div className="grid grid-cols-8 border border-white/15 rounded-xl overflow-hidden aspect-square max-w-[420px] w-full mx-auto">
        {board.map((row, r) =>
          row.map((piece, c) => {
            const dark = (r + c) % 2 === 1;
            const isSel = selected?.[0] === r && selected?.[1] === c;
            const isValid = validTargets.some(([tr, tc]) => tr === r && tc === c);
            return (
              <button
                key={`${r}-${c}`}
                type="button"
                onClick={() => handleCellClick(r, c)}
                className={`relative flex items-center justify-center text-2xl sm:text-3xl select-none transition-colors ${
                  isSel
                    ? 'bg-[#FF6B00]/55'
                    : isValid
                    ? 'bg-[#00D2FF]/35 hover:bg-[#00D2FF]/50'
                    : dark
                    ? 'bg-[#121723]'
                    : 'bg-[#1E2638]'
                }`}
              >
                <span className={piece?.[0] === 'w' ? 'text-white drop-shadow' : 'text-[#FF9E5E]'}>
                  {piece ? PIECE_GLYPHS[piece] : ''}
                </span>
                {isValid && !piece && (
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00D2FF]" />
                )}
              </button>
            );
          })
        )}
      </div>

      <div className="bg-[#090C12] border border-white/10 rounded-xl p-4 space-y-3 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Navbat</span>
          <span className="font-semibold text-white">
            {turn === 'w' ? 'Siz (Oq)' : 'Bot o‘ylamoqda...'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Ball</span>
          <span className="font-mono font-bold text-[#FF6B00] tabular-nums">{score}</span>
        </div>
        <div className="border-t border-white/10 pt-2">
          <div className="text-slate-400 mb-1.5">Yurishlar tarixi</div>
          <div className="space-y-1 font-mono text-[11px] text-slate-300">
            {log.length === 0 ? <span className="text-slate-500">Ilk yurishni qiling</span> : log.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setBoard(initialChessBoard());
            setTurn('w');
            setLog([]);
            setScore(0);
          }}
          className="w-full py-2 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 flex items-center justify-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Yangilash
        </button>
      </div>
    </div>
  );
};

// ====================================================
// 2. SUDOKU ENGINE (4x4 / 6x6)
// ====================================================
const SudokuGame: React.FC<EngineProps> = ({ game, onFinish }) => {
  const size = game.engineConfig.gridSize === 6 ? 6 : 4;
  const solution = useMemo(() => {
    if (size === 4) {
      return [
        [1, 2, 3, 4],
        [3, 4, 1, 2],
        [2, 1, 4, 3],
        [4, 3, 2, 1],
      ];
    }
    return [
      [1, 2, 3, 4, 5, 6],
      [4, 5, 6, 1, 2, 3],
      [2, 3, 1, 6, 4, 5],
      [5, 6, 4, 3, 1, 2],
      [3, 1, 2, 5, 6, 4],
      [6, 4, 5, 2, 3, 1],
    ];
  }, [size]);

  const [fixed] = useState<boolean[][]>(() =>
    solution.map((row, r) => row.map((_, c) => (r * 3 + c * 5) % 2 === 0))
  );
  const [grid, setGrid] = useState<number[][]>(() =>
    solution.map((row, r) => row.map((v, c) => (fixed[r][c] ? v : 0)))
  );
  const [sel, setSel] = useState<[number, number] | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);

  const setNum = (n: number) => {
    if (!sel) return;
    const [r, c] = sel;
    if (fixed[r][c]) return;
    const next = grid.map((row) => [...row]);
    next[r][c] = n;
    setGrid(next);
    soundFx.click();

    const complete = next.every((row, ri) => row.every((val, ci) => val === solution[ri][ci]));
    if (complete) {
      onFinish(Math.max(100, size * 60 - hintsUsed * 30), true);
    }
  };

  const giveHint = () => {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] !== solution[r][c]) {
          const next = grid.map((row) => [...row]);
          next[r][c] = solution[r][c];
          setGrid(next);
          setHintsUsed((h) => h + 1);
          soundFx.collect();
          return;
        }
      }
    }
  };

  return (
    <div className="space-y-4 max-w-md mx-auto">
      <div
        className="grid gap-1.5 bg-[#090C12] p-3 rounded-xl border border-white/10"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
      >
        {grid.map((row, r) =>
          row.map((val, c) => {
            const isSel = sel?.[0] === r && sel?.[1] === c;
            const isWrong = val !== 0 && val !== solution[r][c];
            return (
              <button
                key={`${r}-${c}`}
                type="button"
                onClick={() => setSel([r, c])}
                className={`h-12 rounded-lg font-mono text-lg font-bold transition-colors border ${
                  isSel
                    ? 'border-[#FF6B00] bg-[#FF6B00]/20 text-white'
                    : fixed[r][c]
                    ? 'border-white/10 bg-[#151C2B] text-[#00D2FF]'
                    : isWrong
                    ? 'border-red-500/60 bg-red-950/40 text-red-300'
                    : 'border-white/10 bg-[#0E131D] text-white hover:border-white/25'
                }`}
              >
                {val || ''}
              </button>
            );
          })
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {Array.from({ length: size }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setNum(n)}
            className="w-11 h-11 rounded-xl bg-[#151B28] hover:bg-[#FF6B00] border border-white/10 font-mono font-bold text-white transition-colors"
          >
            {n}
          </button>
        ))}
        <button
          type="button"
          onClick={giveHint}
          className="px-4 h-11 rounded-xl bg-[#00D2FF]/15 border border-[#00D2FF]/40 text-[#00D2FF] text-xs font-semibold flex items-center gap-1.5"
        >
          <Lightbulb className="w-4 h-4" /> Yordam
        </button>
      </div>
    </div>
  );
};

// ====================================================
// 3. WORD SEARCH ENGINE (O'zbekcha So'z Topish)
// ====================================================
const WordSearchGame: React.FC<EngineProps> = ({ game, onFinish }) => {
  const words = useMemo(
    () => (game.engineConfig.wordList || ['SAMARQAND', 'KIBER', 'ARENA', 'LAZER']).map((w) => w.toUpperCase()),
    [game]
  );
  const size = Math.max(9, ...words.map((w) => w.length));

  const { board, placements } = useMemo(() => {
    const b: string[][] = Array.from({ length: size }, () => Array(size).fill(''));
    const pls: Record<string, Array<[number, number]>> = {};
    const letters = 'ABDEFGHIJKLMNOPQRSTUVXYZ';
    words.forEach((word, idx) => {
      const row = idx % size;
      const coords: Array<[number, number]> = [];
      for (let i = 0; i < word.length; i++) {
        b[row][i] = word[i];
        coords.push([row, i]);
      }
      pls[word] = coords;
    });
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!b[r][c]) b[r][c] = letters[Math.floor(Math.random() * letters.length)];
      }
    }
    return { board: b, placements: pls };
  }, [words, size]);

  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [selectedCells, setSelectedCells] = useState<string[]>([]);

  const toggleCell = (r: number, c: number) => {
    const key = `${r}-${c}`;
    const next = selectedCells.includes(key)
      ? selectedCells.filter((k) => k !== key)
      : [...selectedCells, key];
    soundFx.click();

    for (const w of words) {
      if (foundWords.includes(w)) continue;
      const coords = placements[w].map(([pr, pc]) => `${pr}-${pc}`);
      if (coords.every((k) => next.includes(k))) {
        const updatedFound = [...foundWords, w];
        setFoundWords(updatedFound);
        setSelectedCells([]);
        soundFx.collect();
        if (updatedFound.length === words.length) {
          onFinish(words.length * 65, true);
        }
        return;
      }
    }
    setSelectedCells(next);
  };

  const revealHint = () => {
    const remaining = words.find((w) => !foundWords.includes(w));
    if (!remaining) return;
    const [r, c] = placements[remaining][0];
    const key = `${r}-${c}`;
    if (!selectedCells.includes(key)) setSelectedCells((prev) => [...prev, key]);
    soundFx.collect();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {words.map((w) => {
            const done = foundWords.includes(w);
            return (
              <span
                key={w}
                className={`px-2.5 py-1 rounded-lg font-mono text-xs border ${
                  done
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 line-through'
                    : 'bg-[#121722] border-white/10 text-slate-200'
                }`}
              >
                {w}
              </span>
            );
          })}
        </div>
        <button
          type="button"
          onClick={revealHint}
          className="px-3 py-1.5 rounded-lg bg-[#00D2FF]/15 border border-[#00D2FF]/40 text-[#00D2FF] text-xs font-semibold flex items-center gap-1"
        >
          <Lightbulb className="w-3.5 h-3.5" /> Harf ochish
        </button>
      </div>

      <div
        className="grid gap-1 bg-[#090C12] p-2.5 rounded-xl border border-white/10 max-w-lg mx-auto"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
      >
        {board.map((row, r) =>
          row.map((ch, c) => {
            const key = `${r}-${c}`;
            const isFoundCell = foundWords.some((w) =>
              placements[w].some(([pr, pc]) => pr === r && pc === c)
            );
            const isSel = selectedCells.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleCell(r, c)}
                className={`aspect-square rounded-md font-mono font-bold text-sm sm:text-base transition-colors border ${
                  isFoundCell
                    ? 'bg-emerald-500/25 border-emerald-400/50 text-emerald-200'
                    : isSel
                    ? 'bg-[#FF6B00]/35 border-[#FF6B00] text-white'
                    : 'bg-[#121722] border-white/10 text-slate-200 hover:border-white/30'
                }`}
              >
                {ch}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

// ====================================================
// 4. MEMORY MATRIX ENGINE
// ====================================================
const MEMORY_ICONS = ['⚡', '◈', '▲', '❖', '⬡', '✦', '◉', '⬢', '✚', '★'];

const MemoryGame: React.FC<EngineProps> = ({ game, onFinish }) => {
  const pairCount = game.engineConfig.gridSize === 5 ? 10 : 8;
  const [cards] = useState(() =>
    [...MEMORY_ICONS.slice(0, pairCount), ...MEMORY_ICONS.slice(0, pairCount)]
      .sort(() => Math.random() - 0.5)
      .map((symbol, idx) => ({ id: idx, symbol }))
  );
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);

  const flip = (id: number) => {
    if (flipped.length === 2 || flipped.includes(id) || matched.includes(id)) return;
    soundFx.click();
    const next = [...flipped, id];
    setFlipped(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = next;
      if (cards[a].symbol === cards[b].symbol) {
        const nm = [...matched, a, b];
        setMatched(nm);
        setFlipped([]);
        soundFx.collect();
        if (nm.length === cards.length) {
          onFinish(Math.max(120, 400 - moves * 10), true);
        }
      } else {
        setTimeout(() => setFlipped([]), 650);
      }
    }
  };

  return (
    <div className="space-y-4 max-w-md mx-auto">
      <div className="flex justify-between text-xs bg-[#090C12] border border-white/10 rounded-xl px-4 py-2.5">
        <span className="text-slate-400">
          Juftliklar: <strong className="text-[#00D2FF] font-mono">{matched.length / 2}/{pairCount}</strong>
        </span>
        <span className="text-slate-400">
          Urinishlar: <strong className="text-[#FF6B00] font-mono">{moves}</strong>
        </span>
      </div>
      <div className={`grid gap-2.5 ${pairCount === 10 ? 'grid-cols-5' : 'grid-cols-4'}`}>
        {cards.map((card) => {
          const open = flipped.includes(card.id) || matched.includes(card.id);
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => flip(card.id)}
              className={`h-16 sm:h-20 rounded-xl border font-display text-2xl transition-all ${
                matched.includes(card.id)
                  ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                  : open
                  ? 'bg-[#FF6B00]/20 border-[#FF6B00] text-white'
                  : 'bg-[#121722] border-white/10 text-slate-600 hover:border-white/30'
              }`}
            >
              {open ? card.symbol : '?'}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ====================================================
// 5. REFLEX TARGET ARENA
// ====================================================
const ReflexGame: React.FC<EngineProps> = ({ game, onFinish }) => {
  const duration = game.engineConfig.timeLimitSec || 30;
  const speedMult = game.engineConfig.speedMultiplier || 1;
  const [timeLeft, setTimeLeft] = useState(duration);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [target, setTarget] = useState({ x: 50, y: 50, decoy: false });

  useEffect(() => {
    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (timeLeft === 0) {
      onFinish(score, score >= 180);
    }
  }, [timeLeft, score, onFinish]);

  useEffect(() => {
    const moveMs = Math.max(600, Math.floor(1500 / speedMult));
    const t = setInterval(() => {
      setTarget({
        x: 14 + Math.random() * 72,
        y: 16 + Math.random() * 68,
        decoy: Math.random() < 0.2,
      });
    }, moveMs);
    return () => clearInterval(t);
  }, [speedMult]);

  const hitTarget = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (target.decoy) {
      setScore((s) => Math.max(0, s - 20));
      setCombo(0);
      soundFx.hit();
    } else {
      const pts = 20 + combo * 4;
      setScore((s) => s + pts);
      setCombo((c) => c + 1);
      soundFx.collect();
    }
    setTarget({
      x: 14 + Math.random() * 72,
      y: 16 + Math.random() * 68,
      decoy: Math.random() < 0.18,
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3 bg-[#090C12] border border-white/10 rounded-xl px-4 py-2.5 text-xs">
        <div>
          <span className="text-slate-400 block">Ball</span>
          <span className="font-mono text-base font-bold text-[#FF6B00] tabular-nums">{score}</span>
        </div>
        <div>
          <span className="text-slate-400 block">Kombo</span>
          <span className="font-mono text-base font-bold text-[#00D2FF] tabular-nums">x{combo}</span>
        </div>
        <div className="text-right">
          <span className="text-slate-400 block">Qolgan vaqt</span>
          <span className="font-mono text-base font-bold text-white tabular-nums">{timeLeft}s</span>
        </div>
      </div>

      <div
        onClick={() => setCombo(0)}
        className="relative h-80 sm:h-96 rounded-xl bg-[#090C14] border border-white/10 overflow-hidden cursor-crosshair select-none"
        style={{
          backgroundImage: 'radial-gradient(circle at center, rgba(0,210,255,0.08) 0%, transparent 70%)',
        }}
      >
        <button
          type="button"
          onClick={hitTarget}
          style={{ left: `${target.x}%`, top: `${target.y}%` }}
          className={`absolute -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full border-2 flex items-center justify-center transition-transform active:scale-90 ${
            target.decoy
              ? 'border-red-500 bg-red-500/25 text-red-200'
              : 'border-[#00D2FF] bg-[#FF6B00]/30 text-white shadow-lg shadow-[#00D2FF]/20'
          }`}
        >
          <div className={`w-4 h-4 rounded-full ${target.decoy ? 'bg-red-500' : 'bg-[#FF6B00]'}`} />
        </button>
        <div className="absolute bottom-3 left-3 text-[11px] text-slate-400">
          Ko‘k-to‘q sariq nishonni bosing · Qiziliga tegmang
        </div>
      </div>
    </div>
  );
};

// ====================================================
// 6. CIRCUIT / PIPE LOGIC PUZZLE
// ====================================================
const CircuitGame: React.FC<EngineProps> = ({ game, onFinish }) => {
  const size = game.engineConfig.gridSize === 5 ? 5 : 4;
  // Each tile has connections [N, E, S, W] rotated by `rot` (0..3)
  const [tiles, setTiles] = useState<Array<{ base: [number, number, number, number]; rot: number }>>(() =>
    Array.from({ length: size * size }, (_, idx) => {
      const isCorner = idx === 0 || idx === size - 1 || idx === size * size - 1;
      const base: [number, number, number, number] = isCorner
        ? [0, 1, 1, 0]
        : idx % 2 === 0
        ? [1, 1, 1, 0]
        : [0, 1, 0, 1];
      return { base, rot: Math.floor(Math.random() * 4) };
    })
  );

  const rotate = (idx: number) => {
    soundFx.click();
    const next = tiles.map((t, i) => (i === idx ? { ...t, rot: (t.rot + 1) % 4 } : t));
    setTiles(next);
  };

  // BFS energized check from top-left (0) to bottom-right (size*size - 1)
  const energized = useMemo(() => {
    const getConns = (t: { base: [number, number, number, number]; rot: number }) => {
      const [n, e, s, w] = t.base;
      const arr = [n, e, s, w];
      return [
        arr[(4 - t.rot) % 4],
        arr[(5 - t.rot) % 4],
        arr[(6 - t.rot) % 4],
        arr[(7 - t.rot) % 4],
      ];
    };
    const visited = new Set<number>([0]);
    const queue = [0];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      const r = Math.floor(cur / size);
      const c = cur % size;
      const conns = getConns(tiles[cur]);
      const neighbors: Array<{ nr: number; nc: number; dir: number; opp: number }> = [
        { nr: r - 1, nc: c, dir: 0, opp: 2 },
        { nr: r, nc: c + 1, dir: 1, opp: 3 },
        { nr: r + 1, nc: c, dir: 2, opp: 0 },
        { nr: r, nc: c - 1, dir: 3, opp: 1 },
      ];
      for (const nb of neighbors) {
        if (nb.nr >= 0 && nb.nr < size && nb.nc >= 0 && nb.nc < size) {
          const ni = nb.nr * size + nb.nc;
          if (!visited.has(ni) && conns[nb.dir] && getConns(tiles[ni])[nb.opp]) {
            visited.add(ni);
            queue.push(ni);
          }
        }
      }
    }
    return visited;
  }, [tiles, size]);

  useEffect(() => {
    if (energized.has(size * size - 1)) {
      const t = setTimeout(() => onFinish(size * 70, true), 450);
      return () => clearTimeout(t);
    }
  }, [energized, size, onFinish]);

  return (
    <div className="space-y-4 max-w-sm mx-auto">
      <div className="text-xs text-slate-300 text-center">
        Yuqori chap <strong className="text-[#FF6B00]">Manba</strong>dan pastki o‘ng{' '}
        <strong className="text-emerald-400">Terminal</strong>gacha energiya zanjirini ulang.
      </div>
      <div
        className="grid gap-2 bg-[#090C12] p-3 rounded-xl border border-white/10"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
      >
        {tiles.map((t, idx) => {
          const active = energized.has(idx);
          const isStart = idx === 0;
          const isEnd = idx === size * size - 1;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => rotate(idx)}
              className={`aspect-square rounded-lg border relative flex items-center justify-center transition-colors ${
                isStart
                  ? 'border-[#FF6B00] bg-[#FF6B00]/15'
                  : isEnd
                  ? 'border-emerald-400 bg-emerald-500/15'
                  : active
                  ? 'border-[#00D2FF]/60 bg-[#00D2FF]/15'
                  : 'border-white/10 bg-[#121722]'
              }`}
            >
              <svg
                viewBox="0 0 40 40"
                className="w-full h-full transition-transform duration-150"
                style={{ transform: `rotate(${t.rot * 90}deg)` }}
              >
                {t.base[0] === 1 && <line x1="20" y1="20" x2="20" y2="0" stroke={active ? '#00D2FF' : '#64748B'} strokeWidth="5" strokeLinecap="round" />}
                {t.base[1] === 1 && <line x1="20" y1="20" x2="40" y2="20" stroke={active ? '#00D2FF' : '#64748B'} strokeWidth="5" strokeLinecap="round" />}
                {t.base[2] === 1 && <line x1="20" y1="20" x2="20" y2="40" stroke={active ? '#00D2FF' : '#64748B'} strokeWidth="5" strokeLinecap="round" />}
                {t.base[3] === 1 && <line x1="20" y1="20" x2="0" y2="20" stroke={active ? '#00D2FF' : '#64748B'} strokeWidth="5" strokeLinecap="round" />}
                <circle cx="20" cy="20" r="4.5" fill={active ? '#FF6B00' : '#94A3B8'} />
              </svg>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ====================================================
// 7. EMPIRE / STRATEGIC DECISION ENGINE
// ====================================================
const SCENARIOS = [
  {
    prompt: 'Yangi quyosh elektr stansiyasi qurish taklifi tushdi. Xazinadan mablag‘ ajratasizmi?',
    a: { label: 'Qurilishni moliyalashtirish', delta: { treasury: -15, energy: 25, defense: 0, trust: 10 } },
    b: { label: 'Mablag‘ni zaxirada saqlash', delta: { treasury: 15, energy: -10, defense: 0, trust: -5 } },
  },
  {
    prompt: 'Chegara sektorida kiber-patrul tizimini yangilash zarurati tug‘ildi.',
    a: { label: 'Mudofaa tizimini kuchaytirish', delta: { treasury: -10, energy: -10, defense: 25, trust: 10 } },
    b: { label: 'Faqat joriy holatni saqlash', delta: { treasury: 5, energy: 5, defense: -15, trust: -5 } },
  },
  {
    prompt: 'Shahar yoshlari uchun bepul texnologiya va sport markazi ochish loyihasi.',
    a: { label: 'Markazni ishga tushirish', delta: { treasury: -15, energy: -5, defense: 5, trust: 25 } },
    b: { label: 'Soliqlarni yengillashtirish', delta: { treasury: 10, energy: 0, defense: 0, trust: 10 } },
  },
  {
    prompt: 'Qo‘shni savdo karvonlari bilan energetika va don almashinuvi shartnomasi.',
    a: { label: 'Hamkorlik shartnomasini imzolash', delta: { treasury: 20, energy: 10, defense: -5, trust: 10 } },
    b: { label: 'Ichki bozorni ustuvor qo‘yish', delta: { treasury: -5, energy: 15, defense: 10, trust: 5 } },
  },
];

const EmpireGame: React.FC<EngineProps> = ({ game, onFinish }) => {
  const maxRounds = game.engineConfig.targetScore || 10;
  const [round, setRound] = useState(1);
  const [stats, setStats] = useState({ treasury: 55, energy: 55, defense: 55, trust: 55 });

  const scenario = SCENARIOS[(round - 1) % SCENARIOS.length];

  const choose = (delta: { treasury: number; energy: number; defense: number; trust: number }) => {
    soundFx.click();
    const next = {
      treasury: Math.max(0, Math.min(100, stats.treasury + delta.treasury)),
      energy: Math.max(0, Math.min(100, stats.energy + delta.energy)),
      defense: Math.max(0, Math.min(100, stats.defense + delta.defense)),
      trust: Math.max(0, Math.min(100, stats.trust + delta.trust)),
    };
    setStats(next);

    const anyZero = Object.values(next).some((v) => v <= 0);
    if (anyZero) {
      onFinish(round * 25, false);
      return;
    }
    if (round >= maxRounds) {
      const total = next.treasury + next.energy + next.defense + next.trust;
      onFinish(total * 2, true);
      return;
    }
    setRound((r) => r + 1);
  };

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="flex justify-between items-center text-xs text-slate-400">
        <span>Strategik Raund</span>
        <span className="font-mono text-white font-bold">{round} / {maxRounds}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Xazina', val: stats.treasury, color: 'bg-amber-500' },
          { label: 'Energiya', val: stats.energy, color: 'bg-[#00D2FF]' },
          { label: 'Mudofaa', val: stats.defense, color: 'bg-[#FF6B00]' },
          { label: 'Ishonch', val: stats.trust, color: 'bg-emerald-500' },
        ].map((m) => (
          <div key={m.label} className="bg-[#090C12] border border-white/10 rounded-xl p-3">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-400">{m.label}</span>
              <span className="font-mono font-bold text-white tabular-nums">{m.val}%</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className={`h-full ${m.color} transition-all`} style={{ width: `${m.val}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[#101521] border border-white/10 rounded-xl p-5 space-y-4">
        <p className="text-sm sm:text-base text-white font-medium leading-relaxed">{scenario.prompt}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => choose(scenario.a.delta)}
            className="p-3.5 rounded-xl border border-[#FF6B00]/40 bg-[#FF6B00]/10 hover:bg-[#FF6B00]/20 text-left text-xs sm:text-sm font-medium text-white transition-colors"
          >
            {scenario.a.label}
          </button>
          <button
            type="button"
            onClick={() => choose(scenario.b.delta)}
            className="p-3.5 rounded-xl border border-[#00D2FF]/40 bg-[#00D2FF]/10 hover:bg-[#00D2FF]/20 text-left text-xs sm:text-sm font-medium text-white transition-colors"
          >
            {scenario.b.label}
          </button>
        </div>
      </div>
    </div>
  );
};

export const StrategyBoardEngine: React.FC<EngineProps> = (props) => {
  switch (props.game.engine) {
    case 'chess':
      return <ChessGame {...props} />;
    case 'sudoku':
      return <SudokuGame {...props} />;
    case 'wordsearch':
      return <WordSearchGame {...props} />;
    case 'memory':
      return <MemoryGame {...props} />;
    case 'reflex':
      return <ReflexGame {...props} />;
    case 'circuit':
      return <CircuitGame {...props} />;
    case 'empire':
    default:
      return <EmpireGame {...props} />;
  }
};
