/**
 * sfx.js — 音效模块（Web Audio API 合成，零依赖）
 *
 * 对外暴露（挂到 window）：
 *   SFX.dice()     — 骰子滚动（随机灵感）
 *   SFX.tag()      — 轻拍（食材标签）
 *   SFX.cook()     — 下锅滋滋（开始烹饪）
 *   SFX.done()     — 叮（生成完成）
 *   SFX.copy()     — 轻点（复制成功）
 */

const SFX = (() => {
  let ctx = null;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    // 某些浏览器需要用户交互后才能 resume
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /* ── 工具：播放一段振荡器 ── */
  function playOsc({ type = 'sine', freq, freqEnd, duration, gain = 0.3, gainEnd = 0, startDelay = 0 }) {
    const c   = getCtx();
    const osc = c.createOscillator();
    const env = c.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime + startDelay);
    if (freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(freqEnd, c.currentTime + startDelay + duration);
    }

    env.gain.setValueAtTime(gain, c.currentTime + startDelay);
    env.gain.exponentialRampToValueAtTime(Math.max(gainEnd, 0.0001), c.currentTime + startDelay + duration);

    osc.connect(env);
    env.connect(c.destination);
    osc.start(c.currentTime + startDelay);
    osc.stop(c.currentTime + startDelay + duration);
  }

  /* ── 工具：白噪声爆破 ── */
  function playNoise({ duration, gain = 0.15, gainEnd = 0, startDelay = 0, filterFreq = 2000 }) {
    const c       = getCtx();
    const bufSize = Math.ceil(c.sampleRate * duration);
    const buffer  = c.createBuffer(1, bufSize, c.sampleRate);
    const data    = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    const src    = c.createBufferSource();
    const filter = c.createBiquadFilter();
    const env    = c.createGain();

    src.buffer = buffer;
    filter.type            = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value         = 0.5;

    env.gain.setValueAtTime(gain, c.currentTime + startDelay);
    env.gain.exponentialRampToValueAtTime(Math.max(gainEnd, 0.0001), c.currentTime + startDelay + duration);

    src.connect(filter);
    filter.connect(env);
    env.connect(c.destination);
    src.start(c.currentTime + startDelay);
    src.stop(c.currentTime + startDelay + duration);
  }

  /* ══════════════════════════════
     🎲 骰子滚动 — 随机灵感
     几个短促的随机音调，像骰子弹跳
  ══════════════════════════════ */
  function dice() {
    const notes = [400, 520, 380, 600, 440];
    notes.forEach((freq, i) => {
      playOsc({ type: 'triangle', freq, freqEnd: freq * 0.85, duration: 0.07, gain: 0.18, gainEnd: 0, startDelay: i * 0.06 });
    });
  }

  /* ══════════════════════════════
     🏷️ 轻拍 — 食材标签
     短促的 pop 声
  ══════════════════════════════ */
  function tag() {
    playOsc({ type: 'sine', freq: 880, freqEnd: 660, duration: 0.08, gain: 0.15, gainEnd: 0 });
    playNoise({ duration: 0.04, gain: 0.06, gainEnd: 0, filterFreq: 3000 });
  }

  /* ══════════════════════════════
     🍔 下锅滋滋 — 开始烹饪
     白噪声模拟油锅声 + 低频轰鸣
  ══════════════════════════════ */
  function cook() {
    // 油锅滋滋（白噪声）
    playNoise({ duration: 0.6, gain: 0.25, gainEnd: 0.02, filterFreq: 1800 });
    // 低频轰鸣
    playOsc({ type: 'sawtooth', freq: 80, freqEnd: 60, duration: 0.4, gain: 0.12, gainEnd: 0 });
    // 高频嗞嗞
    playNoise({ duration: 0.3, gain: 0.1, gainEnd: 0, filterFreq: 5000, startDelay: 0.1 });
  }

  /* ══════════════════════════════
     ✅ 叮 — 生成完成
     清脆的三音上升和弦
  ══════════════════════════════ */
  function done() {
    [523, 659, 784].forEach((freq, i) => {
      playOsc({ type: 'sine', freq, freqEnd: freq * 1.02, duration: 0.5, gain: 0.2, gainEnd: 0, startDelay: i * 0.1 });
    });
  }

  /* ══════════════════════════════
     📋 轻点 — 复制成功
     两声短促上升音
  ══════════════════════════════ */
  function copy() {
    playOsc({ type: 'sine', freq: 660, freqEnd: 880, duration: 0.1, gain: 0.15, gainEnd: 0 });
    playOsc({ type: 'sine', freq: 880, freqEnd: 1100, duration: 0.1, gain: 0.12, gainEnd: 0, startDelay: 0.12 });
  }

  return { dice, tag, cook, done, copy };
})();

window.SFX = SFX;
