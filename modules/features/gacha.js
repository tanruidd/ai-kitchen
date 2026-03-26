/**
 * gacha.js — 食材盲盒系统
 *
 * 功能：
 * - 每生成 3 道菜，获得 1 次盲盒抽奖机会
 * - 抽奖获得"食材"或"限定食谱"
 * - 食谱需要对应食材才能烹饪，烹饪后食材消耗
 * - 支持付费购买盲盒卡券
 * - 盲盒食谱专属神秘流程
 * - 本地存储盲盒数据
 *
 * 对外暴露：
 *   GachaModule.addCookCount()          — 增加烹饪计数
 *   GachaModule.drawGacha()            — 执行抽奖
 *   GachaModule.performDraw()          — 抽奖动画
 *   GachaModule.updateGachaBadge()     — 更新盲盒角标
 *   GachaModule.showRecipeCard(id)     — 显示食谱卡片
 *   GachaModule.startMysteryCooking(id)— 开始神秘烹饪
 *   GachaModule.closeGachaResult()     — 关闭结果页
 *   GachaModule.renderGachaPanel()     — 渲染面板
 *   GachaModule.canCookRecipe(id)      — 检查是否可烹饪
 *   GachaModule.getRecipeIngredientStatus(id) — 食谱食材状态
 *   GachaModule.getCollectedCount()    — 已收集食材种类数
 *   GachaModule.getTotalIngredientCount() — 食材总种类数
 */

