// 输入验证器，提供统一的参数校验服务

export function validateUserId(userId) {
  if (!userId) return { valid: false, error: '用户ID不能为空' }
  const userIdStr = String(userId)
  if (!/^\d{5,11}$/.test(userIdStr)) return { valid: false, error: '用户ID格式不正确，应为5-11位数字' }
  return { valid: true }
}

export function validateGroupId(groupId) {
  if (!groupId) return { valid: false, error: '群ID不能为空' }
  const groupIdStr = String(groupId)
  if (!/^\d{5,11}$/.test(groupIdStr)) return { valid: false, error: '群ID格式不正确，应为5-11位数字' }
  return { valid: true }
}

export function validateLimit(limit, min = 1, max = 30, defaultVal = 10) {
  if (!limit) return { valid: true, value: defaultVal }
  const num = parseInt(limit)
  if (isNaN(num)) return { valid: false, error: '限制值必须是数字' }
  if (num < min) return { valid: false, error: `限制值不能小于 ${min}` }
  if (num > max) return { valid: false, error: `限制值不能大于 ${max}` }
  return { valid: true, value: num }
}

export function validateDate(dateStr, format = 'YYYY-MM-DD') {
  if (!dateStr) return { valid: false, error: '日期不能为空' }
  if (format === 'YYYY-MM-DD') {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(dateStr)) return { valid: false, error: '日期格式不正确，应为 YYYY-MM-DD' }
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return { valid: false, error: '日期无效' }
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    if (date > today) return { valid: false, error: '日期不能是未来日期' }
  }
  return { valid: true }
}

export function validateOutputType(outputType, allowedTypes = ['text', 'image']) {
  if (!outputType) return { valid: false, error: '输出类型不能为空' }
  if (!allowedTypes.includes(outputType)) return { valid: false, error: `输出类型必须是以下之一: ${allowedTypes.join(', ')}` }
  return { valid: true }
}

export function validateEvent(e) {
  if (!e) return { valid: false, error: '事件对象不能为空' }
  if (typeof e !== 'object') return { valid: false, error: '事件对象必须是对象类型' }
  const requiredFields = ['user_id', 'group_id']
  for (const field of requiredFields) {
    if (!e[field]) return { valid: false, error: `事件对象缺少必要字段: ${field}` }
  }
  return { valid: true }
}

export function validateConfig(config, schema = {}) {
  if (!config) return { valid: false, errors: ['配置对象不能为空'] }
  if (typeof config !== 'object') return { valid: false, errors: ['配置对象必须是对象类型'] }
  const errors = []
  for (const [key, rules] of Object.entries(schema)) {
    const value = config[key]
    if (rules.required && (value === undefined || value === null)) {
      errors.push(`配置项 ${key} 是必需的`)
      continue
    }
    if (rules.type && value !== undefined && value !== null) {
      if (typeof value !== rules.type) errors.push(`配置项 ${key} 必须是 ${rules.type} 类型`)
    }
    if (rules.enum && value !== undefined && value !== null) {
      if (!rules.enum.includes(value)) errors.push(`配置项 ${key} 必须是以下值之一: ${rules.enum.join(', ')}`)
    }
    if (rules.min !== undefined && value !== undefined && value !== null) {
      if (typeof value === 'number' && value < rules.min) errors.push(`配置项 ${key} 不能小于 ${rules.min}`)
    }
    if (rules.max !== undefined && value !== undefined && value !== null) {
      if (typeof value === 'number' && value > rules.max) errors.push(`配置项 ${key} 不能大于 ${rules.max}`)
    }
  }
  return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined }
}

export function validateNickname(nickname) {
  if (!nickname) return { valid: false, error: '昵称不能为空' }
  const nicknameStr = String(nickname)
  if (nicknameStr.length < 1) return { valid: false, error: '昵称不能为空' }
  if (nicknameStr.length > 20) return { valid: false, error: '昵称长度不能超过20个字符' }
  const specialCharRegex = /[<>:"/\\|?*]/
  if (specialCharRegex.test(nicknameStr)) return { valid: false, error: '昵称不能包含特殊字符: < > : " / \\ | ? *' }
  return { valid: true }
}

export function validateBatch(params, rules) {
  const errors = []
  for (const [paramName, rule] of Object.entries(rules)) {
    const value = params[paramName]
    const validator = rule.validator
    const validatorParams = rule.params || []
    if (typeof validator === 'function') {
      const result = validator(value, ...validatorParams)
      if (!result.valid) errors.push(`${paramName}: ${result.error}`)
    }
  }
  return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined }
} 