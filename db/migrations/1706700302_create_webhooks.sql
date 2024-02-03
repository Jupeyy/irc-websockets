-- TODO: create Channels table and use its id
--        instead of `discord_server` and `discord_channel`
CREATE TABLE IF NOT EXISTS webhooks(
  ID              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT UNIQUE NOT NULL, -- TODO: remove unique constraint
  token           TEXT        NOT NULL,
  discord_server  TEXT        NOT NULL,
  discord_channel TEXT        NOT NULL,
  register_ip     TEXT        NOT NULL,
  last_use_ip     TEXT        NOT NULL,
  created_at      TEXT        NOT NULL,
  updated_at      TEXT        NOT NULL,
  owner_id        INTEGER     NOT NULL
);
