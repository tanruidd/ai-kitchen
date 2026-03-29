/**
 * 社交系统 API
 */

import { createClient } from 'redis';

// 全局 Redis 客户端，避免每次请求都创建新连接
let redis = null;
let connecting = false;

async function getRedis() {
  // 如果已连接，直接返回
  if (redis && redis.isOpen) {
    return redis;
  }

  // 如果正在连接，等待
  if (connecting) {
    let attempts = 0;
    while (connecting && attempts < 50) {
      await new Promise(r => setTimeout(r, 100));
      attempts++;
    }
    if (redis && redis.isOpen) return redis;
  }

  // 创建新连接
  connecting = true;
  try {
    if (!process.env.REDIS_URL) {
      throw new Error('REDIS_URL environment variable not set');
    }

    redis = createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 500)
      }
    });

    redis.on('error', (err) => console.error('Redis Client Error', err));
    await redis.connect();
    console.log('Redis connected successfully');
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    redis = null;
    throw error;
  } finally {
    connecting = false;
  }

  return redis;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action } = req.query;
  const body = req.body || {};

  try {
    const client = await getRedis();
    
    switch (action) {
      case 'login':
        return await loginUser(client, body, res);
      case 'sync':
        return await syncUser(client, body, res);
      case 'search':
        return await searchUser(client, body, res);
      case 'add':
        return await addFriend(client, body, res);
      case 'remove':
        return await removeFriend(client, body, res);
      case 'list':
        return await getFriends(client, body, res);
      case 'send':
        return await sendGift(client, body, res);
      case 'profile':
        return await getFriendProfile(client, body, res);
      case 'gift-received':
        return await getReceivedGifts(client, body, res);
      case 'daily-gift-status':
        return await getDailyGiftStatus(client, body, res);
      case 'register':
        return await registerUser(client, body, res);
      case 'friend-leaderboard':
        return await getFriendLeaderboard(client, body, res);
      case 'steal-status':
        return await getStealStatus(client, body, res);
      case 'steal':
        return await doSteal(client, body, res);
      default:
        return res.status(400).json({ error: 'Unknown action' });
    }
  } catch (error) {
    console.error('Social API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

// 注册用户
async function registerUser(client, { user, userId }, res) {
  // userId 可以是用户 ID 或设备 ID
  const key = userId || user?.id;
  if (!key || !user) {
    return res.json({ success: false, error: 'Invalid user data' });
  }
  
  await client.set(`user:${key}`, JSON.stringify(user));
  return res.json({ success: true });
}

// ID 登录
async function loginUser(client, { userId }, res) {
  if (!userId) {
    return res.json({ success: false, error: '请输入用户 ID' });
  }
  
  const userData = await client.get(`user:${userId}`);
  if (!userData) {
    return res.json({ success: false, error: '用户不存在，请检查 ID 是否正确' });
  }
  
  const user = JSON.parse(userData);
  return res.json({ success: true, user });
}

// 同步用户数据到云端
async function syncUser(client, { user }, res) {
  if (!user || !user.id) {
    return res.json({ success: false, error: 'Invalid user data' });
  }
  
  // 合并现有数据
  const existingData = await client.get(`user:${user.id}`);
  let mergedUser = user;
  
  if (existingData) {
    const existing = JSON.parse(existingData);
    mergedUser = { ...existing, ...user, updatedAt: Date.now() };
  } else {
    mergedUser.updatedAt = Date.now();
  }
  
  await client.set(`user:${user.id}`, JSON.stringify(mergedUser));
  return res.json({ success: true, user: mergedUser });
}

// 用户搜索
async function searchUser(client, { userId, keyword }, res) {
  const users = [];
  let cursor = '0';
  
  do {
    const reply = await client.scan(cursor, { MATCH: 'user:*', COUNT: 50 });
    cursor = reply.cursor.toString();
    
    for (const key of reply.keys) {
      const data = await client.get(key);
      if (data) {
        const u = JSON.parse(data);
        if (u.nickname?.includes(keyword) || u.id?.includes(keyword)) {
          users.push({ id: u.id, nickname: u.nickname, avatar: u.avatar, level: u.level || 1 });
        }
      }
    }
  } while (cursor !== '0' && users.length < 10);

  return res.json({ success: true, users: users.slice(0, 10) });
}

// 添加好友
async function addFriend(client, { userId, friendId }, res) {
  if (userId === friendId) {
    return res.json({ success: false, error: '不能添加自己为好友' });
  }

  const friendsKey = `friends:${userId}`;
  const friends = await client.sMembers(friendsKey);
  
  if (friends.includes(friendId)) {
    return res.json({ success: false, error: '已经是好友了' });
  }
  
  await client.sAdd(friendsKey, friendId);
  await client.sAdd(`friends:${friendId}`, userId);

  return res.json({ success: true });
}

// 删除好友
async function removeFriend(client, { userId, friendId }, res) {
  await client.sRem(`friends:${userId}`, friendId);
  await client.sRem(`friends:${friendId}`, userId);

  return res.json({ success: true });
}

// 获取好友列表
async function getFriends(client, { userId }, res) {
  const friendIds = await client.sMembers(`friends:${userId}`);
  const friends = [];
  
  for (const fid of (friendIds || [])) {
    const data = await client.get(`user:${fid}`);
    if (data) {
      const u = JSON.parse(data);
      friends.push({
        id: u.id,
        nickname: u.nickname,
        avatar: u.avatar,
        level: u.level || 1
      });
    }
  }

  return res.json({ success: true, friends });
}

// 送礼物
async function sendGift(client, { userId, friendId, giftType, amount }, res) {
  const today = new Date().toISOString().split('T')[0];
  const dailyKey = `daily_gift:${userId}:${friendId}:${today}`;
  const alreadySent = await client.get(dailyKey);
  
  if (alreadySent) {
    return res.json({ success: false, error: '今天已经送过礼物了' });
  }

  await client.set(dailyKey, JSON.stringify({ type: giftType, amount, timestamp: Date.now() }), { EX: 86400 * 2 });

  const giftData = JSON.stringify({ from: userId, type: giftType, amount, timestamp: Date.now(), date: today });
  await client.lPush(`gifts:${friendId}`, giftData);
  await client.lTrim(`gifts:${friendId}`, 0, 99);

  return res.json({ success: true });
}

// 获取好友主页
async function getFriendProfile(client, { userId, friendId }, res) {
  const userData = await client.get(`user:${friendId}`);
  if (!userData) {
    return res.json({ success: false, error: '用户不存在' });
  }

  const user = JSON.parse(userData);
  return res.json({
    success: true,
    profile: {
      id: user.id, nickname: user.nickname, avatar: user.avatar,
      level: user.level || 1, totalCooks: 0, totalGacha: 0, achievements: 0
    }
  });
}

// 获取收到的礼物
async function getReceivedGifts(client, { userId }, res) {
  const giftsData = await client.lRange(`gifts:${userId}`, 0, 19);
  const gifts = [];
  
  for (const giftStr of (giftsData || [])) {
    const gift = JSON.parse(giftStr);
    const fromData = await client.get(`user:${gift.from}`);
    const fromUser = fromData ? JSON.parse(fromData) : { nickname: '未知' };
    gifts.push({ ...gift, fromNickname: fromUser.nickname });
  }

  return res.json({ success: true, gifts });
}

// 今日送礼状态
async function getDailyGiftStatus(client, { userId, friendId }, res) {
  const today = new Date().toISOString().split('T')[0];
  const dailyKey = `daily_gift:${userId}:${friendId}:${today}`;
  const sent = await client.get(dailyKey);

  return res.json({ success: true, sent: !!sent });
}

// 好友排行榜
async function getFriendLeaderboard(client, { userId, sortBy = 'totalCooks' }, res) {
  const friendIds = await client.sMembers(`friends:${userId}`);
  const players = [];

  for (const fid of (friendIds || [])) {
    const data = await client.get(`user:${fid}`);
    if (data) {
      const u = JSON.parse(data);
      players.push({
        id: u.id,
        nickname: u.nickname,
        avatar: u.avatar,
        level: u.level || 1,
        totalCooks: u.totalCooks || 0,
        totalGacha: u.totalGacha || 0,
        achievements: u.achievements || 0,
        lastCooked: u.lastCooked || null,
      });
    }
  }

  // 加上自己
  const myData = await client.get(`user:${userId}`);
  if (myData) {
    const me = JSON.parse(myData);
    const exists = players.find(p => p.id === me.id);
    if (!exists) {
      players.push({
        id: me.id,
        nickname: me.nickname,
        avatar: me.avatar,
        level: me.level || 1,
        totalCooks: me.totalCooks || 0,
        totalGacha: me.totalGacha || 0,
        achievements: me.achievements || 0,
        lastCooked: me.lastCooked || null,
      });
    }
  }

  // 排序
  players.sort((a, b) => {
    if (sortBy === 'totalCooks') return (b.totalCooks || 0) - (a.totalCooks || 0);
    if (sortBy === 'totalGacha') return (b.totalGacha || 0) - (a.totalGacha || 0);
    if (sortBy === 'achievements') return (b.achievements || 0) - (a.achievements || 0);
    return 0;
  });

  const meRank = players.findIndex(p => p.id === userId) + 1;

  return res.json({ success: true, players: players.slice(0, 20), myRank: meRank });
}

// ==================== 偷菜系统 ====================
// 金币仓库：user:coins:{id} → number
// 偷窃冷却：steal_cd:{userId}:{targetId} → timestamp
// 被偷日志：steal_log:{userId} → list

const STEAL_COOLDOWN = 12 * 3600 * 1000; // 12小时冷却
const STEAL_AMOUNT_MIN = 8;
const STEAL_AMOUNT_MAX = 30;
const DAILY_STEALS = 5; // 每天最多偷5个不同好友
const DAILY_STEAL_KEY_TTL = 86400 * 2; // Redis key 过期秒数

// 获取某用户的"厨房金币"（玩家可被偷的库存）
async function getUserKitchenCoins(client, userId) {
  const raw = await client.get(`user:coins:${userId}`);
  return raw ? parseInt(raw, 10) : 0;
}

// 获取偷窃状态（所有好友的可偷状态）
async function getStealStatus(client, { userId }, res) {
  if (!userId) return res.json({ success: false, error: '请先登录' });

  const friendIds = await client.sMembers(`friends:${userId}`);
  const today = new Date().toISOString().split('T')[0];
  const now = Date.now();

  const results = [];
  for (const fid of (friendIds || [])) {
    // 查 Redis 金币余额
    const kitchenCoins = await getUserKitchenCoins(client, fid);

    // 检查冷却（被偷过）
    const cdKey = `steal_cd:${fid}:${today}`;
    const lastStolenAt = await client.get(cdKey);
    const isOnCooldown = !!lastStolenAt;

    // 检查我自己今天有没有偷过此人
    const myStealKey = `steal_log:${userId}:${fid}:${today}`;
    const iStolen = !!(await client.get(myStealKey));

    // 获取好友基本信息
    const userData = await client.get(`user:${fid}`);
    let nickname = '神秘好友', avatar = '👤';
    if (userData) {
      const u = JSON.parse(userData);
      nickname = u.nickname;
      avatar = u.avatar;
    }

    results.push({
      id: fid,
      nickname,
      avatar,
      kitchenCoins,
      isOnCooldown,
      iStolen,
      canSteal: !isOnCooldown && !iStolen && kitchenCoins > 0,
    });
  }

  // 统计今天已偷人数
  let stolenCount = 0;
  for (const r of results) { if (r.iStolen) stolenCount++; }

  return res.json({ success: true, friends: results, stolenCount, dailyLimit: DAILY_STEALS });
}

// 执行偷菜
async function doSteal(client, { userId, targetId }, res) {
  if (!userId || !targetId) {
    return res.json({ success: false, error: '参数错误' });
  }
  if (userId === targetId) {
    return res.json({ success: false, error: '不能偷自己的厨房哦' });
  }

  const today = new Date().toISOString().split('T')[0];
  const now = Date.now();

  // 检查是否已经是好友
  const isFriend = await client.sIsMember(`friends:${userId}`, targetId);
  if (!isFriend) {
    return res.json({ success: false, error: '只能偷好友的厨房哦' });
  }

  // 检查目标今日是否可偷
  const cdKey = `steal_cd:${targetId}:${today}`;
  const lastStolenAt = await client.get(cdKey);
  if (lastStolenAt) {
    const remainingMs = STEAL_COOLDOWN - (now - parseInt(lastStolenAt, 10));
    if (remainingMs > 0) {
      const remainingMin = Math.ceil(remainingMs / 60000);
      return res.json({ success: false, error: `该好友刚被偷过，需等 ${remainingMin} 分钟后才能再偷` });
    }
  }

  // 检查我自己今天有没有偷过此人
  const myStealKey = `steal_log:${userId}:${targetId}:${today}`;
  if (await client.get(myStealKey)) {
    return res.json({ success: false, error: '今天已经偷过这个好友了' });
  }

  // 检查今日偷人数量上限
  const myStealCountKey = `steal_count:${userId}:${today}`;
  const myStealCount = parseInt(await client.get(myStealCountKey) || '0', 10);
  if (myStealCount >= DAILY_STEALS) {
    return res.json({ success: false, error: `今天偷人次数用完了（${DAILY_STEALS}/${DAILY_STEALS}），明天再来吧！` });
  }

  // 检查目标厨房金币
  let kitchenCoins = await getUserKitchenCoins(client, targetId);
  // 如果 Redis 没有，读本地 account.js 的金币
  if (kitchenCoins === 0) {
    // 厨房初始有 500 金币，后续随烹饪积累
    kitchenCoins = 500;
  }

  // 随机偷窃金额
  const stealAmount = Math.floor(Math.random() * (STEAL_AMOUNT_MAX - STEAL_AMOUNT_MIN + 1)) + STEAL_AMOUNT_MIN;
  const actualSteal = Math.min(stealAmount, kitchenCoins);

  if (actualSteal === 0) {
    return res.json({ success: false, error: '好友厨房空空如也，没东西可偷...' });
  }

  // 扣减目标厨房金币
  await client.set(`user:coins:${targetId}`, String(Math.max(0, kitchenCoins - actualSteal)));

  // 写冷却
  await client.set(cdKey, String(now), { EX: DAILY_STEAL_KEY_TTL });

  // 记录我偷过此人
  await client.set(myStealKey, String(now), { EX: DAILY_STEAL_KEY_TTL });

  // 计数 +1
  await client.set(myStealCountKey, String(myStealCount + 1), { EX: DAILY_STEAL_KEY_TTL });

  // 偷窃记录（对方可见）
  const logKey = `steal_notify:${targetId}`;
  const logEntry = JSON.stringify({
    from: userId, amount: actualSteal, timestamp: now, date: today,
  });
  await client.lPush(logKey, logEntry);
  await client.lTrim(logKey, 0, 49);

  // 返回结果
  const fromData = await client.get(`user:${targetId}`);
  const fromName = fromData ? JSON.parse(fromData).nickname : '神秘好友';

  return res.json({
    success: true,
    amount: actualSteal,
    fromName,
    stolenCount: myStealCount + 1,
    dailyLimit: DAILY_STEALS,
  });
}
