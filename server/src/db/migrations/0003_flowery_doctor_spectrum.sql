ALTER TABLE "studio_pages" DROP CONSTRAINT "studio_pages_parent_id_studio_pages_id_fk";
--> statement-breakpoint
ALTER TABLE "studio_pages" ADD CONSTRAINT "studio_pages_parent_id_studio_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."studio_pages"("id") ON DELETE cascade ON UPDATE no action;