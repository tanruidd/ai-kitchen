/**
 * 社交系统 API
 * 
 * 功能：
 * - 好友搜索
 * - 添加/删除好友
 * - 好友列表
 * - 互送礼物（金币/盲盒券）
 * - 访问好友主页数据
 */

import Redis from 'ioredis';

const redis = process.env.KV_REST_API_URL?.startsWith('redis://')
  ? new Redis(process.env.KV_REST_API_URL)
  : null;

export default async function handler(req, res) {
  // 设置 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action } = req.query;
  const body = req.body || {};

  try {
    switch (action) {
      case 'search':
        return await searchUser(body, res);
      case 'add':
        return await addFriend(body, res);
      case 'remove':
        return await removeFriend(body, res);
      case 'list':
        return await getFriends(body, res);
      case 'send':
        return await sendGift(body, res);
      case 'profile':
        return await getFriendProfile(body, res);
      case 'gift-received':
        return await getReceivedGifts(body, res);
      case 'daily-gift-status':
        return await getDailyGiftStatus(body, res);
      default:
        return res.status(400).json({ error: 'Unknown action' });
    }
  } catch (error) {
    console.error('Social API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ============== 用户搜索 ==============
async function searchUser({ userId, keyword }, res) {
  if (!redis) {
    return res.json({
      success: true,
      users: [
        { id: 'chef_test001', nickname: '海绵宝宝', avatar: '🧽' },
        { id: 'chef_test002', nickname: '派大星', avatar: '⭐' },
      ]
    });
  }

  // 搜索用户
  const users = [];
  for await (const key of redis.scanStream({ match: `user:*${keyword}*`, count: 10 })) {
    const user = await redis.get(key);
    if (user) {
      const u = JSON.parse(user);
      users.push({ id: u.id, nickname: u.nickname, avatar: u.avatar, level: u.level || 1 });
    }
  }

  return res.json({ success: true, users: users.slice(0, 10) });
}

// ============== 添加好友 ==============
async function addFriend({ userId, friendId }, res) {
  if (!redis) {
    return res.json({ success: true, message: 'Redis not configured' });
  }

  if (userId === friendId) {
    return res.json({ success: false, error: '不能添加自己为好友' });
  }

  // 获取当前用户的好友列表
  const friendsKey = `friends:${userId}`;
  let friends = await redis.smembers(friendsKey) || [];
  
  if (friends.includes(friendId)) {
    return res.json({ success: false, error: '已经是好友了' });
  }
  
  await redis.sadd(friendsKey, friendId);

  // 同时添加到对方的好友列表
  const friendKey = `friends:${friendId}`;
  await redis.sadd(friendKey, userId);

  return res.json({ success: true });
}

// ============== 删除好友 ==============
async function removeFriend({ userId, friendId }, res) {
  if (!redis) {
    return res.json({ success: true, message: 'Redis not configured' });
  }

  await redis.srem(`friends:${userId}`, friendId);
  await redis.srem(`friends:${friendId}`, userId);

  return res.json({ success: true });
}

// ============== 获取好友列表 ==============
async function getFriends({ userId }, res) {
  if (!redis) {
    return res.json({
      success: true,
      friends: [
        { id: 'chef_test001', nickname: '海绵宝宝', avatar: '🧽', level: 5 },
        { id: 'chef_test002', nickname: '派大星', avatar: '⭐', level: 3 },
      ]
    });
  }

  const friendIds = await redis.smembers(`friends:${userId}`) || [];
  
  const friends = [];
  for (const fid of friendIds) {
    const userData = await redis.get(`user:${fid}`);
    if (userData) {
      const u = JSON.parse(userData);
      friends.push({
        id: u.id,
        nickname: u.nickname,
        avatar: u.avatar,
        level: u.level || 1,
        lastActive: u.lastActive || Date.now()
      });
    }
  }

  return res.json({ success: true, friends });
}

// ============== 送礼物 ==============
async function sendGift({ userId, friendId, giftType, amount }, res) {
  if (!redis) {
    return res.json({ success: true, message: 'Redis not configured' });
  }

  const today = new Date().toISOString().split('T')[0];
  const dailyKey = `daily_gift:${userId}:${friendId}:${today}`;
  const alreadySent = await redis.get(dailyKey);
  
  if (alreadySent) {
    return res.json({ success: false, error: '今天已经送过礼物了' });
  }

  // 记录送礼
  await redis.set(dailyKey, JSON.stringify({ type: giftType, amount, timestamp: Date.now() }));
  await redis.expire(dailyKey, 86400 * 2); // 2天过期

  // 添加到对方收礼列表
  const receiveKey = `gifts:${friendId}`;
  const giftData = JSON.stringify({
    from: userId,
    type: giftType,
    amount,
    timestamp: Date.now(),
    date: today
  });
  await redis.lpush(receiveKey, giftData);
  await redis.ltrim(receiveKey, 0, 99); // 只保留最近100条

  return res.json({ success: true });
}

// ============== 获取好友主页数据 ==============
async function getFriendProfile({ userId, friendId }, res) {
  if (!redis) {
    return res.json({
      success: true,
      profile: {
        id: 'chef_test001',
        nickname: '海绵宝宝',
        avatar: '🧽',
        level: 5,
        totalCooks: 128,
        totalGacha: 50,
        achievements: 12,
        favoriteDish: '蟹黄堡',
        createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000
      }
    });
  }

  const userData = await redis.get(`user:${friendId}`);
  if (!userData) {
    return res.json({ success: false, error: '用户不存在' });
  }

  const user = JSON.parse(userData);
  const statsData = await redis.get(`stats:${friendId}`);
  const stats = statsData ? JSON.parse(statsData) : {};

  return res.json({
    success: true,
    profile: {
      id: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      level: user.level || 1,
      totalCooks: stats.totalCooks || 0,
      totalGacha: stats.totalGacha || 0,
      achievements: user.achievements?.length || 0,
      favoriteDish: user.favoriteDish || '未知',
      createdAt: user.createdAt
    }
  });
}

// ============== 获取收到的礼物 ==============
async function getReceivedGifts({ userId }, res) {
  if (!redis) {
    return res.json({
      success: true,
      gifts: [
        { from: 'chef_test001', fromNickname: '海绵宝宝', type: 'coins', amount: 100, timestamp: Date.now() - 3600000 }
      ]
    });
  }

  const giftsData = await redis.lrange(`gifts:${userId}`, 0, 19);
  
  const gifts = [];
  for (const giftStr of giftsData) {
    const gift = JSON.parse(giftStr);
    const fromUserData = await redis.get(`user:${gift.from}`);
    const fromUser = fromUserData ? JSON.parse(fromUserData) : { nickname: '未知用户' };
    gifts.push({
      ...gift,
      fromNickname: fromUser.nickname
    });
  }

  return res.json({ success: true, gifts });
}

// ============== 获取今日送礼状态 ==============
async function getDailyGiftStatus({ userId, friendId }, res) {
  if (!redis) {
    return res.json({ success: true, sent: false });
  }

  const today = new Date().toISOString().split('T')[0];
  const dailyKey = `daily_gift:${userId}:${friendId}:${today}`;
  const sent = await redis.get(dailyKey);

  return res.json({ success: true, sent: !!sent });
}
