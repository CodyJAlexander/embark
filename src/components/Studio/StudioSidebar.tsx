import type { StudioPage } from '../../types';
import { useLocalStorage } from '../../hooks/useLocalStorage';

interface PageTreeNodeProps {
  page: StudioPage;
  depth: number;
  pages: StudioPage[];
  activePage: StudioPage | null;
  onSelect: (page: StudioPage) => void;
  onAddChild: (parentId: string) => void;
}

function PageTreeNode({ page, depth, pages, activePage, onSelect, onAddChild }: PageTreeNodeProps) {
  const children = pages.filter((p) => p.parentId === page.id);
  const [expanded, setExpanded] = useLocalStorage(`studio-sidebar-exp-${page.id}`, true);
  const isActive = activePage?.id === page.id;

  return (
    <div>
      <div
        className={`group flex items-center gap-1 rounded-[4px] px-1.5 py-1 cursor-pointer transition-colors ${
          isActive ? 'bg-yellow-400/10 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
        }`}
        style={{ paddingLeft: `${6 + depth * 14}px` }}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className={`w-4 h-4 flex items-center justify-center text-xs flex-shrink-0 transition-colors ${
            children.length === 0 ? 'opacity-0 pointer-events-none' : 'opacity-60 hover:opacity-100'
          }`}
        >
          {expanded ? '▾' : '▸'}
        </button>
        <button
          onClick={() => onSelect(page)}
          className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
        >
          <span className="text-sm flex-shrink-0">{page.icon}</span>
          <span className={`text-sm truncate ${isActive ? 'font-bold text-zinc-100' : 'font-medium'}`}>
            {page.title || 'Untitled'}
          </span>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onAddChild(page.id); }}
          className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-opacity flex-shrink-0"
          title="Add subpage"
        >
          +
        </button>
      </div>
      {expanded && children.map((child) => (
        <PageTreeNode
          key={child.id}
          page={child}
          depth={depth + 1}
          pages={pages}
          activePage={activePage}
          onSelect={onSelect}
          onAddChild={onAddChild}
        />
      ))}
    </div>
  );
}

interface Props {
  pages: StudioPage[];
  activePage: StudioPage | null;
  onSelect: (page: StudioPage) => void;
  onCreatePage: () => void;
  onCreateSubPage: (parentId: string) => void;
  onOpenGallery: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function StudioSidebar({
  pages,
  activePage,
  onSelect,
  onCreatePage,
  onCreateSubPage,
  onOpenGallery,
  collapsed,
  onToggleCollapse,
}: Props) {
  const rootPages = pages.filter((p) => !p.parentId);
  const pinnedPages = rootPages.filter((p) => p.isPinned);
  const unpinnedPages = rootPages.filter((p) => !p.isPinned);

  if (collapsed) {
    return (
      <div className="w-10 flex-shrink-0 border-r-2 border-zinc-700 flex flex-col items-center py-2 gap-2">
        <button
          onClick={onToggleCollapse}
          className="w-7 h-7 flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-colors"
          title="Expand sidebar"
        >
          ▸
        </button>
        <button
          onClick={onCreatePage}
          className="w-7 h-7 flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-colors"
          title="New page"
        >
          +
        </button>
      </div>
    );
  }

  return (
    <div className="w-60 flex-shrink-0 border-r-2 border-zinc-700 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">Pages</span>
        <button
          onClick={onToggleCollapse}
          className="text-zinc-600 hover:text-zinc-400 transition-colors text-xs"
          title="Collapse sidebar"
        >
          ◂
        </button>
      </div>

      {/* Page tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {pages.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-xs text-zinc-600 mb-2">No pages yet</p>
            <button
              onClick={onCreatePage}
              className="text-xs text-yellow-400 hover:text-yellow-300 font-bold"
            >
              + Create your first page
            </button>
          </div>
        ) : (
          <>
            {pinnedPages.length > 0 && (
              <div className="mb-1">
                <div className="px-3 py-0.5">
                  <span className="text-xs font-bold text-zinc-600 uppercase tracking-wider">Pinned</span>
                </div>
                {pinnedPages.map((page) => (
                  <PageTreeNode
                    key={page.id}
                    page={page}
                    depth={0}
                    pages={pages}
                    activePage={activePage}
                    onSelect={onSelect}
                    onAddChild={onCreateSubPage}
                  />
                ))}
              </div>
            )}
            {unpinnedPages.map((page) => (
              <PageTreeNode
                key={page.id}
                page={page}
                depth={0}
                pages={pages}
                activePage={activePage}
                onSelect={onSelect}
                onAddChild={onCreateSubPage}
              />
            ))}
          </>
        )}
      </div>

      {/* Footer actions */}
      <div className="border-t border-zinc-800 p-2 flex flex-col gap-1">
        <button
          onClick={onOpenGallery}
          className="flex items-center gap-2 px-2 py-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-[4px] transition-colors"
        >
          <span>🗂️</span> Templates
        </button>
        <button
          onClick={onCreatePage}
          className="flex items-center gap-2 px-2 py-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-[4px] transition-colors"
        >
          <span>+</span> New Page
        </button>
      </div>
    </div>
  );
}
