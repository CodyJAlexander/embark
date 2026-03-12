import { useState, useEffect, useRef, useCallback } from 'react';
import { useBuds, budTemplates } from '../../hooks/useBuds';
import { useAnthropicChat } from '../../hooks/useAnthropicChat';
import { useOllamaChat } from '../../hooks/useOllamaChat';
import { useAISettings } from '../../hooks/useAISettings';
import { useAIActions } from '../../hooks/useAIActions';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useStudio } from '../../hooks/useStudio';
import { useToast } from '../UI/Toast';
import { BudChat } from '../Buds/BudChat';
import { BudForm } from '../Buds/BudForm';
import { MentionInput } from './MentionInput';
import { resolveReferences, blocksToPlainText } from '../../utils/studioHelpers';
import type { Bud, BudType, AIConversation, AIMessage } from '../../types';

interface AttachedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  isImage: boolean;
}

type AITab = 'ask' | 'buds';

const templateInfo: { type: Exclude<BudType, 'custom'>; icon: string; color: string }[] = [
  { type: 'status-reporter', icon: '📊', color: 'from-blue-500 to-cyan-500' },
  { type: 'project-manager', icon: '📋', color: 'from-purple-500 to-pink-500' },
  { type: 'standup-manager', icon: '🎯', color: 'from-green-500 to-emerald-500' },
  { type: 'priorities-manager', icon: '🚀', color: 'from-orange-500 to-red-500' },
];

const budPromptPlaceholders = [
  'Describe the work that you want your bud to help with...',
  'What would your bud work on?',
  'Give your bud responsibilities...',
  'What tasks should your bud assist with?',
  'Describe your ideal AI assistant...',
];

// Generate a readable chat title from the first message
function generateChatTitle(message: string): string {
  // Remove extra whitespace and limit to first ~50 chars
  const cleaned = message.trim().replace(/\s+/g, ' ');

  // If short enough, use as-is
  if (cleaned.length <= 40) {
    return cleaned;
  }

  // Try to cut at a word boundary
  const truncated = cleaned.slice(0, 40);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > 20) {
    return truncated.slice(0, lastSpace) + '...';
  }

  return truncated + '...';
}

