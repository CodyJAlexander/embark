import { useEffect } from 'react';
import './tiptap-editor.css';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import type { JSONContent } from '@tiptap/core';
import type { Editor } from '@tiptap/react';
import { SlashExtension } from './SlashExtension';
import { SlashMenu } from './SlashMenu';
import { BubbleToolbar } from './BubbleToolbar';
import { ToggleNode } from './ToggleNode';

const EMPTY_DOC: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] };

interface Props {
  content: JSONContent;
  onChange: (content: JSONContent) => void;
  editable?: boolean;
  editorRef?: React.MutableRefObject<Editor | null>;
}

export function TiptapEditor({ content, onChange, editable = true, editorRef }: Props) {
  // Guard against old localStorage data (blocks array format)
  const safeContent = (content && content.type === 'doc') ? content : EMPTY_DOC;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
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
      ToggleNode,
      SlashExtension,
    ],
    content: safeContent,
    editable,
    onUpdate: ({ editor: e }) => onChange(e.getJSON()),
  });

  // Expose editor instance via ref for parent components (e.g. save-as-template)
  useEffect(() => {
    if (editorRef) editorRef.current = editor;
  }, [editor, editorRef]);

  // Destroy on unmount
  useEffect(() => {
    return () => { editor?.destroy(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="tiptap-editor">
      <BubbleToolbar editor={editor} />
      <SlashMenu editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
