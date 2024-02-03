CREATE TABLE IF NOT EXISTS webhooks(
  ID              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT        NOT NULL,
  token           TEXT        NOT NULL,
  channel_id      INTEGER     NOT NULL,
  register_ip     TEXT        NOT NULL,
  last_use_ip     TEXT        NOT NULL,
  created_at      TEXT        NOT NULL,
  updated_at      TEXT        NOT NULL,
  owner_id        INTEGER     NOT NULL
);
