/* main.js
   - 3重リング（3/4/5オクターブ）
   - 12時をCに固定
   - 外周ラベルに ドレミ / CDE / 五線譜アイコン
   - コードボタン確実動作、選択解除ボタンあり
   - 音質：2オシレーター（微デチューン）＋LPF＋ADSR＋短い残響（フィードバックディレイ）
   - service worker 更新通知処理あり
*/

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// 12音 12時をCにする配列
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

// UI 要素
const circle = document.getElementById('circle');
const codeStatus = document.getElementById('code-status');
const clearBtn = document.getElementById('clear-code');

// コードボタンの挙動
document.querySelectorAll('.code-btn').forEach(btn => {
  btn.addEventListener('touchstart', e => {
    e.preventDefault();
    const code = btn.dataset.code;
    if (code) {
      selectedCode = code;
      codeStatus.textContent = `コードモード：${code}`;
    } else if (btn.id === 'clear-code') {
      selectedCode = null;
      codeStatus.textContent = '単音モード';
    }
  });
  // PCでもクリック対応
  btn.addEventListener('mousedown', e => {
    e.preventDefault();
    const code = btn.dataset.code;
    if (code) {
      selectedCode = code;
      codeStatus.textContent = `コードモード：${code}`;
    } else if (btn.id === 'clear-code') {
      selectedCode = null;
      codeStatus.textContent = '単音モード';
    }
  });
});

// 長押しメニューや選択を無効化
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('selectstart', e => e.preventDefault());

// 音声合成関数（ピアノ風）
function playNote(freq, duration = 2.0) {
  const now = audioCtx.currentTime;

  // ノード群
  const oscA = audioCtx.createOscillator();
  const oscB = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  const delay = audioCtx.createDelay();
  const fb = audioCtx.createGain();

  // オシレーター設定（微デチューンで暖かさ）
  oscA.type = 'sine';
  oscB.type = 'sine';
  oscA.frequency.value = freq;
  oscB.frequency.value = freq * 1.997; // ほぼ2倍だが微妙にずらすことで倍音感
  oscB.detune.value = -6; // 少しデチューン

  // フィルタで高域を丸める（ピアノっぽく）
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(6000, now);
  filter.Q.setValueAtTime(0.8, now);

  // 短い残響風（フィードバックディレイ）
  delay.delayTime.value = 0.08;
  fb.gain.value = 0.25;
  delay.connect(fb);
  fb.connect(delay);

  // エンベロープ ADSR
  const attack = 0.01;
  const decay = 0.25;
  const sustain = 0.6;
  const release = 1.2;

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(1.0, now + attack);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, sustain), now + attack + decay);
  // release scheduled below

  // 接続
  oscA.connect(filter);
  oscB.connect(filter);
  filter.connect(gain);
  gain.connect(delay);
  gain.connect(audioCtx.destination);
  delay.connect(audioCtx.destination);

  // start/stop
  oscA.start(now);
  oscB.start(now);

  // stop with release
  gain.gain.setValueAtTime(sustain, now + duration);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration + release);

  oscA.stop(now + duration + release + 0.1);
  oscB.stop(now + duration + release + 0.1);
}

// コード再生（ルート index とオクターブオフセット）
function playChord(rootIndex, octaveOffset = 0) {
  if (!selectedCode) return;
  const intervals = chords[selectedCode];
  if (!intervals) return;
  intervals.forEach(interval => {
    const idx = (rootIndex + interval) % 12;
    const base = notes[idx].base;
    const freq = base * Math.pow(2, octaveOffset);
    playNote(freq, 2.0);
  });
}

// クロマティックサークル生成
function buildCircle() {
  circle.innerHTML = '';
  const center = { x: 50, y: 50 };

  // 半径（%） 内側から3,4,5, ラベル外周
  const radii = { r3: 18, r4: 30, r5: 42, rLabel: 54 };

  notes.forEach((note, i) => {
    // 角度 12時をCにするため -90deg offset
    const angle = (i / 12) * 2 * Math.PI - Math.PI / 2;

    // 各オクターブボタン
    [['3', radii.r3], ['4', radii.r4], ['5', radii.r5]].forEach(([oct, r]) => {
      const x = center.x + r * Math.cos(angle);
      const y = center.y + r * Math.sin(angle);

      const btn = document.createElement('button');
      btn.className = 'note-btn';
      btn.style.left = `${x}%`;
      btn.style.top = `${y}%`;
      btn.dataset.index = i;
      btn.dataset.oct = oct;

      // 色分け 白鍵は鮮やか、黒鍵は彩度低め
      const hue = (i * 30) % 360;
      if (note.white) {
        btn.style.background = `hsl(${hue}, 78%, 60%)`;
        btn.style.color = '#111';
      } else {
        btn.style.background = `hsl(${hue}, 28%, 30%)`;
        btn.style.color = '#fff';
      }

      // ボタン内は最小限の表示（視認性のため空にするか小さく）
      btn.textContent = ''; // ボタン上の音名は表示しない（外周ラベルで表示）

      // タッチとマウス両対応
      const startHandler = e => {
        e.preventDefault();
        const idx = parseInt(btn.dataset.index, 10);
        const octOffset = parseInt(btn.dataset.oct, 10) - 4; // 4を基準
        if (selectedCode) {
          playChord(idx, octOffset);
        } else {
          const base = notes[idx].base;
          const freq = base * Math.pow(2, octOffset);
          playNote(freq, 2.0);
        }
      };
      btn.addEventListener('touchstart', startHandler, { passive: false });
      btn.addEventListener('mousedown', e => { e.preventDefault(); startHandler(e); });

      circle.appendChild(btn);
    });

    // 外周ラベル（ドレミ / CDE / 五線譜）
    const lx = center.x + radii.rLabel * Math.cos(angle);
    const ly = center.y + radii.rLabel * Math.sin(angle);

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

// 画面回転やリサイズ時に再フィット
window.addEventListener('resize', () => {
  // circle のサイズは CSS で自動調整。再描画は不要だが、必要なら再構築
  // buildCircle(); // 不要だが、もし位置ずれが出る場合は有効化
});

// service worker 更新通知を受け取るためのリスナー
if (navigator.serviceWorker) {
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data && event.data.type === 'RELOAD_PAGE') {
      // 新しいSWが有効になったらページをリロードして新しいキャッシュを取得
      window.location.reload(true);
    }
  });
}
