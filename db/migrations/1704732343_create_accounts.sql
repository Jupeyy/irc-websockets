CREATE TABLE IF NOT EXISTS accounts( -- TODO: rename to users
  ID          INTEGER PRIMARY KEY AUTOINCREMENT,
  username    TEXT UNIQUE NOT NULL,
  password    TEXT        NOT NULL,
  register_ip TEXT        NOT NULL,
  login_ip    TEXT        NOT NULL,
  created_at  TEXT        NOT NULL,
  updated_at  TEXT        NOT NULL,
  is_admin    INTEGER     NOT NULL, -- TODO: default 0
  blocked     INTEGER     NOT NULL default 0 -- TODO: rename to is_blocked
);