export function AICenter() {
  const [activeTab, setActiveTab] = useState<AITab>('ask');
  const { buds, createBud, updateBud, deleteBud } = useBuds();
  const { settings } = useAISettings();
  const anthropicChat = useAnthropicChat(settings.anthropicApiKey || '');
  const ollamaChat = useOllamaChat(settings.ollamaEndpoint);
  const { executeAction, clients } = useAIActions();
  const { pages: studioPages } = useStudio();
  const { showToast } = useToast();

  // Determine which chat to use based on provider
  const isOllama = settings.provider === 'ollama';
  const isLoading = isOllama ? ollamaChat.isLoading : anthropicChat.isLoading;
  const error = isOllama ? ollamaChat.error : anthropicChat.error;

  // Check if AI is properly configured
  const isAIConfigured = isOllama
    ? ollamaChat.isConnected === true
    : !!settings.anthropicApiKey;

  // Wrap executeAction to show toast notifications
  const executeActionWithToast = useCallback(
    async (toolName: string, toolInput: Record<string, unknown>, contextClientId?: string) => {
      const result = await executeAction(toolName, toolInput, contextClientId);

      // Show toast based on result
      if (result.success) {
        showToast(result.message, 'success');
      } else {
        showToast(result.message, 'error');
      }

      return result;
    },
    [executeAction, showToast]
  );

  // Ask AI state
  const [conversations, setConversations] = useLocalStorage<AIConversation[]>('ai-conversations', []);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Build a Bud state
  const [budInput, setBudInput] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [selectedBud, setSelectedBud] = useState<Bud | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [editingBud, setEditingBud] = useState<Bud | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Rotate placeholder text
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % budPromptPlaceholders.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, activeConversationId]);

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  const handleNewConversation = () => {
    const newConv: AIConversation = {
      id: crypto.randomUUID(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setConversations([newConv, ...conversations]);
    setActiveConversationId(newConv.id);
  };

  const handleSendMessage = async () => {
    if ((!input.trim() && attachedFiles.length === 0) || isLoading) return;

    let convId = activeConversationId;

    // Create new conversation if none active
    if (!convId) {
      const newConv: AIConversation = {
        id: crypto.randomUUID(),
        title: input.trim().slice(0, 50) || 'File upload',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setConversations([newConv, ...conversations]);
      convId = newConv.id;
      setActiveConversationId(convId);
    }

    // Build message content with file descriptions
    let messageContent = input.trim();
    const fileDescriptions = attachedFiles.map(f => `[Attached: ${f.name} (${f.type})]`).join('\n');
    if (fileDescriptions) {
      messageContent = messageContent ? `${messageContent}\n\n${fileDescriptions}` : fileDescriptions;
    }

    const userMessage: AIMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: messageContent,
      timestamp: new Date().toISOString(),
    };

    // Add user message and update title if it's the first message
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== convId) return c;
        const isFirstMessage = c.messages.length === 0;
        const newTitle = isFirstMessage ? generateChatTitle(input.trim() || 'File upload') : c.title;
        return {
          ...c,
          title: newTitle,
          messages: [...c.messages, userMessage],
          updatedAt: new Date().toISOString(),
        };
      })
    );

    const messageText = input.trim();
    const filesToSend = [...attachedFiles];
    setInput('');
    setAttachedFiles([]);

    // Resolve [[Page]] references and @date tokens
    const { resolved: resolvedMessage, referencedPages } = resolveReferences(messageText, studioPages);

    try {
      // Build context from conversation history
      const conv = conversations.find((c) => c.id === convId);

      // Build studio page context for system prompt
      const pageContext = referencedPages.length > 0
        ? '\n\n## Referenced Studio Pages\n' + referencedPages.map((p) =>
            `### ${p.icon} ${p.title}\n${blocksToPlainText(p.blocks)}`
          ).join('\n\n')
        : '';

      const budConfig = {
        id: 'general',
        name: 'Embark AI',
        type: 'custom' as const,
        description: 'Your general AI assistant',
        systemPrompt: `You are a helpful AI assistant for Embark, a client onboarding tracker application. You can directly modify the system - add clients, create tasks, mark tasks complete, update client information, and more.

When users ask you to do something, USE YOUR TOOLS to actually do it. Don't just describe what should be done - actually do it using the available tools.

Available actions you can perform:
- Add, update, or archive clients
- Add, complete, uncomplete, or delete tasks
- Move tasks between groups (To Do, In Progress, Done)
- Add and complete milestones
- Log communications (emails, calls, meetings, notes)
- View communication logs and milestones
- Update client notes and add services

For example:
- "Add a client named John" → Use the add_client tool
- "Add a task to review the contract" → Use the add_task tool
- "Mark the onboarding task as complete" → Use the complete_task tool
- "Move the design task to In Progress" → Use the move_task_to_group tool
- "Add a milestone for contract signing" → Use the add_milestone tool
- "Log a call with the client about requirements" → Use the add_communication tool
- "Show me the communication history" → Use the get_communication_log tool

Be proactive and helpful. After completing an action, confirm what you did.${pageContext}`,
        icon: '🤖',
        color: 'from-indigo-500 to-purple-600',
        createdAt: new Date().toISOString(),
      };

      let response: string;

      if (isOllama) {
        // Use Ollama for local AI processing
        response = await ollamaChat.sendMessage(resolvedMessage, {
          bud: budConfig,
          messages: conv?.messages || [],
          allClients: clients.filter(c => !c.archived),
        }, settings.ollamaModel);
      } else {
        // Use Anthropic Claude API
        response = await anthropicChat.sendMessage(resolvedMessage, {
          bud: budConfig,
          messages: conv?.messages || [],
          allClients: clients.filter(c => !c.archived),
          executeAction: settings.enableTools ? executeActionWithToast : undefined,
          enableTools: settings.enableTools,
          attachedFiles: filesToSend.map(f => ({
            type: f.isImage ? 'image' : 'document',
            mediaType: f.type,
            data: f.dataUrl.split(',')[1], // Remove data:mime;base64, prefix
            name: f.name,
          })),
        });
      }

      const assistantMessage: AIMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? { ...c, messages: [...c.messages, assistantMessage], updatedAt: new Date().toISOString() }
            : c
        )
      );
    } catch {
      // Error handled by hook
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleDeleteConversation = (id: string) => {
    setConversations(conversations.filter((c) => c.id !== id));
    if (activeConversationId === id) {
      setActiveConversationId(null);
    }
  };

  const handleStartRename = (conv: AIConversation) => {
    setEditingConvId(conv.id);
    setEditingTitle(conv.title);
  };

  const handleSaveRename = () => {
    if (editingConvId && editingTitle.trim()) {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === editingConvId ? { ...c, title: editingTitle.trim() } : c
        )
      );
    }
    setEditingConvId(null);
    setEditingTitle('');
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveRename();
    } else if (e.key === 'Escape') {
      setEditingConvId(null);
      setEditingTitle('');
    }
  };

  // File handling
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const maxSize = 5 * 1024 * 1024; // 5MB limit
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'text/csv'];

    for (const file of Array.from(files)) {
      if (file.size > maxSize) {
        showToast(`File "${file.name}" is too large (max 5MB)`, 'error');
        continue;
      }

      if (!allowedTypes.includes(file.type) && !file.type.startsWith('image/')) {
        showToast(`File type "${file.type}" is not supported`, 'error');
        continue;
      }

      try {
        const dataUrl = await readFileAsDataUrl(file);
        const newFile: AttachedFile = {
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl,
          isImage: file.type.startsWith('image/'),
        };
        setAttachedFiles(prev => [...prev, newFile]);
      } catch {
        showToast(`Failed to read file "${file.name}"`, 'error');
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const removeAttachedFile = (id: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== id));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Bud handlers
  const handleCreateFromTemplate = (type: Exclude<BudType, 'custom'>) => {
    const bud = createBud(type);
    setSelectedBud(bud);
    setShowChat(true);
  };

  const handleCreateCustomBud = () => {
    if (budInput.trim()) {
      // Pre-fill the form with the description
      setShowCreateForm(true);
    } else {
      setShowCreateForm(true);
    }
  };

  const handleSaveCustomBud = (budData: Omit<Bud, 'id' | 'createdAt'>) => {
    if (editingBud) {
      updateBud(editingBud.id, budData);
      setEditingBud(null);
    } else {
      const newBud = createBud(budData);
      setSelectedBud(newBud);
      setShowChat(true);
    }
    setShowCreateForm(false);
    setBudInput('');
  };

  const handleDeleteBud = (bud: Bud) => {
    if (confirm(`Are you sure you want to delete ${bud.name}?`)) {
      deleteBud(bud.id);
      if (selectedBud?.id === bud.id) {
        setSelectedBud(null);
        setShowChat(false);
      }
    }
  };

  const handleEditBud = (bud: Bud) => {
    setEditingBud(bud);
    setShowCreateForm(true);
  };

  const handleChatWithBud = (bud: Bud) => {
    setSelectedBud(bud);
    setShowChat(true);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with tabs */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold gradient-text">AI</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Chat with AI or build custom assistants
          </p>
        </div>
      </div>

      {!isAIConfigured && (
        <div className="glass-card p-4 mb-6 border-l-4 border-amber-500">
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚠️</div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">
                {isOllama ? 'Ollama Not Connected' : 'API Key Required'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {isOllama
                  ? 'To use local AI features, ensure Ollama is running and connected. Check the AI settings (gear icon) to test the connection.'
                  : 'To use AI features, add your Anthropic API key in Settings (gear icon in the top right).'}
              </p>
              {isOllama && (
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                  Using Ollama keeps your client data completely private - nothing leaves your machine.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('ask')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
            activeTab === 'ask'
              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
              : 'glass-subtle text-gray-600 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-white/15'
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Ask AI
        </button>
        <button
          onClick={() => setActiveTab('buds')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
            activeTab === 'buds'
              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
              : 'glass-subtle text-gray-600 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-white/15'
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Build a Bud
        </button>
      </div>

      {/* Ask AI Tab */}
      {activeTab === 'ask' && (
        <div className="flex-1 flex gap-4 min-h-0">
          {/* Conversation List */}
          <div className="w-64 flex-shrink-0 glass-card p-3 flex flex-col">
            <button
              onClick={handleNewConversation}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:opacity-90 transition-opacity shadow-lg text-sm mb-3"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Chat
            </button>
            <div className="flex-1 overflow-y-auto space-y-1">
              {conversations.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No conversations yet
                </p>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      activeConversationId === conv.id
                        ? 'bg-white/60 dark:bg-white/15'
                        : 'hover:bg-white/40 dark:hover:bg-white/10'
                    }`}
                    onClick={() => editingConvId !== conv.id && setActiveConversationId(conv.id)}
                  >
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    {editingConvId === conv.id ? (
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={handleRenameKeyDown}
                        onBlur={handleSaveRename}
                        className="flex-1 text-sm bg-white/50 dark:bg-white/10 rounded px-2 py-0.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">
                        {conv.title}
                      </span>
                    )}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartRename(conv);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        title="Rename"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConversation(conv.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-500"
                        title="Delete"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 glass-card flex flex-col min-h-0 max-h-[calc(100vh-280px)]">
            {/* Messages */}
            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
              style={{ overscrollBehavior: 'contain' }}
            >
              {!activeConversation || activeConversation.messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl mb-4">
                    🤖
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    How can I help you today?
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
                    Ask me anything about managing your clients, tasks, or projects. I'm here to help!
                  </p>
                </div>
              ) : (
                activeConversation.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                          : 'glass-subtle text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                      <div
                        className={`text-xs mt-1 ${
                          message.role === 'user' ? 'text-white/70' : 'text-gray-400'
                        }`}
                      >
                        {new Date(message.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="glass-subtle rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              {error && (
                <div className="flex justify-center">
                  <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg px-4 py-2 text-sm">
                    {error}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/20 dark:border-white/10">
              {/* Attached Files Preview */}
              {attachedFiles.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {attachedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="relative group flex items-center gap-2 px-3 py-2 glass-subtle rounded-lg"
                    >
                      {file.isImage ? (
                        <img
                          src={file.dataUrl}
                          alt={file.name}
                          className="w-8 h-8 object-cover rounded"
                        />
                      ) : (
                        <div className="w-8 h-8 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded">
                          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700 dark:text-gray-300 truncate max-w-[100px]">
                          {file.name}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                      <button
                        onClick={() => removeAttachedFile(file.id)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-end gap-2">
                {/* File Upload Button */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.txt,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!isAIConfigured}
                  className="p-3 text-gray-500 hover:text-purple-600 hover:bg-white/50 dark:hover:bg-white/10 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Attach file or image"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>

                <MentionInput
                  value={input}
                  onChange={setInput}
                  onKeyDown={handleKeyDown}
                  pages={studioPages}
                  placeholder="Ask anything... type [[ for pages, @ for dates"
                  rows={1}
                  disabled={!isAIConfigured}
                  className="flex-1 px-4 py-3 text-sm bg-white/50 dark:bg-white/10 rounded-xl border border-white/30 dark:border-white/10 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={(!input.trim() && attachedFiles.length === 0) || isLoading || !isAIConfigured}
                  className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>

              <p className="text-xs text-gray-400 mt-2">
                Supports images (JPG, PNG, GIF, WebP), PDFs, and text files. Max 5MB per file.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Build a Bud Tab */}
      {activeTab === 'buds' && (
        <div>
          {/* Bud Creation Input */}
          <div className="glass-card p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl flex-shrink-0">
                🤖
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Create Your Custom Bud
                </h3>
                <div className="relative">
                  <textarea
                    value={budInput}
                    onChange={(e) => setBudInput(e.target.value)}
                    placeholder={budPromptPlaceholders[placeholderIndex]}
                    rows={3}
                    className="w-full px-4 py-3 text-sm bg-white/50 dark:bg-white/10 rounded-xl border border-white/30 dark:border-white/10 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none transition-all"
                  />
                  <button
                    onClick={handleCreateCustomBud}
                    className="absolute right-3 bottom-3 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Create Bud
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Pre-built Templates */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Quick Start with Pre-built Buds
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {templateInfo.map(({ type, icon, color }) => {
                const template = budTemplates[type];
                const existingBud = buds.find((b) => b.type === type);

                return (
                  <button
                    key={type}
                    onClick={() => existingBud ? handleChatWithBud(existingBud) : handleCreateFromTemplate(type)}
                    disabled={!isAIConfigured}
                    className="glass-card p-4 hover:scale-[1.02] transition-transform text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center text-xl mb-2`}>
                      {icon}
                    </div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm mb-0.5">
                      {template.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                      {template.description}
                    </p>
                    {existingBud && (
                      <span className="mt-2 inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                        </svg>
                        Active
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* My Buds */}
          {buds.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                My Buds
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {buds.map((bud) => (
                  <div key={bud.id} className="glass-card p-4 group">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${bud.color} flex items-center justify-center text-xl`}>
                        {bud.icon}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEditBud(bud)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-white/10 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteBud(bud)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white/50 dark:hover:bg-white/10 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      {bud.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
                      {bud.description}
                    </p>
                    <button
                      onClick={() => handleChatWithBud(bud)}
                      disabled={!isAIConfigured}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      Chat
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chat Modal */}
      {showChat && selectedBud && (
        <BudChat
          bud={selectedBud}
          onClose={() => {
            setShowChat(false);
            setSelectedBud(null);
          }}
        />
      )}

      {/* Create/Edit Form Modal */}
      {showCreateForm && (
        <BudForm
          bud={editingBud}
          onSave={handleSaveCustomBud}
          onClose={() => {
            setShowCreateForm(false);
            setEditingBud(null);
          }}
        />
      )}
    </div>
  );
}
