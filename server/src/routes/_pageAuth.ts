import { db } from '../db/index.js';
import { studioPages } from '../db/schema.js';
import { and, eq } from 'drizzle-orm';

export async function assertPageOwner(pageId: string, userId: string): Promise<boolean> {
  const [page] = await db
    .select({ id: studioPages.id })
    .from(studioPages)
    .where(and(eq(studioPages.id, pageId), eq(studioPages.createdBy, userId)))
    .limit(1);
  return !!page;
}
