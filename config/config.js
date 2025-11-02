import fs from 'fs/promises'
import yaml from 'js-yaml'
import path from 'path'
import { fileURLToPath } from 'url'

const pluginRoot = path.dirname(fileURLToPath(import.meta.url))
const configPath = path.join(pluginRoot, 'config.yaml')
const defaultConfigPath = path.join(pluginRoot, 'config_default.yaml')

export { configPath, defaultConfigPath }

import fsSync from 'fs'
let userConfigExists = false
try {
  fsSync.accessSync(configPath)
  userConfigExists = true
} catch {
  console.info('[Poke-plugin] 未找到用户配置文件，使用默认配置')
}

/**
 * 验证配置格式
 * @param {object} config - 配置对象
 * @returns {object} 验证结果 {valid: boolean, errors: Array}
 */
function validateConfig(config) {
  const errors = []
  
  if (!config) {
    errors.push('配置对象为空')
    return { valid: false, errors }
  }
  
  if (config.poke) {
    const { rankOutputType, expireDay, maxRankLimit, minRankLimit, defaultRankLimit } = config.poke
    
    if (rankOutputType && !['text', 'image'].includes(rankOutputType)) {
      errors.push('poke.rankOutputType 必须是 text 或 image')
    }
    
    if (expireDay !== undefined && (typeof expireDay !== 'number' || expireDay < 0)) {
      errors.push('poke.expireDay 必须是非负数字')
    }
    
    if (maxRankLimit !== undefined && (typeof maxRankLimit !== 'number' || maxRankLimit < 1)) {
      errors.push('poke.maxRankLimit 必须是大于0的数字')
    }
    
    if (minRankLimit !== undefined && (typeof minRankLimit !== 'number' || minRankLimit < 1)) {
      errors.push('poke.minRankLimit 必须是大于0的数字')
    }
    
    if (defaultRankLimit !== undefined && (typeof defaultRankLimit !== 'number' || defaultRankLimit < 1)) {
      errors.push('poke.defaultRankLimit 必须是大于0的数字')
    }
  }
  
  if (config.render) {
    const { rankWidth, myPokeWidth, cacheEnabled, cacheExpire } = config.render
    
    if (rankWidth !== undefined && (typeof rankWidth !== 'number' || rankWidth < 100)) {
      errors.push('render.rankWidth 必须是大于100的数字')
    }
    
    if (myPokeWidth !== undefined && (typeof myPokeWidth !== 'number' || myPokeWidth < 100)) {
      errors.push('render.myPokeWidth 必须是大于100的数字')
    }
    
    if (cacheEnabled !== undefined && typeof cacheEnabled !== 'boolean') {
      errors.push('render.cacheEnabled 必须是布尔值')
    }
    
    if (cacheExpire !== undefined && (typeof cacheExpire !== 'number' || cacheExpire < 0)) {
      errors.push('render.cacheExpire 必须是非负数字')
    }
  }
  
  return { valid: errors.length === 0, errors }
}

/**
 * 合并默认配置
 * @param {object} userConfig - 用户配置
 * @param {object} defaultConfig - 默认配置
 * @returns {object} 合并后的配置
 */
function mergeDefaultConfig(userConfig, defaultConfig) {
  if (!userConfig) return defaultConfig
  if (!defaultConfig) return userConfig

  if (Array.isArray(userConfig)) {
    return userConfig
  }

  const merged = { ...defaultConfig }
  for (const key in userConfig) {
    if (userConfig.hasOwnProperty(key)) {
      if (typeof userConfig[key] === 'object' && userConfig[key] !== null && 
          typeof merged[key] === 'object' && merged[key] !== null) {
        merged[key] = mergeDefaultConfig(userConfig[key], merged[key])
      } else {
        merged[key] = userConfig[key]
      }
    }
  }
  return merged
}

function injectIgnoredFields(config) {
  const pokeIgnoredList = Array.isArray(config.pokeIgnored_list) ? config.pokeIgnored_list : []
  const ignoredUsers = pokeIgnoredList.filter(item => item.type === 'user').map(item => String(item.id))
  const ignoredGroups = pokeIgnoredList.filter(item => item.type === 'group').map(item => String(item.id))
  if (!config.poke) config.poke = {}
  if (!config.poke.filter) config.poke.filter = {}
  if (ignoredUsers.length > 0) config.poke.filter.ignoredUsers = ignoredUsers
  else if (config.poke.filter.ignoredUsers) delete config.poke.filter.ignoredUsers
  if (ignoredGroups.length > 0) config.poke.filter.ignoredGroups = ignoredGroups
  else if (config.poke.filter.ignoredGroups) delete config.poke.filter.ignoredGroups
}

/**
 * 获取配置
 * @returns {Promise<object>} 配置对象
 */
export async function getConfig() {
  try {
    const defaultData = await fs.readFile(defaultConfigPath, 'utf8')
    const defaultConfig = yaml.load(defaultData)
    try {
      const userData = await fs.readFile(configPath, 'utf8')
      const userConfig = yaml.load(userData)
      const mergedConfig = mergeDefaultConfig(userConfig, defaultConfig)
      const validation = validateConfig(mergedConfig)
      if (!validation.valid) {
        console.warn('[Poke-plugin] 配置验证失败:', validation.errors)
      }
      injectIgnoredFields(mergedConfig)
      return mergedConfig
    } catch (error) {
      injectIgnoredFields(defaultConfig)
      return defaultConfig
    }
  } catch (error) {
    console.warn('[Poke-plugin] 无法读取默认配置文件，插件无法正常工作')
    throw error
  }
}

/**
 * 设置配置
 * @param {object} newData - 新配置数据
 * @returns {Promise<boolean>} 是否成功
 */
export async function setConfig(newData) {
  try {
    const validation = validateConfig(newData)
    if (!validation.valid) {
      console.error('[Poke-plugin] 配置验证失败:', validation.errors)
      return false
    }
    
    await fs.writeFile(configPath, yaml.dump(newData, { indent: 2 }), 'utf8')
    return true
  } catch (error) {
    console.error('[Poke-plugin] 保存配置失败:', error)
    return false
  }
}

/**
 * 获取特定配置项
 * @param {string} key - 配置键路径，如 'poke.rankOutputType'
 * @param {any} defaultValue - 默认值
 * @returns {Promise<any>} 配置值
 */
export async function getConfigItem(key, defaultValue = undefined) {
  const config = await getConfig()
  const keys = key.split('.')
  let value = config
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k]
    } else {
      return defaultValue
    }
  }
  
  return value
}

/**
 * 监听配置文件变化
 * @param {function} callback - 变化回调函数
 * @returns {Promise<boolean>} 是否成功启动监听
 */
export async function watchConfig(callback) {
  try {
    const fs = await import('fs')
    const watcher = fs.watch(configPath, async (eventType) => {
      if (eventType === 'change') {
        try {
          const newConfig = await getConfig()
          callback(newConfig)
        } catch (error) {
          console.error('[Poke-plugin] 配置重载失败:', error)
        }
      }
    })
    
    return () => {
      watcher.close()
    }
  } catch (error) {
    console.error('[Poke-plugin] 启动配置监听失败:', error)
    return false
  }
} 