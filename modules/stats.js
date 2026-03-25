/**
 * stats.js — 用户统计面板
 *
 * 功能：
 * - 用户数据统计（烹饪次数、盲盒次数、成就数等）
 * - 数据可视化（图表、进度条）
 * - 数据导出（JSON、CSV）
 * - 数据清空
 *
 * 对外暴露：
 *   StatsModule.openStats()      — 打开统计面板
 *   StatsModule.exportData()     — 导出用户数据
 *   StatsModule.clearAllData()   — 清空所有数据
 */

const StatsModule = (() => {
  /**
   * 获取用户统计数据
   */
  function getUserStats() {
    const cookCount = parseInt(localStorage.getItem('ai-kitchen-cook-count') || '0', 10);
    const gachaData = JSON.parse(localStorage.getItem('ai-kitchen-gacha') || '{"tickets":0,"inventory":[]}');
    const historyData = JSON.parse(localStorage.getItem('ai-kitchen-history') || '[]');
    const achievements = JSON.parse(localStorage.getItem('ai-kitchen-achievements') || '{}');
    const recipeRank = JSON.parse(localStorage.getItem('ai-kitchen-recipe-rank') || '{}');

    // 统计模式
    const modeCount = {};
    historyData.forEach(item => {
      modeCount[item.mode] = (modeCount[item.mode] || 0) + 1;
    });

    // 统计稀有度
    let rareCount = 0, epicCount = 0, uncommonCount = 0, commonCount = 0;
    gachaData.inventory?.forEach(item => {
      if (item.rarity === 'rare') rareCount++;
      else if (item.rarity === 'epic') epicCount++;
      else if (item.rarity === 'uncommon') uncommonCount++;
      else if (item.rarity === 'common') commonCount++;
    });

    // 计算总热度
    let totalViews = 0, totalLikes = 0, totalShares = 0;
    Object.values(recipeRank).forEach(recipe => {
      totalViews += recipe.views || 0;
      totalLikes += recipe.likes || 0;
      totalShares += recipe.shares || 0;
    });

    return {
      totalCooks: cookCount,
      totalGachas: gachaData.inventory?.length || 0,
      totalTickets: gachaData.tickets || 0,
      totalHistory: historyData.length,
      totalAchievements: Object.keys(achievements).length,
      totalRecipes: Object.keys(recipeRank).length,
      modeCount,
      rareCount,
      epicCount,
      uncommonCount,
      commonCount,
      totalViews,
      totalLikes,
      totalShares,
      createdAt: localStorage.getItem('ai-kitchen-created-at') || new Date().toISOString(),
    };
  }

  /**
   * 渲染统计面板（页面模式）
   */
  function renderStatsPanel() {
    const container = document.getElementById('stats-page-content');
    if (!container) return;

    const stats = getUserStats();

    container.innerHTML = `
      <div class="stats-overview">
        <div class="stats-card">
          <div class="stats-card-icon">🍳</div>
          <div class="stats-card-value">${stats.totalCooks}</div>
          <div class="stats-card-label">生成食谱</div>
        </div>
        <div class="stats-card">
          <div class="stats-card-icon">🎁</div>
          <div class="stats-card-value">${stats.totalGachas}</div>
          <div class="stats-card-label">盲盒抽奖</div>
        </div>
        <div class="stats-card">
          <div class="stats-card-icon">🏆</div>
          <div class="stats-card-value">${stats.totalAchievements}</div>
          <div class="stats-card-label">解锁成就</div>
        </div>
        <div class="stats-card">
          <div class="stats-card-icon">👁️</div>
          <div class="stats-card-value">${stats.totalViews}</div>
          <div class="stats-card-label">总浏览量</div>
        </div>
      </div>

      <div class="stats-section">
        <h4>📊 烹饪模式分布</h4>
        <div class="stats-mode-chart">
          ${Object.entries(stats.modeCount).map(([mode, count]) => {
            const total = stats.totalCooks || 1;
            const percentage = Math.round((count / total) * 100);
            return `
              <div class="stats-mode-item">
                <div class="stats-mode-label">${window.MODE_LABELS[mode] || mode}</div>
                <div class="stats-mode-bar">
                  <div class="stats-mode-fill" style="width: ${percentage}%"></div>
                </div>
                <div class="stats-mode-value">${count} (${percentage}%)</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div class="stats-section">
        <h4>💎 稀有度分布</h4>
        <div class="stats-rarity-chart">
          <div class="stats-rarity-item">
            <span class="stats-rarity-label">🟡 传奇</span>
            <span class="stats-rarity-value">${stats.rareCount}</span>
          </div>
          <div class="stats-rarity-item">
            <span class="stats-rarity-label">🟣 史诗</span>
            <span class="stats-rarity-value">${stats.epicCount}</span>
          </div>
          <div class="stats-rarity-item">
            <span class="stats-rarity-label">🟢 不常见</span>
            <span class="stats-rarity-value">${stats.uncommonCount}</span>
          </div>
          <div class="stats-rarity-item">
            <span class="stats-rarity-label">⚫ 普通</span>
            <span class="stats-rarity-value">${stats.commonCount}</span>
          </div>
        </div>
      </div>

      <div class="stats-section">
        <h4>📈 社交互动</h4>
        <div class="stats-social">
          <div class="stats-social-item">
            <span class="stats-social-icon">❤️</span>
            <span class="stats-social-label">点赞</span>
            <span class="stats-social-value">${stats.totalLikes}</span>
          </div>
          <div class="stats-social-item">
            <span class="stats-social-icon">📤</span>
            <span class="stats-social-label">分享</span>
            <span class="stats-social-value">${stats.totalShares}</span>
          </div>
          <div class="stats-social-item">
            <span class="stats-social-icon">📜</span>
            <span class="stats-social-label">历史记录</span>
            <span class="stats-social-value">${stats.totalHistory}</span>
          </div>
        </div>
      </div>

      <div class="stats-actions">
        <button class="stats-action-btn" onclick="StatsModule.exportDataAsJSON()">
          📥 导出 JSON
        </button>
        <button class="stats-action-btn" onclick="StatsModule.exportDataAsCSV()">
          📊 导出 CSV
        </button>
        <button class="stats-action-btn danger" onclick="StatsModule.clearAllData()">
          🗑️ 清空数据
        </button>
      </div>
    `;
  }

  /**
   * 导出为 JSON
   */
  function exportDataAsJSON() {
    const stats = getUserStats();
    const data = {
      stats,
      history: JSON.parse(localStorage.getItem('ai-kitchen-history') || '[]'),
      gacha: JSON.parse(localStorage.getItem('ai-kitchen-gacha') || '{}'),
      achievements: JSON.parse(localStorage.getItem('ai-kitchen-achievements') || '{}'),
      recipeRank: JSON.parse(localStorage.getItem('ai-kitchen-recipe-rank') || '{}'),
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ai-kitchen-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    showToast('📥 数据已导出为 JSON');
  }

  /**
   * 导出为 CSV
   */
  function exportDataAsCSV() {
    const stats = getUserStats();
    const history = JSON.parse(localStorage.getItem('ai-kitchen-history') || '[]');

    let csv = '食谱数据导出\n\n';
    csv += '统计数据\n';
    csv += `生成食谱,${stats.totalCooks}\n`;
    csv += `盲盒抽奖,${stats.totalGachas}\n`;
    csv += `解锁成就,${stats.totalAchievements}\n`;
    csv += `总浏览量,${stats.totalViews}\n\n`;

    csv += '历史记录\n';
    csv += '时间,模式,输入,摘要\n';
    history.forEach(item => {
      const summary = item.output.slice(0, 50).replace(/\n/g, ' ');
      csv += `"${item.time}","${item.mode}","${item.input}","${summary}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ai-kitchen-data-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    showToast('📊 数据已导出为 CSV');
  }

  /**
   * 清空所有数据
   */
  function clearAllData() {
    if (!confirm('⚠️ 确定要清空所有数据吗？此操作不可撤销！')) return;

    localStorage.removeItem('ai-kitchen-cook-count');
    localStorage.removeItem('ai-kitchen-gacha');
    localStorage.removeItem('ai-kitchen-history');
    localStorage.removeItem('ai-kitchen-achievements');
    localStorage.removeItem('ai-kitchen-recipe-rank');
    localStorage.removeItem('ai-kitchen-last-read');

    showToast('🗑️ 所有数据已清空');
    renderStatsPanel();
  }

  return {
    getUserStats,
    renderStatsPanel,
    exportDataAsJSON,
    exportDataAsCSV,
    clearAllData,
  };
})();

window.StatsModule = StatsModule;
