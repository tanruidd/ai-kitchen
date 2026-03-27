/**
 * bgm.js — 海底世界背景音乐（多曲可选，Web Audio API 合成）
 * 
 * 曲目：
 *   - spongebob  🧽 欢快尤克里里
 *   - krabs      🦀 蟹老板
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
  let currentTrack = 'spongebob';
  const nodes = [];
  let timers = [];

  const TRACKS = {
    spongebob: { name: '🧽 欢快尤克里里', emoji: '🧽' },
    krabs:     { name: '🦀 蟹老板',       emoji: '🦀' },
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
     🧽 欢快尤克里里
     温暖的正弦波，去掉底噪嗡嗡声
  ══════════════════════════════ */
  function startSpongebob() {
    const c = getCtx();

    // 温暖的 C 大调旋律
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
      g.gain.linearRampToValueAtTime(0.15, c.currentTime + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur / 1000 * 0.85);

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
      g2.gain.linearRampToValueAtTime(0.04, c.currentTime + 0.03);
      g2.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur / 1000 * 0.7);

      osc2.connect(g2);
      g2.connect(masterGain);
      osc2.start(c.currentTime);
      osc2.stop(c.currentTime + dur / 1000 + 0.1);

      // 每隔几个音符加一个轻柔的和弦底音
      if (noteIndex % 8 === 0) {
        [262, 330].forEach(freq => {
          const chordOsc = c.createOscillator();
          chordOsc.type = 'sine';
          chordOsc.frequency.value = freq;
          const chordG = c.createGain();
          chordG.gain.setValueAtTime(0.0, c.currentTime);
          chordG.gain.linearRampToValueAtTime(0.03, c.currentTime + 0.2);
          chordG.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.8);
          chordOsc.connect(chordG);
          chordG.connect(masterGain);
          chordOsc.start(c.currentTime);
          chordOsc.stop(c.currentTime + 1);
          nodes.push(chordOsc);
        });
      }

      scheduleTimer(playNote, dur + 60);
    }

    playNote();
  }

  /* ══════════════════════════════
     🦀 蟹老板 — 紧张但柔和
     用正弦波保持节奏感，加淡入避免刺耳
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

      const osc = c.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      // 加淡入避免刺耳
      const g = c.createGain();
      g.gain.setValueAtTime(0.0, c.currentTime);
      g.gain.linearRampToValueAtTime(0.12, c.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.25);

      osc.connect(g);
      g.connect(masterGain);
      osc.start(c.currentTime);
      osc.stop(c.currentTime + 0.35);

      scheduleTimer(bassNote, 300);
    }

    // 旋律线
    function melodyNote() {
      if (!isPlaying || currentTrack !== 'krabs') return;

      const freq = melodyPattern[melodyIdx];
      melodyIdx = (melodyIdx + 1) % melodyPattern.length;

      const osc = c.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      // 加淡入避免刺耳
      const g = c.createGain();
      g.gain.setValueAtTime(0.0, c.currentTime);
      g.gain.linearRampToValueAtTime(0.08, c.currentTime + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.18);

      osc.connect(g);
      g.connect(masterGain);
      osc.start(c.currentTime);
      osc.stop(c.currentTime + 0.25);

      scheduleTimer(melodyNote, 200);
    }

    bassNote();
    scheduleTimer(melodyNote, 150);
  }

  /* ══════════════════════════════
     曲目启动器
  ══════════════════════════════ */
  const TRACK_STARTERS = {
    spongebob: startSpongebob,
    krabs:     startKrabs,
  };

  /* ══════════════════════════════
     淡入 / 淡出
  ══════════════════════════════ */
  function fadeIn(duration = 2) {
    const c = getCtx();
    masterGain.gain.cancelScheduledValues(c.currentTime);
    masterGain.gain.setValueAtTime(0.0, c.currentTime);
    masterGain.gain.linearRampToValueAtTime(1.0, c.currentTime + duration); // 调大到 1.0
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

  document.addEventListener('DOMContentLoaded', () => {
    renderTrackList();

    // 刷新页面后，如果 BGM 是开启状态，在用户首次交互时自动恢复播放
    try {
      const s = JSON.parse(localStorage.getItem('ai-kitchen-settings') || '{}');
      if (s.bgmEnabled) {
        const resumeOnce = () => {
          document.removeEventListener('click', resumeOnce);
          document.removeEventListener('touchstart', resumeOnce);
          if (!isPlaying) start();
        };
        document.addEventListener('click', resumeOnce);
        document.addEventListener('touchstart', resumeOnce);
      }
    } catch {}
  });

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
