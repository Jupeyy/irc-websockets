import { IrcMessage } from "../socket.io";

let lastMesgSent = new Date()
const ratelimitLog: Date[] = []

export const isRatelimited = (message: IrcMessage): boolean => {
    if (message.message.includes("\n")) {
        // this shows a weird error to the user
        // it will mostly affect webhooks because the webchat does not allow
        // entering newlines anyways
        //
        // But newlines are split on irc in two message
        // So basically every message containing line breaks is
        // spam by itself
        //
        // A custom error for the user would be nice
        // but for now it is bundled under spam
        // and when we use a irc network under the hood that allows spamming
        // we could lift the newline limitation too
        return true
    }
    // const newDate = new Date(message.date)
    // ^ do not trust what the client claims is the date
    // just check current date
    const now = new Date()
    const diff = now.valueOf() - lastMesgSent.valueOf()
    // delete messages from log that are older than 8s
    while (ratelimitLog.length > 0 && (now.valueOf() - ratelimitLog[0].valueOf()) > 8000) {
        ratelimitLog.shift()
    }
    // if the log is longer than 5
    // we disallow sending any message
    if (ratelimitLog.length > 5) {
        return true
    }
    lastMesgSent = now
    // log messages sent in 3s intervals
    if (diff < 3000) {
        ratelimitLog.push(now)
    }
    return false
}
