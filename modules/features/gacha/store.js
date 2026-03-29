/**
 * store.js — 盲盒存储层 & 辅助函数
 *
 * 依赖：window.GachaData（data.js）
 * 通过 window.GachaStore 暴露。
 */

window.GachaStore = (() => {
  const { INGREDIENTS, LIMITED_RECIPES, GACHA_INTERVAL, MAX_GACHA_HISTORY } = window.GachaData;
  const STORAGE_KEY = 'ai-kitchen-gacha';
  const GACHA_HISTORY_KEY = 'ai-kitchen-gacha-history';
  const COOK_COUNT_KEY = 'ai-kitchen-cook-count';

  /* ═══════════════════════════════════════
     基础存储
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
     烹饪计数
     ═══════════════════════════════════════ */

  function addCookCount() {
    let count = loadCookCount();
    count += 1;
    saveCookCount(count);
    if (count % GACHA_INTERVAL === 0) {
      const data = loadGachaData();
      data.tickets += 1;
      saveGachaData(data);
    }
    return { count, gotTicket: count % GACHA_INTERVAL === 0, newTickets: count % GACHA_INTERVAL === 0 ? loadGachaData().tickets : 0 };
  }

  return {
    loadGachaData, saveGachaData,
    loadCookCount, saveCookCount, addCookCount,
    loadGachaHistory, saveGachaHistory, saveGachaResult,
    getIngredientCount, canCookRecipe,
    getRecipeIngredientStatus, consumeIngredients,
    getCollectedCount, getTotalIngredientCount, getRecipeOwnedCount,
  };
})();
