/**
 * history.js — 历史记录模块（Phase 1: localStorage）
 *
 * Phase 2 云端同步时只需替换 loadHistory / saveHistory 的存储层，
 * 其余 UI 逻辑完全不用动。
 *
 * 对外暴露（挂到 window）：
 *   toggleHistory()       — 打开/关闭历史面板
 *   switchHistoryTab(tab) — 切换最近/收藏 Tab
 *   saveCurrentResult(input, mode, output) — 保存一条新记录
 *   updateHistoryBadge()  — 刷新未读角标
 *   restoreHistory(id)    — 恢复历史食谱
 *   copyHistoryOutput(id) — 复制历史食谱文本
 *   toggleFav(id)         — 收藏/取消收藏
 *   deleteHistory(id)     — 删除单条
 *   clearHistory()        — 清空全部
 *   exportHistory()       — 导出 JSON
 *   importHistory()       — 导入 JSON
 */

const MAX_HISTORY  = 100;
const STORAGE_KEY  = 'ai-kitchen-history';
const LAST_READ_KEY = 'ai-kitchen-last-read';

let currentHistoryTab = 'history';
let historySearchQuery = '';

/* ══════════════════════════════
   存储层（Phase 2 只改这里）
══════════════════════════════ */
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

function saveHistory(history) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  updateHistoryBadge();
  renderHistoryList();
}

/* ══════════════════════════════
   记录创建
══════════════════════════════ */
function createHistoryItem(input, mode, output) {
  const ts = Date.now();
  return {
    id:     ts.toString(36) + Math.random().toString(36).slice(2, 5),
    ts,
    input:  input.slice(0, 300),
    mode,
    output,
    fav:    false,
    time:   new Date().toLocaleString('zh-CN', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    }),
  };
}

function saveCurrentResult(input, mode, output) {
  const history = loadHistory();
  history.unshift(createHistoryItem(input, mode, output));
  saveHistory(history);
}

/* ══════════════════════════════
   未读角标
══════════════════════════════ */
function getUnreadCount() {
  const history  = loadHistory();
  const lastRead = parseInt(localStorage.getItem(LAST_READ_KEY) || '0', 10);
  if (!lastRead) return history.length;
  return history.filter(h => h.ts > lastRead).length;
}

function updateHistoryBadge() {
  const count = getUnreadCount();
  const badge = document.getElementById('history-count');
  if (count > 0) {
    badge.textContent    = count > 99 ? '99+' : count;
    badge.style.display  = 'flex';
  } else {
    badge.style.display  = 'none';
  }
}

/* ══════════════════════════════
   面板开关
══════════════════════════════ */
function toggleHistory() {
  const panel   = document.getElementById('history-panel');
  const overlay = document.getElementById('history-overlay');
  const isOpen  = panel.classList.contains('open');
  if (isOpen) {
    panel.classList.remove('open');
    overlay.classList.remove('show');
  } else {
    panel.classList.add('open');
    overlay.classList.add('show');
    historySearchQuery = '';
    const searchEl = document.getElementById('history-search');
    if (searchEl) searchEl.value = '';
    renderHistoryList();
    // 打开即已读
    localStorage.setItem(LAST_READ_KEY, Date.now().toString());
    updateHistoryBadge();
  }
}

function switchHistoryTab(tab) {
  currentHistoryTab = tab;
  document.getElementById('tab-history').classList.toggle('active', tab === 'history');
  document.getElementById('tab-fav').classList.toggle('active', tab === 'fav');
  renderHistoryList();
}

function onHistorySearch(val) {
  historySearchQuery = val;
  renderHistoryList();
}

