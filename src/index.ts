import irc = require('irc')
import { Socket } from 'socket.io'
import { ClientToServerEvents, ServerToClientEvents, IrcMessage, AuthRequest, AuthResponse, JoinChannel } from './socket.io'
import express, { Request, Response } from 'express'
import { createServer } from "http";
import { Server } from "socket.io";
import bodyParser from 'body-parser';
const cors = require('cors')

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: "*"
  }
})

require('dotenv').config()

const generateToken = (len: number): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let token = ''
  for(let i = 0; i < len; i++) {
      token += chars[Math.floor(Math.random() * chars.length)]
  }
  return token
}

const isTrue = (envbool: string) => {
  return new RegExp('^(1|true|yes|on)$', 'i').test(envbool)
}

interface User {
  username: string,
  sessionToken: string,
  socket: Socket,
  loggedIn: boolean,
  activeChannel: string,
  activeServer: string
}
interface UserList {
  [index: string]: User
}

/*
  users

  list of currently connected users
*/
const users: UserList = {}

const getUserByName = (username: string): User | null => {
  if (username === '') {
    return null
  }
  return Object.values(users).find((user) => user.loggedIn && user.username === username) || null
}

const getUserBySocket = (socket: Socket): User | null => {
  return users[socket.id]
  // return users.find((user) => user.loggedIn && user.socket.id === socket.id) || null
}

if (!process.env.IRC_CHANNEL) {
	console.log('Error: IRC_CHANNEL is not set! check your .env file')
	process.exit(1)
}
if (!process.env.IRC_SERVER) {
	console.log('Error: IRC_SERVER is not set! check your .env file')
	process.exit(1)
}
if (!process.env.ACCOUNTS_PASSWORD) {
	console.log('Error: ACCOUNTS_PASSWORD is not set! check your .env file')
	process.exit(1)
}
if (!process.env.ADMIN_TOKEN) {
	console.log('Error: ADMIN_TOKEN is not set! check your .env file')
	process.exit(1)
}
if (process.env.ADMIN_TOKEN === 'xxx') {
  console.log('Error: using the default ADMIN_TOKEN is not allowed')
  process.exit(1)
}
if (!process.env.BACKLOG_SIZE) {
	console.log('Error: BACKLOG_SIZE is not set! check your .env file')
	process.exit(1)
}

interface ChannelMapping {
  irc: {
    serverIp: string,
    serverName: string,
    channel: string,
  },
  discord: {
    server: string,
    channel: string
  }
}

// TODO: this should be a json not tracked in git
const connectedIrcChannels: ChannelMapping[] = [
  {
    irc: {
      serverIp: 'stockholm.se.quakenet.org',
      serverName: 'quakenet',
      channel: 'ddnet'
    },
    discord: {
      server: 'ddnet',
      channel: 'developer'
    }
  },
  {
    irc: {
      serverIp: 'stockholm.se.quakenet.org',
      serverName: 'quakenet',
      channel: 'ddnet-off-topic'
    },
    discord: {
      server: 'ddnet',
      channel: 'off-topic'
    }
  },
  {
    irc: {
      serverIp: 'stockholm.se.quakenet.org',
      serverName: 'quakenet',
      channel: 'ddnet-test'
    },
    discord: {
      server: 'test',
      channel: 'test'
    }
  }
]

const getMappingByDiscord = (discordServer: string, discordChannel: string): ChannelMapping | null => {
  return connectedIrcChannels.filter((mapping: ChannelMapping) => {
    return mapping.discord.server === discordServer && mapping.discord.channel === discordChannel
  })[0] || null
}

const isValidDiscordChannel = (discordServer: string, discordChannel: string): boolean => {
  const matches = connectedIrcChannels.filter((mapping: ChannelMapping) => {
    return mapping.discord.server === discordServer && mapping.discord.channel === discordChannel
  })
  return matches.length === 1
}

if (connectedIrcChannels.filter((entry) => entry.irc.channel === process.env.IRC_CHANNEL).length === 0) {
  console.log(`[*] adding custom channel '${process.env.IRC_CHANNEL}'`)
  connectedIrcChannels.push(
    {
      irc: {
        serverIp: 'stockholm.se.quakenet.org',
        serverName: 'quakenet',
        channel: process.env.IRC_CHANNEL
      },
      discord: {
        server: 'unknown',
        channel: 'unknown'
      }
    }
  )
}

const activeIrcChannels = (): string[] => {
  return connectedIrcChannels.map((entry) => entry.irc.channel)
}

