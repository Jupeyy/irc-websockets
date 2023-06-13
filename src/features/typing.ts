import { WsState } from ".."
import { useAccounts } from "./accounts"
import { ChannelMapping, getMappingByDiscord } from "./channels"
import { getChannelUid } from "../history"
import { getHttpServer } from "../network/server"
import { TypingInfo, TypingState } from "../socket.io"
import { User, getUserBySocket, getUsers } from "../users"

export const sendTyping = (user: User, typing: boolean, server: string, channel: string) => {
  user.isTyping = typing
  const mapping: ChannelMapping | null = getMappingByDiscord(server, channel)
  if (!mapping) {
    console.log(`[!] invalid discord mapping '${server}#${channel}'`)
    return
  }
  const typingState: TypingState = {
    names: Object.values(getUsers())
      .filter((user) => user.isTyping && user.activeChannel === channel && user.activeServer === server)
      .map((user) => user.username),
    channel: channel
  }
  getHttpServer().to(getChannelUid(mapping)).emit('typingUsers', typingState)
}

export const onTypingInfo = (wsState: WsState, typingInfo: TypingInfo) => {
  const user = getUserBySocket(wsState.socket)
  if (!user) {
    console.log(`[!] WARNING socket without user tried to type ${wsState.ipAddr} ${wsState.userAgent}`)
    return
  }
  if (user.activeChannel !== typingInfo.channel) {
    console.log(`[!] user '${user.username}' tried to type in channel '${typingInfo.channel}' but is in channel '${user.activeChannel}'`)
    return
  }
  if (user.activeServer !== typingInfo.server) {
    console.log(`[!] user '${user.username}' tried to type in server '${typingInfo.server}' but is in server '${user.activeServer}'`)
    return
  }
  if(useAccounts()) {
    if (!user.loggedIn) {
      console.log(`[!] WARNING invalid token from ${wsState.ipAddr} ${wsState.userAgent}`)
      return
    }
  }
  // TODO: store last typing info update
  //       and "timeout" typing if the user
  //       stops sending typing state
  sendTyping(user, typingInfo.isTyping, typingInfo.server, typingInfo.channel)
}
