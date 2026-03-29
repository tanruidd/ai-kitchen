/**
 * index.js — 盲盒系统 IIFE 入口（UI + 交互）
 *
 * 依赖：window.GachaData（data.js）、window.GachaStore（store.js）
 * 通过 window.GachaModule 暴露。
 */

const GachaModule = (() => {
  // ── 从 data.js 引入 ──
  const INGREDIENTS       = window.GachaData.INGREDIENTS;
  const LIMITED_RECIPES   = window.GachaData.LIMITED_RECIPES;
  const RARITY_CONFIG     = window.GachaData.RARITY_CONFIG;
  const GACHA_SYSTEM_PROMPT = window.GachaData.GACHA_SYSTEM_PROMPT;
  const CATEGORY_ORDER    = window.GachaData.CATEGORY_ORDER;

  // ── 从 store.js 引入 ──
  const loadGachaData           = window.GachaStore.loadGachaData;
  const saveGachaData           = window.GachaStore.saveGachaData;
  const loadGachaHistory        = window.GachaStore.loadGachaHistory;
  const saveGachaHistory        = window.GachaStore.saveGachaHistory;
  const saveGachaResult         = window.GachaStore.saveGachaResult;
  const canCookRecipe           = window.GachaStore.canCookRecipe;
  const getRecipeIngredientStatus = window.GachaStore.getRecipeIngredientStatus;
  const consumeIngredients      = window.GachaStore.consumeIngredients;
  const getRecipeOwnedCount     = window.GachaStore.getRecipeOwnedCount;
  const getCollectedCount       = window.GachaStore.getCollectedCount;
  const getTotalIngredientCount = window.GachaStore.getTotalIngredientCount;
  const addCookCount            = window.GachaStore.addCookCount;

  function weightedRandom(items) {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;
    for (const item of items) {
      random -= item.weight;
      if (random <= 0) return item;
    }
    return items[items.length - 1];
  }

  // 金币奖励池配置
  const COIN_PRIZES = [
    { min: 1,   max: 5,   weight: 35, label: '小红包', desc: '聊胜于无的小红包 🤏' },
    { min: 5,   max: 15,  weight: 30, label: '铜币袋', desc: '蟹老板偷偷塞的小铜币 💰' },
    { min: 15,  max: 30,  weight: 20, label: '银币袋', desc: '发财了发财了！✨' },
    { min: 30,  max: 80,  weight: 12, label: '金币袋', desc: '蟹堡王的神秘小金库 🏦' },
    { min: 80,  max: 200, weight: 3,  label: '宝箱！', desc: '传说中蟹堡王的私房钱！👑' },
  ];

  function drawGacha() {
    const data = loadGachaData();
    if (data.tickets <= 0) {
      showToast('🎁 没有盲盒卡券了，继续烹饪获得更多！');
      return null;
    }
    data.tickets -= 1;

    // 三种结果：食材 40%、食谱 25%、金币 35%
    const rand = Math.random();
    let result;

    if (rand < 0.4) {
      // 抽食材
      const rarityWeights = Object.entries(RARITY_CONFIG)
        .filter(([rarity]) => INGREDIENTS.some(ing => ing.rarity === rarity))
        .map(([rarity, config]) => ({ rarity, weight: config.weight }));
      const selectedRarity = weightedRandom(rarityWeights).rarity;
      const candidates = INGREDIENTS.filter(ing => ing.rarity === selectedRarity);
      result = { type: 'ingredient', data: candidates[Math.floor(Math.random() * candidates.length)], rarity: selectedRarity };
    } else if (rand < 0.65) {
      // 抽食谱
      const rarityWeights = Object.entries(RARITY_CONFIG)
        .filter(([rarity]) => LIMITED_RECIPES.some(recipe => recipe.rarity === rarity))
        .map(([rarity, config]) => ({ rarity, weight: config.weight }));
      const selectedRarity = weightedRandom(rarityWeights).rarity;
      const candidates = LIMITED_RECIPES.filter(recipe => recipe.rarity === selectedRarity);
      result = { type: 'recipe', data: candidates[Math.floor(Math.random() * candidates.length)], rarity: selectedRarity };
    } else {
      // 抽金币
      const prize = weightedRandom(COIN_PRIZES);
      const amount = Math.floor(Math.random() * (prize.max - prize.min + 1)) + prize.min;
      result = {
        type: 'coins',
        data: { amount, label: prize.label, desc: prize.desc },
        rarity: 'common',
      };
    }

    if (!result || !result.data) {
      console.error('盲盒抽奖异常：未能抽到有效物品', result);
      data.tickets += 1;
      saveGachaData(data);
      return null;
    }

    // 食材：增加持有计数
    if (result.type === 'ingredient' && data.ingredients) {
      data.ingredients[result.data.id] = (data.ingredients[result.data.id] || 0) + 1;
    }

    // 金币：直接加到账户
    if (result.type === 'coins') {
      AccountModule?.addCoins?.(result.data.amount);
    }

    result.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    result.timestamp = new Date().toLocaleString('zh-CN');
    data.inventory.push(result);
    saveGachaData(data);

    // 触发每日任务
    window.DailyTaskModule?.onGacha();
    if (result.rarity === 'rare' || result.rarity === 'epic' || result.rarity === 'legendary') {
      window.DailyTaskModule?.onGachaRarity(result.rarity);
    }

    // 增加经验
    window.LevelModule?.onGacha();
    if (result.rarity === 'rare' || result.rarity === 'epic' || result.rarity === 'legendary') {
      window.LevelModule?.onGachaRarity(result.rarity);
    }

    return result;
  }

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

  /* ═══════════════════════════════════════
     渲染：面板 & Tab
     ═══════════════════════════════════════ */

  function renderGachaPanel() {
    const data = loadGachaData();
    const container = document.getElementById('gacha-page-content');
    if (!container) return;

    container.innerHTML = `
      <div class="gacha-tabs">
        <button class="gacha-tab active" data-tab="draw">🎁 抽奖</button>
        <button class="gacha-tab" data-tab="inventory">🎒 食材</button>
        <button class="gacha-tab" data-tab="recipes">📜 食谱</button>
        <button class="gacha-tab" data-tab="shop">💳 商店</button>
      </div>
      <div class="gacha-content" id="gacha-content"></div>
    `;

    container.querySelectorAll('.gacha-tab').forEach(tab => {
      tab.addEventListener('click', function() { switchGachaTab(this.getAttribute('data-tab')); });
    });
    renderDrawTab(data);
  }

  function renderDrawTab(data) {
    const container = document.getElementById('gacha-content');
    if (!container) return;
    const coins = AccountModule?.getCoins?.() ?? 0;
    container.innerHTML = `
      <div class="gacha-draw-section">
        <div class="gacha-coins-strip">
          🪙 <strong>${coins}</strong> 金币
        </div>
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
          🍽️ 食材 40% · 📜 食谱 25% · 🪙 金币 35%<br/>
          💰 金币不够？去「偷菜」赚金币，再到商店购买盲盒券
        </div>
      </div>
    `;
  }

  function switchGachaTab(tab) {
    document.querySelectorAll('.gacha-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.gacha-tab[data-tab="${tab}"]`)?.classList.add('active');
    const data = loadGachaData();
    if (tab === 'draw') renderDrawTab(data);
    else if (tab === 'inventory') renderInventoryTab(data);
    else if (tab === 'recipes') renderRecipesTab();
    else if (tab === 'shop') renderShopTab(data);
  }

  /* ═══════════════════════════════════════
     渲染：食材图鉴（背包 Tab）
     ═══════════════════════════════════════ */

  function renderInventoryTab(data) {
    const container = document.getElementById('gacha-content');
    if (!container) return;

    const ingredients = data.ingredients || {};
    const collected = Object.values(ingredients).filter(v => v > 0).length;
    const total = INGREDIENTS.length;
    const pct = total > 0 ? Math.round(collected / total * 100) : 0;

    // 按品类分组
    const grouped = {};
    CATEGORY_ORDER.forEach(cat => { grouped[cat] = []; });
    INGREDIENTS.forEach(ing => {
      const cat = grouped[ing.category];
      if (cat) cat.push(ing);
    });

    let sectionsHtml = '';
    Object.entries(grouped).forEach(([cat, items]) => {
      if (items.length === 0) return;
      const catCollected = items.filter(i => (ingredients[i.id] || 0) > 0).length;
      sectionsHtml += `
        <div class="gacha-category-section">
          <div class="gacha-category-header">${cat} <span class="gacha-category-count">${catCollected}/${items.length}</span></div>
          <div class="gacha-category-grid">
            ${items.map(ing => {
              const count = ingredients[ing.id] || 0;
              const owned = count > 0;
              const cfg = RARITY_CONFIG[ing.rarity];
              return `
                <div class="gacha-ingredient-card ${owned ? 'owned' : 'locked'}" style="border-color: ${owned ? cfg.color : '#333'}">
                  <div class="gacha-ingredient-card-name">${owned ? ing.name : ing.name.replace(/^.\s*/, '🔒 ')}</div>
                  <div class="gacha-ingredient-card-rarity" style="color: ${owned ? cfg.color : '#555'}">${cfg.label}</div>
                  <div class="gacha-ingredient-card-price">¥${ing.price}</div>
                  ${owned ? `<div class="gacha-ingredient-card-count">×${count}</div>` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    });

    container.innerHTML = `
      <div class="gacha-collection-bar">
        <div class="gacha-collection-text">已收集 <strong>${collected}</strong> / ${total} 种食材</div>
        <div class="gacha-collection-progress">
          <div class="gacha-collection-fill" style="width:${pct}%"></div>
        </div>
        <div class="gacha-collection-pct">${pct}%</div>
      </div>
      <div class="gacha-inventory-body">
        ${sectionsHtml}
      </div>
    `;
  }

  /* ═══════════════════════════════════════
     渲染：食谱 Tab
     ═══════════════════════════════════════ */

  function renderRecipesTab() {
    const container = document.getElementById('gacha-content');
    if (!container) return;

    container.innerHTML = `
      <div class="gacha-recipes-list">
        ${LIMITED_RECIPES.map(recipe => {
          const cfg = RARITY_CONFIG[recipe.rarity] || RARITY_CONFIG.common;
          const owned = getRecipeOwnedCount(recipe.id);
          const total = (recipe.requiredIngredients || []).length;
          const canCook = owned === total && total > 0;
          return `
            <div class="gacha-recipe-record" onclick="GachaModule.showRecipeCard('${recipe.id}')">
              <div class="gacha-recipe-record-left">
                <div class="gacha-recipe-record-badge" style="background: ${cfg.color}">${cfg.label}</div>
                <div class="gacha-recipe-record-name">${recipe.name}</div>
                <div class="gacha-recipe-record-ingredients">
                  📦 ${owned}/${total} 种食材
                  ${canCook ? '<span class="gacha-recipe-cookable">🔥 可烹饪</span>' : ''}
                </div>
              </div>
              <div class="gacha-recipe-record-right">
                <span class="gacha-recipe-record-arrow">→</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
      <div class="gacha-recipes-footer">
        <div class="gacha-recipes-history-link">
          <button class="gacha-detail-back-btn" onclick="GachaModule.showRecipeHistory()">📜 烹饪记录</button>
        </div>
      </div>
    `;
  }

  /* ═══════════════════════════════════════
     渲染：食谱历史
     ═══════════════════════════════════════ */

  function showRecipeHistory() {
    const container = document.getElementById('gacha-page-content');
    if (!container) return;
    const history = loadGachaHistory();

    if (history.length === 0) {
      container.innerHTML = `
        <div class="gacha-recipe-detail">
          <button class="gacha-detail-back-btn" onclick="GachaModule.renderGachaPanel()">← 返回盲盒</button>
          <div class="gacha-empty" style="margin-top:40px">
            <span class="empty-icon">📜</span>
            还没有烹饪过盲盒食谱
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="gacha-recipe-detail">
        <button class="gacha-detail-back-btn" onclick="GachaModule.renderGachaPanel()">← 返回盲盒</button>
        <h3 style="margin:12px 0 16px;font-size:1.1rem">📜 烹饪记录</h3>
        <div class="gacha-recipes-list">
          ${history.map(item => {
            const cfg = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.common;
            return `
              <div class="gacha-recipe-record" onclick="GachaModule.showRecipeDetail('${item.id}')">
                <div class="gacha-recipe-record-left">
                  <div class="gacha-recipe-record-badge" style="background: ${cfg.color}">${cfg.label}</div>
                  <div class="gacha-recipe-record-name">${item.recipeName}</div>
                </div>
                <div class="gacha-recipe-record-right">
                  <span class="gacha-recipe-record-time">${item.time}</span>
                  <span class="gacha-recipe-record-arrow">→</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        <div class="gacha-recipes-footer">
          <button class="history-footer-btn danger" onclick="GachaModule.clearGachaHistory()">🗑️ 清空记录</button>
        </div>
      </div>
    `;
  }

  function showRecipeDetail(recordId) {
    const history = loadGachaHistory();
    const record = history.find(h => h.id === recordId);
    if (!record) { showToast('😱 记录不存在'); return; }

    const cfg = RARITY_CONFIG[record.rarity] || RARITY_CONFIG.common;
    const container = document.getElementById('gacha-page-content');
    if (!container) return;

    container.innerHTML = `
      <div class="gacha-recipe-detail">
        <div class="gacha-recipe-detail-header">
          <button class="gacha-detail-back-btn" onclick="GachaModule.showRecipeHistory()">← 返回记录</button>
          <div class="gacha-recipe-detail-meta">
            <span class="gacha-recipe-detail-badge" style="background: ${cfg.color}">${cfg.label}</span>
            <span class="gacha-recipe-detail-time">${record.time}</span>
          </div>
          <h2 class="gacha-recipe-detail-title">${record.recipeName}</h2>
        </div>
        <div class="gacha-result-content gacha-recipe-detail-body">
          ${marked.parse(record.output)}
        </div>
        <div class="gacha-recipe-detail-footer">
          <button class="gacha-result-share-btn" onclick="GachaModule.copyRecipeRecord('${record.id}')">📋 复制食谱</button>
        </div>
      </div>
    `;
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function copyRecipeRecord(recordId) {
    const record = loadGachaHistory().find(h => h.id === recordId);
    if (!record) return;
    navigator.clipboard.writeText(record.output)
      .then(() => showToast('📋 食谱已复制！'))
      .catch(() => showToast('复制失败'));
  }

  function clearGachaHistory() {
    const history = loadGachaHistory();
    if (history.length === 0) return;
    if (!confirm(`确定清空全部 ${history.length} 条盲盒食谱记录？`)) return;
    saveGachaHistory([]);
    showRecipeHistory();
    showToast('🗑️ 已清空');
  }

  /* ═══════════════════════════════════════
     渲染：商店 Tab
     ═══════════════════════════════════════ */

  function renderShopTab() {
    const container = document.getElementById('gacha-content');
    if (!container) return;
    const coins = AccountModule?.getCoins?.() ?? 0;
    const prices = { 1: 10, 5: 45, 10: 80 }; // 金币定价
    container.innerHTML = `
      <div class="gacha-shop">
        <div class="gacha-shop-coins">
          🪙 我的金币：<strong>${coins}</strong>
        </div>
        ${[1, 5, 10].map(n => `
          <div class="gacha-shop-item ${coins < prices[n] ? 'gacha-shop-item-disabled' : ''}">
            <div class="gacha-shop-item-header">
              <span class="gacha-shop-item-name">🎫 盲盒券 ×${n}</span>
              <span class="gacha-shop-item-price">🪙 ${prices[n]}</span>
            </div>
            <div class="gacha-shop-item-desc">
              获得 ${n} 张盲盒券
              ${n === 5 ? '（省 5 金币）' : n === 10 ? '（省 20 金币）' : ''}
            </div>
            <button class="gacha-shop-buy-btn ${coins < prices[n] ? 'disabled' : ''}"
              ${coins < prices[n] ? 'disabled' : ''}
              onclick="GachaModule.buyTickets(${n})">
              ${coins < prices[n] ? '金币不足' : '购买'}
            </button>
          </div>
        `).join('')}
        <div class="gacha-shop-tip">💡 盲盒券只能通过金币购买，快去偷菜赚钱吧！</div>
      </div>
    `;
  }

  /* ═══════════════════════════════════════
     抽奖流程 & 结果展示
     ═══════════════════════════════════════ */

  function performDraw() {
    const btn = document.querySelector('.gacha-draw-btn');
    if (!btn || btn.disabled) return;
    btn.disabled = true;
    btn.textContent = '✨ 正在开启...';

    const oldModal = document.querySelector('.gacha-recipe-card-modal');
    if (oldModal) oldModal.remove();

    setTimeout(() => {
      try {
        const result = drawGacha();
        if (!result) {
          btn.disabled = false;
          btn.textContent = '🎁 开启盲盒';
          showToast('🎁 没有卡券了，继续烹饪获得更多！');
          return;
        }
        showDrawResult(result);
        const ticketsEl = document.querySelector('.gacha-tickets-count');
        if (ticketsEl) {
          const data = loadGachaData();
          ticketsEl.textContent = data.tickets;
          btn.textContent = data.tickets > 0 ? '🎁 开启盲盒' : '🎁 没有卡券了';
          btn.disabled = data.tickets <= 0;
        }
      } catch (err) {
        console.error('抽奖失败:', err);
        btn.disabled = false;
        btn.textContent = '🎁 开启盲盒';
        showToast('😱 抽奖出错了，请重试！');
      }
    }, 1500);
  }

  /** 生成食材需求列表 HTML */
  function buildIngredientListHtml(recipeId) {
    const statusList = getRecipeIngredientStatus(recipeId);
    if (statusList.length === 0) return '';
    return `
      <div class="gacha-card-ingredients">
        <div class="gacha-card-ingredients-title">📝 所需食材</div>
        ${statusList.map(s => `
          <div class="gacha-ingredient-item ${s.owned ? 'owned' : 'missing'}">
            <span class="gacha-ingredient-status">${s.owned ? '✅' : '❌'}</span>
            <span class="gacha-ingredient-name">${s.name}</span>
            <span class="gacha-ingredient-info">${s.owned ? '持有 ×' + s.count : '未获得'}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  function showDrawResult(result) {
    const cfg = RARITY_CONFIG[result.rarity];
    const el = document.createElement('div');
    el.className = 'gacha-recipe-card-modal';

    let inner = `
      <div class="gacha-recipe-card" style="border-color: ${cfg.color}; box-shadow: 0 0 40px ${cfg.color}60">
        <div class="gacha-card-rarity" style="background: ${cfg.color}">${cfg.label}</div>
    `;

    if (result.type === 'ingredient') {
      inner += `
        <div class="gacha-card-icon">🍽️</div>
        <div class="gacha-card-name">${result.data.name}</div>
        <div class="gacha-card-desc">${result.data.desc}</div>
        ${result.data.price ? `<div class="gacha-card-price">💰 市场价 ¥${result.data.price}</div>` : ''}
        <div class="gacha-card-mystery">🌿 稀有食材 · 已存入背包</div>
        <div class="gacha-card-actions">
          <button class="gacha-card-save-btn" onclick="this.closest('.gacha-recipe-card-modal').remove()">✅ 我知道了</button>
        </div>
      `;
    } else if (result.type === 'coins') {
      inner += `
        <div class="gacha-coin-result-icon">🪙</div>
        <div class="gacha-coin-amount">+${result.data.amount} 金币</div>
        <div class="gacha-coin-desc">${result.data.label} — ${result.data.desc}</div>
        <div class="gacha-card-actions">
          <button class="gacha-card-save-btn" onclick="this.closest('.gacha-recipe-card-modal').remove()">💰 收下啦！</button>
        </div>
      `;
    } else {
      const recipeId = result.data.id;
      const statusList = getRecipeIngredientStatus(recipeId);
      const owned = statusList.filter(s => s.owned).length;
      const total = statusList.length;
      const canCook = owned === total && total > 0;

      inner += `
        <div class="gacha-card-icon">📜</div>
        <div class="gacha-card-name">${result.data.name}</div>
        <div class="gacha-card-desc">${result.data.desc}</div>
        <div class="gacha-card-story">"${result.data.story}"</div>
        <div class="gacha-recipe-progress-mini">📦 食材进度：${owned}/${total}</div>
        ${buildIngredientListHtml(recipeId)}
        <div class="gacha-card-mystery">🔮 神秘食谱 · 凑齐食材后烹饪</div>
        <div class="gacha-card-actions">
          ${canCook
            ? `<button class="gacha-card-cook-btn" onclick="GachaModule.startMysteryCooking('${recipeId}'); this.closest('.gacha-recipe-card-modal').remove()">🍳 立即烹饪</button>`
            : `<button class="gacha-card-save-btn disabled" disabled>🔒 还差 ${total - owned} 种食材</button>`
          }
          <button class="gacha-card-save-btn" onclick="this.closest('.gacha-recipe-card-modal').remove()">💾 稍后再做</button>
        </div>
      `;
    }

    inner += `<button class="gacha-card-close" onclick="this.closest('.gacha-recipe-card-modal').remove()">✕</button></div>`;
    el.innerHTML = inner;
    document.body.appendChild(el);
    el.classList.add('show');
  }

  function showRecipeCard(recipeId) {
    try {
      const oldModal = document.querySelector('.gacha-recipe-card-modal');
      if (oldModal) oldModal.remove();

      const recipe = LIMITED_RECIPES.find(r => r.id === recipeId);
      if (!recipe) { showToast('😱 食谱不存在'); return; }

      const cfg = RARITY_CONFIG[recipe.rarity];
      const statusList = getRecipeIngredientStatus(recipeId);
      const owned = statusList.filter(s => s.owned).length;
      const total = statusList.length;
      const canCook = owned === total && total > 0;

      const cardEl = document.createElement('div');
      cardEl.className = 'gacha-recipe-card-modal';
      cardEl.innerHTML = `
        <div class="gacha-recipe-card" style="border-color: ${cfg.color}; box-shadow: 0 0 40px ${cfg.color}60">
          <div class="gacha-card-rarity" style="background: ${cfg.color}">${cfg.label}</div>
          <div class="gacha-card-icon">📜</div>
          <div class="gacha-card-name">${recipe.name}</div>
          <div class="gacha-card-desc">${recipe.desc}</div>
          <div class="gacha-card-story">"${recipe.story}"</div>
          <div class="gacha-recipe-progress-mini">📦 食材进度：${owned}/${total}</div>
          ${buildIngredientListHtml(recipeId)}
          <div class="gacha-card-mystery">🔮 神秘食谱 · 凑齐食材后烹饪</div>
          <div class="gacha-card-actions">
            ${canCook
              ? `<button class="gacha-card-cook-btn" onclick="GachaModule.startMysteryCooking('${recipe.id}'); document.querySelector('.gacha-recipe-card-modal')?.remove()">🍳 立即烹饪</button>`
              : `<button class="gacha-card-save-btn disabled" disabled>🔒 还差 ${total - owned} 种食材</button>`
            }
            <button class="gacha-card-save-btn" onclick="document.querySelector('.gacha-recipe-card-modal')?.remove()">💾 关闭</button>
          </div>
          <button class="gacha-card-close" onclick="document.querySelector('.gacha-recipe-card-modal')?.remove()">✕</button>
        </div>
      `;
      document.body.appendChild(cardEl);
      requestAnimationFrame(() => { cardEl.classList.add('show'); });
    } catch (err) {
      console.error('showRecipeCard 错误:', err);
      showToast('😱 显示食谱卡失败');
    }
  }

  /* ═══════════════════════════════════════
     神秘烹饪（消耗食材 → API → 结果页）
     ═══════════════════════════════════════ */

  async function startMysteryCooking(recipeId) {
    const recipe = LIMITED_RECIPES.find(r => r.id === recipeId);
    if (!recipe) return;

    // 检查食材是否齐全
    if (!canCookRecipe(recipeId)) {
      const statusList = getRecipeIngredientStatus(recipeId);
      const missing = statusList.filter(s => !s.owned).map(s => s.name);
      showToast(`🔒 食材不足！还需要：${missing.join('、')}`);
      return;
    }

    // 消耗食材
    if (!consumeIngredients(recipeId)) {
      showToast('😱 食材消耗失败，请重试');
      return;
    }

    const cfg = RARITY_CONFIG[recipe.rarity];

    // 返回主页
    window.MenuModule?.goBack();

    // 显示加载动画
    const mysteryOverlay = document.createElement('div');
    mysteryOverlay.className = 'mystery-cooking-overlay';
    mysteryOverlay.id = 'mystery-overlay';
    mysteryOverlay.innerHTML = `
      <div class="mystery-cooking-content">
        <div class="mystery-cooking-icon">🔮</div>
        <div class="mystery-cooking-title">神秘料理正在施展...</div>
        <div class="mystery-cooking-recipe">${recipe.name}</div>
        <div class="mystery-cooking-progress"><div class="mystery-progress-bar"></div></div>
        <div class="mystery-cooking-hint">✨ 魔法即将完成...</div>
      </div>
    `;
    document.body.appendChild(mysteryOverlay);

    const progressBar = mysteryOverlay.querySelector('.mystery-progress-bar');
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress > 90) progress = 90;
      progressBar.style.width = progress + '%';
    }, 500);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'stepfun/step-3.5-flash:free',
          messages: [
            { role: 'system', content: GACHA_SYSTEM_PROMPT },
            { role: 'user', content: recipe.prompt },
          ],
          temperature: 0.95,
          max_tokens: 2500,
          stream: false,
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`API 错误 ${response.status}`);

      const data = await response.json();
      const fullText = data.choices?.[0]?.message?.content || '获取内容失败';

      clearInterval(progressInterval);
      progressBar.style.width = '100%';

      setTimeout(() => {
        mysteryOverlay.remove();
        showGachaResultPage(recipe, cfg, fullText);
      }, 800);

    } catch (err) {
      clearInterval(progressInterval);
      mysteryOverlay.remove();
      // 烹饪失败，退还食材
      const data = loadGachaData();
      recipe.requiredIngredients.forEach(id => {
        if (data.ingredients) data.ingredients[id] = (data.ingredients[id] || 0) + 1;
      });
      saveGachaData(data);
      showToast(`😱 神秘料理失败了：${err.message}（食材已退还）`);
    }
  }

  function showGachaResultPage(recipe, config, fullText) {
    window.SFX?.done();

    const container = document.querySelector('.container');
    if (container) container.style.display = 'none';

    const resultPage = document.createElement('div');
    resultPage.className = 'gacha-result-page';
    resultPage.innerHTML = `
      <div class="gacha-result-container">
        <div class="gacha-result-banner" style="background: linear-gradient(135deg, ${config.color} 0%, ${config.color}99 100%)">
          <div class="gacha-result-stars">${'⭐'.repeat(5 - ['common', 'uncommon', 'epic', 'rare'].indexOf(recipe.rarity))}</div>
          <div class="gacha-result-reveal-title">✨ 食谱已揭晓 ✨</div>
        </div>
        <div class="gacha-result-card-float">
          <div class="gacha-result-card-badge" style="background: ${config.color}">${config.label}</div>
          <div class="gacha-result-card-icon">🍽️</div>
          <div class="gacha-result-card-name">${recipe.name}</div>
        </div>
        <div class="gacha-result-content">${marked.parse(fullText)}</div>
        <div class="gacha-result-actions">
          <button class="gacha-result-share-btn" onclick="GachaModule.shareGachaResult()">📤 分享成果</button>
          <button class="gacha-result-back-btn" onclick="GachaModule.closeGachaResult()">🏠 返回首页</button>
        </div>
      </div>
    `;
    document.body.appendChild(resultPage);
    setTimeout(() => { resultPage.classList.add('show'); }, 100);

    saveGachaResult(recipe, recipe.rarity, fullText);
    // 全局排行榜已移除，改为好友排行榜
    window.FriendsModule?.updateFriendRank?.('cook', 1);
    window.AchievementModule?.checkAchievements();
    window._currentGachaResult = { recipe, config, fullText };
  }

  function closeGachaResult() {
    const resultPage = document.querySelector('.gacha-result-page');
    if (resultPage) {
      resultPage.classList.remove('show');
      setTimeout(() => resultPage.remove(), 300);
    }
    const container = document.querySelector('.container');
    if (container) container.style.display = 'block';
    window._currentGachaResult = null;
  }

  function shareGachaResult() {
    const { recipe, config, fullText } = window._currentGachaResult || {};
    if (!fullText) { showToast('分享内容不存在'); return; }
    const shareText = `🍳 ${recipe?.name || '神秘食谱'} [${config?.label || '稀有'}]\n\n${fullText}`;
    navigator.clipboard.writeText(shareText).then(() => showToast('📋 食谱已复制，快去分享吧！')).catch(() => showToast('分享失败'));
  }

  function buyTickets(count) {
    const price = count === 1 ? 10 : count === 5 ? 45 : 80;
    const coins = AccountModule?.getCoins?.() ?? 0;

    if (coins < price) {
      showToast('❌ 金币不足，快去偷菜赚钱吧！');
      return;
    }

    const ok = AccountModule?.deductCoins?.(price);
    if (!ok) {
      showToast('❌ 金币扣除失败');
      return;
    }

    const data = loadGachaData();
    data.tickets = (data.tickets || 0) + count;
    saveGachaData(data);
    updateGachaBadge();

    showToast(`✅ 购买成功！+${count} 张盲盒券`);
    // 刷新商店
    renderShopTab();
  }

  // 获取盲盒券数量
  function getCoupons() {
    const data = loadGachaData();
    return data.tickets || 0;
  }

  // 增加/减少盲盒券
  function addCoupons(amount) {
    const data = loadGachaData();
    data.tickets = Math.max(0, (data.tickets || 0) + amount);
    saveGachaData(data);
    updateGachaBadge();
    return data.tickets;
  }

  /* ═══════════════════════════════════════
     对外暴露
     ═══════════════════════════════════════ */
  return {
    addCookCount,
    drawGacha,
    performDraw,
    updateGachaBadge,
    switchGachaTab,
    showRecipeCard,
    showRecipeDetail,
    showRecipeHistory,
    copyRecipeRecord,
    clearGachaHistory,
    startMysteryCooking,
    closeGachaResult,
    shareGachaResult,
    buyTickets,
    renderGachaPanel,
    canCookRecipe,
    getRecipeIngredientStatus,
    getCollectedCount,
    getTotalIngredientCount,
    getCoupons,
    addCoupons,
  };
})();

window.GachaModule = GachaModule;
