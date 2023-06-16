import irc = require('irc')
import { getConnectedIrcChannels } from './bridge_connections'
import { activeIrcChannels, ChannelMapping } from './features/channels'
import { getNextMessageId } from './history'
import { addMessage } from './features/messages'
import { IrcMessage } from './socket.io'

if (!process.env.IRC_SERVER) {
	console.log('Error: IRC_SERVER is not set! check your .env file')
	process.exit(1)
}

const client = new irc.Client(process.env.IRC_SERVER, 'ws-client', {
	channels: activeIrcChannels().map((channel) => `#${channel}`),
})

export const sendIrc = (ircServer: string, ircChannel: string, message: string): boolean => {
  if (ircServer !== 'quakenet') {
    console.log(`[!] failed to send to unsupported irc ircServer '${ircServer}'`)
    return false
  }
  client.say(`#${ircChannel}`, message)
  return true
}

client.addListener('error', (message) => {
  console.log('error: ', message)
})

getConnectedIrcChannels().forEach((connection: ChannelMapping) => {
  client.addListener(`message#${connection.irc.channel}`, (from, message) => {
    console.log(from + ' => #yourchannel: ' + message)
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