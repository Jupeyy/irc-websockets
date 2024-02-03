import { WsState } from ".."
import { useAccounts } from "./accounts"
import { ChannelMapping, getMappingByDiscord } from "./channels"
import { getChannelUid } from "../history"
import { getWebsocket } from "../network/server"
import { TypingInfo, TypingState } from "../socket.io"
import { SessionUser, getUserBySocket, getUsers } from "../session_users"

export const sendTyping = (user: SessionUser, typing: boolean, server: string, channel: string) => {
  user.isTyping = typing
  if (typing) {
    user.lastTyping = new Date()
  }
  const mapping: ChannelMapping | null = getMappingByDiscord(server, channel)
  if (!mapping) {
    console.log(`[!] invalid discord mapping '${server}#${channel}'`)
    return
  }

  const typingUsers: string[] = []

  Object.values(getUsers()).forEach((user) => {
    const diff: number = new Date().valueOf() - user.lastTyping.valueOf()
    // TODO: this should be done in a OnTick function
    //       otherwise typing users wont disapear if nobody else starts
    //       but its kinda okay because even if we are alone
    //       and start typing it sends a typing update to us
    //       with a empty user list
    //       so bugged typing users will be cleared as soon as we start typing
    if (diff > 3000) {
      user.isTyping = false
    }
    if (user.isTyping
        && user.activeChannel == channel
        && user.activeServer == server) {
      typingUsers.push(user.username)
    }
  })

  const typingState: TypingState = {
    names: typingUsers,
    channel: channel
  }
  getWebsocket().to(getChannelUid(mapping)).emit('typingUsers', typingState)
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
  sendTyping(user, typingInfo.isTyping, typingInfo.server, typingInfo.channel)
}
