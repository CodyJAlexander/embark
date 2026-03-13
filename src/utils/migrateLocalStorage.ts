import { api } from '../lib/api';

export async function migrateClientsFromLocalStorage(): Promise<number> {
  // Guard: don't migrate twice
  if (localStorage.getItem('embark-migrated-clients') === 'true') return 0;

  const raw = localStorage.getItem('embark-clients');
  if (!raw) {
    localStorage.setItem('embark-migrated-clients', 'true');
    return 0;
  }

  let clients: unknown[];
  try {
    clients = JSON.parse(raw);
    if (!Array.isArray(clients)) return 0;
  } catch {
    return 0;
  }

  let migrated = 0;
  for (const client of clients) {
    if (!client || typeof client !== 'object') continue;
    const c = client as Record<string, unknown>;
    const res = await api.post('/api/v1/clients', {
      name:           c.name,
      status:         c.status,
      lifecycleStage: c.lifecycleStage,
      industry:       c.industry,
      website:        c.website,
    });
    if (res.data) migrated++;
  }

  // Mark migration complete so it never runs again
  localStorage.setItem('embark-migrated-clients', 'true');
  return migrated;
}
