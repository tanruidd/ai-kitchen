/**
 * achievements.js — 成就系统
 *
 * 功能：
 * - 解锁成就（烹饪次数、稀有度收集、食谱使用等）
 * - 成就徽章展示
 * - 成就分享
 *
 * 对外暴露：
 *   AchievementModule.checkAchievements()  — 检查并解锁成就
 *   AchievementModule.getAchievements()    — 获取已解锁成就
 *   AchievementModule.openAchievements()   — 打开成就面板
 */

const AchievementModule = (() => {
  const STORAGE_KEY = 'ai-kitchen-achievements';

  // 成就定义
  const ACHIEVEMENTS = {
    // 烹饪成就
    'first-cook': {
      id: 'first-cook',
      name: '🍳 初出茅庐',
      desc: '生成第一道食谱',
      icon: '🍳',
      condition: (stats) => stats.totalCooks >= 1,
      reward: '解锁成就徽章',
    },
    'cook-10': {
      id: 'cook-10',
      name: '👨‍🍳 小有成就',
      desc: '生成 10 道食谱',
      icon: '👨‍🍳',
      condition: (stats) => stats.totalCooks >= 10,
      reward: '解锁成就徽章',
    },
    'cook-50': {
      id: 'cook-50',
      name: '🏆 烹饪大师',
      desc: '生成 50 道食谱',
      icon: '🏆',
      condition: (stats) => stats.totalCooks >= 50,
      reward: '解锁成就徽章',
    },
    'cook-100': {
      id: 'cook-100',
      name: '👑 烹饪传奇',
      desc: '生成 100 道食谱',
      icon: '👑',
      condition: (stats) => stats.totalCooks >= 100,
      reward: '解锁成就徽章',
    },

    // 盲盒成就
    'first-gacha': {
      id: 'first-gacha',
      name: '🎁 初次抽奖',
      desc: '第一次打开盲盒',
      icon: '🎁',
      condition: (stats) => stats.totalGachas >= 1,
      reward: '解锁成就徽章',
    },
    'gacha-10': {
      id: 'gacha-10',
      name: '🎲 幸运儿',
      desc: '打开 10 次盲盒',
      icon: '🎲',
      condition: (stats) => stats.totalGachas >= 10,
      reward: '解锁成就徽章',
    },
    'gacha-50': {
      id: 'gacha-50',
      name: '💎 欧皇',
      desc: '打开 50 次盲盒',
      icon: '💎',
      condition: (stats) => stats.totalGachas >= 50,
      reward: '解锁成就徽章',
    },

    // 稀有度成就
    'rare-collector': {
      id: 'rare-collector',
      name: '⭐ 传奇收集家',
      desc: '收集 5 个传奇级物品',
      icon: '⭐',
      condition: (stats) => stats.rareCount >= 5,
      reward: '解锁成就徽章',
    },
    'epic-collector': {
      id: 'epic-collector',
      name: '🟣 史诗收集家',
      desc: '收集 10 个史诗级物品',
      icon: '🟣',
      condition: (stats) => stats.epicCount >= 10,
      reward: '解锁成就徽章',
    },

    // 模式成就
    'michelin-master': {
      id: 'michelin-master',
      name: '⭐ 米其林大师',
      desc: '生成 10 道米其林食谱',
      icon: '⭐',
      condition: (stats) => stats.modeCount?.michelin >= 10,
      reward: '解锁成就徽章',
    },
    'dark-chef': {
      id: 'dark-chef',
      name: '💀 暗黑料理王',
      desc: '生成 10 道暗黑料理',
      icon: '💀',
      condition: (stats) => stats.modeCount?.dark >= 10,
      reward: '解锁成就徽章',
    },
    'healing-master': {
      id: 'healing-master',
      name: '🌸 治愈系大师',
      desc: '生成 10 道治愈系食谱',
      icon: '🌸',
      condition: (stats) => stats.modeCount?.healing >= 10,
      reward: '解锁成就徽章',
    },
    'street-vendor': {
      id: 'street-vendor',
      name: '🏮 摆摊老炮儿',
      desc: '生成 10 道摆摊小吃',
      icon: '🏮',
      condition: (stats) => stats.modeCount?.street >= 10,
      reward: '解锁成就徽章',
    },

    // 分享成就
    'first-share': {
      id: 'first-share',
      name: '📸 分享达人',
      desc: '生成第一张分享图',
      icon: '📸',
      condition: (stats) => stats.totalShares >= 1,
      reward: '解锁成就徽章',
    },
    'share-10': {
      id: 'share-10',
      name: '📱 社交明星',
      desc: '生成 10 张分享图',
      icon: '📱',
      condition: (stats) => stats.totalShares >= 10,
      reward: '解锁成就徽章',
    },
  };

  /**
   * 加载成就数据
   */
  function loadAchievements() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  }

  /**
   * 保存成就数据
   */
  function saveAchievements(achievements) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(achievements));
  }

  /**
   * 获取用户统计数据
   */
  function getUserStats() {
    const cookCount = parseInt(localStorage.getItem('ai-kitchen-cook-count') || '0', 10);
    const gachaData = JSON.parse(localStorage.getItem('ai-kitchen-gacha') || '{"tickets":0,"inventory":[]}');
    const historyData = JSON.parse(localStorage.getItem('ai-kitchen-history') || '[]');

    // 统计稀有度
    let rareCount = 0, epicCount = 0;
    gachaData.inventory?.forEach(item => {
      if (item.rarity === 'rare') rareCount++;
      if (item.rarity === 'epic') epicCount++;
    });

    // 统计模式
    const modeCount = {};
    historyData.forEach(item => {
      modeCount[item.mode] = (modeCount[item.mode] || 0) + 1;
    });

    return {
      totalCooks: cookCount,
      totalGachas: gachaData.inventory?.length || 0,
      rareCount,
      epicCount,
      modeCount,
      totalShares: parseInt(localStorage.getItem('ai-kitchen-share-count') || '0', 10),
    };
  }

  /**
   * 检查并解锁成就
   */
  function checkAchievements() {
    const achievements = loadAchievements();
    const stats = getUserStats();
    const newAchievements = [];

    Object.values(ACHIEVEMENTS).forEach(achievement => {
      if (!achievements[achievement.id] && achievement.condition(stats)) {
        achievements[achievement.id] = {
          id: achievement.id,
          name: achievement.name,
          desc: achievement.desc,
          icon: achievement.icon,
          unlockedAt: new Date().toLocaleString('zh-CN'),
        };
        newAchievements.push(achievement);
      }
    });

    if (newAchievements.length > 0) {
      saveAchievements(achievements);
      newAchievements.forEach(ach => {
        showToast(`🏆 解锁成就：${ach.name}`);
      });
    }

    return newAchievements;
  }

  /**
   * 获取已解锁成就
   */
  function getAchievements() {
    return loadAchievements();
  }

  /**
   * 获取成就进度
   */
  function getAchievementProgress() {
    const achievements = loadAchievements();
    const stats = getUserStats();
    const progress = [];

    Object.values(ACHIEVEMENTS).forEach(achievement => {
      const isUnlocked = !!achievements[achievement.id];
      progress.push({
        ...achievement,
        isUnlocked,
        unlockedAt: achievements[achievement.id]?.unlockedAt,
      });
    });

    return progress;
  }

  /**
   * 渲染成就面板（页面模式）
   */
  function renderAchievementPanel() {
    const container = document.getElementById('achievements-page-content');
    if (!container) return;

    const progress = getAchievementProgress();
    const unlockedCount = progress.filter(p => p.isUnlocked).length;
    const totalCount = progress.length;

    container.innerHTML = `
      <div class="achievement-stats">
        <div class="achievement-stat">
          <div class="achievement-stat-value">${unlockedCount}</div>
          <div class="achievement-stat-label">已解锁</div>
        </div>
        <div class="achievement-stat">
          <div class="achievement-stat-value">${totalCount}</div>
          <div class="achievement-stat-label">总成就</div>
        </div>
        <div class="achievement-stat">
          <div class="achievement-stat-value">${Math.round((unlockedCount / totalCount) * 100)}%</div>
          <div class="achievement-stat-label">完成度</div>
        </div>
      </div>

      <div class="achievement-progress-bar">
        <div class="achievement-progress-fill" style="width: ${(unlockedCount / totalCount) * 100}%"></div>
      </div>

      <div class="achievement-grid">
        ${progress.map(ach => `
          <div class="achievement-item ${ach.isUnlocked ? 'unlocked' : 'locked'}">
            <div class="achievement-item-icon">${ach.icon}</div>
            <div class="achievement-item-name">${ach.name}</div>
            <div class="achievement-item-desc">${ach.desc}</div>
            ${ach.isUnlocked ? `
              <div class="achievement-item-date">${ach.unlockedAt}</div>
            ` : `
              <div class="achievement-item-locked">🔒 未解锁</div>
            `}
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * 切换标签
   */
  function switchAchievementTab(tab) {
    // TODO: 实现标签切换（全部/烹饪/盲盒/分享等）
    renderAchievementPanel();
  }

  return {
    checkAchievements,
    getAchievements,
    getAchievementProgress,
    renderAchievementPanel,
    switchAchievementTab,
  };
})();

window.AchievementModule = AchievementModule;
