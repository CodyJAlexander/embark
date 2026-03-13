import { useCallback, useRef } from 'react';
import type { JSONContent } from '@tiptap/core';
import type { StudioPage } from '../types';
import { useLocalStorage } from './useLocalStorage';
import { generateId } from '../utils/helpers';

const EMPTY_DOC: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] };

/**
 * Collects the IDs of all descendants of a given page (BFS traversal).
 * The root ID itself is NOT included — callers should add it separately.
 */
export function collectDescendantIds(id: string, pages: StudioPage[]): string[] {
  const childMap = new Map<string, string[]>();
  for (const p of pages) {
    const key = p.parentId ?? '';
    if (!childMap.has(key)) childMap.set(key, []);
    childMap.get(key)!.push(p.id);
  }

  const result: string[] = [];
  const queue: string[] = [id];
  let head = 0;
  while (head < queue.length) {
    const current = queue[head++];
    for (const childId of childMap.get(current) ?? []) {
      result.push(childId);
      queue.push(childId);
    }
  }
  return result;
}

export function useStudio() {
  const [pages, setPages] = useLocalStorage<StudioPage[]>('studio-pages', []);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addPage = useCallback((page: StudioPage) => {
    setPages((prev) => [page, ...prev]);
  }, [setPages]);

  const createPage = useCallback((title = 'Untitled', icon = '📄'): StudioPage => {
    const now = new Date().toISOString();
    const newPage: StudioPage = {
      id: generateId(),
      title,
      icon,
      content: EMPTY_DOC,
      parentId: null,
      isPinned: false,
      createdAt: now,
      updatedAt: now,
    };
    setPages((prev) => [newPage, ...prev]);
    return newPage;
  }, [setPages]);

  const updatePage = useCallback((id: string, data: Partial<StudioPage>) => {
    setPages((prev) =>
      prev.map((p) => p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p)
    );
  }, [setPages]);

  const deletePage = useCallback((id: string) => {
    setPages((prev) => {
      const toDelete = new Set([id, ...collectDescendantIds(id, prev)]);
      return prev.filter((p) => !toDelete.has(p.id));
    });
  }, [setPages]);

  const togglePin = useCallback((id: string) => {
    setPages((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const nowPinned = !p.isPinned;
        return {
          ...p,
          isPinned: nowPinned,
          sortOrder: nowPinned ? undefined : p.sortOrder,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  }, [setPages]);

  const updateContent = useCallback((pageId: string, content: JSONContent) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPages((prev) =>
        prev.map((p) => p.id === pageId ? { ...p, content, updatedAt: new Date().toISOString() } : p)
      );
    }, 500);
  }, [setPages]);

  const movePage = useCallback((id: string, newParentId: string | null) => {
    setPages((prev) =>
      prev.map((p) => p.id === id ? { ...p, parentId: newParentId, updatedAt: new Date().toISOString() } : p)
    );
  }, [setPages]);

  const reorderPages = useCallback((orderedIds: string[]) => {
    setPages((prev) => {
      const orderMap = new Map(orderedIds.map((id, i) => [id, i]));
      return prev.map((p) =>
        orderMap.has(p.id)
          ? { ...p, sortOrder: orderMap.get(p.id)!, updatedAt: new Date().toISOString() }
          : p
      );
    });
  }, [setPages]);

  return { pages, addPage, createPage, updatePage, deletePage, togglePin, updateContent, movePage, reorderPages };
}
