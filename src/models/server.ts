import { getDb } from "../base/db"
import { Channel } from "./channel"
import { Webhook } from "./webhook"

type ServerColumn = 'ID'
  | 'name'
  | 'discord_name'
  | 'irc_name'
  | 'irc_ip'
  | 'icon_url'
  | 'banner_url'
  | 'register_ip'
  | 'owner_id'
  | 'created_at'
  | 'updated_at'

export interface IServerRow {
  ID: number | bigint | null
  name: string
  discord_name: string
  irc_name: string
  irc_ip: string
  icon_url: string
  banner_url: string
  register_ip: string
  owner_id: number | bigint
  created_at: string | null
  updated_at: string | null
}

export interface IServerConstructor {
  ID?: number | bigint | null
  name: string
  discord_name: string
  irc_name: string
  irc_ip: string
  icon_url: string
  banner_url?: string
  register_ip: string
  owner_id: number | bigint
  created_at?: string | null
  updated_at?: string | null
}

export class Server {
  id: number | bigint | null
  name: string
  discordName: string
  ircName: string
  ircIp: string
  iconUrl: string
  bannerUrl?: string
  registerIp: string
  ownerId: number | bigint
  createdAt?: string | null
  updatedAt?: string | null

  constructor(row: IServerConstructor) {
    this.id = row.ID || null
    this.name = row.name
    this.discordName = row.discord_name
    this.ircName = row.irc_name
    this.ircIp = row.irc_ip
    this.iconUrl = row.icon_url
    this.bannerUrl = row.banner_url || ''
    this.registerIp = row.register_ip
    this.ownerId = row.owner_id
    this.createdAt = row.created_at || null
    this.updatedAt = row.updated_at || null
  }

  save (): void {
    this.id ? this.update() : this.insert()
  }

  insert (): void {
    const insertQuery = `
    INSERT INTO servers(
      name, discord_name,
      irc_name, irc_ip,
      icon_url, banner_url,
      register_ip, owner_id,
      created_at, updated_at
    ) VALUES (
      ?, ?,
      ?, ?,
      ?, ?,
      ?, ?,
      DateTime('now'), DateTime('now')
    );
    `
    const stmt = getDb().prepare(insertQuery)
    const result = stmt.run(
      this.name, this.discordName,
      this.ircName, this.ircIp,
      this.iconUrl, this.bannerUrl,
      this.registerIp, this.ownerId,
    )
    this.id = result.lastInsertRowid
  }

  update (): void {
    const updateQuery = `
    UPDATE servers SET
      name = ?, discord_name = ?,
      irc_name = ?, irc_ip = ?,
      icon_url = ?, banner_url = ?,
      owner_id = ?,
      updated_at = DateTime('now')
    WHERE ID = ?;
    `
    const stmt = getDb().prepare(updateQuery)
    stmt.run(
      this.name, this.discordName,
      this.ircName, this.ircIp,
      this.iconUrl, this.bannerUrl,
      this.ownerId,
      this.id
    )
  }

  static find (id: number | bigint): null | Server {
    const row: undefined | IServerRow = getDb().
      prepare('SELECT * FROM servers WHERE ID = ?')
      .get(id) as undefined | IServerRow
    if(!row) {
      return null
    }
    return new Server(row)
  }

  static first (): null | Server {
    const row: undefined | IServerRow = getDb().
      prepare('SELECT * FROM servers ORDER BY ID ASC LIMIT 1')
      .get() as undefined | IServerRow
    if(!row) {
      return null
    }
    return new Server(row)
  }

  static last (): null | Server {
    const row: undefined | IServerRow = getDb().
      prepare('SELECT * FROM servers ORDER BY ID DESC LIMIT 1')
      .get() as undefined | IServerRow
    if(!row) {
      return null
    }
    return new Server(row)
  }

  static all (): Server[] {
    const rows: undefined | IServerRow[] = getDb().
      prepare('SELECT * FROM servers')
      .all() as undefined | IServerRow[]
    if(!rows) {
      return []
    }
    return rows.map((row) => new Server(row))
  }

  channels (): Channel[] {
    if(!this.id) {
      return []
    }
    return Channel.where('server_id', this.id)
  }

  webhooks (): Webhook[] {
    if(!this.id) {
      return []
    }
    return Webhook.where('server_id', this.id)
  }
}
