/*

  session_users.ts

  This file covers the currently active users on the web page
  All users that currently have an active websocket connection from the
  frontend. Get a `SessionUser` instance.

  This is not to be confused with the `User` model.
  That represents user accounts at rest in the database.

  For more info read the doc comment on the `SessionUser` interface
*/

import { Socket } from 'socket.io'
import { IUserRow } from './models/user'

/**
 * SessionUsers contain temporary information such as their display name
 * login token. Active channel/server.
 * Their state such as wether they are typing or not.
 *
 * A SessionUser also holds a link to the `dbUser` (if logged in correctly)
 * Which is a link to the `User` model
 * That abstracts away the user at rest in the database
 *
 * So all persisted state should be keept in the `User` model
 * And the `SessionUser` should only contain temporary per session data
 * That is never stored into the database
 */
export interface SessionUser {
  username: string,
  sessionToken: string,
  socket: Socket,
  loggedIn: boolean,
  activeChannel: string,
  activeServer: string,
  isTyping: boolean,
  lastTyping: Date,
  dbUser: null | IUserRow
}

interface UserList {
  [index: string]: SessionUser
}

export const usernamePattern = (): RegExp => {
  return /^[a-zA-Z0-9_]{1,20}$/
}

const users: UserList = {}

/**
 *
 * @returns array of connect User objects
 */
export const getUsers = (): UserList => {
  return users
}

export const getUserByName = (username: string): SessionUser | null => {
  if (username === '') {
    return null
  }
  return Object.values(getUsers()).find((user) => user.loggedIn && user.username === username) || null
}

export const getUserBySocket = (socket: Socket): SessionUser | null => {
  return getUsers()[socket.id]
  // return getUsers().find((user) => user.loggedIn && user.socket.id === socket.id) || null
}

export const logoutUser = (user: SessionUser, message: string = 'logged out') => {
  console.log(`[*] logging out ${user.username}`)
  user.loggedIn = false
  user.dbUser = null
  user.socket.emit(
    'logout',
    {
      message
    }
  )
}
