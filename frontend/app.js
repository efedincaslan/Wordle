console.log("✅ app.js loaded");

// ===== CONFIG =====
const ROWS = 6;
const COLS = 5;
const API_BASE =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:8000"
    : "https://wordle-nbni.onrender.com";


// ===== KEYBOARD =====
const KEY_ROWS = [
  ["Q","W","E","R","T","Y","U","I","O","P"],
  ["A","S","D","F","G","H","J","K","L"],
  ["ENTER","Z","X","C","V","B","N","M","⌫"]
];

// ===== STATE =====
let grid = Array.from({ length: ROWS }, () => Array(COLS).fill(""));        // letters
let tileState = Array.from({ length: ROWS }, () => Array(COLS).fill(""));   // "", "correct", "present", "absent"

let row = 0;
let col = 0;
let locked = false;
let gameOver = false;

// ===== DOM =====
const gridEl = document.getElementById("grid");
const statusEl = document.getElementById("status");
const keyboardEl = document.getElementById("keyboard");
const cheerEls = document.querySelectorAll(".cheer");

// ===== MODAL DOM =====
const modalEl = document.getElementById("modal");
const modalTitleEl = document.getElementById("modalTitle");
const modalSubtitleEl = document.getElementById("modalSubtitle");
const endMessageEl = document.getElementById("endMessage");       // NEW
const revealAnswerEl = document.getElementById("revealAnswer");   // NEW (optional use)
const closeModalEl = document.getElementById("closeModal");
const statPlayedEl = document.getElementById("statPlayed");
const statWinPctEl = document.getElementById("statWinPct");
const statStreakEl = document.getElementById("statStreak");
const statMaxStreakEl = document.getElementById("statMaxStreak");
const shareTextEl = document.getElementById("shareText");
const copyShareEl = document.getElementById("copyShare");

// Hard fail early if HTML IDs are wrong
if (!gridEl || !statusEl || !keyboardEl) {
  throw new Error("Missing required elements. Check index.html for #grid, #status, #keyboard.");
}

// ===== INIT =====
renderGrid();
buildKeyboard();
setStatus("");

// ===== UI HELPERS =====
function setStatus(msg){
  statusEl.textContent = msg || "";
}

function celebrateWin(){
  cheerEls.forEach(el => {
    el.classList.remove("lose");
    el.classList.add("win");
  });
}

function showLoss(){
  cheerEls.forEach(el => {
    el.classList.remove("win");
    el.classList.add("lose");
  });
}

// ===== RENDER =====
function renderGrid(){
  gridEl.innerHTML = "";

  for (let r = 0; r < ROWS; r++){
    const rowEl = document.createElement("div");
    rowEl.className = "row";

    for (let c = 0; c < COLS; c++){
      const tile = document.createElement("div");
      const letter = grid[r][c];
      const state = tileState[r][c];

      tile.className = "tile" + (letter ? " filled" : "");
      if (state) tile.classList.add(state);

      tile.textContent = letter;
      tile.dataset.r = r;
      tile.dataset.c = c;

      rowEl.appendChild(tile);
    }

    gridEl.appendChild(rowEl);
  }
}

function sleep(ms){
  return new Promise(res => setTimeout(res, ms));
}

function isLetter(k){
  return /^[a-zA-Z]$/.test(k);
}

function currentGuess(){
  return grid[row].join("");
}

// ===== KEYBOARD UI =====
function buildKeyboard(){
  keyboardEl.innerHTML = "";
  KEY_ROWS.forEach(keys => {
    const r = document.createElement("div");
    r.className = "krow";

    keys.forEach(k => {
      const btn = document.createElement("button");
      btn.className = "key" + (k === "ENTER" || k === "⌫" ? " wide" : "");
      btn.type = "button";
      btn.textContent = k;
      btn.dataset.key = k;
      btn.addEventListener("click", () => handleKey(k));
      r.appendChild(btn);
    });

    keyboardEl.appendChild(r);
  });
}

function setKeyState(letter, state){
  const rank = { correct: 3, present: 2, absent: 1 };
  const keys = keyboardEl.querySelectorAll(".key");

  keys.forEach(k => {
    if (k.dataset.key === letter){
      const existing = [...k.classList].find(cls => cls === "correct" || cls === "present" || cls === "absent");
      if (existing && rank[existing] >= rank[state]) return;
      k.classList.remove("correct","present","absent");
      k.classList.add(state);
    }
  });
}

// ===== INPUT HANDLING =====
document.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;

  if (e.key === "Backspace") { e.preventDefault(); return handleKey("⌫"); }
  if (e.key === "Enter")     { e.preventDefault(); return handleKey("ENTER"); }
  if (isLetter(e.key))       { return handleKey(e.key.toUpperCase()); }
});

function handleKey(key){
  if (locked || gameOver) return;

  setStatus("");

  if (key === "⌫"){
    if (col > 0){
      col--;
      grid[row][col] = "";
      renderGrid();
    }
    return;
  }

  if (key === "ENTER"){
    if (col < COLS){
      setStatus("Need 5 letters.");
      return;
    }
    submitGuess();
    return;
  }

  if (key.length === 1 && /^[A-Z]$/.test(key)){
    if (col < COLS){
      grid[row][col] = key;
      col++;
      renderGrid();
    }
  }
}

// ===== STATS (localStorage) =====
const STATS_KEY = "efesDailyWordStats";

