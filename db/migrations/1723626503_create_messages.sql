CREATE TABLE IF NOT EXISTS messages(
  ID                           INTEGER PRIMARY KEY AUTOINCREMENT,
  -- either it is a dm then this is non zero
  friend_id                    INTEGER     NOT NULL,

  -- or it is in a channel then both of these are non zero
  server_id                    INTEGER     NOT NULL,
  channel_id                   INTEGER     NOT NULL,

  -- message author
  user_id                      INTEGER     NOT NULL,
  content                      TEXT        NOT NULL,
  created_at                   TEXT        NOT NULL,
  updated_at                   TEXT        NOT NULL
);
