import { getDb } from "../base/db"
import { Channel } from "./channel"

type WebhookColumn = 'ID'
  | 'name'
  | 'token'
  | 'discord_server'
  | 'discord_channel'
  | 'channel_id'
  | 'register_ip'
  | 'last_use_ip'
  | 'created_at'
  | 'updated_at'
  'owner_id'

export class Webhook {
  id: number | bigint
  name: string
  token: string
  discordServer: string
  discordChannel: string
  channelId: number | bigint
  registerIp: string
  lastUseIp: string
  createdAt: string
  updatedAt: string
  ownerId: number | bigint

  constructor(row: IWebhookRow) {
    this.id = row.ID
    this.name = row.name
    this.token = row.token
    this.discordServer = row.discord_server
    this.discordChannel = row.discord_channel
    this.channelId = row.channel_id
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

  /**
   * where
   *
   * get Webhook instance based on sql where statement
   * given a custom value and column
   *
   * @param column VUNERABLE TO SQL INJECTIONS!!!! THIS SHOULD NEVER BE USER INPUT!
   * @param value
   * @returns Webhook
   */
  static where (column: WebhookColumn, value: number | bigint | string): Webhook[] {
    // TODO: replace the string params with one big object
    //       then you can call it like this: where({channel_id: 1})
    //       and it could also support ands like so: where({channel_id 1, name: 'foo'})

    // TODO: fix sql injection
    //       we could do a runtime check to see if `column` is one of the expected strings ["ID", "name", "token", ..]
    //       problem with that is that it would be typing that fakin list a 17th time in the codebase
    //       i am sick of it. I rather risk sql injection than type out one array of strings that i then have to
    //       maintain seperately

    if (!/^[a-z_]+$/.test(column)) {
      throw new Error(`SQL injection prevention. column='${column}' value='${value}'`);
    }

    const rows: IWebhookRow[] = getDb().
      prepare(`SELECT * FROM webhooks WHERE ${column} = ?`)
      .all(value) as IWebhookRow[]
    if(!rows) {
      return []
    }
    return rows.map((row) => new Webhook(row))
  }

  insert (): void {
    const insertQuery = `
    INSERT INTO webhooks(
      name, token,
      discord_server, discord_channel,
      channel_id,
      register_ip, last_use_ip,
      created_at, updated_at,
      owner_id
    ) VALUES (
      ?, ?,
      ?, ?,
      ?,
      ?, ?,
      DateTime('now'), DateTime('now'),
      ?
    );
    `
    const stmt = getDb().prepare(insertQuery)
    const result = stmt.run(
      this.name, this.token,
      this.discordServer, this.discordChannel,
      this.channelId,
      this.registerIp, this.lastUseIp,
      this.ownerId
    )
    this.id = result.lastInsertRowid
  }

  channel (): Channel {
    return Channel.find(this.channelId) as Channel
  }
}

export interface IWebhookRow {
  ID: number,
  name: string,
  token: string,
  discord_server: string,
  discord_channel: string,
  channel_id: number | bigint
  register_ip: string,
  last_use_ip: string,
  created_at: string,
  updated_at: string,
  owner_id: number | bigint
}
