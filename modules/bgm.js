/**
 * bgm.js — 海底世界背景音乐（多曲可选，Web Audio API 合成）
 * 
 * 曲目设计：柔和、不刺耳、适合长时间背景播放
 * 
 * 曲目：
 *   - ocean      🌊 海底世界（环境音+气泡）
 *   - spongebob  🧽 欢快尤克里里（轻快但不刺耳）
 *   - squidward  🐙 章鱼哥忧郁（缓慢竖琴/大提琴）
 *   - krabs      🦀 蟹老板贪财（紧张但不刺耳）
 *   - patrick    ⭐ 派大星发呆（空灵冥想）
 *
 * 对外暴露：
 *   BGM.toggle()        — 开关音乐
 *   BGM.switchTrack(id) — 切换曲目
 *   BGM.currentTrack    — 当前曲目 id
 *   BGM.isPlaying       — 播放状态
 */

const BGM = (() => {
  let ctx        = null;
  let masterGain = null;
  let isPlaying  = false;
  let currentTrack = 'ocean';
  const nodes = [];
  let timers = [];

  const TRACKS = {
    ocean:     { name: '🌊 海底世界',  emoji: '🌊' },
    spongebob: { name: '🧽 欢快尤克里里', emoji: '🧽' },
    squidward: { name: '🐙 章鱼哥',   emoji: '🐙' },
    krabs:     { name: '🦀 蟹老板',   emoji: '🦀' },
    patrick:   { name: '⭐ 派大星',   emoji: '⭐' },
  };

  /* ── 初始化 ── */
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

  function clearAll() {
    timers.forEach(t => clearTimeout(t));
    timers = [];
    nodes.forEach(n => { try { n.stop(); } catch (_) {} });
    nodes.length = 0;
  }

  function scheduleTimer(fn, delay) {
    const t = setTimeout(fn, delay);
    timers.push(t);
    return t;
  }

  /* ══════════════════════════════
     🌊 海底世界 — 柔和环境音
  ══════════════════════════════ */
  function startOcean() {
    const c = getCtx();

    // 柔和的水波底噪
    const bufLen = c.sampleRate * 4;
    const buf = c.createBuffer(1, bufLen, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    // 更柔和的低通滤波
    const lpf = c.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 200;
    lpf.Q.value = 0.5;

    // 缓慢的 LFO
    const lfo = c.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.05;
    const lfoGain = c.createGain();
    lfoGain.gain.value = 80;
    lfo.connect(lfoGain);
    lfoGain.connect(lpf.frequency);

    const gain = c.createGain();
    gain.gain.value = 0.2; // 更轻的音量

    src.connect(lpf);
    lpf.connect(gain);
    gain.connect(masterGain);
    src.start();
    lfo.start();
    nodes.push(src, lfo);

    // 柔和的和弦底音（更长延音，更轻）
    [110, 165, 220].forEach((freq, i) => {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.value = [0.06, 0.04, 0.03][i]; // 更轻
      osc.connect(g);
      g.connect(masterGain);
      osc.start();
      nodes.push(osc);
    });

    // 柔和的气泡
    function bubble() {
      if (!isPlaying || currentTrack !== 'ocean') return;
      const baseFreq = 600 + Math.random() * 400;
      const dur = 0.1 + Math.random() * 0.1;

      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, c.currentTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, c.currentTime + dur);
      g.gain.setValueAtTime(0.0, c.currentTime);
      g.gain.linearRampToValueAtTime(0.04, c.currentTime + 0.02); // 更轻
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);

      osc.connect(g);
      g.connect(masterGain);
      osc.start(c.currentTime);
      osc.stop(c.currentTime + dur + 0.05);

      scheduleTimer(bubble, 2000 + Math.random() * 4000);
    }
    scheduleTimer(bubble, 1000);

    // 偶尔的柔和旋律音符
    function melodyNote() {
      if (!isPlaying || currentTrack !== 'ocean') return;
      const notes = [262, 330, 392, 523];
      const freq = notes[Math.floor(Math.random() * notes.length)];

      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.0, c.currentTime);
      g.gain.linearRampToValueAtTime(0.05, c.currentTime + 0.3);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 2);

      osc.connect(g);
      g.connect(masterGain);
      osc.start(c.currentTime);
      osc.stop(c.currentTime + 2.5);

      scheduleTimer(melodyNote, 5000 + Math.random() * 8000);
    }
    scheduleTimer(melodyNote, 3000);
  }

  /* ══════════════════════════════
     🧽 欢快尤克里里 — 柔和版
     温暖的正弦波模拟，不用刺耳的三角波
  ══════════════════════════════ */
  function startSpongebob() {
    const c = getCtx();

    // 温暖的 C 大调旋律（更柔和的节奏）
    const melody = [
      { note: 523, dur: 300 },
      { note: 587, dur: 300 },
      { note: 659, dur: 300 },
      { note: 523, dur: 300 },
      { note: 659, dur: 300 },
      { note: 587, dur: 600 },
      { note: 523, dur: 300 },
      { note: 494, dur: 300 },
      { note: 523, dur: 600 },
      { note: 392, dur: 600 },
      { note: 440, dur: 300 },
      { note: 494, dur: 300 },
      { note: 523, dur: 300 },
      { note: 494, dur: 300 },
      { note: 440, dur: 300 },
      { note: 392, dur: 600 },
    ];

    let noteIndex = 0;

    // 持续的柔和底音
    function drone() {
      if (!isPlaying || currentTrack !== 'spongebob') return;
      [130.8, 196, 261.6].forEach(freq => {
        const osc = c.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const g = c.createGain();
        g.gain.value = 0.04; // 非常轻的底音
        osc.connect(g);
        g.connect(masterGain);
        osc.start();
        nodes.push(osc);
      });
    }
    drone();

    function playNote() {
      if (!isPlaying || currentTrack !== 'spongebob') return;

      const { note, dur } = melody[noteIndex];
      noteIndex = (noteIndex + 1) % melody.length;

      // 主音：柔和的正弦波
      const osc = c.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = note;

      const g = c.createGain();
      g.gain.setValueAtTime(0.0, c.currentTime);
      g.gain.linearRampToValueAtTime(0.08, c.currentTime + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur / 1000 * 0.8);

      osc.connect(g);
      g.connect(masterGain);
      osc.start(c.currentTime);
      osc.stop(c.currentTime + dur / 1000 + 0.1);

      // 轻微的泛音（更柔和）
      const osc2 = c.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = note * 2;
      const g2 = c.createGain();
      g2.gain.setValueAtTime(0.0, c.currentTime);
      g2.gain.linearRampToValueAtTime(0.02, c.currentTime + 0.05);
      g2.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur / 1000 * 0.6);

      osc2.connect(g2);
      g2.connect(masterGain);
      osc2.start(c.currentTime);
      osc2.stop(c.currentTime + dur / 1000 + 0.1);

      scheduleTimer(playNote, dur + 80);
    }

    playNote();
  }

  /* ══════════════════════════════
     🐙 章鱼哥忧郁 — 柔和竖琴
  ══════════════════════════════ */
  function startSquidward() {
    const c = getCtx();

    const notes = [220, 261.6, 293.7, 329.6, 293.7, 261.6, 220, 196];
    let noteIndex = 0;

    // 持续的低音底
    function drone() {
      if (!isPlaying || currentTrack !== 'squidward') return;
      const bass = c.createOscillator();
      bass.type = 'sine';
      bass.frequency.value = 110;
      const g = c.createGain();
      g.gain.value = 0.05;
      bass.connect(g);
      g.connect(masterGain);
      bass.start();
      nodes.push(bass);
    }
    drone();

    function playNote() {
      if (!isPlaying || currentTrack !== 'squidward') return;

      const freq = notes[noteIndex];
      noteIndex = (noteIndex + 1) % notes.length;

      // 竖琴音色：柔和的正弦波
      const osc = c.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      // 轻微颤音
      const vib = c.createOscillator();
      vib.type = 'sine';
      vib.frequency.value = 4;
      const vibGain = c.createGain();
      vibGain.gain.value = freq * 0.004;
      vib.connect(vibGain);
      vibGain.connect(osc.frequency);

      const g = c.createGain();
      g.gain.setValueAtTime(0.0, c.currentTime);
      g.gain.linearRampToValueAtTime(0.08, c.currentTime + 0.4);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 3);

      osc.connect(g);
      g.connect(masterGain);

      osc.start(c.currentTime);
      vib.start(c.currentTime);
      osc.stop(c.currentTime + 4);
      vib.stop(c.currentTime + 4);
      nodes.push(osc, vib);

      scheduleTimer(playNote, 3000);
    }

    playNote();
  }

  /* ══════════════════════════════
     🦀 蟹老板 — 紧张但柔和
     用正弦波代替锯齿波，保持节奏感但不刺耳
  ══════════════════════════════ */
  function startKrabs() {
    const c = getCtx();

    const bassPattern = [130.8, 146.8, 164.8, 146.8];
    const melodyPattern = [523, 494, 440, 392, 440, 494, 523, 587];
    let bassIdx = 0;
    let melodyIdx = 0;

    // 低音线
    function bassNote() {
      if (!isPlaying || currentTrack !== 'krabs') return;

      const freq = bassPattern[bassIdx];
      bassIdx = (bassIdx + 1) % bassPattern.length;

      // 用正弦波代替锯齿波
      const osc = c.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const g = c.createGain();
      g.gain.setValueAtTime(0.06, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2);

      osc.connect(g);
      g.connect(masterGain);
      osc.start(c.currentTime);
      osc.stop(c.currentTime + 0.3);

      scheduleTimer(bassNote, 300);
    }

    // 旋律线（更柔和）
    function melodyNote() {
      if (!isPlaying || currentTrack !== 'krabs') return;

      const freq = melodyPattern[melodyIdx];
      melodyIdx = (melodyIdx + 1) % melodyPattern.length;

      const osc = c.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const g = c.createGain();
      g.gain.setValueAtTime(0.04, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);

      osc.connect(g);
      g.connect(masterGain);
      osc.start(c.currentTime);
      osc.stop(c.currentTime + 0.2);

      scheduleTimer(melodyNote, 200);
    }

    bassNote();
    scheduleTimer(melodyNote, 150);
  }

  /* ══════════════════════════════
     ⭐ 派大星发呆 — 极柔和空灵
  ══════════════════════════════ */
  function startPatrick() {
    const c = getCtx();

    const notes = [261.6, 329.6, 392, 523.3, 659.3];
    let noteIndex = 0;

    function playNote() {
      if (!isPlaying || currentTrack !== 'patrick') return;

      const freq = notes[noteIndex];
      noteIndex = (noteIndex + 1) % notes.length;

      // 多层正弦波，极柔和
      const osc1 = c.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.value = freq;

      const osc2 = c.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = freq * 2;

      const g1 = c.createGain();
      const g2 = c.createGain();

      g1.gain.setValueAtTime(0.0, c.currentTime);
      g1.gain.linearRampToValueAtTime(0.05, c.currentTime + 1.5);
      g1.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 10);

      g2.gain.setValueAtTime(0.0, c.currentTime);
      g2.gain.linearRampToValueAtTime(0.015, c.currentTime + 2);
      g2.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 8);

      osc1.connect(g1);
      osc2.connect(g2);
      g1.connect(masterGain);
      g2.connect(masterGain);

      osc1.start(c.currentTime);
      osc2.start(c.currentTime);
      osc1.stop(c.currentTime + 12);
      osc2.stop(c.currentTime + 12);
      nodes.push(osc1, osc2);

      scheduleTimer(playNote, 6000);
    }

    playNote();
  }

  /* ══════════════════════════════
     曲目启动器
  ══════════════════════════════ */
  const TRACK_STARTERS = {
    ocean:     startOcean,
    spongebob: startSpongebob,
    squidward: startSquidward,
    krabs:     startKrabs,
    patrick:   startPatrick,
  };

  /* ══════════════════════════════
     淡入 / 淡出
  ══════════════════════════════ */
  function fadeIn(duration = 2) {
    const c = getCtx();
    masterGain.gain.cancelScheduledValues(c.currentTime);
    masterGain.gain.setValueAtTime(0.0, c.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.7, c.currentTime + duration); // 总音量降到 0.7
  }

  function fadeOut(duration = 1) {
    const c = getCtx();
    masterGain.gain.cancelScheduledValues(c.currentTime);
    masterGain.gain.setValueAtTime(masterGain.gain.value, c.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.0, c.currentTime + duration);
  }

  /* ══════════════════════════════
     开 / 关 / 切换曲目
  ══════════════════════════════ */
  function start() {
    if (isPlaying) return;
    isPlaying = true;
    getCtx();
    TRACK_STARTERS[currentTrack]();
    fadeIn();
    updateUI();
  }

  function stop() {
    if (!isPlaying) return;
    isPlaying = false;
    fadeOut(1);
    setTimeout(() => {
      clearAll();
    }, 1200);
    updateUI();
  }

  function toggle() {
    isPlaying ? stop() : start();
  }

  function switchTrack(trackId) {
    if (!TRACKS[trackId]) return;
    if (currentTrack === trackId && isPlaying) return;

    currentTrack = trackId;

    if (isPlaying) {
      fadeOut(0.5);
      setTimeout(() => {
        clearAll();
        TRACK_STARTERS[trackId]();
        fadeIn(0.8);
      }, 600);
    }
    updateUI();
  }

  /* ══════════════════════════════
     UI 更新
  ══════════════════════════════ */
  function updateUI() {
    const btn = document.getElementById('bgm-btn');
    if (btn) {
      btn.textContent = TRACKS[currentTrack].emoji;
      btn.title = isPlaying ? '关闭背景音乐' : '开启背景音乐';
      btn.classList.toggle('bgm-on', isPlaying);
    }

    document.querySelectorAll('.bgm-track').forEach(el => {
      const track = el.dataset.track;
      el.classList.toggle('active', track === currentTrack);
    });
  }

  function getTracks() {
    return TRACKS;
  }

  function renderTrackList() {
    const wrap = document.getElementById('bgm-tracks');
    if (!wrap) return;

    wrap.innerHTML = Object.entries(TRACKS).map(([id, track]) =>
      `<button class="bgm-track ${id === currentTrack ? 'active' : ''}"
        data-track="${id}"
        onclick="BGM.switchTrack('${id}')">${track.name}</button>`
    ).join('');
  }

  document.addEventListener('DOMContentLoaded', renderTrackList);

  return {
    toggle,
    switchTrack,
    start,
    stop,
    getTracks,
    renderTrackList,
    get currentTrack() { return currentTrack; },
    get isPlaying() { return isPlaying; },
  };
})();

window.BGM = BGM;

/* ── 切换 BGM 面板 ── */
function toggleBgmPanel() {
  const panel = document.getElementById('bgm-panel');
  if (!panel) return;
  panel.classList.toggle('show');
}
