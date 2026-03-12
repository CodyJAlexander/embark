import { useRef, useEffect, useCallback } from 'react';
import type { BlockType } from '../../../types';

interface Props {
  blockId: string;
  type: BlockType;
  content: string;
  checked?: boolean;
  placeholder?: string;
  onContentChange: (content: string) => void;
  onCheckedChange?: (checked: boolean) => void;
  onEnter: () => void;
  onBackspaceEmpty: () => void;
  onSlash: (rect: DOMRect) => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  focusOnMount?: boolean;
}

const PLACEHOLDERS: Partial<Record<BlockType, string>> = {
  paragraph: "Type '/' for commands",
  heading1: 'Heading 1',
  heading2: 'Heading 2',
  heading3: 'Heading 3',
  bullet: 'List item',
  numbered: 'List item',
  todo: 'To-do',
  quote: 'Quote',
  callout: 'Callout text',
};

export function BlockEditorInput({
  blockId,
  type,
  content,
  checked,
  placeholder,
  onContentChange,
  onCheckedChange,
  onEnter,
  onBackspaceEmpty,
  onSlash,
  onArrowUp,
  onArrowDown,
  focusOnMount,
}: Props) {
  const editableRef = useRef<HTMLDivElement>(null);
  const isComposing = useRef(false);

  // Sync content to DOM only when it differs (avoid cursor jumping)
  useEffect(() => {
    const el = editableRef.current;
    if (!el) return;
    if (el.innerText !== content) {
      el.innerText = content;
    }
  }, [content]);

  useEffect(() => {
    if (focusOnMount && editableRef.current) {
      editableRef.current.focus();
      // Place cursor at end
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(editableRef.current);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [focusOnMount]);

  const handleInput = useCallback(() => {
    if (isComposing.current) return;
    const el = editableRef.current;
    if (!el) return;
    onContentChange(el.innerText);
  }, [onContentChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const el = editableRef.current;
    if (!el) return;
    const text = el.innerText;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onEnter();
      return;
    }

    if (e.key === 'Backspace' && text === '') {
      e.preventDefault();
      onBackspaceEmpty();
      return;
    }

    if (e.key === '/' && text === '') {
      // Fire slash after a tick so the '/' appears first
      setTimeout(() => {
        const rect = el.getBoundingClientRect();
        onSlash(rect);
      }, 0);
      return;
    }

    if (e.key === 'ArrowUp') {
      const sel = window.getSelection();
      // Only navigate up if cursor is at the very start
      if (sel && sel.anchorOffset === 0) {
        e.preventDefault();
        onArrowUp?.();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      const sel = window.getSelection();
      if (sel && sel.anchorOffset === text.length) {
        e.preventDefault();
        onArrowDown?.();
      }
      return;
    }
  }, [onEnter, onBackspaceEmpty, onSlash, onArrowUp, onArrowDown]);

  if (type === 'divider') {
    return <hr className="border-zinc-700 my-1 pointer-events-none" />;
  }

  if (type === 'code') {
    return (
      <textarea
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        placeholder="// code here"
        rows={Math.max(3, content.split('\n').length)}
        className="w-full bg-zinc-950 border border-zinc-700 rounded-[4px] p-3 text-sm font-mono text-green-400 resize-none focus:outline-none focus:border-zinc-500 block-input"
        spellCheck={false}
      />
    );
  }

  const tagClass = (() => {
    switch (type) {
      case 'heading1': return 'text-2xl font-black text-zinc-100';
      case 'heading2': return 'text-xl font-black text-zinc-100';
      case 'heading3': return 'text-lg font-bold text-zinc-200';
      case 'quote': return 'border-l-4 border-yellow-400 pl-4 italic text-zinc-300';
      case 'callout': return 'bg-zinc-800 rounded-[4px] p-3 text-zinc-200';
      default: return 'text-zinc-300';
    }
  })();

  const ph = placeholder ?? PLACEHOLDERS[type] ?? 'Type something...';

  const inputEl = (
    <div
      id={`block-${blockId}`}
      ref={editableRef}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onCompositionStart={() => { isComposing.current = true; }}
      onCompositionEnd={() => {
        isComposing.current = false;
        handleInput();
      }}
      data-placeholder={ph}
      className={`block-input outline-none w-full min-h-[1.5em] ${tagClass}`}
    />
  );

  if (type === 'todo') {
    return (
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={!!checked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          className="mt-1 accent-yellow-400 shrink-0 cursor-pointer"
        />
        <div className={`flex-1 ${checked ? 'line-through text-zinc-500' : ''}`}>
          {inputEl}
        </div>
      </div>
    );
  }

  if (type === 'bullet') {
    return (
      <div className="flex items-start gap-2">
        <span className="mt-1 text-yellow-400 font-black shrink-0">•</span>
        <div className="flex-1">{inputEl}</div>
      </div>
    );
  }

  if (type === 'numbered') {
    return (
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-zinc-400 text-sm shrink-0 min-w-[1.2em] text-right">–</span>
        <div className="flex-1">{inputEl}</div>
      </div>
    );
  }

  return inputEl;
}
