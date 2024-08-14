import { User } from "./user"
import { getDb } from "../base/db"

type MessageColumn = 'ID'
  | 'friend_id'
  | 'server_id'
  | 'channel_id'
  | 'user_id'
  | 'content'
  | 'created_at'
  | 'updated_at'

export interface IMessageRow {
  ID: number | bigint
  friend_id: number | bigint
  server_id: number | bigint
  channel_id: number | bigint
  user_id: number | bigint
  content: string
  created_at: string
  updated_at: string
}

export interface IMessageConstructor {
  ID?: number | bigint | null
  friend_id: number | bigint
  server_id: number | bigint
  channel_id: number | bigint
  user_id: number | bigint
  content: string
  created_at?: string
  updated_at?: string
}

export class Message {
  id: number | bigint | null
  friendId: number | bigint
  serverId: number | bigint
  channelId: number | bigint
  userId: number | bigint
  content: string
  createdAt: string | null
  updatedAt: string | null

  /**
   * errors
   *
   * activerecord like error array
   * if validation fails this array will contain the errors as strings
   */
  errors: string[]

  constructor(columns: IMessageConstructor) {
    this.id = columns.ID || null
    this.friendId = columns.friend_id
    this.serverId = columns.server_id
    this.channelId = columns.channel_id
    this.userId = columns.user_id
    this.content = columns.content
    this.createdAt = columns.created_at || null
    this.updatedAt = columns.updated_at || null
    this.errors = []
  }

  valid (): boolean {
    this.errors = []

    if (this.friendId !== 0 && (this.serverId !== 0|| this.channelId !== 0)) {
      this.errors.push('friendId and serverId or channelId are all set. A message can not be in a channel and a dm at the same time')
    }
    if (this.friendId === 0 && (this.serverId === 0 || this.channelId === 0)) {
      this.errors.push('friendId and serverId or channelId are unset. A message has to be part of a channel or a dm')
    }

    return this.errors.length === 0
  }

  save (): void {
    this.id ? this.update() : this.insert()
  }

  insert (): Message | boolean {
    if (!this.valid()) {
      throw Error(this.errors.join(','))
    }
    const insertQuery = `
    INSERT INTO messages(
      friend_id,
      server_id, channel_id,
      user_id,
      content,
      created_at, updated_at
    ) VALUES (
      ?, ?,
      DateTime('now'), DateTime('now')
    );
    `
    const stmt = getDb().prepare(insertQuery)
    const result = stmt.run(
      this.friendId,
      this.serverId, this.channelId,
      this.userId,
      this.content
    )
    this.id = result.lastInsertRowid
    return true
  }

  update (): void {
    if (!this.valid()) {
      throw Error(this.errors.join(','))
    }
    console.warn('messages can not be updated yet')
  }

  static find (messageId: number | bigint | string): null | Message {
    const row: undefined | IMessageRow = getDb().
      prepare('SELECT * FROM messages WHERE ID = ?')
      .get(messageId) as undefined | IMessageRow
    if(!row) {
      return null
    }
    return new Message(row)
  }

  static first (): null | Message {
    const row: undefined | IMessageRow = getDb().
      prepare('SELECT * FROM messages ORDER BY ID ASC LIMIT 1')
      .get() as undefined | IMessageRow
    if(!row) {
      return null
    }
    return new Message(row)
  }

  static last (): null | Message {
    const row: undefined | IMessageRow = getDb().
      prepare('SELECT * FROM messages ORDER BY ID DESC LIMIT 1')
      .get() as undefined | IMessageRow
    if(!row) {
      return null
    }
    return new Message(row)
  }

  static all (): Message[] {
    const rows: undefined | IMessageRow[] = getDb().
      prepare('SELECT * FROM messages')
      .all() as undefined | IMessageRow[]
    if(!rows) {
      return []
    }
    return rows.map((row) => new Message(row))
  }

  /**
   * where
   *
   * get Message instance based on sql where statement
   * given a custom value and column
   *
   * @param column VUNERABLE TO SQL INJECTIONS!!!! THIS SHOULD NEVER BE USER INPUT!
   * @param value
   * @returns list of Message instances
   */
  static where (column: MessageColumn, value: number | bigint | string): Message[] {
    if (!/^[a-z_]+$/.test(column)) {
      throw new Error(`SQL injection prevention. column='${column}' value='${value}'`);
    }
    const rows: IMessageRow[] = getDb().
      prepare(`SELECT * FROM messages WHERE ${column} = ?`)
      .all(value) as IMessageRow[]
    if(!rows) {
      return []
    }
    return rows.map((row) => new Message(row))
  }

  user(): null | User {
    if(!this.id) {
      return null
    }
    return User.find(this.userId)
  }

  isDm(): boolean {
    return this.friendId !== 0
  }
}

