import repl from 'repl'
import path from 'path'
import { readdirSync } from 'fs'

const replServer = repl.start({
  prompt: '> '
})

const files = readdirSync(path.join(__dirname, '../src/models/')).filter((e) => /\.ts$/.test(e)).map((e) => e.split('.')[0])
files.forEach((model) => {
  import(`../src/models/${model}`).then((module) => {
    const camel = `${model[0].toUpperCase()}${model.substring(1)}`
    replServer.context[camel] = module[camel]
  })
})
