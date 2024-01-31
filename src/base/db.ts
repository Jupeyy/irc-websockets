import Database from 'better-sqlite3'
import { Webhook } from '../features/webhooks'
const db = new Database('./db/main.db')
db.pragma('journal_mode = WAL')

export interface IUserRow {
  ID: number,
  username: string,
  password: string,
  register_ip: string,
  login_ip: string,
  created_at: string,
  updated_at: string,
  is_admin: number,
  blocked: number
}

export interface IWebhookRow {
  ID: number,
  name: string,
  token: string,
  discord_server: string,
  discord_channel: string,
  register_ip: string,
  last_use_ip: string,
  created_at: string,
  updated_at: string,
  owner_id: number
}

try {
  // TODO: read own source code or use db cli to find latest migration timestamp
  //       and verify that is set
  //       otherwise accounts might exist but newer migrations are missing
  db.exec('SELECT * FROM Accounts LIMIT 1')
} catch (SqliteError) {
  console.log(`[!] Error: test select failed`)
  console.log(`[!]        try running 'npm run db migrate'`)
  process.exit(1)
}

export const addNewUser = (username: string, password: string, ipAddr: string) => {
  const insertQuery = `INSERT INTO Accounts(
    username, password, register_ip, login_ip, created_at, updated_at, is_admin
  ) VALUES (?, ? , ?, ?, DateTime('now'), DateTime('now'), ?);
  `
  const stmt = db.prepare(insertQuery)
  stmt.run(
    username,
    password,
    ipAddr,
    ipAddr,
    0
  )
}

export const addNewWebhook = (webhook: Webhook) => {
  const insertQuery = `
  INSERT INTO Webhooks(
    name, token,
    discord_server, discord_channel,
    register_ip, last_use_ip,
    created_at, updated_at,
    owner_id
  ) VALUES (
    ?, ?,
    ?, ?,
    ?, ?,
    DateTime('now'), DateTime('now'),
    ?
  );
  `
  const stmt = db.prepare(insertQuery)
  stmt.run(
    webhook.name, webhook.token,
    webhook.discordServer, webhook.discordChannel,
    webhook.registerIp, webhook.lastUseIp,
    webhook.ownerId
  )
}

// TODO: admin front end
// addNewWebhook({
//   id: 0,
//   name: 'test',
//   token: 'xxx',
//   discordServer: 'ddnet',
//   discordChannel: 'off-topic',
//   registerIp: '127.0.0.1',
//   lastUseIp: '127.0.0.1',
//   createdAt: 'now',
//   updatedAt: 'now',
//   ownerId: 0
// })

export const isUsernameTaken = (username: string): boolean => {
  const row = db.prepare('SELECT * FROM Accounts WHERE username = ?').get(username)
  if(!row) {
    return false
  }
  return true
}

export const getWebhook = (webhookId: string, token: string): null | Webhook => {
  const row: undefined | IWebhookRow = db.
    prepare('SELECT * FROM Webhooks WHERE id = ? AND token = ?')
    .get(webhookId, token) as undefined | IWebhookRow
  if(!row) {
    return null
  }
  return {
    id: row.ID,
    name: row.name,
    token: row.token,
    discordServer: row.discord_server,
    discordChannel: row.discord_channel,
    registerIp: row.register_ip,
    lastUseIp: row.last_use_ip,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ownerId: row.owner_id
  }
}

export const getUser = (username: string, password: string): null | IUserRow => {
  const row: undefined | IUserRow = db.
    prepare('SELECT * FROM Accounts WHERE username = ? AND password = ?')
    .get(username, password) as undefined | IUserRow
  if(!row) {
    return null
  }
  return row
}

export const getDb = () => db
