import * as pokeStore from './pokeStore.js'
import { getConfigItem } from '../config/config.js'

const eventCache = new Map()
const CACHE_EXPIRE = 5000

function generateEventKey(groupId, userId, targetId, timestamp) {
  return `${groupId}:${userId}:${targetId}:${Math.floor(timestamp / 1000)}`
}

function isDuplicateEvent(eventKey) {
  const now = Date.now()
  if (eventCache.has(eventKey)) {
    const cached = eventCache.get(eventKey)
    if (now - cached.timestamp < CACHE_EXPIRE) return true
    eventCache.delete(eventKey)
  }
  eventCache.set(eventKey, { timestamp: now })
  if (eventCache.size > 1000) {
    for (const [key, value] of eventCache.entries()) {
      if (now - value.timestamp > CACHE_EXPIRE) eventCache.delete(key)
    }
  }
  return false
}

async function shouldFilterEvent(eventData) {
  const groupId = String(eventData.groupId)
  const userId = String(eventData.userId)
  const targetId = String(eventData.targetId)
  const filterConfig = await getConfigItem('poke.filter', {})
  if (filterConfig.ignoreSelfPoke !== false && userId === targetId) return true
  if (filterConfig.ignoredUsers && Array.isArray(filterConfig.ignoredUsers)) {
    if (filterConfig.ignoredUsers.includes(userId) || filterConfig.ignoredUsers.includes(targetId)) return true
  }
  if (filterConfig.ignoredGroups && Array.isArray(filterConfig.ignoredGroups)) {
    if (filterConfig.ignoredGroups.includes(groupId)) return true
  }
  if (filterConfig.timeRange) {
    const now = new Date()
    const hour = now.getHours()
    if (filterConfig.timeRange.start !== undefined && hour < filterConfig.timeRange.start) return true
    if (filterConfig.timeRange.end !== undefined && hour > filterConfig.timeRange.end) return true
  }
  return false
}

async function getUserNickname(userId, group, user) {
  let nickname = ''
  if (user?.card || user?.nickname) nickname = user.card || user.nickname
  if (!nickname && group?.pickMember) {
    try {
      const member = await group.pickMember(userId).getInfo()
      nickname = member.card || member.nickname || ''
    } catch {}
  }
  return nickname || String(userId)
}

async function handlePokeEvent(e, logger) {
  try {
    const groupId = e.group_id
    const targetId = e.target_id || e.target?.user_id || e.target || e.to_id
    
    // 支持 oicq 的 operator_id 字段（戳人的人），兼容 ICQQ 的 user_id
    // 注意：在 oicq 中，如果 operator_id 不存在，user_id 可能等于 target_id（被戳的人）
    // 因此需要检查：如果 user_id === target_id，不能使用 user_id 作为戳人者
    let userId = e.operator_id
    if (!userId && e.user_id) {
      // 只有当 user_id 不等于 target_id 时，才使用 user_id 作为戳人者
      if (String(e.user_id) !== String(targetId)) {
        userId = e.user_id
      }
    }
    
    if (!groupId || !userId || !targetId) {
      return logger?.warn?.('[Poke-plugin] 事件数据不完整，无法确定戳人者:', {
        groupId,
        userId: userId || '未确定',
        targetId,
        operator_id: e.operator_id,
        user_id: e.user_id,
        target_id: e.target_id,
        reason: !userId ? '无法确定戳人者（operator_id 不存在且 user_id === target_id）' : '缺少必要字段',
        rawEvent: {
          group_id: e.group_id,
          user_id: e.user_id,
          operator_id: e.operator_id,
          target_id: e.target_id,
          sub_type: e.sub_type,
          notice_type: e.notice_type,
          adapter: e.adapter_name || e.adapter_id || 'unknown'
        }
      })
    }
    const eventKey = generateEventKey(groupId, userId, targetId, Date.now())
    if (isDuplicateEvent(eventKey)) return logger?.debug?.('[Poke-plugin] 忽略重复事件:', eventKey)
    // 对于戳人者，不依赖 e.sender（可能指向错误的人），直接通过 group.pickMember 获取
    const nickname = await getUserNickname(userId, e.group, null)
    // 对于被戳者，e.target 应该是正确的
    const targetNickname = await getUserNickname(targetId, e.group, e.target)
    const eventData = { groupId, userId, nickname, targetId, targetNickname, timestamp: Date.now() }
    if (await shouldFilterEvent(eventData)) {
      return logger?.debug?.('[Poke-plugin] 事件被过滤:', {
        ...eventData,
        rawEvent: {
          group_id: e.group_id,
          user_id: e.user_id,
          operator_id: e.operator_id,
          target_id: e.target_id,
          sub_type: e.sub_type,
          notice_type: e.notice_type,
          adapter: e.adapter_name || e.adapter_id || 'unknown'
        },
        filterReason: userId === targetId ? '自己戳自己（ignoreSelfPoke=true）' : '其他过滤规则'
      })
    }
    await pokeStore.recordPoke(eventData)
    
    // 获取并显示用户统计信息
    try {
      const [groupPokeCount, groupBePokedCount, globalPokeCount, globalBePokedCount] = await Promise.all([
        pokeStore.getUserPokeCount(groupId, userId),
        pokeStore.getUserBePokedCount(groupId, userId),
        pokeStore.getGlobalUserPokeCount(userId),
        pokeStore.getGlobalUserBePokedCount(userId)
      ])
      
      const totalPokeCount = groupPokeCount + groupBePokedCount
      logger?.info?.('[Poke-plugin] 戳一戳事件记录成功:', {
        '群号': groupId,
        '戳人ID': `${userId}(${nickname})`,
        '被戳人ID': `${targetId}(${targetNickname})`,
        '群内戳别人数': groupPokeCount,
        '群内被戳数': groupBePokedCount,
        '群内总戳数': totalPokeCount,
        '全局戳别人数': globalPokeCount,
        '全局被戳数': globalBePokedCount,
        '全局总戳数': globalPokeCount + globalBePokedCount
      })
    } catch (statError) {
      logger?.warn?.('[Poke-plugin] 获取用户统计信息失败:', statError)
      // 如果统计信息获取失败，至少记录基本事件信息
      logger?.info?.('[Poke-plugin] 戳一戳事件记录成功:', {
        '群号': groupId,
        '戳人ID': `${userId}(${nickname})`,
        '被戳人ID': `${targetId}(${targetNickname})`
      })
    }
  } catch (error) {
    logger?.error?.('[Poke-plugin] 处理戳一戳事件失败:', error)
  }
}

export function registerPokeEvent(Bot, logger) {
  if (typeof Bot !== 'undefined' && Bot.on) {
    Bot.on('notice.group.poke', async e => { await handlePokeEvent(e, logger) })
    logger?.info?.('[Poke-plugin] 戳一戳事件监听器注册成功')
  } else {
    logger?.warn?.('[Poke-plugin] Bot 对象无效，无法注册事件监听器')
  }
}

export function clearEventCache() { eventCache.clear() }

export function getEventCacheStats() {
  return { size: eventCache.size, expireTime: CACHE_EXPIRE }
} 