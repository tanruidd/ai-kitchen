/**
 * account.js — 智能账号系统
 *
 * 功能：
 * - 设备指纹识别，避免同一设备重复注册
 * - 首次访问自动生成用户 ID + 随机昵称
 * - 用户可修改昵称和头像
 * - ID 登录：在新设备恢复账号
 * - 云端同步：数据保存到 Redis
 *
 * 对外暴露：
 *   AccountModule.getUser()        — 获取当前用户信息
 *   AccountModule.init()           — 初始化账号（页面加载时调用）
 *   AccountModule.updateNickname() — 打开修改昵称弹窗
 *   AccountModule.updateAvatar()   — 切换头像
 *   AccountModule.renderAccountPage() — 渲染账号页面
 *   AccountModule.getUserDisplay() — 获取用户展示信息（昵称+头像）
 *   AccountModule.showLoginModal() — 显示 ID 登录弹窗
 *   AccountModule.syncToCloud()    — 同步数据到云端
 */

const AccountModule = (() => {
  const USER_KEY = 'ai-kitchen-user';
  const DEVICE_KEY = 'ai-kitchen-device-id';

  // 可选头像列表
  const AVATARS = ['🧽', '🦀', '🐙', '⭐', '🍕', '🍔', '🌮', '🍣', '🧁', '🍩', '🥐', '🍜', '🍳', '🍬', '🥩', '🍗', '🌮', '🥗', '🍉', '🧀'];

  // 随机昵称池
  const NICKNAME_POOL = [
    '海绵宝宝', '蟹老板', '派大星', '章鱼哥', '珊迪', '痞老板',
    '小蜗', '蟹黄堡大厨', '比奇堡居民', '深海吃货', '厨房新手',
    '美食探险家', '料理小白', '深夜食堂', '味蕾冒险家', '食谱收藏家',
    '厨房魔法师', '吃货达人', '美食猎人', '料理忍者', '甜品控',
  ];

  /**
   * 生成设备指纹
   * 基于：浏览器信息 + 屏幕信息 + 时区 + 语言
   */
  function generateDeviceId() {
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      navigator.platform,
    ];
    const raw = components.join('|');
    // 简单 hash
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return 'device_' + Math.abs(hash).toString(36);
  }

  /**
   * 获取设备 ID（持久化到 localStorage）
   */
  function getDeviceId() {
    let deviceId = localStorage.getItem(DEVICE_KEY);
    if (!deviceId) {
      deviceId = generateDeviceId();
      localStorage.setItem(DEVICE_KEY, deviceId);
    }
    return deviceId;
  }

  /**
   * 生成短 ID
   */
  function generateId() {
    return 'chef_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  /**
   * 加载用户
   */
  function loadUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
      return null;
    }
  }

  /**
   * 保存用户
   */
  function saveUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  /**
   * 检查是否已登录
   */
  function isLoggedIn() {
    return !!loadUser();
  }

  /**
   * 获取当前用户（同步，可能为 null）
   */
  function getUser() {
    return loadUser();
  }
  
  /**
   * 检查设备是否已注册（后台异步）
   * 
   * 逻辑：
   * 1. 有设备 ID → 查 Redis
   * 2. 查不到 → 清空 localStorage，显示提示
   * 3. 查到了 → 恢复账号
   */
  async function checkDeviceAndRestore() {
    const deviceId = getDeviceId();
    const localUser = loadUser();
    
    try {
      console.log('🔍 检查设备:', deviceId);
      
      const response = await fetch('/api/social?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: deviceId })
      });
      const result = await response.json();
      
      if (result.success && result.user) {
        // 设备已注册，恢复账号
        console.log('✅ 设备已注册，恢复账号:', result.user.nickname);
        saveUser(result.user);
        updateMenuHeader(result.user);
        return;
      }
      
      // 设备未注册
      console.log('⚠️ 设备未注册');
      
      // 如果本地有用户，注册到云端
      if (localUser) {
        console.log('📝 注册本地用户到云端...');
        await fetch('/api/social?action=register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            user: { ...localUser, deviceId },
            userId: deviceId
          })
        });
        console.log('✅ 设备已注册');
      }
      
    } catch (e) {
      console.log('❌ 设备检查失败:', e.message);
      // 网络错误，不清空数据，保持本地状态
    }
  }

  /**
   * 创建新用户
   */
  function createUser() {
    const user = {
      id: generateId(),
      nickname: NICKNAME_POOL[Math.floor(Math.random() * NICKNAME_POOL.length)] + Math.floor(Math.random() * 999),
      avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)],
      createdAt: Date.now(),
    };
    saveUser(user);
    return user;
  }

  /**
   * 初始化
   */
  function init() {
    // 检查本地是否有用户，没有则创建
    if (!loadUser()) {
      createUser();
    }
    updateMenuDisplay();
  }
  
  /**
   * 更新菜单显示（根据登录状态）
   */
  function updateMenuDisplay() {
    const user = loadUser();
    const avatarEl = document.getElementById('menu-user-avatar');
    const nameEl = document.getElementById('menu-user-name');
    const levelEl = document.getElementById('menu-user-level');
    
    if (user) {
      // 已登录
      if (avatarEl) avatarEl.textContent = user.avatar;
      if (nameEl) nameEl.textContent = user.nickname;
      if (levelEl) levelEl.textContent = 'Lv.' + (user.level || 1);
    } else {
      // 未登录
      if (avatarEl) avatarEl.textContent = '👤';
      if (nameEl) nameEl.textContent = '未登录';
      if (levelEl) levelEl.textContent = '点击登录';
    }
  }

  /**
   * 更新菜单头部显示
   */
  function updateMenuHeader(user) {
    const avatarEl = document.getElementById('menu-user-avatar');
    const nameEl = document.getElementById('menu-user-name');
    if (avatarEl) avatarEl.textContent = user.avatar;
    if (nameEl) nameEl.textContent = user.nickname;
  }

  /**
   * 获取用户展示信息（昵称+头像）
   */
  function getUserDisplay() {
    const user = loadUser();
    if (!user) return { avatar: '👤', nickname: '未登录', id: '' };
    return { avatar: user.avatar, nickname: user.nickname, id: user.id };
  }

  /**
   * 打开修改昵称弹窗
   */
  function updateNickname() {
    const user = getUser();

    // 移除已有弹窗
    const existing = document.getElementById('account-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'account-modal';
    modal.className = 'account-modal';
    modal.innerHTML = `
      <div class="account-modal-content">
        <h3>✏️ 修改昵称</h3>
        <input type="text" class="account-nickname-input" id="account-nickname-input"
               value="${escapeHtml(user.nickname)}" maxlength="12" placeholder="输入新昵称（最多12字）" />
        <div class="account-modal-actions">
          <button class="account-modal-btn cancel" onclick="AccountModule.closeModal()">取消</button>
          <button class="account-modal-btn confirm" onclick="AccountModule.saveNickname()">保存</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // 回车保存
    document.getElementById('account-nickname-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') AccountModule.saveNickname();
    });

    // 自动聚焦
    setTimeout(() => {
      const input = document.getElementById('account-nickname-input');
      input.focus();
      input.select();
    }, 100);
  }

  /**
   * 保存昵称
   */
  function saveNickname() {
    const input = document.getElementById('account-nickname-input');
    const nickname = input.value.trim();
    if (!nickname) {
      showToast('昵称不能为空哦！');
      return;
    }
    if (nickname.length > 12) {
      showToast('昵称最多12个字！');
      return;
    }

    const user = getUser();
    user.nickname = nickname;
    saveUser(user);
    updateMenuHeader(user);
    closeModal();
    renderAccountPage(); // 刷新账号页面
    showToast('✅ 昵称修改成功！');
  }

  /**
   * 切换头像
   */
  function selectAvatar() {
    const user = getUser();
    const existing = document.getElementById('account-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'account-modal';
    modal.className = 'account-modal';
    modal.innerHTML = `
      <div class="account-modal-content">
        <h3>🎭 选择头像</h3>
        <div class="account-avatar-grid">
          ${AVATARS.map(a => `
            <div class="account-avatar-option ${a === user.avatar ? 'selected' : ''}"
                 onclick="AccountModule.saveAvatar('${a}')">
              ${a}
            </div>
          `).join('')}
        </div>
        <div class="account-modal-actions">
          <button class="account-modal-btn cancel" onclick="AccountModule.closeModal()">取消</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  /**
   * 保存头像
   */
  function saveAvatar(avatar) {
    const user = getUser();
    user.avatar = avatar;
    saveUser(user);
    updateMenuHeader(user);
    closeModal();
    renderAccountPage();
    showToast('✅ 头像修改成功！');
  }

  /**
   * 关闭弹窗
   */
  function closeModal() {
    const modal = document.getElementById('account-modal');
    if (modal) modal.remove();
  }

  /**
   * 渲染账号页面
   */
  function renderAccountPage() {
    const container = document.getElementById('account-page-content');
    if (!container) return;

    const user = getUser();
    const days = Math.floor((Date.now() - user.createdAt) / 86400000);
    const levelInfo = window.LevelModule?.getLevelInfo?.() || { level: 1, title: '厨房学徒', icon: '🥄', percent: 0, currentExp: 0, neededExp: 100 };

    container.innerHTML = `
      <div class="account-profile-card">
        <div class="account-profile-avatar">${user.avatar}</div>
        <div class="account-profile-info">
          <div class="account-profile-name">${escapeHtml(user.nickname)}</div>
          <div class="account-profile-id">ID: ${user.id}</div>
          <div class="account-profile-days">🎨 已加入 ${days} 天</div>
        </div>
      </div>

      <div class="account-level-card" onclick="AccountModule.toggleLevelDetail()">
        <div class="account-level-header">
          <div class="account-level-icon">${levelInfo.icon}</div>
          <div class="account-level-info">
            <div class="account-level-title">
              <span class="level-number">Lv.${levelInfo.level}</span>
              <span class="level-name">${levelInfo.title}</span>
            </div>
            <div class="account-level-exp-bar">
              <div class="account-level-exp-fill" style="width: ${levelInfo.percent}%"></div>
            </div>
            <div class="account-level-exp-text">
              ${levelInfo.level >= 50 ? '🌟 已达最高等级！' : `还需 ${levelInfo.neededExp - levelInfo.currentExp} EXP 升级`}
            </div>
          </div>
          <div class="account-level-arrow" id="level-detail-arrow">▼</div>
        </div>
        <div class="account-level-detail" id="level-detail-content" style="display:none;">
          <div class="level-detail-section">
            <h5>📊 经验宝典</h5>
            <div class="level-detail-grid">
              <div class="level-detail-item"><span>🍳</span>烹饪 +10</div>
              <div class="level-detail-item"><span>🎁</span>盲盒 +5</div>
              <div class="level-detail-item"><span>✅</span>任务 +20</div>
              <div class="level-detail-item"><span>✨</span>稀有 +15</div>
              <div class="level-detail-item"><span>🌟</span>史诗 +30</div>
              <div class="level-detail-item"><span>🏆</span>传说 +50</div>
            </div>
          </div>
          <div class="level-detail-section">
            <h5>🎖️ 称号殿堂</h5>
            <div class="level-titles-mini">
              <div class="level-title-mini ${levelInfo.level >= 1 ? 'unlocked' : ''}"><span>🥄</span>学徒</div>
              <div class="level-title-mini ${levelInfo.level >= 6 ? 'unlocked' : ''}"><span>👨‍🍳</span>新手</div>
              <div class="level-title-mini ${levelInfo.level >= 11 ? 'unlocked' : ''}"><span>🔥</span>达人</div>
              <div class="level-title-mini ${levelInfo.level >= 21 ? 'unlocked' : ''}"><span>👨‍🍳⭐</span>大厨</div>
              <div class="level-title-mini ${levelInfo.level >= 31 ? 'unlocked' : ''}"><span>🌟</span>主厨</div>
              <div class="level-title-mini ${levelInfo.level >= 41 ? 'unlocked' : ''}"><span>🏆</span>厨神</div>
            </div>
          </div>
          <div class="level-detail-tip">💡 每升一级获得 1 张盲盒券！</div>
        </div>
      </div>

      <div class="settings-section">
        <h4>👤 个人设置</h4>
        <div class="settings-items">
          <div class="settings-item" onclick="AccountModule.updateNickname()">
            <div class="settings-item-info">
              <span class="settings-item-label">修改昵称</span>
              <span class="settings-item-desc">当前昵称：${escapeHtml(user.nickname)}</span>
            </div>
            <span class="settings-item-arrow">→</span>
          </div>
          <div class="settings-item" onclick="AccountModule.selectAvatar()">
            <div class="settings-item-info">
              <span class="settings-item-label">更换头像</span>
              <span class="settings-item-desc">当前头像：${user.avatar}</span>
            </div>
            <span class="settings-item-arrow">→</span>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h4>📋 账号信息</h4>
        <div class="settings-items">
          <div class="settings-item" style="cursor:default;">
            <div class="settings-item-info">
              <span class="settings-item-label">用户 ID</span>
              <span class="settings-item-desc">${user.id}</span>
            </div>
            <button class="account-copy-btn" onclick="AccountModule.copyId()">复制</button>
          </div>
          <div class="settings-item" style="cursor:default;">
            <div class="settings-item-info">
              <span class="settings-item-label">注册时间</span>
              <span class="settings-item-desc">${new Date(user.createdAt).toLocaleDateString('zh-CN')}</span>
            </div>
          </div>
          <div class="settings-item" style="cursor:default;">
            <div class="settings-item-info">
              <span class="settings-item-label">使用天数</span>
              <span class="settings-item-desc">${days} 天</span>
            </div>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h4>🔐 账号同步</h4>
        <div class="settings-items">
          <div class="settings-item" onclick="AccountModule.showLoginModal()">
            <div class="settings-item-info">
              <span class="settings-item-label">ID 登录</span>
              <span class="settings-item-desc">在新设备上用 ID 登录</span>
            </div>
            <span class="settings-item-arrow">→</span>
          </div>
          <div class="settings-item" onclick="AccountModule.syncToCloud()">
            <div class="settings-item-info">
              <span class="settings-item-label">同步到云端</span>
              <span class="settings-item-desc">保存数据到云端，换设备不丢失</span>
            </div>
            <span class="settings-item-arrow">→</span>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h4>⚠️ 危险操作</h4>
        <div class="settings-items">
          <div class="settings-item" onclick="AccountModule.resetAccount()">
            <div class="settings-item-info">
              <span class="settings-item-label danger">重置账号</span>
              <span class="settings-item-desc">重新生成身份，所有数据清空</span>
            </div>
            <span class="settings-item-arrow">→</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 复制用户 ID
   */
  function copyId() {
    const user = getUser();
    navigator.clipboard?.writeText(user.id).then(() => {
      showToast('📋 用户 ID 已复制！');
    }).catch(() => {
      showToast('复制失败，请手动复制');
    });
  }

  /**
   * 重置账号（二次确认）
   */
  function resetAccount() {
    const existing = document.getElementById('account-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'account-modal';
    modal.className = 'account-modal';
    modal.innerHTML = `
      <div class="account-modal-content">
        <h3>⚠️ 重置账号</h3>
        <p class="account-reset-warning">确定要重置账号吗？这将清除所有数据（历史记录、成就、盲盒等），此操作不可撤销！</p>
        <div class="account-modal-actions">
          <button class="account-modal-btn cancel" onclick="AccountModule.closeModal()">取消</button>
          <button class="account-modal-btn danger" onclick="AccountModule.confirmReset()">确认重置</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  /**
   * 确认重置
   */
  function confirmReset() {
    closeModal();
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('ai-kitchen-gacha');
    localStorage.removeItem('ai-kitchen-gacha-history');
    localStorage.removeItem('ai-kitchen-cook-count');
    localStorage.removeItem('ai-kitchen-history');
    localStorage.removeItem('ai-kitchen-achievements');
    localStorage.removeItem('ai-kitchen-stats');
    localStorage.removeItem('ai-kitchen-settings');
    localStorage.removeItem('ai-kitchen-daily-tasks');
    localStorage.removeItem('ai-kitchen-level');
    localStorage.removeItem('ai-kitchen-recipe-rank');
    localStorage.removeItem('ai-kitchen-user-rank');

    const user = createUser();
    updateMenuHeader(user);
    renderAccountPage();
    showToast('🔄 账号已重置，欢迎新厨师！');
  }

  /**
   * 展开/收起等级详情
   */
  function toggleLevelDetail() {
    const content = document.getElementById('level-detail-content');
    const arrow = document.getElementById('level-detail-arrow');
    if (!content || !arrow) return;

    if (content.style.display === 'none') {
      content.style.display = 'block';
      arrow.textContent = '▲';
    } else {
      content.style.display = 'none';
      arrow.textContent = '▼';
    }
  }


  /**
   * 显示 ID 登录弹窗
   */
  function showLoginModal() {
    const existing = document.getElementById('account-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'account-modal';
    modal.className = 'account-modal';
    modal.innerHTML = `
      <div class="account-modal-content">
        <h3>🔐 ID 登录</h3>
        <p style="color:#666;font-size:14px;margin-bottom:16px;">输入您的用户 ID，在新设备上恢复账号</p>
        <input type="text" id="login-user-id" placeholder="请输入用户 ID" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:16px;box-sizing:border-box;">
        <div class="account-modal-actions" style="margin-top:16px;">
          <button class="account-modal-btn cancel" onclick="AccountModule.closeModal()">取消</button>
          <button class="account-modal-btn" onclick="AccountModule.doLogin()">登录</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  /**
   * 执行 ID 登录
   */
  async function doLogin() {
    const input = document.getElementById('login-user-id');
    const userId = input?.value?.trim();
    
    if (!userId) {
      showToast('请输入用户 ID');
      return;
    }

    try {
      showToast('🔄 正在登录...');
      
      const response = await fetch('/api/social?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      
      const result = await response.json();
      
      if (result.success && result.user) {
        // 保存用户数据到本地
        saveUser(result.user);
        updateMenuHeader(result.user);
        closeModal();
        renderAccountPage();
        showToast('✅ 登录成功！欢迎回来，' + result.user.nickname);
      } else {
        showToast('❌ ' + (result.error || '登录失败'));
      }
    } catch (e) {
      showToast('❌ 登录失败: ' + e.message);
    }
  }

  /**
   * 同步数据到云端
   */
  async function syncToCloud() {
    const user = getUser();
    
    try {
      showToast('🔄 正在同步...');
      
      const response = await fetch('/api/social?action=sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user })
      });
      
      const result = await response.json();
      
      if (result.success) {
        showToast('✅ 数据已同步到云端！');
      } else {
        showToast('❌ ' + (result.error || '同步失败'));
      }
    } catch (e) {
      showToast('❌ 同步失败: ' + e.message);
    }
  }

  return {
    init,
    getUser,
    isLoggedIn,
    getUserDisplay,
    updateMenuDisplay,
    updateNickname,
    selectAvatar,
    updateAvatar: selectAvatar,  // 别名，保持 API 兼容性
    saveNickname,
    saveAvatar,
    closeModal,
    renderAccountPage,
    copyId,
    resetAccount,
    confirmReset,
    toggleLevelDetail,
    showLoginModal,
    doLogin,
    syncToCloud,
  };
})();

window.AccountModule = AccountModule;