![Poke-plugin](https://socialify.git.ci/QingYingX-Bot/Poke-plugin/image?description=1&font=Inter&forks=1&issues=1&language=1&name=1&owner=1&pattern=Circuit+Board&pulls=1&stargazers=1&theme=Dark)

# 👆 戳戳榜插件（Poke-plugin）

**✨ Yunzai-Bot 戳一戳统计插件，支持多维度排行榜、个人统计、图片渲染等功能！**

> 插件 by QingYing & AI

---

## 📦 简介

Poke-plugin 是一个专为 Yunzai-Bot 设计的戳一戳统计插件，能够自动记录群内成员的戳一戳行为，并提供丰富的统计功能和美观的图片输出。

---

## 🌟 功能特点

- **多维度统计**：支持群内/全局、今日/总榜、戳别人/被戳等信息统计
- **美观输出**：支持文本和图片两种输出模式，图片渲染美观现代
- **可配置**：丰富的配置选项，支持自定义输出类型、榜单长度等
- **数据持久化**：基于 Redis 的高性能数据存储，支持数据过期清理
- **事件过滤**：支持按用户、群组等条件过滤事件

---

## 🚀 安装方法

### 1. 克隆仓库

#### Gitee（国内推荐）

```bash
git clone https://gitee.com/qingyingxbot/Poke-plugin.git ./plugins/Poke-plugin/
```

#### GitHub

```bash
git clone https://github.com/QingYingX-Bot/Poke-plugin.git ./plugins/Poke-plugin/
```

### 2. 安装依赖

```bash
pnpm install --filter=Poke-plugin
```

---

## 🎮 指令用法

### 榜单查询指令

| 指令 | 功能 | 示例 |
|------|------|------|
| `#戳戳榜` / `#poke榜` | 查看本群戳戳榜 | `#戳戳榜` / `#poke榜` |
| `#戳戳榜10` / `#poke榜10` | 查看本群戳戳榜（前10名） | `#戳戳榜10` / `#poke榜10` |
| `#今日戳戳榜` / `#今日poke榜` | 查看本群今日戳戳榜 | `#今日戳戳榜` / `#今日poke榜` |
| `#戳戳总榜` / `#poke总榜` | 查看全局戳戳总榜 | `#戳戳总榜` / `#poke总榜` |
| `#被戳戳榜` / `#被poke榜` | 查看本群被戳戳榜 | `#被戳戳榜` / `#被poke榜` |
| `#今日被戳戳榜` / `#今日被poke榜` | 查看本群今日被戳戳榜 | `#今日被戳戳榜` / `#今日被poke榜` |
| `#被戳戳总榜` / `#被poke总榜` | 查看全局被戳戳总榜 | `#被戳戳总榜` / `#被poke总榜` |

### 个人统计指令

| 指令 | 功能 | 示例 |
|------|------|------|
| `#查询戳戳` / `#查询poke` | 查询自己的戳戳统计 | `#查询戳戳` / `#查询poke` |
| `#查询戳戳 @用户` / `#查询poke @用户` | 查询指定用户的戳戳统计 | `#查询戳戳 @张三` / `#查询poke @张三` |
| `#查询戳戳 123456` / `#查询poke 123456` | 查询指定QQ号的戳戳统计 | `#查询戳戳 123456` / `#查询poke 123456` |

---

## ⚙️ 配置说明

### 配置文件位置
- 主配置：`config/config.yaml`
- 默认配置：`config/config_default.yaml`

### 配置项说明

```yaml
poke:
  # 榜单输出类型：text | image
  rankOutputType: image
  
  # 数据保留天数，0为永久保存
  expireDay: 0
  
  # 榜单长度限制
  defaultRankLimit: 15
  
  # 是否忽略自己戳自己
  ignoreSelfPoke: true

# 忽略名单配置（前端表单数据）
pokeIgnored_list: []

render:
  # 榜单图片宽度
  rankWidth: 600
  
  # 个人统计图片宽度
  myPokeWidth: 500
  
  # 是否启用模板缓存
  cacheEnabled: true
  
  # 缓存过期时间（毫秒）
  cacheExpire: 300000
```

### 事件过滤配置

插件会自动将 `pokeIgnored_list` 中的配置转换为过滤规则：

```yaml
poke:
  filter:
    # 是否忽略自己戳自己
    ignoreSelfPoke: true
    
    # 忽略的用户列表（自动从 pokeIgnored_list 生成）
    ignoredUsers: []
    
    # 忽略的群组列表（自动从 pokeIgnored_list 生成）
    ignoredGroups: []
```

---

## 📊 数据结构

### Redis 键值结构

```
# 群组戳戳统计
poke:group:{groupId}:user:{userId} -> {count: number, nickname: string}

# 群组被戳统计
poke:group:{groupId}:target:{targetId} -> {count: number, nickname: string}

# 全局戳戳统计
poke:global:user:{userId} -> {count: number, nickname: string}

# 全局被戳统计
poke:global:target:{targetId} -> {count: number, nickname: string}

# 日期统计
poke:group:{groupId}:date:{date}:user:{userId} -> {count: number}
poke:group:{groupId}:date:{date}:target:{targetId} -> {count: number}
```

---

## 📁 目录结构

```
Poke-plugin/
├── config/
│   ├── config.js
│   ├── config.yaml
│   ├── config_default.yaml
│   └── renderConfig.js
├── resources/
│   ├── html/
│   │   ├── my-poke.html
│   │   └── poke-rank.html
│   ├── picture/
│   └── render/
│       └── imageRender.js
├── src/
│   ├── pokeRankCommand.js
│   ├── inputValidator.js
│   ├── userUtils.js
│   ├── pokeStore.js
│   ├── rankService.js
│   └── pokeEvent.js
├── guoba.support.js
├── package.json
├── README.md
└── .gitignore
```

---

## 💬 问题反馈
如有任何问题，欢迎提交 [Issue](https://gitee.com/qingyingxbot/Poke-plugin/issues) | [GitHub Issues](https://github.com/QingYingX-Bot/Poke-plugin/issues) 反馈。

## 📄 许可证
本项目采用 **MIT 许可证**

---