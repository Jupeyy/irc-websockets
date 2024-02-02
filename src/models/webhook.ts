import { getDb } from "../base/db"

export class Webhook {
  id: number
  name: string
  token: string
  discordServer: string
  discordChannel: string
  registerIp: string
  lastUseIp: string
  createdAt: string
  updatedAt: string
  ownerId: number

  constructor(row: IWebhookRow) {
    this.id = row.ID
    this.name = row.name
    this.token = row.token
    this.discordServer = row.discord_server
    this.discordChannel = row.discord_channel
    this.registerIp = row.register_ip
    this.lastUseIp = row.last_use_ip
    this.createdAt = row.created_at
    this.updatedAt = row.updated_at
    this.ownerId = row.owner_id
  }

  static find (webhookId: number | string, token: string): null | Webhook {
    const row: undefined | IWebhookRow = getDb().
      prepare('SELECT * FROM webhooks WHERE ID = ? AND token = ?')
      .get(webhookId, token) as undefined | IWebhookRow
    if(!row) {
      return null
    }
    return new Webhook(row)
  }

  insert () {
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
    const stmt = getDb().prepare(insertQuery)
    stmt.run(
      this.name, this.token,
      this.discordServer, this.discordChannel,
      this.registerIp, this.lastUseIp,
      this.ownerId
    )
  }
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
