# 好友系统 - Vercel KV 配置指南

## 当前状态

好友系统 API 已创建：`/api/social.js`

**现在处于 Mock 模式**（演示数据），需要配置 Vercel KV 才能真正使用。

---

## 配置 Vercel KV（免费）

### 1. 安装 Vercel CLI
```bash
npm i -g vercel
```

### 2. 登录 Vercel
```bash
vercel login
```

### 3. 创建 KV 数据库
```bash
vercel kv create ai-kitchen-db
```

### 4. 添加环境变量
在 Vercel 项目设置中添加：
- `KV_REST_API_URL` — KV 创建后显示的 URL
- `KV_REST_API_TOKEN` — KV 创建后显示的 Token

或在 `.env.local` 添加（本地开发用）：
```
KV_REST_API_URL=your_kv_url
KV_REST_API_TOKEN=your_kv_token
```

### 5. 部署
```bash
vercel --prod
```

---

## 好友系统功能

| 功能 | 状态 | 说明 |
|------|------|------|
| 好友码展示 | ✅ | 账号页面显示，一键复制 |
| 搜索添加 | ✅ | 输入好友码搜索 |
| 好友列表 | ✅ | 查看已添加的好友 |
| 互送礼物 | ✅ | 每日送金币/盲盒券 |
| 好友主页 | ✅ | 查看好友数据 |
| 删除好友 | ✅ | 移除好友关系 |

---

## API 端点

```
POST /api/social?action=search      # 搜索用户
POST /api/social?action=add        # 添加好友
POST /api/social?action=remove     # 删除好友
POST /api/social?action=list        # 好友列表
POST /api/social?action=send        # 送礼物
POST /api/social?action=profile     # 好友主页
POST /api/social?action=gift-received  # 收礼记录
POST /api/social?action=daily-gift-status  # 今日送礼状态
```

---

## 下一步

1. **配置 Vercel KV**（5分钟）
2. **测试好友功能**
3. **添加好友排行榜**
