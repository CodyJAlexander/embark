import { useState, useRef, useCallback } from 'react';
import type { StudioPage, StudioBlock, StudioTemplateCategory } from '../../types';
import { BlockList } from './blocks/BlockList';
import { Modal } from '../UI/Modal';
import { Button } from '../UI/Button';
import { generateId } from '../../utils/helpers';

const ICON_OPTIONS = ['📄', '📝', '📋', '🗓️', '💡', '🚀', '⭐', '🔥', '💼', '🎯', '📊', '🤝', '🧠', '🗺️', '✅'];

interface SaveTemplateData {
  name: string;
  description: string;
  category: StudioTemplateCategory;
}

interface Props {
  page: StudioPage;
  onBack: () => void;
  onUpdateBlocks: (pageId: string, blocks: StudioBlock[]) => void;
  onUpdatePage: (id: string, data: Partial<StudioPage>) => void;
  onSaveAsTemplate: (page: StudioPage, meta: SaveTemplateData) => void;
}

const CATEGORIES: { value: StudioTemplateCategory; label: string }[] = [
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'planning', label: 'Planning' },
  { value: 'process', label: 'Process' },
  { value: 'reference', label: 'Reference' },
  { value: 'custom', label: 'Custom' },
];

export function PageEditor({ page, onBack, onUpdateBlocks, onUpdatePage, onSaveAsTemplate }: Props) {
  const [localBlocks, setLocalBlocks] = useState<StudioBlock[]>(page.blocks);
  const [title, setTitle] = useState(page.title);
  const [icon, setIcon] = useState(page.icon);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [templateName, setTemplateName] = useState(page.title);
  const [templateDesc, setTemplateDesc] = useState('');
  const [templateCategory, setTemplateCategory] = useState<StudioTemplateCategory>('custom');
  const saveIndicatorRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saved, setSaved] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleBlocksChange = useCallback((blocks: StudioBlock[]) => {
    setLocalBlocks(blocks);
    onUpdateBlocks(page.id, blocks);
    // Brief save indicator
    if (saveIndicatorRef.current) clearTimeout(saveIndicatorRef.current);
    setSaved(false);
    saveIndicatorRef.current = setTimeout(() => setSaved(true), 600);
  }, [page.id, onUpdateBlocks]);

  const handleTitleBlur = useCallback(() => {
    onUpdatePage(page.id, { title });
  }, [page.id, title, onUpdatePage]);

  const handleIconSelect = useCallback((emoji: string) => {
    setIcon(emoji);
    setShowIconPicker(false);
    onUpdatePage(page.id, { icon: emoji });
  }, [page.id, onUpdatePage]);

  const handleSaveTemplate = useCallback(() => {
    onSaveAsTemplate({ ...page, title, icon, blocks: localBlocks }, {
      name: templateName,
      description: templateDesc,
      category: templateCategory,
    });
    setShowSaveModal(false);
    setShowMenu(false);
  }, [page, title, icon, localBlocks, templateName, templateDesc, templateCategory, onSaveAsTemplate]);

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-zinc-700">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Pages
        </button>
        <div className="flex-1" />
        {saved && (
          <span className="text-xs text-zinc-500 font-medium">Saved</span>
        )}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu((v) => !v)}
            className="p-1.5 rounded-[4px] text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="More options"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
            </svg>
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-zinc-900 border-2 border-zinc-700 rounded-[4px] shadow-[3px_3px_0_0_#18181b] z-20">
              <button
                onClick={() => { setShowSaveModal(true); setShowMenu(false); }}
                className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors flex items-center gap-2"
              >
                <span>📁</span> Save as Template
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Page title + icon */}
      <div className="flex items-start gap-3 mb-6">
        <button
          onClick={() => setShowIconPicker((v) => !v)}
          className="text-3xl hover:bg-zinc-800 rounded-[4px] p-1 transition-colors relative"
          title="Change icon"
        >
          {icon}
          {showIconPicker && (
            <div className="absolute left-0 top-full mt-1 z-20 bg-zinc-900 border-2 border-zinc-700 rounded-[4px] p-2 shadow-[3px_3px_0_0_#18181b] flex flex-wrap gap-1 w-52">
              {ICON_OPTIONS.map((em) => (
                <button
                  key={em}
                  onClick={(e) => { e.stopPropagation(); handleIconSelect(em); }}
                  className="w-8 h-8 flex items-center justify-center text-lg hover:bg-zinc-700 rounded transition-colors"
                >
                  {em}
                </button>
              ))}
            </div>
          )}
        </button>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          placeholder="Untitled"
          className="flex-1 text-3xl font-black text-zinc-100 bg-transparent border-none outline-none placeholder-zinc-600"
        />
      </div>

      {/* Block editor */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl">
          <BlockList blocks={localBlocks} onChange={handleBlocksChange} />
          {/* Click below last block to add paragraph */}
          <div
            className="h-24 cursor-text"
            onClick={() => {
              const last = localBlocks[localBlocks.length - 1];
              if (last?.type === 'paragraph' && last.content === '') return;
              const el = document.getElementById(`block-${last?.id}`) as HTMLElement | null;
              if (el) { el.focus(); } else {
                handleBlocksChange([...localBlocks, { id: generateId(), type: 'paragraph', content: '' }]);
              }
            }}
          />
        </div>
      </div>

      {/* Save as Template modal */}
      <Modal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        title="Save as Template"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-zinc-300 mb-1">Template Name</label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-[4px] text-zinc-100 text-sm focus:outline-none focus:border-yellow-400"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-zinc-300 mb-1">Description</label>
            <textarea
              value={templateDesc}
              onChange={(e) => setTemplateDesc(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-[4px] text-zinc-100 text-sm resize-none focus:outline-none focus:border-yellow-400"
              placeholder="Describe what this template is for..."
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-zinc-300 mb-1">Category</label>
            <select
              value={templateCategory}
              onChange={(e) => setTemplateCategory(e.target.value as StudioTemplateCategory)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-[4px] text-zinc-100 text-sm focus:outline-none focus:border-yellow-400"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setShowSaveModal(false)}>Cancel</Button>
            <Button onClick={handleSaveTemplate} disabled={!templateName.trim()}>Save Template</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
