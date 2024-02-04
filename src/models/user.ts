import { getDb } from "../base/db"

type UserColumn = 'ID'
  | 'username'
  | 'password'
  | 'register_ip'
  | 'login_ip'
  | 'created_at'
  | 'updated_at'
  | 'is_admin'
  | 'is_blocked'

export interface IUserConstructor {
  ID?: number | bigint | null
  username: string
  password: string
  register_ip: string
  login_ip?: string
  created_at?: string | null
  updated_at?: string | null
  is_admin?: 0 | 1
  is_blocked?: 0 | 1
}

export class User {
  id: number | bigint | null
  username: string
  password: string
  registerIp: string
  loginIp: string
  createdAt: string | null
  updatedAt: string | null
  isAdmin: 0 | 1
  isBlocked: 0 | 1

  constructor(row: IUserConstructor) {
    this.id = row.ID || null
    this.username = row.username
    this.password = row.password
    this.registerIp = row.register_ip
    this.loginIp = row.login_ip || ''
    this.createdAt = row.updated_at || null
    this.updatedAt = row.created_at || null
    this.isAdmin = row.is_admin || 0
    this.isBlocked = row.is_blocked || 0
  }

  blocked(): boolean {
    return this.isBlocked === 1
  }

  admin(): boolean {
    return this.isAdmin === 1
  }

  save (): void {
    this.id ? this.update() : this.insert()
  }

  insert (): void {
    const insertQuery = `
    INSERT INTO users(
      username, password,
      register_ip, login_ip,
      created_at, updated_at,
      is_admin, is_blocked
    ) VALUES (
      ?, ?,
      ?, ?,
      DateTime('now'), DateTime('now'),
      ?, ?
    );
    `
    const stmt = getDb().prepare(insertQuery)
    const result = stmt.run(
      this.username,
      this.password,
      this.registerIp,
      this.loginIp,
      this.isAdmin,
      this.isBlocked
    )
    this.id = result.lastInsertRowid
  }

  update (): void {
    const insertQuery = `
    UPDATE users SET
      username = ?, password = ?,
      is_admin = ?, is_blocked = ?,
      updated_at = DateTime('now')
    WHERE ID = ?;
    `
    const stmt = getDb().prepare(insertQuery)
    stmt.run(
      this.username,
      this.password,
      this.isAdmin,
      this.isBlocked,
      this.id
    )
  }

  static find (id: number | bigint): null | User {
    const row: undefined | IUserRow = getDb().
      prepare('SELECT * FROM users WHERE ID = ?')
      .get(id) as undefined | IUserRow
    if(!row) {
      return null
    }
    return new User(row)
  }

  static first (): null | User {
    const row: undefined | IUserRow = getDb().
      prepare('SELECT * FROM users ORDER BY ID ASC LIMIT 1')
      .get() as undefined | IUserRow
    if(!row) {
      return null
    }
    return new User(row)
  }

  static last (): null | User {
    const row: undefined | IUserRow = getDb().
      prepare('SELECT * FROM users ORDER BY ID DESC LIMIT 1')
      .get() as undefined | IUserRow
    if(!row) {
      return null
    }
    return new User(row)
  }


  static all (): User[] {
    const rows: undefined | IUserRow[] = getDb().
      prepare('SELECT * FROM users')
      .all() as undefined | IUserRow[]
    if(!rows) {
      return []
    }
    return rows.map((row) => new User(row))
  }

  static findByCredentials (username: string, password: string): null | User {
    const row: undefined | IUserRow = getDb().
      prepare('SELECT * FROM users WHERE username = ? AND password = ?')
      .get(username, password) as undefined | IUserRow
    if(!row) {
      return null
    }
    return new User(row)
  }
}


export interface IUserRow {
  ID: number | bigint,
  username: string,
  password: string,
  register_ip: string,
  login_ip: string,
  created_at: string,
  updated_at: string,
  is_admin: 0 | 1,
  is_blocked: 0 | 1
}
