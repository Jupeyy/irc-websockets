import { WsState } from ".."
import { getConfig } from "../base/config"
import { joinChannel } from "./channels"
import { getWebsocket } from "../network/server"
import { AuthRequest, IrcMessage } from "../socket.io"
import { getUserByName, getUserBySocket } from "../users"

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

export const onAuthRequest = (wsState: WsState, auth: AuthRequest) => {
  if(getUserByName(auth.username)) {
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
  if (useAccounts() && process.env.ACCOUNTS_PASSWORD !== auth.password) {
    wsState.socket.emit(
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
  const user = getUserBySocket(wsState.socket)
  if (!user) {
    throw 'User not found'
  }
  user.username = auth.username
  user.loggedIn = true
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
  console.log(`[*] '${user.username}' logged in`)
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