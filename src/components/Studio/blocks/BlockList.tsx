import { useState, useCallback } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import type { StudioBlock, BlockType } from '../../../types';
import { BlockItem } from './BlockItem';
import { SlashCommandMenu } from './SlashCommandMenu';
import { generateId } from '../../../utils/helpers';

interface Props {
  blocks: StudioBlock[];
  onChange: (blocks: StudioBlock[]) => void;
}

function makeBlock(type: BlockType): StudioBlock {
  return { id: generateId(), type, content: '' };
}

function nextBlockType(type: BlockType): BlockType {
  if (type === 'heading1' || type === 'heading2' || type === 'heading3') return 'paragraph';
  return type;
}

export function BlockList({ blocks, onChange }: Props) {
  const [newBlockId, setNewBlockId] = useState<string | null>(null);
  const [slashState, setSlashState] = useState<{
    blockId: string;
    rect: DOMRect;
    query: string;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    onChange(arrayMove(blocks, oldIndex, newIndex));
  }, [blocks, onChange]);

  const handleContentChange = useCallback((id: string, content: string) => {
    // Track slash query while menu is open
    if (slashState?.blockId === id) {
      setSlashState((prev) => prev ? { ...prev, query: content.slice(1) } : null);
    }
    onChange(blocks.map((b) => b.id === id ? { ...b, content } : b));
  }, [blocks, onChange, slashState]);

  const handleCheckedChange = useCallback((id: string, checked: boolean) => {
    onChange(blocks.map((b) => b.id === id ? { ...b, checked } : b));
  }, [blocks, onChange]);

  const handleTypeChange = useCallback((id: string, type: BlockType) => {
    onChange(blocks.map((b) => b.id === id ? { ...b, type } : b));
  }, [blocks, onChange]);

  const handleEnter = useCallback((id: string) => {
    const idx = blocks.findIndex((b) => b.id === id);
    const current = blocks[idx];
    // If block is empty bullet/numbered/todo → convert to paragraph
    if (current.content === '' && ['bullet', 'numbered', 'todo'].includes(current.type)) {
      const updated = blocks.map((b) => b.id === id ? { ...b, type: 'paragraph' as BlockType } : b);
      onChange(updated);
      return;
    }
    const newBlock = makeBlock(nextBlockType(current.type));
    setNewBlockId(newBlock.id);
    const next = [...blocks];
    next.splice(idx + 1, 0, newBlock);
    onChange(next);
  }, [blocks, onChange]);

  const handleBackspaceEmpty = useCallback((id: string) => {
    if (blocks.length <= 1) return;
    const idx = blocks.findIndex((b) => b.id === id);
    const next = blocks.filter((b) => b.id !== id);
    onChange(next);
    // Focus previous block
    const prevId = blocks[Math.max(0, idx - 1)]?.id;
    if (prevId) {
      setTimeout(() => {
        const el = document.getElementById(`block-${prevId}`) as HTMLElement | null;
        if (el) {
          el.focus();
          const range = document.createRange();
          const sel = window.getSelection();
          range.selectNodeContents(el);
          range.collapse(false);
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      }, 0);
    }
  }, [blocks, onChange]);

  const handleSlash = useCallback((blockId: string, rect: DOMRect) => {
    setSlashState({ blockId, rect, query: '' });
  }, []);

  const handleSlashSelect = useCallback((type: BlockType) => {
    if (!slashState) return;
    onChange(blocks.map((b) =>
      b.id === slashState.blockId ? { ...b, type, content: '' } : b
    ));
    setSlashState(null);
    // Refocus the block
    setTimeout(() => {
      const el = document.getElementById(`block-${slashState.blockId}`) as HTMLElement | null;
      el?.focus();
    }, 0);
  }, [blocks, onChange, slashState]);

  const handleArrowUp = useCallback((id: string) => {
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx <= 0) return;
    const prevId = blocks[idx - 1].id;
    const el = document.getElementById(`block-${prevId}`) as HTMLElement | null;
    el?.focus();
  }, [blocks]);

  const handleArrowDown = useCallback((id: string) => {
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx >= blocks.length - 1) return;
    const nextId = blocks[idx + 1].id;
    const el = document.getElementById(`block-${nextId}`) as HTMLElement | null;
    el?.focus();
  }, [blocks]);

  return (
    <>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-0.5">
            {blocks.map((block) => (
              <BlockItem
                key={block.id}
                block={block}
                isNew={block.id === newBlockId}
                onContentChange={handleContentChange}
                onCheckedChange={handleCheckedChange}
                onTypeChange={handleTypeChange}
                onEnter={handleEnter}
                onBackspaceEmpty={handleBackspaceEmpty}
                onSlash={handleSlash}
                onArrowUp={handleArrowUp}
                onArrowDown={handleArrowDown}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {slashState && (
        <SlashCommandMenu
          query={slashState.query}
          anchorRect={slashState.rect}
          onSelect={handleSlashSelect}
          onClose={() => setSlashState(null)}
        />
      )}
    </>
  );
}
