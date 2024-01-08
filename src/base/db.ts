import Database from 'better-sqlite3'
const db = new Database('./db/main.db')
db.pragma('journal_mode = WAL')

const dbQuery = `
CREATE TABLE IF NOT EXISTS Accounts(
  ID INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  password TEXT,
  register_ip TEXT,
  login_ip TEXT,
  created_at TEXT,
  updated_at TEXT,
  is_admin INTEGER
)`

export interface IUserRow {
  ID: number,
  username: string,
  password: string,
  register_ip: string,
  login_ip: string,
  created_at: string,
  updated_at: string,
  is_admin: number
}

db.exec(dbQuery)

export const addNewUser = (username: string, password: string) => {
  const insertQuery = `INSERT INTO Accounts(
    username, password, register_ip, login_ip, created_at, updated_at, is_admin 
  ) VALUES (?, ? , ?, ?, ?, ?, ?);
  `
  const stmt = db.prepare(insertQuery)
  stmt.run(
    username,
    password,
    '127.0.0.1',
    '127.0.0.1',
    'now',
    'now',
    0
  )
}

export const isUsernameTaken = (username: string): boolean => {
  const row = db.prepare('SELECT * FROM Accounts WHERE username = ?').get(username)
  if(!row) {
    return false
  }
  return true
}

export const getUser = (username: string, password: string): null | IUserRow => {
  const row: undefined | IUserRow = db.
    prepare('SELECT * FROM Accounts WHERE username = ? AND password = ?')
    .get(username, password) as undefined | IUserRow
  if(!row) {
    return null
  }
  return row
}

export const getDb = () => db
