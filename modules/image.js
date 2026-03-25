/**
 * image.js — 食谱配图模块（Pexels API）
 *
 * 对外暴露：
 *   ImageModule.fetchRecipeImage(keyword)  — 根据关键词获取美食图片
 *   ImageModule.renderImageSection(keyword, container) — 渲染图片区域
 */

const ImageModule = (() => {
  // 预设的美食关键词映射（中 → 英）
  const KEYWORD_MAP = {
    // 主食
    '面条': 'noodles',
    '米饭': 'rice bowl',
    '面包': 'bread',
    '汉堡': 'burger',
    '披萨': 'pizza',
    '寿司': 'sushi',
    '饺子': 'dumpling',
    '汤': 'soup',
    '粥': 'porridge',
    '沙拉': 'salad',
    // 食材
    '鸡蛋': 'egg',
    '鸡肉': 'chicken',
    '牛肉': 'beef',
    '猪肉': 'pork',
    '鱼': 'fish',
    '虾': 'shrimp',
    '蟹': 'crab',
    '蔬菜': 'vegetables',
    '番茄': 'tomato',
    '土豆': 'potato',
    '豆腐': 'tofu',
    '蘑菇': 'mushroom',
    // 菜系
    '中式': 'chinese food',
    '日式': 'japanese food',
    '韩式': 'korean food',
    '西式': 'western food',
    '泰式': 'thai food',
    '印度': 'indian food',
    // 烹饪方式
    '烧烤': 'bbq grill',
    '火锅': 'hot pot',
    '炒': 'stir fry',
    '蒸': 'steamed food',
    '炸': 'fried food',
    '烘焙': 'baking pastry',
    // 其他
    '甜品': 'dessert',
    '蛋糕': 'cake',
    '甜点': 'dessert',
    '饮品': 'drink',
    '早餐': 'breakfast',
    '午餐': 'lunch',
    '晚餐': 'dinner',
    '夜宵': 'late night food',
  };

  // 默认关键词
  const DEFAULT_KEYWORD = 'delicious food';

  // 当前状态
  let currentPhotos = [];
  let currentIndex = 0;
  let currentKeyword = null;

  /**
   * 从文本中提取关键词
   */
  function extractKeywords(text) {
    for (const [cn, en] of Object.entries(KEYWORD_MAP)) {
      if (text.includes(cn)) {
        return en;
      }
    }
    return DEFAULT_KEYWORD;
  }

  /**
   * 从 Pexels API 搜索图片
   */
  async function searchPhotos(keyword) {
    try {
      const response = await fetch(`/api/image?query=${encodeURIComponent(keyword)}&per_page=15`);
      if (!response.ok) throw new Error('API error');
      const data = await response.json();
      return data.photos || [];
    } catch (err) {
      console.error('Failed to fetch images:', err);
      return [];
    }
  }

  /**
   * 获取食谱配图 URL
   */
  async function fetchRecipeImage(inputText) {
    currentKeyword = extractKeywords(inputText);
    currentPhotos = await searchPhotos(currentKeyword);
    currentIndex = 0;

    if (currentPhotos.length > 0) {
      return currentPhotos[0].src.large;
    }
    return null;
  }

  /**
   * 刷新图片（换一张）
   */
  function refreshImage() {
    if (currentPhotos.length === 0) return null;

    currentIndex = (currentIndex + 1) % currentPhotos.length;
    return currentPhotos[currentIndex].src.large;
  }

  /**
   * 渲染图片区域到食谱容器
   */
  async function renderImageSection(inputText, container) {
    // 先显示加载占位
    const imageSection = document.createElement('div');
    imageSection.className = 'recipe-image-section';
    imageSection.innerHTML = `
      <div class="recipe-image-wrap">
        <div class="recipe-image-loading" id="recipe-image-loading">
          <div class="loading-spinner"></div>
          <span>正在加载配图...</span>
        </div>
        <img
          class="recipe-image"
          id="recipe-image"
          style="display:none;"
          alt="食谱配图"
          onload="this.style.display='block'; document.getElementById('recipe-image-loading')?.remove(); this.classList.add('loaded')"
          onerror="this.parentElement.innerHTML='<div class=\\'recipe-image-error\\'>🖼️ 图片加载失败</div>'"
        />
        <button class="recipe-image-refresh" id="refresh-btn" style="display:none;" onclick="ImageModule.refreshAndRender()" title="换一张">
          🔄
        </button>
      </div>
      <div class="recipe-image-source" id="image-source" style="display:none;">
        📷 图片来源：<a href="https://www.pexels.com" target="_blank" rel="noopener">Pexels</a>
      </div>
    `;

    container.insertBefore(imageSection, container.firstChild);

    // 异步加载图片
    const imageUrl = await fetchRecipeImage(inputText);

    if (imageUrl) {
      const img = document.getElementById('recipe-image');
      const refreshBtn = document.getElementById('refresh-btn');
      const sourceEl = document.getElementById('image-source');

      if (img) img.src = imageUrl;
      if (refreshBtn) refreshBtn.style.display = 'flex';
      if (sourceEl) sourceEl.style.display = 'block';

      // 更新摄影师信息
      if (currentPhotos[0]) {
        const photo = currentPhotos[0];
        const sourceLink = sourceEl?.querySelector('a');
        if (sourceLink) {
          sourceLink.href = photo.url;
          sourceLink.textContent = `Pexels · ${photo.photographer}`;
        }
      }
    } else {
      // 加载失败
      const loading = document.getElementById('recipe-image-loading');
      if (loading) {
        loading.innerHTML = '<div class="recipe-image-error">🖼️ 暂无配图</div>';
      }
    }
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

    // 更新摄影师信息
    if (currentPhotos[currentIndex]) {
      const photo = currentPhotos[currentIndex];
      const sourceEl = document.getElementById('image-source');
      const sourceLink = sourceEl?.querySelector('a');
      if (sourceLink) {
        sourceLink.href = photo.url;
        sourceLink.textContent = `Pexels · ${photo.photographer}`;
      }
    }

    window.SFX?.tag();
  }

  /**
   * 获取当前图片 URL
   */
  function getCurrentImageUrl() {
    if (currentPhotos[currentIndex]) {
      return currentPhotos[currentIndex].src.large;
    }
    return null;
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
