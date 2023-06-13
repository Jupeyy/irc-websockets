import { Socket } from 'socket.io'
import { ClientToServerEvents, ServerToClientEvents, IrcMessage, AuthRequest, JoinChannel, TypingInfo } from './socket.io'
import { User, getUserBySocket, getUsers } from './users';
import { getHttpServer } from './network/server';
import { onAuthRequest } from './features/accounts';
import { generateToken } from './base/token';
import { onTypingInfo } from './features/typing';
import { onMessage } from './features/messages';
import { onJoinChannel } from './features/channels';
import './network/http_api'

require('dotenv').config()

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

export interface WsState {
  ipAddr: string,
  userAgent: string,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>
}

getHttpServer().on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>): void => {
    socket.join('_connecting')
    const ipAddr = socket.client.conn.remoteAddress
    const userAgent = socket.handshake.headers['user-agent'] || 'no-agent'
    const wsState: WsState = {
      ipAddr,
      userAgent,
      socket
    }
    console.log(`[*] connect ${ipAddr} ${userAgent}`)
    const user: User = {
      username: 'connecting',
      sessionToken: generateToken(32),
      socket: socket,
      loggedIn: false,
      activeChannel: '_connecting',
      activeServer: '_connecting',
      isTyping: false,
      lastTyping: new Date()
    }
    getUsers()[socket.id] = user

    socket.on('disconnect', (): void => {
      const user = getUserBySocket(socket)
      if (user) {
        console.log(`[*] '${user.username}' left`)
        getHttpServer().emit('userLeave', user.username)
      } else {
        console.log(`[*] leave before login ${userAgent}`)
      }
      delete getUsers()[socket.id]
    })

    socket.on('joinChannel', (join: JoinChannel): void => {  
      onJoinChannel(wsState, join)
    })

    socket.on('typingInfo', (typingInfo: TypingInfo) => {
      onTypingInfo(wsState, typingInfo)
    })

    socket.on('authRequest', (auth: AuthRequest): void => {
      onAuthRequest(wsState, auth)
    })
    socket.on('message', (message: IrcMessage): void => {
      onMessage(wsState, message)
    })
})
