ALTER TABLE "clients" ADD COLUMN "client_data" jsonb DEFAULT '{}'::jsonb NOT NULL;
