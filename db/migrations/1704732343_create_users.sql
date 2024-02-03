CREATE TABLE IF NOT EXISTS users(
  ID          INTEGER PRIMARY KEY AUTOINCREMENT,
  username    TEXT UNIQUE NOT NULL,
  password    TEXT        NOT NULL,
  register_ip TEXT        NOT NULL,
  login_ip    TEXT        NOT NULL,
  created_at  TEXT        NOT NULL,
  updated_at  TEXT        NOT NULL,
  is_admin    INTEGER     NOT NULL DEFAULT 0,
  is_blocked  INTEGER     NOT NULL DEFAULT 0
);
