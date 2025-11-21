import path from 'path'
import { getConfig, setConfig } from './config/config.js'

export function supportGuoba() {
  return {
    pluginInfo: {
      name: 'poke-plugin',
      title: '戳戳榜',
      description: '统计群成员戳一戳行为，支持排行榜',
      author: '@QingYingX',
      authorLink: 'https://gitee.com/QingYingX',
      link: 'https://gitee.com/qingyingxbot/Poke-plugin',
      isV3: true,
      isV2: false,
      showInMenu: 'auto',
      icon: 'mdi:hand-pointing-up',
      iconColor: '#d19f56',
      iconPath: path.join(process.cwd(), 'plugins/Poke-plugin/resources/picture/icon.png')
    },
    configInfo: {
      schemas: [
        // ===== 基础配置 =====
        {
          label: '基础配置',
          component: 'SOFT_GROUP_BEGIN'
        },
        {
          field: 'poke.rankOutputType',
          label: '榜单输出类型',
          bottomHelpMessage: 'image为图片，text为文本',
          component: 'Select',
          required: true,
          componentProps: {
            options: [
              { label: '图片', value: 'image' },
              { label: '文本', value: 'text' }
            ]
          }
        },
        {
          field: 'poke.expireDay',
          label: '数据保留天数',
          bottomHelpMessage: '0为永久保存，建议永久',
          component: 'InputNumber',
          required: true,
          componentProps: {
            min: 0,
            max: 3650,
            placeholder: '0为永久'
          }
        },
        // ===== 榜单配置 =====
        {
          label: '榜单配置',
          component: 'SOFT_GROUP_BEGIN'
        },
        {
          field: 'poke.defaultRankLimit',
          label: '默认榜单长度',
          bottomHelpMessage: '默认显示的榜单人数',
          component: 'InputNumber',
          required: true,
          componentProps: {
            min: 1,
            max: 50,
            placeholder: '10'
          }
        },
        // ===== 事件过滤配置 =====
        {
          label: '事件过滤配置',
          component: 'SOFT_GROUP_BEGIN'
        },
        {
          field: 'poke.filter.ignoreSelfPoke',
          label: '忽略自己戳自己',
          bottomHelpMessage: '是否忽略用户戳自己的事件',
          component: 'Switch',
          componentProps: {
            checkedChildren: '是',
            unCheckedChildren: '否'
          }
        },
        {
          field: 'pokeIgnored_list',
          label: '忽略名单',
          bottomHelpMessage: '可添加多个，类型为用户或群组，输入QQ号或群号',
          component: 'GSubForm',
          componentProps: {
            multiple: true,
            schemas: [
              {
                field: 'type',
                label: '类型',
                component: 'Select',
                required: true,
                componentProps: {
                  options: [
                    { label: '用户', value: 'user' },
                    { label: '群组', value: 'group' }
                  ],
                  style: { width: '100px' }
                }
              },
              {
                field: 'id',
                label: '号码',
                component: 'Input',
                required: true,
                componentProps: {
                  placeholder: '请输入QQ号或群号',
                  style: { width: '180px' }
                }
              }
            ]
          },
          defaultValue: []
        },
        // ===== 渲染配置 =====
        {
          label: '渲染配置',
          component: 'SOFT_GROUP_BEGIN'
        },
        {
          field: 'render.rankWidth',
          label: '榜单图片宽度',
          bottomHelpMessage: '榜单图片的宽度（像素）',
          component: 'InputNumber',
          componentProps: {
            min: 100,
            max: 1200,
            placeholder: '600'
          }
        },
        {
          field: 'render.myPokeWidth',
          label: '个人统计图片宽度',
          bottomHelpMessage: '个人统计图片的宽度（像素）',
          component: 'InputNumber',
          componentProps: {
            min: 100,
            max: 1200,
            placeholder: '500'
          }
        },
        {
          field: 'render.cacheEnabled',
          label: '启用模板缓存',
          bottomHelpMessage: '是否启用HTML模板缓存以提高性能',
          component: 'Switch',
          componentProps: {
            checkedChildren: '启用',
            unCheckedChildren: '禁用'
          }
        },
        {
          field: 'render.cacheExpire',
          label: '缓存过期时间',
          bottomHelpMessage: '模板缓存过期时间（毫秒）',
          component: 'InputNumber',
          componentProps: {
            min: 0,
            max: 3600000,
            placeholder: '300000'
          }
        }
      ],
      async getConfigData() {
        const config = await getConfig()
        const pokeIgnoredList = Array.isArray(config.pokeIgnored_list) ? config.pokeIgnored_list : []
        const ignoredUsers = pokeIgnoredList.filter(item => item.type === 'user').map(item => String(item.id))
        const ignoredGroups = pokeIgnoredList.filter(item => item.type === 'group').map(item => String(item.id))
        const filter = { ...(config.poke?.filter || {}) }
        if (ignoredUsers.length > 0) filter.ignoredUsers = ignoredUsers
        if (ignoredGroups.length > 0) filter.ignoredGroups = ignoredGroups
        return {
          ...config,
          pokeIgnored_list: pokeIgnoredList,
          poke: {
            ...config.poke,
            filter
          }
        }
      },
      async setConfigData(data, { Result }) {
        const config = await getConfig()
        if (config.poke && config.poke.filter) {
          delete config.poke.filter
        }
        const merged = { ...config, pokeIgnored_list: Array.isArray(data.pokeIgnored_list) ? data.pokeIgnored_list : [] }
        const ok = await setConfig(merged)
        return ok ? Result.ok({}, '保存成功~') : Result.error('保存失败')
      }
    }
  }
} 