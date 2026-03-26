/**
 * gacha.js — 食材盲盒系统
 *
 * 功能：
 * - 每生成 3 道菜，获得 1 次盲盒抽奖机会
 * - 抽奖获得"食材"或"限定食谱"
 * - 支持付费购买盲盒卡券
 * - 盲盒食谱专属神秘流程
 * - 本地存储盲盒数据
 *
 * 对外暴露：
 *   GachaModule.addCookCount()     — 增加烹饪计数
 *   GachaModule.openGacha()        — 打开盲盒面板
 *   GachaModule.drawGacha()        — 执行抽奖
 *   GachaModule.updateGachaBadge() — 更新盲盒角标
 *   GachaModule.showRecipeCard()   — 显示神秘食谱卡片
 *   GachaModule.startMysteryCooking() — 开始神秘烹饪
 *   GachaModule.closeGachaResult() — 关闭盲盒结果页
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
  // 注意：prompt 不对用户展示，保持神秘感
  const LIMITED_RECIPES = [
    { id: 'recipe-michelin-pasta', name: '✨ 米其林黑松露意面', rarity: 'rare', desc: '黑松露与帕玛森芝士的完美邂逅', story: '传说这道菜源自意大利北部一个小村庄的百年老店...', prompt: '用黑松露、帕玛森芝士、新鲜意面创作一道米其林级别的意大利面。要求：精致、优雅、充满香气。' },
    { id: 'recipe-wagyu-steak', name: '🥩 和牛牛排大师班', rarity: 'rare', desc: '日本顶级和牛，火候精准的艺术', story: '在日本神户，有一位老匠人用一生研究牛排的火候...', prompt: '用顶级和牛创作一道完美的牛排。要求：火候精准、配菜精致、摆盘艺术。' },
    { id: 'recipe-foie-gras', name: '🦆 鹅肝盛宴', rarity: 'epic', desc: '法国经典美食的巅峰之作', story: '这道菜曾被法国国王路易十四赞为"天堂的味道"...', prompt: '用鹅肝创作一道法国经典菜。要求：高端、优雅、充满法式风情。' },
    { id: 'recipe-truffle-risotto', name: '🍚 松露烩饭', rarity: 'epic', desc: '香气四溢的松露与丝滑烩饭', story: '在米兰郊外的一座古堡里，藏着这道传世秘方...', prompt: '用松露油和意大利米创作一道奶油烩饭。要求：香气扑鼻、口感顺滑、米粒分明。' },
    { id: 'recipe-saffron-paella', name: '🍲 番红花海鲜饭', rarity: 'epic', desc: '西班牙国粹，金黄海洋盛宴', story: '瓦伦西亚的渔夫们用番红花染就了这道金色传奇...', prompt: '用番红花、海鲜、西班牙米创作一道西班牙海鲜饭。要求：色香味俱全、海鲜新鲜、米粒饱满。' },
    { id: 'recipe-miso-soup', name: '🍜 顶级味噌汤', rarity: 'uncommon', desc: '日本传统汤底的极致演绎', story: '京都的一座百年味噌作坊，藏着这份温暖的秘密...', prompt: '用顶级味噌创作一道日本传统汤。要求：鲜香、温暖、营养丰富。' },
    { id: 'recipe-olive-salad', name: '🥗 橄榄油沙拉', rarity: 'uncommon', desc: '地中海健康风情', story: '希腊橄榄园的女主人将阳光封进了这瓶油里...', prompt: '用特级初榨橄榄油创作一道地中海沙拉。要求：清爽、健康、橄榄油香气突出。' },
  ];

  // 盲盒专属系统提示词（生成更奢华的内容）
  const GACHA_SYSTEM_PROMPT = `你是一位神秘的美食大师，专门创作传说中的限定食谱。

【输出格式要求】
1. 使用 Markdown 格式输出
2. 第一行用 # 写菜名（要吸引眼球）
3. 必须包含以下章节（用 ## 分隔）：
   - ## 📖 传奇故事（这道菜的起源传说或灵感来源，2-3句话）
   - ## 🥄 品尝指南（最佳搭配、适合场景、氛围建议）
   - ## 🎨 摆盘艺术（主色调、点缀建议、器皿推荐）
   - ## 🥗 食材清单（精确用量）
   - ## 👨‍🍳 烹饪步骤（详细步骤，关键温度时间用**粗体**）
   - ## 🎲 隐藏彩蛋（一个创意变体或独门秘诀）
4. 全文使用中文回复
5. 多用 emoji 增加神秘感 ✨🌟💫
6. 语气要神秘、高级、充满仪式感
7. 段落之间空一行，保持优雅排版`;

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
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"tickets":0,"inventory":[]}');
      // 新用户初始 5 张卡券
      if (data.tickets === 0 && data.inventory.length === 0) {
        data.tickets = 5;
        saveGachaData(data);
      }
      return data;
    } catch {
      return { tickets: 5, inventory: [] };
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
        <button class="gacha-tab active" data-tab="draw">🎁 抽奖</button>
        <button class="gacha-tab" data-tab="inventory">🎒 背包</button>
        <button class="gacha-tab" data-tab="shop">💳 商店</button>
      </div>
      <div class="gacha-content" id="gacha-content"></div>
    `;

    // 直接给每个 Tab 按钮绑定点击事件
    const tabs = container.querySelectorAll('.gacha-tab');
    console.log('Found', tabs.length, 'gacha tabs');
    tabs.forEach(function(tab) {
      tab.addEventListener('click', function() {
        const tabName = this.getAttribute('data-tab');
        console.log('Tab clicked:', tabName, 'Text:', this.textContent);
        switchGachaTab(tabName);
      });
    });

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
                <button class="gacha-item-use-btn" onclick="GachaModule.showRecipeCard('${item.id}')">
                  📜 查看神秘食谱
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

    // 先移除可能存在的旧弹窗
    const oldModal = document.querySelector('.gacha-recipe-card-modal');
    if (oldModal) oldModal.remove();

    // 动画延迟
    setTimeout(() => {
      try {
        const result = drawGacha();
        if (!result) {
          btn.disabled = false;
          btn.textContent = '🎁 开启盲盒';
          showToast('🎁 没有卡券了，继续烹饪获得更多！');
          return;
        }

        // 显示抽奖结果
        showDrawResult(result);

        // 更新抽奖面板的卡券数
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

  /**
   * 显示抽奖结果
   */
  function showDrawResult(result) {
    const config = RARITY_CONFIG[result.rarity];
    const resultEl = document.createElement('div');
    resultEl.className = 'gacha-recipe-card-modal';
    resultEl.innerHTML = `
      <div class="gacha-recipe-card" style="border-color: ${config.color}; box-shadow: 0 0 40px ${config.color}60">
        <div class="gacha-card-rarity" style="background: ${config.color}">${config.label}</div>
        ${result.type === 'ingredient' ? `
          <div class="gacha-card-icon">🍽️</div>
          <div class="gacha-card-name">${result.data.name}</div>
          <div class="gacha-card-desc">${result.data.desc}</div>
          <div class="gacha-card-story">"${result.data.desc}，这是大自然的馈赠。"</div>
          <div class="gacha-card-mystery">🌿 稀有食材 · 已存入背包</div>
          <div class="gacha-card-actions">
            <button class="gacha-card-save-btn" onclick="this.closest('.gacha-recipe-card-modal').remove()">
              ✅ 我知道了
            </button>
          </div>
        ` : `
          <div class="gacha-card-icon">📜</div>
          <div class="gacha-card-name">${result.data.name}</div>
          <div class="gacha-card-desc">${result.data.desc}</div>
          <div class="gacha-card-story">"${result.data.story}"</div>
          <div class="gacha-card-mystery">🔮 神秘食谱 · 烹饪后揭晓完整内容</div>
          <div class="gacha-card-actions">
            <button class="gacha-card-cook-btn" onclick="GachaModule.startMysteryCooking('${result.data.id}'); this.closest('.gacha-recipe-card-modal').remove()">
              🍳 立即烹饪
            </button>
            <button class="gacha-card-save-btn" onclick="this.closest('.gacha-recipe-card-modal').remove()">
              💾 稍后再做
            </button>
          </div>
        `}
        <button class="gacha-card-close" onclick="this.closest('.gacha-recipe-card-modal').remove()">✕</button>
      </div>
    `;
    document.body.appendChild(resultEl);
    resultEl.classList.add('show');
  }

  /**
   * 展示食谱卡片（神秘模式，不显示 prompt）
   */
  function showRecipeCard(recipeId) {
    try {
      // 先移除可能存在的旧弹窗
      const oldModal = document.querySelector('.gacha-recipe-card-modal');
      if (oldModal) oldModal.remove();

      const recipe = LIMITED_RECIPES.find(r => r.id === recipeId);
      if (!recipe) {
        showToast('😱 食谱不存在');
        return;
      }

      const config = RARITY_CONFIG[recipe.rarity];
      const cardEl = document.createElement('div');
      cardEl.className = 'gacha-recipe-card-modal';
      cardEl.innerHTML = `
        <div class="gacha-recipe-card" style="border-color: ${config.color}; box-shadow: 0 0 40px ${config.color}60">
          <div class="gacha-card-rarity" style="background: ${config.color}">${config.label}</div>
          <div class="gacha-card-icon">📜</div>
          <div class="gacha-card-name">${recipe.name}</div>
          <div class="gacha-card-desc">${recipe.desc}</div>
          <div class="gacha-card-story">"${recipe.story}"</div>
          <div class="gacha-card-mystery">🔮 神秘食谱 · 烹饪后揭晓完整内容</div>
          <div class="gacha-card-actions">
            <button class="gacha-card-cook-btn" onclick="GachaModule.startMysteryCooking('${recipe.id}'); document.querySelector('.gacha-recipe-card-modal')?.remove()">
              🍳 立即烹饪
            </button>
            <button class="gacha-card-save-btn" onclick="document.querySelector('.gacha-recipe-card-modal')?.remove()">
              💾 稍后再做
            </button>
          </div>
          <button class="gacha-card-close" onclick="document.querySelector('.gacha-recipe-card-modal')?.remove()">✕</button>
        </div>
      `;
      document.body.appendChild(cardEl);
      
      // 延迟添加 show 类，确保 CSS 动画生效
      requestAnimationFrame(() => {
        cardEl.classList.add('show');
      });
    } catch (err) {
      console.error('showRecipeCard 错误:', err);
      showToast('😱 显示食谱卡失败');
    }
  }

  /**
   * 神秘烹饪（盲盒专属流程）
   * 先完整获取结果，再展示精美结果页
   */
  async function startMysteryCooking(recipeId) {
    const recipe = LIMITED_RECIPES.find(r => r.id === recipeId);
    if (!recipe) return;

    const config = RARITY_CONFIG[recipe.rarity];

    // 返回主页
    window.MenuModule?.goBack();

    // 显示神秘烹饪界面
    const mysteryOverlay = document.createElement('div');
    mysteryOverlay.className = 'mystery-cooking-overlay';
    mysteryOverlay.id = 'mystery-overlay';
    mysteryOverlay.innerHTML = `
      <div class="mystery-cooking-content">
        <div class="mystery-cooking-icon">🔮</div>
        <div class="mystery-cooking-title">神秘料理正在施展...</div>
        <div class="mystery-cooking-recipe">${recipe.name}</div>
        <div class="mystery-cooking-progress">
          <div class="mystery-progress-bar"></div>
        </div>
        <div class="mystery-cooking-hint">✨ 魔法即将完成...</div>
      </div>
    `;
    document.body.appendChild(mysteryOverlay);

    // 动画进度条
    const progressBar = mysteryOverlay.querySelector('.mystery-progress-bar');
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress > 90) progress = 90;
      progressBar.style.width = progress + '%';
    }, 500);

    try {
      // 调用 API（非流式）
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'stepfun/step-3.5-flash:free',
          messages: [
            { role: 'system', content: GACHA_SYSTEM_PROMPT },
            { role: 'user', content: recipe.prompt },
          ],
          temperature: 0.95,
          max_tokens: 2500,
          stream: false, // 显式禁用流式
        }),
      });

      if (!response.ok) {
        throw new Error(`API 错误 ${response.status}`);
      }

      // 获取完整结果
      const data = await response.json();
      const fullText = data.choices?.[0]?.message?.content || '获取内容失败';

      // 清除进度动画
      clearInterval(progressInterval);
      progressBar.style.width = '100%';

      // 显示揭晓动画
      setTimeout(() => {
        mysteryOverlay.remove();
        showGachaResultPage(recipe, config, fullText);
      }, 800);

    } catch (err) {
      clearInterval(progressInterval);
      mysteryOverlay.remove();
      showToast(`😱 神秘料理失败了：${err.message}`);
    }
  }

  /**
   * 展示盲盒结果页（精美独立页面）
   */
  function showGachaResultPage(recipe, config, fullText) {
    window.SFX?.done();

    // 隐藏主界面，显示结果页
    const container = document.querySelector('.container');
    if (container) container.style.display = 'none';

    // 创建结果页
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

        <div class="gacha-result-content">
          ${marked.parse(fullText)}
        </div>

        <div class="gacha-result-actions">
          <button class="gacha-result-share-btn" onclick="GachaModule.shareGachaResult()">
            📤 分享成果
          </button>
          <button class="gacha-result-back-btn" onclick="GachaModule.closeGachaResult()">
            🏠 返回首页
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(resultPage);

    // 动画入场
    setTimeout(() => {
      resultPage.classList.add('show');
    }, 100);

    // 保存到历史记录
    saveCurrentResult(`[盲盒·${config.label}] ${recipe.name}`, 'gacha', fullText);

    // 更新排行榜
    window.LeaderboardModule?.updateRecipeRank(recipe.name, 'gacha');

    // 检查成就
    window.AchievementModule?.checkAchievements();

    // 保存当前内容供分享使用
    window._currentGachaResult = { recipe, config, fullText };
  }

  /**
   * 关闭盲盒结果页，返回首页
   */
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

  /**
   * 分享盲盒结果
   */
  function shareGachaResult() {
    const { recipe, config, fullText } = window._currentGachaResult || {};
    if (!fullText) {
      showToast('分享内容不存在');
      return;
    }
    // 复制食谱内容到剪贴板
    const shareText = `🍳 ${recipe?.name || '神秘食谱'} [${config?.label || '稀有'}]\n\n${fullText}`;
    navigator.clipboard.writeText(shareText).then(() => {
      showToast('📋 食谱已复制，快去分享吧！');
    }).catch(() => {
      showToast('分享失败，请手动复制');
    });
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
    console.log('switchGachaTab called with:', tab);
    document.querySelectorAll('.gacha-tab').forEach(t => t.classList.remove('active'));
    const targetTab = document.querySelector(`.gacha-tab[data-tab="${tab}"]`);
    if (targetTab) {
      targetTab.classList.add('active');
      console.log('Switched to tab:', tab);
    } else {
      console.error('Tab not found:', tab);
    }

    const data = loadGachaData();
    console.log('Rendering tab content, inventory length:', data.inventory.length);
    if (tab === 'draw') renderDrawTab(data);
    else if (tab === 'inventory') {
      console.log('Calling renderInventoryTab...');
      renderInventoryTab(data);
    }
    else if (tab === 'shop') renderShopTab(data);
  }

  return {
    addCookCount,
    drawGacha,
    performDraw,
    updateGachaBadge,
    switchGachaTab,
    showRecipeCard,
    startMysteryCooking,
    closeGachaResult,
    shareGachaResult,
    buyTickets,
    renderGachaPanel,
  };
})();

window.GachaModule = GachaModule;
