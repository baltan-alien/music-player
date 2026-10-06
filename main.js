const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// 12音階
const notes = [
  { name: "C", freq: 261.63, color: "#ff4444" },
  { name: "C#", freq: 277.18, color: "#aa4444" },
  { name: "D", freq: 293.66, color: "#ff8844" },
  { name: "D#", freq: 311.13, color: "#aa8844" },
  { name: "E", freq: 329.63, color: "#ffff44" },
  { name: "F", freq: 349.23, color: "#44ff44" },
  { name: "F#", freq: 369.99, color: "#44aa44" },
  { name: "G", freq: 392.00, color: "#4488ff" },
  { name: "G#", freq: 415.30, color: "#4466aa" },
  { name: "A", freq: 440.00, color: "#8844ff" },
  { name: "A#", freq: 466.16, color: "#6644aa" },
  { name: "B", freq: 493.88, color: "#aa44ff" }
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
  });
});

// 単音
function playNote(freq) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.frequency.value = freq;

  gain.gain.setValueAtTime(1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 2);

  osc.connect(gain).connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 2);
}

// コード
function playChord(rootIndex) {
  const intervals = chords[selectedCode];
  intervals.forEach(i => {
    const note = notes[(rootIndex + i) % 12];
    playNote(note.freq);
  });
}

// クロマティックサークル生成
const circle = document.getElementById("circle");

notes.forEach((note, i) => {
  const angle = (i / 12) * 2 * Math.PI;
  const x = 45 + 40 * Math.cos(angle);
  const y = 45 + 40 * Math.sin(angle);

  const btn = document.createElement("button");
  btn.className = "note-btn";
  btn.style.left = x + "%";
  btn.style.top = y + "%";
  btn.style.background = note.color;
  btn.textContent = note.name;

  btn.addEventListener("touchstart", () => {
    if (selectedCode) {
      playChord(i);
    } else {
      playNote(note.freq);
    }
  });

  circle.appendChild(btn);
});
