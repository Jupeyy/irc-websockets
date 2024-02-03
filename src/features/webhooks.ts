// trying to be complaint to the discord webhook api
// following their spec at https://discord.com/developers/docs/resources/webhook
// to be a drop in replacement for discord

import { Request, Response } from 'express';
import { ChannelMapping, getMappingByDiscord } from './channels';
import { addMessage } from './messages';
import { IrcMessage } from '../socket.io';
import { getNextMessageId } from '../history';
import { sendIrc } from '../irc';
import { isRatelimited } from './rate_limit';
import { Webhook } from '../models/webhook';
import { Channel } from '../models/channel';

interface QueueMessage {
  ircMessage: IrcMessage
  channelMapping: ChannelMapping
}

const getMaxQueueSize = (): number => {
  return 50
}

const newlineQueue: QueueMessage[] = []

const queueLine = (message: IrcMessage, mapping: ChannelMapping): boolean => {
  if (newlineQueue.length > getMaxQueueSize()) {
    // having a too big queue is annoying
    // it will keep sending messages for a too long time
    // so that when the messages arrive they are potentially
    // not relevant anymore
    // or fully out of context
    //
    // it also blocks new requests from getting handled
    // in a reasonable time frame
    //
    // as a user i would rather see an error saying it did not work
    // and compete with others to get the first opening spot
    // than having a OK response but having to wait 2 days for my message
    // to be posted. Because some troll called the webhook in a infinite loop.
    return false
  }
  const queueEntry: QueueMessage = {
    ircMessage: message,
    channelMapping: mapping
  }
  newlineQueue.push(queueEntry)
  return true
}

const queueFull = (): boolean => {
  return newlineQueue.length >= getMaxQueueSize()
}

const popQueueEntry = (): void => {
  const queueEntry = newlineQueue.shift()
  if (!queueEntry) {
    return
  }

  const mapping = queueEntry.channelMapping
  const message = queueEntry.ircMessage

  console.log(`[*] popping message from queue (${newlineQueue.length} left)`)

  if (!sendIrc(mapping.irc.serverName, mapping.irc.channel, message.message)) {
    return
  }
  addMessage(mapping, message)
}

setInterval(popQueueEntry, 1000)

// curl -H "Content-Type: application/json" -X POST --data '{"content": "Posted Via Command line"}' http://127.0.0.1:6969/webhooks/id/token
export const onDiscordWebhookExecute = (webhookId: string, webhookToken: string, req: Request, res: Response) => {
  console.log(`[*] webhook: ${req} id=${webhookId} token=${webhookToken}`)

  const webhook = Webhook.find(webhookId, webhookToken)
  if(!webhook) {
    res.send({ message: 'TODO: this is not discord api yet. BUT ERROR 404' })
    return
  }

  const mapping: ChannelMapping | null = getMappingByDiscord(webhook.discordServer, webhook.discordChannel)
  if (!mapping) {
    console.log(`[!] invalid discord mapping '${webhook.discordServer}#${webhook.discordChannel}'`)
    res.send({ message: 'TODO: this is not discord api yet. BUT ERROR' })
    return
  }
  // https://discord.com/developers/docs/resources/webhook#execute-webhook
  const messageContent = req.body.content
  if(!messageContent) {
    res.send({ message: 'TODO: this is not discord api yet. BUT ERROR msg empty' })
    return
  }

  const message: IrcMessage = {
    id: getNextMessageId(),
    from: webhook.name,
    message: messageContent,
    channel: webhook.discordChannel,
    server: webhook.discordServer,
    date: new Date().toUTCString()
  }

  if(message.message.includes("\n")) {
    if(queueFull()) {
      console.log(`[!] webhook failed to send. Queue is full ${newlineQueue.length}/${getMaxQueueSize()}`)
      res.send({ message: 'TODO: this is not discord api yet. BUT ERROR queue is full' })
      return
    }
    const messageLines = message.message.split("\n")
    if(messageLines.length > getMaxQueueSize()) {
      console.log(`[!] webhook tried to send message with too many lines. Clamped to max=${getMaxQueueSize()}`)
      res.send({ message: 'TODO: this is not discord api yet. BUT WARNING too many lines will only be sent partially' })
    } else {
      res.send({ message: 'TODO: this is not discord api yet. But OK' })
    }
    messageLines.forEach((messageLine) => {
      const splitIrcMsg: IrcMessage = {
        id: getNextMessageId(), // could also be message.id
        from: message.from,
        message: messageLine,
        channel: message.channel,
        server: message.server,
        date: message.date // could also be new Date().toUTCString()
      }
      queueLine(splitIrcMsg, mapping)
    })
    return
  }

  if (isRatelimited(message)) {
    console.log(`[!] ratelimited webhook id=${webhook.id} '${webhook.name}' in '${message.server}#${message.channel}'`)
    res.send({ message: 'TODO: this is not discord api yet. BUT ERROR ratelimited' })
    return
  }

  if (!sendIrc(mapping.irc.serverName, mapping.irc.channel, message.message)) {
    res.send({ message: 'TODO: this is not discord api yet. ERROR FAILED TO irc' })
    return
  }
  addMessage(mapping, message)

  res.send({ message: 'TODO: this is not discord api yet. But OK' })
}

/**
 * getBearerOrSendError
 *
 * extract bearer token from request header
 * or send error response
 *
 * @param req
 * @param res
 * @returns token or null
 */
const getBearerOrSendError = (req: Request, res: Response): string | null => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const error = {
      error: {
        note: 'TODO: this is not discord compatible yet',
        message: 'missing bearer auth header'
      }
    }
    res.send(JSON.stringify(error))
    return null
  }
  return authHeader.slice('Bearer '.length)
}

/**
 * checkBearerAuth
 *
 * checks if the request header contains a valid bearer token
 * if it does not it sends a error response
 *
 * TODO: this is authentication only for now
 *       there is no scope/resource or authorization yet
 *
 * @param req
 * @param res
 * @returns true on success
 */
const checkBearerAuth = (req: Request, res: Response): boolean => {
  const token = getBearerOrSendError(req, res)
  if(!token) {
    return false
  }
  // TODO: actually look it up in some db or something
  if(token !== 'xxx') {
    const error = {
      error: {
        note: 'TODO: this is not discord compatible yet',
        message: 'wrong auth credentials'
      }
    }
    res.send(JSON.stringify(error))
    return false
  }
  return true
}

// curl -H "Authorization: Bearer xxx" -H "Content-Type: application/json" http://127.0.0.1:6969/channels/1/webhooks
export const onDiscordGetChannelWebhooks = (channelId: string, req: Request, res: Response) => {
  // TODO: authorization with bearer token
  //       only admins of that channel should be able to list webhooks
  //       https://discord.com/developers/docs/reference#authentication
  console.log(`[*] get channel webhooks channelId=${channelId}`)

  if(!checkBearerAuth(req, res)) {
    return
  }

  const channel = Channel.find(channelId)
  if(!channel) {
    res.send({ message: 'TODO: this is not discord api yet. BUT ERROR channel not found' })
    return
  }
  // we are close but not fully discord compatible yet
  // should be an array of these objects
  // https://discord.com/developers/docs/resources/webhook#webhook-object
  res.send(channel.webhooks())
}
