import type { JSONContent } from '@tiptap/core';
import type { StudioPage } from '../types';

/** Detect if the user is mid-way through a [[page]] mention. Returns the query string or null. */
export function detectPageMention(value: string, cursor: number): string | null {
  return value.slice(0, cursor).match(/\[\[([^\]]{0,50})$/)?.[1] ?? null;
}

/** Detect if the user is mid-way through an @date token. Returns the token text or null. */
export function detectDateToken(value: string, cursor: number): string | null {
  return value.slice(0, cursor).match(/@(today|tomorrow|this-week|[a-z-]{0,10})$/i)?.[1] ?? null;
}

function resolveDate(token: string): string {
  const now = new Date();
  const fmt = (d: Date) =>
    `${d.toLocaleDateString('en-US', { weekday: 'long' })}, ${d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;

  const lower = token.toLowerCase();
  if (lower === 'today') return fmt(now);
  if (lower === 'tomorrow') {
    const t = new Date(now);
    t.setDate(t.getDate() + 1);
    return fmt(t);
  }
  if (lower === 'this-week') {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return `Week of ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }
  return `@${token}`;
}

/** Resolve [[Page Title]] and @date tokens in text, returning the processed string and referenced pages. */
export function resolveReferences(text: string, pages: StudioPage[]): {
  resolved: string;
  referencedPages: StudioPage[];
} {
  const referencedPages: StudioPage[] = [];

  // Resolve [[Page Title]] references
  let resolved = text.replace(/\[\[([^\]]+)\]\]/g, (match, title: string) => {
    const page = pages.find((p) => p.title.toLowerCase() === title.toLowerCase().trim());
    if (page) {
      if (!referencedPages.includes(page)) referencedPages.push(page);
      return `[page: ${page.title}]`;
    }
    return match;
  });

  // Resolve @date tokens
  resolved = resolved.replace(/@(today|tomorrow|this-week)/gi, (_, token: string) => resolveDate(token));

  return { resolved, referencedPages };
}

/** Convert Tiptap JSONContent to plain text for AI context injection. */
export function tiptapToPlainText(content: JSONContent): string {
  function nodeToText(node: JSONContent): string {
    if (node.type === 'text') return node.text ?? '';
    if (node.type === 'hardBreak') return '\n';
    const children = (node.content ?? []).map(nodeToText).join('');
    switch (node.type) {
      case 'heading': return `${'#'.repeat(node.attrs?.level ?? 1)} ${children}`;
      case 'bulletList': return children;
      case 'orderedList': return children;
      case 'listItem': return `- ${children}`;
      case 'taskList': return children;
      case 'taskItem': return `- [${node.attrs?.checked ? 'x' : ' '}] ${children}`;
      case 'blockquote': return `> ${children}`;
      case 'codeBlock': return `\`\`\`\n${children}\n\`\`\``;
      case 'horizontalRule': return '---';
      default: return children;
    }
  }
  return (content.content ?? []).map(nodeToText).filter(Boolean).join('\n');
}

/** Convert Tiptap JSONContent to a Markdown string for export. */
export function tiptapToMarkdown(content: JSONContent): string {
  function nodeToMd(node: JSONContent, listContext?: 'bullet' | 'ordered' | 'task', index?: number): string {
    if (node.type === 'text') {
      let text = node.text ?? '';
      if (node.marks) {
        for (const mark of node.marks) {
          if (mark.type === 'bold') text = `**${text}**`;
          else if (mark.type === 'italic') text = `*${text}*`;
          else if (mark.type === 'code') text = `\`${text}\``;
          else if (mark.type === 'underline') text = `<u>${text}</u>`;
          else if (mark.type === 'link') text = `[${text}](${mark.attrs?.href ?? ''})`;
        }
      }
      return text;
    }
    if (node.type === 'hardBreak') return '  \n';

    const children = (node.content ?? []).map((n, i) => nodeToMd(n, undefined, i)).join('');

    switch (node.type) {
      case 'heading':
        return `${'#'.repeat(node.attrs?.level ?? 1)} ${children}\n\n`;
      case 'paragraph':
        return children ? `${children}\n\n` : '\n';
      case 'bulletList':
        return (node.content ?? []).map((n) => nodeToMd(n, 'bullet')).join('') + '\n';
      case 'orderedList':
        return (node.content ?? []).map((n, i) => nodeToMd(n, 'ordered', i + 1)).join('') + '\n';
      case 'taskList':
        return (node.content ?? []).map((n) => nodeToMd(n, 'task')).join('') + '\n';
      case 'listItem': {
        const inner = (node.content ?? []).map((n) => nodeToMd(n)).join('').replace(/\n\n$/, '');
        if (listContext === 'ordered') return `${index ?? 1}. ${inner}\n`;
        return `- ${inner}\n`;
      }
      case 'taskItem': {
        const checked = node.attrs?.checked ? 'x' : ' ';
        const inner = (node.content ?? []).map((n) => nodeToMd(n)).join('').replace(/\n\n$/, '');
        return `- [${checked}] ${inner}\n`;
      }
      case 'blockquote':
        return children.split('\n').map((l) => l ? `> ${l}` : '>').join('\n') + '\n\n';
      case 'codeBlock':
        return `\`\`\`${node.attrs?.language ?? ''}\n${children}\n\`\`\`\n\n`;
      case 'horizontalRule':
        return '---\n\n';
      case 'table': {
        const rows = node.content ?? [];
        return rows.map((row, rowIdx) => {
          const cells = (row.content ?? []).map((cell) =>
            (cell.content ?? []).map((n) => nodeToMd(n)).join('').replace(/\n+/g, ' ').trim()
          );
          const line = `| ${cells.join(' | ')} |`;
          if (rowIdx === 0) {
            const sep = `| ${cells.map(() => '---').join(' | ')} |`;
            return `${line}\n${sep}`;
          }
          return line;
        }).join('\n') + '\n\n';
      }
      case 'calloutBlock': {
        const emoji = node.attrs?.emoji ?? '💡';
        return `> ${emoji} ${children.trim()}\n\n`;
      }
      case 'toggleBlock':
        return `<details>\n<summary>Toggle</summary>\n\n${children}</details>\n\n`;
      default:
        return children;
    }
  }

  return (content.content ?? []).map((n) => nodeToMd(n)).join('').trim();
}
