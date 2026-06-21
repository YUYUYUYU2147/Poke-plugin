import plugin from '../../../lib/plugins/plugin.js'
import { RankService } from './rankService.js'
import { renderRankImage, renderMyPokeImage, getPluginVersion } from '../resources/render/imageRender.js'
import { getConfigItem } from '../config/config.js'
import { getUserNickname, parseTargetId, formatRankList } from './userUtils.js'
import { validateEvent } from './inputValidator.js'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

async function formatRankImageData(list, groupId, e, isGlobal = false) {
  const formattedList = []
  for (let i = 0; i < list.length; i++) {
    const item = list[i]
    const nickname = await getUserNickname(item.userId, groupId, e, isGlobal)
    formattedList.push({ ...item, nickname, rank: i + 1 })
  }
  return formattedList
}

async function getRankOutputType() {
  return await getConfigItem('poke.rankOutputType', 'image')
}

async function saveImageToFile(image) {
  const filePath = path.join(os.tmpdir(), `poke-rank-${Date.now()}.jpg`)
  await fs.writeFile(filePath, image)
  return `file://${filePath}`
}

async function replyRank(e, title, list, groupId, isGlobal = false) {
  const outputType = await getRankOutputType()
  if (outputType === 'text') {
    const text = await formatRankList(`【${title}】`, list, groupId, e, isGlobal)
    await e.reply(text)
  } else {
    const formattedList = await formatRankImageData(list, groupId, e, isGlobal)
    const version = await getPluginVersion()
    const generateTime = new Date().toLocaleString()
    const image = await renderRankImage({ title, list: formattedList, version, generateTime })
    const file = await saveImageToFile(image)
    await e.reply(segment.image(file))
  }
}

async function replyMyPokeStats(e, targetId, targetName, isSelf) {
  const userStats = await RankService.getUserStats(targetId)
  const outputType = await getRankOutputType()
  if (outputType === 'text') {
    const title = isSelf ? '【我的戳戳统计】' : '【戳戳统计】'
    const msg = `${title}\n戳别人：${userStats.pokeCount} 次\n被戳：${userStats.bePokedCount} 次`
    await e.reply(msg)
  } else {
    const version = await getPluginVersion()
    const generateTime = new Date().toLocaleString()
    const image = await renderMyPokeImage({ pokeCount: userStats.pokeCount, bePokedCount: userStats.bePokedCount, nickname: targetName, version, generateTime })
    const file = await saveImageToFile(image)
    await e.reply(segment.image(file))
  }
}

export class PokeRankCommand extends plugin {
  constructor() {
    super({
      name: '戳戳榜',
      dsc: '群成员戳一戳排行榜',
      event: 'message',
      priority: 100,
      rule: [
        { reg: '^#?(戳戳榜|poke榜)(\d+)?$', fnc: 'showGroupRank' },
        { reg: '^#?(今日戳戳榜|今日poke榜)(\d+)?$', fnc: 'showGroupDayRank' },
        { reg: '^#?(戳戳总榜|poke总榜)(\d+)?$', fnc: 'showGlobalRank' },
        { reg: '^#?(被戳戳榜|被poke榜)(\d+)?$', fnc: 'showGroupBePokedRank' },
        { reg: '^#?(今日被戳戳榜|今日被poke榜)(\d+)?$', fnc: 'showGroupBePokedDayRank' },
        { reg: '^#?(被戳戳总榜|被poke总榜)(\d+)?$', fnc: 'showGlobalBePokedRank' },
        { reg: '^#?(查询戳戳|查询poke)(?:[\s@]+(\d+))?$', fnc: 'showMyPokeStats' },
        { reg: '^#?(戳戳榜帮助|戳戳帮助|poke帮助)$', fnc: 'showHelp' }
      ]
    })
  }

  async showGroupRank(e) {
    if (!e.group_id) return await e.reply('【戳戳榜】该指令仅限群聊中使用，私聊不可用。')
    const eventValidation = validateEvent(e)
    if (!eventValidation.valid) return await e.reply(`参数错误: ${eventValidation.error}`)
    const groupId = e.group_id
    const limit = e.msg.match(/(\d+)/) ? parseInt(e.msg.match(/(\d+)/)[1]) : undefined
    const list = await RankService.getGroupRank(groupId, limit)
    await replyRank(e, '本群戳戳榜', list, groupId)
  }

