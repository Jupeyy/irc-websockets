use chrono::Utc;
use rusqlite::{params, Row};

#[allow(dead_code)]
#[derive(Debug, Clone)]
pub struct ChannelMemberRow {
    pub id: i64,
    pub channel_id: i64,
    pub user_id: i64,
    pub lowest_requested_msg_id: Option<i64>,
    pub highest_requested_msg_id: Option<i64>,
    pub unred_msg_id: Option<i64>,
    pub has_write_access: i64,
    pub created_at: String,
    pub updated_at: String,
}

fn map_row(row: &Row) -> rusqlite::Result<ChannelMemberRow> {
    Ok(ChannelMemberRow {
        id: row.get(0)?,
        channel_id: row.get(1)?,
        user_id: row.get(2)?,
        lowest_requested_msg_id: row.get(3).ok(),
        highest_requested_msg_id: row.get(4).ok(),
        unred_msg_id: row.get(5).ok(),
        has_write_access: row.get(6)?,
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
    })
}

pub fn find_by_user_and_channel(conn: &rusqlite::Connection, user_id: i64, channel_id: i64) -> Option<ChannelMemberRow> {
    conn.prepare("SELECT * FROM channel_members WHERE user_id = ? AND channel_id = ?")
        .ok()
        .and_then(|mut st| st.query_row(params![user_id, channel_id], map_row).ok())
}

pub fn insert(
    conn: &rusqlite::Connection,
    channel_id: i64,
    user_id: i64,
    lowest_requested_msg_id: Option<i64>,
    highest_requested_msg_id: Option<i64>,
    unred_msg_id: Option<i64>,
    has_write_access: i64,
) -> rusqlite::Result<i64> {
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO channel_members(channel_id, user_id, lowest_requested_msg_id, highest_requested_msg_id, unred_msg_id, has_write_access, created_at, updated_at) VALUES(?, ?, ?, ?, ?, ?, ?, ?)",
        params![channel_id, user_id, lowest_requested_msg_id, highest_requested_msg_id, unred_msg_id, has_write_access, now, now],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn update(conn: &rusqlite::Connection, row: &ChannelMemberRow) -> rusqlite::Result<()> {
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE channel_members SET channel_id = ?, user_id = ?, lowest_requested_msg_id = ?, highest_requested_msg_id = ?, unred_msg_id = ?, has_write_access = ?, updated_at = ? WHERE ID = ?",
        params![row.channel_id, row.user_id, row.lowest_requested_msg_id, row.highest_requested_msg_id, row.unred_msg_id, row.has_write_access, now, row.id],
    )?;
    Ok(())
}
