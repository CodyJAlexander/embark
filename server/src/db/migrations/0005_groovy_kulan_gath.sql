CREATE TABLE "studio_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_id" uuid NOT NULL,
	"user_id" uuid,
	"comment_id" text NOT NULL,
	"body" text NOT NULL,
	"resolved_at" timestamp with time zone,
	"parent_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "studio_comments" ADD CONSTRAINT "studio_comments_page_id_studio_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."studio_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_comments" ADD CONSTRAINT "studio_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_comments" ADD CONSTRAINT "studio_comments_parent_id_studio_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."studio_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_studio_comments_page" ON "studio_comments" USING btree ("page_id");