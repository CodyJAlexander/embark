import { useState } from 'react';
import type { JSONContent } from '@tiptap/core';
import type { Bud } from '../../../types';
import { useAISettings } from '../../../hooks/useAISettings';
import { useAnthropicChat } from '../../../hooks/useAnthropicChat';
import { useOllamaChat } from '../../../hooks/useOllamaChat';
import { tiptapToPlainText } from '../../../utils/studioHelpers';
import { Modal } from '../../UI/Modal';
import { Button } from '../../UI/Button';
import { SparkIcon } from '../../UI/SparkIcon';

type ActionKey = 'summarize' | 'actions' | 'rewrite';

interface Props {
  content: JSONContent;
  onInsertContent: (text: string) => void;
}

const PAGE_BUD: Bud = {
  id: 'page-action',
  name: 'Page AI',
  type: 'custom',
  systemPrompt: 'You are a concise document assistant. Respond with only the requested content, no preamble.',
  icon: '✦',
  color: '#2563eb',
  description: 'AI page action helper',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const ACTION_PROMPTS: Record<ActionKey, (text: string) => string> = {
  summarize: (text) => `Summarize the following document in 3-5 concise bullet points:\n\n${text}`,
  actions: (text) => `Extract all action items from the following document. Format as a bullet list:\n\n${text}`,
  rewrite: (text) => `Rewrite the bullet points in the following document to be clearer and more actionable:\n\n${text}`,
};

const ACTION_LABELS: Record<ActionKey, string> = {
  summarize: 'Summarize',
  actions: 'Action Items',
  rewrite: 'Rewrite Bullets',
};

export function AIPageActions({ content, onInsertContent }: Props) {
  const { settings } = useAISettings();
  const anthropicChat = useAnthropicChat(settings.anthropicApiKey ?? '');
  const ollamaChat = useOllamaChat(settings.ollamaEndpoint);
  const [loading, setLoading] = useState<ActionKey | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pageText = tiptapToPlainText(content);

  async function runAction(action: ActionKey) {
    if (!pageText.trim()) return;
    setLoading(action);
    setError(null);
    try {
      const prompt = ACTION_PROMPTS[action](pageText);
      const opts = { bud: PAGE_BUD, messages: [], allClients: [] };
      const resp = settings.provider === 'ollama'
        ? await ollamaChat.sendMessage(prompt, opts, settings.ollamaModel)
        : await anthropicChat.sendMessage(prompt, opts);
      setResult(resp);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI request failed');
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-zinc-700">
        <SparkIcon className="w-3.5 h-3.5 text-blue-400" />
        <span className="text-xs font-black text-zinc-500 uppercase tracking-widest mr-1">AI</span>
        {(Object.keys(ACTION_LABELS) as ActionKey[]).map((key) => (
          <button
            key={key}
            onClick={() => runAction(key)}
            disabled={!!loading || !pageText.trim()}
            className="px-2.5 py-1 text-xs font-bold border border-zinc-700 rounded-[4px] text-zinc-400 hover:border-blue-500 hover:text-blue-400 disabled:opacity-40 transition-colors flex items-center gap-1"
          >
            {loading === key
              ? <SparkIcon className="w-3 h-3 text-blue-400 animate-spin" />
              : ACTION_LABELS[key]}
          </button>
        ))}
        {error && (
          <span className="text-xs text-red-400 ml-1">{error}</span>
        )}
      </div>

      {result && (
        <Modal isOpen title="AI Result" onClose={() => setResult(null)}>
          <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-sans mb-4 max-h-64 overflow-y-auto">{result}</pre>
          <div className="flex gap-2">
            <Button onClick={() => { onInsertContent(result); setResult(null); }}>
              Insert into Page
            </Button>
            <Button variant="secondary" onClick={() => { navigator.clipboard.writeText(result); setResult(null); }}>
              Copy
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
