import { useState, type KeyboardEvent } from 'react';
import type { ChecklistItem as ChecklistItemType } from '../../types';
import { useClientContext } from '../../context/ClientContext';
import { detectEmbedType, getEmbedLabel, getEmbedIcon } from '../../utils/embedHelpers';

interface ChecklistItemProps {
  clientId: string;
  item: ChecklistItemType;
}

export function ChecklistItem({ clientId, item }: ChecklistItemProps) {
  const { toggleChecklistItem, updateChecklistItem, removeChecklistItem } = useClientContext();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(item.title);
  const [embedUrl, setEmbedUrl] = useState(item.embed?.url ?? '');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectNote, setRejectNote] = useState('');

  const detectedType = detectEmbedType(embedUrl);

  const handleToggle = () => {
    toggleChecklistItem(clientId, item.id);
  };

  const startEditing = () => {
    setIsEditing(true);
    setEditValue(item.title);
    setEmbedUrl(item.embed?.url ?? '');
  };

  const saveEdit = () => {
    if (editValue.trim()) {
      const embedUpdate = embedUrl.trim() && detectedType
        ? { embed: { type: detectedType, url: embedUrl.trim() } }
        : embedUrl.trim() === ''
          ? { embed: undefined }
          : {};
      updateChecklistItem(clientId, item.id, { title: editValue.trim(), ...embedUpdate });
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(item.title);
      setEmbedUrl(item.embed?.url ?? '');
    }
  };

  const handleApprove = () => {
    updateChecklistItem(clientId, item.id, {
      approvalStatus: 'approved',
      approvedBy: 'CSM',
      approvedAt: new Date().toISOString(),
      completed: true,
      status: 'done',
    });
  };

  const handleRequestChanges = () => {
    if (!rejectNote.trim()) return;
    updateChecklistItem(clientId, item.id, {
      approvalStatus: 'rejected',
      rejectionNote: rejectNote.trim(),
    });
    setShowRejectInput(false);
    setRejectNote('');
  };

  const approvalBadge = () => {
    if (!item.requiresApproval) return null;
    const status = item.approvalStatus ?? 'pending';

    if (status === 'approved') {
      const dateStr = item.approvedAt
        ? new Date(item.approvedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : '';
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          ✓ Approved{item.approvedBy ? ` by ${item.approvedBy}` : ''}{dateStr ? ` · ${dateStr}` : ''}
        </span>
      );
    }

    if (status === 'rejected') {
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          title={item.rejectionNote}
        >
          ✗ Changes Requested{item.rejectionNote ? `: ${item.rejectionNote}` : ''}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
        ⏳ Awaiting Approval
      </span>
    );
  };

  const showApproveButtons =
    item.requiresApproval &&
    item.ownerType === 'client' &&
    (item.approvalStatus === 'pending' || item.approvalStatus === undefined);

  return (
    <li className="group flex flex-col gap-1.5 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
      <div className="flex items-center gap-3">
        <button
          onClick={handleToggle}
          className={`
            flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
            ${
              item.completed
                ? 'relative bg-green-500 border-zinc-900 dark:border-white text-white animate-checkbox-pop animate-checkbox-burst'
                : 'border-zinc-300 dark:border-zinc-500 hover:border-green-500 hover:scale-110 duration-100'
            }
          `}
          aria-label={item.completed ? 'Mark as incomplete' : 'Mark as complete'}
        >
          {item.completed && (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {isEditing ? (
          <input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={saveEdit}
            className="flex-1 bg-white dark:bg-gray-800 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        ) : (
          <span
            onClick={startEditing}
            className={`
              flex-1 cursor-pointer
              ${item.completed ? 'line-through-animated' : 'text-gray-900 dark:text-gray-100'}
            `}
          >
            {item.title}
          </span>
        )}

        <button
          onClick={() => removeChecklistItem(clientId, item.id)}
          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
          aria-label="Delete task"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Embed URL input — shown when editing */}
      {isEditing && (
        <div className="ml-8 flex flex-col gap-1">
          <input
            value={embedUrl}
            onChange={(e) => setEmbedUrl(e.target.value)}
            placeholder="Attach media URL (Loom, YouTube, Calendly, Typeform...)"
            className="w-full text-xs bg-white dark:bg-gray-800 px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-gray-300 placeholder-gray-400"
          />
          {embedUrl.trim() && (
            <span className={`text-xs font-medium ${detectedType ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {detectedType
                ? `${getEmbedIcon(detectedType)} Detected: ${getEmbedLabel(detectedType)} \u2713`
                : 'Could not detect type — will save as generic iframe'}
            </span>
          )}

          {/* Requires Approval toggle */}
          <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 cursor-pointer select-none mt-1">
            <input
              type="checkbox"
              checked={!!item.requiresApproval}
              onChange={(e) =>
                updateChecklistItem(clientId, item.id, {
                  requiresApproval: e.target.checked,
                  approvalStatus: e.target.checked ? (item.approvalStatus ?? 'pending') : undefined,
                })
              }
              className="w-3.5 h-3.5 accent-violet-600"
            />
            Requires Approval
          </label>
        </div>
      )}

      {/* Embed chip — shown in view mode when task has an embed */}
      {!isEditing && item.embed && (
        <div className="ml-8">
          <span
            onClick={startEditing}
            className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 cursor-pointer hover:bg-violet-200 dark:hover:bg-violet-900/60 transition-colors"
            title={item.embed.url}
          >
            {getEmbedIcon(item.embed.type)} {getEmbedLabel(item.embed.type)}
          </span>
        </div>
      )}

      {/* Approval badge and actions — shown in view mode */}
      {!isEditing && item.requiresApproval && (
        <div className="ml-8 flex flex-col gap-2">
          {approvalBadge()}

          {showApproveButtons && (
            <div className="flex flex-col gap-1.5">
              {!showRejectInput ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleApprove}
                    className="px-3 py-1 text-xs font-semibold rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setShowRejectInput(true)}
                    className="px-3 py-1 text-xs font-semibold rounded-lg border border-red-400 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    Request Changes
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <input
                    autoFocus
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    placeholder="Describe what changes are needed..."
                    className="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-red-400"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); handleRequestChanges(); }
                      if (e.key === 'Escape') { setShowRejectInput(false); setRejectNote(''); }
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRequestChanges}
                      disabled={!rejectNote.trim()}
                      className="px-3 py-1 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Send
                    </button>
                    <button
                      onClick={() => { setShowRejectInput(false); setRejectNote(''); }}
                      className="px-3 py-1 text-xs font-semibold rounded-lg text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}
