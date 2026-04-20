/**
 * sfx.js — 游戏音效系统（Web Audio API 合成）
 *
 * 使用方式：
 *   SFX.play('draw', 'ingredient');     // 盲盒开到普通食材
 *   SFX.play('draw', 'ingredientRare'); // 盲盒开到稀有食材
 *   SFX.play('draw', 'recipe');         // 盲盒开到食谱
 *   SFX.play('draw', 'coins');         // 盲盒开到金币
 *   SFX.play('buy', 'ticket');          // 购买盲盒券
 *
 * 音效类型：
 *   - draw.xxx: 开盲盒结果音效（4种）
 *   - buy.ticket: 购买音效
 */

const SFX = (() => {
  let ctx = null;
  let masterGain = null;
  let enabled = true;

  /* ── 初始化 AudioContext ── */
  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.5; // 音效音量 50%
      masterGain.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /* ── 通用工具 ── */
  function playTone(freq, type = 'sine', duration = 0.3, gainVal = 0.4, startTime = 0) {
    const c = getCtx();
    const t = c.currentTime + startTime;

    const osc = c.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);

    const g = c.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(gainVal, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(g);
    g.connect(masterGain);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  function playChord(freqs, type = 'sine', duration = 0.5, gainVal = 0.25) {
    freqs.forEach(f => playTone(f, type, duration, gainVal));
  }

  /* ══════════════════════════════
     🎵 音效定义
  ══════════════════════════════ */

  /** 普通食材 — 轻柔的叮咚声 */
  function sfxIngredient() {
    const c = getCtx();
    const t = c.currentTime;
    // 上行的双音
    playTone(523, 'sine', 0.25, 0.35, 0.0);   // C5
    playTone(659, 'sine', 0.25, 0.35, 0.12);  // E5
    playTone(784, 'sine', 0.35, 0.3, 0.24);   // G5
  }

  /** 稀有/史诗食材 — 华丽的叮咚声 */
  function sfxIngredientRare() {
    const c = getCtx();
    const t = c.currentTime;
    // 上行三连音 + 高音延长
    playTone(523, 'sine', 0.2, 0.35, 0.0);   // C5
    playTone(659, 'sine', 0.2, 0.35, 0.1);    // E5
    playTone(784, 'sine', 0.2, 0.35, 0.2);   // G5
    playTone(1047, 'triangle', 0.6, 0.4, 0.35); // C6 泛音
    // 装饰音
    playTone(1319, 'sine', 0.3, 0.2, 0.45);  // E6
    playTone(1568, 'sine', 0.4, 0.2, 0.55);  // G6
  }

  /** 传说食材 — 震撼华丽音效 */
  function sfxIngredientLegendary() {
    const c = getCtx();
    const t = c.currentTime;
    // 起始和弦
    playChord([523, 659, 784, 1047], 'sine', 0.3, 0.3); // C 大七和弦
    // 快速上行音阶
    [[659, 0.05], [784, 0.1], [880, 0.15], [1047, 0.2], [1175, 0.25], [1319, 0.3]].forEach(([f, delay]) => {
      playTone(f, 'triangle', 0.5, 0.4, delay);
    });
    // 高音延长
    playTone(1568, 'sine', 0.8, 0.35, 0.35);
    playTone(2093, 'sine', 0.6, 0.2, 0.4);
  }

  /** 食谱 — 魔法般的叮咚 */
  function sfxRecipe() {
    const c = getCtx();
    const t = c.currentTime;
    // 柔和的和弦
    playChord([523, 659, 784], 'sine', 0.4, 0.25);
    // 精灵般的装饰音
    [[1047, 0.2], [1319, 0.35], [1568, 0.5]].forEach(([f, delay]) => {
      playTone(f, 'triangle', 0.35, 0.3, delay);
    });
    // 最后的泛音
    playTone(2093, 'sine', 0.5, 0.2, 0.6);
  }

  /** 金币 — 叮当作响 */
  function sfxCoins() {
    const c = getCtx();
    const t = c.currentTime;
    // 三声叮当
    playTone(1319, 'square', 0.15, 0.3, 0.0);   // E6
    playTone(1568, 'square', 0.15, 0.3, 0.1);    // G6
    playTone(2093, 'square', 0.2, 0.3, 0.2);     // C7
    // 轻柔的下行
    playTone(784, 'sine', 0.3, 0.2, 0.3);
  }

  /** 主烹饪开始 — 火热启动音 */
  function sfxCook() {
    const c = getCtx();
    const t = c.currentTime;
    playTone(440, 'sawtooth', 0.15, 0.3, 0.0);   // A4 锯齿波（模拟火热）
    playTone(554, 'sawtooth', 0.12, 0.3, 0.1);   // C#5
    playTone(659, 'triangle', 0.2, 0.35, 0.18);  // E5 三角波（柔和收尾）
  }

  /** 烹饪完成 — 胜利号角 */
  function sfxDone() {
    const c = getCtx();
    const t = c.currentTime;
    playChord([523, 659, 784], 'sine', 0.4, 0.3);     // C 大三和弦
    playTone(1047, 'triangle', 0.5, 0.4, 0.15);       // C6 延音
    playTone(1319, 'sine', 0.4, 0.25, 0.35);           // E6 装饰音
    playTone(1568, 'sine', 0.6, 0.2, 0.5);             // G6 结尾泛音
  }

  /** 购买 — 确认音 */
  function sfxBuyTicket() {
    const c = getCtx();
    const t = c.currentTime;
    // 快速两声
    playTone(880, 'triangle', 0.12, 0.4, 0.0);  // A5
    playTone(1047, 'triangle', 0.2, 0.4, 0.08);  // C6
    // 满意的下滑
    playTone(784, 'sine', 0.25, 0.25, 0.15);
  }

  /** 复制 — 短促提示音 */
  function sfxCopy() {
    const c = getCtx();
    playTone(1047, 'sine', 0.08, 0.3, 0.0);  // C6
    playTone(1319, 'sine', 0.15, 0.3, 0.06);  // E6
  }

  /* ══════════════════════════════
     音效路由表
  ══════════════════════════════ */
  const SOUNDS = {
    draw: {
      ingredient:       sfxIngredient,
      ingredientRare:   sfxIngredientRare,
      ingredientEpic:   sfxIngredientRare,
      ingredientLegendary: sfxIngredientLegendary,
      recipe:           sfxRecipe,
      coins:            sfxCoins,
    },
    buy: {
      ticket:           sfxBuyTicket,
    },
    copy: {
      default:          sfxCopy,
    },
    cook: {
      cooking:          sfxCook,
    },
  };

  /* ── 主播放函数 ── */
  function play(category, sound) {
    if (!enabled) return;
    const fn = SOUNDS[category]?.[sound];
    if (fn) {
      try { fn(); } catch (e) { console.warn('SFX error:', e); }
    }
  }

  /* ── 全局开关 ── */
  function toggle() {
    enabled = !enabled;
    return enabled;
  }

  function isEnabled() { return enabled; }

  /* ══════════════════════════════
     兼容旧版调用（cook/done/copy）
     某些模块直接调用 window.SFX.cook()/done()/copy()
  ══════════════════════════════ */
  function cook() {
    if (!enabled) return;
    // 主烹饪开始 — 火热启动音
    playTone(440, 'sawtooth', 0.15, 0.3, 0.0);   // A4 锯齿波（模拟火热）
    playTone(554, 'sawtooth', 0.12, 0.3, 0.1);   // C#5
    playTone(659, 'triangle', 0.2, 0.35, 0.18);  // E5 三角波（柔和收尾）
  }

  function done() {
    if (!enabled) return;
    // 烹饪完成 — 胜利号角
    playChord([523, 659, 784], 'sine', 0.4, 0.3);     // C 大三和弦
    playTone(1047, 'triangle', 0.5, 0.4, 0.15);       // C6 延音
    playTone(1319, 'sine', 0.4, 0.25, 0.35);          // E6 装饰音
    playTone(1568, 'sine', 0.6, 0.2, 0.5);           // G6 结尾泛音
  }

  function copy() {
    if (!enabled) return;
    // 复制 — 短促提示音
    playTone(1047, 'sine', 0.08, 0.3, 0.0);   // C6
    playTone(1319, 'sine', 0.15, 0.3, 0.06);  // E6
  }

  function dice() {
    if (!enabled) return;
    // 随机/骰子提示音（轻快上跳）
    playTone(659, 'triangle', 0.07, 0.18, 0.0);
    playTone(784, 'triangle', 0.07, 0.18, 0.06);
    playTone(988, 'triangle', 0.09, 0.16, 0.12);
  }

  function tag() {
    if (!enabled) return;
    // 点选标签提示音（短叮）
    playTone(880, 'sine', 0.06, 0.12, 0.0);
    playTone(1175, 'sine', 0.06, 0.10, 0.045);
  }

  return { play, toggle, isEnabled, cook, done, copy, dice, tag };
(fix: sfx.js重复加载 + cooking.js防御性编程 + 新增烹饪音效)
})();

window.SFX = SFX;
