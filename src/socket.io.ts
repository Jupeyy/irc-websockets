import { Socket } from 'socket.io'

export interface ServerToClientEvents {
    // irc-websockets
    message: (message: string) => void
}

export interface ClientToServerEvents {
    // socket.io
    connection: (socket: Socket) => void

    // irc-websockets
    message: (message: string) => void
}
