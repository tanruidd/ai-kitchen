/**
 * inspire.js — 随机灵感 + 食材快捷标签
 */

const INSPIRE_LIST = [
  '我今天很累，想吃一碗暖暖的汤面 🍜',
  '帮我做一道能让朋友惊艳的派对菜 🎉',
  '我只有鸡蛋和番茄，能做什么？ 🍅',
  '想吃点辣的，越辣越好 🌶️',
  '今天心情不好，需要一道治愈系甜品 🍮',
  '想做一道适合减肥的低卡料理 🥗',
  '帮我设计一份浪漫的情人节晚餐 🕯️',
  '我想挑战一道从没做过的异国料理 🌍',
  '冰箱里只剩土豆和洋葱，救救我 🥔',
  '想做一道让小孩子超爱吃的菜 👶',
  '帮我做一道下酒菜，今晚要喝点小酒 🍺',
  '想吃妈妈做的那种家常味道 🏠',
  '我要在10分钟内做好一顿饭 ⏱️',
  '帮我设计一道适合夏天的清爽凉菜 🌊',
  '想做一道高蛋白的健身餐 💪',
  '帮我用剩饭做一道好吃的料理 🍚',
  '想吃一道有仪式感的早午餐 ☕',
  '帮我做一道适合带便当的菜 🍱',
  '我想挑战一道需要技巧的法式料理 🥐',
  '帮我做一道超级下饭的红烧肉 🥩',
];

const INGREDIENT_TAGS = [
  { label: '🥚 鸡蛋', value: '鸡蛋' },
  { label: '🍅 番茄', value: '番茄' },
  { label: '🥩 猪肉', value: '猪肉' },
  { label: '🐔 鸡肉', value: '鸡肉' },
  { label: '🐟 鱼', value: '鱼' },
  { label: '🥦 西兰花', value: '西兰花' },
  { label: '🥔 土豆', value: '土豆' },
  { label: '🧅 洋葱', value: '洋葱' },
  { label: '🧄 大蒜', value: '大蒜' },
  { label: '🌶️ 辣椒', value: '辣椒' },
  { label: '🍄 蘑菇', value: '蘑菇' },
  { label: '🥕 胡萝卜', value: '胡萝卜' },
  { label: '🍚 米饭', value: '剩米饭' },
  { label: '🍜 面条', value: '面条' },
  { label: '🧀 奶酪', value: '奶酪' },
  { label: '🥛 牛奶', value: '牛奶' },
  { label: '🍋 柠檬', value: '柠檬' },
  { label: '🥬 白菜', value: '白菜' },
  { label: '🦐 虾', value: '虾' },
  { label: '🥓 培根', value: '培根' },
];

/* ── 随机灵感 ── */
function randomInspire() {
  const textarea = document.getElementById('user-input');
  const current  = textarea.value.trim();
  let pick;
  do {
    pick = INSPIRE_LIST[Math.floor(Math.random() * INSPIRE_LIST.length)];
  } while (pick === current && INSPIRE_LIST.length > 1);
  textarea.value = pick;
  textarea.focus();
  // 小动画：按钮抖一下
  const btn = document.getElementById('inspire-btn');
  btn.classList.add('spin');
  setTimeout(() => btn.classList.remove('spin'), 400);
  // 音效
  window.SFX?.dice();
}

/* ── 食材标签点击 ── */
function addIngredient(value) {
  const textarea = document.getElementById('user-input');
  const cur = textarea.value;
  // 如果已经包含这个食材就不重复加
  if (cur.includes(value)) {
    showToast(`已经有 ${value} 啦～`);
    return;
  }
  if (cur.trim() === '') {
    textarea.value = `我有${value}`;
  } else {
    // 末尾加上食材
    textarea.value = cur.trimEnd() + `、${value}`;
  }
  textarea.focus();
  window.SFX?.tag();
}

/* ── 渲染食材标签区 ── */
function renderIngredientTags() {
  const wrap = document.getElementById('ingredient-tags');
  if (!wrap) return;
  wrap.innerHTML = INGREDIENT_TAGS.map(t =>
    `<button class="ingredient-tag" onclick="addIngredient('${t.value}')">${t.label}</button>`
  ).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  renderIngredientTags();
});
