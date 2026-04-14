-- Add missing columns to studio_pages (idempotent)
ALTER TABLE "studio_pages" ADD COLUMN IF NOT EXISTS "sort_order" integer;--> statement-breakpoint
ALTER TABLE "studio_pages" ADD COLUMN IF NOT EXISTS "cover_url" text;--> statement-breakpoint
ALTER TABLE "studio_pages" ADD COLUMN IF NOT EXISTS "share_token" text;--> statement-breakpoint

-- Add unique constraint if not already present
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'studio_pages_share_token_unique'
  ) THEN
    ALTER TABLE "studio_pages"
      ADD CONSTRAINT "studio_pages_share_token_unique" UNIQUE("share_token");
  END IF;
END $$;
