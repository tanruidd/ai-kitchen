/**
 * image.js — 食谱配图模块
 *
 * 对外暴露：
 *   ImageModule.fetchRecipeImage(keyword)  — 根据关键词获取美食图片
 *   ImageModule.renderImageSection(keyword, container) — 渲染图片区域
 */

const ImageModule = (() => {
  // Lorem Picsum（免费，无需 API Key）
  // 格式：https://picsum.photos/seed/{seed}/800/500
  const PICSUM_BASE = 'https://picsum.photos/seed';

  // 预设的美食主题种子词（用于生成不同的图片）
  const FOOD_SEEDS = [
    'food', 'cooking', 'meal', 'dinner', 'lunch', 'breakfast',
    'pasta', 'salad', 'soup', 'bread', 'rice', 'vegetables',
    'kitchen', 'chef', 'restaurant', 'plate', 'bowl', 'table'
  ];

  // 当前图片 URL
  let currentImageUrl = null;
  let currentSeed = null;

  /**
   * 从文本中提取种子词
   */
  function extractSeed(inputText) {
    // 简单映射：根据输入文本选择不同的种子
    const seedMap = {
      '面': 'pasta', '饭': 'rice', '汤': 'soup',
      '肉': 'meal', '鸡': 'dinner', '鱼': 'salad',
      '蛋': 'breakfast', '菜': 'vegetables', '甜': 'food',
    };
    
    for (const [key, seed] of Object.entries(seedMap)) {
      if (inputText.includes(key)) {
        return seed + Date.now();
      }
    }
    // 随机选择一个种子
    const randomSeed = FOOD_SEEDS[Math.floor(Math.random() * FOOD_SEEDS.length)];
    return randomSeed + Date.now();
  }

  /**
   * 获取食谱配图 URL
   */
  function fetchRecipeImage(inputText) {
    currentSeed = extractSeed(inputText);
    currentImageUrl = `${PICSUM_BASE}/${currentSeed}/800/500`;
    return currentImageUrl;
  }

  /**
   * 刷新图片（换一张）
   */
  function refreshImage() {
    currentSeed = 'food' + Date.now() + Math.random();
    currentImageUrl = `${PICSUM_BASE}/${currentSeed}/800/500`;
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
        📷 图片来源：<a href="https://picsum.photos" target="_blank" rel="noopener">Lorem Picsum</a>
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
