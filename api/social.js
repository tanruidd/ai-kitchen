/**
 * 社交系统 API
 */

import { createClient } from 'redis';

// 全局 Redis 客户端，避免每次请求都创建新连接
let redis = null;

async function getRedis() {
  if (!redis) {
    redis = createClient({
      url: process.env.REDIS_URL
    });
    redis.on('error', (err) => console.error('Redis Client Error', err));
    await redis.connect();
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
      default:
        return res.status(400).json({ error: 'Unknown action' });
    }
  } catch (error) {
    console.error('Social API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// 注册用户
async function registerUser(client, { user }, res) {
  if (!user || !user.id) {
    return res.json({ success: false, error: 'Invalid user data' });
  }
  
  await client.set(`user:${user.id}`, JSON.stringify(user));
  return res.json({ success: true });
}

// 用户搜索
async function searchUser(client, { userId, keyword }, res) {
  const users = [];
  let cursor = 0;
  
  do {
    const reply = await client.scan(cursor, { MATCH: 'user:*', COUNT: 50 });
    cursor = reply.cursor;
    
    for (const key of reply.keys) {
      const data = await client.get(key);
      if (data) {
        const u = JSON.parse(data);
        if (u.nickname?.includes(keyword) || u.id?.includes(keyword)) {
          users.push({ id: u.id, nickname: u.nickname, avatar: u.avatar, level: u.level || 1 });
        }
      }
    }
  } while (cursor !== 0 && users.length < 10);

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
