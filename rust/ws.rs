use std::time::{SystemTime, UNIX_EPOCH};

use regex::Regex;
use once_cell::sync::Lazy;
use socketioxide::{extract::{Data, SocketRef, State}, SocketIo};
use tracing::{info, warn};

use crate::{
    irc_bridge::{self, ChannelMapping},
    models::{channel as channel_model, channel_member as cm_model, server as server_model, user as user_model, webhook as webhook_model},
    state::{AppState, SessionUser},
    types::*,
    util,
};

fn username_pattern() -> Regex { Regex::new(r"^[a-zA-Z0-9_]{1,20}$").unwrap() }

fn now_ms() -> i64 { SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis() as i64 }

struct RateLimiter {
    last_sent_ms: i64,
    log: Vec<i64>,
}

impl RateLimiter {
    fn new() -> Self { Self { last_sent_ms: 0, log: Vec::new() } }
    fn is_ratelimited(&mut self, content: &str) -> bool {
        if content.contains('\n') { return true; }
        let now = now_ms();
        self.log.retain(|&t| now - t <= 8000);
        if self.log.len() > 5 { return true; }
        let diff = now - self.last_sent_ms;
        self.last_sent_ms = now;
        if diff < 3000 { self.log.push(now); }
        false
    }
}

pub fn register_handlers(io: SocketIo) {
    io.ns("/", |s: SocketRef, State(state): State<AppState>| {
        // On connect
        let sid = s.id.to_string();
        let user = SessionUser {
            username: "connecting".into(),
            session_token: util::generate_token(32),
            logged_in: false,
            active_channel: "_connecting".into(),
            active_server: "_connecting".into(),
            is_typing: false,
            last_typing_ms: now_ms(),
            db_user: None,
        };
        state.sessions.insert(sid.clone(), user);
        info!("[*] connect sid={:?}", sid);

        s.on_disconnect(|s: SocketRef, State(state): State<AppState>| {
            if let Some((_sid, user)) = state.sessions.remove(&s.id.to_string()) {
                info!("[*] '{}' left", user.username);
                let _ = s.broadcast().emit("userLeave", &user.username);
            } else {
                info!("[*] leave before login");
            }
        });

        // joinChannel
        s.on("joinChannel", |s: SocketRef, State(state): State<AppState>, Data(join): Data<JoinChannel>| async move {
            let _ = on_join_channel(s, state, join).await;
        });

        // typingInfo
        s.on("typingInfo", |s: SocketRef, State(state): State<AppState>, Data(typing): Data<TypingInfo>| {
            on_typing_info(s, state, typing);
        });

        // registerRequest
        s.on("registerRequest", |s: SocketRef, State(state): State<AppState>, Data(req): Data<RegisterRequest>| {
            on_register_request(s, state, req);
        });

        // authRequest
        s.on("authRequest", |s: SocketRef, State(state): State<AppState>, Data(req): Data<AuthRequest>| {
            let s2 = s.clone();
            let state2 = state.clone();
            tokio::spawn(async move { on_auth_request(s2, state2, req).await; });
        });

        // webhooksRequest
        s.on("webhooksRequest", |s: SocketRef, State(state): State<AppState>, Data(server_id): Data<i64>| {
            on_webhooks_request(s, state, server_id);
        });

        // newWebhookRequest
        s.on("newWebhookRequest", |s: SocketRef, State(state): State<AppState>, Data(obj): Data<WebhookObject>| {
            on_new_webhook_request(s, state, obj);
        });

        // connectedServerListRequest
        s.on("connectedServerListRequest", |s: SocketRef, State(state): State<AppState>| {
            on_connected_server_list_request(s, state);
        });

        // message
        s.on("message", |s: SocketRef, State(state): State<AppState>, Data(msg): Data<IrcMessage>| async move {
            on_message(s, state, msg).await;
        });
    });
}

fn use_accounts(state: &AppState) -> bool { state.config.lock().require_passwords }

fn check_auth(state: &AppState, msg: &IrcMessage) -> bool {
    if let Some(user) = state.sessions.iter().find(|u| u.value().logged_in && u.value().username == msg.from) {
        if let Some(t) = &msg.token {
            return user.value().session_token == *t;
        }
    }
    false
}

