import type { StudioPage, StudioBlock } from '../types';

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

/** Convert StudioBlock[] to plain text for AI context injection. */
export function blocksToPlainText(blocks: StudioBlock[]): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case 'heading1': return `# ${block.content}`;
        case 'heading2': return `## ${block.content}`;
        case 'heading3': return `### ${block.content}`;
        case 'todo': return `- [${block.checked ? 'x' : ' '}] ${block.content}`;
        case 'bullet': return `- ${block.content}`;
        case 'numbered': return `1. ${block.content}`;
        case 'quote': return `> ${block.content}`;
        case 'callout': return `> 💡 ${block.content}`;
        case 'code': return `\`\`\`\n${block.content}\n\`\`\``;
        case 'divider': return '---';
        case 'paragraph':
        default: return block.content;
      }
    })
    .filter(Boolean)
    .join('\n');
}
