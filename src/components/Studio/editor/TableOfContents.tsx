import type { JSONContent } from '@tiptap/core';

interface Heading {
  level: 1 | 2 | 3;
  text: string;
  index: number; // position in the headings list, for scroll targeting
}

function extractHeadings(content: JSONContent): Heading[] {
  const headings: Heading[] = [];
  let index = 0;

  function walk(node: JSONContent) {
    if (node.type === 'heading' && node.attrs?.level && node.content) {
      const level = node.attrs.level as 1 | 2 | 3;
      const text = node.content
        .filter((n) => n.type === 'text')
        .map((n) => n.text ?? '')
        .join('');
      if (text.trim()) {
        headings.push({ level, text, index: index++ });
      }
    }
    node.content?.forEach(walk);
  }

  walk(content);
  return headings;
}

interface Props {
  content: JSONContent;
  editorScrollRef: React.RefObject<HTMLDivElement | null>;
}

export function TableOfContents({ content, editorScrollRef }: Props) {
  const headings = extractHeadings(content);

  function scrollToHeading(index: number) {
    if (!editorScrollRef.current) return;
    // Find all h1/h2/h3 elements in the editor scroll container
    const els = editorScrollRef.current.querySelectorAll('h1, h2, h3');
    const target = els[index];
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  if (headings.length === 0) {
    return (
      <div className="w-52 flex-shrink-0 border-l-2 border-zinc-700 p-3">
        <p className="text-xs font-bold text-zinc-600 uppercase tracking-wider mb-2">Contents</p>
        <p className="text-xs text-zinc-600">No headings yet.<br />Add H1, H2, or H3 to build a TOC.</p>
      </div>
    );
  }

  return (
    <div className="w-52 flex-shrink-0 border-l-2 border-zinc-700 p-3 overflow-y-auto">
      <p className="text-xs font-bold text-zinc-600 uppercase tracking-wider mb-2">Contents</p>
      <div className="space-y-0.5">
        {headings.map((h, i) => (
          <button
            key={i}
            onClick={() => scrollToHeading(h.index)}
            className={`w-full text-left text-xs hover:text-yellow-400 transition-colors truncate block ${
              h.level === 1 ? 'text-zinc-300 font-bold pl-0' :
              h.level === 2 ? 'text-zinc-400 font-medium pl-3' :
              'text-zinc-500 pl-6'
            }`}
            title={h.text}
          >
            {h.text}
          </button>
        ))}
      </div>
    </div>
  );
}
