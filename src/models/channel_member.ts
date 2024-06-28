import { Channel } from "./channel"
import { User } from "./user"
import { Server } from "./server"
import { getDb } from "../base/db"

type ChannelMemberColumn = 'ID'
  | 'channel_id'
  | 'user_id'
  | 'lowest_requested_msg_id'
  | 'highest_requested_msg_id'
  | 'unred_msg_id'
  | 'has_write_access'
  | 'created_at'
  | 'updated_at'

export interface IChannelMemberRow {
  ID: number | bigint
  channel_id: number | bigint
  user_id: number | bigint
  lowest_requested_msg_id: number | bigint | null
  highest_requested_msg_id: number | bigint | null
  unred_msg_id: number | bigint | null
  has_write_access: number
  created_at: string
  updated_at: string
}

export interface IChannelMemberConstructor {
  ID?: number | bigint | null
  channel_id: number | bigint
  user_id: number | bigint
  lowest_requested_msg_id: number | bigint | null
  highest_requested_msg_id: number | bigint | null
  unred_msg_id: number | bigint | null
  has_write_access: number
  created_at?: string
  updated_at?: string
}

export class ChannelMember {
  id: number | bigint | null
  channelId: number | bigint
  userId: number | bigint
  lowestRequestedMsgId: number | bigint | null
  highestRequestedMsgId: number | bigint | null
  unredMsgId: number | bigint | null
  hasWriteAccess: number
  createdAt: string | null
  updatedAt: string | null


  /**
   * errors
   *
   * activerecord like error array
   * if validation fails this array will contain the errors as strings
   */
  errors: string[]

  constructor(columns: IChannelMemberConstructor) {
    this.id = columns.ID || null
    this.channelId = columns.channel_id
    this.userId = columns.user_id
    this.lowestRequestedMsgId = columns.lowest_requested_msg_id
    this.highestRequestedMsgId = columns.highest_requested_msg_id
    this.unredMsgId = columns.unred_msg_id
    this.hasWriteAccess = columns.has_write_access
    this.createdAt = columns.created_at || null
    this.updatedAt = columns.updated_at || null
    this.errors = []
  }

  save (): void {
    this.id ? this.update() : this.insert()
  }

  insert (): ChannelMember | boolean {
    const insertQuery = `
    INSERT INTO channel_members(
      channel_id, user_id,
      lowest_requested_msg_id, highest_requested_msg_id,
      unred_msg_id,
      has_write_access,
      created_at, updated_at
    ) VALUES (
      ?, ?,
      ?, ?,
      ?,
      ?,
      DateTime('now'), DateTime('now')
    );
    `
    const stmt = getDb().prepare(insertQuery)
    const result = stmt.run(
      this.channelId, this.userId,
      this.lowestRequestedMsgId, this.highestRequestedMsgId,
      this.unredMsgId,
      this.hasWriteAccess,
    )
    this.id = result.lastInsertRowid
    return true
  }

  update (): void {
    const updateQuery = `
    UPDATE channel_members SET
      channel_id = ?, user_id = ?,
      lowest_requested_msg_id = ?, highest_requested_msg_id = ?,
      unred_msg_id = ?,
      has_write_access = ?,
      updated_at = DateTime('now')
    WHERE ID = ?;
    `
    const stmt = getDb().prepare(updateQuery)
    stmt.run(
      this.channelId, this.userId,
      this.lowestRequestedMsgId, this.highestRequestedMsgId,
      this.unredMsgId,
      this.hasWriteAccess,
      this.id
    )
  }

  static find (channelMemberId: number | bigint | string): null | ChannelMember {
    const row: undefined | IChannelMemberRow = getDb().
      prepare('SELECT * FROM channel_members WHERE ID = ?')
      .get(channelMemberId) as undefined | IChannelMemberRow
    if(!row) {
      return null
    }
    return new ChannelMember(row)
  }

  static first (): null | ChannelMember {
    const row: undefined | IChannelMemberRow = getDb().
      prepare('SELECT * FROM channel_members ORDER BY ID ASC LIMIT 1')
      .get() as undefined | IChannelMemberRow
    if(!row) {
      return null
    }
    return new ChannelMember(row)
  }

  static last (): null | ChannelMember {
    const row: undefined | IChannelMemberRow = getDb().
      prepare('SELECT * FROM channel_members ORDER BY ID DESC LIMIT 1')
      .get() as undefined | IChannelMemberRow
    if(!row) {
      return null
    }
    return new ChannelMember(row)
  }

  static all (): ChannelMember[] {
    const rows: undefined | IChannelMemberRow[] = getDb().
      prepare('SELECT * FROM channel_members')
      .all() as undefined | IChannelMemberRow[]
    if(!rows) {
      return []
    }
    return rows.map((row) => new ChannelMember(row))
  }

  /**
   * where
   *
   * get ChannelMember instance based on sql where statement
   * given a custom value and column
   *
   * @param column VUNERABLE TO SQL INJECTIONS!!!! THIS SHOULD NEVER BE USER INPUT!
   * @param value
   * @returns list of ChannelMember instances
   */
  static where (column: ChannelMemberColumn, value: number | bigint | string): ChannelMember[] {
    if (!/^[a-z_]+$/.test(column)) {
      throw new Error(`SQL injection prevention. column='${column}' value='${value}'`);
    }
    const rows: IChannelMemberRow[] = getDb().
      prepare(`SELECT * FROM channel_members WHERE ${column} = ?`)
      .all(value) as IChannelMemberRow[]
    if(!rows) {
      return []
    }
    return rows.map((row) => new ChannelMember(row))
  }

  static findByUserAndChannel (userId: number | bigint, channelId: number | bigint): null | ChannelMember {
    const row: undefined | IChannelMemberRow = getDb().
      prepare('SELECT * FROM channel_members WHERE user_id = ? AND channel_id = ?')
      .get(userId, channelId) as undefined | IChannelMemberRow
    if(!row) {
      return null
    }
    return new ChannelMember(row)
  }

  requestedMsgId(msgId: number | bigint) {
    if(!this.id) {
      console.error("error non loaded users can not request msg ids")
      return
    }
    let edited = false
    if(!this.highestRequestedMsgId || this.highestRequestedMsgId < msgId) {
      console.log(`user=${this.userId} in channel=${this.channelId} red new message ${msgId}`)
      this.highestRequestedMsgId = msgId
      edited = true
    }
    if(!this.lowestRequestedMsgId || this.lowestRequestedMsgId > msgId) {
      console.log(`user=${this.userId} in channel=${this.channelId} scrolled to old ${msgId}`)
      this.lowestRequestedMsgId = msgId
      edited = true
    }
    if (edited) {
      this.save()
    }
  }

  channel(): null | Channel {
    if(!this.id) {
      return null
    }
    return Channel.find(this.channelId)
  }

  user(): null | User {
    if(!this.id) {
      return null
    }
    return User.find(this.userId)
  }

  server (): null | Server {
    const channel = this.channel()
    if(!channel) {
      return null
    }
    return channel.server()
  }

  lastRedMsgId(): number | bigint | null {
    if (this.unredMsgId) {
      this.unredMsgId
    }
    return this.highestRequestedMsgId
  }
}
