use std::{env, fs, path::PathBuf};

use regex::Regex;
use rusqlite::Connection;

fn get_db() -> Connection {
    let conn = Connection::open("./db/main.db").expect("open db");
    conn.pragma_update(None, "journal_mode", &"WAL").ok();
    conn
}

fn get_db_version(conn: &Connection) -> i64 {
    let mut stmt = conn.prepare("PRAGMA user_version").unwrap();
    let mut rows = stmt.query([]).unwrap();
    let row = rows.next().unwrap().unwrap();
    row.get(0).unwrap_or(0)
}

fn set_db_version(conn: &Connection, version: i64) -> bool {
    conn.pragma_update(None, "user_version", &version).is_ok()
}

fn migrations_dir() -> PathBuf {
    PathBuf::from("db/migrations")
}

fn migrate(force: bool) {
    let conn = get_db();
    let latest = get_db_version(&conn);
    let re = Regex::new(r"^(\d{10})_[a-zA-Z0-9_]+\.sql$").unwrap();
    let mut files: Vec<_> = fs::read_dir(migrations_dir()).unwrap().filter_map(|e| e.ok()).collect();
    files.sort_by_key(|e| e.file_name());
    for entry in files {
        let name = entry.file_name();
        let name = name.to_string_lossy();
        if let Some(cap) = re.captures(&name) {
            let ts: i64 = cap[1].parse().unwrap();
            if ts <= latest { println!("[*] already ran {} ...", name); continue; }
            println!("[*] applying {} ...", name);
            let sql = fs::read_to_string(entry.path()).unwrap();
            let lower = sql.to_lowercase();
            if (lower.contains("warning") || lower.contains("drop table")) && !force {
                eprintln!("[!] Unsafe migration detected. Re-run with --force if intended.");
                std::process::exit(1);
            }
            conn.execute_batch(&sql).unwrap();
            set_db_version(&conn, ts);
        }
    }
}

fn usage() {
    println!("usage: db-cli [migrate] [--force]");
}

fn main() {
    let args = env::args().skip(1);
    let mut action = String::new();
    let mut force = false;
    for a in args { if a == "--force" { force = true; } else { action = a; } }
    match action.as_str() {
        "migrate" => migrate(force),
        _ => usage(),
    }
}
