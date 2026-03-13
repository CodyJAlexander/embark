import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/react';

interface SlashCommand {
  label: string;
  icon: string;
  desc: string;
  action: (editor: Editor) => void;
}

const COMMANDS: SlashCommand[] = [
  {
    label: 'Text',
    icon: '¶',
    desc: 'Plain paragraph',
    action: (e) => {
      const { $from } = e.state.selection;
      e.chain().focus().deleteRange({ from: $from.start(), to: $from.pos }).setParagraph().run();
    },
  },
  {
    label: 'Heading 1',
    icon: 'H1',
    desc: 'Big section heading',
    action: (e) => {
      const { $from } = e.state.selection;
      e.chain().focus().deleteRange({ from: $from.start(), to: $from.pos }).setHeading({ level: 1 }).run();
    },
  },
  {
    label: 'Heading 2',
    icon: 'H2',
    desc: 'Medium section heading',
    action: (e) => {
      const { $from } = e.state.selection;
      e.chain().focus().deleteRange({ from: $from.start(), to: $from.pos }).setHeading({ level: 2 }).run();
    },
  },
  {
    label: 'Heading 3',
    icon: 'H3',
    desc: 'Small section heading',
    action: (e) => {
      const { $from } = e.state.selection;
      e.chain().focus().deleteRange({ from: $from.start(), to: $from.pos }).setHeading({ level: 3 }).run();
    },
  },
  {
    label: 'Bullet List',
    icon: '•',
    desc: 'Unordered list',
    action: (e) => {
      const { $from } = e.state.selection;
      e.chain().focus().deleteRange({ from: $from.start(), to: $from.pos }).toggleBulletList().run();
    },
  },
  {
    label: 'Numbered List',
    icon: '1.',
    desc: 'Ordered list',
    action: (e) => {
      const { $from } = e.state.selection;
      e.chain().focus().deleteRange({ from: $from.start(), to: $from.pos }).toggleOrderedList().run();
    },
  },
  {
    label: 'To-do',
    icon: '☐',
    desc: 'Checkbox task item',
    action: (e) => {
      const { $from } = e.state.selection;
      e.chain().focus().deleteRange({ from: $from.start(), to: $from.pos }).toggleTaskList().run();
    },
  },
  {
    label: 'Quote',
    icon: '"',
    desc: 'Blockquote',
    action: (e) => {
      const { $from } = e.state.selection;
      e.chain().focus().deleteRange({ from: $from.start(), to: $from.pos }).setBlockquote().run();
    },
  },
  {
    label: 'Code Block',
    icon: '</>',
    desc: 'Monospace code block',
    action: (e) => {
      const { $from } = e.state.selection;
      e.chain().focus().deleteRange({ from: $from.start(), to: $from.pos }).setCodeBlock().run();
    },
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
  {
    label: 'Toggle',
    icon: '▶',
    desc: 'Collapsible section',
    action: (e) => {
      const { $from } = e.state.selection;
      e.chain().focus()
        .deleteRange({ from: $from.start(), to: $from.pos })
        .insertContent({ type: 'toggleBlock', attrs: { open: true }, content: [{ type: 'paragraph' }] })
        .run();
    },
  },
];

interface Position { top: number; left: number }

interface Props {
  editor: Editor | null;
}

export function SlashMenu({ editor }: Props) {
  const [pos, setPos] = useState<Position | null>(null);
  const [filterText, setFilterText] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Derive filtered commands from filterText
  const filtered = filterText
    ? COMMANDS.filter((cmd) => cmd.label.toLowerCase().includes(filterText.toLowerCase()))
    : COMMANDS;

  // Keep refs in sync so the keyboard effect can read latest values without re-registering
  const filteredRef = useRef(filtered);
  filteredRef.current = filtered;
  const selectedIndexRef = useRef(selectedIndex);
  selectedIndexRef.current = selectedIndex;

  // Reset selectedIndex when filterText changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filterText]);

  // Scroll selected item into view
  useEffect(() => {
    const el = itemRefs.current[selectedIndex];
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  // Watch editor transactions to show/hide menu and update filterText
  useEffect(() => {
    if (!editor) return;

    const update = () => {
      const { $from } = editor.state.selection;
      const text = $from.parent.textContent;
      if (text.startsWith('/')) {
        const coords = editor.view.coordsAtPos($from.pos);
        setPos({ top: coords.bottom + 6, left: coords.left });
        setFilterText(text.slice(1)); // everything after the leading '/'
      } else {
        setPos(null);
        setFilterText('');
      }
    };

    const onBlur = () => {
      setPos(null);
      setFilterText('');
    };

    editor.on('transaction', update);
    editor.on('blur', onBlur);
    return () => {
      editor.off('transaction', update);
      editor.off('blur', onBlur);
    };
  }, [editor]);

  // Keyboard navigation via document listener when menu is open
  useEffect(() => {
    if (!pos || !editor) return;

    const handler = (e: KeyboardEvent) => {
      const currentFiltered = filteredRef.current;
      const currentIndex = selectedIndexRef.current;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex(currentFiltered.length === 0 ? 0 : (currentIndex + 1) % currentFiltered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex(currentFiltered.length === 0 ? 0 : (currentIndex - 1 + currentFiltered.length) % currentFiltered.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        const cmd = currentFiltered[currentIndex];
        if (cmd) {
          cmd.action(editor);
          setPos(null);
          setFilterText('');
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setPos(null);
        setFilterText('');
      }
    };

    document.addEventListener('keydown', handler, true);
    return () => {
      document.removeEventListener('keydown', handler, true);
    };
  }, [pos, editor]);

  if (!editor || !pos) return null;

  // Trim stale item refs to match current filtered list length
  itemRefs.current.length = filtered.length;

  return createPortal(
    <div
      style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
      className="bg-zinc-900 border-2 border-zinc-700 rounded-[4px] shadow-[4px_4px_0_0_#18181b] w-56 max-h-72 overflow-y-auto"
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="px-3 py-1.5 border-b border-zinc-800">
        <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">Commands</span>
      </div>
      {filtered.length === 0 ? (
        <div className="px-3 py-4 text-sm text-zinc-500 text-center">No results</div>
      ) : (
        filtered.map((cmd, i) => (
          <button
            key={cmd.label}
            ref={(el) => { itemRefs.current[i] = el; }}
            onMouseDown={(e) => {
              e.preventDefault();
              cmd.action(editor);
              setPos(null);
              setFilterText('');
            }}
            onMouseEnter={() => setSelectedIndex(i)}
            className={`w-full text-left flex items-center gap-2.5 px-3 py-2 transition-colors ${
              i === selectedIndex
                ? 'bg-zinc-800 border-l-2 border-yellow-400'
                : 'border-l-2 border-transparent hover:bg-zinc-800'
            }`}
          >
            <span className="w-7 h-7 bg-zinc-800 border border-zinc-700 rounded flex items-center justify-center text-xs font-black text-zinc-300 flex-shrink-0">
              {cmd.icon}
            </span>
            <div className="min-w-0">
              <div className="text-sm font-bold text-zinc-200">{cmd.label}</div>
              <div className="text-xs text-zinc-500 truncate">{cmd.desc}</div>
            </div>
          </button>
        ))
      )}
    </div>,
    document.body
  );
}
