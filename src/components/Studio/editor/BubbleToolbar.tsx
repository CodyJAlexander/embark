import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/react';

interface ToolButtonProps {
  active: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}

function ToolButton({ active, onClick, title, children }: ToolButtonProps) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`px-2 py-1 text-xs font-bold rounded-[2px] transition-colors ${
        active
          ? 'bg-yellow-400 text-zinc-900'
          : 'text-zinc-300 hover:bg-zinc-700 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

interface Position { top: number; left: number }

interface Props {
  editor: Editor | null;
  onAddComment?: (commentId: string) => void;
}

export function BubbleToolbar({ editor, onAddComment }: Props) {
  const [pos, setPos] = useState<Position | null>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  useEffect(() => {
    if (!editor) return;

    const update = () => {
      const { from, to } = editor.state.selection;
      if (from === to || editor.state.selection.empty) {
        setPos(null);
        setShowLinkInput(false);
        return;
      }
      // Don't show for code block selections
      if (editor.isActive('codeBlock')) {
        setPos(null);
        return;
      }
      const startCoords = editor.view.coordsAtPos(from);
      const endCoords = editor.view.coordsAtPos(to);
      const left = (startCoords.left + endCoords.left) / 2;
      const top = Math.min(startCoords.top, endCoords.top) - 48;
      setPos({ top, left });
    };

    const hide = () => { setPos(null); setShowLinkInput(false); };

    editor.on('selectionUpdate', update);
    editor.on('blur', hide);
    return () => {
      editor.off('selectionUpdate', update);
      editor.off('blur', hide);
    };
  }, [editor]);

  if (!editor || !pos) return null;

  const applyLink = () => {
    if (linkUrl.trim()) {
      editor.chain().focus().setLink({ href: linkUrl.trim() }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    setLinkUrl('');
    setShowLinkInput(false);
  };

  return createPortal(
    <div
      style={{ position: 'fixed', top: pos.top, left: pos.left, transform: 'translateX(-50%)', zIndex: 9999 }}
      className="flex items-center gap-0.5 bg-zinc-900 border-2 border-zinc-700 rounded-[4px] shadow-[3px_3px_0_0_#18181b] p-1"
      onMouseDown={(e) => e.preventDefault()}
    >
      {showLinkInput ? (
        <div className="flex items-center gap-1 px-1">
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyLink();
              if (e.key === 'Escape') { setShowLinkInput(false); setLinkUrl(''); }
            }}
            placeholder="https://"
            autoFocus
            className="bg-zinc-800 text-zinc-200 text-xs px-2 py-1 rounded-[2px] border border-zinc-600 focus:outline-none focus:border-blue-500 w-40"
          />
          <button onMouseDown={(e) => { e.preventDefault(); applyLink(); }} className="text-xs text-blue-400 font-bold hover:text-blue-300 px-1">✓</button>
          <button onMouseDown={(e) => { e.preventDefault(); setShowLinkInput(false); setLinkUrl(''); }} className="text-xs text-zinc-500 hover:text-zinc-300 px-1">✕</button>
        </div>
      ) : (
        <>
          <ToolButton active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
            <strong>B</strong>
          </ToolButton>
          <ToolButton active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
            <em>I</em>
          </ToolButton>
          <ToolButton active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline">
            <span className="underline">U</span>
          </ToolButton>
          <ToolButton active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()} title="Inline code">
            {'<>'}
          </ToolButton>
          <div className="w-px h-4 bg-zinc-700 mx-0.5" />
          <ToolButton
            active={editor.isActive('link')}
            onClick={() => {
              if (editor.isActive('link')) {
                editor.chain().focus().unsetLink().run();
              } else {
                setLinkUrl(editor.getAttributes('link').href ?? '');
                setShowLinkInput(true);
              }
            }}
            title="Link"
          >
            🔗
          </ToolButton>
          <button
            onClick={() => {
              const commentId = crypto.randomUUID();
              editor.chain().focus().setMark('comment', { commentId }).run();
              onAddComment?.(commentId);
            }}
            className="px-2 py-1 text-xs text-zinc-300 hover:text-yellow-400 hover:bg-zinc-700 rounded transition-colors"
            title="Add comment"
          >
            💬
          </button>
        </>
      )}
    </div>,
    document.body
  );
}
