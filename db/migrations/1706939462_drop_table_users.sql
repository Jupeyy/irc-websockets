BEGIN TRANSACTION;

-- new schema with new DEFAULT
-- which there is no alter table command in sqlite for
CREATE TABLE IF NOT EXISTS users_new(
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

-- move data from old table to new table
INSERT INTO users_new (
  ID,
  username,
  password,
  register_ip,
  login_ip,
  created_at,
  updated_at,
  is_admin,
  is_blocked
)
SELECT
  ID,
  username,
  password,
  register_ip,
  login_ip,
  created_at,
  updated_at,
  is_admin,
  is_blocked
FROM users;

-- replace old table with new table
DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

COMMIT;