fn get_mapping_by_discord(state: &AppState, server: &str, channel: &str) -> Option<ChannelMapping> {
    irc_bridge::get_connected_irc_channels(state)
        .into_iter()
        .find(|m| m.discord_server == server && m.discord_channel == channel)
}

fn on_register_request(s: SocketRef, state: AppState, reg: RegisterRequest) {
    info!("[*] register request username={} password={} token={}", reg.username, reg.password, reg.token);
    let invalid = |message: &str| {
        let resp = AuthResponse { username: "".into(), admin: false, token: "".into(), message: message.into(), success: false };
        let _ = s.emit("authResponse", &resp);
    };
    if reg.username.is_empty() { return invalid("invalid username"); }
    if reg.password.is_empty() { return invalid("invalid password"); }
    if !username_pattern().is_match(&reg.username) { return invalid(&format!("username has to match {}", username_pattern())); }
    if reg.password.len() < 3 || reg.password.len() > 1024 { return invalid("password has to be between 3 and 1024 characters long"); }
    if let Some(sign_up_token) = std::env::var("SIGN_UP_TOKEN").ok() {
        if reg.password == sign_up_token || reg.password == state.config.lock().accounts_password { return invalid("please choose a different password"); }
    }
    let conn = state.db.lock();
    if user_model::is_username_taken(&conn, &reg.username) { return invalid("this username is already taken"); }
    if let Ok(token) = std::env::var("SIGN_UP_TOKEN") { if reg.token != token { return invalid("invalid sign up token"); } }
    let _ = user_model::insert(&conn, &reg.username, &reg.password, "0.0.0.0");
    let resp = AuthResponse { username: reg.username, admin: false, token: "".into(), message: "Successfully registered! You can now log in!".into(), success: true };
    let _ = s.emit("authResponse", &resp);
}

async fn on_auth_request(s: SocketRef, state: AppState, auth: AuthRequest) {
    let db_user = {
        let conn = state.db.lock();
        user_model::find_by_credentials(&conn, &auth.username, &auth.password)
    };
    // logout conflicting user
    if state.sessions.iter().any(|u| u.value().username == auth.username) {
        // send logout to that socket if present
        // best-effort: emit broadcast; specific targeting not implemented yet
        let _ = s.broadcast().emit("logout", &LogoutMessage{ message: "logged in from another location".into() });
    }
    let valid = if !use_accounts(&state) { true } else { db_user.is_some() || state.config.lock().accounts_password == auth.password };
    if !valid { let resp = AuthResponse{ username: "".into(), admin: false, token: "".into(), message: "wrong credentials".into(), success: false }; let _= s.emit("authResponse", &resp); return; }
    if let Some(ref row) = db_user { if row.is_blocked == 1 { let resp = AuthResponse{ username: "".into(), admin: false, token: "".into(), message: "this account is blocked".into(), success: false }; let _ = s.emit("authResponse", &resp); return; } }
    if db_user.is_none() && { let c = state.db.lock(); user_model::is_username_taken(&c, &auth.username) } { let resp = AuthResponse{ username: "".into(), admin: false, token: "".into(), message: "this username needs a different password".into(), success: false }; let _= s.emit("authResponse", &resp); return; }

    // update session
    if let Some(mut entry) = state.sessions.get_mut(&s.id.to_string()) {
        entry.username = auth.username.clone();
        entry.logged_in = true;
        entry.db_user = db_user.clone();
    }
    if on_join_channel(s.clone(), state.clone(), JoinChannel{ channel: auth.channel.clone(), server: auth.server.clone(), password: "".into() }).await.is_err() {
        let resp = AuthResponse{ username: "".into(), admin: false, token: "".into(), message: "failed to join channel".into(), success: false };
        let _ = s.emit("authResponse", &resp);
        if let Some(mut entry) = state.sessions.get_mut(&s.id.to_string()) { entry.logged_in = false; }
        return;
    }
    info!("[*] '{}' logged in {}", auth.username, if db_user.is_some() { "to account" } else { "with master password" });
    let _ = s.broadcast().emit("userJoin", &auth.username);
    let admin = db_user.as_ref().map(|u| u.is_admin == 1).unwrap_or(false);
    let token = state.sessions.get(&s.id.to_string()).map(|u| u.session_token.clone()).unwrap_or_default();
    let resp = AuthResponse{ username: auth.username, admin, token, success: true, message: "logged in".into() };
    let _ = s.emit("authResponse", &resp);
}

