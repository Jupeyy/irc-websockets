import irc = require('irc')
import { Socket } from 'socket.io'
import { ClientToServerEvents, ServerToClientEvents, IrcMessage } from './socket.io'

import { createServer } from "http";
import { Server } from "socket.io";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*"
  }
})

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

client.addListener('error', (message) => {
    console.log('error: ', message)
})

// ws

io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>): void => {
    const ipAddr = socket.client.conn.remoteAddress
    const userAgent = socket.handshake.headers['user-agent']
    console.log(`[*] connect ${ipAddr} ${userAgent}`)
  
    socket.on('message', (message: IrcMessage): void => {
      console.log(`[*] message from ${ipAddr} ${userAgent}`)
      console.log(`    ${message.message}`)
      client.say(`#${process.env.IRC_CHANNEL}`, message.message)
    })

    client.addListener(`message#${process.env.IRC_CHANNEL}`, (from, message) => {
        console.log(from + ' => #yourchannel: ' + message)
        socket.emit('message', { from: from, message: message })
    })
})

httpServer.listen(6969, (): void => {
    console.log('[*] listening on http://localhost:6969')
})
