/* main.js
   - 画面フィッティング（横優先）
   - 3/4/5オクターブリング
   - 外周ラベル（ドレミ/CDE/五線）
   - タップ（短音） / ホールド（持続） / リリース（速やかに停止）
   - コードモード（系統色）・視覚フィードバック
   - 音質：電子ピアノ風 or チップチューン切替
*/

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// 12音（12時をC）
const notes = [
  { name: "C", jp: "ド", base: 261.6256, white: true },
  { name: "C#", jp: "ド♯", base: 277.1826, white: false },
  { name: "D", jp: "レ", base: 293.6648, white: true },
  { name: "D#", jp: "レ♯", base: 311.1270, white: false },
  { name: "E", jp: "ミ", base: 329.6276, white: true },
  { name: "F", jp: "ファ", base: 349.2282, white: true },
  { name: "F#", jp: "ファ♯", base: 369.9944, white: false },
  { name: "G", jp: "ソ", base: 391.9954, white: true },
  { name: "G#", jp: "ソ♯", base: 415.3047, white: false },
  { name: "A", jp: "ラ", base: 440.0000, white: true },
  { name: "A#", jp: "ラ♯", base: 466.1638, white: false },
  { name: "B", jp: "シ", base: 493.8833, white: true }
];

// コード構成
const chords = {
  maj: [0,4,7],
  min: [0,3,7],
  dim: [0,3,6],
  aug: [0,4,8],
  7: [0,4,7,10],
  maj7: [0,4,7,11],
  m7: [0,3,7,10],
  m7b5: [0,3,6,10],
  add9: [0,4,7,14],
  add11: [0,4,7,17],
  9: [0,4,7,10,14],
  11: [0,4,7,10,17],
  13: [0,4,7,10,21],
  slash: [0,7]
};

let selectedCode = null;
const circle = document.getElementById('circle');
const codeStatus = document.getElementById('code-status');
const clearBtn = document.getElementById('clear-code');
const soundModeInputs = document.querySelectorAll('input[name="soundMode"]');

let soundMode = 'piano';
soundModeInputs.forEach(i => i.addEventListener('change', () => soundMode = i.value));

// コードボタン挙動（色反映はCSSで）
document.querySelectorAll('.code-btn').forEach(btn => {
  btn.addEventListener('touchstart', e => {
    e.preventDefault();
    const code = btn.dataset.code;
    if (code) {
      selectedCode = code;
      codeStatus.textContent = `コードモード：${code}`;
      setActiveCodeButton(btn);
    } else if (btn.id === 'clear-code') {
      selectedCode = null;
      codeStatus.textContent = '単音モード';
      clearActiveCodeButtons();
    }
  }, { passive: false });

  btn.addEventListener('mousedown', e => {
    e.preventDefault();
    const code = btn.dataset.code;
    if (code) {
      selectedCode = code;
      codeStatus.textContent = `コードモード：${code}`;
      setActiveCodeButton(btn);
    } else if (btn.id === 'clear-code') {
      selectedCode = null;
      codeStatus.textContent = '単音モード';
      clearActiveCodeButtons();
    }
  });
});

function setActiveCodeButton(activeBtn) {
  document.querySelectorAll('.code-btn').forEach(b => b.classList.remove('active'));
  activeBtn.classList.add('active');
}
function clearActiveCodeButtons() {
  document.querySelectorAll('.code-btn').forEach(b => b.classList.remove('active'));
}

// 長押しメニュー・選択を無効化
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('selectstart', e => e.preventDefault());

// 音の管理（ホールドで持続、タップで短く）
const activeVoices = new Map(); // key: touchId or 'mouse-<btnid>' -> voice object

function createPianoVoice(freq) {
  const now = audioCtx.currentTime;

  // nodes
  const osc1 = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  const delay = audioCtx.createDelay();
  const fb = audioCtx.createGain();

  // osc
  osc1.type = 'sine';
  osc2.type = 'sine';
  osc1.frequency.value = freq;
  osc2.frequency.value = freq * 2.0005; // 微妙にずらす
  osc2.detune.value = -4;

  // filter
  filter.type = 'lowpass';
  filter.frequency.value = 7000;
  filter.Q.value = 0.8;

  // delay (short reverb-like)
  delay.delayTime.value = 0.06;
  fb.gain.value = 0.22;
  delay.connect(fb);
  fb.connect(delay);

  // connect
  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gain);
  gain.connect(delay);
  gain.connect(audioCtx.destination);
  delay.connect(audioCtx.destination);

  // initial gain
  gain.gain.setValueAtTime(0.0001, now);

  // start
  osc1.start(now);
  osc2.start(now);

  return { osc1, osc2, gain, filter, delay, fb };
}

