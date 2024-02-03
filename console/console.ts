import repl from 'repl'
import path from 'path'
import { readdirSync } from 'fs'
import * as db from '../src/base/db'

console.log(`
 _
(_)_ __ ___    __      _____
| | '__/ __|___\\ \\ /\\ / / __|
| | | | (_|_____\\ V  V /\\__ \\
|_|_|  \\___|     \\_/\\_/ |___/

`)
console.log('[irc-websockets] **************************************************************')
console.log('[irc-websockets] * interactive console                                        *')
console.log('[irc-websockets] * changes will affect your production database permanently   *')
console.log('[irc-websockets] * there is no rollback or safe mode                          *')
console.log('[irc-websockets] **************************************************************')
console.log('[irc-websockets] use db. or getDb(). to access the database. For example:')
console.log("[irc-websockets]")
console.log("[irc-websockets]   db.prepare('SELECT * FROM users WHERE ID = 1').all()")
console.log("[irc-websockets]")
console.log("[irc-websockets] You have access to all the models. You can use them like this:")
console.log("[irc-websockets]")
console.log("[irc-websockets]   Channel.find(1).webhooks()")
console.log("[irc-websockets]")

const replServer = repl.start({
  prompt: '> '
})
replServer.setupHistory(path.join(__dirname, '.console_history'), (err) => {
  if(err) {
    console.log(`[!] failed to save history`)
    console.log(err)
  }
})

// use either db. or getDb(). in global repl scope
// to access the database
replServer.context.db = db.getDb()
replServer.context.getDb = db.getDb

const files = readdirSync(path.join(__dirname, '../src/models/')).filter((e) => /\.ts$/.test(e)).map((e) => e.split('.')[0])
files.forEach((model) => {
  import(`../src/models/${model}`).then((module) => {
    const camel = `${model[0].toUpperCase()}${model.substring(1)}`
    replServer.context[camel] = module[camel]
  })
})
