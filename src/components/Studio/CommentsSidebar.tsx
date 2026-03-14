import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';

interface StudioComment {
  id: string;
  pageId: string;
  userId: string | null;
  commentId: string;
  body: string;
  resolvedAt: string | null;
  parentId: string | null;
  createdAt: string;
}

interface Props {
  pageId: string;
  onClose: () => void;
  // Called when a comment is clicked so editor can highlight the mark
  onFocusComment?: (commentId: string) => void;
  onRemoveCommentMark?: (commentId: string) => void;
  pendingCommentId?: string | null;
  onCommentSubmitted?: () => void;
}

export function CommentsSidebar({ pageId, onClose, onFocusComment, onRemoveCommentMark, pendingCommentId, onCommentSubmitted }: Props) {
  const [comments, setComments] = useState<StudioComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [pendingBody, setPendingBody] = useState('');

  const loadComments = useCallback(() => {
    api.get<StudioComment[]>(`/api/v1/studio/pages/${pageId}/comments`)
      .then((res) => { if (res.data) setComments(res.data); })
      .finally(() => setLoading(false));
  }, [pageId]);

  useEffect(() => { loadComments(); }, [loadComments]);

  // Clear pending input when pendingCommentId changes
  useEffect(() => { setPendingBody(''); }, [pendingCommentId]);

  async function handleSubmitPending() {
    if (!pendingCommentId || !pendingBody.trim()) return;
    const res = await api.post<StudioComment>(`/api/v1/studio/pages/${pageId}/comments`, {
      commentId: pendingCommentId,
      body: pendingBody.trim(),
    });
    if (res.data) {
      setComments((prev) => [...prev, res.data!]);
      setPendingBody('');
      onCommentSubmitted?.();
    }
  }

  async function handleResolve(commentId: string, markCommentId: string) {
    await api.patch(`/api/v1/studio/pages/${pageId}/comments/${commentId}/resolve`, {});
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    onRemoveCommentMark?.(markCommentId);
  }

  async function handleReply(parentId: string) {
    const text = replyText[parentId]?.trim();
    if (!text) return;
    const commentId = comments.find(c => c.id === parentId)?.commentId ?? parentId;
    const res = await api.post<StudioComment>(`/api/v1/studio/pages/${pageId}/comments`, {
      commentId, body: text, parentId,
    });
    if (res.data) {
      setComments((prev) => [...prev, res.data!]);
      setReplyText((prev) => ({ ...prev, [parentId]: '' }));
    }
  }

  // Group: top-level comments (no parentId) + their replies
  const topLevel = comments.filter((c) => !c.parentId);
  const replies = (parentId: string) => comments.filter((c) => c.parentId === parentId);

  return (
    <div className="w-72 flex-shrink-0 border-l-2 border-zinc-700 bg-zinc-900 flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b-2 border-zinc-700 flex-shrink-0">
        <span className="text-xs font-bold text-zinc-300">Comments</span>
        <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-sm" aria-label="Close comments">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {/* Pending new comment form */}
        {pendingCommentId && (
          <div className="rounded-[4px] border border-yellow-400/40 bg-zinc-950 p-2">
            <p className="text-xs text-zinc-400 mb-1">New comment</p>
            <textarea
              value={pendingBody}
              onChange={(e) => setPendingBody(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitPending(); } }}
              placeholder="Add a comment…"
              rows={2}
              autoFocus
              className="w-full px-2 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded-[3px] text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-yellow-400 resize-none"
            />
            <div className="flex gap-1 mt-1 justify-end">
              <button
                onClick={onCommentSubmitted}
                className="px-2 py-1 text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-700 rounded-[3px] hover:border-zinc-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitPending}
                disabled={!pendingBody.trim()}
                className="px-2 py-1 text-xs bg-yellow-400 text-zinc-900 font-bold rounded-[3px] hover:bg-yellow-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        )}

        {loading && <p className="text-xs text-zinc-500 text-center py-4">Loading…</p>}
        {!loading && topLevel.length === 0 && !pendingCommentId && (
          <p className="text-xs text-zinc-500 text-center py-4">No open comments.<br/>Select text and click 💬 to add one.</p>
        )}

        {topLevel.map((c) => (
          <div key={c.id} className="rounded-[4px] border border-zinc-800 bg-zinc-950 p-2">
            {/* Comment body */}
            <div
              className="text-xs text-zinc-300 mb-1 cursor-pointer hover:text-white"
              onClick={() => onFocusComment?.(c.commentId)}
            >
              {c.body}
            </div>
            <div className="text-xs text-zinc-600 mb-2">{new Date(c.createdAt).toLocaleDateString()}</div>

            {/* Replies */}
            {replies(c.id).map((r) => (
              <div key={r.id} className="ml-3 border-l-2 border-zinc-800 pl-2 mb-1">
                <p className="text-xs text-zinc-400">{r.body}</p>
              </div>
            ))}

            {/* Reply input */}
            <div className="flex gap-1 mt-2">
              <input
                type="text"
                value={replyText[c.id] ?? ''}
                onChange={(e) => setReplyText((prev) => ({ ...prev, [c.id]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') handleReply(c.id); }}
                placeholder="Reply…"
                className="flex-1 px-2 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded-[3px] text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-yellow-400"
              />
              <button
                onClick={() => handleResolve(c.id, c.commentId)}
                className="px-2 py-1 text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-700 rounded-[3px] hover:border-zinc-500 transition-colors"
                title="Resolve"
              >
                ✓
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
