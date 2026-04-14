import { useState, useMemo, useRef, useEffect, type ReactNode } from 'react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useClientContext } from '../../context/ClientContext';
import { useSavedViews } from '../../hooks/useSavedViews';
import { RecentActivityFeed } from '../UI/RecentActivityFeed';
import { Changelog } from '../UI/Changelog';
import { HowToModal } from '../Help/HowToModal';
import { useAuth } from '../../context/AuthContext';
import { ProfileModal } from '../Profile/ProfileModal';
import type { View, Client } from '../../types';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  onSelectClient: (client: Client) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavItem {
  view: View;
  label: string;
  icon: ReactNode;
  sectionLabel?: string;
}

const navItems: NavItem[] = [
  {
    view: 'dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    view: 'focus',
    label: 'Focus',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
  },
  {
    view: 'clients',
    label: 'Clients',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    view: 'onboarding-clients',
    label: 'Onboarding',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    view: 'tasks',
    label: 'Tasks',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    view: 'board',
    label: 'Board',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
      </svg>
    ),
  },
  {
    view: 'planner',
    label: 'Planner',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    view: 'notes',
    label: 'Notes',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  {
    view: 'templates',
    label: 'Templates',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    view: 'forms',
    label: 'Forms',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    view: 'ai',
    label: 'AI',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    view: 'team',
    label: 'Team',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    view: 'automations',
    label: 'Automations',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    view: 'integrations',
    label: 'Integrations',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
  {
    view: 'hall-of-heroes',
    label: 'Hall of Heroes',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
  },
  {
    view: 'reports',
    label: 'Reports',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    view: 'renewals',
    label: 'Renewals',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  {
    view: 'studio',
    label: 'Embark Studio',
    sectionLabel: 'WORKSPACE',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
];

const statusColors: Record<Client['status'], string> = {
  active: 'bg-emerald-500',
  completed: 'bg-blue-500',
  'on-hold': 'bg-amber-500',
};

export function Sidebar({ currentView, onViewChange, onSelectClient, isCollapsed, onToggleCollapse }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [clientsOpen, setClientsOpen] = useLocalStorage('sidebar-clients-open', true);
  const { clients } = useClientContext();
  const { pinnedViews } = useSavedViews();
  const [favorites] = useLocalStorage<string[]>('favorite-clients', []);
  const { currentUser, logout } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);

  const classColors: Record<string, string> = {
    paladin: 'bg-yellow-400 text-zinc-900',
    wizard:  'bg-violet-500 text-white',
    ranger:  'bg-emerald-500 text-white',
    rogue:   'bg-zinc-900 text-yellow-400',
  };
  const avatarColor = classColors[currentUser?.characterClass ?? ''] ?? 'bg-zinc-700 text-white';

  useEffect(() => {
    if (!userMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [userMenuOpen]);

  const activeClients = useMemo(
    () => clients.filter((c) => !c.archived),
    [clients]
  );

  const favoriteClients = useMemo(
    () => activeClients.filter((c) => favorites.includes(c.id)),
    [activeClients, favorites]
  );

  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return activeClients;
    const query = searchQuery.toLowerCase();
    return activeClients.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query)
    );
  }, [activeClients, searchQuery]);

  const nonFavoriteClients = useMemo(
    () => filteredClients.filter((c) => !favorites.includes(c.id)),
    [filteredClients, favorites]
  );

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-zinc-900 border-r-2 border-white z-30 transition-all duration-300 flex flex-col ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="p-3 border-b-2 border-zinc-700 flex items-center justify-center gap-2">
        <div className={`rounded-[4px] border-2 border-yellow-400 flex-shrink-0 overflow-hidden transition-all mascot-logo-glow ${isCollapsed ? 'w-8 h-8' : 'w-9 h-9'}`}>
          <img
            src="/mascot-clean.jpg"
            alt="Embark"
            className="w-[200%] h-[200%] object-cover translate-x-[0%] -translate-y-[18%]"
          />
        </div>
        {!isCollapsed && (
          <span className="embark-glow font-black text-lg tracking-tight font-display">Embark</span>
        )}
      </div>

      {/* Scrollable middle zone */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">

      {/* Navigation */}
      <nav className="p-2 border-b-2 border-zinc-700">
        {navItems.map((item) => (
          <div key={item.view}>
            {item.sectionLabel && (
              isCollapsed
                ? <div className="my-1 mx-2 border-t border-zinc-700" />
                : <div className="px-3 pt-3 pb-1 text-xs font-black text-zinc-500 uppercase tracking-widest">{item.sectionLabel}</div>
            )}
            <button
              onClick={() => onViewChange(item.view)}
              className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-[4px] mb-1 transition-all duration-100 group ${
                currentView === item.view
                  ? 'bg-yellow-400 text-zinc-900 font-black shadow-[2px_2px_0_0_#ffffff]'
                  : 'text-zinc-300 hover:text-white hover:bg-zinc-800 hover:translate-x-0.5 font-medium'
              }`}
              aria-current={currentView === item.view ? 'page' : undefined}
              title={isCollapsed ? item.label : undefined}
            >
              {currentView === item.view && (
                <span className="nav-indicator" />
              )}
              <span className={`transition-transform duration-100 ${currentView === item.view ? 'scale-110' : ''}`}>
                {item.icon}
              </span>
              {!isCollapsed && (
                <span className="text-sm">{item.label}</span>
              )}
            </button>
          </div>
        ))}
      </nav>

      {/* My Views — pinned saved views */}
      {!isCollapsed && pinnedViews.length > 0 && (
        <div className="px-3 py-2 border-b-2 border-zinc-700">
          <p className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-1 px-1">
            My Views
          </p>
          <div className="space-y-0.5">
            {pinnedViews.map((view) => (
              <button
                key={view.id}
                onClick={() => onViewChange('clients')}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-[4px] text-left text-sm font-bold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
              >
                {view.emoji ? (
                  <span className="w-5 h-5 flex items-center justify-center text-base">
                    {view.emoji}
                  </span>
                ) : (
                  <svg
                    className="w-4 h-4 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                    />
                  </svg>
                )}
                <span className="truncate">{view.name}</span>
                {view.isDefault && (
                  <span className="text-yellow-500 ml-auto shrink-0">★</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Client Search (when expanded and clients section open) */}
      {!isCollapsed && clientsOpen && (
        <div className="p-3 border-b-2 border-zinc-700">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clients..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-[4px] bg-zinc-800 border border-zinc-600 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-white"
            />
          </div>
        </div>
      )}

      {/* Client List */}
      <div className="p-2">
        {!isCollapsed ? (
          <>
            {/* Collapsible header */}
            <button
              onClick={() => setClientsOpen(!clientsOpen)}
              className="w-full flex items-center justify-between px-2 py-1 mb-1 text-xs font-bold text-zinc-400 uppercase tracking-wide hover:text-zinc-200 transition-colors"
            >
              <span>Clients</span>
              <svg
                className={`w-3 h-3 transition-transform duration-200 ${clientsOpen ? '' : '-rotate-90'}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {clientsOpen && (
              <>
                {/* Favorites Section */}
                {favoriteClients.length > 0 && !searchQuery && (
                  <div className="mb-3">
                    <div className="flex items-center gap-2 px-2 py-1 text-xs font-bold text-zinc-500 uppercase tracking-wide">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      Favorites
                    </div>
                    {favoriteClients.map((client) => (
                      <ClientItem
                        key={client.id}
                        client={client}
                        onClick={() => {
                          onSelectClient(client);
                          onViewChange('clients');
                        }}
                        isFavorite
                      />
                    ))}
                  </div>
                )}

                {/* All Clients */}
                {(() => {
                  const list = searchQuery ? filteredClients : nonFavoriteClients;
                  const capped = !searchQuery && list.length > 5;
                  const displayed = capped ? list.slice(0, 5) : list;
                  return (
                    <div>
                      {!searchQuery && favoriteClients.length > 0 && (
                        <div className="px-2 py-1 text-xs font-bold text-zinc-500 uppercase tracking-wide">
                          Recent
                        </div>
                      )}
                      {list.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-4">
                          <div className="w-6 h-6 bg-yellow-400/60 clip-burst deco-float" />
                          <p className="text-zinc-500 text-xs text-center">
                            {searchQuery ? 'No clients found' : 'No clients yet'}
                          </p>
                        </div>
                      ) : (
                        <>
                          {displayed.map((client) => (
                            <ClientItem
                              key={client.id}
                              client={client}
                              onClick={() => {
                                onSelectClient(client);
                                onViewChange('clients');
                              }}
                              isFavorite={favorites.includes(client.id)}
                            />
                          ))}
                          {capped && (
                            <button
                              onClick={() => onViewChange('clients')}
                              className="w-full text-left px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                            >
                              +{list.length - 5} more — See all
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  );
                })()}
              </>
            )}
          </>
        ) : (
          // Collapsed view - show client avatars
          <div className="flex flex-col items-center gap-2 py-2">
            {activeClients.slice(0, 8).map((client) => (
              <button
                key={client.id}
                onClick={() => {
                  onSelectClient(client);
                  onViewChange('clients');
                }}
                className="w-10 h-10 rounded-[4px] bg-violet-700 flex items-center justify-center text-white font-black text-sm hover:-translate-y-0.5 hover:shadow-[2px_2px_0_0_#ffffff] transition-all"
                title={client.name}
              >
                {client.name.charAt(0).toUpperCase()}
              </button>
            ))}
            {activeClients.length > 8 && (
              <button
                onClick={() => onViewChange('clients')}
                className="w-10 h-10 rounded-[4px] bg-zinc-800 border border-zinc-600 flex items-center justify-center text-zinc-400 text-xs font-bold hover:border-white hover:text-white transition-all"
                title={`${activeClients.length - 8} more clients`}
              >
                +{activeClients.length - 8}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Recent Activity Feed (when expanded) */}
      {!isCollapsed && (
        <RecentActivityFeed
          onSelectClient={(client) => {
            onSelectClient(client);
            onViewChange('clients');
          }}
          maxItems={10}
          compact
        />
      )}

      </div>{/* end scrollable middle zone */}

      {/* User Avatar Chip */}
      {currentUser && (
        <>
        <div ref={menuRef} className="relative px-2 pb-1">
          <button
            onClick={() => setUserMenuOpen(v => !v)}
            className={`w-full flex items-center gap-2 px-2 py-2 rounded-[4px] hover:bg-zinc-800 transition-all ${isCollapsed ? 'justify-center' : ''}`}
            title={isCollapsed ? currentUser.username : undefined}
          >
            {currentUser.avatarUrl ? (
              <img src={currentUser.avatarUrl} alt="avatar" className="w-7 h-7 rounded-full object-cover flex-shrink-0 border border-zinc-600" />
            ) : (
              <div className={`w-7 h-7 rounded-[4px] border border-zinc-600 flex items-center justify-center text-xs font-black flex-shrink-0 ${avatarColor}`}>
                {currentUser.username[0].toUpperCase()}
              </div>
            )}
            {!isCollapsed && (
              <span className="text-sm font-medium text-zinc-300 truncate">{currentUser.username}</span>
            )}
          </button>

          {userMenuOpen && (
            <div className={`absolute bottom-full mb-1 ${isCollapsed ? 'left-12' : 'left-2 right-2'} bg-zinc-800 border-2 border-zinc-600 rounded-[4px] shadow-[3px_3px_0_0_#18181b] z-50`}>
              <button
                onClick={() => { setUserMenuOpen(false); setProfileModalOpen(true); }}
                className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
              >
                👤 Profile
              </button>
              <button
                onClick={() => { setUserMenuOpen(false); logout(); }}
                className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors border-t border-zinc-700"
              >
                🚪 Sign out
              </button>
            </div>
          )}
        </div>
        <ProfileModal isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} />
        </>
      )}

      {/* Changelog & Collapse Toggle */}
      <div className="p-2 border-t-2 border-zinc-700 space-y-1">
        <HowToModal isCollapsed={isCollapsed} />
        <Changelog isCollapsed={isCollapsed} />
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-[4px] text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            className={`w-5 h-5 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
          {!isCollapsed && <span className="text-sm font-medium">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}

interface ClientItemProps {
  client: Client;
  onClick: () => void;
  isFavorite?: boolean;
}

function ClientItem({ client, onClick, isFavorite }: ClientItemProps) {
  const completedTasks = client.checklist.filter((t) => t.completed).length;
  const totalTasks = client.checklist.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-2 py-2 rounded-[4px] hover:bg-zinc-800 transition-all border-b border-zinc-700 last:border-b-0"
    >
      <div className="relative flex-shrink-0">
        <div className="w-8 h-8 rounded-[4px] bg-violet-700 flex items-center justify-center text-white font-black text-sm">
          {client.name.charAt(0).toUpperCase()}
        </div>
        <div
          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-zinc-900 ${
            statusColors[client.status]
          }`}
        />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-1">
          <p className="text-sm font-medium text-zinc-100 truncate">
            {client.name}
          </p>
          {isFavorite && (
            <svg className="w-3 h-3 text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 bg-zinc-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-400 rounded-full progress-bar"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-zinc-500">{progress}%</span>
        </div>
      </div>
    </button>
  );
}