function createChipVoice(freq) {
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const wave = audioCtx.createPeriodicWave(
    new Float32Array([0,0.8,0.2,0.05]), // real
    new Float32Array([0,0,0,0])         // imag
  );
  osc.setPeriodicWave(wave);
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  gain.gain.setValueAtTime(0.0001, now);
  osc.start(now);
  return { osc, gain };
}

// ADSR helpers
function noteOn(voice, mode='piano', duration=2.0) {
  const now = audioCtx.currentTime;
  if (mode === 'piano') {
    const attack = 0.01, decay = 0.18, sustain = 0.6;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(0.0001, now);
    voice.gain.gain.linearRampToValueAtTime(1.0, now + attack);
    voice.gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, sustain), now + attack + decay);
    // schedule auto release if short tap
    voice._autoReleaseAt = now + duration;
    voice._releaseScheduled = false;
  } else {
    // chip
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(0.0001, now);
    voice.gain.gain.linearRampToValueAtTime(0.9, now + 0.005);
    voice._autoReleaseAt = now + duration;
    voice._releaseScheduled = false;
  }
}

function noteOff(voice, mode='piano', quick=true) {
  const now = audioCtx.currentTime;
  const release = quick ? 0.08 : 0.6;
  if (voice.gain) {
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(voice.gain.gain.value || 1.0, now);
    voice.gain.gain.exponentialRampToValueAtTime(0.0001, now + release);
  }
  // stop oscillators after release
  const stopAt = now + release + 0.05;
  if (voice.osc1) { voice.osc1.stop(stopAt); voice.osc2.stop(stopAt); }
  if (voice.osc) { voice.osc.stop(stopAt); }
}

// play single note (used for tap and hold)
function startVoice(keyId, freq) {
  if (activeVoices.has(keyId)) return;
  const mode = soundMode;
  let voice;
  if (mode === 'piano') {
    voice = createPianoVoice(freq);
  } else {
    voice = createChipVoice(freq);
  }
  activeVoices.set(keyId, voice);
  noteOn(voice, mode, 0.18); // default short auto-release for tap
  // schedule auto-release if not held
  voice._autoReleaseTimer = setTimeout(() => {
    if (!voice._held) {
      noteOff(voice, mode, true);
      activeVoices.delete(keyId);
    } else {
      // if held, keep until release
    }
  }, 180);
}

function holdVoice(keyId, freq) {
  // if already exists, mark held
  let voice = activeVoices.get(keyId);
  if (!voice) {
    // create with longer sustain
    const mode = soundMode;
    if (mode === 'piano') voice = createPianoVoice(freq);
    else voice = createChipVoice(freq);
    activeVoices.set(keyId, voice);
    voice._held = true;
    noteOn(voice, mode, 4.0);
  } else {
    voice._held = true;
    // extend envelope if needed
    noteOn(voice, soundMode, 4.0);
  }
}

function releaseVoice(keyId, quick=true) {
  const voice = activeVoices.get(keyId);
  if (!voice) return;
  noteOff(voice, soundMode, quick);
  clearTimeout(voice._autoReleaseTimer);
  activeVoices.delete(keyId);
}

// コード再生（同時に複数音）
function playChordOnce(rootIndex, octaveOffset = 0) {
  if (!selectedCode) return;
  const intervals = chords[selectedCode];
  if (!intervals) return;
  intervals.forEach(interval => {
    const idx = (rootIndex + interval) % 12;
    const base = notes[idx].base;
    const freq = base * Math.pow(2, octaveOffset);
    // short tap for chord notes
    const keyId = `chord-${rootIndex}-${interval}-${Date.now()}-${Math.random()}`;
    startVoice(keyId, freq);
    // ensure release after 1.6s
    setTimeout(() => releaseVoice(keyId, false), 1600);
  });
}

