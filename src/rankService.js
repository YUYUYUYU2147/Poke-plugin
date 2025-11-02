import * as pokeStore from './pokeStore.js'
import { getConfigItem } from '../config/config.js'
import { validateLimit, getTodayString } from './userUtils.js'

export class RankService {
  static async getGroupRank(groupId, limit = 10) {
    const validatedLimit = await this.validateRankLimit(limit)
    return pokeStore.getGroupRank(groupId, validatedLimit)
  }

  static async getGroupDayRank(groupId, limit = 10, date = null) {
    const validatedLimit = await this.validateRankLimit(limit)
    const targetDate = date || getTodayString()
    return pokeStore.getGroupDayRank(groupId, targetDate, validatedLimit)
  }

  static async getGlobalRank(limit = 10) {
    const validatedLimit = await this.validateRankLimit(limit)
    return pokeStore.getGlobalRank(validatedLimit)
  }

  static async getGroupBePokedRank(groupId, limit = 10) {
    const validatedLimit = await this.validateRankLimit(limit)
    return pokeStore.getGroupBePokedRank(groupId, validatedLimit)
  }

  static async getGroupBePokedDayRank(groupId, limit = 10, date = null) {
    const validatedLimit = await this.validateRankLimit(limit)
    const targetDate = date || getTodayString()
    return pokeStore.getGroupBePokedDayRank(groupId, targetDate, validatedLimit)
  }

  static async getGlobalBePokedRank(limit = 10) {
    const validatedLimit = await this.validateRankLimit(limit)
    return pokeStore.getGlobalBePokedRank(validatedLimit)
  }

  static async getUserStats(userId) {
    const [pokeCount, bePokedCount] = await Promise.all([
      pokeStore.getGlobalUserPokeCount(userId),
      pokeStore.getGlobalUserBePokedCount(userId)
    ])
    return { userId, pokeCount, bePokedCount, totalCount: pokeCount + bePokedCount }
  }

  static async validateRankLimit(limit) {
    const defaultLimit = await getConfigItem('poke.defaultRankLimit', 10)
    const minLimit = await getConfigItem('poke.minRankLimit', 1)
    const maxLimit = await getConfigItem('poke.maxRankLimit', 30)
    return validateLimit(limit, minLimit, maxLimit, defaultLimit)
  }

  static async getRankConfig() {
    return {
      defaultLimit: await getConfigItem('poke.defaultRankLimit', 10),
      minLimit: await getConfigItem('poke.minRankLimit', 1),
      maxLimit: await getConfigItem('poke.maxRankLimit', 30),
      outputType: await getConfigItem('poke.rankOutputType', 'image'),
      expireDay: await getConfigItem('poke.expireDay', 30)
    }
  }

  static async getBatchUserStats(userIds) {
    return Promise.all(userIds.map(userId => this.getUserStats(userId)))
  }

  static async getGroupOverview(groupId) {
    try {
      const [totalPokes, totalBePoked, activeUsers] = await Promise.all([
        pokeStore.getGroupTotalPokes(groupId),
        pokeStore.getGroupTotalBePoked(groupId),
        pokeStore.getGroupActiveUsers(groupId)
      ])
      return { groupId, totalPokes, totalBePoked, activeUsers, totalInteractions: totalPokes + totalBePoked }
    } catch (error) {
      console.error('[RankService] 获取群组概览失败:', error)
      return { groupId, totalPokes: 0, totalBePoked: 0, activeUsers: 0, totalInteractions: 0 }
    }
  }

  static async getSystemOverview() {
    try {
      const [totalPokes, totalBePoked, totalGroups, totalUsers] = await Promise.all([
        pokeStore.getGlobalTotalPokes(),
        pokeStore.getGlobalTotalBePoked(),
        pokeStore.getGlobalTotalGroups(),
        pokeStore.getGlobalTotalUsers()
      ])
      return { totalPokes, totalBePoked, totalGroups, totalUsers, totalInteractions: totalPokes + totalBePoked }
    } catch (error) {
      console.error('[RankService] 获取系统概览失败:', error)
      return { totalPokes: 0, totalBePoked: 0, totalGroups: 0, totalUsers: 0, totalInteractions: 0 }
    }
  }

  static async cleanupExpiredData(expireDays = null) {
    try {
      const days = expireDays || await getConfigItem('poke.expireDay', 30)
      if (days > 0) {
        await pokeStore.cleanupExpiredData(days)
        return true
      }
      return false
    } catch (error) {
      console.error('[RankService] 清理过期数据失败:', error)
      return false
    }
  }
} 