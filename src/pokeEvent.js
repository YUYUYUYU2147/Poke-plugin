import * as pokeStore from './pokeStore.js'
import { getConfigItem } from '../config/config.js'
import util from 'node:util'

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
    // 对齐 miao-plugin 的处理逻辑：在 group 状态下，如果 user_id === self_id，使用 operator_id 作为戳人者
    const self_id = e.self_id || e.bot?.uin || (typeof Bot !== 'undefined' ? Bot.uin : undefined)
    if (e.notice_type === 'group' && self_id) {
      // group状态下，戳一戳的发起人是operator
      // 如果机器人戳别人，user_id 会是机器人的 ID，此时应该使用 operator_id 作为戳人者
      if (e.user_id === self_id) e.user_id = e.operator_id
    }
    
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
      const warnData = {
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
      }
      return logger?.warn?.('[Poke-plugin] 事件数据不完整，无法确定戳人者:', util.inspect(warnData, { depth: 5, colors: false }))
    }
    const eventKey = generateEventKey(groupId, userId, targetId, Date.now())
    if (isDuplicateEvent(eventKey)) return logger?.debug?.('[Poke-plugin] 忽略重复事件:', eventKey)
    // 对于戳人者，不依赖 e.sender（可能指向错误的人），直接通过 group.pickMember 获取
    const nickname = await getUserNickname(userId, e.group, null)
    // 对于被戳者，e.target 应该是正确的
    const targetNickname = await getUserNickname(targetId, e.group, e.target)
    const eventData = { groupId, userId, nickname, targetId, targetNickname, timestamp: Date.now() }
    if (await shouldFilterEvent(eventData)) {
      // 确定具体的过滤原因
      const filterConfig = await getConfigItem('poke.filter', {})
      let filterReason = '未知原因'
      if (filterConfig.ignoreSelfPoke !== false && String(userId) === String(targetId)) {
        filterReason = '自己戳自己（ignoreSelfPoke=true）'
      } else if (filterConfig.ignoredUsers && Array.isArray(filterConfig.ignoredUsers)) {
        if (filterConfig.ignoredUsers.includes(String(userId)) || filterConfig.ignoredUsers.includes(String(targetId))) {
          filterReason = `用户被忽略（ignoredUsers: ${filterConfig.ignoredUsers.includes(String(userId)) ? userId : targetId}）`
        }
      } else if (filterConfig.ignoredGroups && Array.isArray(filterConfig.ignoredGroups)) {
        if (filterConfig.ignoredGroups.includes(String(groupId))) {
          filterReason = `群组被忽略（ignoredGroups: ${groupId}）`
        }
      } else if (filterConfig.timeRange) {
        const now = new Date()
        const hour = now.getHours()
        if (filterConfig.timeRange.start !== undefined && hour < filterConfig.timeRange.start) {
          filterReason = `时间范围过滤（当前时间 ${hour} 时 < 开始时间 ${filterConfig.timeRange.start} 时）`
        } else if (filterConfig.timeRange.end !== undefined && hour > filterConfig.timeRange.end) {
          filterReason = `时间范围过滤（当前时间 ${hour} 时 > 结束时间 ${filterConfig.timeRange.end} 时）`
        }
      }
      
      const filterData = {
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
        filterReason
      }
      return logger?.debug?.('[Poke-plugin] 事件被过滤:', util.inspect(filterData, { depth: 5, colors: false }))
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
      const logData = {
        '群号': groupId,
        '戳人ID': `${userId}(${nickname})`,
        '被戳人ID': `${targetId}(${targetNickname})`,
        '群内戳别人数': groupPokeCount,
        '群内被戳数': groupBePokedCount,
        '群内总戳数': totalPokeCount,
        '全局戳别人数': globalPokeCount,
        '全局被戳数': globalBePokedCount,
        '全局总戳数': globalPokeCount + globalBePokedCount
      }
      logger?.info?.('[Poke-plugin] 戳一戳事件记录成功:', util.inspect(logData, { depth: 5, colors: false }))
    } catch (statError) {
      logger?.warn?.('[Poke-plugin] 获取用户统计信息失败:', statError)
      // 如果统计信息获取失败，至少记录基本事件信息
      const logData = {
        '群号': groupId,
        '戳人ID': `${userId}(${nickname})`,
        '被戳人ID': `${targetId}(${targetNickname})`
      }
      logger?.info?.('[Poke-plugin] 戳一戳事件记录成功:', util.inspect(logData, { depth: 5, colors: false }))
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