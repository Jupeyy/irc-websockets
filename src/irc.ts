import irc = require('matrix-org-irc')
import { getConnectedIrcChannels } from './bridge_connections'
import { activeIrcChannels, ChannelMapping } from './features/channels'
import { getNextMessageId } from './history'
import { addMessage } from './features/messages'
import { IrcMessage } from './socket.io'
import { getConfig } from './base/config'

if (!process.env.IRC_SERVER) {
	console.log('Error: IRC_SERVER is not set! check your .env file')
	process.exit(1)
}

class MockIrcClient {
  constructor(_server: string, _nick: string, _opts?: any)
  {
  }

  addListener(eventName: string, _listener: (...args: any[]) => void): this
  {
    console.log(`[mock-irc] added listener for '${eventName}'`)
    if (eventName !== 'error') {
      // send a message in every channel instanly once for testing
      // and then keep them coming slowly and randomly
      setTimeout(() => { _listener('mock_user', 'fake mock message (backend started ...)') }, 100)
      setInterval(() => {
        if (Math.random() > 0.1) {
          return
        }
        _listener('mock_user', `fake mock message (sent at ${new Date().toString().split(' ')[4]})`)
      }, 50000)
    }
    return this
  }

  public say(target: string, message: string): void
  {
    console.log(`[mock-irc][${target}] ${message}`)
  }
}

const getIrcClient = (): irc.Client => {
  if(getConfig().dryIrc) {
    return new MockIrcClient('mock', 'mock') as irc.Client
  }
  return new irc.Client(process.env.IRC_SERVER as string, 'ws-client', {
    channels: activeIrcChannels().map((channel) => `#${channel}`),
  })
}

const client = getIrcClient()
let sentLogin = false

export const sendIrc = (ircServer: string, ircChannel: string, message: string): boolean => {
  if (ircServer !== 'quakenet') {
    console.log(`[!] failed to send to unsupported irc ircServer '${ircServer}'`)
    return false
  }
  client.say(`#${ircChannel}`, message)
  return true
}

client.addListener('error', (message) => {
  console.error('[-][irc] error: ', message)
})

client.addListener('join', (channel, name) => {
  console.log(`[*][irc] '${name}' joined '${channel}'`)

  if(!sentLogin) {
    sentLogin = true

    if (!process.env.IRC_LOGIN_MSG) {
      console.log('[!][irc] IRC_LOGIN_MSG not set will not login')
      return
    }
    if (!process.env.IRC_LOGIN_CHANNEL) {
      console.log('[!][irc] IRC_LOGIN_CHANNEL not set will not login')
      return
    }

    console.log(`[*][irc] sending login to channel '${process.env.IRC_LOGIN_CHANNEL}' ...`)
    client.say(process.env.IRC_LOGIN_CHANNEL, process.env.IRC_LOGIN_MSG)
  }
})

// client.addListener('pm', (name, message) => {
//     console.log(`[*][irc][pm] <${name}> ${message}`)
// })
// 
// client.addListener('message', (from, to, message) => {
//     console.log(`[*][irc][m] '${from}' -> '${to}: ${message}`)
// })

getConnectedIrcChannels().forEach((connection: ChannelMapping) => {
  console.log(`[*] adding irc listener for channel ${connection.irc.channel}`)
  client.addListener(`message#${connection.irc.channel}`, (from, message) => {
    console.log(`[*][irc] ${from} => #${connection.irc.channel}: ${message}`)
    const ircMessage: IrcMessage = {
      id: getNextMessageId(),
      from: from,
      message: message,
      channel: connection.discord.channel,
      server: connection.discord.server,
      date: new Date().toUTCString()
    }
    addMessage(connection, ircMessage)
  })
})
