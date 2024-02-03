import { Webhook } from "../models/webhook";
import { Channel } from "../models/channel";

const channel = new Channel({
  ID: 0,
  name: 'test channel 22',
  description: 'test description',
  discord_server: 'ddnet',
  discord_channel: 'general',
  irc_channel: 'ddnet-general',
  irc_server_ip: 'stockholm.se.quakenet.org',
  irc_server_name: 'quakenet',
  created_at: 'now', // TODO: we need a new type where this can not be set
  updated_at: 'now',
  private: 0, // TODO: we need a new type where this is optional
  owner_id: 0
})

channel.insert()

const webhook = new Webhook({
  ID: 0,
  name: 'ttxxxxxxt',
  token: 'xxx',
  channel_id: channel.id,
  register_ip: '127.0.0.1',
  last_use_ip: '127.0.0.1',
  created_at: 'now',
  updated_at: 'now',
  owner_id: 0
})

webhook.insert()
