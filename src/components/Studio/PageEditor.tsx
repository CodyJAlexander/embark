import { useState, useRef, useCallback, useEffect } from 'react';
import type { JSONContent } from '@tiptap/core';
import type { Editor } from '@tiptap/react';
import type { StudioPage, StudioTemplateCategory } from '../../types';
import { TiptapEditor } from './editor/TiptapEditor';
import { AIPageActions } from './editor/AIPageActions';
import { TableOfContents } from './editor/TableOfContents';
import { Modal } from '../UI/Modal';
import { Button } from '../UI/Button';
import { tiptapToPlainText, tiptapToMarkdown } from '../../utils/studioHelpers';

const ICON_OPTIONS = ['📄', '📝', '📋', '🗓️', '💡', '🚀', '⭐', '🔥', '💼', '🎯', '📊', '🤝', '🧠', '🗺️', '✅'];

const COVER_GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
];

const GRADIENT_NAMES = ['Purple', 'Pink-Red', 'Blue-Cyan', 'Green-Teal', 'Salmon-Yellow', 'Lavender'];

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
  zenMode: boolean;
  onToggleZen: () => void;
  onOpenShortcuts: () => void;
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
  zenMode, onToggleZen, onOpenShortcuts,
}: Props) {
  const [title, setTitle] = useState(page.title);
  const [icon, setIcon] = useState(page.icon);
  const [coverUrl, setCoverUrl] = useState<string | undefined>(page.coverUrl);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
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
  const [showToc, setShowToc] = useState(false);
  const saveIndicatorRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const editorScrollRef = useRef<HTMLDivElement>(null);
  const coverPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showCoverPicker) return;
    function handler(e: MouseEvent) {
      if (coverPickerRef.current && !coverPickerRef.current.contains(e.target as Node)) {
        setShowCoverPicker(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showCoverPicker]);

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

  const handlePickGradient = useCallback((g: string) => {
    onUpdatePage(page.id, { coverUrl: g });
    setCoverUrl(g);
    setShowCoverPicker(false);
  }, [page.id, onUpdatePage]);

  const gradientPickerJSX = (positionClass: string, onPick: (g: string) => void) => (
    <div ref={coverPickerRef} className={`absolute z-30 bg-zinc-900 border-2 border-zinc-700 rounded-[4px] p-2 shadow-[3px_3px_0_0_#18181b] flex gap-2 ${positionClass}`}>
      {COVER_GRADIENTS.map((g, i) => (
        <button
          key={g}
          title={GRADIENT_NAMES[i]}
          aria-label={GRADIENT_NAMES[i]}
          onClick={() => onPick(g)}
          className="w-10 h-10 rounded-[4px] border-2 border-zinc-700 hover:border-yellow-400 transition-colors"
          style={{ background: g }}
        />
      ))}
    </div>
  );

  const readingTime = Math.max(1, Math.round(wordCount / 200));

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Cover banner */}
      {coverUrl ? (
        <div
          className="relative w-full h-36 flex-shrink-0 group/cover"
          style={{ background: coverUrl }}
        >
          <div className="absolute bottom-2 right-3 hidden group-hover/cover:flex gap-2">
            <div className="relative">
              <button
                onClick={() => setShowCoverPicker((v) => !v)}
                className="px-2 py-1 text-xs font-bold bg-black/50 text-white rounded-[4px] hover:bg-black/70"
              >
                Change cover
              </button>
              {showCoverPicker && gradientPickerJSX('bottom-full mb-1 right-0', handlePickGradient)}
            </div>
            <button
              onClick={() => { onUpdatePage(page.id, { coverUrl: undefined }); setCoverUrl(undefined); }}
              className="px-2 py-1 text-xs font-bold bg-black/50 text-white rounded-[4px] hover:bg-black/70"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div className="group/addcover relative flex-shrink-0 h-8">
          <button
            onClick={() => setShowCoverPicker((v) => !v)}
            className="absolute left-6 top-1 opacity-0 group-hover/addcover:opacity-100 transition-opacity text-xs text-zinc-500 hover:text-zinc-300"
          >
            + Add cover
          </button>
          {showCoverPicker && gradientPickerJSX('top-full mt-1 left-0', handlePickGradient)}
        </div>
      )}

      <div className="flex flex-col p-6 flex-1 overflow-hidden">
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

        {/* Table of contents toggle */}
        <button
          onClick={() => setShowToc((v) => !v)}
          className={`p-1.5 rounded-[4px] transition-colors ${
            showToc
              ? 'bg-yellow-400/10 text-yellow-400 hover:bg-yellow-400/20'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
          title="Table of contents"
          aria-label="Toggle table of contents"
          aria-pressed={showToc}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h10M4 14h16M4 18h10" />
          </svg>
        </button>

        {/* Keyboard shortcuts */}
        <button
          onClick={onOpenShortcuts}
          className="p-1.5 rounded-[4px] text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          title="Keyboard shortcuts (?)"
          aria-label="Show keyboard shortcuts"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm-6 0c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm12 7H6a2 2 0 01-2-2V8a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2z" />
          </svg>
        </button>

        {/* Focus / Zen toggle */}
        <button
          onClick={onToggleZen}
          className="p-1.5 rounded-[4px] text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors flex-shrink-0"
          title={zenMode ? 'Exit focus mode (Esc)' : 'Focus mode (Ctrl+\\)'}
          aria-label={zenMode ? 'Exit focus mode' : 'Enter focus mode'}
        >
          {zenMode ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          )}
        </button>

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
      {!zenMode && (
        <div className="flex-shrink-0">
          <AIPageActions content={page.content} onInsertContent={handleInsertContent} />
        </div>
      )}

      {/* Tiptap Editor */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        <div className="flex-1 overflow-y-auto" ref={editorScrollRef}>
          <div className="max-w-3xl">
            <TiptapEditor
              content={page.content}
              onChange={handleContentChange}
              editorRef={editorRef}
            />
          </div>
        </div>
        {showToc && (
          <TableOfContents content={page.content} editorScrollRef={editorScrollRef} />
        )}
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
    </div>
  );
}
