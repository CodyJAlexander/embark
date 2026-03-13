import { useEffect, useRef, useMemo } from 'react';
import './tiptap-editor.css';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import type { JSONContent } from '@tiptap/core';
import type { Editor } from '@tiptap/react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { SlashExtension } from './SlashExtension';
import { SlashMenu } from './SlashMenu';
import { BubbleToolbar } from './BubbleToolbar';
import { ToggleNode } from './ToggleNode';
import { CalloutNode } from './CalloutNode';
import { ClientMentionNode } from './ClientMentionNode';
import { createClientMentionExtension } from './ClientMentionExtension';
import { useClientContext } from '../../../context/ClientContext';

const WS_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:3001')
  .replace(/^http/i, 'ws');

export interface CollabUser {
  id: string;
  name: string;
  color: string;
  emoji?: string;
}

interface Props {
  pageId: string;
  currentUser: CollabUser;
  onChange: (content: JSONContent) => void;
  editable?: boolean;
  editorRef?: React.MutableRefObject<Editor | null>;
  providerRef?: React.MutableRefObject<WebsocketProvider | null>;
}

export function TiptapEditor({ pageId, currentUser, onChange, editable = true, editorRef, providerRef }: Props) {
  const { clients } = useClientContext();
  const clientsRef = useRef(clients);
  useEffect(() => { clientsRef.current = clients; }, [clients]);

  // Y.Doc is stable per pageId — recreated only when navigating to a different page
  const ydoc = useMemo(() => new Y.Doc(), [pageId]);

  // WebsocketProvider connects to the Yjs room for this page
  const provider = useMemo(() => {
    const token = localStorage.getItem('embark-api-token') ?? '';
    return new WebsocketProvider(
      `${WS_BASE}/yjs`,
      pageId,
      ydoc,
      { params: { token } }
    );
  }, [pageId, ydoc]);

  // Destroy provider and ydoc when pageId changes or component unmounts
  useEffect(() => {
    return () => {
      provider.destroy();
      ydoc.destroy();
    };
  }, [provider, ydoc]);

  // Expose provider instance via ref for parent components (e.g. presence/awareness)
  useEffect(() => {
    if (providerRef) providerRef.current = provider;
    return () => { if (providerRef) providerRef.current = null; };
  }, [provider, providerRef]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable StarterKit's built-in undo/redo — Yjs handles it via Y.UndoManager
        undoRedo: false,
        codeBlock: { languageClassPrefix: 'language-' },
      }),
      Placeholder.configure({
        placeholder: ({ node }) =>
          node.type.name === 'heading' ? 'Heading' : "Type '/' for commands…",
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Image,
      Link.configure({ openOnClick: false }),
      Underline,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      ToggleNode,
      CalloutNode,
      SlashExtension,
      ClientMentionNode,
      createClientMentionExtension(clientsRef),
      // Collaboration replaces StarterKit's document — must come after other extensions
      Collaboration.configure({ document: ydoc }),
      CollaborationCursor.configure({
        provider,
        user: {
          name: currentUser.emoji ? `${currentUser.name} ${currentUser.emoji}` : currentUser.name,
          color: currentUser.color,
        },
      }),
    ],
    // NO content prop — Yjs is the source of truth
    editable,
  });

  // Expose editor instance via ref for parent components (e.g. save-as-template)
  useEffect(() => {
    if (editorRef) editorRef.current = editor;
  }, [editor, editorRef]);

  // Destroy editor on unmount
  useEffect(() => {
    return () => { editor?.destroy(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Notify parent of content changes via Yjs observer (keeps word count, TOC in sync)
  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      onChange(editor.getJSON());
    };
    editor.on('update', handler);
    return () => { editor.off('update', handler); };
  }, [editor, onChange]);

  function handleChipClick(e: React.MouseEvent) {
    const chip = (e.target as HTMLElement).closest('[data-client-mention]');
    if (chip) {
      const clientId = chip.getAttribute('data-client-mention');
      if (clientId) {
        window.dispatchEvent(new CustomEvent('embark:navigate', { detail: { view: 'clients', clientId } }));
      }
    }
  }

  return (
    <div className="tiptap-editor" onClick={handleChipClick}>
      <BubbleToolbar editor={editor} />
      <SlashMenu editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
