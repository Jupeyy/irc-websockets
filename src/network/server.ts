import express, { Request, Response } from 'express'
import { createServer } from "http";
import { Server } from "socket.io";
import { Express } from 'express';
import { useAccounts } from '../features/accounts';
// import express, { Express, Request, Response } from 'express';
require('dotenv').config()

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: "*"
  }
})

export const getExpress = (): Express => {
  return app
}

export const getWebsocket = (): Server => {
  return io
}

httpServer.listen(6969, (): void => {
  console.log('[*] listening on http://localhost:6969')
  console.log(`[*] accounts are ${useAccounts() ? 'on' : 'off'}`)
})
