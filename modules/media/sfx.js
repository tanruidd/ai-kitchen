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
     🫧 气泡咕嘟 — 开始烹饪
     水开的感觉，轻快的气泡声
  ══════════════════════════════ */
  function cook() {
    // 一串上升的气泡音
    const bubbles = [280, 350, 420, 380, 500, 450, 580, 520];
    bubbles.forEach((freq, i) => {
      const delay = i * 0.06;
      // 气泡主体
      playOsc({ type: 'sine', freq, freqEnd: freq * 1.3, duration: 0.1, gain: 0.12, gainEnd: 0, startDelay: delay });
      // 气泡破裂的 pop
      playNoise({ duration: 0.04, gain: 0.04, gainEnd: 0, filterFreq: 3000, startDelay: delay + 0.06 });
    });
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
