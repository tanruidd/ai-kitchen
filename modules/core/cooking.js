/**
 * cooking.js — 主烹饪逻辑
 * 依赖：modes.js（window.MODE_PROMPTS/MODE_LABELS）
 *       history.js（saveCurrentResult）
 *       utils.js（showToast、showError）
 */

let currentMode = 'normal';
let isCooking   = false;
let cookAbortController = null;

// 兼容：部分部署环境可能禁用 inline onclick（CSP），因此用 JS 再绑定一次事件
function bindCookButton() {
  const btn = document.getElementById('cook-btn');
  if (!btn) return;
  // 避免 inline onclick 与 addEventListener 双触发
  if (btn.hasAttribute('onclick')) btn.removeAttribute('onclick');
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    startCooking();
  });
}

/* ── 模式选择 ── */
function initModeButtons() {
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentMode = btn.dataset.mode;
    });
  });
}

/* ── 复制食谱 ── */
function copyRecipe() {
  const text = document.getElementById('recipe-output').textContent;
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('copy-btn');
    btn.textContent = '✅ 已复制';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = '📋 复制';
      btn.classList.remove('copied');
    }, 2000);
    showToast('📋 食谱已复制到剪贴板！');
    window.SFX?.copy?.();
  }).catch(() => showToast('复制失败，请手动选择复制~'));
}

/* ── 主烹饪函数 ── */
async function startCooking() {
  const input = document.getElementById('user-input')?.value?.trim?.();
  if (!input) {
    showError('🧽 哎呀！请先告诉海绵宝宝你想吃什么嘛～');
    return;
  }

  if (isCooking) return; // 防止重复点击
  isCooking = true;

  // 清理上一次的 abort controller
  if (cookAbortController) {
    cookAbortController.abort();
  }
  cookAbortController = new AbortController();
  window.SFX?.cook?.();

  // 重新获取 DOM 元素（安全防护）
  const btn           = document.getElementById('cook-btn');
  const loading       = document.getElementById('loading');
  const resultSection = document.getElementById('result-section');
  const errorBox      = document.getElementById('error-box');

  if (!btn || !loading) {
    isCooking = false;
    console.error('❌ 找不到烹饪按钮或加载元素');
    return;
  }

  // 重置状态
  btn.disabled = true;
  btn.textContent = '🍳 正在烹饪中...';
  loading.style.display       = 'block';
  if (resultSection) resultSection.style.display = 'none';
  if (errorBox)      errorBox.style.display      = 'none';
  const actionBtns = document.getElementById('action-btns');
  if (actionBtns)   actionBtns.style.display     = 'none';

  const systemPrompt = window.MODE_PROMPTS[currentMode];
  const userMessage  = `请根据以下描述生成食谱：\n\n${input}`;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: cookAbortController.signal,
      body: JSON.stringify({
        model:       'stepfun/step-3.5-flash:free',
        messages:    [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userMessage  },
        ],
        temperature: 0.9,
        max_tokens:  1800,
        stream:      true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API 错误 ${response.status}: ${errText}`);
    }

    // 流式输出
    loading.style.display       = 'none';
    resultSection.style.display = 'block';
    document.getElementById('mode-badge').textContent = window.MODE_LABELS[currentMode];

    const outputEl = document.getElementById('recipe-output');
    outputEl.innerHTML = '';

    const reader   = response.body.getReader();
    const decoder  = new TextDecoder('utf-8');
    let buffer     = '';
    let fullText   = '';
    let lastRender = 0;
    const RENDER_INTERVAL = 120; // ms，防抖

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (!trimmed.startsWith('data: ')) continue;
        try {
          const json  = JSON.parse(trimmed.slice(6));
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) {
            fullText += delta;
            const now = Date.now();
            if (now - lastRender >= RENDER_INTERVAL) {
              lastRender = now;
              outputEl.innerHTML = marked.parse(fullText);
            }
          }
        } catch (_) { /* 忽略解析错误 */ }
      }
    }

    // 最终完整渲染
    outputEl.innerHTML = marked.parse(fullText);

    // 渲染配图
    window.ImageModule?.renderImageSection(input, outputEl);

    if (actionBtns) actionBtns.style.display = 'flex';
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.SFX?.done?.();

    // 保存当前食谱数据（供分享图等模块使用）
    window._currentRecipe = { input, mode: currentMode, markdown: fullText, modeLabel: window.MODE_LABELS[currentMode] };

    // 保存到历史记录
    saveCurrentResult(input, currentMode, fullText);

    // 更新排行榜
    window.LeaderboardModule?.updateRecipeRank(input, currentMode);

    // 检查成就
    window.AchievementModule?.checkAchievements();

    // 保存烹饪次数（供排行榜使用）
    const raw = localStorage.getItem('ai-kitchen-cook-count');
    const count = (parseInt(raw, 10) || 0) + 1;
    localStorage.setItem('ai-kitchen-cook-count', String(count));

    // 更新每日任务
    window.DailyTaskModule?.onCook(currentMode);

    // 增加经验
    window.LevelModule?.onCook();

  } catch (err) {
    loading.style.display = 'none';
    // 用户主动离开页面 / 手动中断 → 静默，不报错
    if (err.name === 'AbortError') return;
    showError(`😱 哎呀，厨房着火了！${err.message}`);
    // 非中断错误也要记录一次烹饪尝试（网络问题是主要场景）
    const raw = localStorage.getItem('ai-kitchen-cook-count');
    const count = (parseInt(raw, 10) || 0) + 1;
    localStorage.setItem('ai-kitchen-cook-count', String(count));
  } finally {
    isCooking = false;
    cookAbortController = null;
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span class="btn-shine"></span>🍔 再来一道！继续烹饪！';
    }
  }
}

/* ── 初始化 ── */
function initCookingModule() {
  initModeButtons();
  bindCookButton();

  // Ctrl/Cmd + Enter 快捷键
  document.getElementById('user-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) startCooking();
  });

  // 烹饪中离开页面：提示用户 + 中断请求
  window.addEventListener('beforeunload', e => {
    if (isCooking) {
      e.preventDefault();
      e.returnValue = '食谱还在生成中，确定要离开吗？';
    }
  });

  window.addEventListener('pagehide', () => {
    if (cookAbortController) cookAbortController.abort();
  });

  // 初始化盲盒角标
  window.GachaModule?.updateGachaBadge();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCookingModule);
} else {
  initCookingModule();
}

// 明确挂到 window，避免某些环境下 inline handler 找不到
window.startCooking = startCooking;
window.copyRecipe = copyRecipe;