async fn on_join_channel(s: SocketRef, state: AppState, join: JoinChannel) -> Result<(), ()> {
    let conn = state.db.lock();
    // check channel exists
    let Some(ch) = channel_model::find_by_discord(&conn, &join.server, &join.channel) else {
        warn!("{} tried to join server='{}' channel='{}' but that is not in the db", s.id, join.server, join.channel);
        let _ = s.emit("joinChannelResponse", &JoinChannelResponse{ message: "channel is not in database".into(), success: false, server: join.server, channel: join.channel, unred_msg_id: None, channel_id: 0, server_id: 0 });
        return Err(());
    };
    // update membership
    let session = match state.sessions.get(&s.id.to_string()) { Some(u) => u, None => return Err(()) };
    if !session.logged_in { return Err(()); }
    if session.db_user.is_none() { return Err(()); }
    let db_user = session.db_user.as_ref().unwrap();
    let mut member = cm_model::find_by_user_and_channel(&conn, db_user.id, ch.id);
    if member.is_none() {
        let _ = cm_model::insert(&conn, ch.id, db_user.id, None, None, None, 1).map_err(|_|())?;
        member = cm_model::find_by_user_and_channel(&conn, db_user.id, ch.id);
        info!("[*][join-channel] user='{}' joined channel '{}#{}'", session.username, ch.discord_server, ch.discord_channel);
    } else {
        info!("[*][join-channel] user='{}' visited channel with old membership '{}#{}'", session.username, ch.discord_server, ch.discord_channel);
    }
    // update session active
    if let Some(mut entry) = state.sessions.get_mut(&s.id.to_string()) {
        entry.active_channel = ch.discord_channel.clone();
        entry.active_server = ch.discord_server.clone();
    }
    // Join rooms for typing and server broadcasts
    let room_channel = format!("{}#{}", ch.discord_server, ch.discord_channel);
    let rooms: Vec<String> = vec![room_channel, ch.discord_server.clone()];
    s.join(rooms);
    let resp = JoinChannelResponse{ message: "".into(), success: true, server: ch.discord_server.clone(), channel: ch.discord_channel.clone(), unred_msg_id: member.and_then(|m| m.highest_requested_msg_id), channel_id: ch.id, server_id: ch.server_id };
    let _ = s.emit("joinChannelResponse", &resp);
    Ok(())
}

fn on_typing_info(s: SocketRef, state: AppState, info: TypingInfo) {
    let Some(mut user) = state.sessions.get_mut(&s.id.to_string()) else { return; };
    if user.active_channel != info.channel || user.active_server != info.server { return; }
    if use_accounts(&state) && !user.logged_in { return; }
    user.is_typing = info.is_typing;
    if info.is_typing { user.last_typing_ms = now_ms(); }
    drop(user);

    // compute typing users for that channel+server
    let names: Vec<String> = state.sessions.iter()
        .filter(|u| u.value().is_typing && u.value().active_channel == info.channel && u.value().active_server == info.server && now_ms() - u.value().last_typing_ms <= 3000)
        .map(|u| u.value().username.clone())
        .collect();
    let typing_state = TypingState{ names, channel: info.channel };
    let _ = s.broadcast().emit("typingUsers", &typing_state);
}

fn add_message(s: &SocketRef, state: &AppState, mapping: &ChannelMapping, mut msg: IrcMessage) {
    msg.token = Some("xxx".into());
    state.history.log_message(&mapping.discord_server, &mapping.discord_channel, msg.clone());
    let _ = s.broadcast().emit("message", &msg);
}

