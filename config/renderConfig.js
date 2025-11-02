// 渲染配置文件，定义不同场景的图片渲染参数

export const RANK_RENDER_CONFIG = {
  width: 600,
  height: 800,
  backgroundColor: '#fff',
  fontFamily: 'Microsoft YaHei, sans-serif',
  titleFontSize: 24,
  contentFontSize: 16,
  lineHeight: 1.5,
  padding: 20,
  borderRadius: 8,
  shadow: '0 2px 8px rgba(0,0,0,0.1)'
}

export const MYPOKE_RENDER_CONFIG = {
  width: 500,
  height: 400,
  backgroundColor: '#fff',
  fontFamily: 'Microsoft YaHei, sans-serif',
  titleFontSize: 20,
  contentFontSize: 16,
  lineHeight: 1.5,
  padding: 20,
  borderRadius: 8,
  shadow: '0 2px 8px rgba(0,0,0,0.1)'
}

export const COMMON_RENDER_CONFIG = {
  puppeteerArgs: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--disable-gpu'
  ],
  viewport: {
    deviceScaleFactor: 2,
    hasTouch: false,
    isLandscape: false,
    isMobile: false
  },
  waitUntil: 'networkidle0',
  screenshot: {
    type: 'png',
    fullPage: false
  },
  cache: {
    enabled: true,
    expireTime: 300000,
    maxSize: 100
  }
}

export const COLOR_THEME = {
  primary: '#4a90e2',
  secondary: '#f5f5f5',
  success: '#52c41a',
  warning: '#faad14',
  error: '#f5222d',
  text: {
    primary: '#262626',
    secondary: '#8c8c8c',
    disabled: '#bfbfbf'
  },
  background: {
    primary: '#fff',
    secondary: '#fafafa',
    card: '#fff'
  }
}

export const FONT_CONFIG = {
  family: {
    primary: 'Microsoft YaHei, PingFang SC, Hiragino Sans GB, sans-serif',
    mono: 'Consolas, Monaco, Courier New, monospace'
  },
  size: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30
  },
  weight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700
  }
}

export function getRenderConfig(type) {
  switch (type) {
    case 'rank': return RANK_RENDER_CONFIG
    case 'mypoke': return MYPOKE_RENDER_CONFIG
    case 'common':
    default: return COMMON_RENDER_CONFIG
  }
}

export function mergeRenderConfig(baseConfig, customConfig) {
  if (!customConfig) return baseConfig
  const merged = { ...baseConfig }
  for (const key in customConfig) {
    if (customConfig.hasOwnProperty(key)) {
      if (typeof customConfig[key] === 'object' && customConfig[key] !== null && typeof merged[key] === 'object' && merged[key] !== null) {
        merged[key] = mergeRenderConfig(merged[key], customConfig[key])
      } else {
        merged[key] = customConfig[key]
      }
    }
  }
  return merged
} 