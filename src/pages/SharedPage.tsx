import { useEffect, useState } from 'react';
import type { JSONContent } from '@tiptap/core';
import { TiptapEditor } from '../components/Studio/editor/TiptapEditor';

interface PageData {
  id: string;
  title: string;
  icon: string;
  content: JSONContent;
}

const GUEST_USER = {
  id: 'guest',
  name: 'Guest',
  color: '#a1a1aa',
};

interface Props {
  token: string;
}

export default function SharedPage({ token }: Props) {
  const [page, setPage] = useState<PageData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/v1/public/pages/${token}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setPage(res.data);
        else setError(true);
      })
      .catch(() => setError(true));
  }, [token]);

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-3">🔒</p>
          <p className="text-zinc-400 font-medium">This page is not publicly available.</p>
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Embark branding header */}
      <div className="border-b-2 border-zinc-800 px-6 py-3 flex items-center gap-3">
        <span className="text-yellow-400 font-black text-lg">Embark</span>
        <span className="text-zinc-600 text-sm">/ shared page</span>
      </div>

      {/* Page content */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">{page.icon}</span>
          <h1 className="text-3xl font-black text-zinc-100">{page.title || 'Untitled'}</h1>
        </div>
        <TiptapEditor
          pageId={`shared-${page.id}`}
          currentUser={GUEST_USER}
          onChange={() => {}}
          editable={false}
          initialContent={page.content}
        />
      </div>
    </div>
  );
}
