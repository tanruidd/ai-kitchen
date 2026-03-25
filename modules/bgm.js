/**
 * bgm.js — 海底世界背景音乐（多曲可选，Web Audio API 合成）
 *
 * 曲目：
 *   - ocean      🌊 海底世界（环境音+气泡）
 *   - spongebob  🧽 海绵宝宝主题（欢快尤克里里）
 *   - squidward  🐙 章鱼哥忧郁（缓慢竖琴）
 *   - krabs      🦀 蟹老板贪财（紧张追逐）
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
    spongebob: { name: '🧽 海绵宝宝', emoji: '🧽' },
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
     🌊 海底世界 — 环境音 + 气泡
  ══════════════════════════════ */
  function startOcean() {
    const c = getCtx();

    // 水波底噪
    const bufLen = c.sampleRate * 4;
    const buf = c.createBuffer(1, bufLen, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const lpf = c.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 300;

    const lfo = c.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.08;
    const lfoGain = c.createGain();
    lfoGain.gain.value = 120;
    lfo.connect(lfoGain);
    lfoGain.connect(lpf.frequency);

    const gain = c.createGain();
    gain.gain.value = 0.35;

    src.connect(lpf);
    lpf.connect(gain);
    gain.connect(masterGain);
    src.start();
    lfo.start();
    nodes.push(src, lfo);

    // 和弦底音
    [110, 165, 220].forEach((freq, i) => {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.value = [0.12, 0.08, 0.06][i];
      osc.connect(g);
      g.connect(masterGain);
      osc.start();
      nodes.push(osc);
    });

    // 随机气泡
    function bubble() {
      if (!isPlaying || currentTrack !== 'ocean') return;
      const baseFreq = 400 + Math.random() * 800;
      const dur = 0.06 + Math.random() * 0.08;

      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, c.currentTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.8, c.currentTime + dur);
      g.gain.setValueAtTime(0.0, c.currentTime);
      g.gain.linearRampToValueAtTime(0.08, c.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);

      osc.connect(g);
      g.connect(masterGain);
      osc.start(c.currentTime);
      osc.stop(c.currentTime + dur + 0.05);

      scheduleTimer(bubble, 1500 + Math.random() * 3500);
    }
    scheduleTimer(bubble, 500);
  }

  /* ══════════════════════════════
     🧽 海绵宝宝主题 — 欢快尤克里里风格
     明亮的 C 大调旋律，跳跃的节奏
  ══════════════════════════════ */
  const SPONGEBOB_MELODY = [
    { note: 523.25, dur: 0.15 }, // C5
    { note: 587.33, dur: 0.15 }, // D5
    { note: 659.25, dur: 0.15 }, // E5
    { note: 523.25, dur: 0.15 }, // C5
    { note: 659.25, dur: 0.15 }, // E5
    { note: 587.33, dur: 0.3  }, // D5
    { note: 523.25, dur: 0.15 }, // C5
    { note: 493.88, dur: 0.15 }, // B4
    { note: 523.25, dur: 0.3  }, // C5
    { note: 392.00, dur: 0.3  }, // G4
    { note: 440.00, dur: 0.15 }, // A4
    { note: 493.88, dur: 0.15 }, // B4
    { note: 523.25, dur: 0.15 }, // C5
    { note: 493.88, dur: 0.15 }, // B4
    { note: 440.00, dur: 0.15 }, // A4
    { note: 392.00, dur: 0.3  }, // G4
  ];

  function startSpongebob() {
    const c = getCtx();
    let noteIndex = 0;

    function playNote() {
      if (!isPlaying || currentTrack !== 'spongebob') return;

      const { note, dur } = SPONGEBOB_MELODY[noteIndex];
      noteIndex = (noteIndex + 1) % SPONGEBOB_MELODY.length;

      // 尤克里里音色：三角波 + 轻微噪声
      const osc = c.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = note;

      const g = c.createGain();
      g.gain.setValueAtTime(0.12, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur * 0.9);

      // 轻微泛音
      const osc2 = c.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = note * 2;
      const g2 = c.createGain();
      g2.gain.setValueAtTime(0.04, c.currentTime);
      g2.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur * 0.8);

      osc.connect(g);
      g.connect(masterGain);
      osc2.connect(g2);
      g2.connect(masterGain);

      osc.start(c.currentTime);
      osc.stop(c.currentTime + dur);
      osc2.start(c.currentTime);
      osc2.stop(c.currentTime + dur);

      // 底音（C大三和弦）
      if (noteIndex % 4 === 0) {
        [261.63, 329.63, 392.00].forEach(freq => {
          const bass = c.createOscillator();
          bass.type = 'sine';
          bass.frequency.value = freq / 2;
          const bg = c.createGain();
          bg.gain.value = 0.06;
          bass.connect(bg);
          bg.connect(masterGain);
          bass.start(c.currentTime);
          bass.stop(c.currentTime + dur * 4);
          nodes.push(bass);
        });
      }

      scheduleTimer(playNote, dur * 1000 + 50);
    }

    playNote();
  }

  /* ══════════════════════════════
     🐙 章鱼哥忧郁 — 缓慢竖琴/大提琴
     小调，长音符，带颤音
  ══════════════════════════════ */
  const SQUIDWARD_NOTES = [
    220.00, // A3
    261.63, // C4
    293.66, // D4
    329.63, // E4
    293.66, // D4
    261.63, // C4
    220.00, // A3
    196.00, // G3
  ];

  function startSquidward() {
    const c = getCtx();
    let noteIndex = 0;

    function playNote() {
      if (!isPlaying || currentTrack !== 'squidward') return;

      const freq = SQUIDWARD_NOTES[noteIndex];
      noteIndex = (noteIndex + 1) % SQUIDWARD_NOTES.length;

      // 竖琴音色
      const osc = c.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      // 颤音
      const vib = c.createOscillator();
      vib.type = 'sine';
      vib.frequency.value = 4.5;
      const vibGain = c.createGain();
      vibGain.gain.value = freq * 0.008;
      vib.connect(vibGain);
      vibGain.connect(osc.frequency);

      const g = c.createGain();
      g.gain.setValueAtTime(0.0, c.currentTime);
      g.gain.linearRampToValueAtTime(0.15, c.currentTime + 0.3);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 2.5);

      osc.connect(g);
      g.connect(masterGain);

      osc.start(c.currentTime);
      vib.start(c.currentTime);
      osc.stop(c.currentTime + 3);
      vib.stop(c.currentTime + 3);
      nodes.push(osc, vib);

      scheduleTimer(playNote, 2800);
    }

    // 低音持续
    function drone() {
      if (!isPlaying || currentTrack !== 'squidward') return;
      const bass = c.createOscillator();
      bass.type = 'sine';
      bass.frequency.value = 110; // A2
      const g = c.createGain();
      g.gain.value = 0.08;
      bass.connect(g);
      g.connect(masterGain);
      bass.start();
      nodes.push(bass);
      scheduleTimer(drone, 10000);
    }

    playNote();
    drone();
  }

  /* ══════════════════════════════
     🦀 蟹老板贪财 — 紧张追逐
     快速断奏，锯齿波，低音驱动
  ══════════════════════════════ */
  const KRABS_BASS = [130.81, 146.83, 164.81, 146.83]; // C3 D3 E3 D3 循环
  const KRABS_MELODY = [523.25, 493.88, 440.00, 392.00, 440.00, 493.88, 523.25, 587.33];

  function startKrabs() {
    const c = getCtx();
    let bassIdx = 0;
    let melodyIdx = 0;

    function bassNote() {
      if (!isPlaying || currentTrack !== 'krabs') return;

      const freq = KRABS_BASS[bassIdx];
      bassIdx = (bassIdx + 1) % KRABS_BASS.length;

      const osc = c.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;

      const g = c.createGain();
      g.gain.setValueAtTime(0.12, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2);

      osc.connect(g);
      g.connect(masterGain);
      osc.start(c.currentTime);
      osc.stop(c.currentTime + 0.25);

      scheduleTimer(bassNote, 250);
    }

    function melodyNote() {
      if (!isPlaying || currentTrack !== 'krabs') return;

      const freq = KRABS_MELODY[melodyIdx];
      melodyIdx = (melodyIdx + 1) % KRABS_MELODY.length;

      const osc = c.createOscillator();
      osc.type = 'square';
      osc.frequency.value = freq;

      const g = c.createGain();
      g.gain.setValueAtTime(0.06, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);

      osc.connect(g);
      g.connect(masterGain);
      osc.start(c.currentTime);
      osc.stop(c.currentTime + 0.2);

      scheduleTimer(melodyNote, 180);
    }

    bassNote();
    scheduleTimer(melodyNote, 100);
  }

  /* ══════════════════════════════
     ⭐ 派大星发呆 — 空灵冥想
     极慢，玻璃琴音色，长延音
  ══════════════════════════════ */
  const PATRICK_NOTES = [261.63, 329.63, 392.00, 523.25, 659.25]; // C E G C E

  function startPatrick() {
    const c = getCtx();
    let noteIndex = 0;

    function playNote() {
      if (!isPlaying || currentTrack !== 'patrick') return;

      const freq = PATRICK_NOTES[noteIndex];
      noteIndex = (noteIndex + 1) % PATRICK_NOTES.length;

      // 玻璃琴音色：多个正弦波叠加
      const osc1 = c.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.value = freq;

      const osc2 = c.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = freq * 2;

      const osc3 = c.createOscillator();
      osc3.type = 'sine';
      osc3.frequency.value = freq * 3;

      const g1 = c.createGain();
      const g2 = c.createGain();
      const g3 = c.createGain();

      g1.gain.setValueAtTime(0.0, c.currentTime);
      g1.gain.linearRampToValueAtTime(0.1, c.currentTime + 1);
      g1.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 8);

      g2.gain.setValueAtTime(0.0, c.currentTime);
      g2.gain.linearRampToValueAtTime(0.03, c.currentTime + 1.5);
      g2.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 7);

      g3.gain.setValueAtTime(0.0, c.currentTime);
      g3.gain.linearRampToValueAtTime(0.01, c.currentTime + 2);
      g3.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 6);

      osc1.connect(g1);
      osc2.connect(g2);
      osc3.connect(g3);
      g1.connect(masterGain);
      g2.connect(masterGain);
      g3.connect(masterGain);

      osc1.start(c.currentTime);
      osc2.start(c.currentTime);
      osc3.start(c.currentTime);
      osc1.stop(c.currentTime + 10);
      osc2.stop(c.currentTime + 10);
      osc3.stop(c.currentTime + 10);
      nodes.push(osc1, osc2, osc3);

      scheduleTimer(playNote, 5000);
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
    masterGain.gain.linearRampToValueAtTime(1.0, c.currentTime + duration);
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
    // 更新按钮状态
    const btn = document.getElementById('bgm-btn');
    if (btn) {
      btn.textContent = TRACKS[currentTrack].emoji;
      btn.title = isPlaying ? '关闭背景音乐' : '开启背景音乐';
      btn.classList.toggle('bgm-on', isPlaying);
    }

    // 更新曲目列表高亮
    document.querySelectorAll('.bgm-track').forEach(el => {
      const track = el.dataset.track;
      el.classList.toggle('active', track === currentTrack);
    });
  }

  // 暴露曲目列表供 UI 使用
  function getTracks() {
    return TRACKS;
  }

  /* ══════════════════════════════
     渲染曲目列表
  ══════════════════════════════ */
  function renderTrackList() {
    const wrap = document.getElementById('bgm-tracks');
    if (!wrap) return;

    wrap.innerHTML = Object.entries(TRACKS).map(([id, track]) =>
      `<button class="bgm-track ${id === currentTrack ? 'active' : ''}"
        data-track="${id}"
        onclick="BGM.switchTrack('${id}')">${track.name}</button>`
    ).join('');
  }

  // 页面加载时渲染列表
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
