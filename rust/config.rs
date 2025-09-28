use anyhow::Result;
use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    pub require_passwords: bool,
    pub dry_irc: bool,
    pub irc_server: String,
    pub irc_channel: String,
    pub accounts_password: String,
    pub admin_token: String,
    pub backlog_size: usize,
    pub irc_login_channel: Option<String>,
    pub irc_login_msg: Option<String>,
}

fn is_true(val: &str) -> bool {
    matches!(val.to_ascii_lowercase().as_str(), "1"|"true"|"yes"|"on")
}

impl Config {
    pub fn from_env() -> Result<Self> {
        let require_passwords = is_true(&env::var("ACCOUNTS").unwrap_or_else(|_| "0".into()));
        let dry_irc = is_true(&env::var("DRY_IRC").unwrap_or_else(|_| "0".into()));
        let irc_server = env::var("IRC_SERVER").unwrap_or_default();
        let irc_channel = env::var("IRC_CHANNEL").unwrap_or_default();
        let accounts_password = env::var("ACCOUNTS_PASSWORD").unwrap_or_default();
        let admin_token = env::var("ADMIN_TOKEN").unwrap_or_default();
        let backlog_size: usize = env::var("BACKLOG_SIZE").unwrap_or_else(|_| "30".into()).parse().unwrap_or(30);
        let irc_login_channel = env::var("IRC_LOGIN_CHANNEL").ok();
        let irc_login_msg = env::var("IRC_LOGIN_MSG").ok();

        Ok(Self {
            require_passwords,
            dry_irc,
            irc_server,
            irc_channel,
            accounts_password,
            admin_token,
            backlog_size,
            irc_login_channel,
            irc_login_msg,
        })
    }

    pub fn validate_or_exit(&self) {
        if self.irc_channel.is_empty() {
            eprintln!("Error: IRC_CHANNEL is not set! check your .env file");
            std::process::exit(1);
        }
        if self.irc_server.is_empty() {
            eprintln!("Error: IRC_SERVER is not set! check your .env file");
            std::process::exit(1);
        }
        if self.accounts_password.is_empty() {
            eprintln!("Error: ACCOUNTS_PASSWORD is not set! check your .env file");
            std::process::exit(1);
        }
        if self.admin_token.is_empty() {
            eprintln!("Error: ADMIN_TOKEN is not set! check your .env file");
            std::process::exit(1);
        }
        if self.admin_token == "xxx" {
            eprintln!("Error: using the default ADMIN_TOKEN is not allowed");
            std::process::exit(1);
        }
    }
}
