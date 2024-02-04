import { Webhook } from "../models/webhook";
import { Channel } from "../models/channel";
import { User } from "../models/user";
import { Server } from "../models/server";

const ddnet = new Server({
  name: 'ddnet',
  discord_name: 'ddnet',
  irc_name: 'quakenet',
  irc_ip: 'stockholm.se.quakenet.org',
  icon_url: '',
  register_ip: '127.0.0.1',
  owner_id: 0
})
ddnet.insert()

const developer = new Channel({
  name: 'developer',
  description: 'test description',
  discord_server: 'ddnet',
  discord_channel: 'developer',
  irc_channel: 'ddnet',
  irc_server_ip: 'stockholm.se.quakenet.org',
  irc_server_name: 'quakenet',
  server_id: ddnet.id!,
  owner_id: 0
})
developer.insert()

const offtopic = new Channel({
  name: 'offtopic',
  description: 'test description',
  discord_server: 'ddnet',
  discord_channel: 'off-topic',
  irc_channel: 'ddnet-off-topic',
  irc_server_ip: 'stockholm.se.quakenet.org',
  irc_server_name: 'quakenet',
  server_id: ddnet.id!,
  owner_id: 0
})
offtopic.insert()

const channel = new Channel({
  name: 'seed-channel',
  description: 'test description',
  discord_server: 'ddnet',
  discord_channel: 'seed',
  irc_channel: 'ddnet-seed',
  irc_server_ip: 'stockholm.se.quakenet.org',
  irc_server_name: 'quakenet',
  server_id: ddnet.id!,
  owner_id: 0
})
channel.insert()

const user = new User({
  username: 'seed',
  password: '123',
  register_ip: '127.0.0.1'
})
user.insert()

const offtopicWebhook1 = new Webhook({
  name: 'offtopic web hooker',
  token: 'xxx',
  server_id: ddnet.id!,
  channel_id: offtopic.id!,
  register_ip: '127.0.0.1',
  last_use_ip: '127.0.0.1',
  owner_id: user.id!
})
offtopicWebhook1.insert()

const offtopicWebhook2 = new Webhook({
  name: 'offtopic weeb hook',
  token: 'xxx',
  server_id: ddnet.id!,
  channel_id: offtopic.id!,
  register_ip: '127.0.0.1',
  last_use_ip: '127.0.0.1',
  owner_id: user.id!
})
offtopicWebhook2.insert()

const developerWebhook = new Webhook({
  name: 'github news feed',
  token: 'xxx',
  server_id: ddnet.id!,
  channel_id: developer.id!,
  register_ip: '127.0.0.1',
  last_use_ip: '127.0.0.1',
  owner_id: user.id!
})
developerWebhook.insert()
