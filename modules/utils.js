/**
 * utils.js — 通用工具函数
 * 气泡生成、Toast 提示、错误显示、HTML 转义
 */

/* ── 气泡背景 ── */
function spawnBubbles() {
  const wrap = document.getElementById('bubbles');
  for (let i = 0; i < 22; i++) {
    const b = document.createElement('div');
    b.className = 'bubble';
    const size = 18 + Math.random() * 60;
    b.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random() * 100}%;
      animation-duration:${6 + Math.random() * 10}s;
      animation-delay:${-Math.random() * 12}s;
      opacity:${0.2 + Math.random() * 0.4};
    `;
    wrap.appendChild(b);
  }
}

/* ── Toast 提示 ── */
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}

/* ── 错误显示 ── */
function showError(msg) {
  const box = document.getElementById('error-box');
  box.textContent = msg;
  box.style.display = 'block';
}

/* ── HTML 转义 ── */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
