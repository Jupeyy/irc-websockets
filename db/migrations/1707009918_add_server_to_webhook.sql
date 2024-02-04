-- TODO: remove default when migrated in prod

-- we have the information via channels
-- but i want a cleaner sql query and not iterate all channels when trying
-- to list all webhooks for a server
ALTER TABLE webhooks
ADD COLUMN server_id INTEGER NOT NULL DEFAULT 0;
