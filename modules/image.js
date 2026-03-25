/**
 * image.js — 食谱配图模块（Unsplash 免费 API）
 *
 * 对外暴露：
 *   ImageModule.fetchRecipeImage(keyword)  — 根据关键词获取美食图片
 *   ImageModule.renderImageSection(keyword, container) — 渲染图片区域
 */

const ImageModule = (() => {
  // Unsplash Source API（无需 API Key）
  // 格式：https://source.unsplash.com/featured/?{keyword}&w=800&h=500
  const UNSPLASH_BASE = 'https://source.unsplash.com/featured/';

  // 预设的美食关键词映射（中 → 英）
  const KEYWORD_MAP = {
    // 主食
    '面条': 'noodles,pasta',
    '米饭': 'rice,bowl',
    '面包': 'bread,toast',
    '汉堡': 'burger',
    '披萨': 'pizza',
    '寿司': 'sushi',
    '饺子': 'dumpling',
    '汤': 'soup,bowl',
    '粥': 'porridge,bowl',
    '沙拉': 'salad',
    // 食材
    '鸡蛋': 'egg,breakfast',
    '鸡肉': 'chicken,food',
    '牛肉': 'beef,steak',
    '猪肉': 'pork,meat',
    '鱼肉': 'fish,seafood',
    '虾': 'shrimp,seafood',
    '蟹': 'crab,seafood',
    '蔬菜': 'vegetables',
    '番茄': 'tomato',
    '土豆': 'potato',
    '豆腐': 'tofu',
    '蘑菇': 'mushroom',
    // 菜系
    '中式': 'chinese,food',
    '日式': 'japanese,food',
    '韩式': 'korean,food',
    '西式': 'western,food',
    '泰式': 'thai,food',
    '印度': 'indian,food',
    // 烹饪方式
    '烧烤': 'grill,bbq',
    '火锅': 'hotpot',
    '炒': 'stir,fry',
    '蒸': 'steamed,food',
    '炸': 'fried,food',
    '烘焙': 'baking,pastry',
    // 其他
    '甜品': 'dessert,sweet',
    '蛋糕': 'cake',
    '甜点': 'dessert',
    '饮品': 'drink,beverage',
    '早餐': 'breakfast',
    '午餐': 'lunch',
    '晚餐': 'dinner',
    '夜宵': 'midnight,snack',
  };

  // 默认关键词
  const DEFAULT_KEYWORD = 'food,cooking';

  // 当前图片 URL
  let currentImageUrl = null;
  let currentKeyword = null;

  /**
   * 从文本中提取关键词
   */
  function extractKeywords(text) {
    const keywords = [];
    for (const [cn, en] of Object.entries(KEYWORD_MAP)) {
      if (text.includes(cn)) {
        keywords.push(en);
      }
    }
    // 最多取 2 个关键词
    return keywords.slice(0, 2).join(',');
  }

  /**
   * 获取食谱配图 URL
   */
  function fetchRecipeImage(inputText) {
    const keywords = extractKeywords(inputText) || DEFAULT_KEYWORD;
    currentKeyword = keywords;
    // 加随机数防止缓存
    const random = Date.now();
    currentImageUrl = `${UNSPLASH_BASE}?${keywords},food&w=800&h=500&sig=${random}`;
    return currentImageUrl;
  }

  /**
   * 刷新图片（换一张）
   */
  function refreshImage() {
    if (!currentKeyword) return null;
    const random = Date.now() + Math.random();
    currentImageUrl = `${UNSPLASH_BASE}?${currentKeyword},food&w=800&h=500&sig=${random}`;
    return currentImageUrl;
  }

  /**
   * 渲染图片区域到食谱容器
   */
  function renderImageSection(inputText, container) {
    const imageUrl = fetchRecipeImage(inputText);

    const imageSection = document.createElement('div');
    imageSection.className = 'recipe-image-section';
    imageSection.innerHTML = `
      <div class="recipe-image-wrap">
        <img
          class="recipe-image"
          id="recipe-image"
          src="${imageUrl}"
          alt="食谱配图"
          onload="this.classList.add('loaded')"
          onerror="this.parentElement.innerHTML='<div class=\\'recipe-image-error\\'>🖼️ 图片加载失败</div>'"
        />
        <button class="recipe-image-refresh" onclick="ImageModule.refreshAndRender()" title="换一张">
          🔄
        </button>
      </div>
      <div class="recipe-image-source">
        📷 图片来源：<a href="https://unsplash.com" target="_blank" rel="noopener">Unsplash</a>
      </div>
    `;

    // 插入到容器开头
    container.insertBefore(imageSection, container.firstChild);
  }

  /**
   * 刷新图片并重新渲染
   */
  function refreshAndRender() {
    const newUrl = refreshImage();
    if (!newUrl) return;

    const img = document.getElementById('recipe-image');
    if (img) {
      img.classList.remove('loaded');
      img.src = newUrl;
    }
    window.SFX?.tag();
  }

  /**
   * 获取当前图片 URL
   */
  function getCurrentImageUrl() {
    return currentImageUrl;
  }

  return {
    fetchRecipeImage,
    refreshImage,
    renderImageSection,
    refreshAndRender,
    getCurrentImageUrl,
  };
})();

window.ImageModule = ImageModule;
