import { Webhook } from "../models/webhook";
import { Channel } from "../models/channel";
import { User } from "../models/user";
import { Server } from "../models/server";

require('dotenv').config()

/*
  To run this file do: npm run seed

  It is not recommended to run this file in production
  This is just to populate your development database with some entries

  If you get some unique constraint errors when running it multiple times
  you can run this command to delete all the conflicting data.

      delete from servers;delete from channels;delete from webhooks;delete from users where username LIKE "%seed" or username = 'ChillerDragon';

  DO NOT RUN THIS IN PRODUCTION! IT DELETES YOUR DATA
*/

const chiller = new User({
  username: 'ChillerDragon',
  password: process.env.SEED_PASSWORD || 'xxx',
  register_ip: '127.0.0.1'
})
chiller.insert()

const user = new User({
  username: 'seed',
  password: '123',
  register_ip: '127.0.0.1'
})
user.insert()

const qshar = new User({
  username: 'QshaR_seed',
  password: 'vodka',
  register_ip: '127.0.0.1'
})
qshar.insert()

const heinrich = new User({
  username: 'heinrich5991_seed',
  password: 'aiYi3va#bahreXa3TheaSh)eepolach7',
  register_ip: '127.0.0.1'
})
heinrich.insert()

const ddnet = new Server({
  name: 'ddnet',
  discord_name: 'ddnet',
  irc_name: 'quakenet',
  irc_ip: 'stockholm.se.quakenet.org',
  icon_url: '../img/ddnet-logo.png',
  register_ip: '127.0.0.1',
  owner_id: 0
})
ddnet.insert()

const teeworlds = new Server({
  name: 'teeworlds',
  discord_name: 'Teeworlds discord',
  irc_name: 'quakenet',
  irc_ip: 'stockholm.se.quakenet.org',
  icon_url: '../img/teeworlds-logo.png',
  register_ip: '127.0.0.1',
  owner_id: heinrich.id!
})
teeworlds.insert()

const teeworldsGeneral = new Channel({
  name: 'general',
  description: 'test description',
  discord_server: 'teeworlds',
  discord_channel: 'general',
  irc_channel: 'teeworlds-general',
  irc_server_ip: 'stockholm.se.quakenet.org',
  irc_server_name: 'quakenet',
  server_id: teeworlds.id!,
  owner_id: heinrich.id!
})
teeworldsGeneral.insert()

const kog = new Server({
  name: 'kog',
  discord_name: 'kog',
  irc_name: 'quakenet',
  irc_ip: 'stockholm.se.quakenet.org',
  icon_url: 'https://kog.tw/other/logo_black_short.svg',
  register_ip: '127.0.0.1',
  owner_id: qshar.id!
})
kog.insert()

const kogGeneral = new Channel({
  name: 'general',
  description: 'test description',
  discord_server: 'kog',
  discord_channel: 'general',
  irc_channel: 'kog',
  irc_server_ip: 'stockholm.se.quakenet.org',
  irc_server_name: 'quakenet',
  server_id: kog.id!,
  owner_id: qshar.id!
})
kogGeneral.insert()

const kogMemes = new Channel({
  name: 'memes',
  description: 'test description',
  discord_server: 'kog',
  discord_channel: 'memes',
  irc_channel: 'kog',
  irc_server_ip: 'stockholm.se.quakenet.org',
  irc_server_name: 'quakenet',
  server_id: kog.id!,
  owner_id: qshar.id!
})
kogMemes.insert()

const kogGeneralWebhook = new Webhook({
  name: 'kogi when add bridge omg',
  token: 'xxx',
  server_id: kog.id!,
  channel_id: kogGeneral.id!,
  register_ip: '127.0.0.1',
  last_use_ip: '127.0.0.1',
  owner_id: user.id!
})
kogGeneralWebhook.insert()

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
  name: 'off-topic',
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
  name: 'seed',
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
