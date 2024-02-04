import { ChannelMapping } from "./features/channels";
import { Channel } from "./models/channel";

if (!process.env.IRC_CHANNEL) {
	console.log('Error: IRC_CHANNEL is not set! check your .env file')
	process.exit(1)
}

export const getConnectedIrcChannels = (): ChannelMapping[] => {
  return Channel.all().map((channel) => {
    const mapping: ChannelMapping = {
      id: channel.id!,
      serverId: channel.serverId,
      description: channel.description,
      irc: {
        serverIp: channel.ircServerIp,
        serverName: channel.ircServerName,
        channel: channel.ircChannel,
      },
      discord: {
        server: channel.discordServer,
        channel: channel.discordChannel
      },
      private: false
    }
    return mapping
  })
}

if (getConnectedIrcChannels().filter((entry) => entry.irc.channel === process.env.IRC_CHANNEL).length === 0) {
  console.log(`[*] adding custom channel '${process.env.IRC_CHANNEL}'`)
  getConnectedIrcChannels().push(
    {
      id: 0,
      serverId: 0,
      description: '',
      irc: {
        serverIp: 'stockholm.se.quakenet.org',
        serverName: 'quakenet',
        channel: process.env.IRC_CHANNEL
      },
      discord: {
        server: 'unknown',
        channel: 'unknown'
      },
      private: false
    }
  )
}