// log of last BACKLOG_SIZE messages
const BACKLOG_SIZE = parseInt(process.env.BACKLOG_SIZE, 10)
const messageRobin: Record<string, IrcMessage[]> = {}

const logMessage = (server: string, channel: string, msg: IrcMessage): void => {
  const channelIdentifier = `${server}#${channel}`
  if (!messageRobin[channelIdentifier]) {
    messageRobin[channelIdentifier] = []
  }
  messageRobin[channelIdentifier].push(msg)
  while (messageRobin[channelIdentifier].length > BACKLOG_SIZE) {
    messageRobin[channelIdentifier].shift()
  }
}

const getMessages = (server: string, channel: string): IrcMessage[] => {
  const channelIdentifier = `${server}#${channel}`
  if (!messageRobin[channelIdentifier]) {
    return []
  }
  return messageRobin[channelIdentifier]
}

interface Config {
  requirePasswords: boolean
}

const config: Config = {
  requirePasswords: isTrue(process.env.ACCOUNTS || '0')
}

const useAccounts = (): boolean => {
  return config.requirePasswords
}

const client = new irc.Client(process.env.IRC_SERVER, 'ws-client', {
	channels: activeIrcChannels().map((channel) => `#${channel}`),
})

const sendIrc = (ircServer: string, ircChannel: string, message: string): boolean => {
  if (ircServer !== 'quakenet') {
    console.log(`[!] failed to send to unsupported irc ircServer '${ircServer}'`)
    return false
  }
  client.say(`#${ircChannel}`, message)
  return true
}

client.addListener('error', (message) => {
    console.log('error: ', message)
})

const logoutUser = (user: User) => {
  console.log(`[*] logging out ${user.username}`)
  user.loggedIn = false
  user.socket.emit(
    'logout',
    {
      message: 'logged out'
    }
  )
}

// http

app.use(bodyParser.json())
app.use(
  bodyParser.urlencoded({
    extended: true
  })
)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', '*')
  res.setHeader('Access-Control-Allow-Headers', '*')
  console.log('WWW: %s %s %s', req.method, req.originalUrl, req.ip)
  next()
})
app.use(cors())
app.get('/:server/:channel/messages', (req, res) => {
  res.end(JSON.stringify(getMessages(req.params.server, req.params.channel)))
})
app.get('/users', (req, res) => {
  res.end(JSON.stringify(Object.values(users).map((user) => user.username)))
})

const checkAdminAuth = (req: Request, res: Response): boolean => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.send(JSON.stringify({
      error: 'Authentication is required please set the bearer authorization header.'
    }))
    return false
  }
  const authToken = authHeader.slice('Bearer '.length)
  console.log(`Auth token: ${authToken}`)
  if (authToken !== process.env.ADMIN_TOKEN) {
    res.send(JSON.stringify({
      error: 'Invalid API key provided'
     }))
    return false
  }
  return true
}

// curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer youradmintoken" --data '{"required": true }' http://localhost:6969/admin/logout_all
app.post('/admin/logout_all', (req: Request, res: Response) => {
  if (!checkAdminAuth(req, res)) {
    return
  }
  console.log(`[*] admin logged out all users`)
  Object.values(users).forEach((user) => logoutUser(user))
  res.send({
    message: 'OK'
  })
})

// curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer youradmintoken" --data '{"required": true }' http://localhost:6969/admin/password
app.post('/admin/password', (req: Request, res: Response) => {
  if (!checkAdminAuth(req, res)) {
    return
  }
  console.log(req.body)
  if (!req.body || req.body.required === undefined) {
    res.send({
      error: "missing key 'required'"
    })
    return
  }
  const { required } = req.body
  config.requirePasswords = required ? true : false
  console.log(`[*] admin set password required to ${required}`)
  res.send({
    message: 'OK'
  })
})

// ws

const checkAuth = (message: IrcMessage): boolean => {
  const user = getUserByName(message.from)
  if (!user) {
    return false
  }
  if (!user.loggedIn) {
    return false
  }
  if (user.sessionToken !== message.token) {
    console.log(`[!] Wrong token expected='${user.sessionToken}' got='${message.token}'`)
    return false
  }
  return true
}

