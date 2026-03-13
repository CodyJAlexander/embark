import { api } from '../lib/api';

export async function migrateClientsFromLocalStorage(): Promise<number> {
  const raw = localStorage.getItem('embark-clients');
  if (!raw) return 0;

  const clients = JSON.parse(raw);
  let migrated = 0;

  for (const client of clients) {
    const res = await api.post('/api/v1/clients', {
      name:           client.name,
      status:         client.status,
      lifecycleStage: client.lifecycleStage,
      industry:       client.industry,
      website:        client.website,
    });
    if (res.data) migrated++;
  }

  // Mark migration complete so it doesn't run again
  localStorage.setItem('embark-migrated-clients', 'true');
  return migrated;
}
