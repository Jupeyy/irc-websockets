import { getDb } from "../base/db"
import { Webhook } from "./webhook"

export interface IChannelConstructor {
  ID?: number | bigint | null
  name: string
  description?: string
  discord_server: string
  discord_channel: string
  irc_channel: string
  irc_server_ip: string
  irc_server_name: string
  created_at?: string
  updated_at?: string
  is_private?: number
  owner_id: number
}

export class Channel {
  id: number | bigint | null
  name: string
  description: string
  discordServer: string
  discordChannel: string
  ircChannel: string
  ircServerIp: string
  ircServerName: string
  createdAt: string | null
  updatedAt: string | null
  isPrivate: number
  ownerId: number
  /**
   * errors
   *
   * activerecord like error array
   * if validation fails this array will contain the errors as strings
   */
  errors: string[]

  constructor(columns: IChannelConstructor) {
    this.id = columns.ID || null
    this.name = columns.name
    this.description = columns.description || ''
    this.discordServer = columns.discord_server
    this.discordChannel = columns.discord_channel
    this.ircChannel = columns.irc_channel
    this.ircServerIp = columns.irc_server_ip
    this.ircServerName = columns.irc_server_name
    this.createdAt = columns.created_at || null
    this.updatedAt = columns.updated_at || null
    this.isPrivate = columns.is_private || 0
    this.ownerId = columns.owner_id
    this.errors = []
  }

  valid (): boolean {
    //       channel and server names have to be sanitized
    //       to only contain a-z _ -
    //       because the backend uses server#channel and server
    //       as websocket rooms so if server name matches server#channel of another channel thats bad
    //       example:
    //           server = 'foo#bar'
    //           server2 = 'foo'
    //           channel in server2 = 'bar'
    //
    //           server == server2#channel
    //
    //       also the front end uses channel and server names
    //       in data tags and query selectors

    // TODO: also validate the channel/server name combination to be unique

    this.errors = []

    if (!/^[a-z_-]+$/.test(this.discordChannel)) {
      this.errors.push(`invalid characters in discord channel '${this.discordChannel}'`)
    }
    if (!/^[a-z_-]+$/.test(this.discordServer)) {
      this.errors.push('invalid characters in discord server')
    }

    return this.errors.length === 0
  }

  insert (): Channel | boolean {
    if (!this.valid()) {
      throw Error(this.errors.join(','))
      return false
    }
    const insertQuery = `
    INSERT INTO channels(
      name, description,
      discord_server, discord_channel,
      irc_channel, irc_server_ip, irc_server_name,
      created_at, updated_at,
      is_private, owner_id
    ) VALUES (
      ?, ?,
      ?, ?,
      ?, ?, ?,
      DateTime('now'), DateTime('now'),
      0, ?
    );
    `
    const stmt = getDb().prepare(insertQuery)
    const result = stmt.run(
      this.name, this.description,
      this.discordServer, this.discordChannel,
      this.ircChannel, this.ircServerIp, this.ircServerName,
      this.ownerId
    )
    this.id = result.lastInsertRowid
    return true
  }

  static find (channelId: number | bigint | string): null | Channel {
    const row: undefined | IChannelRow = getDb().
      prepare('SELECT * FROM channels WHERE ID = ?')
      .get(channelId) as undefined | IChannelRow
    if(!row) {
      return null
    }
    return new Channel(row)
  }

  static findByDiscordNames (discordServer: string, discordChannel: string): null | Channel {
    const row: undefined | IChannelRow = getDb().
      prepare('SELECT * FROM channels WHERE discord_server = ? AND discord_channel = ?')
      .get(discordServer, discordChannel) as undefined | IChannelRow
    if(!row) {
      return null
    }
    return new Channel(row)
  }

  static first (): null | Channel {
    const row: undefined | IChannelRow = getDb().
      prepare('SELECT * FROM channels ORDER BY ID ASC LIMIT 1')
      .get() as undefined | IChannelRow
    if(!row) {
      return null
    }
    return new Channel(row)
  }

  static last (): null | Channel {
    const row: undefined | IChannelRow = getDb().
      prepare('SELECT * FROM channels ORDER BY ID DESC LIMIT 1')
      .get() as undefined | IChannelRow
    if(!row) {
      return null
    }
    return new Channel(row)
  }

  static all (): Channel[] {
    const rows: undefined | IChannelRow[] = getDb().
      prepare('SELECT * FROM channels')
      .all() as undefined | IChannelRow[]
    if(!rows) {
      return []
    }
    return rows.map((row) => new Channel(row))
  }

  webhooks (): Webhook[] {
    if(!this.id) {
      return []
    }
    return Webhook.where('channel_id', this.id)
  }
}

export interface IChannelRow {
  ID: number,
  name: string,
  description: string,
  discord_server: string,
  discord_channel: string,
  irc_channel: string,
  irc_server_ip: string,
  irc_server_name: string,
  created_at: string,
  updated_at: string,
  is_private: number,
  owner_id: number
}
