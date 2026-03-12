import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { StudioBlock, BlockType } from '../../../types';
import { BlockEditorInput } from './BlockEditorInput';

interface Props {
  block: StudioBlock;
  isNew?: boolean;
  onContentChange: (id: string, content: string) => void;
  onCheckedChange: (id: string, checked: boolean) => void;
  onTypeChange: (id: string, type: BlockType) => void;
  onEnter: (id: string) => void;
  onBackspaceEmpty: (id: string) => void;
  onSlash: (id: string, rect: DOMRect) => void;
  onArrowUp: (id: string) => void;
  onArrowDown: (id: string) => void;
}

export function BlockItem({
  block,
  isNew,
  onContentChange,
  onCheckedChange,
  onEnter,
  onBackspaceEmpty,
  onSlash,
  onArrowUp,
  onArrowDown,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative flex items-start gap-1 py-0.5"
    >
      {/* Drag handle — hover only, does NOT interfere with text selection */}
      <button
        {...attributes}
        {...listeners}
        className="flex-shrink-0 w-5 h-6 mt-0.5 flex items-center justify-center text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-zinc-400 transition-opacity cursor-grab active:cursor-grabbing rounded"
        tabIndex={-1}
        aria-label="Drag to reorder"
      >
        <svg className="w-3 h-4" viewBox="0 0 8 16" fill="currentColor">
          <circle cx="2" cy="3" r="1.2" />
          <circle cx="6" cy="3" r="1.2" />
          <circle cx="2" cy="8" r="1.2" />
          <circle cx="6" cy="8" r="1.2" />
          <circle cx="2" cy="13" r="1.2" />
          <circle cx="6" cy="13" r="1.2" />
        </svg>
      </button>

      <div className="flex-1 min-w-0">
        <BlockEditorInput
          blockId={block.id}
          type={block.type}
          content={block.content}
          checked={block.checked}
          onContentChange={(c) => onContentChange(block.id, c)}
          onCheckedChange={(v) => onCheckedChange(block.id, v)}
          onEnter={() => onEnter(block.id)}
          onBackspaceEmpty={() => onBackspaceEmpty(block.id)}
          onSlash={(rect) => onSlash(block.id, rect)}
          onArrowUp={() => onArrowUp(block.id)}
          onArrowDown={() => onArrowDown(block.id)}
          focusOnMount={isNew}
        />
      </div>
    </div>
  );
}
