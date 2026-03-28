/**
 * friends.js — 好友系统
 *
 * 功能：
 * - 展示好友码（一键复制）
 * - 搜索并添加好友
 * - 好友列表管理
 * - 访问好友主页
 * - 互送礼物
 *
 * 依赖：
 * - AccountModule.getUser() 获取当前用户
 * - GachaModule 盲盒券
 * - HistoryModule 金币
 */

const FriendsModule = (() => {
  const API_BASE = '/api/social';
  
  // 礼物配置
  const GIFTS = {
    coins: { name: '金币', icon: '🪙', amount: 100 },
    coupon: { name: '盲盒券', icon: '🎫', amount: 1 }
  };

  // ============== API 调用 ==============
  async function apiCall(action, data = {}) {
    const user = AccountModule?.getUser?.();
    const response = await fetch(`${API_BASE}?action=${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user?.id, ...data })
    });
    return response.json();
  }

  // ============== 渲染好友页面 ==============
  function renderFriendsPage() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="page friends-page">
        <div class="page-header">
          <button class="back-btn" onclick="App.navigate('home')">← 返回</button>
          <h1>👥 好友</h1>
        </div>
        
        <div class="friends-code-section">
          <div class="friends-code-card">
            <div class="code-label">我的好友码</div>
            <div class="code-value" id="my-friend-code">加载中...</div>
            <button class="copy-btn" onclick="FriendsModule.copyFriendCode()">📋 复制</button>
          </div>
        </div>

        <div class="add-friend-section">
          <button class="add-friend-btn" onclick="FriendsModule.showAddFriendModal()">
            ➕ 添加好友
          </button>
        </div>

        <div class="friends-list-section">
          <h2>好友列表</h2>
          <div class="friends-list" id="friends-list">
            <div class="loading">加载中...</div>
          </div>
        </div>

        <div class="gift-history-section">
          <h2>收到的礼物</h2>
          <div class="gift-list" id="gift-list">
            <div class="empty-state">暂无礼物记录</div>
          </div>
        </div>
      </div>
    `;

    // 加载数据
    loadFriendsList();
    loadGiftHistory();
    
    // 显示我的好友码
    const user = AccountModule?.getUser?.();
    document.getElementById('my-friend-code').textContent = user?.id || '未登录';
  }

  // ============== 加载好友列表 ==============
  async function loadFriendsList() {
    const listEl = document.getElementById('friends-list');
    
    try {
      const result = await apiCall('list');
      
      if (!result.success || !result.friends?.length) {
        listEl.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">😢</div>
            <div>还没有好友，快去添加吧！</div>
          </div>
        `;
        return;
      }

      listEl.innerHTML = result.friends.map(friend => `
        <div class="friend-item" onclick="FriendsModule.showFriendProfile('${friend.id}')">
          <div class="friend-avatar">${friend.avatar}</div>
          <div class="friend-info">
            <div class="friend-name">${friend.nickname}</div>
            <div class="friend-level">Lv.${friend.level || 1}</div>
          </div>
          <button class="gift-btn" onclick="event.stopPropagation(); FriendsModule.showGiftModal('${friend.id}')">
            🎁 送礼
          </button>
        </div>
      `).join('');
      
    } catch (e) {
      listEl.innerHTML = `<div class="error">加载失败: ${e.message}</div>`;
    }
  }

  // ============== 加载礼物记录 ==============
  async function loadGiftHistory() {
    const listEl = document.getElementById('gift-list');
    
    try {
      const result = await apiCall('gift-received');
      
      if (!result.success || !result.gifts?.length) {
        return;
      }

      listEl.innerHTML = result.gifts.map(gift => `
        <div class="gift-item">
          <div class="gift-icon">${GIFTS[gift.type]?.icon || '🎁'}</div>
          <div class="gift-info">
            <div class="gift-from">${gift.fromNickname} 送了你</div>
            <div class="gift-detail">${GIFTS[gift.type]?.name || gift.type} x${gift.amount}</div>
          </div>
          <div class="gift-time">${formatTime(gift.timestamp)}</div>
        </div>
      `).join('');
      
    } catch (e) {
      console.error('Load gift history error:', e);
    }
  }

  // ============== 复制好友码 ==============
  async function copyFriendCode() {
    const user = AccountModule?.getUser?.();
    const code = user?.id;
    
    try {
      await navigator.clipboard.writeText(code);
      showToast('✅ 好友码已复制！');
    } catch (e) {
      // 降级方案
      const input = document.createElement('input');
      input.value = code;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      showToast('✅ 好友码已复制！');
    }
  }

  // ============== 显示添加好友弹窗 ==============
  function showAddFriendModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'add-friend-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>添加好友</h3>
          <button class="close-btn" onclick="FriendsModule.closeModal()">✕</button>
        </div>
        <div class="modal-body">
          <input type="text" id="friend-code-input" placeholder="输入好友码" class="code-input">
          <button class="search-btn" onclick="FriendsModule.searchFriend()">🔍 搜索</button>
          
          <div id="search-result" class="search-result"></div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  // ============== 搜索好友 ==============
  async function searchFriend() {
    const input = document.getElementById('friend-code-input');
    const resultEl = document.getElementById('search-result');
    const keyword = input.value.trim();
    
    if (!keyword) {
      resultEl.innerHTML = '<div class="error">请输入好友码</div>';
      return;
    }

    resultEl.innerHTML = '<div class="loading">搜索中...</div>';

    try {
      const result = await apiCall('search', { keyword });
      
      if (!result.success || !result.users?.length) {
        resultEl.innerHTML = '<div class="error">未找到用户</div>';
        return;
      }

      const user = result.users[0];
      resultEl.innerHTML = `
        <div class="search-result-item">
          <div class="user-avatar">${user.avatar}</div>
          <div class="user-info">
            <div class="user-name">${user.nickname}</div>
            <div class="user-level">Lv.${user.level || 1}</div>
          </div>
          <button class="add-btn" onclick="FriendsModule.addFriend('${user.id}')">➕ 添加</button>
        </div>
      `;
      
    } catch (e) {
      resultEl.innerHTML = `<div class="error">搜索失败: ${e.message}</div>`;
    }
  }

  // ============== 添加好友 ==============
  async function addFriend(friendId) {
    try {
      const result = await apiCall('add', { friendId });
      
      if (result.success) {
        showToast('✅ 添加成功！');
        closeModal();
        loadFriendsList();
      } else {
        showToast('❌ ' + (result.error || '添加失败'));
      }
    } catch (e) {
      showToast('❌ 添加失败: ' + e.message);
    }
  }

  // ============== 显示好友主页 ==============
  async function showFriendProfile(friendId) {
    const resultEl = document.getElementById('search-result');
    
    try {
      const result = await apiCall('profile', { friendId });
      
      if (!result.success) {
        showToast('❌ ' + (result.error || '获取失败'));
        return;
      }

      const p = result.profile;
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-content profile-modal">
          <div class="modal-header">
            <h3>${p.nickname} 的主页</h3>
            <button class="close-btn" onclick="FriendsModule.closeModal()">✕</button>
          </div>
          <div class="modal-body">
            <div class="profile-header">
              <div class="profile-avatar">${p.avatar}</div>
              <div class="profile-name">${p.nickname}</div>
              <div class="profile-level">Lv.${p.level || 1}</div>
            </div>
            
            <div class="profile-stats">
              <div class="stat-item">
                <div class="stat-value">${p.totalCooks || 0}</div>
                <div class="stat-label">烹饪次数</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${p.totalGacha || 0}</div>
                <div class="stat-label">抽盲盒</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${p.achievements || 0}</div>
                <div class="stat-label">成就</div>
              </div>
            </div>

            <div class="profile-favorite">
              <span class="label">最爱料理：</span>
              <span class="value">${p.favoriteDish || '未知'}</span>
            </div>

            <div class="profile-actions">
              <button class="gift-btn" onclick="FriendsModule.showGiftModal('${friendId}'); FriendsModule.closeModal();">
                🎁 送礼物
              </button>
              <button class="remove-btn" onclick="FriendsModule.removeFriend('${friendId}')">
                🗑️ 删除好友
              </button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      
    } catch (e) {
      showToast('❌ 获取失败: ' + e.message);
    }
  }

  // ============== 送礼弹窗 ==============
  async function showGiftModal(friendId) {
    // 获取当前金币和盲盒券
    const user = AccountModule?.getUser?.();
    const coins = HistoryModule?.getCoins?.() || 0;
    const coupons = GachaModule?.getCoupons?.() || 0;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>🎁 送礼物</h3>
          <button class="close-btn" onclick="FriendsModule.closeModal()">✕</button>
        </div>
        <div class="modal-body">
          <div class="gift-balance">
            <span>🪙 金币: ${coins}</span>
            <span>🎫 盲盒券: ${coupons}</span>
          </div>
          
          <div class="gift-options">
            <button class="gift-option" onclick="FriendsModule.sendGift('${friendId}', 'coins', 100)">
              <div class="gift-icon">🪙</div>
              <div class="gift-name">金币 x100</div>
            </button>
            <button class="gift-option" onclick="FriendsModule.sendGift('${friendId}', 'coupon', 1)">
              <div class="gift-icon">🎫</div>
              <div class="gift-name">盲盒券 x1</div>
            </button>
          </div>
          
          <div class="gift-tip">每个好友每天只能送一次礼物哦！</div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  // ============== 送礼 ==============
  async function sendGift(friendId, giftType, amount) {
    try {
      const result = await apiCall('send', { friendId, giftType, amount });
      
      if (result.success) {
        // 扣减发送者资源
        if (giftType === 'coins') {
          HistoryModule?.addCoins?.(-amount);
        } else if (giftType === 'coupon') {
          GachaModule?.addCoupons?.(-amount);
        }
        
        showToast('✅ 礼物已送达！');
        closeModal();
      } else {
        showToast('❌ ' + (result.error || '送礼失败'));
      }
    } catch (e) {
      showToast('❌ 送礼失败: ' + e.message);
    }
  }

  // ============== 删除好友 ==============
  async function removeFriend(friendId) {
    if (!confirm('确定要删除这个好友吗？')) return;

    try {
      const result = await apiCall('remove', { friendId });
      
      if (result.success) {
        showToast('✅ 已删除好友');
        closeModal();
        loadFriendsList();
      } else {
        showToast('❌ ' + (result.error || '删除失败'));
      }
    } catch (e) {
      showToast('❌ 删除失败: ' + e.message);
    }
  }

  // ============== 关闭弹窗 ==============
  function closeModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) modal.remove();
  }

  // ============== Toast 提示 ==============
  function showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  // ============== 格式化时间 ==============
  function formatTime(timestamp) {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    return `${days}天前`;
  }

  // ============== 导出 ==============
  return {
    renderFriendsPage,
    copyFriendCode,
    showAddFriendModal,
    searchFriend,
    addFriend,
    showFriendProfile,
    showGiftModal,
    sendGift,
    removeFriend,
    closeModal
  };
})();
