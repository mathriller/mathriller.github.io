// ===== Configuration =====
const BAG_CONTENTS = { red: 62, blue: 38 }; // 빨간공 62개, 파란공 38개 = 총 100개
const TOTAL_BALLS = BAG_CONTENTS.red + BAG_CONTENTS.blue;

// ===== State =====
let trials = [];
let redCount = 0;
let blueCount = 0;
let isDrawing = false;

// ===== DOM References =====
const dataTbody = document.getElementById('data-tbody');
const emptyMsg = document.getElementById('empty-message');
const redBar = document.getElementById('red-bar');
const blueBar = document.getElementById('blue-bar');
const redBarText = document.getElementById('red-bar-text');
const blueBarText = document.getElementById('blue-bar-text');
const redStatsEl = document.getElementById('red-stats');
const blueStatsEl = document.getElementById('blue-stats');
const drawnBall = document.getElementById('drawn-ball');
const drawnBallLabel = document.getElementById('drawn-ball-label');
const notification = document.getElementById('notification');
const drawHand = document.getElementById('draw-hand');
const bagEl = document.getElementById('bag');
const tableWrapper = document.getElementById('table-wrapper');
const allBtns = document.querySelectorAll('.action-btn');
const restoreBadge = document.getElementById('restore-badge');
const totalCountEl = document.getElementById('total-count-value');

// ===== Core Logic =====
function drawOneBall() {
  const rand = Math.random() * TOTAL_BALLS;
  return rand < BAG_CONTENTS.red ? 'red' : 'blue';
}

function addTrial(color) {
  const trial = { num: trials.length + 1, color, replaced: true };
  trials.push(trial);
  if (color === 'red') redCount++;
  else blueCount++;
}

// ===== UI Updates =====
function renderLastNRows(n) {
  const start = Math.max(0, trials.length - n);
  for (let i = start; i < trials.length; i++) {
    const t = trials[i];
    const row = document.createElement('tr');
    const colorKo = t.color === 'red' ? '빨간색' : '파란색';
    row.innerHTML = `
      <td>${t.num}회차</td>
      <td class="color-cell ${t.color}">${colorKo}</td>
      <td class="check-cell">⊙</td>
    `;
    dataTbody.appendChild(row);
  }
}

function updateStats() {
  const total = redCount + blueCount;
  totalCountEl.textContent = total.toLocaleString();
  if (total === 0) {
    redBar.style.width = '0%';
    blueBar.style.width = '0%';
    redBarText.textContent = '0';
    blueBarText.textContent = '0';
    redStatsEl.textContent = '개수: 0, 비율: 0.000';
    blueStatsEl.textContent = '개수: 0, 비율: 0.000';
    return;
  }
  const redRatio = redCount / total;
  const blueRatio = blueCount / total;
  const redPct = (redRatio * 100).toFixed(1);
  const bluePct = (blueRatio * 100).toFixed(1);

  redBar.style.width = redPct + '%';
  blueBar.style.width = bluePct + '%';
  redBarText.textContent = parseFloat(redPct) >= 8 ? redPct : '';
  blueBarText.textContent = parseFloat(bluePct) >= 8 ? bluePct : '';
  redStatsEl.textContent = `개수: ${redCount}, 비율: ${redRatio.toFixed(3)}`;
  blueStatsEl.textContent = `개수: ${blueCount}, 비율: ${blueRatio.toFixed(3)}`;
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
  drawnBallLabel.textContent = color === 'red' ? '빨간색' : '파란색';
  drawnBall.classList.add(color === 'red' ? 'is-red' : 'is-blue', 'show');
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
    // ── Step 1: Shake bag & draw ball out ──
    showNotification(true);
    showBadge('🤚 뽑는 중...', 'step-draw');
    shakeBag();
    await delay(500);

    const color = drawOneBall();
    addTrial(color);
    showDrawnBall(color);
    showNotification(false);

    // ── Step 2: Show color (wobble) ──
    await delay(400);
    const colorName = color === 'red' ? '빨간색' : '파란색';
    showBadge(`👀 ${colorName} 공이다!`, 'step-check');
    drawnBall.classList.add('wobble');
    await delay(1500);
    drawnBall.classList.remove('wobble');

    // ── Step 3: Return ball to bag ──
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
    const newTrials = [];
    for (let i = 0; i < count; i++) {
      const color = drawOneBall();
      addTrial(color);
      newTrials.push(trials[trials.length - 1]);
    }

    // Step 2: JS rumble animation (guaranteed to work)
    startRumble();
    const rumbleDuration = count <= 10 ? 1500 : 2500;
    await delay(rumbleDuration);
    stopRumble();
    bagReceive();

    // Step 3: Render all results at once
    renderLastNRows(count);
    updateStats();
    scrollTableToBottom();

    // Show last drawn ball
    const lastColor = newTrials[newTrials.length - 1].color;
    showDrawnBall(lastColor);
    await delay(400);
    showNotification(false);
  }

  isDrawing = false;
  setButtonsDisabled(false);
}

function handleReset() {
  if (isDrawing) return;
  trials = [];
  redCount = 0;
  blueCount = 0;
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

function nextFrame() {
  return new Promise(resolve => requestAnimationFrame(resolve));
}

// ===== Generate Shadow Balls =====
function generateShadowBalls() {
  const container = document.getElementById('bag-shadow-balls');
  const count = 55; // visually dense but not overwhelming
  for (let i = 0; i < count; i++) {
    const ball = document.createElement('div');
    ball.className = 'shadow-ball';
    const size = 12 + Math.random() * 10; // 12-22px
    const left = 10 + Math.random() * 80; // 10-90% from left
    const bottom = 5 + Math.random() * 55; // 5-60% from bottom
    ball.style.width = size + 'px';
    ball.style.height = size + 'px';
    ball.style.left = left + '%';
    ball.style.bottom = bottom + '%';
    ball.style.opacity = 0.4 + Math.random() * 0.5;
    container.appendChild(ball);
  }
}

// ===== Init =====
generateShadowBalls();
showEmptyMsg(true);
updateStats();

