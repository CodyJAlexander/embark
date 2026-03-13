import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { StudioPage } from '../../types';
import { tiptapToPlainText } from '../../utils/studioHelpers';

interface Props {
  pages: StudioPage[];
  onSelect: (page: StudioPage) => void;
  onClose: () => void;
}

function buildBreadcrumb(page: StudioPage, pages: StudioPage[]): string {
  const parts: string[] = [];
  let current: StudioPage | undefined = pages.find(p => p.id === page.parentId);
  while (current) {
    parts.unshift(current.title || 'Untitled');
    current = current.parentId ? pages.find(p => p.id === current!.parentId) : undefined;
  }
  return parts.join(' / ');
}

export function StudioSearch({ pages, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredPages = useCallback((): StudioPage[] => {
    if (!query.trim()) {
      return [...pages]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 10);
    }
    const lower = query.toLowerCase();
    return pages
      .filter(page => {
        const titleMatch = (page.title || 'Untitled').toLowerCase().includes(lower);
        const contentMatch = tiptapToPlainText(page.content).toLowerCase().includes(lower);
        return titleMatch || contentMatch;
      })
      .slice(0, 10);
  }, [pages, query]);

  const results = filteredPages();

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, results.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const page = results[selectedIndex];
        if (page) {
          onSelect(page);
          onClose();
        }
        return;
      }
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [results, selectedIndex, onSelect, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const item = listRef.current.children[selectedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const modal = (
    <div
      className="fixed inset-0 bg-black/50 z-[9990] flex items-start justify-center pt-24"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-zinc-900 border-2 border-zinc-700 rounded-[4px] shadow-[4px_4px_0_0_#18181b] w-full max-w-lg">
        {/* Search input */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search pages..."
          className="w-full px-4 py-3 bg-transparent border-b-2 border-zinc-700 text-zinc-100 text-sm outline-none placeholder-zinc-500"
        />

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto">
          {results.length === 0 && query.trim() ? (
            <div className="px-4 py-6 text-center text-sm text-zinc-500">
              No pages found
            </div>
          ) : (
            results.map((page, index) => {
              const breadcrumb = buildBreadcrumb(page, pages);
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={page.id}
                  className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-zinc-800 border-l-2 border-yellow-400'
                      : 'border-l-2 border-transparent'
                  }`}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => {
                    onSelect(page);
                    onClose();
                  }}
                >
                  <span className="text-base flex-shrink-0">{page.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-zinc-200 truncate">
                      {page.title || 'Untitled'}
                    </div>
                    {breadcrumb && (
                      <div className="text-xs text-zinc-500 truncate">{breadcrumb}</div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-zinc-800 text-xs text-zinc-600 flex gap-4">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
