import { ChannelMapping } from "./features/channels";

if (!process.env.IRC_CHANNEL) {
	console.log('Error: IRC_CHANNEL is not set! check your .env file')
	process.exit(1)
}

// TODO: this should be a json not tracked in git
//       if we do so channel and server names have to be sanitized
//       to only contain a-z _ -
//       because the backend uses server#channel and server
//       as websocket rooms so if server name matches server#channel of another channel thats bad
//       example:
//           server = 'foo#bar'
//           server2 = 'foo'
//           channel in server2 = 'bar'
//
//           server == server2#channel
//
//       also the front end uses channel and server names
//       in data tags and query selectors
const connectedIrcChannels: ChannelMapping[] = [
  {
    irc: {
      serverIp: 'stockholm.se.quakenet.org',
      serverName: 'quakenet',
      channel: 'ddnet'
    },
    discord: {
      server: 'ddnet',
      channel: 'developer'
    }
  },
  {
    irc: {
      serverIp: 'stockholm.se.quakenet.org',
      serverName: 'quakenet',
      channel: 'ddnet-off-topic'
    },
    discord: {
      server: 'ddnet',
      channel: 'off-topic'
    }
  },
  {
    irc: {
      serverIp: 'stockholm.se.quakenet.org',
      serverName: 'quakenet',
      channel: 'ddnet-test'
    },
    discord: {
      server: 'test',
      channel: 'test'
    }
  }
]

export const getConnectedIrcChannels = (): ChannelMapping[] => {
  return connectedIrcChannels
}

if (getConnectedIrcChannels().filter((entry) => entry.irc.channel === process.env.IRC_CHANNEL).length === 0) {
  console.log(`[*] adding custom channel '${process.env.IRC_CHANNEL}'`)
  getConnectedIrcChannels().push(
    {
      irc: {
        serverIp: 'stockholm.se.quakenet.org',
        serverName: 'quakenet',
        channel: process.env.IRC_CHANNEL
      },
      discord: {
        server: 'unknown',
        channel: 'unknown'
      }
    }
  )
}