  async showGroupDayRank(e) {
    if (!e.group_id) return await e.reply('【今日戳戳榜】该指令仅限群聊中使用，私聊不可用。')
    const eventValidation = validateEvent(e)
    if (!eventValidation.valid) return await e.reply(`参数错误: ${eventValidation.error}`)
    const groupId = e.group_id
    const limit = e.msg.match(/(\d+)/) ? parseInt(e.msg.match(/(\d+)/)[1]) : undefined
    const list = await RankService.getGroupDayRank(groupId, limit)
    await replyRank(e, '本群今日戳戳榜', list, groupId)
  }

  async showGlobalRank(e) {
    const limit = e.msg.match(/(\d+)/) ? parseInt(e.msg.match(/(\d+)/)[1]) : undefined
    const list = await RankService.getGlobalRank(limit)
    await replyRank(e, '戳戳总榜', list, null, true)
  }

  async showGroupBePokedRank(e) {
    if (!e.group_id) return await e.reply('【被戳戳榜】该指令仅限群聊中使用，私聊不可用。')
    const eventValidation = validateEvent(e)
    if (!eventValidation.valid) return await e.reply(`参数错误: ${eventValidation.error}`)
    const groupId = e.group_id
    const limit = e.msg.match(/(\d+)/) ? parseInt(e.msg.match(/(\d+)/)[1]) : undefined
    const list = await RankService.getGroupBePokedRank(groupId, limit)
    await replyRank(e, '本群被戳戳榜', list, groupId)
  }

  async showGroupBePokedDayRank(e) {
    if (!e.group_id) return await e.reply('【今日被戳戳榜】该指令仅限群聊中使用，私聊不可用。')
    const eventValidation = validateEvent(e)
    if (!eventValidation.valid) return await e.reply(`参数错误: ${eventValidation.error}`)
    const groupId = e.group_id
    const limit = e.msg.match(/(\d+)/) ? parseInt(e.msg.match(/(\d+)/)[1]) : undefined
    const list = await RankService.getGroupBePokedDayRank(groupId, limit)
    await replyRank(e, '本群今日被戳戳榜', list, groupId)
  }

  async showGlobalBePokedRank(e) {
    const limit = e.msg.match(/(\d+)/) ? parseInt(e.msg.match(/(\d+)/)[1]) : undefined
    const list = await RankService.getGlobalBePokedRank(limit)
    await replyRank(e, '被戳戳总榜', list, null, true)
  }

  async showMyPokeStats(e) {
    const targetId = parseTargetId(e)
    const isSelf = targetId === e.user_id
    let targetName = ''
    try {
      if (e.group && e.group.pickMember) {
        const member = await e.group.pickMember(targetId).getInfo()
        targetName = (member.card || member.nickname || '').replace(/^@+/, '') || targetId
      }
    } catch {}
    if (!targetName) {
      targetName = isSelf ? (e.sender.card || e.sender.nickname || e.user_id).replace(/^@+/, '') : targetId
    }
    await replyMyPokeStats(e, targetId, targetName, isSelf)
  }

  async showHelp(e) {
    const helpText = `【戳戳榜插件使用帮助】
🎮 指令用法

📊 榜单查询指令
• #戳戳榜 / #poke榜 - 查看本群戳戳榜
• #戳戳榜10 / #poke榜10 - 查看本群戳戳榜（前10名）
• #今日戳戳榜 / #今日poke榜 - 查看本群今日戳戳榜
• #戳戳总榜 / #poke总榜 - 查看全局戳戳总榜
• #被戳戳榜 / #被poke榜 - 查看本群被戳戳榜
• #今日被戳戳榜 / #今日被poke榜 - 查看本群今日被戳戳榜
• #被戳戳总榜 / #被poke总榜 - 查看全局被戳戳总榜

👤 个人统计指令
• #查询戳戳 / #查询poke - 查询自己的戳戳统计
• #查询戳戳 @用户 / #查询poke @用户 - 查询指定用户的戳戳统计
• #查询戳戳 123456 / #查询poke 123456 - 查询指定QQ号的戳戳统计` 
    await e.reply(helpText)
  }
} 