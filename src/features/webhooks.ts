// trying to be complaint to the discord webhook api
// following their spec at https://discord.com/developers/docs/resources/webhook
// to be a drop in replacement for discord

import { Request, Response } from 'express';
import { ChannelMapping, getMappingByDiscord } from './channels';
import { addMessage } from './messages';
import { IrcMessage, WebhookObject } from '../socket.io';
import { getNextMessageId } from '../history';
import { sendIrc } from '../irc';
import { isRatelimited } from './rate_limit';
import { Webhook } from '../models/webhook';
import { Channel } from '../models/channel';
import { Server } from '../models/server';
import { WsState } from '..';
import { getUserBySocket } from '../session_users';
import { User } from '../models/user';
import { randomInt } from '../base/math';

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

// curl -H "Content-Type: application/json" -X POST --data '{"content": "Posted Via Command line"}' http://127.0.0.1:6969/webhooks/1/xxx
export const onDiscordWebhookExecute = (webhookId: string, webhookToken: string, req: Request, res: Response) => {
  console.log(`[*] webhook: ${req} id=${webhookId} token=${webhookToken}`)

  const webhook = Webhook.findByCredentials(webhookId, webhookToken)
  if(!webhook) {
    res.send({ message: 'TODO: this is not discord api yet. BUT ERROR 404' })
    return
  }

  const channel = webhook.channel()
  if(!channel) {
    res.send({ message: 'TODO: this is not discord api yet. BUT ERROR your webhook is not attached to any channel' })
    return
  }

  const mapping: ChannelMapping | null = getMappingByDiscord(channel.discordServer, channel.discordChannel)
  if (!mapping) {
    console.log(`[!] invalid discord mapping '${channel.discordServer}#${channel.discordChannel}'`)
    res.send({ message: 'TODO: this is not discord api yet. BUT ERROR mapping' })
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
    channel: channel.discordChannel,
    server: channel.discordServer,
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

  // Type	Description
  // id	snowflake	the id of the webhook
  // type	integer	the type of the webhook
  // guild_id?	?snowflake	the guild id this webhook is for, if any
  // channel_id	?snowflake	the channel id this webhook is for, if any
  // user?	user object	the user this webhook was created by (not returned when getting a webhook with its token)
  // name	?string	the default name of the webhook
  // avatar	?string	the default user avatar hash of the webhook
  // token?	string	the secure token of the webhook (returned for Incoming Webhooks)
  // application_id	?snowflake	the bot/OAuth2 application that created this webhook
  // source_guild? *	partial guild object	the guild of the channel that this webhook is following (returned for Channel Follower Webhooks)
  // source_channel? *	partial channel object	the channel that this webhook is following (returned for Channel Follower Webhooks)
  // url?	string	the url used for executing the webhook (returned by the webhooks OAuth2 flow)

  res.send(channel.webhooks().map((webhook) => {
    const webhookObject: WebhookObject = {
      id: webhook.id!,
      type: 0, // Incoming
      channel_id: channel.id!,
      name: webhook.name,
      avatar: null,
      application_id: null
    }
    return webhookObject
  }))
}

export const onWebhooksRequest = (wsState: WsState, serverId: number | bigint): void => {
  console.log(`[ws] got webhooks request for serverId=${serverId}`)
  const server = Server.find(serverId)
  if (!server) {
    wsState.socket.emit('webhooks', [])
    return
  }
  const webhooks: WebhookObject[] = server.webhooks().map((webhook) => {
    const webhookObject: WebhookObject = {
      id: webhook.id!,
      type: 0, // Incoming
      channel_id: webhook.channelId,
      name: webhook.name,
      avatar: null,
      application_id: null
    }
    return webhookObject
  })
  wsState.socket.emit('webhooks', webhooks)
}

export const onNewWebhookRequest = (wsState: WsState, webhookObj: WebhookObject): void => {
  const channel = Channel.find(webhookObj.channel_id)
  if(!channel) {
    console.log(`[!] failed to create webhook. Channel with id=${webhookObj.channel_id} not found`)
    return
  }
  const server = channel.server()
  if(!server) {
    console.log(`[!] failed to create webhook. Server with id=${channel.serverId} not found`)
    return
  }
  const sessionUser = getUserBySocket(wsState.socket)
  if (!sessionUser) {
    console.log(`[!] failed to create webhook. Session user not found! That is sus. Are we being hacked?`)
    return
  }
  if(!sessionUser.dbUser) {
    console.log(`[!] failed to create webhook. User is not logged in! That is sus. Are we being hacked?`)
    return
  }
  const dbUser = sessionUser.dbUser
  const user = User.find(dbUser.ID)
  if(!user) {
    console.log(`[!] failed to create webhook. User not found in database!`)
    return
  }
  if(user.blocked()) {
    console.log(`[!] failed to create webhook. User is blocked!`)
    return
  }
  if(!user.admin()) {
    console.log(`[!] failed to create webhook. User is missing permissions!`)
    return
  }
  const webhook = new Webhook({
    name: webhookObj.name,
    token: randomInt(100000000000000, 3592180204621707).toString(), // you might be wondering .. and you are rightly so
    server_id: server.id!,
    channel_id: channel.id!,
    register_ip: wsState.ipAddr,
    last_use_ip: wsState.ipAddr,
    owner_id: user.id!
  })
  webhook.insert()
  console.log(`[*] created new webhook! server='${server.name}' channel='${channel.name}' name='${webhook.name}'`)
}
