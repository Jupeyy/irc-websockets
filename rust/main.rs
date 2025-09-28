use std::net::SocketAddr;

// use axum::Router;
use dotenvy::dotenv;
// no serde imports needed here
use socketioxide::SocketIo;
use tokio::signal;
use tower_http::cors::{Any, CorsLayer};
use tracing::{error, info, Level};
use tracing_subscriber::EnvFilter;

mod state;
mod types;
mod config;
mod history;
mod models;
mod ws;
mod http_api;
mod irc_bridge;
mod util;

use crate::config::Config;
use crate::state::AppState;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env()
            .add_directive(Level::INFO.into()))
        .with_target(false)
        .init();

    let config = Config::from_env()?;
    config.validate_or_exit();

    let state = AppState::new(&config)?;

    // Start IRC bridge (mock or real)
    irc_bridge::start(&state).await?;

    let (layer, io) = SocketIo::builder()
        .with_state(state.clone())
        .build_layer();

    // WebSocket handlers
    ws::register_handlers(io.clone());

    // HTTP API
    let app = http_api::router(state.clone())
        .layer(layer)
        .layer(
            CorsLayer::new()
                .allow_methods(Any)
                .allow_headers(Any)
                .allow_origin(Any),
        );

    let addr = SocketAddr::from(([0, 0, 0, 0], 6969));
    info!("listening on http://{}", addr);
    let cfg = state.config.lock();
    info!("accounts are {}", if cfg.require_passwords { "on" } else { "off" });

    let listener = tokio::net::TcpListener::bind(addr).await?;
    let serve = axum::serve(listener, app);

    tokio::select! {
        res = serve => {
            if let Err(e) = res { error!("server error: {e}"); }
        }
        _ = signal::ctrl_c() => {
            info!("shutting down, saving message history ...");
            if let Err(e) = state.history.save_to_disk() { error!("save history failed: {e}"); }
        }
    }

    Ok(())
}