function todayStr(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function loadStats(){
  try{
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { played:0, wins:0, streak:0, maxStreak:0, lastPlayed:null, lastWin:null };
    const s = JSON.parse(raw);
    return {
      played: s.played ?? 0,
      wins: s.wins ?? 0,
      streak: s.streak ?? 0,
      maxStreak: s.maxStreak ?? 0,
      lastPlayed: s.lastPlayed ?? null,
      lastWin: s.lastWin ?? null
    };
  } catch {
    return { played:0, wins:0, streak:0, maxStreak:0, lastPlayed:null, lastWin:null };
  }
}

function saveStats(s){
  localStorage.setItem(STATS_KEY, JSON.stringify(s));
}

function dayDiff(aStr, bStr){
  const a = new Date(aStr + "T00:00:00");
  const b = new Date(bStr + "T00:00:00");
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

function updateStatsOnFinish(didWin){
  const s = loadStats();
  const t = todayStr();

  // Only count once per day
  if (s.lastPlayed === t) return s;

  s.played += 1;
  s.lastPlayed = t;

  if (didWin){
    s.wins += 1;

    if (s.lastWin && dayDiff(s.lastWin, t) === 1) s.streak += 1;
    else s.streak = 1;

    s.lastWin = t;
    s.maxStreak = Math.max(s.maxStreak, s.streak);
  } else {
    s.streak = 0;
  }

  saveStats(s);
  return s;
}

function emojiFor(state){
  if (state === "correct") return "🟩";
  if (state === "present") return "🟨";
  return "⬛";
}

function buildEmojiGrid(usedRows){
  let out = "";
  for (let r = 0; r < usedRows; r++){
    for (let c = 0; c < COLS; c++){
      out += emojiFor(tileState[r][c] || "");
    }
    out += "\n";
  }
  return out.trimEnd();
}

// ===== MODAL UI =====
function openModal(){
  if (!modalEl) return;
  modalEl.classList.remove("hidden");
}
function closeModal(){
  if (!modalEl) return;
  modalEl.classList.add("hidden");
}

if (closeModalEl) closeModalEl.addEventListener("click", closeModal);
if (modalEl) {
  modalEl.addEventListener("click", (e) => {
    if (e.target === modalEl) closeModal();
  });
}
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

function showEndModal(didWin){
  const s = updateStatsOnFinish(didWin);
  const winPct = s.played ? Math.round((s.wins / s.played) * 100) : 0;

  // NEW: add win/lose class for styling
  if (modalEl){
    modalEl.classList.remove("win","lose");
    modalEl.classList.add(didWin ? "win" : "lose");
  }

  // Your requested copy
  if (modalTitleEl) modalTitleEl.textContent = didWin ? "Congratulations 🎉" : "Better luck next time, pal";
  if (modalSubtitleEl) modalSubtitleEl.textContent = didWin
    ? `Solved in ${row + 1}/${ROWS}`
    : `You used all ${ROWS} tries`;

  if (endMessageEl){
    endMessageEl.textContent = didWin
      ? "You nailed it. Come back tomorrow for a new word."
      : "That one was tough. Reset your brain and run it back tomorrow.";
  }

  // Optional: leave blank unless your backend returns the answer
  if (revealAnswerEl){
    revealAnswerEl.textContent = "";
  }

  if (statPlayedEl) statPlayedEl.textContent = String(s.played);
  if (statWinPctEl) statWinPctEl.textContent = `${winPct}%`;
  if (statStreakEl) statStreakEl.textContent = String(s.streak);
  if (statMaxStreakEl) statMaxStreakEl.textContent = String(s.maxStreak);

  const header = `Efe’s Daily Word ${todayStr()} — ${didWin ? (row + 1) + "/" + ROWS : "X/" + ROWS}`;
  const gridEmoji = buildEmojiGrid(didWin ? (row + 1) : ROWS);
  const fullShare = `${header}\n\n${gridEmoji}`;

  if (shareTextEl) shareTextEl.textContent = fullShare;

  if (copyShareEl){
    copyShareEl.onclick = async () => {
      try{
        await navigator.clipboard.writeText(fullShare);
        setStatus("Copied ✅");
      } catch {
        setStatus("Couldn’t copy. Your browser blocked it.");
      }
    };
  }

  openModal();
}

// ===== GAME LOGIC =====
async function submitGuess(){
  const guess = currentGuess();

  if (guess.length !== 5){
    setStatus("Need 5 letters.");
    return;
  }

  locked = true;

  try{
    const resp = await fetch(`${API_BASE}/guess`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guess })
    });

    const data = await resp.json();

    if (!resp.ok){
      locked = false;
      setStatus(data.detail || data.row_message || "Invalid guess.");
      return;
    }

    await revealRow(row, data.result);

    for (let i = 0; i < COLS; i++){
      setKeyState(guess[i], data.result[i]);
    }

    if (data.is_win){
      setStatus("Nice! You got it 🎉");
      celebrateWin();
      gameOver = true;
      locked = true;
      showEndModal(true);
      return;
    }

    row++;
    col = 0;

    if (row >= ROWS){
      setStatus("Game over. Try again tomorrow.");
      showLoss();
      gameOver = true;
      locked = true;
      showEndModal(false);
      return;
    }

    setStatus("Keep going.");
    locked = false;

  } catch (err){
    locked = false;
    setStatus("Backend not reachable. Start the API server.");
  }
}

async function revealRow(r, classes){
  for (let c = 0; c < COLS; c++){
    await sleep(120);
    tileState[r][c] = classes[c];
    renderGrid();
  }
}
