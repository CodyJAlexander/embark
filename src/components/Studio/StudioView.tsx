import { useState, useCallback, useEffect } from 'react';
import type { JSONContent } from '@tiptap/core';
import type { StudioPage } from '../../types';
import { useStudio } from '../../hooks/useStudio';
import { useStudioTemplates } from '../../hooks/useStudioTemplates';
import { api } from '../../lib/api';
import { StudioSidebar } from './StudioSidebar';
import { StudioSearch } from './StudioSearch';
import { PageEditor } from './PageEditor';
import { TemplateGallery } from './gallery/TemplateGallery';
import { ShortcutsModal } from './ShortcutsModal';

type SubView = 'editor' | 'gallery';

export function StudioView() {
  const { pages, loading, error, addPage, createPage, updatePage, deletePage, togglePin, updateContent, movePage, reorderPages } = useStudio();
  const { templates, saveAsTemplate, deleteUserTemplate } = useStudioTemplates();
  const [subView, setSubView] = useState<SubView>('editor');
  const [activePage, setActivePage] = useState<StudioPage | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
        e.preventDefault();
        setZenMode((v) => !v);
      } else if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Only when not typing in an input/textarea/contenteditable
        const tag = (e.target as HTMLElement).tagName;
        const isEditable = (e.target as HTMLElement).isContentEditable;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && !isEditable) {
          e.preventDefault();
          setShowShortcuts(true);
        }
      } else if (e.key === 'Escape') {
        // Only exit zen mode if no modal/dialog is currently open
        if (!document.querySelector('[role="dialog"]')) {
          setZenMode(false);
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleCreatePage = useCallback(async () => {
    const page = await createPage();
    setActivePage(page);
    setSubView('editor');
  }, [createPage]);

  const handleCreateSubPage = useCallback(async (parentId: string) => {
    const page = await createPage('Untitled', '📄', parentId);
    setActivePage(page);
    setSubView('editor');
  }, [createPage]);

  const handleOpenPage = useCallback((page: StudioPage) => {
    setActivePage(page);
    setSubView('editor');
  }, []);

  const handleDeletePage = useCallback((id: string) => {
    deletePage(id);
    if (activePage?.id === id) setActivePage(null);
  }, [deletePage, activePage]);

  const handleUseTemplate = useCallback(async (templateId: string) => {
    const res = await api.post<Record<string, unknown>>(`/api/v1/studio/templates/${templateId}/use`, {});
    if (!res.data) return;
    const page: StudioPage = {
      id:        res.data.id as string,
      title:     (res.data.title as string) ?? 'Untitled',
      icon:      (res.data.icon as string) ?? '📄',
      content:   (res.data.content as JSONContent) ?? { type: 'doc', content: [] },
      parentId:  (res.data.parentId as string | null) ?? null,
      isPinned:  (res.data.isPinned as boolean) ?? false,
      sortOrder: res.data.sortOrder as number | undefined,
      coverUrl:  res.data.coverUrl as string | undefined,
      createdAt: res.data.createdAt as string,
      updatedAt: res.data.updatedAt as string,
    };
    addPage(page);
    setActivePage(page);
    setSubView('editor');
  }, [addPage]);

  // Sync active page with latest state (title/icon updates propagate here)
  const currentPage = activePage
    ? (pages.find((p) => p.id === activePage.id) ?? activePage)
    : null;

  return (
    <div className="h-full flex">
      <StudioSidebar
        pages={pages}
        activePage={currentPage}
        onSelect={handleOpenPage}
        onCreatePage={handleCreatePage}
        onCreateSubPage={handleCreateSubPage}
        onOpenGallery={() => setSubView('gallery')}
        collapsed={zenMode || sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        onUpdatePage={updatePage}
        onDeletePage={handleDeletePage}
        onTogglePin={togglePin}
        onOpenSearch={() => setShowSearch(true)}
        onReorderPages={reorderPages}
      />

      <div className="flex-1 min-w-0 overflow-hidden">
        {subView === 'editor' && currentPage ? (
          <PageEditor
            key={currentPage.id}
            page={currentPage}
            pages={pages}
            onNavigate={handleOpenPage}
            onUpdateContent={updateContent}
            onUpdatePage={updatePage}
            onDeletePage={deletePage}
            onTogglePin={togglePin}
            onMovePage={movePage}
            onSaveAsTemplate={saveAsTemplate}
            zenMode={zenMode}
            onToggleZen={() => setZenMode((v) => !v)}
            onOpenShortcuts={() => setShowShortcuts(true)}
          />
        ) : subView === 'editor' ? (
          <div className="h-full flex items-center justify-center">
            {error ? (
              <p className="text-zinc-500 text-sm">Could not load pages. Please refresh.</p>
            ) : loading ? (
              <div className="text-zinc-400 text-sm">Loading pages…</div>
            ) : (
              <div className="text-center">
                <p className="text-2xl mb-3">📄</p>
                <p className="text-zinc-500 font-medium mb-4">Select or create a page</p>
                <button
                  onClick={handleCreatePage}
                  className="px-4 py-2 bg-yellow-400 text-zinc-900 font-bold text-sm border-2 border-zinc-900 rounded-[4px] shadow-[3px_3px_0_0_#18181b] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform"
                >
                  + New Page
                </button>
              </div>
            )}
          </div>
        ) : null}

        {subView === 'gallery' && (
          <TemplateGallery
            templates={templates}
            onUse={handleUseTemplate}
            onDelete={deleteUserTemplate}
            onBack={() => setSubView('editor')}
          />
        )}
      </div>
      {showSearch && (
        <StudioSearch
          pages={pages}
          onSelect={(page: StudioPage) => { handleOpenPage(page); setShowSearch(false); }}
          onClose={() => setShowSearch(false)}
        />
      )}
      <ShortcutsModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  );
}
