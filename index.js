import { PokeRankCommand } from './src/pokeRankCommand.js'
import fs from 'node:fs/promises'
import { registerPokeEvent } from './src/pokeEvent.js'

let version
try {
  const packageJson = JSON.parse(
    await fs.readFile('./plugins/Poke-plugin/package.json', 'utf8')
  )
  version = packageJson.version
} catch {}
const prefix = '[Poke-plugin]'

function logInit(msg, color = '') {
  const colors = {
    blue: '\x1b[34m',
    lightBlue: '\x1b[94m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    reset: '\x1b[0m'
  }
  const coloredMsg = color ? `${colors[color]}${prefix} ${msg}${colors.reset}` : `${prefix} ${msg}`
  if (typeof logger !== 'undefined' && logger.info) {
    logger.info(coloredMsg)
  } else {
    console.log(coloredMsg)
  }
}

try {
  logInit('---------^_^---------', 'blue')
  logInit(`戳戳榜插件 v${version} 初始化成功~`, 'lightBlue')
  logInit('功能: 群戳一戳统计、排行榜', 'lightBlue')
  logInit('---------^_^---------', 'blue')
} catch (error) {
  console.error(`${prefix} 戳戳榜插件 v${version} 初始化失败`, error)
}

// 注册命令
export const apps = {
  PokeRankCommand
}

// 注册poke事件监听
registerPokeEvent(globalThis.Bot, globalThis.logger) 