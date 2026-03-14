import { useState, useEffect } from 'react';
import { Modal } from '../UI/Modal';
import { Button } from '../UI/Button';
import { api } from '../../lib/api';

interface Props {
  pageId: string;
  initialShareToken: string | null | undefined;
  isOpen: boolean;
  onClose: () => void;
  onShareTokenChange: (token: string | null) => void;
}

export function ShareModal({ pageId, initialShareToken, isOpen, onClose, onShareTokenChange }: Props) {
  const [shareToken, setShareToken] = useState(initialShareToken ?? null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sync if prop changes
  useEffect(() => { setShareToken(initialShareToken ?? null); }, [initialShareToken]);

  const publicUrl = shareToken
    ? `${window.location.origin}/shared/${shareToken}`
    : null;

  async function handleEnable() {
    setLoading(true);
    const res = await api.post<{ shareToken: string }>(`/api/v1/studio/pages/${pageId}/share`, {});
    setLoading(false);
    if (res.data?.shareToken) {
      setShareToken(res.data.shareToken);
      onShareTokenChange(res.data.shareToken);
    }
  }

  async function handleDisable() {
    setLoading(true);
    const res = await api.delete(`/api/v1/studio/pages/${pageId}/share`);
    setLoading(false);
    if (!res.error) {
      setShareToken(null);
      onShareTokenChange(null);
    }
  }

  async function handleCopy() {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share Page">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-zinc-300">Anyone with link can view</p>
            <p className="text-xs text-zinc-500 mt-0.5">Page is read-only for guests — no login required</p>
          </div>
          <button
            onClick={shareToken ? handleDisable : handleEnable}
            disabled={loading}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              shareToken ? 'bg-yellow-400' : 'bg-zinc-600'
            } disabled:opacity-50`}
            role="switch"
            aria-checked={!!shareToken}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              shareToken ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {publicUrl && (
          <div className="flex items-center gap-2 p-2 bg-zinc-800 border border-zinc-700 rounded-[4px]">
            <span className="flex-1 text-xs text-zinc-400 truncate">{publicUrl}</span>
            <button
              onClick={handleCopy}
              className="flex-shrink-0 px-2 py-1 text-xs font-bold text-zinc-300 hover:text-white border border-zinc-600 rounded-[3px] hover:border-zinc-400 transition-colors"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <Button variant="secondary" onClick={onClose}>Done</Button>
        </div>
      </div>
    </Modal>
  );
}
