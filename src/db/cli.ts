// TODO: move this to own project https://github.com/ChillerDragon/irc-websockets/issues/3

import path from 'path'
import Database from 'better-sqlite3'

import { readFileSync, readdirSync } from 'fs'
const db = new Database('./db/main.db')
db.pragma('journal_mode = WAL')

interface IUserVersion {
    user_version: number
}

export const getDbVersion = (): number => {
    const rows: IUserVersion[] = db.pragma('user_version') as IUserVersion[]
    if (rows.length === 0) {
        return 0
    }
    return rows[0].user_version
}

export const setDbVersion = (version: number): boolean => {
    const result = db.pragma(`user_version = ${version}`)
    if (result && typeof result === 'object' && (result as Array<any>).length === 0) {
        return true
    }
    console.log(`[!] failed to set db version:`)
    console.log(result)
    return false
}

const getMigrationsFolder = (): string => {
    return path.join(__dirname, '..', '..', 'db', 'migrations')
}

const actionMigrate = (): void => {
    const latestTs = getDbVersion()
    const files = readdirSync(getMigrationsFolder())
    for(const file of files) {
        const match = file.match(/^(\d{10})_[a-zA-Z0-9_]+.sql$/)
        if(!match) {
            continue
        }
        const fileTs = parseInt(match[1], 10)
        if(fileTs <= latestTs) {
            console.log(`[*] already ran ${file} ...`)
            continue
        }
        console.log(`[*] applying ${file} ...`)
        const sqlCommand = readFileSync(path.join(getMigrationsFolder(), file), { encoding: 'utf8', flag: 'r' })
        db.exec(sqlCommand)
        setDbVersion(fileTs)
    }
}

const main = (): void => {
    const args = process.argv
    // hack to get only args passed to script
    // no matter if compiled or not
    // run directly or with ts-node
    while(!args.shift()?.endsWith(path.basename(__filename))) {}
    for(const arg of args) {
        if(arg === 'migrate') {
            actionMigrate()
        }
    }
}

main()
