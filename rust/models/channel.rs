use rusqlite::{params, Row};

#[allow(dead_code)]
#[derive(Debug, Clone)]
pub struct ChannelRow {
    pub id: i64,
    pub name: String,
    pub description: String,
    pub discord_server: String,
    pub discord_channel: String,
    pub irc_channel: String,
    pub irc_server_ip: String,
    pub irc_server_name: String,
    pub server_id: i64,
    pub created_at: String,
    pub updated_at: String,
    pub is_private: i64,
    pub owner_id: i64,
}

fn map_row(row: &Row) -> rusqlite::Result<ChannelRow> {
    Ok(ChannelRow {
        id: row.get(0)?,
        name: row.get(1)?,
        description: row.get(2)?,
        discord_server: row.get(3)?,
        discord_channel: row.get(4)?,
        irc_channel: row.get(5)?,
        irc_server_ip: row.get(6)?,
        irc_server_name: row.get(7)?,
        server_id: row.get(8)?,
        created_at: row.get(9)?,
        updated_at: row.get(10)?,
        is_private: row.get(11)?,
        owner_id: row.get(12)?,
    })
}

pub fn find(conn: &rusqlite::Connection, id: i64) -> Option<ChannelRow> {
    conn.prepare("SELECT * FROM channels WHERE ID = ?")
        .ok()
        .and_then(|mut st| st.query_row(params![id], map_row).ok())
}

pub fn find_by_discord(conn: &rusqlite::Connection, server: &str, channel: &str) -> Option<ChannelRow> {
    conn.prepare("SELECT * FROM channels WHERE discord_server = ? AND discord_channel = ?")
        .ok()
        .and_then(|mut st| st.query_row(params![server, channel], map_row).ok())
}

pub fn all(conn: &rusqlite::Connection) -> Vec<ChannelRow> {
    let mut st = match conn.prepare("SELECT * FROM channels") { Ok(s) => s, Err(_) => return vec![] };
    let iter = st.query_map([], map_row).ok();
    match iter { Some(rows) => rows.filter_map(|r| r.ok()).collect(), None => vec![] }
}

pub fn where_eq(conn: &rusqlite::Connection, column: &str, value: &str) -> Vec<ChannelRow> {
    if !column.chars().all(|c| c.is_ascii_lowercase() || c == '_') { return vec![]; }
    let sql = format!("SELECT * FROM channels WHERE {} = ?", column);
    let mut st = match conn.prepare(&sql) { Ok(s) => s, Err(_) => return vec![] };
    let rows = st.query_map([value], map_row).ok();
    match rows { Some(rows) => rows.filter_map(|r| r.ok()).collect(), None => vec![] }
}
