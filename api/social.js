/**
 * 社交系统 API
 */

import { Redis } from '@upstash/redis';

// Upstash Redis - 从环境变量自动读取 UPSTASH_REDIS_REST_URL 和 UPSTASH_REDIS_REST_TOKEN
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
});

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
      case 'register':
        return await registerUser(body, res);
      default:
        return res.status(400).json({ error: 'Unknown action' });
    }
  } catch (error) {
    console.error('Social API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// 注册用户
async function registerUser({ user }, res) {
  if (!redis) {
    return res.json({ success: false, error: 'Redis not connected' });
  }
  
  if (!user || !user.id) {
    return res.json({ success: false, error: 'Invalid user data' });
  }
  
  await redis.set(`user:${user.id}`, JSON.stringify(user));
  return res.json({ success: true });
}

// 用户搜索
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

  const users = [];
  let cursor = '0';
  do {
    const [newCursor, keys] = await redis.scan(cursor, 'MATCH', 'user:*', 'COUNT', 50);
    cursor = newCursor;
    
    for (const key of keys) {
      const data = await redis.get(key);
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
async function addFriend({ userId, friendId }, res) {
  if (!redis) {
    return res.json({ success: false, error: 'Redis not connected' });
  }

  if (userId === friendId) {
    return res.json({ success: false, error: '不能添加自己为好友' });
  }

  const friendsKey = `friends:${userId}`;
  let friends = await redis.smembers(friendsKey);
  friends = friends || [];
  
  if (friends.includes(friendId)) {
    return res.json({ success: false, error: '已经是好友了' });
  }
  
  await redis.sadd(friendsKey, friendId);
  await redis.sadd(`friends:${friendId}`, userId);

  return res.json({ success: true });
}

// 删除好友
async function removeFriend({ userId, friendId }, res) {
  if (!redis) {
    return res.json({ success: false, error: 'Redis not connected' });
  }

  await redis.srem(`friends:${userId}`, friendId);
  await redis.srem(`friends:${friendId}`, userId);

  return res.json({ success: true });
}

// 获取好友列表
async function getFriends({ userId }, res) {
  if (!redis) {
    return res.json({
      success: true,
      friends: [
        { id: 'chef_test001', nickname: '海绵宝宝', avatar: '🧽', level: 5 },
      ]
    });
  }

  const friendIds = await redis.smembers(`friends:${userId}`);
  const friends = [];
  
  for (const fid of (friendIds || [])) {
    const data = await redis.get(`user:${fid}`);
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
async function sendGift({ userId, friendId, giftType, amount }, res) {
  if (!redis) {
    return res.json({ success: false, error: 'Redis not connected' });
  }

  const today = new Date().toISOString().split('T')[0];
  const dailyKey = `daily_gift:${userId}:${friendId}:${today}`;
  const alreadySent = await redis.get(dailyKey);
  
  if (alreadySent) {
    return res.json({ success: false, error: '今天已经送过礼物了' });
  }

  await redis.set(dailyKey, JSON.stringify({ type: giftType, amount, timestamp: Date.now() }));
  await redis.expire(dailyKey, 86400 * 2);

  const giftData = JSON.stringify({ from: userId, type: giftType, amount, timestamp: Date.now(), date: today });
  await redis.lpush(`gifts:${friendId}`, giftData);
  await redis.ltrim(`gifts:${friendId}`, 0, 99);

  return res.json({ success: true });
}

// 获取好友主页
async function getFriendProfile({ userId, friendId }, res) {
  if (!redis) {
    return res.json({
      success: true,
      profile: {
        id: 'chef_test001', nickname: '海绵宝宝', avatar: '🧽',
        level: 5, totalCooks: 128, totalGacha: 50, achievements: 12
      }
    });
  }

  const userData = await redis.get(`user:${friendId}`);
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
async function getReceivedGifts({ userId }, res) {
  if (!redis) {
    return res.json({ success: true, gifts: [] });
  }

  const giftsData = await redis.lrange(`gifts:${userId}`, 0, 19);
  const gifts = [];
  
  for (const giftStr of (giftsData || [])) {
    const gift = JSON.parse(giftStr);
    const fromData = await redis.get(`user:${gift.from}`);
    const fromUser = fromData ? JSON.parse(fromData) : { nickname: '未知' };
    gifts.push({ ...gift, fromNickname: fromUser.nickname });
  }

  return res.json({ success: true, gifts });
}

// 今日送礼状态
async function getDailyGiftStatus({ userId, friendId }, res) {
  if (!redis) {
    return res.json({ success: true, sent: false });
  }

  const today = new Date().toISOString().split('T')[0];
  const dailyKey = `daily_gift:${userId}:${friendId}:${today}`;
  const sent = await redis.get(dailyKey);

  return res.json({ success: true, sent: !!sent });
}
