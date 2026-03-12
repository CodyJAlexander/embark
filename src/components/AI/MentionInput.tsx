import { useState, useRef, useCallback, type KeyboardEvent } from 'react';
import type { StudioPage } from '../../types';
import { detectPageMention, detectDateToken } from '../../utils/studioHelpers';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  pages: StudioPage[];
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  className?: string;
}

const DATE_TOKENS = [
  { label: '@today', value: 'today', description: 'Today\'s date' },
  { label: '@tomorrow', value: 'tomorrow', description: 'Tomorrow\'s date' },
  { label: '@this-week', value: 'this-week', description: 'This week range' },
];

export function MentionInput({ value, onChange, onKeyDown, pages, placeholder, disabled, rows = 1, className = '' }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [pageQuery, setPageQuery] = useState<string | null>(null);
  const [dateQuery, setDateQuery] = useState<string | null>(null);
  const [popupIndex, setPopupIndex] = useState(0);

  const filteredPages = pageQuery !== null
    ? pages.filter((p) => p.title.toLowerCase().includes(pageQuery.toLowerCase())).slice(0, 8)
    : [];

  const filteredDates = dateQuery !== null
    ? DATE_TOKENS.filter((d) => d.value.toLowerCase().startsWith(dateQuery.toLowerCase()))
    : [];

  const showPagePopup = pageQuery !== null && filteredPages.length > 0;
  const showDatePopup = dateQuery !== null && filteredDates.length > 0;
  const popupItems = showPagePopup ? filteredPages.length : showDatePopup ? filteredDates.length : 0;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const cursor = e.target.selectionStart ?? val.length;
    onChange(val);

    const pm = detectPageMention(val, cursor);
    const dt = detectDateToken(val, cursor);

    if (pm !== null) {
      setPageQuery(pm);
      setDateQuery(null);
      setPopupIndex(0);
    } else if (dt !== null) {
      setDateQuery(dt);
      setPageQuery(null);
      setPopupIndex(0);
    } else {
      setPageQuery(null);
      setDateQuery(null);
    }
  }, [onChange]);

  const insertPageMention = useCallback((page: StudioPage) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const cursor = ta.selectionStart ?? value.length;
    // Find the [[ that opened this mention
    const before = value.slice(0, cursor);
    const openIdx = before.lastIndexOf('[[');
    if (openIdx === -1) return;
    const newValue = value.slice(0, openIdx) + `[[${page.title}]]` + value.slice(cursor);
    onChange(newValue);
    setPageQuery(null);
    // Restore focus
    setTimeout(() => ta.focus(), 0);
  }, [value, onChange]);

  const insertDateToken = useCallback((token: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const cursor = ta.selectionStart ?? value.length;
    const before = value.slice(0, cursor);
    const atIdx = before.lastIndexOf('@');
    if (atIdx === -1) return;
    const newValue = value.slice(0, atIdx) + `@${token}` + value.slice(cursor);
    onChange(newValue);
    setDateQuery(null);
    setTimeout(() => ta.focus(), 0);
  }, [value, onChange]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((showPagePopup || showDatePopup) && popupItems > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setPopupIndex((i) => Math.min(i + 1, popupItems - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setPopupIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (showPagePopup) insertPageMention(filteredPages[popupIndex]);
        else if (showDatePopup) insertDateToken(filteredDates[popupIndex].value);
        return;
      }
      if (e.key === 'Escape') {
        setPageQuery(null);
        setDateQuery(null);
        return;
      }
    }
    onKeyDown(e);
  }, [showPagePopup, showDatePopup, popupItems, filteredPages, filteredDates, popupIndex, insertPageMention, insertDateToken, onKeyDown]);

  return (
    <div className="relative flex-1">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={className}
        style={{ minHeight: '48px', maxHeight: '120px' }}
      />

      {/* Page mention popup */}
      {showPagePopup && (
        <div className="absolute bottom-full mb-1 left-0 w-72 bg-zinc-900 border-2 border-zinc-700 rounded-[4px] shadow-[3px_3px_0_0_#18181b] overflow-hidden z-50 max-h-48 overflow-y-auto">
          <div className="px-3 py-1.5 text-xs font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-800">
            Pages
          </div>
          {filteredPages.map((p, i) => (
            <button
              key={p.id}
              onClick={() => insertPageMention(p)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                i === popupIndex ? 'bg-yellow-400 text-zinc-900' : 'text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              <span>{p.icon}</span>
              <span className="font-medium truncate">{p.title}</span>
            </button>
          ))}
        </div>
      )}

      {/* Date token popup */}
      {showDatePopup && (
        <div className="absolute bottom-full mb-1 left-0 w-56 bg-zinc-900 border-2 border-zinc-700 rounded-[4px] shadow-[3px_3px_0_0_#18181b] overflow-hidden z-50">
          <div className="px-3 py-1.5 text-xs font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-800">
            Date tokens
          </div>
          {filteredDates.map((d, i) => (
            <button
              key={d.value}
              onClick={() => insertDateToken(d.value)}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
                i === popupIndex ? 'bg-yellow-400 text-zinc-900' : 'text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              <span className="font-mono font-bold">{d.label}</span>
              <span className={`text-xs ${i === popupIndex ? 'text-zinc-700' : 'text-zinc-500'}`}>{d.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
