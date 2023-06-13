import { Socket } from 'socket.io'

export interface User {
  username: string,
  sessionToken: string,
  socket: Socket,
  loggedIn: boolean,
  activeChannel: string,
  activeServer: string,
  isTyping: boolean
}

interface UserList {
  [index: string]: User
}

const users: UserList = {}

/**
 *
 * @returns array of connect User objects
 */
export const getUsers = () => {
  return users
}

export const getUserByName = (username: string): User | null => {
  if (username === '') {
    return null
  }
  return Object.values(getUsers()).find((user) => user.loggedIn && user.username === username) || null
}

export const getUserBySocket = (socket: Socket): User | null => {
  return getUsers()[socket.id]
  // return getUsers().find((user) => user.loggedIn && user.socket.id === socket.id) || null
}

export const logoutUser = (user: User) => {
  console.log(`[*] logging out ${user.username}`)
  user.loggedIn = false
  user.socket.emit(
    'logout',
    {
      message: 'logged out'
    }
  )
}
