use std::{collections::HashMap, fs, path::Path};

use regex::Regex;
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicI64, Ordering};
use parking_lot::Mutex;

use crate::types::IrcMessage;

#[derive(Clone)]
pub struct HistoryStore {
    max_backlog: usize,
    messages: ArcRobin,
    latest_id: std::sync::Arc<AtomicI64>,
}

type ArcRobin = std::sync::Arc<Mutex<HashMap<String, Vec<IrcMessage>>>>;

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
struct DiskFormat(HashMap<String, Vec<IrcMessage>>);

impl HistoryStore {
    pub fn load(max_backlog: usize) -> Self {
        let path = Path::new("message_log.json");
        let robin: HashMap<String, Vec<IrcMessage>> = if path.exists() {
            tracing::info!("[*] loading message_log.json ...");
            match fs::read_to_string(path) {
                Ok(s) => serde_json::from_str::<DiskFormat>(&s).map(|d| d.0).unwrap_or_default(),
                Err(_) => HashMap::new(),
            }
        } else {
            HashMap::new()
        };
        let latest = Self::compute_highest_id(&robin);
        if latest > 0 {
            let num_msgs: usize = robin.values().map(|v| v.len()).sum();
            tracing::info!("[*] loaded {} messages continuing at id {}", num_msgs, latest);
        }
        Self {
            max_backlog,
            messages: std::sync::Arc::new(Mutex::new(robin)),
            latest_id: std::sync::Arc::new(AtomicI64::new(latest)),
        }
    }

    fn compute_highest_id(map: &HashMap<String, Vec<IrcMessage>>) -> i64 {
        map.values()
            .filter_map(|v| v.last().map(|m| m.id))
            .max()
            .unwrap_or(0)
    }

    pub fn next_id(&self) -> i64 {
        self.latest_id.fetch_add(1, Ordering::SeqCst) + 1
    }

    pub fn channel_uid(server: &str, channel: &str) -> String {
        format!("{}#{}", server, channel)
    }

    pub fn log_message(&self, server: &str, channel: &str, msg: IrcMessage) {
        let key = Self::channel_uid(server, channel);
        let mut guard = self.messages.lock();
        let entry = guard.entry(key).or_default();
        entry.push(msg);
        let max = self.max_backlog;
        if entry.len() > max {
            let excess = entry.len() - max;
            entry.drain(0..excess);
        }
    }

    pub fn save_to_disk(&self) -> anyhow::Result<()> {
        let guard = self.messages.lock();
        let serialized = serde_json::to_string(&DiskFormat(guard.clone()))?;
        fs::write("message_log.json", serialized)?;
        Ok(())
    }

    pub fn get_messages(
        &self,
        server: &str,
        channel: &str,
        opts: MessageLogOptions,
    ) -> Vec<IrcMessage> {
        let key = Self::channel_uid(server, channel);
        let guard = self.messages.lock();
        let msgs = match guard.get(&key) {
            Some(v) => v.clone(),
            None => return vec![],
        };
        let filter = |m: &IrcMessage| -> bool {
            if let Some(ref s) = opts.search_str {
                if !s.is_empty() && !(m.message.contains(s) || m.from.contains(s)) {
                    return false;
                }
            }
            if let Some(ref p) = opts.search_pattern {
                if !p.is_empty() {
                    if let Ok(re) = Regex::new(p) {
                        if !(re.is_match(&m.message) || re.is_match(&m.from)) {
                            return false;
                        }
                    }
                }
            }
            true
        };

        if opts.from_id == 0 {
            let filtered: Vec<IrcMessage> = msgs.into_iter().filter(filter).collect();
            if opts.count == 0 { return filtered; }
            let count = opts.count as usize;
            let len = filtered.len();
            return filtered.into_iter().skip(len.saturating_sub(count)).collect();
        }

        let mut out = Vec::new();
        for m in msgs.into_iter().filter(filter) {
            if m.id < opts.from_id { continue; }
            if opts.count != 0 && out.len() >= opts.count as usize { break; }
            out.push(m);
        }
        out
    }
}

#[derive(Debug, Clone, Default)]
pub struct MessageLogOptions {
    pub from_id: i64,
    pub count: i64,
    pub search_str: Option<String>,
    pub search_pattern: Option<String>,
}
