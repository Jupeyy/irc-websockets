import { Socket } from "socket.io"
import { getConnectedIrcChannels } from "../bridge_connections"
import { getChannelUid } from "../history"
import { SessionUser, getUsers } from "../session_users"
import { sendTyping } from "./typing"
import { WsState } from ".."
import { ChannelInfo, JoinChannel } from "../socket.io"
import { Channel } from "../models/channel"
import { ChannelMember } from "../models/channel_member"

// TODO: we should probably get rid of ChannelMapping
//       thats just some legacy type that is now wrapping around the
//       new cleaner `Channel` model
export interface ChannelMapping {
  id: number | bigint,
  serverId: number | bigint
  description: string,
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

export const getDiscordChannels = (discordServerName: string): ChannelInfo[] => {
  const serverEntries = getConnectedIrcChannels().filter((entry) => entry.discord.server === discordServerName)
  return serverEntries.map((entry) => {
    return {
      id: entry.id,
      serverId: entry.serverId,
      name: entry.discord.channel,
      description: entry.description
    }
  })
}

export const activeIrcChannels = (): string[] => {
  return getConnectedIrcChannels().map((entry) => entry.irc.channel)
}

export const onJoinChannel = (wsState: WsState, join: JoinChannel) => {
  // TODO: the whole thing is total bs conceptually
  //       we should not keep the legacy object with channel mappings in the code
  //       the protocol should not contain strings but only channel ids in the first place
  //       we want to stay close to the discord api
  //       and we also want to use the database as cleanly as possibly
  const channel = Channel.findByDiscordNames(join.server, join.channel)
  if (!channel || !channel.id) {
    console.warn(`${wsState.ipAddr} tried to join server='${join.server}' channel='${join.channel}' but that is not in the db`)
    wsState.socket.emit('joinChannelResponse', {
      message: 'channel is not in database',
      success: false,
      server: join.server,
      channel: join.channel,
      unredMsgId: null,
      channelId: 0,
      serverId: 0
    })
    return
  }
  const member = joinChannel(wsState.socket, join.channel, join.server, join.password)
  if (!member) {
    wsState.socket.emit('joinChannelResponse', {
      message: 'failed to join channel',
      success: false,
      server: join.server,
      channel: join.channel,
      unredMsgId: null,
      channelId: channel.id,
      serverId: channel.serverId
    })
  } else {
    wsState.socket.emit('joinChannelResponse', {
      message: '',
      success: true,
      server: join.server,
      channel: join.channel,
      unredMsgId: member.lastRedMsgId(),
      channelId: channel.id,
      serverId: channel.serverId
    })
  }
}

export const joinChannel = (socket: Socket, discordChannel: string, discordServer: string, _password: string = ''): ChannelMember | null => {
  const user: SessionUser = getUsers()[socket.id]
  if (!user) {
    return null
  }
  if (!user.loggedIn) {
    return null
  }
  const mapping: ChannelMapping | null = getMappingByDiscord(discordServer, discordChannel)
  if (!mapping) {
    console.log(`[!][join-channel] invalid discord mapping '${discordServer}#${discordChannel}'`)
    return null
  }
  const channel: Channel | null = Channel.findByDiscordNames(discordServer, discordChannel)
  if (!channel) {
    console.log(`[!][join-channel] channel not found in database '${discordServer}#${discordChannel}'`)
    return null
  }
  if (!user.dbUser) {
    console.log(`[!][join-channel] user='${user.username}' failed to join ${discordServer}#${discordChannel}' (user not found in database)`)
    return null
  }
  let member: ChannelMember | null = ChannelMember.findByUserAndChannel(user.dbUser.ID, channel.id!)
  if (!member) {
    console.log(`[!][join-channel] user='${user.username}' is not member of '${discordServer}#${discordChannel}'`)

    // TODO: as of right now everyone can write in #developer once that has to be locked down
    //       there has to be a good way to actually let people in

    // if(channel.isPrivate) {
    //   console.log(`[!][join-channel] user='${user.username}' failed to join private channel '${discordServer}#${discordChannel}'`)
    //   return false
    // }
    member = new ChannelMember({
      channel_id: channel.id!,
      user_id: user.dbUser.ID,
      lowest_requested_msg_id: null,
      highest_requested_msg_id: null,
      unred_msg_id: null,
      has_write_access: 1,
    })
    if(!member.insert()) {
      console.log(`[!][join-channel] user='${user.username}' failed to create membership for '${discordServer}#${discordChannel}'`)
      return null
    }
    console.log(`[!][join-channel] user='${user.username}' joined channel '${discordServer}#${discordChannel}'`)
  } else {
    console.log(`[!][join-channel] user='${user.username}' visited channel with old membership '${discordServer}#${discordChannel}'`)
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
  return member
}
