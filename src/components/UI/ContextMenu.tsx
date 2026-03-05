import { createPortal } from 'react-dom';

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  dividerBefore?: boolean;
}

interface ContextMenuProps {
  position: { x: number; y: number };
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ position, items, onClose }: ContextMenuProps) {
  return createPortal(
    <div
      className="fixed z-[9999] min-w-[180px] bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-white shadow-[4px_4px_0_0_#18181b] dark:shadow-[4px_4px_0_0_#ffffff] rounded-[4px] py-1 text-sm"
      style={{ left: position.x, top: position.y }}
      onClick={e => e.stopPropagation()}
    >
      {items.map((item, i) => (
        <div key={i}>
          {item.dividerBefore && (
            <div className="my-1 border-t border-zinc-200 dark:border-zinc-700" />
          )}
          <button
            onClick={() => { item.onClick(); onClose(); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
              item.danger
                ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30'
                : 'text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            {item.icon && <span className="w-4 h-4 flex-shrink-0">{item.icon}</span>}
            {item.label}
          </button>
        </div>
      ))}
    </div>,
    document.body
  );
}
