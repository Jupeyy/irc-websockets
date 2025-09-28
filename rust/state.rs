use std::sync::Arc;

use dashmap::DashMap;
use parking_lot::Mutex;
use rusqlite::Connection;

use crate::{config::Config, history::HistoryStore, models};
use tokio::sync::mpsc::UnboundedSender;
use crate::irc_bridge::IrcCmd;

#[derive(Clone)]
pub struct SessionUser {
    pub username: String,
    pub session_token: String,
    pub logged_in: bool,
    pub active_channel: String,
    pub active_server: String,
    pub is_typing: bool,
    pub last_typing_ms: i64,
    pub db_user: Option<models::user::UserRow>,
}

#[derive(Clone)]
pub struct AppState {
    pub config: Arc<Mutex<Config>>,
    pub db: Arc<Mutex<Connection>>, // simple serialized access
    pub sessions: Arc<DashMap<String, SessionUser>>, // ws-session users
    pub history: Arc<HistoryStore>,
    pub irc_tx: Arc<Mutex<Option<UnboundedSender<IrcCmd>>>>,
}

impl AppState {
    pub fn new(config: &Config) -> anyhow::Result<Self> {
        let conn = Connection::open("./db/main.db")?;
        conn.pragma_update(None, "journal_mode", &"WAL")?;
        // emulate checkPendingMigrations by checking a core table exists
        if let Err(e) = conn.prepare("SELECT * FROM servers LIMIT 1") {
            eprintln!("[!] Error: test select failed: {e}");
            eprintln!("[!]        try running 'npm run db migrate' (or the Rust CLI equivalent)");
            std::process::exit(1);
        }
        let db = Arc::new(Mutex::new(conn));

        let history = Arc::new(HistoryStore::load(config.backlog_size));

        Ok(Self {
            config: Arc::new(Mutex::new(config.clone())),
            db,
            sessions: Arc::new(DashMap::new()),
            history,
            irc_tx: Arc::new(Mutex::new(None)),
        })
    }
}
