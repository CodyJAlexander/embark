-- Create teams table
CREATE TABLE IF NOT EXISTS "teams" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "invite_code" text NOT NULL,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "teams_invite_code_unique" UNIQUE("invite_code")
);--> statement-breakpoint

-- Add FK constraint from users.team_id → teams.id (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_team_id_fkey'
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_team_id_fkey"
      FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL;
  END IF;
END $$;
