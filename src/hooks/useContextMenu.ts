import { useState, useEffect, useCallback } from 'react';

interface Position {
  x: number;
  y: number;
}

export function useContextMenu() {
  const [position, setPosition] = useState<Position | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);

  const open = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    // Clamp to viewport
    const x = Math.min(e.clientX, window.innerWidth - 200);
    const y = Math.min(e.clientY, window.innerHeight - 250);
    setPosition({ x, y });
    setTargetId(id);
  }, []);

  const close = useCallback(() => {
    setPosition(null);
    setTargetId(null);
  }, []);

  useEffect(() => {
    if (!position) return;
    const handleClick = () => close();
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [position, close]);

  return { position, targetId, open, close, isOpen: position !== null };
}
