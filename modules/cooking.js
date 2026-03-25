/**
 * cooking.js — 主烹饪逻辑
 * 依赖：modes.js（window.MODE_PROMPTS/MODE_LABELS）
 *       history.js（saveCurrentResult）
 *       utils.js（showToast、showError）
 */

let currentMode = 'normal';
let isCooking   = false;
let cookAbortController = null;
let currentRecipeFull = '';   // 完整版食谱
let currentRecipeSimple = ''; // 简洁版食谱
let isSimpleMode = false;     // 当前是否简洁模式

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
    window.SFX?.copy();
  }).catch(() => showToast('复制失败，请手动选择复制~'));
}

/* ── 更新简洁版按钮状态 ── */
function updateSimpleBtn() {
  const btn = document.getElementById('simple-btn');
  if (!btn) return;
  if (isSimpleMode) {
    btn.textContent = '📖 详细版';
    btn.classList.add('active');
  } else {
    btn.textContent = '📝 简洁版';
    btn.classList.remove('active');
  }
}

/* ── 切换简洁/详细版 ── */
async function toggleSimpleMode() {
  const outputEl = document.getElementById('recipe-output');

  // 如果当前是简洁版，切换回详细版
  if (isSimpleMode) {
    outputEl.innerHTML = marked.parse(currentRecipeFull);
    isSimpleMode = false;
    updateSimpleBtn();
    return;
  }

  // 如果已经有简洁版缓存，直接显示
  if (currentRecipeSimple) {
    outputEl.innerHTML = marked.parse(currentRecipeSimple);
    isSimpleMode = true;
    updateSimpleBtn();
    return;
  }

  // 否则调用 AI 生成简洁版
  const btn = document.getElementById('simple-btn');
  btn.textContent = '⏳ 生成中...';
  btn.disabled = true;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'stepfun/step-3.5-flash:free',
        messages: [
          {
            role: 'system',
            content: '你是一位精简大师。请将用户给的食谱精简为最简洁的版本。\n\n【输出要求】\n1. 只保留：菜名、食材清单、步骤三部分\n2. 食材只列名称，不要用量和描述\n3. 步骤用最短的一句话概括，不要细节\n4. 去掉所有 emoji 和装饰性文字\n5. 用 Markdown 格式输出\n6. 整体不超过 200 字'
          },
          {
            role: 'user',
            content: currentRecipeFull
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
        stream: false,
      }),
    });

    if (!response.ok) throw new Error('API 错误');
    const data = await response.json();
    currentRecipeSimple = data.choices?.[0]?.message?.content || '生成简洁版失败';

    outputEl.innerHTML = marked.parse(currentRecipeSimple);
    isSimpleMode = true;
    updateSimpleBtn();
    showToast('📝 已切换简洁版');
  } catch (err) {
    showToast('❌ 生成简洁版失败');
  } finally {
    btn.disabled = false;
    updateSimpleBtn();
  }
}

/* ── 主烹饪函数 ── */
async function startCooking() {
  const input = document.getElementById('user-input').value.trim();
  if (!input) {
    showError('🧽 哎呀！请先告诉海绵宝宝你想吃什么嘛～');
    return;
  }

  isCooking = true;
  cookAbortController = new AbortController();
  window.SFX?.cook();

  const btn           = document.getElementById('cook-btn');
  const loading       = document.getElementById('loading');
  const resultSection = document.getElementById('result-section');
  const errorBox      = document.getElementById('error-box');

  // 重置状态
  btn.disabled = true;
  btn.textContent = '🍳 正在烹饪中...';
  loading.style.display       = 'block';
  resultSection.style.display = 'none';
  errorBox.style.display      = 'none';
  document.getElementById('action-btns').style.display = 'none';

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
    document.getElementById('action-btns').style.display = 'flex';
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.SFX?.done();

    // 保存完整版，清空简洁版
    currentRecipeFull = fullText;
    currentRecipeSimple = '';
    isSimpleMode = false;
    updateSimpleBtn();

    // 保存到历史记录
    saveCurrentResult(input, currentMode, fullText);

  } catch (err) {
    loading.style.display = 'none';
    // 用户主动离开页面 / 手动中断 → 静默，不报错
    if (err.name === 'AbortError') return;
    showError(`😱 哎呀，厨房着火了！${err.message}`);
  } finally {
    isCooking = false;
    cookAbortController = null;
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-shine"></span>🍔 再来一道！继续烹饪！';
  }
}

/* ── 初始化 ── */
document.addEventListener('DOMContentLoaded', () => {
  initModeButtons();

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
});
