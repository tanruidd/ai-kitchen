/**
 * share.js — 图片分享模块
 * 依赖：html2canvas（CDN）、showToast（utils.js）
 */

async function shareRecipe() {
  const outputEl = document.getElementById('recipe-output');
  if (!outputEl.textContent) return;

  const modeText = document.getElementById('mode-badge').textContent;

  // 把当前食谱内容复制到分享卡片
  document.getElementById('share-card-mode').textContent    = modeText;
  document.getElementById('share-card-recipe').innerHTML    = outputEl.innerHTML;

  const card = document.getElementById('share-card');
  card.style.left = '0';

  try {
    const canvas = await html2canvas(card, {
      scale: 2,
      useCORS: true,
      backgroundColor: null,
      logging: false,
    });

    const dataUrl    = canvas.toDataURL('image/png');
    const previewImg = document.getElementById('preview-img');
    previewImg.src   = dataUrl;

    const downloadBtn    = document.getElementById('preview-download-btn');
    downloadBtn.onclick  = () => {
      const a    = document.createElement('a');
      a.href     = dataUrl;
      a.download = `AI食谱-${modeText.replace(/[^a-zA-Z\u4e00-\u9fa5]/g, '').trim()}.png`;
      a.click();
      closePreviewModal();
      showToast('🖼️ 图片已保存！');
    };

    document.getElementById('preview-modal').classList.add('open');
  } catch (e) {
    console.error('截图失败:', e);
    showToast('截图失败，请稍后重试~');
  } finally {
    card.style.left = '-9999px';
  }
}

function closePreviewModal() {
  document.getElementById('preview-modal').classList.remove('open');
}

// 点击背景关闭
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('preview-modal').addEventListener('click', e => {
    if (e.target.id === 'preview-modal') closePreviewModal();
  });
});
