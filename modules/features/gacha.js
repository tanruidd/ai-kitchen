/**
 * gacha.js — 食材盲盒系统
 *
 * 功能：
 * - 每生成 3 道菜，获得 1 次盲盒抽奖机会
 * - 抽奖获得"食材"或"限定食谱"
 * - 支持付费购买盲盒卡券
 * - 本地存储盲盒数据
 *
 * 对外暴露：
 *   GachaModule.addCookCount()     — 增加烹饪计数
 *   GachaModule.openGacha()        — 打开盲盒面板
 *   GachaModule.drawGacha()        — 执行抽奖
 *   GachaModule.updateGachaBadge() — 更新盲盒角标
 */

const GachaModule = (() => {
  const STORAGE_KEY = 'ai-kitchen-gacha';
  const COOK_COUNT_KEY = 'ai-kitchen-cook-count';
  const GACHA_INTERVAL = 3; // 每 3 次烹饪获得 1 次抽奖

  // 盲盒食材库
  const INGREDIENTS = [
    { id: 'rare-truffle', name: '🍄 黑松露', rarity: 'rare', desc: '米其林大厨的秘密武器' },
    { id: 'rare-saffron', name: '🌾 番红花', rarity: 'rare', desc: '世界上最贵的香料' },
    { id: 'rare-wagyu', name: '🥩 和牛', rarity: 'rare', desc: '日本顶级和牛' },
    { id: 'rare-caviar', name: '🥄 鱼子酱', rarity: 'rare', desc: '黑珍珠般的美味' },
    { id: 'epic-foie', name: '🦆 鹅肝', rarity: 'epic', desc: '法国美食的象征' },
    { id: 'epic-truffle-oil', name: '🫒 松露油', rarity: 'epic', desc: '提升任何菜的品质' },
    { id: 'epic-aged-balsamic', name: '🍶 陈年黑醋', rarity: 'epic', desc: '意大利的液体黄金' },
    { id: 'epic-morel', name: '🍄 羊肚菌', rarity: 'epic', desc: '春天的珍馐' },
    { id: 'uncommon-vanilla', name: '🌺 香草豆', rarity: 'uncommon', desc: '烘焙师的最爱' },
    { id: 'uncommon-miso', name: '🍯 顶级味噌', rarity: 'uncommon', desc: '日本传统发酵艺术' },
    { id: 'uncommon-olive', name: '🫒 特级初榨橄榄油', rarity: 'uncommon', desc: '地中海的液体黄金' },
    { id: 'uncommon-sea-salt', name: '🧂 法国海盐', rarity: 'uncommon', desc: '来自布列塔尼的精盐' },
    { id: 'common-honey', name: '🍯 蜂蜜', rarity: 'common', desc: '大自然的甜蜜礼物' },
    { id: 'common-garlic', name: '🧄 蒜', rarity: 'common', desc: '厨房的万能调料' },
    { id: 'common-ginger', name: '🫚 生姜', rarity: 'common', desc: '温暖的香料' },
  ];

  // 限定食谱（稀有度越高越容易出现）
  const LIMITED_RECIPES = [
    { id: 'recipe-michelin-pasta', name: '✨ 米其林黑松露意面', rarity: 'rare', desc: '黑松露与帕玛森芝士的完美邂逅，米其林级别的意式优雅', prompt: '用黑松露、帕玛森芝士、新鲜意面创作一道米其林级别的意大利面。要求：精致、优雅、充满香气。' },
    { id: 'recipe-wagyu-steak', name: '🥩 和牛牛排大师班', rarity: 'rare', desc: '日本顶级和牛，火候精准的艺术品级牛排', prompt: '用顶级和牛创作一道完美的牛排。要求：火候精准、配菜精致、摆盘艺术。' },
    { id: 'recipe-foie-gras', name: '🦆 鹅肝盛宴', rarity: 'epic', desc: '法国经典美食的巅峰，丝滑细腻的鹅肝体验', prompt: '用鹅肝创作一道法国经典菜。要求：高端、优雅、充满法式风情。' },
    { id: 'recipe-truffle-risotto', name: '🍚 松露烩饭', rarity: 'epic', desc: '香气四溢的松露与丝滑烩饭的绝妙组合', prompt: '用松露油和意大利米创作一道奶油烩饭。要求：香气扑鼻、口感顺滑、米粒分明。' },
    { id: 'recipe-saffron-paella', name: '🍲 番红花海鲜饭', rarity: 'epic', desc: '西班牙国粹，番红花染就的金黄海洋盛宴', prompt: '用番红花、海鲜、西班牙米创作一道西班牙海鲜饭。要求：色香味俱全、海鲜新鲜、米粒饱满。' },
    { id: 'recipe-miso-soup', name: '🍜 顶级味噌汤', rarity: 'uncommon', desc: '日本传统汤底的极致演绎，温暖入心', prompt: '用顶级味噌创作一道日本传统汤。要求：鲜香、温暖、营养丰富。' },
    { id: 'recipe-olive-salad', name: '🥗 橄榄油沙拉', rarity: 'uncommon', desc: '地中海健康风情，特级初榨橄榄油的清香', prompt: '用特级初榨橄榄油创作一道地中海沙拉。要求：清爽、健康、橄榄油香气突出。' },
  ];

  // 稀有度配置
  const RARITY_CONFIG = {
    common: { color: '#95a5a6', label: '普通', weight: 50 },
    uncommon: { color: '#27ae60', label: '不常见', weight: 30 },
    epic: { color: '#9b59b6', label: '史诗', weight: 15 },
    rare: { color: '#f39c12', label: '传奇', weight: 5 },
  };

  /**
   * 加载盲盒数据
   */
  function loadGachaData() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"tickets":0,"inventory":[]}');
    } catch {
      return { tickets: 0, inventory: [] };
    }
  }

  /**
   * 保存盲盒数据
   */
  function saveGachaData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    updateGachaBadge();
  }

  /**
   * 加载烹饪计数
   */
  function loadCookCount() {
    return parseInt(localStorage.getItem(COOK_COUNT_KEY) || '0', 10);
  }

  /**
   * 保存烹饪计数
   */
  function saveCookCount(count) {
    localStorage.setItem(COOK_COUNT_KEY, count.toString());
  }

  /**
   * 增加烹饪计数（每次生成食谱调用）
   */
  function addCookCount() {
    let count = loadCookCount();
    count += 1;
    saveCookCount(count);

    // 每 3 次获得 1 张盲盒卡券
    if (count % GACHA_INTERVAL === 0) {
      const data = loadGachaData();
      data.tickets += 1;
      saveGachaData(data);
      showToast(`🎁 获得盲盒卡券！已有 ${data.tickets} 张`);
      updateGachaBadge();
    }
  }

  /**
   * 根据权重随机抽取
   */
  function weightedRandom(items) {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;
    for (const item of items) {
      random -= item.weight;
      if (random <= 0) return item;
    }
    return items[items.length - 1];
  }

  /**
   * 执行抽奖
   */
  function drawGacha() {
    const data = loadGachaData();
    if (data.tickets <= 0) {
      showToast('🎁 没有盲盒卡券了，继续烹饪获得更多！');
      return null;
    }

    // 消耗一张卡券
    data.tickets -= 1;

    // 50% 概率抽食材，50% 概率抽限定食谱
    const isIngredient = Math.random() < 0.5;
    let result;

    if (isIngredient) {
      // 按稀有度权重抽食材
      const rarityWeights = Object.entries(RARITY_CONFIG).map(([rarity, config]) => ({
        rarity,
        weight: config.weight,
      }));
      const selectedRarity = weightedRandom(rarityWeights).rarity;
      const candidates = INGREDIENTS.filter(ing => ing.rarity === selectedRarity);
      result = {
        type: 'ingredient',
        data: candidates[Math.floor(Math.random() * candidates.length)],
        rarity: selectedRarity,
      };
    } else {
      // 按稀有度权重抽限定食谱
      const rarityWeights = Object.entries(RARITY_CONFIG).map(([rarity, config]) => ({
        rarity,
        weight: config.weight,
      }));
      const selectedRarity = weightedRandom(rarityWeights).rarity;
      const candidates = LIMITED_RECIPES.filter(recipe => recipe.rarity === selectedRarity);
      result = {
        type: 'recipe',
        data: candidates[Math.floor(Math.random() * candidates.length)],
        rarity: selectedRarity,
      };
    }

    // 添加到背包
    result.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    result.timestamp = new Date().toLocaleString('zh-CN');
    data.inventory.push(result);

    saveGachaData(data);
    return result;
  }

  /**
   * 更新盲盒角标
   */
  function updateGachaBadge() {
    const data = loadGachaData();
    const badge = document.getElementById('gacha-count');
    if (!badge) return;

    if (data.tickets > 0) {
      badge.textContent = data.tickets > 99 ? '99+' : data.tickets;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  /**
   * 渲染盲盒面板（页面模式）
   */
  function renderGachaPanel() {
    const data = loadGachaData();
    const container = document.getElementById('gacha-page-content');
    if (!container) return;

    container.innerHTML = `
      <div class="gacha-tabs">
        <button class="gacha-tab active" data-tab="draw" onclick="GachaModule.switchGachaTab('draw')">🎁 抽奖</button>
        <button class="gacha-tab" data-tab="inventory" onclick="GachaModule.switchGachaTab('inventory')">🎒 背包</button>
        <button class="gacha-tab" data-tab="shop" onclick="GachaModule.switchGachaTab('shop')">💳 商店</button>
      </div>
      <div class="gacha-content" id="gacha-content"></div>
    `;

    renderDrawTab(data);
  }

  /**
   * 渲染抽奖 Tab
   */
  function renderDrawTab(data) {
    const container = document.getElementById('gacha-content');
    if (!container) return;

    container.innerHTML = `
      <div class="gacha-draw-section">
        <div class="gacha-tickets-display">
          <div class="gacha-tickets-count">${data.tickets}</div>
          <div class="gacha-tickets-label">张卡券</div>
        </div>
        <button class="gacha-draw-btn ${data.tickets > 0 ? '' : 'disabled'}"
          onclick="GachaModule.performDraw()"
          ${data.tickets > 0 ? '' : 'disabled'}>
          ${data.tickets > 0 ? '🎁 开启盲盒' : '🎁 没有卡券了'}
        </button>
        <div class="gacha-tips">
          💡 每生成 3 道菜获得 1 张盲盒卡券<br/>
          🎁 盲盒内可能获得稀有食材或限定食谱<br/>
          💳 也可以在商店购买卡券
        </div>
      </div>
    `;
  }

  /**
   * 渲染背包 Tab
   */
  function renderInventoryTab(data) {
    const container = document.getElementById('gacha-content');
    if (!container) return;

    if (data.inventory.length === 0) {
      container.innerHTML = `
        <div class="gacha-empty">
          <span class="empty-icon">🎁</span>
          背包是空的，快去抽奖吧！
        </div>
      `;
      return;
    }

    const grouped = {};
    data.inventory.forEach(item => {
      const key = item.type === 'ingredient' ? item.data.id : item.data.id;
      if (!grouped[key]) {
        grouped[key] = { item: item.data, type: item.type, rarity: item.rarity, count: 0 };
      }
      grouped[key].count += 1;
    });

    container.innerHTML = `
      <div class="gacha-inventory">
        ${Object.entries(grouped).map(([key, { item, type, rarity, count }]) => {
          const config = RARITY_CONFIG[rarity];
          return `
            <div class="gacha-inventory-item" style="border-color: ${config.color}">
              <div class="gacha-item-header">
                <span class="gacha-item-name">${item.name}</span>
                <span class="gacha-item-rarity" style="color: ${config.color}">${config.label}</span>
              </div>
              <div class="gacha-item-desc">${item.desc}</div>
              <div class="gacha-item-count">×${count}</div>
              ${type === 'recipe' ? `
                <button class="gacha-item-use-btn" onclick="GachaModule.useRecipe('${item.id}')">
                  🍳 使用食谱
                </button>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  /**
   * 渲染商店 Tab
   */
  function renderShopTab(data) {
    const container = document.getElementById('gacha-content');
    if (!container) return;

    container.innerHTML = `
      <div class="gacha-shop">
        <div class="gacha-shop-item">
          <div class="gacha-shop-item-header">
            <span class="gacha-shop-item-name">🎁 单张盲盒卡券</span>
            <span class="gacha-shop-item-price">¥0.99</span>
          </div>
          <div class="gacha-shop-item-desc">获得 1 张盲盒卡券，可抽取稀有食材或限定食谱</div>
          <button class="gacha-shop-buy-btn" onclick="GachaModule.buyTickets(1)">购买</button>
        </div>

        <div class="gacha-shop-item">
          <div class="gacha-shop-item-header">
            <span class="gacha-shop-item-name">🎁 盲盒 5 连</span>
            <span class="gacha-shop-item-price">¥3.99</span>
          </div>
          <div class="gacha-shop-item-desc">获得 5 张盲盒卡券，享受 20% 优惠</div>
          <button class="gacha-shop-buy-btn" onclick="GachaModule.buyTickets(5)">购买</button>
        </div>

        <div class="gacha-shop-item">
          <div class="gacha-shop-item-header">
            <span class="gacha-shop-item-name">🎁 盲盒 10 连</span>
            <span class="gacha-shop-item-price">¥6.99</span>
          </div>
          <div class="gacha-shop-item-desc">获得 10 张盲盒卡券，享受 30% 优惠</div>
          <button class="gacha-shop-buy-btn" onclick="GachaModule.buyTickets(10)">购买</button>
        </div>
      </div>
    `;
  }

  /**
   * 执行抽奖动画
   */
  function performDraw() {
    const btn = document.querySelector('.gacha-draw-btn');
    if (!btn || btn.disabled) return;

    btn.disabled = true;
    btn.textContent = '✨ 正在开启...';

    // 动画延迟
    setTimeout(() => {
      const result = drawGacha();
      if (!result) {
        btn.disabled = false;
        btn.textContent = '🎁 开启盲盒';
        return;
      }

      // 显示抽奖结果
      showDrawResult(result);
      renderGachaPanel();
      btn.disabled = false;
      btn.textContent = '🎁 开启盲盒';
    }, 1500);
  }

  /**
   * 显示抽奖结果
   */
  function showDrawResult(result) {
    const config = RARITY_CONFIG[result.rarity];
    const resultEl = document.createElement('div');
    resultEl.className = 'gacha-result-modal';
    resultEl.innerHTML = `
      <div class="gacha-result-card" style="border-color: ${config.color}; box-shadow: 0 0 30px ${config.color}80">
        <div class="gacha-result-rarity" style="background: ${config.color}">${config.label}</div>
        <div class="gacha-result-content">
          ${result.type === 'ingredient' ? `
            <div class="gacha-result-icon">🍄</div>
            <div class="gacha-result-name">${result.data.name}</div>
            <div class="gacha-result-desc">${result.data.desc}</div>
          ` : `
            <div class="gacha-result-icon">🍳</div>
            <div class="gacha-result-name">${result.data.name}</div>
            <div class="gacha-result-desc">${result.data.desc}</div>
            <button class="gacha-result-use-btn" onclick="GachaModule.useRecipe('${result.data.id}'); this.closest('.gacha-result-modal').remove()">
              🍳 立即使用
            </button>
          `}
        </div>
        <button class="gacha-result-close" onclick="this.closest('.gacha-result-modal').remove()">✕</button>
      </div>
    `;
    document.body.appendChild(resultEl);
    resultEl.classList.add('show');
  }

  /**
   * 使用限定食谱
   */
  function useRecipe(recipeId) {
    const recipe = LIMITED_RECIPES.find(r => r.id === recipeId);
    if (!recipe) return;

    // 填充输入框
    document.getElementById('user-input').value = recipe.prompt;
    // 切换到米其林模式
    const michelin = document.querySelector('.mode-btn[data-mode="michelin"]');
    if (michelin) michelin.click();

    // 返回主页
    window.MenuModule?.goBack();
    showToast(`🍳 已加载限定食谱：${recipe.name}`);
  }

  /**
   * 购买盲盒卡券（模拟）
   */
  function buyTickets(count) {
    showToast(`💳 跳转到支付页面... (购买 ${count} 张卡券)`);
    // TODO: 接入微信支付
  }

  /**
   * 切换 Tab
   */
  function switchGachaTab(tab) {
    document.querySelectorAll('.gacha-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.gacha-tab[data-tab="${tab}"]`)?.classList.add('active');

    const data = loadGachaData();
    if (tab === 'draw') renderDrawTab(data);
    else if (tab === 'inventory') renderInventoryTab(data);
    else if (tab === 'shop') renderShopTab(data);
  }

  return {
    addCookCount,
    drawGacha,
    performDraw,
    updateGachaBadge,
    switchGachaTab,
    useRecipe,
    buyTickets,
    renderGachaPanel,
  };
})();

window.GachaModule = GachaModule;