async fn on_message(s: SocketRef, state: AppState, mut msg: IrcMessage) {
    if use_accounts(&state) && !check_auth(&state, &msg) {
        warn!("[!] WARNING invalid token");
        return;
    }
    let Some(user) = state.sessions.get(&s.id.to_string()) else { return; };
    if user.active_channel != msg.channel { warn!("[!] user '{}' tried to send in channel '{}' but is in '{}'", user.username, msg.channel, user.active_channel); return; }
    if user.active_server != msg.server { warn!("[!] user '{}' tried to send in server '{}' but is in '{}'", user.username, msg.server, user.active_server); return; }
    drop(user);
    let Some(mapping) = get_mapping_by_discord(&state, &msg.server, &msg.channel) else { warn!("[!] invalid discord mapping '{}#{}'", msg.server, msg.channel); return; };

    // rate limit
    static RL: Lazy<parking_lot::Mutex<RateLimiter>> = Lazy::new(|| parking_lot::Mutex::new(RateLimiter::new()));
    if RL.lock().is_ratelimited(&msg.message) {
        let alert = AlertMessage{ success: false, message: "Ratelimited message sending".into(), expire: 8000 };
        let _ = s.emit("alert", &alert);
        return;
    }
    // private channel check: if private and no db user
    let is_private = mapping.is_private;
    if is_private {
        let user = state.sessions.get(&s.id.to_string()).unwrap();
        if user.db_user.is_none() {
            let alert = AlertMessage{ success: false, message: "This is a private channel please login to your account".into(), expire: 8000 };
            let _ = s.emit("alert", &alert);
            return;
        }
    }
    let new_id = state.history.next_id();
    if msg.id != new_id { warn!("[!] The client expected to get msgid={} but got msgid={}", msg.id, new_id); }
    msg.id = new_id;
    let message_str = format!("**<{}>** {}", msg.from, msg.message);
    info!("[*][{}][{}] {}", msg.server, msg.channel, message_str);
    // send to irc
    if !irc_bridge::send_irc(&state, &mapping.irc_server_name, &mapping.irc_channel, &message_str).await {
        return;
    }
    add_message(&s, &state, &mapping, msg);
}

fn on_webhooks_request(s: SocketRef, state: AppState, server_id: i64) {
    let conn = state.db.lock();
    let Some(srv) = server_model::find(&conn, server_id) else { let _= s.emit("webhooks", &Vec::<WebhookObject>::new()); return; };
    let webhooks = webhook_model::where_eq(&conn, "server_id", srv.id).into_iter().map(|w| WebhookObject{
        id: w.id, token: w.token, r#type: 0, channel_id: w.channel_id, name: w.name, avatar: None, application_id: None
    }).collect::<Vec<_>>();
    let _ = s.emit("webhooks", &webhooks);
}

fn on_new_webhook_request(s: SocketRef, state: AppState, obj: WebhookObject) {
    let conn = state.db.lock();
    let Some(channel) = channel_model::find(&conn, obj.channel_id) else { warn!("[!] failed to create webhook. Channel not found"); return; };
    let Some(server) = server_model::find(&conn, channel.server_id) else { warn!("[!] failed to create webhook. Server not found"); return; };
    let Some(session) = state.sessions.get(&s.id.to_string()) else { warn!("[!] failed to create webhook. Session user not found!"); return; };
    let Some(db_user) = session.db_user.clone() else { warn!("[!] failed to create webhook. User is not logged in!"); return; };
    let Some(user) = user_model::find(&conn, db_user.id) else { warn!("[!] failed to create webhook. User not found in database!"); return; };
    if user.is_blocked == 1 { warn!("[!] failed to create webhook. User is blocked!"); return; }
    if user.is_admin != 1 { warn!("[!] failed to create webhook. User is missing permissions!"); return; }
    let token = util::random_int(100000000000000, 3592180204621707).to_string();
    let _ = webhook_model::insert(&conn, &obj.name, &token, server.id, channel.id, &session.username, &session.username, user.id);
    info!("[*] created new webhook! server='{}' channel='{}' name='{}'", server.name, channel.name, obj.name);
}

fn on_connected_server_list_request(s: SocketRef, state: AppState) {
    let conn = state.db.lock();
    let Some(session) = state.sessions.get(&s.id.to_string()) else { return; };
    let Some(db_user) = session.db_user.clone() else { return; };
    let Some(user) = user_model::find(&conn, db_user.id) else { return; };
    if user.is_blocked == 1 { return; }
    let servers = server_model::all(&conn);
    let mut out = Vec::new();
    for srv in servers {
        // channels
        let channels = channel_model::where_eq(&conn, "server_id", &srv.id.to_string())
            .into_iter()
            .map(|ch| ChannelInfo{ id: ch.id, server_id: ch.server_id, name: ch.name, description: ch.description })
            .collect::<Vec<_>>();
        out.push(ServerInfo{ id: srv.id, name: srv.name, icon_url: srv.icon_url, banner_url: srv.banner_url, channels });
    }
    let _ = s.emit("connectedServerListResponse", &out);
}
