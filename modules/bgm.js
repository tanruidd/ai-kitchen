/**
 * bgm.js — 海底世界背景音乐（Web Audio API 合成，零依赖）
 *
 * 对外暴露（挂到 window）：
 *   BGM.toggle()   — 开关背景音乐
 *   BGM.isPlaying  — 当前状态
 */

const BGM = (() => {
  let ctx        = null;
  let masterGain = null;
  let isPlaying  = false;
  let bubbleTimer = null;
  let chordTimer  = null;
  const nodes = []; // 持续节点，stop 时统一清理

  /* ── AudioContext 懒初始化 ── */
  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.0;
      masterGain.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /* ══════════════════════════════
     🌊 水波底噪
     白噪声 → 低通滤波器（频率缓慢 LFO 摇摆）→ gain
  ══════════════════════════════ */
  function startOceanNoise() {
    const c = getCtx();

    // 白噪声 buffer（4 秒循环）
    const bufLen = c.sampleRate * 4;
    const buf    = c.createBuffer(1, bufLen, c.sampleRate);
    const data   = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop   = true;

    // 低通滤波器
    const lpf = c.createBiquadFilter();
    lpf.type            = 'lowpass';
    lpf.frequency.value = 300;
    lpf.Q.value         = 0.8;

    // LFO 控制滤波器频率（模拟水波起伏）
    const lfo = c.createOscillator();
    lfo.type            = 'sine';
    lfo.frequency.value = 0.08; // 极慢，约 12 秒一个周期

    const lfoGain = c.createGain();
    lfoGain.gain.value = 120; // 频率摆动幅度

    lfo.connect(lfoGain);
    lfoGain.connect(lpf.frequency);

    // 音量
    const gainNode = c.createGain();
    gainNode.gain.value = 0.35;

    src.connect(lpf);
    lpf.connect(gainNode);
    gainNode.connect(masterGain);

    src.start();
    lfo.start();

    nodes.push(src, lfo);
  }

  /* ══════════════════════════════
     🎵 和弦底音
     三个正弦波叠加，模拟海底低鸣
     Am 和弦：A2(110Hz) + E3(165Hz) + A3(220Hz)
  ══════════════════════════════ */
  function startChordDrone() {
    const c = getCtx();
    const chordFreqs = [110, 165, 220, 330];

    chordFreqs.forEach((freq, i) => {
      const osc  = c.createOscillator();
      const gain = c.createGain();

      osc.type            = 'sine';
      osc.frequency.value = freq;

      // 每个音量略有差异，高频更轻
      gain.gain.value = [0.12, 0.08, 0.06, 0.03][i];

      // 轻微颤音（vibrato）
      const vib     = c.createOscillator();
      const vibGain = c.createGain();
      vib.type            = 'sine';
      vib.frequency.value = 0.3 + i * 0.1;
      vibGain.gain.value  = freq * 0.003;
      vib.connect(vibGain);
      vibGain.connect(osc.frequency);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start();
      vib.start();

      nodes.push(osc, vib);
    });
  }

  /* ══════════════════════════════
     🫧 随机气泡声
     随机间隔触发短促上升音调
  ══════════════════════════════ */
  function scheduleBubble() {
    if (!isPlaying) return;
    const c = getCtx();

    // 随机音调（模拟不同大小的气泡）
    const baseFreq = 400 + Math.random() * 800;
    const duration = 0.06 + Math.random() * 0.08;

    const osc  = c.createOscillator();
    const gain = c.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.8, c.currentTime + duration);

    gain.gain.setValueAtTime(0.0, c.currentTime);
    gain.gain.linearRampToValueAtTime(0.08 + Math.random() * 0.06, c.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + duration + 0.05);

    // 下一个气泡：1.5 ~ 5 秒后随机触发
    const nextDelay = 1500 + Math.random() * 3500;
    bubbleTimer = setTimeout(scheduleBubble, nextDelay);
  }

  /* ══════════════════════════════
     🎶 偶尔的旋律音符
     随机间隔弹出一个轻柔的音符，像海底钢琴
  ══════════════════════════════ */
  const MELODY_NOTES = [261.6, 293.7, 329.6, 349.2, 392.0, 440.0, 493.9, 523.3]; // C大调

  function scheduleChordNote() {
    if (!isPlaying) return;
    const c    = getCtx();
    const freq = MELODY_NOTES[Math.floor(Math.random() * MELODY_NOTES.length)];
    const dur  = 1.2 + Math.random() * 1.5;

    const osc  = c.createOscillator();
    const gain = c.createGain();

    osc.type            = 'sine';
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0.0, c.currentTime);
    gain.gain.linearRampToValueAtTime(0.07, c.currentTime + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + dur + 0.1);

    // 下一个音符：3 ~ 9 秒后
    const nextDelay = 3000 + Math.random() * 6000;
    chordTimer = setTimeout(scheduleChordNote, nextDelay);
  }

  /* ══════════════════════════════
     淡入 / 淡出
  ══════════════════════════════ */
  function fadeIn(duration = 2.5) {
    const c = getCtx();
    masterGain.gain.cancelScheduledValues(c.currentTime);
    masterGain.gain.setValueAtTime(masterGain.gain.value, c.currentTime);
    masterGain.gain.linearRampToValueAtTime(1.0, c.currentTime + duration);
  }

  function fadeOut(duration = 1.5) {
    const c = getCtx();
    masterGain.gain.cancelScheduledValues(c.currentTime);
    masterGain.gain.setValueAtTime(masterGain.gain.value, c.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.0, c.currentTime + duration);
  }

  /* ══════════════════════════════
     开 / 关
  ══════════════════════════════ */
  function start() {
    if (isPlaying) return;
    isPlaying = true;
    getCtx();
    startOceanNoise();
    startChordDrone();
    scheduleBubble();
    scheduleChordNote();
    fadeIn();
    updateBtn(true);
  }

  function stop() {
    if (!isPlaying) return;
    isPlaying = false;
    clearTimeout(bubbleTimer);
    clearTimeout(chordTimer);
    fadeOut(1.5);
    // 淡出后停止所有节点
    setTimeout(() => {
      nodes.forEach(n => { try { n.stop(); } catch (_) {} });
      nodes.length = 0;
    }, 1800);
    updateBtn(false);
  }

  function toggle() {
    isPlaying ? stop() : start();
  }

  /* ══════════════════════════════
     更新按钮状态
  ══════════════════════════════ */
  function updateBtn(playing) {
    const btn = document.getElementById('bgm-btn');
    if (!btn) return;
    btn.textContent = playing ? '🔊' : '🔇';
    btn.title       = playing ? '关闭背景音乐' : '开启背景音乐';
    btn.classList.toggle('bgm-on', playing);
  }

  return { toggle, get isPlaying() { return isPlaying; } };
})();

window.BGM = BGM;
