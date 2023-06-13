// http

import bodyParser from 'body-parser';
import { Request, Response } from 'express';
import { getDiscordChannels } from '../features/channels';
import { getConfig } from '../base/config';
import { getMessages } from '../history';
import { getExpress } from './server';
import { getUsers, logoutUser } from '../users';
const cors = require('cors')

getExpress().use(bodyParser.json())
getExpress().use(
  bodyParser.urlencoded({
    extended: true
  })
)
getExpress().use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', '*')
  res.setHeader('Access-Control-Allow-Headers', '*')
  console.log('WWW: %s %s %s', req.method, req.originalUrl, req.ip)
  next()
})
getExpress().use(cors())
getExpress().get('/:server/:channel/messages', (req, res) => {
  res.end(JSON.stringify(getMessages(req.params.server, req.params.channel)))
})
getExpress().get('/:server/:channel/typers', (req, res) => {
  res.end(
    JSON.stringify(
      Object.values(getUsers())
        .filter((user) => user.isTyping && user.activeChannel == req.params.channel && user.activeServer === req.params.server)
        .map((user) => user.username)
    )
  )
})
getExpress().get('/:server/channels', (req, res) => {
  res.end(JSON.stringify(getDiscordChannels(req.params.server)))
})
getExpress().get('/users', (req, res) => {
  res.end(JSON.stringify(Object.values(getUsers()).map((user) => user.username)))
})

const checkAdminAuth = (req: Request, res: Response): boolean => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.send(JSON.stringify({
      error: 'Authentication is required please set the bearer authorization header.'
    }))
    return false
  }
  const authToken = authHeader.slice('Bearer '.length)
  console.log(`Auth token: ${authToken}`)
  if (authToken !== process.env.ADMIN_TOKEN) {
    res.send(JSON.stringify({
      error: 'Invalid API key provided'
     }))
    return false
  }
  return true
}

// curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer youradmintoken" --data '{"required": true }' http://localhost:6969/admin/logout_all
getExpress().post('/admin/logout_all', (req: Request, res: Response) => {
  if (!checkAdminAuth(req, res)) {
    return
  }
  console.log(`[*] admin logged out all users`)
  Object.values(getUsers()).forEach((user) => logoutUser(user))
  res.send({
    message: 'OK'
  })
})

// curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer youradmintoken" --data '{"required": true }' http://localhost:6969/admin/password
getExpress().post('/admin/password', (req: Request, res: Response) => {
  if (!checkAdminAuth(req, res)) {
    return
  }
  console.log(req.body)
  if (!req.body || req.body.required === undefined) {
    res.send({
      error: "missing key 'required'"
    })
    return
  }
  const { required } = req.body
  getConfig().requirePasswords = required ? true : false
  console.log(`[*] admin set password required to ${required}`)
  res.send({
    message: 'OK'
  })
})
