import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';

interface Client {
  id: string;
  name: string;
}

interface Props {
  items: Client[];
  command: (client: Client) => void;
}

export interface MentionListRef {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

export const MentionList = forwardRef<MentionListRef, Props>(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Reset selection when items change
  useEffect(() => setSelectedIndex(0), [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((i) => (i - 1 + items.length) % items.length);
        return true;
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((i) => (i + 1) % items.length);
        return true;
      }
      if (event.key === 'Enter') {
        const item = items[selectedIndex];
        if (item) command(item);
        return true;
      }
      return false;
    },
  }));

  if (items.length === 0) {
    return (
      <div className="bg-zinc-900 border-2 border-zinc-700 rounded-[4px] p-2 shadow-[3px_3px_0_0_#18181b]">
        <p className="text-xs text-zinc-500">No clients found</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border-2 border-zinc-700 rounded-[4px] shadow-[3px_3px_0_0_#18181b] max-h-48 overflow-y-auto min-w-[160px]">
      {items.map((client, i) => (
        <button
          key={client.id}
          onClick={() => command(client)}
          className={`w-full text-left px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-2 ${
            i === selectedIndex
              ? 'bg-yellow-400/10 text-yellow-400'
              : 'text-zinc-300 hover:bg-zinc-800'
          }`}
        >
          <span className="text-zinc-500 text-xs">@</span>
          {client.name}
        </button>
      ))}
    </div>
  );
});

MentionList.displayName = 'MentionList';
