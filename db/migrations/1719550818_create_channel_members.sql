CREATE TABLE IF NOT EXISTS channel_members(
  ID                           INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id                   INTEGER     NOT NULL,
  user_id                      INTEGER     NOT NULL,
  lowest_requested_msg_id      INTEGER, -- can't be set by user. used for "has seen" tracking.
  highest_requested_msg_id     INTEGER, -- can't be set by user. used for "has seen" tracking and unred messages.
  unred_msg_id                 INTEGER, -- can be set be the user. used to mark messages as unred manually.
  has_write_access             INTEGER     NOT NULL DEFAULT 1,
  created_at                   TEXT        NOT NULL,
  updated_at                   TEXT        NOT NULL,
  UNIQUE(channel_id, user_id)
);
