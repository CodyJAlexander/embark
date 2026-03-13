import { useState, useCallback, useEffect, useRef } from 'react';
import type { JSONContent } from '@tiptap/core';
import type { StudioPage } from '../types';
import { api } from '../lib/api';

const EMPTY_DOC: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] };

/** Map an API row (snake_case or camelCase from Drizzle) to our StudioPage shape */
function rowToPage(row: Record<string, unknown>): StudioPage {
  return {
    id:        row.id as string,
    title:     (row.title as string) ?? 'Untitled',
    icon:      (row.icon as string) ?? '📄',
    content:   (row.content as JSONContent) ?? EMPTY_DOC,
    parentId:  (row.parentId as string | null) ?? null,
    isPinned:  (row.isPinned as boolean) ?? false,
    sortOrder: row.sortOrder as number | undefined,
    coverUrl:  row.coverUrl as string | undefined,
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string,
  };
}

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
  const [pages, setPages] = useState<StudioPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Clear all pending debounce timers on unmount
  useEffect(() => {
    return () => {
      debounceRef.current.forEach((timer) => clearTimeout(timer));
      debounceRef.current.clear();
    };
  }, []);

  // Load pages from API on mount
  useEffect(() => {
    api.get<Record<string, unknown>[]>('/api/v1/studio/pages').then((res) => {
      if (res.data) {
        setPages(res.data.map(rowToPage));
      } else {
        setError(res.error ?? 'Failed to load pages');
      }
    }).finally(() => setLoading(false));
  }, []);

  const addPage = useCallback((page: StudioPage) => {
    setPages((prev) => [page, ...prev]);
  }, []);

  const createPage = useCallback(async (title = 'Untitled', icon = '📄', parentId?: string | null): Promise<StudioPage> => {
    const body: Record<string, unknown> = { title, icon };
    if (parentId !== undefined) body.parentId = parentId;
    const res = await api.post<Record<string, unknown>>('/api/v1/studio/pages', body);
    if (!res.data) throw new Error(res.error ?? 'Failed to create page');
    const page = rowToPage(res.data);
    setPages((prev) => [page, ...prev]);
    return page;
  }, []);

  const updatePage = useCallback((id: string, data: Partial<StudioPage>) => {
    // Optimistic update
    setPages((prev) =>
      prev.map((p) => p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p)
    );
    api.patch(`/api/v1/studio/pages/${id}`, data).catch(console.error);
  }, []);

  const deletePage = useCallback((id: string) => {
    setPages((prev) => {
      const toDelete = new Set([id, ...collectDescendantIds(id, prev)]);
      return prev.filter((p) => !toDelete.has(p.id));
    });
    api.delete(`/api/v1/studio/pages/${id}`).catch(console.error);
  }, []);

  const togglePin = useCallback((id: string) => {
    setPages((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const nowPinned = !p.isPinned;
        const updated = { ...p, isPinned: nowPinned, sortOrder: nowPinned ? undefined : p.sortOrder, updatedAt: new Date().toISOString() };
        api.patch(`/api/v1/studio/pages/${id}`, { isPinned: nowPinned }).catch(console.error);
        return updated;
      })
    );
  }, []);

  const updateContent = useCallback((pageId: string, content: JSONContent) => {
    // Optimistic update immediately
    setPages((prev) =>
      prev.map((p) => p.id === pageId ? { ...p, content, updatedAt: new Date().toISOString() } : p)
    );
    // Debounced API sync (500ms)
    const existing = debounceRef.current.get(pageId);
    if (existing) clearTimeout(existing);
    debounceRef.current.set(pageId, setTimeout(() => {
      api.patch(`/api/v1/studio/pages/${pageId}`, { content }).catch(console.error);
      debounceRef.current.delete(pageId);
    }, 500));
  }, []);

  const movePage = useCallback((id: string, newParentId: string | null) => {
    setPages((prev) =>
      prev.map((p) => p.id === id ? { ...p, parentId: newParentId, updatedAt: new Date().toISOString() } : p)
    );
    api.patch(`/api/v1/studio/pages/${id}`, { parentId: newParentId }).catch(console.error);
  }, []);

  const saveSnapshot = useCallback(async (pageId: string, ydoc: import('yjs').Doc): Promise<void> => {
    const { encodeStateAsUpdate } = await import('yjs');
    const update = encodeStateAsUpdate(ydoc);
    // Convert Uint8Array to base64
    const snapshot = btoa(String.fromCharCode(...update));
    await api.post(`/api/v1/studio/pages/${pageId}/history`, { snapshot });
  }, []);

  const reorderPages = useCallback((orderedIds: string[]) => {
    setPages((prev) => {
      const orderMap = new Map(orderedIds.map((id, i) => [id, i]));
      const updated = prev.map((p) =>
        orderMap.has(p.id)
          ? { ...p, sortOrder: orderMap.get(p.id)!, updatedAt: new Date().toISOString() }
          : p
      );
      // Batch update sortOrders
      orderedIds.forEach((id, i) => {
        api.patch(`/api/v1/studio/pages/${id}`, { sortOrder: i }).catch(console.error);
      });
      return updated;
    });
  }, []);

  return { pages, loading, error, addPage, createPage, updatePage, deletePage, togglePin, updateContent, movePage, reorderPages, saveSnapshot };
}
