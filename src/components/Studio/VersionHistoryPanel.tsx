import { useState, useEffect } from 'react';
import { api } from '../../lib/api';

interface SnapshotMeta {
  id: string;
  pageId: string;
  userId: string | null;
  createdAt: string;
}

interface Props {
  pageId: string;
  onClose: () => void;
  onRestore: (snapshot: string) => void; // base64 Yjs state
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function VersionHistoryPanel({ pageId, onClose, onRestore }: Props) {
  const [snapshots, setSnapshots] = useState<SnapshotMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    api.get<SnapshotMeta[]>(`/api/v1/studio/pages/${pageId}/history`)
      .then((res) => { if (res.data) setSnapshots(res.data); })
      .finally(() => setLoading(false));
  }, [pageId]);

  async function handleRestore(snapshotId: string) {
    setRestoring(snapshotId);
    const res = await api.get<{ snapshot: string }>(`/api/v1/studio/pages/${pageId}/history/${snapshotId}`);
    setRestoring(null);
    if (res.data?.snapshot) onRestore(res.data.snapshot);
  }

  return (
    <div className="w-64 flex-shrink-0 border-l-2 border-zinc-700 bg-zinc-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b-2 border-zinc-700 flex-shrink-0">
        <span className="text-xs font-bold text-zinc-300">Version History</span>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm"
          aria-label="Close version history"
        >
          ✕
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading && (
          <p className="text-xs text-zinc-500 text-center py-4">Loading…</p>
        )}
        {!loading && snapshots.length === 0 && (
          <p className="text-xs text-zinc-500 text-center py-4">No history yet.<br />Edits are saved on disconnect.</p>
        )}
        {snapshots.map((s) => (
          <div key={s.id} className="group rounded-[4px] border border-zinc-800 hover:border-zinc-600 bg-zinc-950 p-2 transition-colors">
            <p className="text-xs text-zinc-300 font-medium">{formatDate(s.createdAt)}</p>
            <button
              onClick={() => handleRestore(s.id)}
              disabled={restoring === s.id}
              className="mt-1 text-xs text-yellow-400 hover:text-yellow-300 disabled:opacity-50 transition-colors"
            >
              {restoring === s.id ? 'Restoring…' : 'Restore this version'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
