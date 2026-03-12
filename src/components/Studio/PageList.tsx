import { useState } from 'react';
import type { StudioPage } from '../../types';
import { Button } from '../UI/Button';

interface Props {
  pages: StudioPage[];
  onCreatePage: () => void;
  onOpenPage: (page: StudioPage) => void;
  onDeletePage: (id: string) => void;
  onTogglePin: (id: string) => void;
  onOpenGallery: () => void;
}

export function PageList({ pages, onCreatePage, onOpenPage, onDeletePage, onTogglePin, onOpenGallery }: Props) {
  const [search, setSearch] = useState('');

  const filtered = pages.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );
  const pinned = filtered.filter((p) => p.isPinned);
  const rest = filtered.filter((p) => !p.isPinned);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-zinc-100">Studio</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Your freeform workspace</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenGallery}
            className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-[4px] transition-colors"
          >
            <span>🗂️</span>
            Templates
          </button>
          <Button onClick={onCreatePage} size="sm">
            + New Page
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search pages..."
          className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-[4px] text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-yellow-400"
        />
      </div>

      {pages.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center">
          <div className="text-5xl">📄</div>
          <div>
            <p className="text-zinc-400 font-medium mb-1">No pages yet</p>
            <p className="text-zinc-500 text-sm">Create a blank page or start from a template</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={onCreatePage}>+ New Page</Button>
            <Button variant="secondary" onClick={onOpenGallery}>Browse Templates</Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Pinned */}
          {pinned.length > 0 && (
            <div>
              <p className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">📌 Pinned</p>
              <div className="space-y-1">
                {pinned.map((p) => (
                  <PageRow
                    key={p.id}
                    page={p}
                    onOpen={() => onOpenPage(p)}
                    onDelete={() => onDeletePage(p.id)}
                    onTogglePin={() => onTogglePin(p.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* All pages */}
          {rest.length > 0 && (
            <div>
              {pinned.length > 0 && (
                <p className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">All Pages</p>
              )}
              <div className="space-y-1">
                {rest.map((p) => (
                  <PageRow
                    key={p.id}
                    page={p}
                    onOpen={() => onOpenPage(p)}
                    onDelete={() => onDeletePage(p.id)}
                    onTogglePin={() => onTogglePin(p.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {filtered.length === 0 && search && (
            <p className="text-sm text-zinc-500 text-center py-8">No pages match "{search}"</p>
          )}
        </div>
      )}
    </div>
  );
}

interface PageRowProps {
  page: StudioPage;
  onOpen: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
}

function PageRow({ page, onOpen, onDelete, onTogglePin }: PageRowProps) {
  const blockCount = page.blocks.filter((b) => b.content).length;
  const updatedAt = new Date(page.updatedAt);
  const now = new Date();
  const diffMs = now.getTime() - updatedAt.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const timeLabel = diffMins < 1
    ? 'just now'
    : diffMins < 60
    ? `${diffMins}m ago`
    : diffMins < 1440
    ? `${Math.floor(diffMins / 60)}h ago`
    : updatedAt.toLocaleDateString();

  return (
    <div className="group flex items-center gap-3 px-3 py-3 rounded-[4px] hover:bg-zinc-800 border border-transparent hover:border-zinc-700 transition-all cursor-pointer">
      <span className="text-xl shrink-0" onClick={onOpen}>{page.icon}</span>
      <div className="flex-1 min-w-0" onClick={onOpen}>
        <p className="text-sm font-bold text-zinc-100 truncate">{page.title || 'Untitled'}</p>
        <p className="text-xs text-zinc-500">{blockCount} blocks · {timeLabel}</p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onTogglePin}
          className={`p-1.5 rounded transition-colors ${page.isPinned ? 'text-yellow-400' : 'text-zinc-500 hover:text-zinc-300'}`}
          title={page.isPinned ? 'Unpin' : 'Pin'}
        >
          <svg className="w-3.5 h-3.5" fill={page.isPinned ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); if (confirm('Delete this page?')) onDelete(); }}
          className="p-1.5 rounded text-zinc-500 hover:text-red-400 transition-colors"
          title="Delete"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
