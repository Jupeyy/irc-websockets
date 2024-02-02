import { getDb } from "../base/db"

export class Channel {
  id: number
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

  static find (channelId: number | string): null | Channel {
    const row: undefined | IChannelRow = getDb().
      prepare('SELECT * FROM channels WHERE ID = ?')
      .get(channelId) as undefined | IChannelRow
    if(!row) {
      return null
    }
    return new Channel(row)
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
