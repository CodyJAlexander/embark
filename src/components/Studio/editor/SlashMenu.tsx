import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/react';

interface SlashCommand {
  label: string;
  icon: string;
  desc: string;
  action: (editor: Editor) => void;
}

function deleteSlashAndRun(editor: Editor, fn: (e: Editor) => void) {
  const { $from } = editor.state.selection;
  editor.chain().focus().deleteRange({ from: $from.start(), to: $from.pos }).run();
  fn(editor);
}

const COMMANDS: SlashCommand[] = [
  {
    label: 'Text',
    icon: '¶',
    desc: 'Plain paragraph',
    action: (e) => deleteSlashAndRun(e, (ed) => ed.chain().focus().setParagraph().run()),
  },
  {
    label: 'Heading 1',
    icon: 'H1',
    desc: 'Big section heading',
    action: (e) => deleteSlashAndRun(e, (ed) => ed.chain().focus().setHeading({ level: 1 }).run()),
  },
  {
    label: 'Heading 2',
    icon: 'H2',
    desc: 'Medium section heading',
    action: (e) => deleteSlashAndRun(e, (ed) => ed.chain().focus().setHeading({ level: 2 }).run()),
  },
  {
    label: 'Heading 3',
    icon: 'H3',
    desc: 'Small section heading',
    action: (e) => deleteSlashAndRun(e, (ed) => ed.chain().focus().setHeading({ level: 3 }).run()),
  },
  {
    label: 'Bullet List',
    icon: '•',
    desc: 'Unordered list',
    action: (e) => deleteSlashAndRun(e, (ed) => ed.chain().focus().toggleBulletList().run()),
  },
  {
    label: 'Numbered List',
    icon: '1.',
    desc: 'Ordered list',
    action: (e) => deleteSlashAndRun(e, (ed) => ed.chain().focus().toggleOrderedList().run()),
  },
  {
    label: 'To-do',
    icon: '☐',
    desc: 'Checkbox task item',
    action: (e) => deleteSlashAndRun(e, (ed) => ed.chain().focus().toggleTaskList().run()),
  },
  {
    label: 'Quote',
    icon: '"',
    desc: 'Blockquote',
    action: (e) => deleteSlashAndRun(e, (ed) => ed.chain().focus().setBlockquote().run()),
  },
  {
    label: 'Code Block',
    icon: '</>',
    desc: 'Monospace code block',
    action: (e) => deleteSlashAndRun(e, (ed) => ed.chain().focus().setCodeBlock().run()),
  },
  {
    label: 'Divider',
    icon: '—',
    desc: 'Horizontal rule',
    action: (e) => {
      const { $from } = e.state.selection;
      e.chain().focus().deleteRange({ from: $from.start(), to: $from.pos }).setHorizontalRule().run();
    },
  },
];

interface Position { top: number; left: number }

interface Props {
  editor: Editor | null;
}

export function SlashMenu({ editor }: Props) {
  const [pos, setPos] = useState<Position | null>(null);

  useEffect(() => {
    if (!editor) return;

    const update = () => {
      const { $from } = editor.state.selection;
      const text = $from.parent.textContent;
      if (text === '/') {
        const coords = editor.view.coordsAtPos($from.pos);
        setPos({ top: coords.bottom + 6, left: coords.left });
      } else {
        setPos(null);
      }
    };

    editor.on('transaction', update);
    editor.on('blur', () => setPos(null));
    return () => {
      editor.off('transaction', update);
    };
  }, [editor]);

  if (!editor || !pos) return null;

  return createPortal(
    <div
      style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
      className="bg-zinc-900 border-2 border-zinc-700 rounded-[4px] shadow-[4px_4px_0_0_#18181b] w-56 max-h-72 overflow-y-auto"
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="px-3 py-1.5 border-b border-zinc-800">
        <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">Commands</span>
      </div>
      {COMMANDS.map((cmd) => (
        <button
          key={cmd.label}
          onMouseDown={(e) => {
            e.preventDefault();
            cmd.action(editor);
            setPos(null);
          }}
          className="w-full text-left flex items-center gap-2.5 px-3 py-2 hover:bg-zinc-800 transition-colors"
        >
          <span className="w-7 h-7 bg-zinc-800 border border-zinc-700 rounded flex items-center justify-center text-xs font-black text-zinc-300 flex-shrink-0">
            {cmd.icon}
          </span>
          <div className="min-w-0">
            <div className="text-sm font-bold text-zinc-200">{cmd.label}</div>
            <div className="text-xs text-zinc-500 truncate">{cmd.desc}</div>
          </div>
        </button>
      ))}
    </div>,
    document.body
  );
}
