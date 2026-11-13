// ===== Configuration =====
const BAG_CONTENTS = { black: 67, white: 33 }; // 검은 바둑알 67개, 흰 바둑알 33개 = 총 100개
const TOTAL_STONES = BAG_CONTENTS.black + BAG_CONTENTS.white;
const COLOR_NAME = { black: '검은색', white: '흰색' };

// ===== State =====
let trials = [];
let blackCount = 0;
let whiteCount = 0;
let isDrawing = false;

// ===== DOM References =====
const dataTbody = document.getElementById('data-tbody');
const emptyMsg = document.getElementById('empty-message');
const blackBar = document.getElementById('black-bar');
const whiteBar = document.getElementById('white-bar');
const blackBarText = document.getElementById('black-bar-text');
const whiteBarText = document.getElementById('white-bar-text');
const blackStatsEl = document.getElementById('black-stats');
const whiteStatsEl = document.getElementById('white-stats');
const drawnBall = document.getElementById('drawn-ball');
const drawnBallLabel = document.getElementById('drawn-ball-label');
const notification = document.getElementById('notification');
const bagEl = document.getElementById('bag');
const tableWrapper = document.getElementById('table-wrapper');
const allBtns = document.querySelectorAll('.action-btn');
const restoreBadge = document.getElementById('restore-badge');
const totalCountEl = document.getElementById('total-count-value');

// ===== Core Logic =====
function drawOneStone() {
  const rand = Math.random() * TOTAL_STONES;
  return rand < BAG_CONTENTS.black ? 'black' : 'white';
}

function addTrial(color) {
  const trial = { num: trials.length + 1, color, replaced: true };
  trials.push(trial);
  if (color === 'black') blackCount++;
  else whiteCount++;
}

