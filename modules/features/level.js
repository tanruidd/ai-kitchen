/**
 * level.js — 等级经验系统
 *
 * 功能：
 * - 烹饪、抽盲盒、完成任务获得经验
 * - 等级提升解锁称号和奖励
 * - 升级奖励盲盒券
 *
 * 对外暴露：
 *   LevelModule.init()              — 初始化
 *   LevelModule.addExp(amount, reason) — 增加经验
 *   LevelModule.onCook()           — 烹饪时调用 (+10 exp)
 *   LevelModule.onGacha()          — 抽盲盒时调用 (+5 exp)
 *   LevelModule.onGachaRarity(rarity) — 稀有食材经验
 *   LevelModule.onTaskComplete()   — 完成任务时调用 (+20 exp)
 *   LevelModule.onAchievement(tier) — 解锁成就时调用
 *   LevelModule.getLevelInfo()     — 获取等级信息
 *   LevelModule.renderLevelPage()  — 渲染等级页面
 */

const LevelModule = (() => {
  const STORAGE_KEY = 'ai-kitchen-level';

  // 等级配置
  const LEVEL_CONFIG = {
    maxLevel: 50,
    baseExp: 100,      // 1级升2级所需经验
    expGrowth: 1.5,    // 每级经验增长系数
  };

  // 等级称号
  const LEVEL_TITLES = [
    { min: 1, max: 5, title: '厨房学徒', icon: '🥄' },
    { min: 6, max: 10, title: '料理新手', icon: '👨‍🍳' },
    { min: 11, max: 20, title: '烹饪达人', icon: '🔥' },
    { min: 21, max: 30, title: '大厨', icon: '👨‍🍳⭐' },
    { min: 31, max: 40, title: '米其林主厨', icon: '🌟' },
    { min: 41, max: 50, title: '传奇厨神', icon: '🏆' },
  ];

  // 经验来源
  const EXP_SOURCES = {
    cook: { amount: 10, desc: '烹饪美食' },
    gacha: { amount: 5, desc: '抽取盲盒' },
    task: { amount: 20, desc: '完成任务' },
    rare: { amount: 15, desc: '获得稀有食材' },
    epic: { amount: 30, desc: '获得史诗食材' },
    legendary: { amount: 50, desc: '获得传说食材' },
    achievement_bronze: { amount: 10, desc: '解锁铜牌成就' },
    achievement_silver: { amount: 25, desc: '解锁银牌成就' },
    achievement_gold: { amount: 50, desc: '解锁金牌成就' },
  };

  /**
   * 计算升到某级所需的总经验
   */
  function getExpForLevel(level) {
    if (level <= 1) return 0;
    let total = 0;
    for (let i = 1; i < level; i++) {
      total += Math.floor(LEVEL_CONFIG.baseExp * Math.pow(LEVEL_CONFIG.expGrowth, i - 1));
    }
    return total;
  }

  /**
   * 根据总经验计算当前等级
   */
  function getLevelFromExp(totalExp) {
    let level = 1;
    while (level < LEVEL_CONFIG.maxLevel) {
      const nextLevelExp = getExpForLevel(level + 1);
      if (totalExp < nextLevelExp) break;
      level++;
    }
    return level;
  }

  /**
   * 获取当前等级到下一级的经验进度
   */
  function getExpProgress(totalExp) {
    const level = getLevelFromExp(totalExp);
    if (level >= LEVEL_CONFIG.maxLevel) return { current: 0, needed: 0, percent: 100 };

    const currentLevelExp = getExpForLevel(level);
    const nextLevelExp = getExpForLevel(level + 1);
    const current = totalExp - currentLevelExp;
    const needed = nextLevelExp - currentLevelExp;
    const percent = Math.floor((current / needed) * 100);

    return { current, needed, percent };
  }

  /**
   * 获取等级称号
   */
  function getTitleForLevel(level) {
    for (const t of LEVEL_TITLES) {
      if (level >= t.min && level <= t.max) {
        return { title: t.title, icon: t.icon };
      }
    }
    return { title: '传奇厨神', icon: '🏆' };
  }

  /**
   * 加载数据
   */
  function loadData() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch {
      return null;
    }
  }

  /**
   * 保存数据
   */
  function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  /**
   * 初始化
   */
  function init() {
    let data = loadData();
    if (!data) {
      data = {
        exp: 0,
        level: 1,
        totalExp: 0,
        history: [], // 经验获取记录
      };
      saveData(data);
    }
    return data;
  }

  /**
   * 获取等级信息
   */
  function getLevelInfo() {
    const data = loadData() || init();
    const level = getLevelFromExp(data.totalExp);
    const progress = getExpProgress(data.totalExp);
    const title = getTitleForLevel(level);

    return {
      level,
      exp: data.totalExp,
      currentExp: progress.current,
      neededExp: progress.needed,
      percent: progress.percent,
      title: title.title,
      icon: title.icon,
      maxLevel: LEVEL_CONFIG.maxLevel,
    };
  }

  /**
   * 增加经验
   */
  function addExp(amount, reason = '') {
    const data = loadData() || init();
    const oldLevel = getLevelFromExp(data.totalExp);

    data.totalExp += amount;
    data.exp += amount;

    // 记录历史（最多保留50条）
    data.history.unshift({
      amount,
      reason,
      time: Date.now(),
    });
    if (data.history.length > 50) {
      data.history = data.history.slice(0, 50);
    }

    saveData(data);

    // 检查升级
    const newLevel = getLevelFromExp(data.totalExp);
    if (newLevel > oldLevel) {
      onLevelUp(newLevel, oldLevel);
    }

    // 更新 UI
    updateLevelDisplay();
    renderLevelPage();

    return { oldLevel, newLevel, leveledUp: newLevel > oldLevel };
  }

  /**
   * 升级处理
   */
  function onLevelUp(newLevel, oldLevel) {
    const title = getTitleForLevel(newLevel);

    // 升级奖励：每级奖励 1 张盲盒券
    const tickets = newLevel - oldLevel;
    const gachaData = window.GachaStore?.loadGachaData?.();
    if (gachaData) {
      gachaData.tickets += tickets;
      window.GachaStore?.saveGachaData?.(gachaData);
    }

    // 显示升级提示
    setTimeout(() => {
      showLevelUpToast(newLevel, title, tickets);
    }, 300);

    // 更新盲盒角标
    window.GachaModule?.updateGachaBadge?.();
  }

  /**
   * 显示升级提示
   */
  function showLevelUpToast(level, title, tickets) {
    const existing = document.getElementById('level-up-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'level-up-toast';
    toast.className = 'level-up-toast';
    toast.innerHTML = `
      <div class="level-up-content">
        <div class="level-up-icon">${title.icon}</div>
        <div class="level-up-text">
          <div class="level-up-title">🎉 升级啦！</div>
          <div class="level-up-level">Lv.${level} ${title.title}</div>
          <div class="level-up-reward">🎁 获得 ${tickets} 张盲盒券</div>
        </div>
      </div>
    `;
    document.body.appendChild(toast);
    window.SFX?.done?.();

    // 3秒后自动消失
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 500);
    }, 3000);
  }

  /**
   * 更新等级显示（菜单、账号页面等）
   */
  function updateLevelDisplay() {
    const info = getLevelInfo();

    // 更新菜单中的等级显示
    const levelBadge = document.getElementById('menu-user-level');
    if (levelBadge) {
      levelBadge.textContent = `Lv.${info.level}`;
    }

    // 更新账号页面的等级显示（如果在账号页面）
    const accountLevel = document.getElementById('account-level-display');
    if (accountLevel) {
      accountLevel.innerHTML = `
        <span class="level-badge">${info.icon} Lv.${info.level}</span>
        <span class="level-title">${info.title}</span>
      `;
    }
  }

  /**
   * 烹饪时调用
   */
  function onCook() {
    const source = EXP_SOURCES.cook;
    return addExp(source.amount, source.desc);
  }

  /**
   * 抽盲盒时调用
   */
  function onGacha() {
    const source = EXP_SOURCES.gacha;
    return addExp(source.amount, source.desc);
  }

  /**
   * 稀有食材经验
   */
  function onGachaRarity(rarity) {
    const source = EXP_SOURCES[rarity];
    if (source) {
      return addExp(source.amount, source.desc);
    }
    return null;
  }

  /**
   * 完成任务时调用
   */
  function onTaskComplete() {
    const source = EXP_SOURCES.task;
    return addExp(source.amount, source.desc);
  }

  /**
   * 解锁成就时调用
   */
  function onAchievement(tier) {
    const key = `achievement_${tier}`;
    const source = EXP_SOURCES[key];
    if (source) {
      return addExp(source.amount, source.desc);
    }
    return null;
  }

  /**
   * 渲染等级页面
   */
  function renderLevelPage() {
    const container = document.getElementById('level-page-content');
    if (!container) return;

    const info = getLevelInfo();
    const data = loadData() || init();

    // 计算各称号进度
    const titleProgress = LEVEL_TITLES.map(t => {
      const unlocked = info.level >= t.min;
      const current = info.level >= t.min && info.level <= t.max;
      return { ...t, unlocked, current };
    });

    container.innerHTML = `
      <div class="level-main-card">
        <div class="level-avatar">${info.icon}</div>
        <div class="level-info">
          <div class="level-number">Lv.${info.level}</div>
          <div class="level-title-text">${info.title}</div>
        </div>
        <div class="level-exp-bar">
          <div class="level-exp-fill" style="width: ${info.percent}%"></div>
        </div>
        <div class="level-exp-text ${info.level >= info.maxLevel ? 'max-level' : ''}">
          ${info.level >= info.maxLevel 
            ? '🌟 已达最高等级！传奇厨神就是你！' 
            : `还需 ${info.neededExp - info.currentExp} EXP 升级`}
        </div>
      </div>

      <div class="level-section">
        <h4>🎖️ 称号殿堂</h4>
        <div class="level-titles-list">
          ${titleProgress.map(t => `
            <div class="level-title-item ${t.unlocked ? 'unlocked' : ''} ${t.current ? 'current' : ''}">
              <div class="level-title-icon">${t.icon}</div>
              <div class="level-title-info">
                <div class="level-title-name">${t.title}</div>
                <div class="level-title-range">Lv.${t.min} - ${t.max}</div>
              </div>
              <div class="level-title-status">
                ${t.current ? '✨ 当前' : t.unlocked ? '✓ 已解锁' : '🔒 未解锁'}
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="level-section">
        <h4>📊 经验宝典</h4>
        <div class="level-exp-sources">
          <div class="exp-source-item">
            <span class="exp-source-icon">🍳</span>
            <span class="exp-source-name">烹饪美食</span>
            <span class="exp-source-amount">+10</span>
          </div>
          <div class="exp-source-item">
            <span class="exp-source-icon">🎁</span>
            <span class="exp-source-name">抽取盲盒</span>
            <span class="exp-source-amount">+5</span>
          </div>
          <div class="exp-source-item">
            <span class="exp-source-icon">✅</span>
            <span class="exp-source-name">完成任务</span>
            <span class="exp-source-amount">+20</span>
          </div>
          <div class="exp-source-item">
            <span class="exp-source-icon">✨</span>
            <span class="exp-source-name">稀有食材</span>
            <span class="exp-source-amount">+15</span>
          </div>
          <div class="exp-source-item">
            <span class="exp-source-icon">🌟</span>
            <span class="exp-source-name">史诗食材</span>
            <span class="exp-source-amount">+30</span>
          </div>
          <div class="exp-source-item">
            <span class="exp-source-icon">🏆</span>
            <span class="exp-source-name">传说食材</span>
            <span class="exp-source-amount">+50</span>
          </div>
          <div class="exp-source-item">
            <span class="exp-source-icon">🥉</span>
            <span class="exp-source-name">铜牌成就</span>
            <span class="exp-source-amount">+10</span>
          </div>
          <div class="exp-source-item">
            <span class="exp-source-icon">🥈</span>
            <span class="exp-source-name">银牌成就</span>
            <span class="exp-source-amount">+25</span>
          </div>
          <div class="exp-source-item">
            <span class="exp-source-icon">🥇</span>
            <span class="exp-source-name">金牌成就</span>
            <span class="exp-source-amount">+50</span>
          </div>
          <div class="exp-source-item">
            <span class="exp-source-icon">⬆️</span>
            <span class="exp-source-name">升级奖励</span>
            <span class="exp-source-amount">🎁 盲盒券</span>
          </div>
        </div>
      </div>

      <div class="level-section">
        <h4>📜 经验记录</h4>
        <div class="level-history-list">
          ${data.history.length === 0 
            ? '<div class="level-history-empty">🚀 开始烹饪、抽盲盒来获取经验吧！</div>'
            : data.history.slice(0, 10).map(h => `
              <div class="level-history-item">
                <span class="history-reason">${h.reason}</span>
                <span class="history-amount">+${h.amount} EXP</span>
              </div>
            `).join('')}
        </div>
      </div>

      <div class="level-tips">
        💡 每升一级可获得 1 张盲盒券，最高 Lv.50 传奇厨神！
      </div>
    `;
  }

  return {
    init,
    getLevelInfo,
    addExp,
    onCook,
    onGacha,
    onGachaRarity,
    onTaskComplete,
    onAchievement,
    updateLevelDisplay,
    renderLevelPage,
  };
})();

window.LevelModule = LevelModule;
