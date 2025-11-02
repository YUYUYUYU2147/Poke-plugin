import * as pokeStore from './pokeStore.js'

export async function getUserNickname(userId, groupId, e, isGlobal = false) {
  let nickname = ''
  if (isGlobal) {
    try { nickname = await pokeStore.getGlobalUserNickname(userId) } catch {}
  }
  if (!nickname && e?.group?.pickMember) {
    try {
      const member = await e.group.pickMember(userId).getInfo()
      nickname = member.card || member.nickname || ''
    } catch {}
  }
  if (!nickname && groupId) {
    try {
      const detail = await pokeStore.getUserDetail(groupId, userId)
      if (detail && detail.nickname) nickname = detail.nickname
    } catch {}
  }
  return nickname || String(userId)
}

export function parseTargetId(e) {
  let targetId = null
  if (typeof e.at === 'string' && /^\d{5,}$/.test(e.at)) targetId = e.at
  else if (Array.isArray(e.at) && e.at.length > 0 && /^\d{5,}$/.test(e.at[0])) targetId = e.at[0]
  if (!targetId) {
    const allMsg = [e.msg, e.message, e.raw_message].filter(Boolean).join(' ')
    const atMatch = allMsg.match(/qq=(\d{5,})/)
    if (atMatch) targetId = atMatch[1]
  }
  if (!targetId) {
    const allMsg = [e.msg, e.message, e.raw_message].filter(Boolean).join(' ')
    const numMatch = allMsg.match(/(\d{5,})/)
    if (numMatch) targetId = numMatch[1]
  }
  return targetId || e.user_id
}

export async function formatRankList(title, list, groupId, e, isGlobal = false) {
  if (!list || list.length === 0) return `${title}\n暂无数据~`
  let msg = `${title}\n`
  for (let i = 0; i < list.length; i++) {
    const item = list[i]
    const nickname = await getUserNickname(item.userId, groupId, e, isGlobal)
    msg += `${i + 1}. ${nickname}（${item.userId}）  ${item.count}次\n`
  }
  return msg.trim()
}

export function validateLimit(limit, min = 1, max = 30, defaultVal = 10) {
  if (!limit) return defaultVal
  const num = parseInt(limit)
  if (isNaN(num)) return defaultVal
  return Math.max(min, Math.min(max, num))
}

export function getTodayString() {
  return new Date().toISOString().slice(0, 10)
}

export function at(userId) {
  return `[CQ:at,qq=${userId}]`
} 