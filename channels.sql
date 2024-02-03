-- ddnet#developer
INSERT INTO channels (
  name,
  irc_server_ip,
  irc_server_name,
  irc_channel,
  discord_server,
  discord_channel,
  is_private,
  created_at,
  updated_at,
  owner_id
) VALUES (
  'developer',
  'stockholm.se.quakenet.org',
  'quakenet',
  'ddnet',
  'ddnet',
  'developer',
  1,
  DateTime('now'),
  DateTime('now'),
  0
);

-- ddnet#off-topic
INSERT INTO channels (
  name,
  irc_server_ip,
  irc_server_name,
  irc_channel,
  discord_server,
  discord_channel,
  is_private,
  created_at,
  updated_at,
  owner_id
) VALUES (
  'off-topic',
  'stockholm.se.quakenet.org',
  'quakenet',
  'ddnet-off-topic',
  'ddnet',
  'off-topic',
  0,
  DateTime('now'),
  DateTime('now'),
  0
);
