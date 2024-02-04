CREATE TABLE IF NOT EXISTS servers(
  ID              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT        NOT NULL,
  discord_name    TEXT        NOT NULL,
  irc_name        TEXT        NOT NULL,
  irc_ip          TEXT        NOT NULL,
  icon_url        TEXT        NOT NULL,
  banner_url      TEXT        NOT NULL DEFAULT '',
  register_ip     TEXT        NOT NULL,
  owner_id        INTEGER     NOT NULL,
  created_at      TEXT        NOT NULL,
  updated_at      TEXT        NOT NULL
);
