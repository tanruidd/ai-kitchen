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
        return await searchUser(body);
      case 'add':
        return await addFriend(body);
      case 'remove':
        return await removeFriend(body);
      case 'list':
        return await getFriends(body);
      case 'send':
        return await sendGift(body);
      case 'profile':
        return await getFriendProfile(body);
      case 'gift-received':
        return await getReceivedGifts(body);
      case 'daily-gift-status':
        return await getDailyGiftStatus(body);
      default:
        return res.status(400).json({ error: 'Unknown action' });
    }
  } catch (error) {
    console.error('Social API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ============== Vercel KV 客户端 ==============
// 注意：需要先安装 @vercel/kv 并配置 KV_REST_API_URL 和 KV_REST_API_TOKEN

let kv = null;

async function getKV() {
  if (kv) return kv;
  
  try {
    const { kv: kvClient } = await import('@vercel/kv');
    kv = kvClient;
    return kv;
  } catch (e) {
    console.warn('Vercel KV not configured, using mock mode');
    return null;
  }
}

// ============== 用户搜索 ==============
async function searchUser({ userId, keyword }) {
  const kvClient = await getKV();
  
  if (!kvClient) {
    // Mock 模式
    return res.json({
      success: true,
      users: [
        { id: 'chef_test001', nickname: '海绵宝宝', avatar: '🧽' },
        { id: 'chef_test002', nickname: '派大星', avatar: '⭐' },
      ]
    });
  }

  // 搜索用户（通过昵称或 ID）
  const pattern = `user:*${keyword}*`;
  const users = await kvClient.keys(pattern);
  
  const results = await Promise.all(
    users.slice(0, 10).map(async (key) => {
      const user = await kvClient.get(key);
      return {
        id: user.id,
        nickname: user.nickname,
        avatar: user.avatar,
        level: user.level || 1
      };
    })
  );

  return res.json({ success: true, users: results });
}

// ============== 添加好友 ==============
async function addFriend({ userId, friendId }) {
  const kvClient = await getKV();
  
  if (!kvClient) {
    return res.json({ success: true, message: 'Mock: Friend added' });
  }

  // 获取当前用户的好友列表
  const friendsKey = `friends:${userId}`;
  let friends = await kvClient.get(friendsKey) || [];
  
  if (friends.includes(friendId)) {
    return res.json({ success: false, error: 'Already friends' });
  }
  
  friends.push(friendId);
  await kvClient.set(friendsKey, friends);

  // 同时添加到对方的好友列表
  const friendKey = `friends:${friendId}`;
  let friendList = await kvClient.get(friendKey) || [];
  if (!friendList.includes(userId)) {
    friendList.push(userId);
    await kvClient.set(friendKey, friendList);
  }

  return res.json({ success: true });
}

// ============== 删除好友 ==============
async function removeFriend({ userId, friendId }) {
  const kvClient = await getKV();
  
  if (!kvClient) {
    return res.json({ success: true, message: 'Mock: Friend removed' });
  }

  // 从当前用户好友列表中删除
  const friendsKey = `friends:${userId}`;
  let friends = await kvClient.get(friendsKey) || [];
  friends = friends.filter(id => id !== friendId);
  await kvClient.set(friendsKey, friends);

  // 从对方好友列表中删除
  const friendKey = `friends:${friendId}`;
  let friendList = await kvClient.get(friendKey) || [];
  friendList = friendList.filter(id => id !== userId);
  await kvClient.set(friendKey, friendList);

  return res.json({ success: true });
}

// ============== 获取好友列表 ==============
async function getFriends({ userId }) {
  const kvClient = await getKV();
  
  if (!kvClient) {
    return res.json({
      success: true,
      friends: [
        { id: 'chef_test001', nickname: '海绵宝宝', avatar: '🧽', level: 5 },
        { id: 'chef_test002', nickname: '派大星', avatar: '⭐', level: 3 },
      ]
    });
  }

  const friendsKey = `friends:${userId}`;
  const friendIds = await kvClient.get(friendsKey) || [];
  
  const friends = await Promise.all(
    friendIds.map(async (fid) => {
      const user = await kvClient.get(`user:${fid}`);
      if (!user) return null;
      return {
        id: user.id,
        nickname: user.nickname,
        avatar: user.avatar,
        level: user.level || 1,
        lastActive: user.lastActive || Date.now()
      };
    })
  );

  return res.json({ success: true, friends: friends.filter(Boolean) });
}

// ============== 送礼物 ==============
async function sendGift({ userId, friendId, giftType, amount }) {
  const kvClient = await getKV();
  
  if (!kvClient) {
    return res.json({ success: true, message: 'Mock: Gift sent' });
  }

  // 检查今日是否已送礼
  const today = new Date().toISOString().split('T')[0];
  const dailyKey = `daily_gift:${userId}:${friendId}:${today}`;
  const alreadySent = await kvClient.get(dailyKey);
  
  if (alreadySent) {
    return res.json({ success: false, error: 'Already sent gift today' });
  }

  // 记录送礼
  await kvClient.set(dailyKey, { type: giftType, amount, timestamp: Date.now() });

  // 添加到对方收礼列表
  const receiveKey = `gifts:${friendId}`;
  let gifts = await kvClient.get(receiveKey) || [];
  gifts.push({
    from: userId,
    type: giftType,
    amount,
    timestamp: Date.now(),
    date: today
  });
  await kvClient.set(receiveKey, gifts);

  return res.json({ success: true });
}

// ============== 获取好友主页数据 ==============
async function getFriendProfile({ userId, friendId }) {
  const kvClient = await getKV();
  
  if (!kvClient) {
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

  const user = await kvClient.get(`user:${friendId}`);
  if (!user) {
    return res.json({ success: false, error: 'User not found' });
  }

  // 获取统计
  const stats = await kvClient.get(`stats:${friendId}`) || {};

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
async function getReceivedGifts({ userId }) {
  const kvClient = await getKV();
  
  if (!kvClient) {
    return res.json({
      success: true,
      gifts: [
        { from: 'chef_test001', fromNickname: '海绵宝宝', type: 'coins', amount: 100, timestamp: Date.now() - 3600000 }
      ]
    });
  }

  const receiveKey = `gifts:${userId}`;
  const gifts = await kvClient.get(receiveKey) || [];
  
  // 转换用户 ID 为昵称
  const results = await Promise.all(
    gifts.slice(-20).reverse().map(async (gift) => {
      const fromUser = await kvClient.get(`user:${gift.from}`);
      return {
        ...gift,
        fromNickname: fromUser?.nickname || '未知用户'
      };
    })
  );

  return res.json({ success: true, gifts: results });
}

// ============== 获取今日送礼状态 ==============
async function getDailyGiftStatus({ userId, friendId }) {
  const kvClient = await getKV();
  
  if (!kvClient) {
    return res.json({ success: true, sent: false });
  }

  const today = new Date().toISOString().split('T')[0];
  const dailyKey = `daily_gift:${userId}:${friendId}:${today}`;
  const sent = await kvClient.get(dailyKey);

  return res.json({ success: true, sent: !!sent });
}
