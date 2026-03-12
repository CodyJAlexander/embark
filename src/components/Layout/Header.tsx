import { SettingsMenu } from '../UI/SettingsMenu';
import { ImportExportManager } from '../UI/ImportExportManager';
import { GlobalSearch } from '../UI/GlobalSearch';
import { UndoRedoButtons } from '../UI/UndoRedoButtons';
import { NotificationCenter } from '../Notifications/NotificationCenter';
import { HeaderXPBar } from '../Gamification/HeaderXPBar';
import type { Client } from '../../types';

interface HeaderProps {
  onSelectClient: (client: Client) => void;
  onMenuToggle?: () => void;
  showMenuButton?: boolean;
  onOpenCharacterSheet: () => void;
}

export function Header({ onSelectClient, onMenuToggle, showMenuButton, onOpenCharacterSheet }: HeaderProps) {
  return (
    <header className="bg-yellow-50 dark:bg-zinc-800 sticky top-0 z-20 border-b-2 border-zinc-900 dark:border-white">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-2 relative">
          {/* Left side - Menu button for mobile */}
          <div className="flex items-center gap-3">
            {showMenuButton && (
              <button
                onClick={onMenuToggle}
                className="lg:hidden p-2 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-[4px] border border-transparent hover:border-zinc-900 dark:hover:border-white transition-all"
                aria-label="Toggle menu"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-2">
              <div className="w-8 h-8 rounded-[4px] border-2 border-yellow-400 overflow-hidden flex-shrink-0 mascot-logo-glow">
                <img
                  src="/mascot-clean.jpg"
                  alt="Embark"
                  className="w-[200%] h-[200%] object-cover translate-x-[0%] -translate-y-[18%]"
                />
              </div>
              <span className="font-black text-zinc-900 dark:text-white">Embark</span>
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <UndoRedoButtons />
            </div>
            <GlobalSearch onSelectClient={onSelectClient} />
            <NotificationCenter />
            <div className="hidden sm:block">
              <ImportExportManager />
            </div>
            <HeaderXPBar onOpenCharacterSheet={onOpenCharacterSheet} />
            <SettingsMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
