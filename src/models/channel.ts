import { getDb } from "../base/db"
import { Webhook } from "./webhook"

export class Channel {
  id: number | bigint
  name: string
  description: string
  discordServer: string
  discordChannel: string
  ircChannel: string
  ircServerIp: string
  ircServerName: string
  createdAt: string
  updatedAt: string
  private: number
  ownerId: number

  constructor(row: IChannelRow) {
    this.id = row.ID
    this.name = row.name
    this.description = row.description
    this.discordServer = row.discord_server
    this.discordChannel = row.discord_channel
    this.ircChannel = row.irc_channel
    this.ircServerIp = row.irc_server_ip
    this.ircServerName = row.irc_server_name
    this.createdAt = row.created_at
    this.updatedAt = row.updated_at
    this.private = row.private
    this.ownerId = row.owner_id
  }

  insert (): void {
    const insertQuery = `
    INSERT INTO channels(
      name, description,
      discord_server, discord_channel,
      irc_channel, irc_server_ip, irc_server_name,
      created_at, updated_at,
      private, owner_id
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

  webhooks (): Webhook[] {
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
  private: number,
  owner_id: number
}