// ===== UI Updates =====
function renderLastNRows(n) {
  const start = Math.max(0, trials.length - n);
  const frag = document.createDocumentFragment();
  for (let i = start; i < trials.length; i++) {
    const t = trials[i];
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${t.num}회차</td>
      <td class="color-cell ${t.color}"><span class="stone-dot ${t.color}"></span>${COLOR_NAME[t.color]}</td>
      <td class="check-cell">⊙</td>
    `;
    frag.appendChild(row);
  }
  dataTbody.appendChild(frag);
}

function updateStats() {
  const total = blackCount + whiteCount;
  totalCountEl.textContent = total.toLocaleString();
  if (total === 0) {
    blackBar.style.width = '0%';
    whiteBar.style.width = '0%';
    blackBarText.textContent = '0';
    whiteBarText.textContent = '0';
    blackStatsEl.textContent = '개수: 0, 비율: 0.000';
    whiteStatsEl.textContent = '개수: 0, 비율: 0.000';
    return;
  }
  const blackRatio = blackCount / total;
  const whiteRatio = whiteCount / total;
  const blackPct = (blackRatio * 100).toFixed(1);
  const whitePct = (whiteRatio * 100).toFixed(1);

  blackBar.style.width = blackPct + '%';
  whiteBar.style.width = whitePct + '%';
  blackBarText.textContent = parseFloat(blackPct) >= 8 ? blackPct : '';
  whiteBarText.textContent = parseFloat(whitePct) >= 8 ? whitePct : '';
  blackStatsEl.textContent = `개수: ${blackCount.toLocaleString()}, 비율: ${blackRatio.toFixed(3)}`;
  whiteStatsEl.textContent = `개수: ${whiteCount.toLocaleString()}, 비율: ${whiteRatio.toFixed(3)}`;
}

function scrollTableToBottom() {
  tableWrapper.scrollTop = tableWrapper.scrollHeight;
}

function showEmptyMsg(show) {
  emptyMsg.classList.toggle('hide', !show);
}

function showNotification(show) {
  notification.classList.toggle('hidden', !show);
}

function setButtonsDisabled(disabled) {
  allBtns.forEach(b => b.disabled = disabled);
}

function shakeBag() {
  bagEl.classList.remove('shake');
  void bagEl.offsetWidth;
  bagEl.classList.add('shake');
}

function bagReceive() {
  bagEl.style.transform = '';
  bagEl.classList.remove('shake', 'receive');
  void bagEl.offsetWidth;
  bagEl.classList.add('receive');
}

// ===== JS-Based Rumble (reliable, no CSS conflicts) =====
let rumbleTimer = null;
function startRumble() {
  let frame = 0;
  const moves = [
    'translate(-5px, 2px) rotate(-3deg)',
    'translate(4px, -2px) rotate(2.5deg)',
    'translate(-3px, 3px) rotate(-2deg)',
    'translate(5px, -1px) rotate(3deg)',
    'translate(-2px, -2px) rotate(-1.5deg)',
    'translate(3px, 1px) rotate(2deg)',
  ];
  rumbleTimer = setInterval(() => {
    bagEl.style.transform = moves[frame % moves.length];
    frame++;
  }, 60);
}
function stopRumble() {
  if (rumbleTimer) {
    clearInterval(rumbleTimer);
    rumbleTimer = null;
  }
  bagEl.style.transform = '';
}

function showDrawnBall(color) {
  drawnBall.className = '';
  drawnBallLabel.textContent = COLOR_NAME[color];
  drawnBall.classList.add(color === 'black' ? 'is-black' : 'is-white', 'show');
}

function hideDrawnBall() {
  drawnBall.className = 'hidden';
}

// ===== Restore Badge Helpers =====
function showBadge(text, stepClass) {
  restoreBadge.className = 'show ' + stepClass;
  restoreBadge.textContent = text;
}

function hideBadge() {
  restoreBadge.className = 'hidden';
  restoreBadge.textContent = '';
}

// ===== Sparkle Effect =====
function emitSparkles() {
  const bagBody = document.getElementById('bag-body');
  const rect = bagBody.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + 20;
  const colors = ['#feca57', '#ff6b6b', '#48dbfb', '#55efc4', '#a29bfe', '#fd79a8'];

  for (let i = 0; i < 10; i++) {
    const spark = document.createElement('div');
    spark.className = 'sparkle';
    const angle = (Math.PI * 2 / 10) * i + Math.random() * 0.5;
    const dist = 40 + Math.random() * 50;
    spark.style.left = cx + 'px';
    spark.style.top = cy + 'px';
    spark.style.position = 'fixed';
    spark.style.background = colors[i % colors.length];
    spark.style.setProperty('--sx', Math.cos(angle) * dist + 'px');
    spark.style.setProperty('--sy', Math.sin(angle) * dist + 'px');
    document.body.appendChild(spark);
    setTimeout(() => spark.remove(), 750);
  }
}

// ===== Draw Handlers =====
async function handleDraw(count) {
  if (isDrawing) return;
  isDrawing = true;
  setButtonsDisabled(true);
  showEmptyMsg(false);
  hideBadge();
  // Clean up any leftover animation classes
  bagEl.classList.remove('shake', 'receive');
  bagEl.style.transform = '';

  if (count === 1) {
    // ── Step 1: Shake bag & draw stone out ──
    showNotification(true);
    showBadge('🤚 뽑는 중...', 'step-draw');
    shakeBag();
    await delay(500);

    const color = drawOneStone();
    addTrial(color);
    showDrawnBall(color);
    showNotification(false);

    // ── Step 2: Show color (wobble) ──
    await delay(400);
    showBadge(`👀 ${COLOR_NAME[color]} 바둑알이다!`, 'step-check');
    drawnBall.classList.add('wobble');
    await delay(1500);
    drawnBall.classList.remove('wobble');

    // ── Step 3: Return stone to bag ──
    showBadge('↩️ 다시 넣어요~', 'step-return');
    drawnBall.classList.remove('show');
    drawnBall.classList.add('returning');
    await delay(500);
    bagReceive();
    emitSparkles();
    await delay(300);

    // ── Step 4: Done ──
    showBadge('✅ 다시 넣었어요!', 'step-done');
    drawnBall.className = 'hidden';
    renderLastNRows(1);
    updateStats();
    scrollTableToBottom();
    await delay(1000);
    hideBadge();

  } else {
    // Batch draw: compute → rumble → render
    showNotification(true);
    hideDrawnBall();

    // Step 1: Compute all draws (no DOM updates)
    for (let i = 0; i < count; i++) {
      addTrial(drawOneStone());
    }

    // Step 2: JS rumble animation
    startRumble();
    const rumbleDuration = count <= 10 ? 1500 : 2500;
    await delay(rumbleDuration);
    stopRumble();
    bagReceive();

    // Step 3: Render all results at once
    renderLastNRows(count);
    updateStats();
    scrollTableToBottom();

    // Show last drawn stone
    showDrawnBall(trials[trials.length - 1].color);
    await delay(400);
    showNotification(false);
  }

  isDrawing = false;
  setButtonsDisabled(false);
}

function handleReset() {
  if (isDrawing) return;
  trials = [];
  blackCount = 0;
  whiteCount = 0;
  dataTbody.innerHTML = '';
  hideDrawnBall();
  hideBadge();
  updateStats();
  showEmptyMsg(true);
  showNotification(false);
}

// ===== Help Modal =====
document.getElementById('help-btn').addEventListener('click', () => {
  document.getElementById('help-modal').classList.remove('hidden');
});

function closeHelp() {
  document.getElementById('help-modal').classList.add('hidden');
}

// Close modal on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeHelp();
});

// ===== Utility =====
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== Generate Shadow Stones =====
function generateShadowBalls() {
  const container = document.getElementById('bag-shadow-balls');
  const count = 55; // visually dense but not overwhelming
  for (let i = 0; i < count; i++) {
    const stone = document.createElement('div');
    stone.className = 'shadow-ball' + (Math.random() < BAG_CONTENTS.black / TOTAL_STONES ? ' dark' : ' light');
    const size = 12 + Math.random() * 10; // 12-22px
    const left = 10 + Math.random() * 80; // 10-90% from left
    const bottom = 5 + Math.random() * 55; // 5-60% from bottom
    stone.style.width = size + 'px';
    stone.style.height = size + 'px';
    stone.style.left = left + '%';
    stone.style.bottom = bottom + '%';
    stone.style.opacity = 0.4 + Math.random() * 0.5;
    container.appendChild(stone);
  }
}

// ===== Init =====
generateShadowBalls();
showEmptyMsg(true);
updateStats();
