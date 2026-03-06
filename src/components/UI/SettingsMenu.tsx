import { useState } from 'react';
import { useTheme, colorThemes, type ColorTheme } from '../../context/ThemeContext';
import { Modal } from './Modal';
import { AISettingsPanel } from '../AI/AISettingsPanel';
import { NotificationPreferences } from '../Notifications/NotificationPreferences';
import { BrandingSettings } from '../Settings/BrandingSettings';
import { KeepWatchLogo } from './KeepWatchLogo';

type SettingsTab = 'appearance' | 'ai' | 'notifications' | 'branding';

export function SettingsMenu() {
  const { mode, colorTheme, setMode, setColorTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-white/50 dark:hover:bg-white/10 rounded-lg transition-colors"
        title="Settings"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Settings">
        {/* Tabs */}
        <div className="flex mb-6 border-2 border-zinc-900 dark:border-white shadow-[4px_4px_0_0_#18181b] dark:shadow-[4px_4px_0_0_rgba(255,255,255,0.15)] rounded-[4px] bg-white dark:bg-zinc-900 overflow-hidden">
          {(['appearance', 'ai', 'notifications', 'branding'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-3 py-2 text-sm font-medium transition-colors capitalize ${
                activeTab === tab
                  ? 'bg-yellow-400 text-zinc-900 font-bold border-b-2 border-zinc-900'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'appearance' && (
        <div className="space-y-6">
          {/* Appearance Mode */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Appearance
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setMode('light')}
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-[4px] border-2 transition-all ${
                  mode === 'light'
                    ? 'bg-yellow-400 text-zinc-900 border-zinc-900 shadow-[2px_2px_0_0_#18181b] font-bold'
                    : 'bg-white dark:bg-zinc-800 text-gray-600 dark:text-gray-400 border-zinc-300 dark:border-zinc-600 hover:border-zinc-900 dark:hover:border-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
                Light
              </button>
              <button
                onClick={() => setMode('dark')}
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-[4px] border-2 transition-all ${
                  mode === 'dark'
                    ? 'bg-zinc-900 text-yellow-400 border-zinc-900 shadow-[2px_2px_0_0_#18181b] font-bold'
                    : 'bg-white dark:bg-zinc-800 text-gray-600 dark:text-gray-400 border-zinc-300 dark:border-zinc-600 hover:border-zinc-900 dark:hover:border-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
                Dark
              </button>
            </div>
          </div>

          {/* Color Theme */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Color Theme
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(colorThemes) as [ColorTheme, typeof colorThemes[ColorTheme]][]).map(
                ([key, theme]) => (
                  <button
                    key={key}
                    onClick={() => setColorTheme(key)}
                    className={`relative p-3 rounded-xl transition-all ${
                      colorTheme === key
                        ? 'ring-2 ring-offset-2 ring-gray-900 dark:ring-white dark:ring-offset-gray-800'
                        : 'hover:scale-105'
                    }`}
                  >
                    <div
                      className={`h-8 rounded-lg bg-gradient-to-r ${theme.gradient} mb-2`}
                    />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {theme.name}
                    </span>
                    {colorTheme === key && (
                      <div className="absolute top-1 right-1 w-4 h-4 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center">
                        <svg
                          className="w-3 h-3 text-green-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    )}
                  </button>
                )
              )}
            </div>
          </div>

          {/* About Section */}
          <div className="pt-4 border-t border-white/20 dark:border-white/10">
            <KeepWatchLogo variant="full" className="h-6 w-auto text-gray-900 dark:text-white" />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Client Onboarding Tracker v2.3
            </p>
          </div>
        </div>
        )}

        {activeTab === 'ai' && (
          <AISettingsPanel />
        )}

        {activeTab === 'notifications' && (
          <NotificationPreferences />
        )}

        {activeTab === 'branding' && (
          <BrandingSettings />
        )}
      </Modal>
    </>
  );
}
