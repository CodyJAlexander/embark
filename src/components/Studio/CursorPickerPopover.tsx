import { useState, useRef, useEffect } from 'react';

const CURSOR_COLORS = [
  '#f87171', // coral/red
  '#fb923c', // orange
  '#facc15', // amber/yellow (default)
  '#4ade80', // emerald
  '#34d399', // teal
  '#22d3ee', // cyan
  '#60a5fa', // sky/blue
  '#818cf8', // indigo
  '#a78bfa', // violet
  '#e879f9', // fuchsia
  '#f472b6', // rose/pink
  '#a3e635', // lime
];

const CURSOR_EMOJIS = ['', '🐙', '🦊', '🐲', '🌈', '⚡', '🎯', '🦋', '🐸', '🚀', '🎨', '🔥'];

export interface CursorPrefs {
  color: string;
  emoji?: string;
}

export function getCursorPrefs(): CursorPrefs {
  try {
    const stored = localStorage.getItem('embark-cursor-prefs');
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return { color: '#facc15' };
}

export function saveCursorPrefs(prefs: CursorPrefs): void {
  localStorage.setItem('embark-cursor-prefs', JSON.stringify(prefs));
}

interface Props {
  onClose: () => void;
  onChange: (prefs: CursorPrefs) => void;
}

export function CursorPickerPopover({ onClose, onChange }: Props) {
  const [prefs, setPrefs] = useState<CursorPrefs>(getCursorPrefs);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  function handleColor(color: string) {
    const next = { ...prefs, color };
    setPrefs(next);
    saveCursorPrefs(next);
    onChange(next);
  }

  function handleEmoji(emoji: string) {
    const next = { ...prefs, emoji: emoji || undefined };
    setPrefs(next);
    saveCursorPrefs(next);
    onChange(next);
  }

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 z-30 bg-zinc-900 border-2 border-zinc-700 rounded-[4px] p-3 shadow-[3px_3px_0_0_#18181b] w-56"
    >
      <p className="text-xs font-bold text-zinc-400 mb-2">Cursor color</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {CURSOR_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => handleColor(c)}
            className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
              prefs.color === c ? 'border-white scale-110' : 'border-transparent'
            }`}
            style={{ background: c }}
            aria-label={c}
          />
        ))}
      </div>
      <p className="text-xs font-bold text-zinc-400 mb-2">Cursor label</p>
      <div className="flex flex-wrap gap-1">
        {CURSOR_EMOJIS.map((em) => (
          <button
            key={em || 'none'}
            onClick={() => handleEmoji(em)}
            className={`w-7 h-7 flex items-center justify-center text-sm rounded-[3px] transition-colors ${
              (prefs.emoji ?? '') === em
                ? 'bg-yellow-400/20 border border-yellow-400'
                : 'hover:bg-zinc-800'
            }`}
          >
            {em || <span className="text-zinc-500 text-xs">–</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
