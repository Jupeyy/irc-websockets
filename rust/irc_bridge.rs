
use irc::client::prelude::*;
use futures::StreamExt;
use tokio::sync::mpsc;
use tokio::time::{sleep, Duration};
use tracing::{error, info, warn};

use crate::models::channel;
use crate::state::AppState;
use crate::types::IrcMessage;

#[allow(dead_code)]
#[derive(Debug, Clone)]
pub struct ChannelMapping {
    pub id: i64,
    pub server_id: i64,
    pub description: String,
    pub irc_server_ip: String,
    pub irc_server_name: String,
    pub irc_channel: String,
    pub discord_server: String,
    pub discord_channel: String,
    pub is_private: bool,
}

pub fn get_connected_irc_channels(state: &AppState) -> Vec<ChannelMapping> {
    let conn = state.db.lock();
    let rows = channel::all(&conn);
    rows.into_iter()
        .map(|c| ChannelMapping {
            id: c.id,
            server_id: c.server_id,
            description: c.description,
            irc_server_ip: c.irc_server_ip,
            irc_server_name: c.irc_server_name,
            irc_channel: c.irc_channel,
            discord_server: c.discord_server,
            discord_channel: c.discord_channel,
            is_private: c.is_private == 1,
        })
        .collect()
}

pub fn active_irc_channels(state: &AppState) -> Vec<String> {
    get_connected_irc_channels(state)
        .into_iter()
        .map(|e| e.irc_channel)
        .collect()
}

// no longer used

pub async fn start(state: &AppState) -> anyhow::Result<()> {
    if state.config.lock().dry_irc {
        info!("[mock-irc] enabled");
        start_mock(state.clone());
        return Ok(());
    }
    // Spawn real IRC task
    let server = state.config.lock().irc_server.clone();
    let channels = active_irc_channels(state);
    let state_clone = state.clone();
    let (tx, rx) = mpsc::unbounded_channel();
    {
        let mut guard = state.irc_tx.lock();
        *guard = Some(tx);
    }
    tokio::spawn(async move {
        if let Err(e) = run_irc(state_clone, &server, &channels, rx).await {
            error!("irc loop error: {e}");
        }
    });
    Ok(())
}

fn start_mock(state: AppState) {
    let mappings = get_connected_irc_channels(&state);
    // Periodically generate messages
    tokio::spawn(async move {
        loop {
            for mapping in &mappings {
                // Random chance to emit message
                if rand::random::<f32>() > 0.9 {
                    let msg = IrcMessage {
                        id: state.history.next_id(),
                        from: "mock_user".into(),
                        message: format!("fake mock message (sent at {})", chrono::Local::now().format("%H:%M:%S")),
                        channel: mapping.discord_channel.clone(),
                        server: mapping.discord_server.clone(),
                        date: chrono::Utc::now().to_rfc2822(),
                        token: None,
                    };
                    state.history.log_message(&mapping.discord_server, &mapping.discord_channel, msg.clone());
                    // broadcast to ws room for server
                    // The websocket layer will handle broadcasting when add_message is used in ws
                }
            }
            sleep(Duration::from_millis(5000)).await;
        }
    });
}

#[derive(Debug, Clone)]
pub enum IrcCmd {
    Privmsg { target: String, text: String },
}

async fn run_irc(state: AppState, server: &str, channels: &[String], mut rx: mpsc::UnboundedReceiver<IrcCmd>) -> anyhow::Result<()> {
    info!("connecting to irc: {}", server);
    let config = Config {
        nickname: Some("ws-client".to_string()),
        server: Some(server.to_string()),
        channels: channels.iter().map(|c| format!("#{c}")).collect(),
        use_tls: Some(true),
        port: Some(6667),
        ..Default::default()
    };
    let mut client = Client::from_config(config).await?;
    client.identify()?;

    let st = state.clone();
    let mut stream = client.stream()?;
    tokio::spawn(async move {
        let mut sent_login = false;
        while let Some(message) = stream.next().await {
            match message {
                Ok(msg) => {
                    match msg.command {
                        Command::ERROR(ref err) => error!("[-][irc] error: {}", err),
                        Command::JOIN(ref chan, _, _) => {
                            info!("[*][irc] joined '{}'", chan);
                            if !sent_login {
                                sent_login = true;
                                let (login_ch, login_msg) = {
                                    let cfg = st.config.lock();
                                    (cfg.irc_login_channel.clone(), cfg.irc_login_msg.clone())
                                };
                                if let (Some(login_ch), Some(login_msg)) = (login_ch, login_msg) {
                                    info!("[*][irc] sending login to channel '{}' ...", login_ch);
                                    let _ = st_irc_say(&st, &login_ch, &login_msg).await;
                                } else {
                                    info!("[!][irc] IRC_LOGIN_CHANNEL/MSG not set will not login");
                                }
                            }
                        }
                        Command::PRIVMSG(ref target, ref text) => {
                            if let Some(ch) = target.strip_prefix('#') {
                                if let Some(mapping) = get_connected_irc_channels(&st).into_iter().find(|m| m.irc_channel == ch) {
                                    let from = msg.source_nickname().unwrap_or("unknown").to_string();
                                    let irc_msg = IrcMessage {
                                        id: st.history.next_id(),
                                        from,
                                        message: text.clone(),
                                        channel: mapping.discord_channel.clone(),
                                        server: mapping.discord_server.clone(),
                                        date: chrono::Utc::now().to_rfc2822(),
                                        token: None,
                                    };
                                    st.history.log_message(&mapping.discord_server, &mapping.discord_channel, irc_msg);
                                }
                            }
                        }
                        _ => {}
                    }
                }
                Err(e) => warn!("irc read error: {e}"),
            }
        }
    });

    // Command sender loop
    tokio::spawn(async move {
        while let Some(cmd) = rx.recv().await {
            match cmd {
                IrcCmd::Privmsg { target, text } => {
                    if let Err(e) = client.send_privmsg(&target, &text) { warn!("irc send error: {e}"); }
                }
            }
        }
    });

    Ok(())
}

pub async fn st_irc_say(state: &AppState, target: &str, message: &str) -> anyhow::Result<()> {
    // For the async-irc client, we'd need a handle; simplicity: spawn a one-shot client per send is too heavy
    // Workaround: In this rewrite, we only support DRY_IRC send via log, and real send is handled by queued webhook or not implemented here.
    // To keep behavior close, we do nothing here when not in dry mode.
    if state.config.lock().dry_irc {
        info!("[mock-irc][{}] {}", target, message);
        return Ok(());
    }
    if let Some(tx) = state.irc_tx.lock().clone() {
        let _ = tx.send(IrcCmd::Privmsg { target: target.to_string(), text: message.to_string() });
    }
    Ok(())
}

pub async fn send_irc(state: &AppState, irc_server: &str, irc_channel: &str, message: &str) -> bool {
    if irc_server != "quakenet" {
        info!("[!] failed to send to unsupported irc server '{}'", irc_server);
        return false;
    }
    let target = format!("#{}", irc_channel);
    if let Err(e) = st_irc_say(state, &target, message).await { warn!("irc send error: {e}"); return false; }
    true
}
