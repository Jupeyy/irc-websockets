import { ChannelMapping } from "./features/channels";

if (!process.env.IRC_CHANNEL) {
	console.log('Error: IRC_CHANNEL is not set! check your .env file')
	process.exit(1)
}

// TODO: this should be a json not tracked in git
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
