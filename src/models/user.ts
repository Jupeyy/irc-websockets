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

export class User {
  id: number | bigint
  username: string
  password: string
  registerIp: string
  loginIp: string
  createdAt: string
  updatedAt: string
  isAdmin: 0 | 1
  isBlocked: 0 | 1

  constructor(row: IUserRow) {
    this.id = row.ID
    this.username = row.username
    this.password = row.password
    this.registerIp = row.register_ip
    this.loginIp = row.login_ip
    this.createdAt = row.created_at
    this.updatedAt = row.updated_at
    this.isAdmin = row.is_admin
    this.isBlocked = row.is_blocked
  }

  blocked(): boolean {
    return this.isBlocked === 1
  }

  insert (ipAddr: string): void {
    const insertQuery = `
    INSERT INTO Accounts(
      username, password,
      register_ip, login_ip,
      created_at, updated_at,
      is_admin, blocked
    ) VALUES (
      ?, ?,
      ?, ?,
      DateTime('now'), DateTime('now'),
      ?, ?
    );
    `
    const stmt = getDb().prepare(insertQuery)
    stmt.run(
      this.username,
      this.password,
      ipAddr,
      ipAddr,
      this.isAdmin,
      this.isBlocked
    )
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