/* ══════════════════════════════
   列表渲染
══════════════════════════════ */
function renderHistoryList() {
  const history = loadHistory();
  const list    = document.getElementById('history-list');
  const empty   = document.getElementById('history-empty');

  const q = historySearchQuery.trim().toLowerCase();
  let items = currentHistoryTab === 'fav'
    ? history.filter(h => h.fav)
    : history;
  if (q) {
    items = items.filter(h =>
      h.input.toLowerCase().includes(q) ||
      (window.MODE_LABELS[h.mode] || h.mode).toLowerCase().includes(q)
    );
  }

  if (items.length === 0) {
    list.innerHTML = '';
    empty.classList.remove('show');
    empty.innerHTML = q
      ? `<span class="empty-icon">🔍</span>没有找到「${escapeHtml(q)}」相关的食谱`
      : currentHistoryTab === 'fav'
        ? '<span class="empty-icon">⭐</span>还没有收藏的食谱<br/>点击 ☆ 收藏你喜欢的食谱吧！'
        : '<span class="empty-icon">📭</span>还没有生成过食谱<br/>快去创作第一道菜吧！';
    requestAnimationFrame(() => empty.classList.add('show'));
    return;
  }

  empty.classList.remove('show');
  list.innerHTML = items.map(item => `
    <div class="history-item" onclick="restoreHistory('${item.id}')">
      <div class="history-item-meta">
        <span class="history-item-mode">${window.MODE_LABELS[item.mode] || item.mode}</span>
        <span class="history-item-time">${item.time}</span>
        <button class="history-item-fav ${item.fav ? 'active-star' : ''}"
          onclick="event.stopPropagation(); toggleFav('${item.id}')"
          title="${item.fav ? '取消收藏' : '收藏'}">${item.fav ? '★' : '☆'}</button>
      </div>
      <div class="history-item-input">${escapeHtml(item.input)}</div>
      <div class="history-item-actions">
        <button class="history-action-btn" onclick="event.stopPropagation(); restoreHistory('${item.id}')">🔄 恢复</button>
        <button class="history-action-btn" onclick="event.stopPropagation(); copyHistoryOutput('${item.id}')">📋 复制</button>
        <button class="history-action-btn delete" onclick="event.stopPropagation(); deleteHistory('${item.id}')">🗑️</button>
      </div>
    </div>
  `).join('');
}

/* ══════════════════════════════
   操作
══════════════════════════════ */
function restoreHistory(id) {
  const history = loadHistory();
  const item    = history.find(h => h.id === id);
  if (!item) return;

  document.getElementById('user-input').value = item.input;
  // 触发模式按钮 click，自动同步 currentMode
  const targetBtn = document.querySelector(`.mode-btn[data-mode="${item.mode}"]`);
  if (targetBtn) targetBtn.click();

  document.getElementById('result-section').style.display = 'block';
  const outputEl = document.getElementById('recipe-output');
  outputEl.innerHTML = marked.parse(item.output);
  document.getElementById('mode-badge').textContent   = window.MODE_LABELS[item.mode];
  document.getElementById('action-btns').style.display = 'flex';

  // 恢复配图
  window.ImageModule?.renderImageSection(item.input, outputEl);

  toggleHistory();
  document.getElementById('result-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  showToast('📜 食谱已恢复！');
}

function copyHistoryOutput(id) {
  const item = loadHistory().find(h => h.id === id);
  if (!item) return;
  navigator.clipboard.writeText(item.output)
    .then(() => showToast('📋 食谱已复制！'))
    .catch(() => showToast('复制失败'));
}

function toggleFav(id) {
  const history = loadHistory();
  const item    = history.find(h => h.id === id);
  if (!item) return;
  item.fav = !item.fav;
  saveHistory(history);
  showToast(item.fav ? '⭐ 已收藏！' : '☆ 已取消收藏');
}

function deleteHistory(id) {
  saveHistory(loadHistory().filter(h => h.id !== id));
  showToast('🗑️ 已删除');
}

function clearHistory() {
  const history = loadHistory();
  if (history.length === 0) return;
  if (!confirm(`确定清空全部 ${history.length} 条历史记录？`)) return;
  saveHistory([]);
  showToast('🗑️ 已清空');
}

/* ══════════════════════════════
   导出 / 导入
══════════════════════════════ */
function exportHistory() {
  const data = loadHistory();
  if (data.length === 0) { showToast('📭 暂无历史记录'); return; }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = `ai-kitchen-history-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  showToast('📥 已导出历史记录！');
}

function importHistory() {
  const input    = document.createElement('input');
  input.type     = 'file';
  input.accept   = '.json';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (!Array.isArray(imported)) throw new Error('格式错误');
        const existing    = loadHistory();
        const existingIds = new Set(existing.map(h => h.id));
        const newItems    = imported.filter(h => !existingIds.has(h.id));
        const merged      = [...newItems, ...existing].slice(0, MAX_HISTORY);
        saveHistory(merged);
        showToast(`📤 导入成功！新增 ${newItems.length} 条`);
      } catch {
        showToast('❌ 导入失败，文件格式错误');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}
