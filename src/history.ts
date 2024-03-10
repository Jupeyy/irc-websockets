import { ChannelMapping } from "./features/channels"
import { IrcMessage } from "./socket.io"
import fs from 'fs'

if (!process.env.BACKLOG_SIZE) {
  console.log('Error: BACKLOG_SIZE is not set! check your .env file')
  process.exit(1)
}

/**
 * throws on invalid messages
 */
const validateMessages = (messages: IrcMessage[]): void => {
  class UglyTsHackToGetKeysAndCompileCheck implements IrcMessage {
    id: number
    from: string
    message: string
    channel: string
    server: string
    date: string
    token?: string
    constructor() {
      this.id = 0
      this.from = ''
      this.message = ''
      this.channel = ''
      this.server = ''
      this.date = ''
      this.token = ''
    }
  }

  const requiredKeys = Object.keys(new UglyTsHackToGetKeysAndCompileCheck())
  for(const message of messages) {
    for(const requiredKey of requiredKeys) {
      if (!(requiredKey in message)) {
        console.log(message)
        throw new Error(`Invalid message! Missing property '${requiredKey}'`)
      }
    }
  }
}

const loadMessageHistory = (): Record<string, IrcMessage[]> => {
  if (!fs.existsSync('message_log.json')) {
    return {}
  }
  console.log('[*] loading message_log.json ...')
  const logRaw = fs.readFileSync('message_log.json', 'utf-8')
  const messagesAllServers: Record<string, IrcMessage[]> = JSON.parse(logRaw)
  for(const messages of Object.values(messagesAllServers)) {
    validateMessages(messages)
  }
  return messagesAllServers
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
  // list messages starting with this id
  fromId: number

  // if count is set to 0
  // it returns all messages
  count: number

  // filter log output with raw string match (conflicts with `searchPattern`)
  // it will not filter if an empty string is given
  searchStr: string

  // filter log output with regex pattern (conflicts with `searchStr`)
  // it will not filter if an empty string is given
  searchPattern: string
}

const filterMessages = (messages: IrcMessage[], options: MessageLogOptions): IrcMessage[] => {
  if (options.searchStr) {
    return messages.filter((message) => message.message.includes(options.searchStr) || message.from.includes(options.searchStr))
  }
  if (options.searchPattern) {
    return messages.filter((message) => new RegExp(options.searchPattern).test(message.message) || new RegExp(options.searchPattern).test(message.from))
  }
  return messages
}

export const getMessages = (
  discordServer: string,
  discordChannel: string,
  options: MessageLogOptions = {
    fromId: 0,
    count: 10,
    searchStr: '',
    searchPattern: '',
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
    if (options.count === 0) {
      return filterMessages(messages, options)
    } else {
      return filterMessages(messages, options).slice(-options.count)
    }
  }
  messages.forEach((msg) => {
    if (msg.id < options.fromId) {
      return
    }
    if (options.count !== 0 && filtered.length >= options.count) {
      return
    }
    filtered.push(msg)
  })
  return filterMessages(filtered, options)
}

process.on('SIGINT', () => {
  console.log('[*] saving message history to disk ...')
  fs.writeFileSync('message_log.json', JSON.stringify(messageRobin))
  process.exit(0)
})
