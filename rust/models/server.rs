use rusqlite::{params, Row};

#[allow(dead_code)]
#[derive(Debug, Clone)]
pub struct ServerRow {
    pub id: i64,
    pub name: String,
    pub discord_name: String,
    pub irc_name: String,
    pub irc_ip: String,
    pub icon_url: String,
    pub banner_url: String,
    pub register_ip: String,
    pub owner_id: i64,
    pub created_at: String,
    pub updated_at: String,
}

fn map_row(row: &Row) -> rusqlite::Result<ServerRow> {
    Ok(ServerRow {
        id: row.get(0)?,
        name: row.get(1)?,
        discord_name: row.get(2)?,
        irc_name: row.get(3)?,
        irc_ip: row.get(4)?,
        icon_url: row.get(5)?,
        banner_url: row.get(6)?,
        register_ip: row.get(7)?,
        owner_id: row.get(8)?,
        created_at: row.get(9)?,
        updated_at: row.get(10)?,
    })
}

pub fn find(conn: &rusqlite::Connection, id: i64) -> Option<ServerRow> {
    conn.prepare("SELECT * FROM servers WHERE ID = ?")
        .ok()
        .and_then(|mut st| st.query_row(params![id], map_row).ok())
}

pub fn all(conn: &rusqlite::Connection) -> Vec<ServerRow> {
    let mut st = match conn.prepare("SELECT * FROM servers") { Ok(s) => s, Err(_) => return vec![] };
    let iter = st.query_map([], map_row).ok();
    match iter { Some(rows) => rows.filter_map(|r| r.ok()).collect(), None => vec![] }
}
