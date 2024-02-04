import { getDb } from "../base/db"
import { Channel } from "./channel"

// ideally we would match those fields exactly
// https://discord.com/developers/docs/resources/webhook#webhook-object

type WebhookColumn = 'ID'
  | 'name'
  | 'token'
  | 'channel_id'
  | 'register_ip'
  | 'last_use_ip'
  | 'created_at'
  | 'updated_at'
  | 'owner_id'

export interface IWebhookRow {
  ID: number,
  name: string,
  token: string,
  channel_id: number | bigint
  register_ip: string,
  last_use_ip: string,
  created_at: string,
  updated_at: string,
  owner_id: number | bigint
}

export interface IWebhookConstructor {
  ID?: number | bigint | null
  name: string
  token: string
  channel_id: number | bigint
  register_ip: string
  last_use_ip: string
  created_at?: string | null
  updated_at?: string | null
  owner_id: number | bigint
}

export class Webhook {
  id: number | bigint | null
  name: string
  token: string
  channelId: number | bigint
  registerIp: string
  lastUseIp: string
  createdAt: string | null
  updatedAt: string | null
  ownerId: number | bigint

  constructor(row: IWebhookConstructor) {
    this.id = row.ID || null
    this.name = row.name
    this.token = row.token
    this.channelId = row.channel_id
    this.registerIp = row.register_ip
    this.lastUseIp = row.last_use_ip
    this.createdAt = row.created_at || null
    this.updatedAt = row.updated_at || null
    this.ownerId = row.owner_id
  }

  static find (id: number): null | Webhook {
    const row: undefined | IWebhookRow = getDb().
      prepare('SELECT * FROM webhooks WHERE ID = ?')
      .get(id) as undefined | IWebhookRow
    if(!row) {
      return null
    }
    return new Webhook(row)
  }

  static first (): null | Webhook {
    const row: undefined | IWebhookRow = getDb().
      prepare('SELECT * FROM webhooks ORDER BY ID ASC LIMIT 1')
      .get() as undefined | IWebhookRow
    if(!row) {
      return null
    }
    return new Webhook(row)
  }

  static last (): null | Webhook {
    const row: undefined | IWebhookRow = getDb().
      prepare('SELECT * FROM webhooks ORDER BY ID DESC LIMIT 1')
      .get() as undefined | IWebhookRow
    if(!row) {
      return null
    }
    return new Webhook(row)
  }

  static findByCredentials (webhookId: number | string, token: string): null | Webhook {
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
   * @returns list of Webhook instances
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

  static all (): Webhook[] {
    const rows: undefined | IWebhookRow[] = getDb().
      prepare('SELECT * FROM webhooks')
      .all() as undefined | IWebhookRow[]
    if(!rows) {
      return []
    }
    return rows.map((row) => new Webhook(row))
  }

  insert (): void {
    const insertQuery = `
    INSERT INTO webhooks(
      name, token,
      channel_id,
      register_ip, last_use_ip,
      created_at, updated_at,
      owner_id
    ) VALUES (
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
