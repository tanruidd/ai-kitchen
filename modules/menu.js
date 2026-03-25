/**
 * menu.js — 主菜单系统
 *
 * 功能：
 * - 统一的菜单入口
 * - 页面切换（主页 ↔ 功能页）
 * - 平滑过渡动画
 *
 * 对外暴露：
 *   MenuModule.toggleMenu()      — 打开/关闭菜单
 *   MenuModule.navigateTo(page)  — 导航到指定页面
 *   MenuModule.goBack()           — 返回主页
 */

const MenuModule = (() => {
  let currentPage = 'main';

  /**
   * 打开/关闭菜单
   */
  function toggleMenu() {
    const menu = document.getElementById('main-menu');
    const overlay = document.getElementById('menu-overlay');

    if (menu.classList.contains('open')) {
      closeMenu();
    } else {
      menu.classList.add('open');
      overlay.classList.add('show');
    }
  }

  /**
   * 关闭菜单
   */
  function closeMenu() {
    const menu = document.getElementById('main-menu');
    const overlay = document.getElementById('menu-overlay');

    menu.classList.remove('open');
    overlay.classList.remove('show');
  }

  /**
   * 导航到指定页面
   */
  function navigateTo(page) {
    closeMenu();
    currentPage = page;

    // 隐藏所有页面
    document.querySelectorAll('.app-page').forEach(p => {
      p.classList.remove('active');
    });

    // 显示目标页面
    const targetPage = document.getElementById(`page-${page}`);
    if (targetPage) {
      targetPage.classList.add('active');
    }

    // 显示返回按钮
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
      backBtn.style.display = page === 'main' ? 'none' : 'flex';
    }

    // 更新页面标题
    updatePageTitle(page);

    // 触发页面初始化
    initPage(page);
  }

  /**
   * 返回主页
   */
  function goBack() {
    navigateTo('main');
  }

  /**
   * 更新页面标题
   */
  function updatePageTitle(page) {
    const titles = {
      'main': '美味创意 AI 厨房',
      'gacha': '🎁 食材盲盒',
      'achievements': '🏆 成就系统',
      'leaderboard': '📊 排行榜',
      'stats': '📈 数据统计',
      'settings': '⚙️ 设置',
    };

    document.title = titles[page] || '美味创意 AI 厨房';
  }

  /**
   * 初始化页面内容
   */
  function initPage(page) {
    switch (page) {
      case 'gacha':
        window.GachaModule?.renderGachaPanel?.();
        break;
      case 'achievements':
        window.AchievementModule?.renderAchievementPanel?.();
        break;
      case 'leaderboard':
        window.LeaderboardModule?.renderLeaderboard?.();
        break;
      case 'stats':
        window.StatsModule?.renderStatsPanel?.();
        break;
    }
  }

  /**
   * 获取当前页面
   */
  function getCurrentPage() {
    return currentPage;
  }

  return {
    toggleMenu,
    closeMenu,
    navigateTo,
    goBack,
    getCurrentPage,
  };
})();

window.MenuModule = MenuModule;
