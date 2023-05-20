import irc = require('irc')
import express from 'express'
import { Socket } from 'socket.io'
import { ClientToServerEvents, ServerToClientEvents } from './socket.io'
const app = express()
const http = require('http').Server(app)
const io: Socket<ClientToServerEvents, ServerToClientEvents> = require('socket.io')(http)
require('dotenv').config()

if (!process.env.IRC_CHANNEL) {
	console.log('Error: IRC_CHANNEL is not set! check your .env file')
	process.exit(1)
}
if (!process.env.IRC_SERVER) {
	console.log('Error: IRC_SERVER is not set! check your .env file')
	process.exit(1)
}

const client = new irc.Client(process.env.IRC_SERVER, 'ws-client', {
	channels: [`#${process.env.IRC_CHANNEL}`],
})

client.addListener(`message#${process.env.IRC_CHANNEL}`, (from, message) => {
    console.log(from + ' => #yourchannel: ' + message)
})

client.addListener('error', (message) => {
    console.log('error: ', message)
})

// ws

io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>): void => {
    const ipAddr = socket.client.conn.remoteAddress
    const userAgent = socket.handshake.headers['user-agent']
    console.log(`[*] connect ${ipAddr} ${userAgent}`)
  
    socket.on('message', (message: string): void => {
      console.log(`[*] message from ${ipAddr} ${userAgent}`)
      console.log(`    ${message}`)
    })
})

http.listen(6969, (): void => {
    console.log('[*] listening on http://localhost:6969')
})
