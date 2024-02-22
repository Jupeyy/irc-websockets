import { WsState } from ".."
import { Server } from "../models/server"
import { User } from "../models/user"
import { getUserBySocket } from "../session_users"
import { ChannelInfo, ServerInfo } from "../socket.io"

export const onConnectedServerListRequest = (wsState: WsState) => {
  const sessionUser = getUserBySocket(wsState.socket)
  if (!sessionUser) {
    console.log(`[!] failed to get connected server list. Session user not found! That is sus. Are we being hacked?`)
    return
  }
  if(!sessionUser.dbUser) {
    console.log(`[!] failed to get connected server list. User is not logged in! That is sus. Are we being hacked?`)
    return
  }
  const dbUser = sessionUser.dbUser
  const user = User.find(dbUser.ID)
  if(!user) {
    console.log(`[!] failed to get connected server list. User not found in database!`)
    return
  }
  if(user.blocked()) {
    console.log(`[!] failed to get connected server list. User is blocked!`)
    return
  }

  // TODO: when we have server and channel memberships in the db
  //       only return servers the user joined
  //       for now just return all lol

  const servers: ServerInfo[] = []

  Server.all().forEach((server) => {
    const serverChannels: ChannelInfo[] = server.channels().map((channel) => {
      return {
        id: channel.id || 0,
        serverId: channel.serverId,
        name: channel.name,
        description: channel.description
      }
    })
    servers.push({
      id: server.id || 0,
      name: server.name,
      iconUrl: server.iconUrl,
      bannerUrl: server.bannerUrl || '',
      channels: serverChannels
    })
  })

  wsState.socket.emit('connectedServerListResponse', servers)
}
