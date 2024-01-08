import { Socket } from "socket.io"
import { getConnectedIrcChannels } from "../bridge_connections"
import { getChannelUid } from "../history"
import { User, getUsers } from "../users"
import { sendTyping } from "./typing"
import { WsState } from ".."
import { JoinChannel } from "../socket.io"

export interface ChannelMapping {
  irc: {
    serverIp: string,
    serverName: string,
    channel: string,
  },
  discord: {
    server: string,
    channel: string
  },
  private: boolean
}

export const getMappingByDiscord = (discordServer: string, discordChannel: string): ChannelMapping | null => {
  return getConnectedIrcChannels().filter((mapping: ChannelMapping) => {
    return mapping.discord.server === discordServer && mapping.discord.channel === discordChannel
  })[0] || null
}

export const isValidDiscordChannel = (discordServer: string, discordChannel: string): boolean => {
  const matches = getConnectedIrcChannels().filter((mapping: ChannelMapping) => {
    return mapping.discord.server === discordServer && mapping.discord.channel === discordChannel
  })
  return matches.length === 1
}

export const getDiscordChannels = (discordServerName: string): string[] => {
  const serverEntries = getConnectedIrcChannels().filter((entry) => entry.discord.server === discordServerName)
  return serverEntries.map((entry) => entry.discord.channel)
}

export const activeIrcChannels = (): string[] => {
  return getConnectedIrcChannels().map((entry) => entry.irc.channel)
}

export const onJoinChannel = (wsState: WsState, join: JoinChannel) => {
  if (!joinChannel(wsState.socket, join.channel, join.server, join.password)) {
    wsState.socket.emit('joinChannelResponse', {
      message: 'failed to join channel',
      success: false,
      server: join.server,
      channel: join.channel
    })
  } else {
    wsState.socket.emit('joinChannelResponse', {
      message: '',
      success: true,
      server: join.server,
      channel: join.channel
    })
  }
}

export const joinChannel = (socket: Socket, discordChannel: string, discordServer: string, _password: string = ''): boolean => {
  const user: User = getUsers()[socket.id]
  if (!user) {
    return false
  }
  if (!user.loggedIn) {
    return false
  }
  const mapping: ChannelMapping | null = getMappingByDiscord(discordServer, discordChannel)
  if (!mapping) {
    console.log(`[!] invalid discord mapping '${discordServer}#${discordChannel}'`)
    return false
  }
  sendTyping(user, false, user.activeServer, user.activeChannel)
  user.activeChannel = discordChannel
  user.activeServer = discordServer
  socket.rooms.forEach((room) => {
    if (room !== socket.id) {
      socket.leave(room)
    }
  })
  socket.join(socket.id)
  socket.join(getChannelUid(mapping)) // channel speficic for "is typing" messages
  socket.join(discordServer) // server specific for chat messages from all channels
  return true
}