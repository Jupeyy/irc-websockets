CREATE TABLE IF NOT EXISTS friends(
  ID          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_a_id   INTEGER NOT NULL,
  user_b_id   INTEGER NOT NULL,
  created_at  TEXT        NOT NULL,
  updated_at  TEXT        NOT NULL,
  UNIQUE(user_a_id, user_b_id)
);

