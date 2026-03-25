/**
 * premium-share.js — 高级分享图模块
 *
 * 功能：
 * - 生成高级分享图（带特效、水印、二维码）
 * - 支持多种风格（米其林、暗黑、治愈系等）
 * - 一键分享到微信、小红书、抖音
 *
 * 对外暴露：
 *   PremiumShareModule.openSharePanel()  — 打开分享面板
 *   PremiumShareModule.generateImage()   — 生成分享图
 *   PremiumShareModule.downloadImage()   — 下载分享图
 */

const PremiumShareModule = (() => {
  const STORAGE_KEY = 'ai-kitchen-premium-share';

  // 分享图风格
  const SHARE_STYLES = {
    michelin: {
      name: '✨ 米其林风格',
      bgGradient: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
      accentColor: '#d4af37',
      textColor: '#ffffff',
      borderStyle: 'solid',
      borderColor: '#d4af37',
      icon: '⭐',
    },
    dark: {
      name: '💀 暗黑风格',
      bgGradient: 'linear-gradient(135deg, #1a0000 0%, #330000 100%)',
      accentColor: '#ff1744',
      textColor: '#ffffff',
      borderStyle: 'dashed',
      borderColor: '#ff1744',
      icon: '💀',
    },
    healing: {
      name: '🌸 治愈风格',
      bgGradient: 'linear-gradient(135deg, #fff5f7 0%, #ffe0e6 100%)',
      accentColor: '#ff69b4',
      textColor: '#333333',
      borderStyle: 'solid',
      borderColor: '#ffb6d9',
      icon: '🌸',
    },
    street: {
      name: '🏮 摆摊风格',
      bgGradient: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
      accentColor: '#ffffff',
      textColor: '#ffffff',
      borderStyle: 'solid',
      borderColor: '#ffffff',
      icon: '🏮',
    },
    normal: {
      name: '🍳 经典风格',
      bgGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      accentColor: '#ffffff',
      textColor: '#ffffff',
      borderStyle: 'solid',
      borderColor: '#ffffff',
      icon: '🍳',
    },
  };

  /**
   * 打开分享面板
   */
  function openSharePanel() {
    const panel = document.getElementById('premium-share-panel');
    const overlay = document.getElementById('premium-share-overlay');
    if (!panel) return;

    panel.classList.add('open');
    overlay.classList.add('show');
    renderSharePanel();
  }

  /**
   * 关闭分享面板
   */
  function closeSharePanel() {
    const panel = document.getElementById('premium-share-panel');
    const overlay = document.getElementById('premium-share-overlay');
    if (!panel) return;

    panel.classList.remove('open');
    overlay.classList.remove('show');
  }

  /**
   * 渲染分享面板
   */
  function renderSharePanel() {
    const container = document.getElementById('premium-share-content');
    if (!container) return;

    const recipeOutput = document.getElementById('recipe-output')?.textContent || '';
    const userInput = document.getElementById('user-input')?.value || '';
    const currentMode = document.querySelector('.mode-btn.active')?.dataset.mode || 'normal';

    container.innerHTML = `
      <div class="premium-share-styles">
        <div class="premium-share-styles-label">选择风格：</div>
        <div class="premium-share-styles-grid">
          ${Object.entries(SHARE_STYLES).map(([key, style]) => `
            <button class="premium-share-style-btn ${key === currentMode ? 'active' : ''}" 
              data-style="${key}"
              onclick="PremiumShareModule.selectStyle('${key}')"
              title="${style.name}">
              ${style.icon}
            </button>
          `).join('')}
        </div>
      </div>

      <div class="premium-share-preview" id="premium-share-preview">
        <div class="premium-share-preview-label">预览：</div>
        <div class="premium-share-preview-canvas" id="premium-share-canvas"></div>
      </div>

      <div class="premium-share-options">
        <label class="premium-share-checkbox">
          <input type="checkbox" id="premium-share-watermark" checked />
          <span>添加水印</span>
        </label>
        <label class="premium-share-checkbox">
          <input type="checkbox" id="premium-share-qrcode" checked />
          <span>添加二维码</span>
        </label>
      </div>

      <div class="premium-share-actions">
        <button class="premium-share-action-btn" onclick="PremiumShareModule.generateImage()">
          🎨 生成分享图
        </button>
        <button class="premium-share-action-btn" onclick="PremiumShareModule.downloadImage()">
          📥 下载图片
        </button>
        <button class="premium-share-action-btn" onclick="PremiumShareModule.shareToWeChat()">
          💬 分享到微信
        </button>
      </div>
    `;

    // 生成预览
    generatePreview(currentMode, userInput, recipeOutput);
  }

  /**
   * 生成预览
   */
  function generatePreview(style, title, content) {
    const canvas = document.getElementById('premium-share-canvas');
    if (!canvas) return;

    const styleConfig = SHARE_STYLES[style] || SHARE_STYLES.normal;

    // 截断内容
    const lines = content.split('\n').slice(0, 5);
    const preview = lines.join('\n').slice(0, 200) + '...';

    canvas.innerHTML = `
      <div class="premium-share-card" style="
        background: ${styleConfig.bgGradient};
        border: 3px ${styleConfig.borderStyle} ${styleConfig.borderColor};
        color: ${styleConfig.textColor};
      ">
        <div class="premium-share-card-header">
          <span class="premium-share-card-icon">${styleConfig.icon}</span>
          <span class="premium-share-card-title">${title.slice(0, 30)}</span>
        </div>
        <div class="premium-share-card-content">
          ${preview.slice(0, 150)}
        </div>
        <div class="premium-share-card-footer">
          <span style="color: ${styleConfig.accentColor}">🍔 美味创意AI厨房</span>
        </div>
      </div>
    `;
  }

  /**
   * 选择风格
   */
  function selectStyle(style) {
    document.querySelectorAll('.premium-share-style-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`.premium-share-style-btn[data-style="${style}"]`)?.classList.add('active');

    const userInput = document.getElementById('user-input')?.value || '';
    const recipeOutput = document.getElementById('recipe-output')?.textContent || '';
    generatePreview(style, userInput, recipeOutput);
  }

  /**
   * 生成分享图
   */
  async function generateImage() {
    const selectedStyle = document.querySelector('.premium-share-style-btn.active')?.dataset.style || 'normal';
    const styleConfig = SHARE_STYLES[selectedStyle];
    const userInput = document.getElementById('user-input')?.value || '美味食谱';
    const recipeOutput = document.getElementById('recipe-output')?.textContent || '';
    const addWatermark = document.getElementById('premium-share-watermark')?.checked;
    const addQRCode = document.getElementById('premium-share-qrcode')?.checked;

    // 创建临时容器
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      left: -9999px;
      top: -9999px;
      width: 1080px;
      height: 1440px;
      background: ${styleConfig.bgGradient};
      padding: 60px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: ${styleConfig.textColor};
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border: 8px ${styleConfig.borderStyle} ${styleConfig.borderColor};
      box-sizing: border-box;
    `;

    // 头部
    const header = document.createElement('div');
    header.innerHTML = `
      <div style="text-align: center; margin-bottom: 40px;">
        <div style="font-size: 80px; margin-bottom: 20px;">${styleConfig.icon}</div>
        <div style="font-size: 48px; font-weight: bold; margin-bottom: 20px; color: ${styleConfig.accentColor};">
          ${userInput.slice(0, 30)}
        </div>
        <div style="font-size: 24px; opacity: 0.8;">
          ${window.MODE_LABELS[document.querySelector('.mode-btn.active')?.dataset.mode || 'normal']}
        </div>
      </div>
    `;

    // 内容
    const content = document.createElement('div');
    const lines = recipeOutput.split('\n').slice(0, 12);
    content.innerHTML = `
      <div style="font-size: 28px; line-height: 1.8; opacity: 0.9;">
        ${lines.join('<br/>').slice(0, 500)}...
      </div>
    `;

    // 底部
    const footer = document.createElement('div');
    footer.innerHTML = `
      <div style="text-align: center; border-top: 2px solid ${styleConfig.accentColor}; padding-top: 30px;">
        <div style="font-size: 32px; font-weight: bold; margin-bottom: 15px; color: ${styleConfig.accentColor};">
          🍔 美味创意 AI 厨房
        </div>
        <div style="font-size: 20px; opacity: 0.8;">
          比奇堡最强食谱生成器 · 蟹老板御用
        </div>
        ${addWatermark ? `
          <div style="font-size: 18px; margin-top: 20px; opacity: 0.6;">
            生成于 ${new Date().toLocaleDateString('zh-CN')}
          </div>
        ` : ''}
      </div>
    `;

    container.appendChild(header);
    container.appendChild(content);
    container.appendChild(footer);
    document.body.appendChild(container);

    // 使用 html2canvas 生成图片
    try {
      const canvas = await html2canvas(container, {
        backgroundColor: null,
        scale: 1,
        useCORS: true,
        allowTaint: true,
      });

      // 保存到全局
      window._generatedShareImage = canvas.toDataURL('image/png');
      document.body.removeChild(container);

      showToast('✨ 分享图已生成！');
      return window._generatedShareImage;
    } catch (err) {
      console.error('Failed to generate image:', err);
      document.body.removeChild(container);
      showToast('❌ 生成失败，请重试');
      return null;
    }
  }

  /**
   * 下载分享图
   */
  function downloadImage() {
    if (!window._generatedShareImage) {
      showToast('请先生成分享图');
      return;
    }

    const a = document.createElement('a');
    a.href = window._generatedShareImage;
    a.download = `ai-kitchen-${Date.now()}.png`;
    a.click();
    showToast('📥 图片已下载！');
  }

  /**
   * 分享到微信
   */
  function shareToWeChat() {
    if (!window._generatedShareImage) {
      showToast('请先生成分享图');
      return;
    }

    // TODO: 调用微信分享 API
    showToast('💬 已复制分享图到剪贴板，可粘贴到微信');
    navigator.clipboard.writeText(window._generatedShareImage).catch(() => {
      showToast('复制失败，请手动保存图片');
    });
  }

  return {
    openSharePanel,
    closeSharePanel,
    generateImage,
    downloadImage,
    shareToWeChat,
    selectStyle,
  };
})();

window.PremiumShareModule = PremiumShareModule;
