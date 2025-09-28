use anyhow::Result;
use chrono::Utc;
use rand::RngCore;
use rusqlite::{params, Row};

#[allow(dead_code)]
#[derive(Debug, Clone)]
pub struct UserRow {
    pub id: i64,
    pub username: String,
    pub password: String,
    pub register_ip: String,
    pub login_ip: String,
    pub created_at: String,
    pub updated_at: String,
    pub is_admin: i64,
    pub is_blocked: i64,
    pub token: Option<String>,
}

#[allow(dead_code)]
impl UserRow {
    pub fn blocked(&self) -> bool { self.is_blocked == 1 }
    pub fn admin(&self) -> bool { self.is_admin == 1 }
}

fn map_row(row: &Row) -> rusqlite::Result<UserRow> {
    Ok(UserRow {
        id: row.get(0)?,
        username: row.get(1)?,
        password: row.get(2)?,
        register_ip: row.get(3)?,
        login_ip: row.get(4)?,
        created_at: row.get(5)?,
        updated_at: row.get(6)?,
        is_admin: row.get(7)?,
        is_blocked: row.get(8)?,
        token: row.get(9).ok(),
    })
}

pub fn is_username_taken(conn: &rusqlite::Connection, username: &str) -> bool {
    conn.prepare("SELECT 1 FROM users WHERE username = ? LIMIT 1")
        .and_then(|mut st| st.exists(params![username]))
        .unwrap_or(false)
}

#[allow(dead_code)]
pub fn find(conn: &rusqlite::Connection, id: i64) -> Option<UserRow> {
    conn.prepare("SELECT * FROM users WHERE ID = ?")
        .ok()
        .and_then(|mut st| st.query_row(params![id], map_row).ok())
}

pub fn find_by_credentials(conn: &rusqlite::Connection, username: &str, password: &str) -> Option<UserRow> {
    conn.prepare("SELECT * FROM users WHERE username = ? AND password = ?")
        .ok()
        .and_then(|mut st| st.query_row(params![username, password], map_row).ok())
}

#[allow(dead_code)]
pub fn find_by_token(conn: &rusqlite::Connection, token: &str) -> Option<UserRow> {
    conn.prepare("SELECT * FROM users WHERE token = ?")
        .ok()
        .and_then(|mut st| st.query_row(params![token], map_row).ok())
}

pub fn insert(conn: &rusqlite::Connection, username: &str, password: &str, register_ip: &str) -> Result<i64> {
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO users(username, password, register_ip, login_ip, created_at, updated_at, is_admin, is_blocked, token) VALUES(?, ?, ?, '', ?, ?, 0, 0, NULL)",
        params![username, password, register_ip, now, now],
    )?;
    Ok(conn.last_insert_rowid())
}

#[allow(dead_code)]
pub fn update(conn: &rusqlite::Connection, row: &UserRow) -> Result<()> {
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE users SET username = ?, password = ?, is_admin = ?, is_blocked = ?, updated_at = ?, token = ? WHERE ID = ?",
        params![row.username, row.password, row.is_admin, row.is_blocked, now, row.token, row.id],
    )?;
    Ok(())
}

#[allow(dead_code)]
pub fn all(conn: &rusqlite::Connection) -> Vec<UserRow> {
    let mut st = match conn.prepare("SELECT * FROM users") { Ok(s) => s, Err(_) => return vec![] };
    let iter = st.query_map([], map_row).ok();
    match iter {
        Some(rows) => rows.filter_map(|r| r.ok()).collect(),
        None => vec![]
    }
}

#[allow(dead_code)]
pub fn get_or_create_token(conn: &rusqlite::Connection, mut row: UserRow) -> Result<String> {
    if let Some(t) = &row.token { return Ok(t.clone()); }
    // generate random hex token; ensure unique
    loop {
        let mut bytes = [0u8; 22];
        rand::thread_rng().fill_bytes(&mut bytes);
        let token = hex::encode(bytes);
        if find_by_token(conn, &token).is_none() {
            row.token = Some(token.clone());
            update(conn, &row)?;
            return Ok(token);
        }
    }
}
