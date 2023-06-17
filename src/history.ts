import { ChannelMapping } from "./features/channels"
import { IrcMessage } from "./socket.io"
import fs from 'fs'

if (!process.env.BACKLOG_SIZE) {
  console.log('Error: BACKLOG_SIZE is not set! check your .env file')
  process.exit(1)
}

const loadMessageHistory = (): Record<string, IrcMessage[]> => {
  if (!fs.existsSync('message_log.json')) {
    return {}
  }
  console.log('[*] loading message_log.json ...')
  const logRaw = fs.readFileSync('message_log.json', 'utf-8')
  return JSON.parse(logRaw)
}

// log of last BACKLOG_SIZE messages
const BACKLOG_SIZE = parseInt(process.env.BACKLOG_SIZE, 10)
const messageRobin: Record<string, IrcMessage[]> = loadMessageHistory()

/**
 * Iterates through all messages from all channels
 * and returns the highest msg id it finds
 *
 * returns 0 if none are found
 */
const getCurrentlyHighestIdInRobin = (): number => {
  let numMessages: number = 0
  const maxChannelIds: number[] = Object.values(messageRobin).map((messages) => {
    const last: IrcMessage | undefined = messages.at(-1)
    if (!last) {
      return 0
    }
    numMessages += messages.length
    return last.id
  })
  if (maxChannelIds.length === 0) {
    return 0
  }
  const highestId: number = Math.max(...maxChannelIds)
  console.log(`[*] loaded ${numMessages} messages continuing at id ${highestId}`)
  return highestId
}

let latestMessageId: number = getCurrentlyHighestIdInRobin()
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

process.on('SIGINT', () => {
  console.log('[*] saving message history to disk ...')
  fs.writeFileSync('message_log.json', JSON.stringify(messageRobin))
  process.exit(0)
})
