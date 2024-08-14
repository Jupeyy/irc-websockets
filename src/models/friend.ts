import { User } from "./user"
import { getDb } from "../base/db"

type FriendColumn = 'ID'
  | 'user_a_id'
  | 'user_b_id'
  | 'created_at'
  | 'updated_at'

export interface IFriendRow {
  ID: number | bigint
  user_a_id: number | bigint
  user_b_id: number | bigint
  created_at: string
  updated_at: string
}

export interface IFriendConstructor {
  ID?: number | bigint | null
  user_a_id: number | bigint
  user_b_id: number | bigint
  created_at?: string
  updated_at?: string
}

export class Friend {
  id: number | bigint | null
  userAId: number | bigint
  userBId: number | bigint
  createdAt: string | null
  updatedAt: string | null

  /**
   * errors
   *
   * activerecord like error array
   * if validation fails this array will contain the errors as strings
   */
  errors: string[]

  constructor(columns: IFriendConstructor) {
    this.id = columns.ID || null
    this.userAId = columns.user_a_id
    this.userBId = columns.user_b_id
    this.createdAt = columns.created_at || null
    this.updatedAt = columns.updated_at || null
    this.errors = []
  }

  save (): void {
    this.id ? this.update() : this.insert()
  }

  insert (): Friend | boolean {
    const insertQuery = `
    INSERT INTO friends(
      user_a_id, user_b_id,
      created_at, updated_at
    ) VALUES (
      ?, ?,
      DateTime('now'), DateTime('now')
    );
    `
    const stmt = getDb().prepare(insertQuery)
    const result = stmt.run(
      this.userAId, this.userBId,
    )
    this.id = result.lastInsertRowid
    return true
  }

  update (): void {
    console.warn('friendship can not be updated')
  }

  static find (friendId: number | bigint | string): null | Friend {
    const row: undefined | IFriendRow = getDb().
      prepare('SELECT * FROM friends WHERE ID = ?')
      .get(friendId) as undefined | IFriendRow
    if(!row) {
      return null
    }
    return new Friend(row)
  }

  static first (): null | Friend {
    const row: undefined | IFriendRow = getDb().
      prepare('SELECT * FROM friends ORDER BY ID ASC LIMIT 1')
      .get() as undefined | IFriendRow
    if(!row) {
      return null
    }
    return new Friend(row)
  }

  static last (): null | Friend {
    const row: undefined | IFriendRow = getDb().
      prepare('SELECT * FROM friends ORDER BY ID DESC LIMIT 1')
      .get() as undefined | IFriendRow
    if(!row) {
      return null
    }
    return new Friend(row)
  }

  static all (): Friend[] {
    const rows: undefined | IFriendRow[] = getDb().
      prepare('SELECT * FROM friends')
      .all() as undefined | IFriendRow[]
    if(!rows) {
      return []
    }
    return rows.map((row) => new Friend(row))
  }

  /**
   * where
   *
   * get Friend instance based on sql where statement
   * given a custom value and column
   *
   * @param column VUNERABLE TO SQL INJECTIONS!!!! THIS SHOULD NEVER BE USER INPUT!
   * @param value
   * @returns list of Friend instances
   */
  static where (column: FriendColumn, value: number | bigint | string): Friend[] {
    if (!/^[a-z_]+$/.test(column)) {
      throw new Error(`SQL injection prevention. column='${column}' value='${value}'`);
    }
    const rows: IFriendRow[] = getDb().
      prepare(`SELECT * FROM friends WHERE ${column} = ?`)
      .all(value) as IFriendRow[]
    if(!rows) {
      return []
    }
    return rows.map((row) => new Friend(row))
  }

  static whereUserId (userId: number | bigint | string): Friend[] {
    const rows: IFriendRow[] = getDb().
      prepare(`SELECT * FROM friends WHERE user_a_id = ? or user_b_id = ?`)
      .all(userId, userId) as IFriendRow[]
    if(!rows) {
      return []
    }
    return rows.map((row) => new Friend(row))
  }

  userA(): null | User {
    if(!this.id) {
      return null
    }
    return User.find(this.userAId)
  }

  userB(): null | User {
    if(!this.id) {
      return null
    }
    return User.find(this.userAId)
  }

  users(): User[] {
    if(!this.id) {
      return []
    }
    const users = []
    const a = this.userA()
    if(a) {
      users.push(a)
    }
    const b = this.userB()
    if(b) {
      users.push(b)
    }
    return users
  }

  // given one user instance of the users
  // return the friend of that user
  // returns null if the user is not found
  other(user: User): User | null {
    const users = this.users()
    if(users.length !== 2) {
      return null
    }
    if(!users.find((u) => u.id === user.id)) {
      return null
    }
    const others = users.filter((u) => u.id !== user.id)
    if(others.length !== 1) {
      return null
    }
    return others[0]
  }
}

