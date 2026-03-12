import { useEffect, useRef, useState } from 'react';
import type { BlockType } from '../../../types';

interface SlashOption {
  type: BlockType;
  label: string;
  description: string;
  icon: string;
}

const SLASH_OPTIONS: SlashOption[] = [
  { type: 'paragraph', label: 'Text', description: 'Plain paragraph', icon: '¶' },
  { type: 'heading1', label: 'Heading 1', description: 'Large heading', icon: 'H1' },
  { type: 'heading2', label: 'Heading 2', description: 'Medium heading', icon: 'H2' },
  { type: 'heading3', label: 'Heading 3', description: 'Small heading', icon: 'H3' },
  { type: 'bullet', label: 'Bullet List', description: 'Unordered list item', icon: '•' },
  { type: 'numbered', label: 'Numbered List', description: 'Ordered list item', icon: '1.' },
  { type: 'todo', label: 'To-do', description: 'Checkbox item', icon: '☑' },
  { type: 'quote', label: 'Quote', description: 'Block quote', icon: '"' },
  { type: 'callout', label: 'Callout', description: 'Highlighted callout box', icon: '💡' },
  { type: 'code', label: 'Code', description: 'Code block', icon: '</>' },
  { type: 'divider', label: 'Divider', description: 'Horizontal rule', icon: '—' },
];

interface Props {
  query: string;
  anchorRect: DOMRect;
  onSelect: (type: BlockType) => void;
  onClose: () => void;
}

export function SlashCommandMenu({ query, anchorRect, onSelect, onClose }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const filtered = SLASH_OPTIONS.filter((o) =>
    o.label.toLowerCase().includes(query.toLowerCase()) ||
    o.type.toLowerCase().includes(query.toLowerCase())
  );

  // Reset selection when filter changes
  useEffect(() => { setActiveIndex(0); }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[activeIndex]) onSelect(filtered[activeIndex].type);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [filtered, activeIndex, onSelect, onClose]);

  // Scroll active item into view
  useEffect(() => {
    const el = menuRef.current?.children[activeIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (filtered.length === 0) return null;

  const top = anchorRect.bottom + 4;
  const left = anchorRect.left;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-64 bg-zinc-900 border-2 border-zinc-700 rounded-[4px] shadow-[4px_4px_0_0_#18181b] overflow-hidden"
      style={{ top, left, maxHeight: 280, overflowY: 'auto' }}
    >
      {filtered.map((opt, i) => (
        <button
          key={opt.type}
          onClick={() => onSelect(opt.type)}
          className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
            i === activeIndex ? 'bg-yellow-400 text-zinc-900' : 'text-zinc-300 hover:bg-zinc-800'
          }`}
        >
          <span className="w-8 h-8 rounded-[4px] bg-zinc-800 flex items-center justify-center text-xs font-black shrink-0 font-mono">
            {opt.icon}
          </span>
          <div>
            <div className="text-sm font-bold">{opt.label}</div>
            <div className={`text-xs ${i === activeIndex ? 'text-zinc-700' : 'text-zinc-500'}`}>{opt.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
}
