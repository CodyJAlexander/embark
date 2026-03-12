import { useCallback, useRef } from 'react';
import type { StudioPage, StudioBlock } from '../types';
import { useLocalStorage } from './useLocalStorage';
import { generateId } from '../utils/helpers';

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
      blocks: [{ id: generateId(), type: 'paragraph', content: '' }],
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
    setPages((prev) => prev.filter((p) => p.id !== id));
  }, [setPages]);

  const togglePin = useCallback((id: string) => {
    setPages((prev) =>
      prev.map((p) => p.id === id ? { ...p, isPinned: !p.isPinned, updatedAt: new Date().toISOString() } : p)
    );
  }, [setPages]);

  const updateBlocks = useCallback((pageId: string, blocks: StudioBlock[]) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPages((prev) =>
        prev.map((p) => p.id === pageId ? { ...p, blocks, updatedAt: new Date().toISOString() } : p)
      );
    }, 500);
  }, [setPages]);

  return { pages, addPage, createPage, updatePage, deletePage, togglePin, updateBlocks };
}
