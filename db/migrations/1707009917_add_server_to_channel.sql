-- TODO: remove default when migrated in prod
ALTER TABLE channels
ADD COLUMN server_id INTEGER NOT NULL DEFAULT 0;
