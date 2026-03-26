/**
 * settings.js — 设置页面
 *
 * 功能：
 * - 应用设置管理
 * - 音效开关
 * - BGM 开关
 * - 数据管理
 * - 关于页面
 *
 * 对外暴露：
 *   SettingsModule.renderSettings()  — 渲染设置页面
 */

const SettingsModule = (() => {
  const SETTINGS_KEY = 'ai-kitchen-settings';

  /**
   * 加载设置
   */
  function loadSettings() {
    try {
      return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{"sfxEnabled":true,"bgmEnabled":false,"bgmVolume":0.3}');
    } catch {
      return { sfxEnabled: true, bgmEnabled: false, bgmVolume: 0.3 };
    }
  }

  /**
   * 保存设置
   */
  function saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  /**
   * 切换音效
   */
  function toggleSfx() {
    const settings = loadSettings();
    settings.sfxEnabled = !settings.sfxEnabled;
    saveSettings(settings);
    renderSettings();
    showToast(settings.sfxEnabled ? '🔊 音效已开启' : '🔇 音效已关闭');
  }

  /**
   * 切换 BGM
   */
  function toggleBgm() {
    const settings = loadSettings();
    settings.bgmEnabled = !settings.bgmEnabled;
    saveSettings(settings);
    renderSettings();
    if (settings.bgmEnabled) {
      window.BGM?.toggle?.();
    } else {
      window.BGM?.stop?.();
    }
    showToast(settings.bgmEnabled ? '🎵 背景音乐已开启' : '🔇 背景音乐已关闭');
  }

  /**
   * 渲染设置页面
   */
  function renderSettings() {
    const container = document.getElementById('settings-page-content');
    if (!container) return;

    const settings = loadSettings();

    container.innerHTML = `
      <div class="settings-section">
        <h4>🔊 音频设置</h4>
        <div class="settings-items">
          <div class="settings-item" onclick="SettingsModule.toggleSfx()">
            <div class="settings-item-info">
              <span class="settings-item-label">音效</span>
              <span class="settings-item-desc">烹饪、抽奖等操作的音效反馈</span>
            </div>
            <div class="settings-item-toggle ${settings.sfxEnabled ? 'active' : ''}">
              ${settings.sfxEnabled ? '✓' : ''}
            </div>
          </div>
          <div class="settings-item" onclick="SettingsModule.toggleBgm()">
            <div class="settings-item-info">
              <span class="settings-item-label">背景音乐</span>
              <span class="settings-item-desc">烹饪时的背景音乐</span>
            </div>
            <div class="settings-item-toggle ${settings.bgmEnabled ? 'active' : ''}">
              ${settings.bgmEnabled ? '✓' : ''}
            </div>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h4>💾 数据管理</h4>
        <div class="settings-items">
          <div class="settings-item" onclick="StatsModule.exportDataAsJSON()">
            <div class="settings-item-info">
              <span class="settings-item-label">导出数据</span>
              <span class="settings-item-desc">导出所有用户数据为 JSON</span>
            </div>
            <span class="settings-item-arrow">→</span>
          </div>
          <div class="settings-item" onclick="StatsModule.clearAllData()">
            <div class="settings-item-info">
              <span class="settings-item-label danger">清空数据</span>
              <span class="settings-item-desc">删除所有历史记录和设置</span>
            </div>
            <span class="settings-item-arrow">→</span>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h4>ℹ️ 关于</h4>
        <div class="settings-about">
          <div class="settings-about-logo">🧽</div>
          <div class="settings-about-title">美味创意 AI 厨房</div>
          <div class="settings-about-version">版本 1.0.0</div>
          <div class="settings-about-desc">
            由海绵宝宝 × 蟹老板 × 派大星 × 章鱼哥联合打造的 AI 食谱生成器
          </div>
          <div class="settings-about-links">
            <a href="https://www.bikini-bottom.store/" target="_blank">🌐 官网</a>
            <a href="https://github.com/tanruidd/ai-kitchen" target="_blank">📦 GitHub</a>
          </div>
        </div>
      </div>

      <div class="settings-footer">
        Made with 🦀 by 蟹堡王 AI 团队
      </div>
    `;
  }

  return {
    loadSettings,
    saveSettings,
    toggleSfx,
    toggleBgm,
    renderSettings,
  };
})();

window.SettingsModule = SettingsModule;
