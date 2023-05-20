import irc = require('irc')
import { Socket } from 'socket.io'
import { ClientToServerEvents, ServerToClientEvents, IrcMessage } from './socket.io'
import express from 'express'
import { createServer } from "http";
import { Server } from "socket.io";
const cors = require('cors')

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: "*"
  }
})

require('dotenv').config()

// log of last 10 messages
const messageRobin: IrcMessage[] = []

const logMessage = (msg: IrcMessage): void => {
  messageRobin.push(msg)
  while (messageRobin.length > 10) {
    messageRobin.shift()
  }
}

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

// http

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', '*')
  res.setHeader('Access-Control-Allow-Headers', '*')
  console.log('WWW: %s %s %s', req.method, req.originalUrl, req.ip)
  next()
})
app.use(cors())
app.get('/messages', (req, res) => {
  res.end(JSON.stringify(messageRobin))
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
      logMessage(message)
    })

    client.addListener(`message#${process.env.IRC_CHANNEL}`, (from, message) => {
      console.log(from + ' => #yourchannel: ' + message)
      const ircMessage = { from: from, message: message }
      logMessage(ircMessage)
      socket.emit('message', ircMessage)
    })
})

httpServer.listen(6969, (): void => {
    console.log('[*] listening on http://localhost:6969')
})
