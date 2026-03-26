/**
 * data.js — 盲盒数据定义
 *
 * 纯数据层，无逻辑、无副作用。
 * 通过 window.GachaData 暴露。
 */

window.GachaData = (() => {
  const GACHA_INTERVAL = 3;
  const MAX_GACHA_HISTORY = 50;

  // ═══════════════════════════════════════
  //  食材数据库（31种，按稀有度 & 品类）
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

  return {
    GACHA_INTERVAL,
    MAX_GACHA_HISTORY,
    INGREDIENTS,
    LIMITED_RECIPES,
    GACHA_SYSTEM_PROMPT,
    RARITY_CONFIG,
    CATEGORY_ORDER,
  };
})();
