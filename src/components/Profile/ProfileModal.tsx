import { useState, useRef, type ChangeEvent } from 'react';
import { Modal } from '../UI/Modal';
import { useAuth } from '../../context/AuthContext';
import type { CharacterClass } from '../../types';

const CLASS_DATA: { id: CharacterClass; icon: string; name: string; tagline: string }[] = [
  { id: 'paladin', icon: '⚔️', name: 'Paladin', tagline: 'The Protector' },
  { id: 'wizard', icon: '🧙', name: 'Wizard', tagline: 'The Strategist' },
  { id: 'ranger', icon: '🏹', name: 'Ranger', tagline: 'The Scout' },
  { id: 'rogue', icon: '🗡️', name: 'Rogue', tagline: 'The Executor' },
];

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { currentUser, updateUser } = useAuth();

  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(currentUser?.avatarUrl);
  const [displayName, setDisplayName] = useState(currentUser?.username ?? '');
  const [phone, setPhone] = useState(currentUser?.phone ?? '');
  const fileRef = useRef<HTMLInputElement>(null);

  if (!currentUser) return null;

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    updateUser({ avatarUrl, username: displayName || currentUser.username, phone: phone || undefined });
    onClose();
  };

  const initials = displayName
    .split(' ')
    .map(p => p[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2) || currentUser.username[0].toUpperCase();

  const memberSince = new Date(currentUser.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const classInfo = currentUser.characterClass
    ? CLASS_DATA.find(c => c.id === currentUser.characterClass)
    : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Profile" size="md">
      <div className="space-y-5">
        {/* Avatar */}
        <div className="flex justify-center">
          <button
            onClick={() => fileRef.current?.click()}
            className="relative w-20 h-20 rounded-full border-4 border-yellow-400 shadow-[3px_3px_0_0_#18181b] overflow-hidden hover:opacity-90 transition-opacity group"
            title="Click to upload photo"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-violet-600 to-yellow-500 flex items-center justify-center text-white text-2xl font-black">
                {initials}
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-white text-xs font-bold">📷</span>
            </div>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>

        {/* Editable fields */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full bg-zinc-100 dark:bg-zinc-700 border-2 border-zinc-300 dark:border-zinc-600 rounded-[4px] px-3 py-2 text-zinc-900 dark:text-white text-sm focus:outline-none focus:border-yellow-400 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Optional"
              className="w-full bg-zinc-100 dark:bg-zinc-700 border-2 border-zinc-300 dark:border-zinc-600 rounded-[4px] px-3 py-2 text-zinc-900 dark:text-white text-sm focus:outline-none focus:border-yellow-400 transition-colors placeholder-zinc-400"
            />
          </div>
        </div>

        {/* Read-only info */}
        <div className="border-t-2 border-zinc-200 dark:border-zinc-700 pt-4 space-y-2">
          <InfoRow label="Username" value={currentUser.username} />
          <InfoRow label="Email" value={currentUser.email} />
          <InfoRow
            label="Class"
            value={
              classInfo
                ? `${classInfo.icon} ${classInfo.name} — ${classInfo.tagline}`
                : 'None — complete onboarding wizard'
            }
          />
          <InfoRow label="Member since" value={memberSince} />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-zinc-600 dark:text-zinc-300 border-2 border-zinc-300 dark:border-zinc-600 rounded-[4px] hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-black text-zinc-900 bg-yellow-400 border-2 border-zinc-900 rounded-[4px] shadow-[2px_2px_0_0_#18181b] hover:shadow-[1px_1px_0_0_#18181b] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="w-24 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-zinc-700 dark:text-zinc-300 break-all">{value}</span>
    </div>
  );
}