const joinChannel = (socket: Socket, channel: string, server: string, _password: string = ''): boolean => {
  const user: User = users[socket.id]
  if (!user) {
    return false
  }
  if (!user.loggedIn) {
    return false
  }
  if (!isValidDiscordChannel(server, channel)) {
    console.log(`[!] illegal channel name requested '${server}#${channel}'`)
    return false
  }
  // TODO: we should probably disconenct
  //       all other channels now
  //       maybe except the channel with the socket id
  user.activeChannel = channel
  user.activeServer = server
  socket.join(channel)
  return true
}

connectedIrcChannels.forEach((connection: ChannelMapping) => {
  client.addListener(`message#${connection.irc.channel}`, (from, message) => {
    console.log(from + ' => #yourchannel: ' + message)
    const ircMessage = {
      from: from,
      message: message,
      channel: connection.irc.channel,
      server: connection.irc.serverName,
      date: new Date().toUTCString()
    }
    logMessage(connection.discord.server, connection.discord.channel, ircMessage)
    io.emit('message', ircMessage)
  })
})

io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>): void => {
    socket.join('_connecting')
    const ipAddr = socket.client.conn.remoteAddress
    const userAgent = socket.handshake.headers['user-agent']
    console.log(`[*] connect ${ipAddr} ${userAgent}`)
    const user: User = {
      username: 'connecting',
      sessionToken: generateToken(32),
      socket: socket,
      loggedIn: false,
      activeChannel: '_connecting',
      activeServer: '_connecting'
    }
    users[socket.id] = user

    socket.on('disconnect', (): void => {
      const user = getUserBySocket(socket)
      if (user) {
        console.log(`[*] '${user.username}' left`)
        io.emit('userLeave', user.username)
      } else {
        console.log(`[*] leave before login ${userAgent}`)
      }
      delete users[socket.id]
    })

    socket.on('joinChannel', (join: JoinChannel): void => {  
      joinChannel(socket, join.channel, join.server, join.password)
    })

    socket.on('authRequest', (auth: AuthRequest): void => {
      if(getUserByName(auth.username)) {
        socket.emit(
          'authResponse',
          {
            username: auth.username,
            token: '',
            success: false,
            message: 'this user is already logged in'
          }
        )
        return
      }
      if (useAccounts() && process.env.ACCOUNTS_PASSWORD !== auth.password) {
        socket.emit(
          'authResponse',
          {
            username: auth.username,
            token: '',
            success: false,
            message: 'wrong password'
          }
        )
        return
      }
      const user = getUserBySocket(socket)
      if (!user) {
        throw 'User not found'
      }
      user.username = auth.username
      user.loggedIn = true
      if (!joinChannel(socket, auth.channel, auth.server)) {
        socket.emit(
          'authResponse',
          {
            username: auth.username,
            token: '',
            success: false,
            message: 'failed to join channel'
          }
        )
        user.loggedIn = false
        return
      }
      console.log(`[*] '${user.username}' logged in`)
      io.emit('userJoin', user.username)
      socket.emit(
        'authResponse',
        {
          username: user.username,
          token: user.sessionToken,
          success: true,
          message: 'logged in'
        }
      )
    })
    socket.on('message', (message: IrcMessage): void => {
      if(useAccounts()) {
        if (!checkAuth(message)) {
          console.log(`[!] WARNING invalid token from ${ipAddr} ${userAgent}`)
          return
        }
      }
      const user = getUserBySocket(socket)
      if (!user) {
        console.log(`[!] WARNING socket without user tried to msg ${ipAddr} ${userAgent}`)
        return
      }
      if (user.activeChannel !== message.channel) {
        console.log(`[!] user '${user.username}' tried to to send in channel '${message.channel}' but is in channel '${user.activeChannel}'`)
        return
      }
      if (user.activeServer !== message.server) {
        console.log(`[!] user '${user.username}' tried to to send in server '${message.server}' but is in server '${user.activeServer}'`)
        return
      }
      const messageStr = `<${message.from}> ${message.message}`
      console.log(`[*][${message.server}][${message.channel}] ${messageStr}`)
      const mapping: ChannelMapping | null = getMappingByDiscord(message.server, message.channel)
      if (!mapping) {
        console.log(`[!] invalid discord mapping '${message.server}#${message.channel}'`)
        return
      }
      if (!sendIrc(mapping.irc.serverName, mapping.irc.channel, messageStr)) {
        return
      }
      logMessage(message.server, message.channel, message)
      io.to(user.activeChannel).emit('message', message)
    })
})

httpServer.listen(6969, (): void => {
    console.log('[*] listening on http://localhost:6969')
    console.log(`[*] accounts are ${useAccounts() ? 'on' : 'off'}`)
})
