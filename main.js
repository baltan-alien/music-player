const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// 12時方向をCにする並び
const notes = [
  { name: "C", jp: "ド", freqBase: 261.63, white: true },
  { name: "C#", jp: "ド#", freqBase: 277.18, white: false },
  { name: "D", jp: "レ", freqBase: 293.66, white: true },
  { name: "D#", jp: "レ#", freqBase: 311.13, white: false },
  { name: "E", jp: "ミ", freqBase: 329.63, white: true },
  { name: "F", jp: "ファ", freqBase: 349.23, white: true },
  { name: "F#", jp: "ファ#", freqBase: 369.99, white: false },
  { name: "G", jp: "ソ", freqBase: 392.00, white: true },
  { name: "G#", jp: "ソ#", freqBase: 415.30, white: false },
  { name: "A", jp: "ラ", freqBase: 440.00, white: true },
  { name: "A#", jp: "ラ#", freqBase: 466.16, white: false },
  { name: "B", jp: "シ", freqBase: 493.88, white: true }
];

// コード構成
const chords = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  7: [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  m7b5: [0, 3, 6, 10],
  add9: [0, 4, 7, 14],
  add11: [0, 4, 7, 17],
  9: [0, 4, 7, 10, 14],
  11: [0, 4, 7, 10, 17],
  13: [0, 4, 7, 10, 21],
  slash: [0, 7]
};

let selectedCode = null;

// コードボタン
document.querySelectorAll(".code-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    selectedCode = btn.dataset.code;
    document.getElementById("code-status").textContent =
      selectedCode ? `コードモード：${selectedCode}` : "単音モード";
  });
});

// ピアノ風の音（倍音＋エンベロープ）
function playNote(freq) {
  const osc1 = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc1.type = "sine";
  osc2.type = "sine";

  osc1.frequency.value = freq;
  osc2.frequency.value = freq * 2; // 1オクターブ上の倍音

  const now = audioCtx.currentTime;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.9, now + 0.02); // アタック
  gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0); // 減衰

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(audioCtx.destination);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 2.0);
  osc2.stop(now + 2.0);
}

// コード再生
function playChord(rootIndex, octaveOffset = 0) {
  const intervals = chords[selectedCode];
  if (!intervals) return;
  intervals.forEach(i => {
    const idx = (rootIndex + i) % 12;
    const base = notes[idx].freqBase;
    const freq = base * Math.pow(2, octaveOffset);
    playNote(freq);
  });
}

// クロマティックサークル生成
const circle = document.getElementById("circle");

// 半径方向：3・4・5オクターブ
const radii = {
  "3": 25,
  "4": 35,
  "5": 45,
  label: 55
};

// 12時方向をCに
notes.forEach((note, i) => {
  const angle = ((i / 12) * 2 * Math.PI) - Math.PI / 2; // 12時基準

  // 3〜5オクターブのボタン
  ["3", "4", "5"].forEach(oct => {
    const r = radii[oct];
    const x = 50 + r * Math.cos(angle);
    const y = 50 + r * Math.sin(angle);

    const btn = document.createElement("button");
    btn.className = "note-btn";
    btn.style.left = x + "%";
    btn.style.top = y + "%";

    // 白鍵／黒鍵で彩度を分ける
    if (note.white) {
      btn.style.background = "hsl(" + (i * 30) + ", 80%, 60%)";
    } else {
      btn.style.background = "hsl(" + (i * 30) + ", 30%, 30%)";
    }

    btn.dataset.index = i;
    btn.dataset.oct = oct;

    btn.addEventListener("touchstart", e => {
      e.preventDefault();
      const idx = parseInt(btn.dataset.index, 10);
      const octOffset = parseInt(btn.dataset.oct, 10) - 4; // 4オクターブを基準
      if (selectedCode) {
        playChord(idx, octOffset);
      } else {
        const base = notes[idx].freqBase;
        const freq = base * Math.pow(2, octOffset);
        playNote(freq);
      }
    });

    circle.appendChild(btn);
  });

  // 外周ラベル（ドレミ＋CDE＋五線譜アイコン）
  const lr = radii.label;
  const lx = 50 + lr * Math.cos(angle);
  const ly = 50 + lr * Math.sin(angle);

  const label = document.createElement("div");
  label.className = "note-label";
  label.style.left = lx + "%";
  label.style.top = ly + "%";

  label.innerHTML =
    `<div>${note.jp}</div><div>${note.name}</div><div>♪</div>`;

  circle.appendChild(label);
});
