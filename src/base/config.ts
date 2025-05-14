require('dotenv').config()

const isTrue = (envbool: string) => {
  return new RegExp('^(1|true|yes|on)$', 'i').test(envbool)
}

interface Config {
  requirePasswords: boolean
  dryIrc: boolean
}

const config: Config = {
  requirePasswords: isTrue(process.env.ACCOUNTS || '0'),
  dryIrc: isTrue(process.env.DRY_IRC || '0')
}

export const getConfig = (): Config => {
  return config
}
