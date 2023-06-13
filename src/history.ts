import { ChannelMapping } from "./features/channels"
import { IrcMessage } from "./socket.io"

if (!process.env.BACKLOG_SIZE) {
  console.log('Error: BACKLOG_SIZE is not set! check your .env file')
  process.exit(1)
}

// log of last BACKLOG_SIZE messages
const BACKLOG_SIZE = parseInt(process.env.BACKLOG_SIZE, 10)
const messageRobin: Record<string, IrcMessage[]> = {}

export const getChannelUid = (mapping: ChannelMapping): string => {
  return `${mapping.discord.server}#${mapping.discord.channel}`
}

export const logMessage = (discordServer: string, discordChannel: string, msg: IrcMessage): void => {
  const channelIdentifier = `${discordServer}#${discordChannel}`
  if (!messageRobin[channelIdentifier]) {
    messageRobin[channelIdentifier] = []
  }
  messageRobin[channelIdentifier].push(msg)
  while (messageRobin[channelIdentifier].length > BACKLOG_SIZE) {
    messageRobin[channelIdentifier].shift()
  }
}

export const getMessages = (discordServer: string, discordChannel: string): IrcMessage[] => {
  const channelIdentifier = `${discordServer}#${discordChannel}`
  if (!messageRobin[channelIdentifier]) {
    return []
  }
  return messageRobin[channelIdentifier]
}