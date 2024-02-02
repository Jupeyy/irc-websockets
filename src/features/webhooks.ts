// trying to be complaint to the discord webhook api
// following their spec at https://discord.com/developers/docs/resources/webhook
// to be a drop in replacement for discord

import { Request, Response } from 'express';
import { ChannelMapping, getMappingByDiscord } from './channels';
import { addMessage } from './messages';
import { IrcMessage } from '../socket.io';
import { getNextMessageId } from '../history';
import { getWebhook } from '../base/db';
import { sendIrc } from '../irc';
import { isRatelimited } from './rate_limit';

export interface Webhook {
  id: number,
  name: string,
  token: string,
  discordServer: string,
  discordChannel: string,
  registerIp: string,
  lastUseIp: string,
  createdAt: string,
  updatedAt: string,
  ownerId: number
}

// curl -H "Content-Type: application/json" -X POST --data '{"content": "Posted Via Command line"}' http://127.0.0.1:6969/webhooks/id/token
export const onDiscordWebhookExecute = (webhookId: string, webhookToken: string, req: Request, res: Response) => {
  console.log(`[*] webhook: ${req} id=${webhookId} token=${webhookToken}`)

  const webhook = getWebhook(webhookId, webhookToken)
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

  if (isRatelimited(message)) {
    console.log(`[!] ratelimited webhook id=${webhook.id} '${webhook.name}' in '${message.server}#${message.channel}'`)
    res.send({ message: 'TODO: this is not discord api yet. BUT ERROR ratelimited' })
    return
  }

  if (!sendIrc(mapping.irc.serverName, mapping.irc.channel, messageContent)) {
    res.send({ message: 'TODO: this is not discord api yet. ERROR FAILED TO irc' })
    return
  }
  addMessage(mapping, message)

  res.send({ message: 'TODO: this is not discord api yet. But OK' })
}
