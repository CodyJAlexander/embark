import { useState } from 'react';
import type { StudioTemplate, StudioTemplateCategory } from '../../../types';
import { TemplateCard } from './TemplateCard';

type GalleryTab = 'browse' | 'mine';

const CATEGORY_LABELS: { value: StudioTemplateCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'planning', label: 'Planning' },
  { value: 'process', label: 'Process' },
  { value: 'reference', label: 'Reference' },
  { value: 'custom', label: 'Custom' },
];

interface Props {
  templates: StudioTemplate[];
  onUse: (id: string) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}

export function TemplateGallery({ templates, onUse, onDelete, onBack }: Props) {
  const [activeTab, setActiveTab] = useState<GalleryTab>('browse');
  const [category, setCategory] = useState<StudioTemplateCategory | 'all'>('all');

  const builtIn = templates.filter((t) => t.isBuiltIn);
  const mine = templates.filter((t) => !t.isBuiltIn);

  const sourceList = activeTab === 'browse' ? builtIn : mine;
  const filtered = category === 'all'
    ? sourceList
    : sourceList.filter((t) => t.category === category);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Pages
        </button>
        <div>
          <h1 className="text-2xl font-black text-zinc-100">Templates</h1>
          <p className="text-sm text-zinc-400">Start from a pre-built template</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {(['browse', 'mine'] as GalleryTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-bold rounded-[4px] transition-all ${
              activeTab === tab
                ? 'bg-yellow-400 text-zinc-900 shadow-[2px_2px_0_0_#18181b]'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            {tab === 'browse' ? `Browse (${builtIn.length})` : `Mine (${mine.length})`}
          </button>
        ))}
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {CATEGORY_LABELS.map((c) => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            className={`px-3 py-1 text-xs font-bold rounded-full border transition-all ${
              category === c.value
                ? 'bg-zinc-100 text-zinc-900 border-zinc-100'
                : 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-4xl mb-3">🗂️</div>
            <p className="text-zinc-400 font-medium">
              {activeTab === 'mine'
                ? 'No custom templates yet'
                : 'No templates in this category'}
            </p>
            {activeTab === 'mine' && (
              <p className="text-zinc-500 text-sm mt-1">
                Open a page and use "Save as Template" from the ··· menu
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                onUse={onUse}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
