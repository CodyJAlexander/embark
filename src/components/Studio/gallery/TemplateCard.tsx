import type { StudioTemplate } from '../../../types';
import { Button } from '../../UI/Button';

interface Props {
  template: StudioTemplate;
  onUse: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function TemplateCard({ template, onUse, onDelete }: Props) {
  const blockCount = template.blocks.length;

  return (
    <div className="bg-zinc-900 border-2 border-zinc-700 rounded-[4px] p-4 flex flex-col gap-3 hover:border-zinc-500 transition-colors shadow-[2px_2px_0_0_#18181b]">
      <div className="flex items-start justify-between">
        <span className="text-3xl">{template.icon}</span>
        {!template.isBuiltIn && onDelete && (
          <button
            onClick={() => { if (confirm('Delete this template?')) onDelete(template.id); }}
            className="text-zinc-600 hover:text-red-400 transition-colors p-1"
            title="Delete template"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      <div className="flex-1">
        <h3 className="font-black text-zinc-100 text-sm mb-0.5">{template.name}</h3>
        <p className="text-xs text-zinc-400 mb-2 line-clamp-2">{template.description}</p>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="font-medium text-zinc-400">{template.author}</span>
          <span>·</span>
          <span>{template.authorRole}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-600 font-medium">{blockCount} blocks</span>
        <Button size="sm" onClick={() => onUse(template.id)}>
          Use Template
        </Button>
      </div>
    </div>
  );
}
