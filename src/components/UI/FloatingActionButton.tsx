import { useState, useEffect, useRef } from 'react';
import type { CommunicationType } from '../../types';
import { useClientContext } from '../../context/ClientContext';
import { Button } from './Button';
import { Modal } from './Modal';

interface FloatingActionButtonProps {
  onAddClient: () => void;
}

type ActionType = 'task' | 'communication' | 'note' | null;

export function FloatingActionButton({ onAddClient }: FloatingActionButtonProps) {
  const { clients, addChecklistItem, addCommunication, updateNotes } = useClientContext();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<ActionType>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  // Form state
  const [taskTitle, setTaskTitle] = useState('');
  const [commType, setCommType] = useState<CommunicationType>('note');
  const [commSubject, setCommSubject] = useState('');
  const [commContent, setCommContent] = useState('');
  const [noteContent, setNoteContent] = useState('');

  const activeClients = clients.filter((c) => !c.archived);
  const filteredClients = activeClients.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'n') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const resetForm = () => {
    setSelectedAction(null);
    setSelectedClientId('');
    setSearchTerm('');
    setTaskTitle('');
    setCommType('note');
    setCommSubject('');
    setCommContent('');
    setNoteContent('');
  };

  const handleClose = () => {
    setIsOpen(false);
    resetForm();
  };

  const handleActionSelect = (action: ActionType) => {
    if (action === null) {
      onAddClient();
      setIsOpen(false);
      return;
    }
    setSelectedAction(action);
  };

  const handleSubmit = () => {
    if (!selectedClientId) return;

    switch (selectedAction) {
      case 'task':
        if (taskTitle.trim()) {
          addChecklistItem(selectedClientId, taskTitle.trim());
        }
        break;
      case 'communication':
        if (commSubject.trim()) {
          addCommunication(selectedClientId, {
            type: commType,
            subject: commSubject.trim(),
            content: commContent.trim(),
          });
        }
        break;
      case 'note':
        if (noteContent.trim()) {
          const client = clients.find((c) => c.id === selectedClientId);
          const existingNotes = client?.notes || '';
          const newNotes = existingNotes
            ? `${existingNotes}\n\n---\n${new Date().toLocaleString()}\n${noteContent.trim()}`
            : `${new Date().toLocaleString()}\n${noteContent.trim()}`;
          updateNotes(selectedClientId, newNotes);
        }
        break;
    }

    handleClose();
  };

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  const actionIconBg: Record<string, string> = {
    'Add Client': 'bg-green-600',
    'Quick Task': 'bg-blue-600',
    'Log Communication': 'bg-violet-700',
    'Add Note': 'bg-orange-600',
  };

  const actions = [
    {
      id: null as ActionType,
      label: 'Add Client',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      ),
    },
    {
      id: 'task' as ActionType,
      label: 'Quick Task',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
    {
      id: 'communication' as ActionType,
      label: 'Log Communication',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
    {
      id: 'note' as ActionType,
      label: 'Add Note',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* FAB Button */}
      <div ref={menuRef} className="fixed bottom-6 right-6 z-40">
        {/* Action menu */}
        {isOpen && !selectedAction && (
          <div className="absolute bottom-16 right-0 mb-2 bg-white dark:bg-zinc-800 border-2 border-zinc-900 dark:border-white shadow-[6px_6px_0_0_#18181b] dark:shadow-[6px_6px_0_0_#ffffff] rounded-[4px] p-2 min-w-[200px]">
            <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 px-3 py-1 mb-1 uppercase tracking-wide">
              Quick Actions
            </p>
            {actions.map((action) => (
              <button
                key={action.label}
                onClick={() => handleActionSelect(action.id)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-[4px] hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
              >
                <div className={`p-2 rounded-[4px] ${actionIconBg[action.label]} text-white`}>
                  {action.icon}
                </div>
                <span className="text-zinc-900 dark:text-zinc-100 font-bold text-sm">
                  {action.label}
                </span>
              </button>
            ))}
            <div className="border-t-2 border-zinc-200 dark:border-zinc-700 mt-2 pt-2 px-3">
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                Tip: Press Ctrl+Shift+N to toggle
              </p>
            </div>
          </div>
        )}

        {/* Main FAB */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`h-14 w-14 rounded-[4px] bg-yellow-400 border-2 border-zinc-900 shadow-[4px_4px_0_0_#18181b] text-zinc-900 flex items-center justify-center transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none btn-ripple ${
            isOpen ? 'rotate-[45deg]' : '-rotate-[2deg] hover:-rotate-[1deg]'
          }`}
        >
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Client Selection + Form Modal */}
      <Modal
        isOpen={selectedAction !== null}
        onClose={handleClose}
        title={
          !selectedClientId
            ? 'Select Client'
            : selectedAction === 'task'
            ? 'Add Task'
            : selectedAction === 'communication'
            ? 'Log Communication'
            : 'Add Note'
        }
      >
        {!selectedClientId ? (
          <div className="space-y-4">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search clients..."
              className="w-full px-4 py-2.5 rounded-[4px] border-2 border-zinc-900 dark:border-white bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:shadow-[2px_2px_0_0_#18181b] dark:focus:shadow-[2px_2px_0_0_#ffffff]"
              autoFocus
            />
            <div className="max-h-64 overflow-y-auto space-y-1">
              {filteredClients.length === 0 ? (
                <p className="text-center text-zinc-500 dark:text-zinc-400 py-4">
                  No clients found
                </p>
              ) : (
                filteredClients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => setSelectedClientId(client.id)}
                    className="w-full text-left px-4 py-3 rounded-[4px] hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-transparent hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors"
                  >
                    <p className="font-bold text-zinc-900 dark:text-zinc-100">{client.name}</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{client.email}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-zinc-100 dark:bg-zinc-700 border-2 border-zinc-900 dark:border-white rounded-[4px]">
              <div className="w-8 h-8 rounded-[4px] bg-violet-700 flex items-center justify-center text-white font-black">
                {selectedClient?.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                  {selectedClient?.name}
                </p>
                <button
                  onClick={() => setSelectedClientId('')}
                  className="text-xs font-medium text-violet-700 dark:text-yellow-400 hover:underline"
                >
                  Change client
                </button>
              </div>
            </div>

            {selectedAction === 'task' && (
              <div>
                <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="What needs to be done?"
                  className="w-full px-4 py-2.5 rounded-[4px] border-2 border-zinc-900 dark:border-white bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:shadow-[2px_2px_0_0_#18181b] dark:focus:shadow-[2px_2px_0_0_#ffffff]"
                  autoFocus
                />
              </div>
            )}

            {selectedAction === 'communication' && (
              <>
                <div>
                  <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                    Type
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['email', 'call', 'meeting', 'note'] as CommunicationType[]).map((type) => (
                      <button
                        key={type}
                        onClick={() => setCommType(type)}
                        className={`px-3 py-2 rounded-[4px] text-sm font-bold transition-all border-2 ${
                          commType === type
                            ? 'bg-violet-700 text-white border-zinc-900'
                            : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-600 hover:border-zinc-900 dark:hover:border-white'
                        }`}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={commSubject}
                    onChange={(e) => setCommSubject(e.target.value)}
                    placeholder="Brief description"
                    className="w-full px-4 py-2.5 rounded-[4px] border-2 border-zinc-900 dark:border-white bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:shadow-[2px_2px_0_0_#18181b] dark:focus:shadow-[2px_2px_0_0_#ffffff]"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Details (optional)
                  </label>
                  <textarea
                    value={commContent}
                    onChange={(e) => setCommContent(e.target.value)}
                    placeholder="Additional notes..."
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-[4px] border-2 border-zinc-900 dark:border-white bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:shadow-[2px_2px_0_0_#18181b] dark:focus:shadow-[2px_2px_0_0_#ffffff] resize-none"
                  />
                </div>
              </>
            )}

            {selectedAction === 'note' && (
              <div>
                <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Note
                </label>
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Add a note..."
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-[4px] border-2 border-zinc-900 dark:border-white bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:shadow-[2px_2px_0_0_#18181b] dark:focus:shadow-[2px_2px_0_0_#ffffff] resize-none"
                  autoFocus
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  (selectedAction === 'task' && !taskTitle.trim()) ||
                  (selectedAction === 'communication' && !commSubject.trim()) ||
                  (selectedAction === 'note' && !noteContent.trim())
                }
              >
                {selectedAction === 'task'
                  ? 'Add Task'
                  : selectedAction === 'communication'
                  ? 'Log Entry'
                  : 'Save Note'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
