BEGIN TRANSACTION;

-- new schema with new DEFAULT
-- which there is no alter table command in sqlite for
CREATE TABLE IF NOT EXISTS channels_new(
  ID              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT        NOT NULL,
  description     TEXT        NOT NULL DEFAULT '',
  discord_server  TEXT        NOT NULL,
  discord_channel TEXT        NOT NULL,
  server_id       INTEGER     NOT NULL,
  irc_channel     TEXT        NOT NULL,
  irc_server_ip   TEXT        NOT NULL,
  irc_server_name TEXT        NOT NULL,
  created_at      TEXT        NOT NULL,
  updated_at      TEXT        NOT NULL,
  is_private      INTEGER     NOT NULL DEFAULT 0,
  owner_id        INTEGER     NOT NULL,
  UNIQUE(name, server_id)
);

-- move data from old table to new table
INSERT INTO channels_new (
  name,
  description,
  discord_server,
  discord_channel,
  server_id,
  irc_channel,
  irc_server_ip,
  irc_server_name,
  created_at,
  updated_at,
  is_private,
  owner_id
)
SELECT
  name,
  description,
  discord_server,
  discord_channel,
  server_id,
  irc_channel,
  irc_server_ip,
  irc_server_name,
  created_at,
  updated_at,
  is_private,
  owner_id
FROM channels;

-- replace old table with new table
DROP TABLE channels;
ALTER TABLE channels_new RENAME TO channels;

COMMIT;
