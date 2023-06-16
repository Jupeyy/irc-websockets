import { WsState } from ".."
import { logMessage, getNextMessageId, getLatestMessageId } from "../history"
import { sendIrc } from "../irc"
import { getWebsocket } from "../network/server"
import { AlertMessage, IrcMessage } from "../socket.io"
import { getUserBySocket } from "../users"
import { useAccounts, checkAuth } from "./accounts"
import { ChannelMapping, getMappingByDiscord } from "./channels"
import { isRatelimited } from "./rate_limit"

export const addMessage = (mapping: ChannelMapping, message: IrcMessage) => {
  message.token = 'xxx' // do not leak token to clients
  logMessage(mapping.discord.server, mapping.discord.channel, message)
  getWebsocket().to(mapping.discord.server).emit('message', message)
}

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
  if (isRatelimited(message)) {
    console.log(`[!] ratelimited user '${user.username}' in '${message.server}#${message.channel}'`)
    const alertMsg: AlertMessage = {
      success: false,
      message: 'Ratelimited message sending',
      expire: 7000
    }
    user.socket.emit('alert', alertMsg)
    return
  }
  const messageId = getNextMessageId()
  if (message.id !== messageId) {
    console.log(`[!] The client expected to get msgid=${message.id} but got msgid=${messageId}`)
    console.log(`    this is not too bad but means the client is possibly out of sync or overwhealmed`)
  }
  message.id = messageId
  if (!sendIrc(mapping.irc.serverName, mapping.irc.channel, messageStr)) {
    return
  }
  addMessage(mapping, message)
}
