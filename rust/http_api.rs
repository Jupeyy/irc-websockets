use axum::{routing::{get, post}, Router, extract::{Path, Query, State}, Json};
use serde::Deserialize;
use tower_http::trace::TraceLayer;
use serde_json::json;
use tracing::info;

use crate::{history::{MessageLogOptions}, models::{channel as channel_model, channel_member as cm_model}, state::AppState, types::{IrcMessage, ChannelInfo}};

pub fn router(state: AppState) -> Router {
    Router::new()
        .route("/:server/:channel/messages", get(get_messages))
        .route("/:server/:channel/typers", get(get_typers))
        .route("/:server/channels", get(get_discord_channels))
        .route("/users", get(get_users))
        .route("/admin/logout_all", post(admin_logout_all))
        .route("/admin/password", post(admin_password))
        .route("/webhooks/:webhook_id/:webhook_token", post(webhook_execute))
        .route("/channels/:channel_id/webhooks", get(channel_webhooks))
        .with_state(state)
        .layer(TraceLayer::new_for_http())
}

#[derive(Debug, Deserialize)]
#[allow(non_snake_case, dead_code)]
struct MessageQuery {
    from: Option<i64>,
    count: Option<i64>,
    search: Option<String>,
    pattern: Option<String>,
    userId: Option<i64>,
    sessionToken: Option<String>,
}

async fn get_messages(Path((server, channel)): Path<(String, String)>, State(state): State<AppState>, Query(q): Query<MessageQuery>) -> Json<Vec<IrcMessage>> {
    // auth via session token
    if let Some(token) = q.sessionToken.clone() {
        let session_user = state.sessions.iter().find(|u| u.value().logged_in && u.value().session_token == token);
        if session_user.is_none() {
            return Json(vec![]);
        }
    }
    let opts = MessageLogOptions {
        from_id: q.from.unwrap_or(0),
        count: q.count.unwrap_or(10),
        search_str: q.search,
        search_pattern: q.pattern,
    };
    let messages = state.history.get_messages(&server, &channel, opts.clone());

    // update requested ids if logged in
    if let Some(token) = q.sessionToken.clone() {
        if let Some(session) = state.sessions.iter().find(|u| u.value().logged_in && u.value().session_token == token) {
            if let Some(dbuser) = &session.db_user {
                let conn = state.db.lock();
                if let Some(ch) = channel_model::find_by_discord(&conn, &server, &channel) {
                    if let Some(mut member) = cm_model::find_by_user_and_channel(&conn, dbuser.id, ch.id) {
                        if let Some(first) = messages.first() { member.lowest_requested_msg_id = Some(first.id); }
                        if let Some(last) = messages.last() { member.highest_requested_msg_id = Some(last.id); }
                        let _ = cm_model::update(&conn, &member);
                    }
                }
            }
        }
    }
    Json(messages)
}

async fn get_typers(Path((server, channel)): Path<(String, String)>, State(state): State<AppState>) -> Json<Vec<String>> {
    let names = state.sessions.iter()
        .filter(|u| u.value().is_typing && u.value().active_channel == channel && u.value().active_server == server)
        .map(|u| u.value().username.clone())
        .collect();
    Json(names)
}

async fn get_discord_channels(Path(server): Path<String>, State(state): State<AppState>) -> Json<Vec<ChannelInfo>> {
    let conn = state.db.lock();
    let channels = channel_model::where_eq(&conn, "discord_server", &server)
        .into_iter()
        .map(|c| ChannelInfo{ id: c.id, server_id: c.server_id, name: c.discord_channel, description: c.description })
        .collect();
    Json(channels)
}

async fn get_users(State(state): State<AppState>) -> Json<Vec<String>> {
    let users = state.sessions.iter().map(|u| u.value().username.clone()).collect();
    Json(users)
}

fn check_admin_auth(headers: &axum::http::HeaderMap, state: &AppState) -> bool {
    if let Some(auth) = headers.get(axum::http::header::AUTHORIZATION) {
        if let Ok(s) = auth.to_str() {
            if let Some(token) = s.strip_prefix("Bearer ") {
                return token == state.config.lock().admin_token;
            }
        }
    }
    false
}

#[derive(Debug, Deserialize)]
struct RequiredFlag { required: bool }

async fn admin_logout_all(State(state): State<AppState>, headers: axum::http::HeaderMap) -> Json<serde_json::Value> {
    if !check_admin_auth(&headers, &state) {
        return Json(json!({"error":"Authentication is required please set the bearer authorization header."}));
    }
    info!("[*] admin logged out all users");
    // mark as logged out and notify
    for mut entry in state.sessions.iter_mut() {
        entry.logged_in = false;
    }
    Json(json!({"message":"OK"}))
}

async fn admin_password(State(state): State<AppState>, headers: axum::http::HeaderMap, Json(flag): Json<RequiredFlag>) -> Json<serde_json::Value> {
    if !check_admin_auth(&headers, &state) {
        return Json(json!({"error":"Authentication is required please set the bearer authorization header."}));
    }
    state.config.lock().require_passwords = flag.required;
    info!("[*] admin set password required to {}", flag.required);
    Json(json!({"message":"OK"}))
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct WebhookPath { webhook_id: i64, webhook_token: String }

async fn webhook_execute(Path(WebhookPath{ webhook_id: _, webhook_token: _ }): Path<WebhookPath>, State(_state): State<AppState>, Json(_body): Json<serde_json::Value>) -> Json<serde_json::Value> {
    // Minimal implementation; full compatibility not provided
    Json(json!({"message":"TODO: this is not discord api yet. But OK"}))
}

#[derive(Debug, Deserialize)]
struct ChannelPath { channel_id: i64 }

async fn channel_webhooks(Path(ChannelPath{ channel_id }): Path<ChannelPath>, State(state): State<AppState>, headers: axum::http::HeaderMap) -> Json<serde_json::Value> {
    // Bearer authorization check; currently expects token 'xxx' to match TS code
    let token = headers.get(axum::http::header::AUTHORIZATION).and_then(|h| h.to_str().ok()).and_then(|v| v.strip_prefix("Bearer ")).unwrap_or("");
    if token != "xxx" { return Json(json!({"error": {"note":"TODO: this is not discord compatible yet","message":"wrong auth credentials"}})); }
    let conn = state.db.lock();
    if let Some(ch) = channel_model::find(&conn, channel_id) {
        let hooks = crate::models::webhook::where_eq(&conn, "channel_id", ch.id)
            .into_iter()
            .map(|w| crate::types::WebhookObject{ id: w.id, token: w.token, r#type: 0, channel_id: ch.id, name: w.name, avatar: None, application_id: None })
            .collect::<Vec<_>>();
        return Json(serde_json::to_value(hooks).unwrap());
    }
    Json(json!({"message":"TODO: this is not discord api yet. BUT ERROR channel not found"}))
}
