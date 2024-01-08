import { WsState } from ".."
import { getConfig } from "../base/config"
import { joinChannel } from "./channels"
import { getWebsocket } from "../network/server"
import { AuthRequest, IrcMessage } from "../socket.io"
import { getUserByName, getUserBySocket } from "../users"
import { IUserRow, getUser, isUsernameTaken } from "../base/db"

export const useAccounts = (): boolean => {
  return getConfig().requirePasswords
}

export const checkAuth = (message: IrcMessage): boolean => {
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

const isValidCredentials = (auth: AuthRequest, dbUser: null | IUserRow): boolean => {
  // there are two valid logins
  // username and password with a proper account
  // or one master password that does not auth a full account and where users pick the username freely
  if(!useAccounts()) {
    return true
  }
  return process.env.ACCOUNTS_PASSWORD === auth.password || dbUser != null
}

export const onAuthRequest = (wsState: WsState, auth: AuthRequest) => {
  const dbUser = getUser(auth.username, auth.password)
  if (getUserByName(auth.username)) {
    wsState.socket.emit(
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
  if (!isValidCredentials(auth, dbUser)) {
    wsState.socket.emit(
      'authResponse',
      {
        username: auth.username,
        token: '',
        success: false,
        message: 'wrong credentials'
      }
    )
    return
  }
  if(!dbUser && isUsernameTaken(auth.username)) {
    wsState.socket.emit(
      'authResponse',
      {
        username: auth.username,
        token: '',
        success: false,
        message: 'this username needs a different password'
      }
    )
    return
  }
  const user = getUserBySocket(wsState.socket)
  if (!user) {
    throw 'User not found'
  }
  user.username = auth.username
  user.loggedIn = true
  user.dbUser = dbUser
  if (!joinChannel(wsState.socket, auth.channel, auth.server)) {
    wsState.socket.emit(
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
  console.log(`[*] '${user.username}' logged in ${user.dbUser ? 'to account' : 'with master password'}`)
  if(user.dbUser) {
    console.log(user.dbUser)
  }
  getWebsocket().emit('userJoin', user.username)
  wsState.socket.emit(
    'authResponse',
    {
      username: user.username,
      token: user.sessionToken,
      success: true,
      message: 'logged in'
    }
  )
}