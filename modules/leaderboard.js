/**
 * leaderboard.js — 排行榜系统
 *
 * 功能：
 * - 本地排行榜（基于 localStorage）
 * - 最受欢迎的食谱排行
 * - 用户成就排行
 * - 排行榜分享
 *
 * 对外暴露：
 *   LeaderboardModule.updateRecipeRank()    — 更新食谱排行
 *   LeaderboardModule.openLeaderboard()     — 打开排行榜面板
 *   LeaderboardModule.getTopRecipes()       — 获取热门食谱
 */

const LeaderboardModule = (() => {
  const RECIPE_RANK_KEY = 'ai-kitchen-recipe-rank';
  const USER_RANK_KEY = 'ai-kitchen-user-rank';

  /**
   * 加载食谱排行
   */
  function loadRecipeRank() {
    try {
      return JSON.parse(localStorage.getItem(RECIPE_RANK_KEY) || '{}');
    } catch {
      return {};
    }
  }

  /**
   * 保存食谱排行
   */
  function saveRecipeRank(rank) {
    localStorage.setItem(RECIPE_RANK_KEY, JSON.stringify(rank));
  }

  /**
   * 更新食谱排行（每次生成食谱时调用）
   */
  function updateRecipeRank(input, mode) {
    const rank = loadRecipeRank();
    const key = `${mode}:${input.slice(0, 50)}`;

    if (!rank[key]) {
      rank[key] = {
        input: input.slice(0, 100),
        mode,
        views: 0,
        likes: 0,
        shares: 0,
        createdAt: new Date().toISOString(),
      };
    }

    rank[key].views += 1;
    saveRecipeRank(rank);
  }

  /**
   * 获取热门食谱
   */
  function getTopRecipes(limit = 10) {
    const rank = loadRecipeRank();
    return Object.values(rank)
      .sort((a, b) => {
        // 按热度排序：views * 0.5 + likes * 1 + shares * 2
        const scoreA = a.views * 0.5 + a.likes * 1 + a.shares * 2;
        const scoreB = b.views * 0.5 + b.likes * 1 + b.shares * 2;
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  /**
   * 点赞食谱
   */
  function likeRecipe(key) {
    const rank = loadRecipeRank();
    if (rank[key]) {
      rank[key].likes += 1;
      saveRecipeRank(rank);
      return rank[key].likes;
    }
    return 0;
  }

  /**
   * 分享食谱
   */
  function shareRecipe(key) {
    const rank = loadRecipeRank();
    if (rank[key]) {
      rank[key].shares += 1;
      saveRecipeRank(rank);
      return rank[key].shares;
    }
    return 0;
  }

  /**
   * 打开排行榜面板
   */
  function openLeaderboard() {
    const panel = document.getElementById('leaderboard-panel');
    const overlay = document.getElementById('leaderboard-overlay');
    if (!panel) return;

    panel.classList.add('open');
    overlay.classList.add('show');
    renderLeaderboard();
  }

  /**
   * 关闭排行榜面板
   */
  function closeLeaderboard() {
    const panel = document.getElementById('leaderboard-panel');
    const overlay = document.getElementById('leaderboard-overlay');
    if (!panel) return;

    panel.classList.remove('open');
    overlay.classList.remove('show');
  }

  /**
   * 渲染排行榜
   */
  function renderLeaderboard() {
    const container = document.getElementById('leaderboard-content');
    if (!container) return;

    const topRecipes = getTopRecipes(20);

    if (topRecipes.length === 0) {
      container.innerHTML = `
        <div class="leaderboard-empty">
          <span class="empty-icon">📊</span>
          还没有排行数据，快去生成食谱吧！
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="leaderboard-list">
        ${topRecipes.map((recipe, index) => {
          const rank = index + 1;
          const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
          const score = recipe.views * 0.5 + recipe.likes * 1 + recipe.shares * 2;

          return `
            <div class="leaderboard-item">
              <div class="leaderboard-rank">${medal}</div>
              <div class="leaderboard-info">
                <div class="leaderboard-recipe">
                  <span class="leaderboard-mode">${window.MODE_LABELS[recipe.mode] || recipe.mode}</span>
                  <span class="leaderboard-input">${recipe.input}</span>
                </div>
                <div class="leaderboard-stats">
                  <span class="leaderboard-stat">👁️ ${recipe.views}</span>
                  <span class="leaderboard-stat">❤️ ${recipe.likes}</span>
                  <span class="leaderboard-stat">📤 ${recipe.shares}</span>
                  <span class="leaderboard-score">⭐ ${score.toFixed(1)}</span>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  /**
   * 切换标签
   */
  function switchLeaderboardTab(tab) {
    // TODO: 实现标签切换（全部/模式/时间等）
    renderLeaderboard();
  }

  return {
    updateRecipeRank,
    getTopRecipes,
    likeRecipe,
    shareRecipe,
    openLeaderboard,
    closeLeaderboard,
    switchLeaderboardTab,
  };
})();

window.LeaderboardModule = LeaderboardModule;
