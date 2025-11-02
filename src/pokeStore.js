import { getConfig } from '../config/config.js'

const KEY_PREFIX = 'poke:'
const K = {
  GROUP: groupId => `${KEY_PREFIX}group:${groupId}`,
  GROUP_DAY: (groupId, date) => `${KEY_PREFIX}group:${groupId}:date:${date}`,
  GLOBAL: `${KEY_PREFIX}global`,
  GLOBAL_DAY: date => `${KEY_PREFIX}global:date:${date}`,
  USER_DETAIL: (groupId, userId) => `${KEY_PREFIX}group:${groupId}:user:${userId}`,
  BE_POKED: groupId => `${KEY_PREFIX}group:${groupId}:bepoked`,
  BE_POKED_DAY: (groupId, date) => `${KEY_PREFIX}group:${groupId}:bepoked:date:${date}`,
  BE_POKED_GLOBAL: `${KEY_PREFIX}bepoked:global`,
  GLOBAL_USER: userId => `${KEY_PREFIX}global:user:${userId}`
}

async function setExpire(key) {
  const config = await getConfig()
  const expireDay = config?.poke?.expireDay ?? 0
  if (expireDay > 0) await redis.expire(key, expireDay * 86400)
}

export async function recordPoke({ groupId, userId, nickname, targetId, targetNickname }) {
  const today = new Date().toISOString().slice(0, 10)
  await redis.hIncrBy(K.GROUP(String(groupId)), String(userId), 1)
  await setExpire(K.GROUP(String(groupId)))
  await redis.hIncrBy(K.GROUP_DAY(String(groupId), today), String(userId), 1)
  await setExpire(K.GROUP_DAY(String(groupId), today))
  await redis.hIncrBy(K.GLOBAL, String(userId), 1)
  await setExpire(K.GLOBAL)
  await redis.hIncrBy(K.GLOBAL_DAY(today), String(userId), 1)
  await setExpire(K.GLOBAL_DAY(today))
  await redis.hSet(K.USER_DETAIL(String(groupId), String(userId)), 'nickname', nickname ?? '', 'last_poke_time', new Date().toISOString())
  await setExpire(K.USER_DETAIL(String(groupId), String(userId)))
  await redis.hSet(K.GLOBAL_USER(String(userId)), 'nickname', nickname ?? '')
  if (targetId) {
    await redis.hIncrBy(K.BE_POKED(String(groupId)), String(targetId), 1)
    await setExpire(K.BE_POKED(String(groupId)))
    await redis.hIncrBy(K.BE_POKED_DAY(String(groupId), today), String(targetId), 1)
    await setExpire(K.BE_POKED_DAY(String(groupId), today))
    await redis.hSet(K.USER_DETAIL(String(groupId), String(targetId)), 'nickname', targetNickname ?? '', 'last_be_poked_time', new Date().toISOString())
    await setExpire(K.USER_DETAIL(String(groupId), String(targetId)))
    await redis.hIncrBy(K.BE_POKED_GLOBAL, String(targetId), 1)
    await setExpire(K.BE_POKED_GLOBAL)
    await redis.hSet(K.GLOBAL_USER(String(targetId)), 'nickname', targetNickname ?? '')
  }
}

export async function getGroupRank(groupId, limit = 10) {
  const data = await redis.hGetAll(K.GROUP(groupId))
  return formatRankData(data, limit)
}

export async function getGroupDayRank(groupId, date, limit = 10) {
  const data = await redis.hGetAll(K.GROUP_DAY(groupId, date))
  return formatRankData(data, limit)
}

export async function getGlobalRank(limit = 10) {
  const data = await redis.hGetAll(K.GLOBAL)
  return formatRankData(data, limit)
}

export async function getGlobalDayRank(date, limit = 10) {
  const data = await redis.hGetAll(K.GLOBAL_DAY(date))
  return formatRankData(data, limit)
}

export async function getUserDetail(groupId, userId) {
  return redis.hGetAll(K.USER_DETAIL(groupId, userId))
}

export async function getGroupBePokedRank(groupId, limit = 10) {
  const data = await redis.hGetAll(K.BE_POKED(groupId))
  return formatRankData(data, limit)
}

export async function getGroupBePokedDayRank(groupId, date, limit = 10) {
  const data = await redis.hGetAll(K.BE_POKED_DAY(groupId, date))
  return formatRankData(data, limit)
}

export async function getGlobalBePokedRank(limit = 10) {
  const data = await redis.hGetAll(K.BE_POKED_GLOBAL)
  return formatRankData(data, limit)
}

export async function getGlobalUserNickname(userId) {
  const data = await redis.hGetAll(K.GLOBAL_USER(String(userId)))
  return data?.nickname || ''
}

export async function getUserPokeCount(groupId, userId) {
  const key = K.GROUP(String(groupId))
  const field = String(userId)
  const count = await redis.hGet(key, field)
  return Number(count) || 0
}

export async function getUserBePokedCount(groupId, userId) {
  const key = K.BE_POKED(String(groupId))
  const field = String(userId)
  const count = await redis.hGet(key, field)
  return Number(count) || 0
}

export async function getGlobalUserPokeCount(userId) {
  let total = 0
  const groupIds = await getAllGroupIds()
  for (const groupId of groupIds) {
    const key = K.GROUP(String(groupId))
    const count = await redis.hGet(key, String(userId))
    total += Number(count) || 0
  }
  return total
}

export async function getGlobalUserBePokedCount(userId) {
  let total = 0
  const groupIds = await getAllGroupIds()
  for (const groupId of groupIds) {
    const key = K.BE_POKED(String(groupId))
    const count = await redis.hGet(key, String(userId))
    total += Number(count) || 0
  }
  return total
}

async function getAllGroupIds() {
  const keys = await redis.keys('poke:group:*')
  const groupIds = new Set()
  for (const key of keys) {
    const match = key.match(/^poke:group:(\d+)/)
    if (match) groupIds.add(match[1])
  }
  return Array.from(groupIds)
}

function formatRankData(data, limit) {
  if (!data) return []
  const arr = Object.entries(data).map(([userId, count]) => ({ userId, count: Number(count) }))
  arr.sort((a, b) => b.count - a.count)
  return arr.slice(0, limit)
}