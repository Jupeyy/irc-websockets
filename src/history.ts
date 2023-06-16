import { ChannelMapping } from "./features/channels"
import { IrcMessage } from "./socket.io"

if (!process.env.BACKLOG_SIZE) {
  console.log('Error: BACKLOG_SIZE is not set! check your .env file')
  process.exit(1)
}

// log of last BACKLOG_SIZE messages
const BACKLOG_SIZE = parseInt(process.env.BACKLOG_SIZE, 10)
const messageRobin: Record<string, IrcMessage[]> = {}
let latestMessageId: number = 0
export const getLatestMessageId = (): number => {
  return latestMessageId
}
export const getNextMessageId = (): number => {
  latestMessageId++
  return latestMessageId
}

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

export interface MessageLogOptions {
  fromId: number,
  count: number
}

export const getMessages = (
  discordServer: string,
  discordChannel: string,
  options: MessageLogOptions = {
    fromId: 0,
    count: 10
  }
): IrcMessage[] => {
  const channelIdentifier = `${discordServer}#${discordChannel}`
  if (!messageRobin[channelIdentifier]) {
    return []
  }
  const messages: IrcMessage[] = messageRobin[channelIdentifier]
  // return messages.filter((msg) => msg.id >= options.fromId).slice(-options.count)
  const filtered: IrcMessage[] = []
  if (options.fromId === 0) {
    return messages.slice(-options.count)
  }
  messages.forEach((msg) => {
    if (msg.id < options.fromId) {
      return
    }
    if (filtered.length >= options.count) {
      return
    }
    filtered.push(msg)
  })
  return filtered
}
