import { WsState } from ".."
import { logMessage, getChannelUid } from "../history"
import { sendIrc } from "../irc"
import { getHttpServer } from "../network/server"
import { IrcMessage } from "../socket.io"
import { getUserBySocket } from "../users"
import { useAccounts, checkAuth } from "./accounts"
import { ChannelMapping, getMappingByDiscord } from "./channels"

export const onMessage = (wsState: WsState, message: IrcMessage) => {
  if(useAccounts()) {
    if (!checkAuth(message)) {
      console.log(`[!] WARNING invalid token from ${wsState.ipAddr} ${wsState.userAgent}`)
      return
    }
  }
  const user = getUserBySocket(wsState.socket)
  if (!user) {
    console.log(`[!] WARNING socket without user tried to msg ${wsState.ipAddr} ${wsState.userAgent}`)
    return
  }
  if (user.activeChannel !== message.channel) {
    console.log(`[!] user '${user.username}' tried to send in channel '${message.channel}' but is in channel '${user.activeChannel}'`)
    return
  }
  if (user.activeServer !== message.server) {
    console.log(`[!] user '${user.username}' tried to send in server '${message.server}' but is in server '${user.activeServer}'`)
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
  getHttpServer().to(getChannelUid(mapping)).emit('message', message)
}
