use chrono::Utc;
use rusqlite::{params, Row};

#[allow(dead_code)]
#[derive(Debug, Clone)]
pub struct WebhookRow {
    pub id: i64,
    pub name: String,
    pub token: String,
    pub server_id: i64,
    pub channel_id: i64,
    pub register_ip: String,
    pub last_use_ip: String,
    pub created_at: String,
    pub updated_at: String,
    pub owner_id: i64,
}

fn map_row(row: &Row) -> rusqlite::Result<WebhookRow> {
    Ok(WebhookRow {
        id: row.get(0)?,
        name: row.get(1)?,
        token: row.get(2)?,
        server_id: row.get(3)?,
        channel_id: row.get(4)?,
        register_ip: row.get(5)?,
        last_use_ip: row.get(6)?,
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
        owner_id: row.get(9)?,
    })
}

// find_by_credentials no longer used in the Rust port

pub fn where_eq(conn: &rusqlite::Connection, column: &str, value: i64) -> Vec<WebhookRow> {
    if !column.chars().all(|c| c.is_ascii_lowercase() || c == '_') { return vec![]; }
    let sql = format!("SELECT * FROM webhooks WHERE {} = ?", column);
    let mut st = match conn.prepare(&sql) { Ok(s) => s, Err(_) => return vec![] };
    let rows = st.query_map([value], map_row).ok();
    match rows { Some(rows) => rows.filter_map(|r| r.ok()).collect(), None => vec![] }
}

pub fn insert(
    conn: &rusqlite::Connection,
    name: &str,
    token: &str,
    server_id: i64,
    channel_id: i64,
    register_ip: &str,
    last_use_ip: &str,
    owner_id: i64,
) -> rusqlite::Result<i64> {
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO webhooks(name, token, server_id, channel_id, register_ip, last_use_ip, created_at, updated_at, owner_id) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params![name, token, server_id, channel_id, register_ip, last_use_ip, now, now, owner_id],
    )?;
    Ok(conn.last_insert_rowid())
}