// UI: build circle with 3/4/5 octaves and outer labels
function buildCircle() {
  circle.innerHTML = '';
  const center = { x: 50, y: 50 };
  // radii in percent of circle
  const r3 = 18, r4 = 30, r5 = 42, rLabel = 54;

  notes.forEach((note, i) => {
    const angle = (i / 12) * 2 * Math.PI - Math.PI / 2; // 12時をC

    [['3', r3], ['4', r4], ['5', r5]].forEach(([oct, r]) => {
      const x = center.x + r * Math.cos(angle);
      const y = center.y + r * Math.sin(angle);

      const btn = document.createElement('button');
      btn.className = 'note-btn';
      btn.style.left = `${x}%`;
      btn.style.top = `${y}%`;
      btn.dataset.index = i;
      btn.dataset.oct = oct;

      // 色分け 白鍵/黒鍵
      const hue = (i * 30) % 360;
      if (note.white) {
        btn.style.background = `hsl(${hue}, 78%, 60%)`;
        btn.style.color = '#111';
      } else {
        btn.style.background = `hsl(${hue}, 28%, 30%)`;
        btn.style.color = '#fff';
      }

      // 視覚ラベルは外周のみ。ボタン上は空にしてタッチ領域を確保
      btn.textContent = '';

      // タッチハンドラ（複数指対応）
      const start = (ev) => {
        ev.preventDefault();
        btn.classList.add('active');
        const idx = parseInt(btn.dataset.index, 10);
        const octOffset = parseInt(btn.dataset.oct, 10) - 4;
        const base = notes[idx].base;
        const freq = base * Math.pow(2, octOffset);

        // If code mode active, play chord once (short)
        if (selectedCode) {
          playChordOnce(idx, octOffset);
        } else {
          // Distinguish tap vs hold by pointer type and duration
          const pointerId = (ev.changedTouches ? ev.changedTouches[0].identifier : `mouse-${idx}-${octOffset}-${Date.now()}`);
          // start a short voice immediately (so user hears "ポン")
          startVoice(pointerId, freq);
          // mark held after small delay if still touching
          const holdTimer = setTimeout(() => {
            // if still active, convert to hold (sustain)
            if (activeVoices.has(pointerId)) {
              holdVoice(pointerId, freq);
            }
          }, 160); // 160ms threshold for hold
          // store timer on element for cleanup
          btn._holdTimer = holdTimer;
          btn._pointerId = pointerId;
        }
      };

      const end = (ev) => {
        ev.preventDefault();
        btn.classList.remove('active');
        const pointerId = btn._pointerId;
        if (pointerId) {
          // if holdTimer still pending, clear and treat as tap (short)
          if (btn._holdTimer) {
            clearTimeout(btn._holdTimer);
            btn._holdTimer = null;
            // release quickly (tap)
            releaseVoice(pointerId, true);
          } else {
            // was held: release with quick stop (ポーン)
            releaseVoice(pointerId, true);
          }
          btn._pointerId = null;
        }
      };

      // touch events
      btn.addEventListener('touchstart', start, { passive: false });
      btn.addEventListener('touchend', end, { passive: false });
      btn.addEventListener('touchcancel', end, { passive: false });

      // mouse fallback
      btn.addEventListener('mousedown', (e) => { start(e); });
      window.addEventListener('mouseup', (e) => {
        // if mouse was used, end all active mouse voices for this button
        end(e);
      });

      circle.appendChild(btn);
    });

    // 外周ラベル
    const lx = center.x + rLabel * Math.cos(angle);
    const ly = center.y + rLabel * Math.sin(angle);
    const label = document.createElement('div');
    label.className = 'note-label';
    label.style.left = `${lx}%`;
    label.style.top = `${ly}%`;
    label.innerHTML = `<div class="jp">${note.jp}</div><div class="en">${note.name}</div><div class="staff">♪</div>`;
    circle.appendChild(label);
  });
}

// 初期構築
buildCircle();

// 画面フィッティング：circle のサイズは CSS vmin を使っているが、必要なら再構築
window.addEventListener('resize', () => {
  // 再構築は重い。通常は不要. もしズレが出る環境があれば有効化:
  // buildCircle();
});

// service worker メッセージ受信（更新時にリロード）
if (navigator.serviceWorker) {
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data && event.data.type === 'RELOAD_PAGE') {
      window.location.reload(true);
    }
  });
     }
