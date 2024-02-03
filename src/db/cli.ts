// TODO: move this to own project https://github.com/ChillerDragon/irc-websockets/issues/3

import path from 'path'
import Database from 'better-sqlite3'

import { readFileSync, readdirSync } from 'fs'
import { exit } from 'process'
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

const actionMigrate = (flagForce: boolean): void => {
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
        if(sqlCommand.toLowerCase().includes('warning')) {
            if(!flagForce) {
                console.log('[!] Found warning in migration. Aborting ...')
                console.log('[!] Please inspect the migration file and check the warning')
                console.log('[!] Then if you still want to run the migration run it with --force')
                exit(1)
            }
        }
        if(sqlCommand.toLowerCase().includes('drop table')) {
            if(!flagForce) {
                console.log('[!] Found DROP TABLE in migration. Aborting ...')
                console.log('[!] Please inspect the migration file and verify you will not lose important data')
                console.log('[!] Then if you still want to run the migration run it with --force')
                exit(1)
            }
        }
        db.exec(sqlCommand)
        setDbVersion(fileTs)
    }
}

const usage = (): void => {
    console.log('usage: cli.ts [action]')
    console.log('actions:')
    console.log('  migrate')
}

const main = (): void => {
    const args = process.argv
    // hack to get only args passed to script
    // no matter if compiled or not
    // run directly or with ts-node
    let action = ''
    let flagForce = false
    while(!args.shift()?.endsWith(path.basename(__filename))) {}
    for(const arg of args) {
        if(['migrate'].includes(arg)) {
            if (action !== '') {
                console.log(`Error: unexpected argument '${arg}'`)
                exit(1)
            }
            action = arg
        } else if (arg === 'seed') {
            console.log('too lazy to code this ...')
            console.log('please just run this manually:')
            console.log('')
            console.log('  npm run seed')
            console.log('')
            exit(1)
        } else if(arg === '--force') {
            flagForce = true
        } else {
            usage()
            exit(1)
        }
    }
    if (action === 'migrate') {
        actionMigrate(flagForce)
    }
    if(args.length === 0) {
        usage()
        exit(0)
    }
}

main()
