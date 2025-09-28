use serde::{Deserialize, Serialize};

// Shared types matching TS interfaces

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebhookObject {
    pub id: i64,
    pub token: String,
    pub r#type: i32,
    pub channel_id: i64,
    pub name: String,
    pub avatar: Option<String>,
    pub application_id: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChannelInfo {
    pub id: i64,
    #[serde(rename = "serverId")] pub server_id: i64,
    pub name: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IrcMessage {
    pub id: i64,
    pub from: String,
    pub message: String,
    pub channel: String,
    pub server: String,
    pub date: String,
    #[serde(skip_serializing_if = "Option::is_none")] 
    pub token: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegisterRequest {
    pub username: String,
    pub password: String,
    pub token: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthRequest {
    pub username: String,
    pub password: String,
    pub channel: String,
    pub server: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthResponse {
    pub username: String,
    pub admin: bool,
    pub token: String,
    pub message: String,
    pub success: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JoinChannelResponse {
    pub message: String,
    pub success: bool,
    pub channel: String,
    pub server: String,
    #[serde(rename = "unredMsgId")] pub unred_msg_id: Option<i64>,
    #[serde(rename = "channelId")] pub channel_id: i64,
    #[serde(rename = "serverId")] pub server_id: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogoutMessage {
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JoinChannel {
    pub channel: String,
    pub server: String,
    pub password: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TypingInfo {
    pub is_typing: bool,
    pub channel: String,
    pub server: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TypingState {
    pub names: Vec<String>,
    pub channel: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertMessage {
    pub success: bool,
    pub message: String,
    pub expire: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerInfo {
    pub id: i64,
    pub channels: Vec<ChannelInfo>,
    pub name: String,
    #[serde(rename = "iconUrl")] pub icon_url: String,
    #[serde(rename = "bannerUrl")] pub banner_url: String,
}
