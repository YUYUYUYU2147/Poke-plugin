import fs from 'fs/promises'
import path from 'path'
import Handlebars from 'handlebars'
import { getRenderConfig, mergeRenderConfig } from '../../config/renderConfig.js'
import { getConfigItem } from '../../config/config.js'

Handlebars.registerHelper('addOne', v => v + 1)

const templateCache = new Map()
const cacheEnabled = true
const cacheExpire = 300000

const require = typeof createRequire !== 'undefined' ? createRequire(import.meta.url) : null
const puppeteer = require ? require('puppeteer') : (await import('puppeteer')).default

async function getTemplateContent(templatePath) {
  if (cacheEnabled && templateCache.has(templatePath)) {
    const cached = templateCache.get(templatePath)
    if (Date.now() - cached.timestamp < cacheExpire) {
      return cached.content
    }
    templateCache.delete(templatePath)
  }
  const content = await fs.readFile(templatePath, 'utf8')
  if (cacheEnabled) {
    templateCache.set(templatePath, { content, timestamp: Date.now() })
    if (templateCache.size > 100) {
      const now = Date.now()
      for (const [key, value] of templateCache.entries()) {
        if (now - value.timestamp > cacheExpire) templateCache.delete(key)
      }
    }
  }
  return content
}

async function getRenderSettings(type, customConfig = {}) {
  const baseConfig = getRenderConfig(type)
  const configOverrides = await getConfigItem(`render.${type}Config`, {})
  const userConfig = await getConfigItem('render', {})
  return mergeRenderConfig(baseConfig, { ...userConfig, ...configOverrides, ...customConfig })
}

export async function renderHtmlImage({ template, data, width, type = 'common', customConfig = {} }) {
  const templatePath = path.join(process.cwd(), 'plugins/Poke-plugin/resources/html', template)
  const htmlRaw = await getTemplateContent(templatePath)
  const htmlTemplate = Handlebars.compile(htmlRaw)
  const html = htmlTemplate(data)
  const renderConfig = await getRenderSettings(type, customConfig)
  const browser = await puppeteer.launch({ args: renderConfig.puppeteerArgs || ['--no-sandbox'] })
  try {
    const page = await browser.newPage()
    const viewport = { width: width || renderConfig.width || 600, height: 1, ...renderConfig.viewport }
    await page.setViewport(viewport)
    await page.setContent(html, { waitUntil: renderConfig.waitUntil || 'networkidle0' })
    const bodyHeight = await page.evaluate(() => {
      const container = document.querySelector('.rank-container') || document.querySelector('.mypoke-container') || document.body
      return Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, container ? container.scrollHeight + 64 : 0)
    })
    await page.setViewport({ ...viewport, height: bodyHeight })
    const screenshotOptions = { type: 'png', fullPage: renderConfig.screenshot?.fullPage || false }
    const image = await page.screenshot(screenshotOptions)
    return image
  } finally {
    await browser.close()
  }
}

export async function renderMyPokeImage({ pokeCount, bePokedCount, nickname, version, generateTime }) {
  const renderConfig = await getRenderSettings('mypoke')
  return renderHtmlImage({ template: 'my-poke.html', data: { pokeCount, bePokedCount, nickname, version, generateTime }, width: renderConfig.width, type: 'mypoke' })
}

export async function renderRankImage({ title, list, version, generateTime }) {
  const renderConfig = await getRenderSettings('rank')
  return renderHtmlImage({ template: 'poke-rank.html', data: { title, list, version, generateTime }, width: renderConfig.width, type: 'rank' })
}

export async function getPluginVersion() {
  try {
    const pkgPath = path.join(process.cwd(), 'plugins/Poke-plugin/package.json')
    const pkgRaw = await fs.readFile(pkgPath, 'utf8')
    const pkg = JSON.parse(pkgRaw)
    return pkg.version
  } catch (error) {
    console.warn('[Poke-plugin] 无法读取插件版本号:', error.message)
    return 'unknown'
  }
}

export function clearTemplateCache() {
  templateCache.clear()
}

export function getCacheStats() {
  return { size: templateCache.size, enabled: cacheEnabled, expireTime: cacheExpire }
} 