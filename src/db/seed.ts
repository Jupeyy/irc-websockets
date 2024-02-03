import { Webhook } from "../models/webhook";
import { Channel } from "../models/channel";
import { User } from "../models/user";

const channel = new Channel({
  name: 'seed-channel',
  description: 'test description',
  discord_server: 'ddnet',
  discord_channel: 'off-topic',
  irc_channel: 'ddnet-off-topic',
  irc_server_ip: 'stockholm.se.quakenet.org',
  irc_server_name: 'quakenet',
  owner_id: 0
})
channel.insert()

const user = new User({
  username: 'seed',
  password: '123',
  register_ip: '127.0.0.1'
})
user.insert()

const webhook = new Webhook({
  name: 'ttxxxxxxt',
  token: 'xxx',
  channel_id: channel.id!,
  register_ip: '127.0.0.1',
  last_use_ip: '127.0.0.1',
  owner_id: user.id!
})
webhook.insert()
