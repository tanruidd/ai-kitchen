/**
 * daily-tasks.js — 每日任务系统
 *
 * 功能：
 * - 每日自动刷新 3 个随机任务
 * - 完成任务奖励盲盒券
 * - 任务进度追踪
 * - 0:00 自动重置
 *
 * 对外暴露：
 *   DailyTaskModule.init()              — 初始化（检查是否需要刷新）
 *   DailyTaskModule.renderTaskPage()    — 渲染任务页面
 *   DailyTaskModule.onCook(mode)        — 烹饪时调用
 *   DailyTaskModule.onGacha()           — 抽盲盒时调用
 *   DailyTaskModule.onGachaRarity(rarity) — 抽到稀有食材时调用
 *   DailyTaskModule.updateMenuBadge()   — 更新菜单角标
 */

const DailyTaskModule = (() => {
  const STORAGE_KEY = 'ai-kitchen-daily-tasks';

  // 任务模板池
  const TASK_POOL = [
    { id: 'cook-1', type: 'cook', target: 1, reward: 1, name: '初试身手', desc: '完成 1 次烹饪', icon: '🍳' },
    { id: 'cook-3', type: 'cook', target: 3, reward: 2, name: '小有成就', desc: '完成 3 次烹饪', icon: '👨‍🍳' },
    { id: 'cook-5', type: 'cook', target: 5, reward: 3, name: '烹饪达人', desc: '完成 5 次烹饪', icon: '🔥' },
    { id: 'gacha-1', type: 'gacha', target: 1, reward: 1, name: '试试手气', desc: '抽取 1 次盲盒', icon: '🎁' },
    { id: 'gacha-3', type: 'gacha', target: 3, reward: 2, name: '盲盒爱好者', desc: '抽取 3 次盲盒', icon: '📦' },
    { id: 'rare-1', type: 'rare', target: 1, reward: 2, name: '好运连连', desc: '抽到 1 个稀有或以上食材', icon: '✨' },
    { id: 'epic-1', type: 'epic', target: 1, reward: 3, name: '欧皇附体', desc: '抽到 1 个史诗或传说食材', icon: '🌟' },
    { id: 'mode-dark', type: 'mode', mode: 'dark', target: 1, reward: 2, name: '黑暗料理大师', desc: '用暗黑模式烹饪 1 次', icon: '💀' },
    { id: 'mode-michelin', type: 'mode', mode: 'michelin', target: 1, reward: 2, name: '米其林大厨', desc: '用米其林模式烹饪 1 次', icon: '⭐' },
    { id: 'mode-healing', type: 'mode', mode: 'healing', target: 1, reward: 1, name: '治愈系厨师', desc: '用治愈模式烹饪 1 次', icon: '🌸' },
    { id: 'mode-street', type: 'mode', mode: 'street', target: 1, reward: 1, name: '街头小贩', desc: '用摆摊模式烹饪 1 次', icon: '🏮' },
    { id: 'mode-squat', type: 'mode', mode: 'squat', target: 1, reward: 1, name: '蹲门学徒', desc: '用蹲门模式烹饪 1 次', icon: '🏠' },
  ];

  /**
   * 获取今日日期字符串 (YYYY-MM-DD)
   */
  function getTodayStr() {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * 加载任务数据
   */
  function loadData() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch {
      return null;
    }
  }

  /**
   * 保存任务数据
   */
  function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  /**
   * 随机选取 N 个任务
   */
  function pickRandomTasks(n) {
    const shuffled = [...TASK_POOL].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n).map(t => ({
      ...t,
      progress: 0,
      completed: false,
      claimed: false,
    }));
  }

  /**
   * 初始化 / 检查刷新
   */
  function init() {
    let data = loadData();
    const today = getTodayStr();

    if (!data || data.date !== today) {
      // 新的一天，重置任务
      data = {
        date: today,
        tasks: pickRandomTasks(3),
        stats: { cook: 0, gacha: 0, rare: 0, epic: 0 },
        modeCounts: {},
      };
      saveData(data);
    }

    updateMenuBadge();
    return data;
  }

  /**
   * 更新菜单角标
   */
  function updateMenuBadge() {
    const data = loadData();
    if (!data) return;

    // 计算已完成但未领取的任务数
    const unclaimed = data.tasks.filter(t => t.completed && !t.claimed).length;
    const badge = document.getElementById('menu-tasks-badge');

    if (badge) {
      if (unclaimed > 0) {
        badge.style.display = 'flex';
        badge.textContent = unclaimed;
      } else {
        badge.style.display = 'none';
      }
    }
  }

  /**
   * 烹饪时调用
   */
  function onCook(mode) {
    const data = loadData();
    if (!data) return;

    data.stats.cook = (data.stats.cook || 0) + 1;

    // 模式计数
    if (mode) {
      data.modeCounts[mode] = (data.modeCounts[mode] || 0) + 1;
    }

    // 更新任务进度
    data.tasks.forEach(task => {
      if (task.completed || task.claimed) return;

      if (task.type === 'cook') {
        task.progress = data.stats.cook;
        if (task.progress >= task.target) task.completed = true;
      }

      if (task.type === 'mode' && task.mode === mode) {
        task.progress = (task.progress || 0) + 1;
        if (task.progress >= task.target) task.completed = true;
      }
    });

    saveData(data);
    updateMenuBadge();
    renderTaskPage();
  }

  /**
   * 抽盲盒时调用
   */
  function onGacha() {
    const data = loadData();
    if (!data) return;

    data.stats.gacha = (data.stats.gacha || 0) + 1;

    data.tasks.forEach(task => {
      if (task.completed || task.claimed) return;
      if (task.type === 'gacha') {
        task.progress = data.stats.gacha;
        if (task.progress >= task.target) task.completed = true;
      }
    });

    saveData(data);
    updateMenuBadge();
    renderTaskPage();
  }

  /**
   * 抽到稀有食材时调用
   */
  function onGachaRarity(rarity) {
    const data = loadData();
    if (!data) return;

    if (rarity === 'rare' || rarity === 'epic' || rarity === 'legendary') {
      data.stats.rare = (data.stats.rare || 0) + 1;
    }
    if (rarity === 'epic' || rarity === 'legendary') {
      data.stats.epic = (data.stats.epic || 0) + 1;
    }

    data.tasks.forEach(task => {
      if (task.completed || task.claimed) return;

      if (task.type === 'rare' && (rarity === 'rare' || rarity === 'epic' || rarity === 'legendary')) {
        task.progress = (task.progress || 0) + 1;
        if (task.progress >= task.target) task.completed = true;
      }

      if (task.type === 'epic' && (rarity === 'epic' || rarity === 'legendary')) {
        task.progress = (task.progress || 0) + 1;
        if (task.progress >= task.target) task.completed = true;
      }
    });

    saveData(data);
    updateMenuBadge();
    renderTaskPage();
  }

  /**
   * 领取奖励
   */
  function claimReward(taskId) {
    const data = loadData();
    if (!data) return;

    const task = data.tasks.find(t => t.id === taskId);
    if (!task || !task.completed || task.claimed) return;

    // 发放盲盒券
    const gachaData = window.GachaStore?.loadGachaData?.();
    if (gachaData) {
      gachaData.tickets += task.reward;
      window.GachaStore?.saveGachaData?.(gachaData);
    }

    task.claimed = true;
    saveData(data);
    updateMenuBadge();
    renderTaskPage();

    // 增加经验
    window.LevelModule?.onTaskComplete();

    showToast(`🎉 获得 ${task.reward} 张盲盒券！`);
    window.SFX?.done();

    // 更新盲盒角标
    window.GachaModule?.updateGachaBadge?.();
  }

  /**
   * 渲染任务页面
   */
  function renderTaskPage() {
    const container = document.getElementById('tasks-page-content');
    if (!container) return;

    const data = init();

    container.innerHTML = `
      <div class="tasks-header">
        <div class="tasks-date">📅 ${data.date}</div>
        <div class="tasks-hint">每天 0:00 刷新，完成任务赚盲盒券</div>
      </div>

      <div class="tasks-list">
        ${data.tasks.map(task => {
          const progress = Math.min(task.progress, task.target);
          const percent = Math.floor((progress / task.target) * 100);
          const canClaim = task.completed && !task.claimed;
          const isDone = task.claimed;

          return `
            <div class="task-card ${isDone ? 'done' : ''} ${canClaim ? 'claimable' : ''}">
              <div class="task-icon">${task.icon}</div>
              <div class="task-info">
                <div class="task-name">${task.name}</div>
                <div class="task-desc">${task.desc}</div>
                <div class="task-progress-bar">
                  <div class="task-progress-fill" style="width: ${percent}%"></div>
                </div>
                <div class="task-progress-text">${progress} / ${task.target}</div>
              </div>
              <div class="task-reward">
                ${isDone ? '✅' : canClaim ? `
                  <button class="task-claim-btn" onclick="DailyTaskModule.claimReward('${task.id}')">
                    领取 ${task.reward} 券
                  </button>
                ` : `<span class="task-tickets">🎁 ×${task.reward}</span>`}
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <div class="tasks-tips">
        💡 提示：盲盒券可在"食材盲盒"中使用，抽取稀有食材！
      </div>
    `;
  }

  return {
    init,
    renderTaskPage,
    onCook,
    onGacha,
    onGachaRarity,
    claimReward,
    updateMenuBadge,
  };
})();

window.DailyTaskModule = DailyTaskModule;
