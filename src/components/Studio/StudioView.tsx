import { useState, useCallback, useEffect } from 'react';
import type { StudioPage } from '../../types';
import { useStudio } from '../../hooks/useStudio';
import { useStudioTemplates } from '../../hooks/useStudioTemplates';
import { StudioSidebar } from './StudioSidebar';
import { StudioSearch } from './StudioSearch';
import { PageEditor } from './PageEditor';
import { TemplateGallery } from './gallery/TemplateGallery';

type SubView = 'editor' | 'gallery';

export function StudioView() {
  const { pages, addPage, createPage, updatePage, deletePage, togglePin, updateContent, movePage } = useStudio();
  const { templates, useTemplate, saveAsTemplate, deleteUserTemplate } = useStudioTemplates();
  const [subView, setSubView] = useState<SubView>('editor');
  const [activePage, setActivePage] = useState<StudioPage | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleCreatePage = useCallback(() => {
    const page = createPage();
    setActivePage(page);
    setSubView('editor');
  }, [createPage]);

  const handleCreateSubPage = useCallback((parentId: string) => {
    const page = createPage('Untitled', '📄');
    updatePage(page.id, { parentId });
    setActivePage({ ...page, parentId });
    setSubView('editor');
  }, [createPage, updatePage]);

  const handleOpenPage = useCallback((page: StudioPage) => {
    setActivePage(page);
    setSubView('editor');
  }, []);

  const handleDeletePage = useCallback((id: string) => {
    deletePage(id);
    if (activePage?.id === id) setActivePage(null);
  }, [deletePage, activePage]);

  const handleUseTemplate = useCallback((templateId: string) => {
    const newPage = useTemplate(templateId);
    addPage(newPage);
    setActivePage(newPage);
    setSubView('editor');
  }, [useTemplate, addPage]);

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
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        onUpdatePage={updatePage}
        onDeletePage={handleDeletePage}
        onTogglePin={togglePin}
        onOpenSearch={() => setShowSearch(true)}
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
          />
        ) : subView === 'editor' ? (
          <div className="h-full flex items-center justify-center">
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
          onSelect={(page) => { handleOpenPage(page); setShowSearch(false); }}
          onClose={() => setShowSearch(false)}
        />
      )}
    </div>
  );
}
