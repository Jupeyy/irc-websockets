ALTER TABLE channels RENAME COLUMN private TO is_private;
-- does not work in sqlite3
-- ALTER TABLE channels ADD DEFAULT 0 FOR is_private;
