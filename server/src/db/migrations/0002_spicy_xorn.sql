ALTER TABLE "clients" ADD COLUMN "client_data" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "studio_pages" ADD COLUMN "sort_order" integer;--> statement-breakpoint
ALTER TABLE "studio_pages" ADD COLUMN "cover_url" text;--> statement-breakpoint
ALTER TABLE "studio_pages" ADD COLUMN "share_token" text;--> statement-breakpoint
ALTER TABLE "studio_pages" ADD CONSTRAINT "studio_pages_share_token_unique" UNIQUE("share_token");