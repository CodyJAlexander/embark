import { Modal } from '../UI/Modal';

interface ShortcutEntry {
  keys: string;
  label: string;
}

const SHORTCUTS: ShortcutEntry[] = [
  // Navigation
  { keys: 'Ctrl+K', label: 'Quick Find' },
  { keys: 'Ctrl+\\', label: 'Focus / Zen mode' },
  { keys: '?', label: 'Show shortcuts' },
  // Editor formatting
  { keys: 'Ctrl+B', label: 'Bold' },
  { keys: 'Ctrl+I', label: 'Italic' },
  { keys: 'Ctrl+U', label: 'Underline' },
  { keys: 'Ctrl+E', label: 'Inline code' },
  { keys: 'Ctrl+K (selection)', label: 'Add link' },
  // Slash commands
  { keys: '/', label: 'Open slash menu' },
  { keys: '/h1', label: 'Heading 1' },
  { keys: '/h2', label: 'Heading 2' },
  { keys: '/h3', label: 'Heading 3' },
  { keys: '/bullet', label: 'Bullet list' },
  { keys: '/numbered', label: 'Numbered list' },
  { keys: '/todo', label: 'To-do list' },
  { keys: '/code', label: 'Code block' },
  { keys: '/table', label: 'Table' },
  { keys: '/toggle', label: 'Toggle block' },
  { keys: '/callout', label: 'Callout block' },
  // Page actions
  { keys: 'Ctrl+S (auto)', label: 'Auto-saved on edit' },
  { keys: 'Escape', label: 'Exit Zen mode' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutsModal({ isOpen, onClose }: Props) {
  const mid = Math.ceil(SHORTCUTS.length / 2);
  const left = SHORTCUTS.slice(0, mid);
  const right = SHORTCUTS.slice(mid);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts" size="lg">
      <div className="flex gap-6 w-full">
        <ShortcutList entries={left} />
        <div className="w-px bg-zinc-800 flex-shrink-0" />
        <ShortcutList entries={right} />
      </div>
    </Modal>
  );
}

function ShortcutList({ entries }: { entries: ShortcutEntry[] }) {
  return (
    <div className="flex-1 space-y-1">
      {entries.map(({ keys, label }) => (
        <div key={keys} className="flex items-center justify-between gap-4">
          <span className="text-xs text-zinc-400">{label}</span>
          <kbd className="text-xs font-mono bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-zinc-300 whitespace-nowrap flex-shrink-0">
            {keys}
          </kbd>
        </div>
      ))}
    </div>
  );
}
