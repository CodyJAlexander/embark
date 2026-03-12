import { useState, useCallback } from 'react';
import type { StudioPage } from '../../types';
import { useStudio } from '../../hooks/useStudio';
import { useStudioTemplates } from '../../hooks/useStudioTemplates';
import { PageList } from './PageList';
import { PageEditor } from './PageEditor';
import { TemplateGallery } from './gallery/TemplateGallery';

type SubView = 'page-list' | 'editor' | 'gallery';

export function StudioView() {
  const { pages, addPage, createPage, updatePage, deletePage, togglePin, updateBlocks } = useStudio();
  const { templates, useTemplate, saveAsTemplate, deleteUserTemplate } = useStudioTemplates();
  const [subView, setSubView] = useState<SubView>('page-list');
  const [activePage, setActivePage] = useState<StudioPage | null>(null);

  const handleCreatePage = useCallback(() => {
    const page = createPage();
    setActivePage(page);
    setSubView('editor');
  }, [createPage]);

  const handleOpenPage = useCallback((page: StudioPage) => {
    setActivePage(page);
    setSubView('editor');
  }, []);

  const handleBack = useCallback(() => {
    setActivePage(null);
    setSubView('page-list');
  }, []);

  const handleUseTemplate = useCallback((templateId: string) => {
    const newPage = useTemplate(templateId);
    addPage(newPage);
    setActivePage(newPage);
    setSubView('editor');
  }, [useTemplate, addPage]);

  // Sync active page from latest pages state (for title/icon updates)
  const currentPage = activePage
    ? (pages.find((p) => p.id === activePage.id) ?? activePage)
    : null;

  return (
    <div className="h-full flex flex-col">
      {/* Global placeholder CSS for contentEditable blocks */}
      <style>{`
        .block-input:empty::before {
          content: attr(data-placeholder);
          color: #52525b;
          pointer-events: none;
        }
      `}</style>

      {subView === 'page-list' && (
        <PageList
          pages={pages}
          onCreatePage={handleCreatePage}
          onOpenPage={handleOpenPage}
          onDeletePage={deletePage}
          onTogglePin={togglePin}
          onOpenGallery={() => setSubView('gallery')}
        />
      )}

      {subView === 'editor' && currentPage && (
        <PageEditor
          page={currentPage}
          onBack={handleBack}
          onUpdateBlocks={updateBlocks}
          onUpdatePage={updatePage}
          onSaveAsTemplate={saveAsTemplate}
        />
      )}

      {subView === 'gallery' && (
        <TemplateGallery
          templates={templates}
          onUse={handleUseTemplate}
          onDelete={deleteUserTemplate}
          onBack={() => setSubView('page-list')}
        />
      )}
    </div>
  );
}
