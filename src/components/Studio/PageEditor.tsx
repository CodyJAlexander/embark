import { useState, useRef, useCallback } from 'react';
import type { JSONContent } from '@tiptap/core';
import type { Editor } from '@tiptap/react';
import type { StudioPage, StudioTemplateCategory } from '../../types';
import { TiptapEditor } from './editor/TiptapEditor';
import { AIPageActions } from './editor/AIPageActions';
import { Modal } from '../UI/Modal';
import { Button } from '../UI/Button';
import { tiptapToPlainText, tiptapToMarkdown } from '../../utils/studioHelpers';

const ICON_OPTIONS = ['📄', '📝', '📋', '🗓️', '💡', '🚀', '⭐', '🔥', '💼', '🎯', '📊', '🤝', '🧠', '🗺️', '✅'];

interface SaveTemplateData {
  name: string;
  description: string;
  category: StudioTemplateCategory;
}

interface Props {
  page: StudioPage;
  pages: StudioPage[];
  onNavigate: (page: StudioPage) => void;
  onUpdateContent: (pageId: string, content: JSONContent) => void;
  onUpdatePage: (id: string, data: Partial<StudioPage>) => void;
  onDeletePage: (id: string) => void;
  onTogglePin: (id: string) => void;
  onMovePage: (id: string, parentId: string | null) => void;
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

function buildPath(page: StudioPage, pages: StudioPage[]): StudioPage[] {
  const path: StudioPage[] = [];
  let current: StudioPage | undefined = page;
  while (current) {
    path.unshift(current);
    current = current.parentId ? pages.find((p) => p.id === current!.parentId) : undefined;
  }
  return path;
}

export function PageEditor({
  page, pages, onNavigate, onUpdateContent, onUpdatePage, onDeletePage, onTogglePin, onSaveAsTemplate,
}: Props) {
  const [title, setTitle] = useState(page.title);
  const [icon, setIcon] = useState(page.icon);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [templateName, setTemplateName] = useState(page.title);
  const [templateDesc, setTemplateDesc] = useState('');
  const [templateCategory, setTemplateCategory] = useState<StudioTemplateCategory>('custom');
  const [saved, setSaved] = useState(false);
  // Compute initial word count
  const [wordCount, setWordCount] = useState(() => {
    const text = tiptapToPlainText(page.content);
    return text.split(/\s+/).filter(Boolean).length;
  });
  const saveIndicatorRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<Editor | null>(null);

  const breadcrumb = buildPath(page, pages);

  const handleContentChange = useCallback((content: JSONContent) => {
    onUpdateContent(page.id, content);
    if (saveIndicatorRef.current) clearTimeout(saveIndicatorRef.current);
    setSaved(false);
    saveIndicatorRef.current = setTimeout(() => setSaved(true), 600);
    // Update word count
    const text = tiptapToPlainText(content);
    setWordCount(text.split(/\s+/).filter(Boolean).length);
  }, [page.id, onUpdateContent]);

  const handleTitleBlur = useCallback(() => {
    onUpdatePage(page.id, { title });
  }, [page.id, title, onUpdatePage]);

  const handleIconSelect = useCallback((emoji: string) => {
    setIcon(emoji);
    setShowIconPicker(false);
    onUpdatePage(page.id, { icon: emoji });
  }, [page.id, onUpdatePage]);

  const handleSaveTemplate = useCallback(() => {
    const currentContent = editorRef.current?.getJSON() ?? page.content;
    onSaveAsTemplate({ ...page, title, icon, content: currentContent }, {
      name: templateName,
      description: templateDesc,
      category: templateCategory,
    });
    setShowSaveModal(false);
    setShowMenu(false);
  }, [page, title, icon, templateName, templateDesc, templateCategory, onSaveAsTemplate]);

  const handleInsertContent = useCallback((text: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.commands.insertContentAt(editor.state.doc.content.size, '\n' + text);
  }, []);

  const handleExportMarkdown = useCallback(() => {
    const currentContent = editorRef.current?.getJSON() ?? page.content;
    const md = tiptapToMarkdown(currentContent);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'untitled'}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setShowMenu(false);
  }, [page.content, title]);

  const readingTime = Math.max(1, Math.round(wordCount / 200));

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      {/* Breadcrumb + Toolbar */}
      <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-zinc-700 flex-shrink-0">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm text-zinc-500 flex-1 min-w-0 overflow-hidden">
          {breadcrumb.map((p, i) => (
            <span key={p.id} className="flex items-center gap-1 min-w-0">
              {i > 0 && <span className="text-zinc-700 flex-shrink-0">/</span>}
              <button
                onClick={() => onNavigate(p)}
                className={`hover:text-zinc-300 transition-colors truncate flex-shrink-0 ${
                  i === breadcrumb.length - 1 ? 'text-zinc-300 font-medium pointer-events-none' : ''
                }`}
              >
                {p.icon} {p.title || 'Untitled'}
              </button>
            </span>
          ))}
        </div>

        {saved && <span className="text-xs text-zinc-500 font-medium flex-shrink-0">Saved</span>}

        {/* Menu */}
        <div className="relative flex-shrink-0">
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
                onClick={() => { onTogglePin(page.id); setShowMenu(false); }}
                className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors flex items-center gap-2"
              >
                <span>{page.isPinned ? '📌' : '📍'}</span>
                {page.isPinned ? 'Unpin' : 'Pin'} Page
              </button>
              <button
                onClick={() => { setShowSaveModal(true); setShowMenu(false); }}
                className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors flex items-center gap-2"
              >
                <span>📁</span> Save as Template
              </button>
              <button
                onClick={handleExportMarkdown}
                className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors flex items-center gap-2"
              >
                <span>⬇️</span> Export as Markdown
              </button>
              <div className="border-t border-zinc-800" />
              <button
                onClick={() => {
                  if (confirm('Delete this page?')) {
                    onDeletePage(page.id);
                    setShowMenu(false);
                  }
                }}
                className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-zinc-800 hover:text-red-300 transition-colors flex items-center gap-2"
              >
                <span>🗑️</span> Delete Page
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Page title + icon */}
      <div className="flex items-start gap-3 mb-4 flex-shrink-0">
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

      {/* AI Page Actions */}
      <div className="flex-shrink-0">
        <AIPageActions content={page.content} onInsertContent={handleInsertContent} />
      </div>

      {/* Tiptap Editor */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl">
          <TiptapEditor
            content={page.content}
            onChange={handleContentChange}
            editorRef={editorRef}
          />
        </div>
      </div>

      {/* Word count footer */}
      <div className="flex-shrink-0 border-t border-zinc-800 px-1 py-1.5 flex items-center gap-3">
        <span className="text-xs text-zinc-600">{wordCount} {wordCount === 1 ? 'word' : 'words'} · {readingTime} min read</span>
      </div>

      {/* Save as Template modal */}
      <Modal isOpen={showSaveModal} onClose={() => setShowSaveModal(false)} title="Save as Template">
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
