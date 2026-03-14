CREATE TABLE "studio_page_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_id" uuid NOT NULL,
	"user_id" uuid,
	"snapshot" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "studio_page_history" ADD CONSTRAINT "studio_page_history_page_id_studio_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."studio_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_page_history" ADD CONSTRAINT "studio_page_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_studio_history_page" ON "studio_page_history" USING btree ("page_id");--> statement-breakpoint
CREATE INDEX "idx_studio_history_created" ON "studio_page_history" USING btree ("created_at");