const GachaModule = (() => {
  const STORAGE_KEY = 'ai-kitchen-gacha';
  const GACHA_HISTORY_KEY = 'ai-kitchen-gacha-history';
  const COOK_COUNT_KEY = 'ai-kitchen-cook-count';
  const GACHA_INTERVAL = 3;
  const MAX_GACHA_HISTORY = 50;

  // ═══════════════════════════════════════
  //  食材数据库（42种，按稀有度 & 品类）
  // ═══════════════════════════════════════
  const INGREDIENTS = [
    // === 传说 RARE (weight: 5) ===
    { id: 'rare-truffle',   name: '🍄 黑松露',       rarity: 'rare',     price: 2000, category: '菌类', desc: '米其林大厨的秘密武器' },
    { id: 'rare-saffron',   name: '🌾 番红花',       rarity: 'rare',     price: 1500, category: '香料', desc: '世界上最贵的香料' },
    { id: 'rare-wagyu',     name: '🥩 和牛',          rarity: 'rare',     price: 1800, category: '肉类', desc: '日本顶级和牛' },
    { id: 'rare-caviar',    name: '🥄 鱼子酱',       rarity: 'rare',     price: 1200, category: '海鲜', desc: '黑珍珠般的美味' },
    { id: 'rare-king-crab', name: '🦀 帝王蟹',       rarity: 'rare',     price: 1000, category: '海鲜', desc: '深海之王' },
    // === 史诗 EPIC (weight: 15) ===
    { id: 'epic-foie',           name: '🦆 鹅肝',             rarity: 'epic',     price: 600,  category: '肉类', desc: '法国美食的象征' },
    { id: 'epic-truffle-oil',    name: '🫒 松露油',           rarity: 'epic',     price: 400,  category: '调料', desc: '提升任何菜的品质' },
    { id: 'epic-aged-balsamic',  name: '🍶 陈年黑醋',         rarity: 'epic',     price: 350,  category: '调料', desc: '意大利的液体黄金' },
    { id: 'epic-morel',          name: '🍄 羊肚菌',           rarity: 'epic',     price: 300,  category: '菌类', desc: '春天的珍馐' },
    { id: 'epic-prawn',          name: '🦐 大虾',             rarity: 'epic',     price: 250,  category: '海鲜', desc: '新鲜海捕大虾' },
    { id: 'epic-parmesan',       name: '🧀 帕玛森芝士',       rarity: 'epic',     price: 200,  category: '乳制品', desc: '意大利奶酪之王' },
    // === 不常见 UNCOMMON (weight: 30) ===
    { id: 'uncommon-vanilla',      name: '🌺 香草豆',           rarity: 'uncommon', price: 80,  category: '香料', desc: '烘焙师的最爱' },
    { id: 'uncommon-miso',         name: '🥣 顶级味噌',         rarity: 'uncommon', price: 60,  category: '调料', desc: '日本传统发酵艺术' },
    { id: 'uncommon-olive',        name: '🫒 特级初榨橄榄油',   rarity: 'uncommon', price: 70,  category: '调料', desc: '地中海的液体黄金' },
    { id: 'uncommon-sea-salt',     name: '🧂 法国海盐',         rarity: 'uncommon', price: 50,  category: '调料', desc: '来自布列塔尼的精盐' },
    { id: 'uncommon-fresh-pasta',  name: '🍝 新鲜意面',         rarity: 'uncommon', price: 35,  category: '谷物', desc: '手工现做意面' },
    { id: 'uncommon-risotto-rice', name: '🍚 意大利米',         rarity: 'uncommon', price: 40,  category: '谷物', desc: 'Risotto 专用' },
    { id: 'uncommon-salmon',       name: '🐟 三文鱼',           rarity: 'uncommon', price: 65,  category: '海鲜', desc: '挪威空运三文鱼' },
    { id: 'uncommon-avocado',      name: '🥑 牛油果',           rarity: 'uncommon', price: 30,  category: '水果', desc: '营养密度之王' },
    // === 普通 COMMON (weight: 50) ===
    { id: 'common-honey',         name: '🍯 蜂蜜',       rarity: 'common',   price: 25, category: '调料', desc: '大自然的甜蜜礼物' },
    { id: 'common-garlic',        name: '🧄 大蒜',       rarity: 'common',   price: 3,  category: '蔬菜', desc: '厨房的万能调料' },
    { id: 'common-ginger',        name: '🫚 生姜',       rarity: 'common',   price: 5,  category: '蔬菜', desc: '温暖的香料' },
    { id: 'common-pepper',        name: '🌶️ 黑胡椒',     rarity: 'common',   price: 2,  category: '香料', desc: '百味之王' },
    { id: 'common-tofu',          name: '🫘 豆腐',       rarity: 'common',   price: 4,  category: '豆制品', desc: '中华料理的灵魂' },
    { id: 'common-kelp',          name: '🟢 海带',       rarity: 'common',   price: 3,  category: '蔬菜', desc: '鲜味的来源' },
    { id: 'common-lettuce',       name: '🥬 混合生菜',   rarity: 'common',   price: 5,  category: '蔬菜', desc: '沙拉的基底' },
    { id: 'common-cherry-tomato', name: '🍅 樱桃番茄',   rarity: 'common',   price: 6,  category: '蔬菜', desc: '一口一个的小番茄' },
    { id: 'common-egg',           name: '🥚 鸡蛋',       rarity: 'common',   price: 2,  category: '蛋奶', desc: '厨房永远的常备' },
    { id: 'common-onion',         name: '🧅 洋葱',       rarity: 'common',   price: 3,  category: '蔬菜', desc: '一切美味的开始' },
    { id: 'common-rice',          name: '🍚 大米',       rarity: 'common',   price: 4,  category: '谷物', desc: '亚洲人的主食' },
    { id: 'common-soy-sauce',     name: '🫙 酱油',       rarity: 'common',   price: 3,  category: '调料', desc: '中餐的灵魂' },
  ];

  // ═══════════════════════════════════════
  //  限定食谱（每种食谱需要对应食材才能烹饪）
  // ═══════════════════════════════════════
  const LIMITED_RECIPES = [
    { id: 'recipe-michelin-pasta', name: '✨ 米其林黑松露意面', rarity: 'rare', desc: '黑松露与帕玛森芝士的完美邂逅', story: '传说这道菜源自意大利北部一个小村庄的百年老店...', prompt: '用黑松露、帕玛森芝士、新鲜意面创作一道米其林级别的意大利面。要求：精致、优雅、充满香气。', requiredIngredients: ['rare-truffle', 'epic-parmesan', 'uncommon-fresh-pasta'] },
    { id: 'recipe-wagyu-steak', name: '🥩 和牛牛排大师班', rarity: 'rare', desc: '日本顶级和牛，火候精准的艺术', story: '在日本神户，有一位老匠人用一生研究牛排的火候...', prompt: '用顶级和牛创作一道完美的牛排。要求：火候精准、配菜精致、摆盘艺术。', requiredIngredients: ['rare-wagyu', 'uncommon-sea-salt', 'common-pepper'] },
    { id: 'recipe-foie-gras', name: '🦆 鹅肝盛宴', rarity: 'epic', desc: '法国经典美食的巅峰之作', story: '这道菜曾被法国国王路易十四赞为"天堂的味道"...', prompt: '用鹅肝创作一道法国经典菜。要求：高端、优雅、充满法式风情。', requiredIngredients: ['epic-foie', 'epic-aged-balsamic', 'uncommon-sea-salt'] },
    { id: 'recipe-truffle-risotto', name: '🍚 松露烩饭', rarity: 'epic', desc: '香气四溢的松露与丝滑烩饭', story: '在米兰郊外的一座古堡里，藏着这道传世秘方...', prompt: '用松露油和意大利米创作一道奶油烩饭。要求：香气扑鼻、口感顺滑、米粒分明。', requiredIngredients: ['epic-truffle-oil', 'uncommon-risotto-rice', 'epic-parmesan'] },
    { id: 'recipe-saffron-paella', name: '🍲 番红花海鲜饭', rarity: 'epic', desc: '西班牙国粹，金黄海洋盛宴', story: '瓦伦西亚的渔夫们用番红花染就了这道金色传奇...', prompt: '用番红花、海鲜、西班牙米创作一道西班牙海鲜饭。要求：色香味俱全、海鲜新鲜、米粒饱满。', requiredIngredients: ['rare-saffron', 'epic-prawn', 'uncommon-risotto-rice'] },
    { id: 'recipe-miso-soup', name: '🍜 顶级味噌汤', rarity: 'uncommon', desc: '日本传统汤底的极致演绎', story: '京都的一座百年味噌作坊，藏着这份温暖的秘密...', prompt: '用顶级味噌创作一道日本传统汤。要求：鲜香、温暖、营养丰富。', requiredIngredients: ['uncommon-miso', 'common-tofu', 'common-kelp'] },
    { id: 'recipe-olive-salad', name: '🥗 橄榄油沙拉', rarity: 'uncommon', desc: '地中海健康风情', story: '希腊橄榄园的女主人将阳光封进了这瓶油里...', prompt: '用特级初榨橄榄油创作一道地中海沙拉。要求：清爽、健康、橄榄油香气突出。', requiredIngredients: ['uncommon-olive', 'common-lettuce', 'common-cherry-tomato'] },
  ];

  // 盲盒专属系统提示词
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
    common:   { color: '#95a5a6', label: '普通', weight: 50 },
    uncommon: { color: '#27ae60', label: '不常见', weight: 30 },
    epic:     { color: '#9b59b6', label: '史诗', weight: 15 },
    rare:     { color: '#f39c12', label: '传奇', weight: 5 },
  };

  // 品类顺序（用于背包分组展示）
  const CATEGORY_ORDER = ['菌类', '香料', '肉类', '海鲜', '调料', '谷物', '乳制品', '水果', '蔬菜', '蛋奶', '豆制品'];

  /* ═══════════════════════════════════════
     存储层
     ═══════════════════════════════════════ */

  function loadGachaData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || '{"tickets":0,"inventory":[]}';
      const data = JSON.parse(raw);

      // 兼容旧数据：如果没有 ingredients 字段，初始化并从 inventory 迁移
      if (!data.ingredients) {
        data.ingredients = {};
        INGREDIENTS.forEach(ing => { data.ingredients[ing.id] = 0; });
        // 从已有 inventory 中恢复食材计数
        if (Array.isArray(data.inventory)) {
          data.inventory.forEach(item => {
            if (item && item.type === 'ingredient' && item.data && item.data.id) {
              data.ingredients[item.data.id] = (data.ingredients[item.data.id] || 0) + 1;
            }
          });
        }
        saveGachaData(data);
      }

      // 新用户初始 5 张卡券
      if (data.tickets === 0 && data.inventory.length === 0 && Object.values(data.ingredients).every(v => v === 0)) {
        data.tickets = 5;
        saveGachaData(data);
      }

      // 清理损坏的背包数据
      if (data.inventory) {
        const dirtyCount = data.inventory.filter(item => !item || !item.data).length;
        if (dirtyCount > 0) {
          data.inventory = data.inventory.filter(item => item && item.data);
          saveGachaData(data);
        }
      }

      return data;
    } catch {
      const fresh = { tickets: 5, inventory: [], ingredients: {} };
      INGREDIENTS.forEach(ing => { fresh.ingredients[ing.id] = 0; });
      return fresh;
    }
  }

  function saveGachaData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    updateGachaBadge();
  }

  function loadCookCount() {
    return parseInt(localStorage.getItem(COOK_COUNT_KEY) || '0', 10);
  }

  function saveCookCount(count) {
    localStorage.setItem(COOK_COUNT_KEY, count.toString());
  }

  /* ── 盲盒食谱历史 ── */
  function loadGachaHistory() {
    try { return JSON.parse(localStorage.getItem(GACHA_HISTORY_KEY) || '[]'); }
    catch { return []; }
  }

  function saveGachaHistory(history) {
    localStorage.setItem(GACHA_HISTORY_KEY, JSON.stringify(history.slice(0, MAX_GACHA_HISTORY)));
  }

  function saveGachaResult(recipe, rarity, fullText) {
    const history = loadGachaHistory();
    history.unshift({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      recipeId: recipe.id,
      recipeName: recipe.name,
      rarity: rarity,
      output: fullText,
      time: new Date().toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    });
    saveGachaHistory(history);
  }

  /* ═══════════════════════════════════════
     食材/食谱状态查询
     ═══════════════════════════════════════ */

  function getIngredientCount(ingredientId) {
    const data = loadGachaData();
    return (data.ingredients && data.ingredients[ingredientId]) || 0;
  }

  function canCookRecipe(recipeId) {
    const recipe = LIMITED_RECIPES.find(r => r.id === recipeId);
    if (!recipe || !recipe.requiredIngredients) return false;
    return recipe.requiredIngredients.every(id => getIngredientCount(id) > 0);
  }

  function getRecipeIngredientStatus(recipeId) {
    const recipe = LIMITED_RECIPES.find(r => r.id === recipeId);
    if (!recipe || !recipe.requiredIngredients) return [];
    const data = loadGachaData();
    return recipe.requiredIngredients.map(id => {
      const ing = INGREDIENTS.find(i => i.id === id);
      const count = (data.ingredients && data.ingredients[id]) || 0;
      return { id, name: ing ? ing.name : '未知食材', rarity: ing ? ing.rarity : 'common', price: ing ? ing.price : 0, owned: count > 0, count };
    });
  }

  function consumeIngredients(recipeId) {
    const recipe = LIMITED_RECIPES.find(r => r.id === recipeId);
    if (!recipe || !recipe.requiredIngredients) return false;
    if (!canCookRecipe(recipeId)) return false;
    const data = loadGachaData();
    recipe.requiredIngredients.forEach(id => {
      if (data.ingredients[id] > 0) data.ingredients[id]--;
    });
    saveGachaData(data);
    return true;
  }

  function getCollectedCount() {
    const data = loadGachaData();
    if (!data.ingredients) return 0;
    return Object.values(data.ingredients).filter(v => v > 0).length;
  }

  function getTotalIngredientCount() {
    return INGREDIENTS.length;
  }

  /** 获取食谱已拥有食材数 */
  function getRecipeOwnedCount(recipeId) {
    return getRecipeIngredientStatus(recipeId).filter(s => s.owned).length;
  }

  /* ═══════════════════════════════════════
     烹饪计数 & 抽卡逻辑
     ═══════════════════════════════════════ */

  function addCookCount() {
    let count = loadCookCount();
    count += 1;
    saveCookCount(count);
    if (count % GACHA_INTERVAL === 0) {
      const data = loadGachaData();
      data.tickets += 1;
      saveGachaData(data);
      showToast(`🎁 获得盲盒卡券！已有 ${data.tickets} 张`);
      updateGachaBadge();
    }
  }

  function weightedRandom(items) {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;
    for (const item of items) {
      random -= item.weight;
      if (random <= 0) return item;
    }
    return items[items.length - 1];
  }

  function drawGacha() {
    const data = loadGachaData();
    if (data.tickets <= 0) {
      showToast('🎁 没有盲盒卡券了，继续烹饪获得更多！');
      return null;
    }
    data.tickets -= 1;

    const isIngredient = Math.random() < 0.5;
    let result;

    if (isIngredient) {
      const rarityWeights = Object.entries(RARITY_CONFIG)
        .filter(([rarity]) => INGREDIENTS.some(ing => ing.rarity === rarity))
        .map(([rarity, config]) => ({ rarity, weight: config.weight }));
      const selectedRarity = weightedRandom(rarityWeights).rarity;
      const candidates = INGREDIENTS.filter(ing => ing.rarity === selectedRarity);
      result = { type: 'ingredient', data: candidates[Math.floor(Math.random() * candidates.length)], rarity: selectedRarity };
    } else {
      const rarityWeights = Object.entries(RARITY_CONFIG)
        .filter(([rarity]) => LIMITED_RECIPES.some(recipe => recipe.rarity === rarity))
        .map(([rarity, config]) => ({ rarity, weight: config.weight }));
      const selectedRarity = weightedRandom(rarityWeights).rarity;
      const candidates = LIMITED_RECIPES.filter(recipe => recipe.rarity === selectedRarity);
      result = { type: 'recipe', data: candidates[Math.floor(Math.random() * candidates.length)], rarity: selectedRarity };
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

    result.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    result.timestamp = new Date().toLocaleString('zh-CN');
    data.inventory.push(result);
    saveGachaData(data);
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
          💡 每生成 3 道菜获得 1 张盲券<br/>
          🍳 食谱需要收集对应食材才能烹饪<br/>
          💳 也可以在商店购买卡券
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
    window.LeaderboardModule?.updateRecipeRank(recipe.name, 'gacha');
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
    showToast(`💳 跳转到支付页面... (购买 ${count} 张卡券)`);
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
  };
})();

window.GachaModule = GachaModule;
