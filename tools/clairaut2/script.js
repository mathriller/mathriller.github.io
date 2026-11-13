const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const slider = document.getElementById('unrollSlider');
const angleValue = document.getElementById('angleValue');

const SCALE = 20; 
let O = { x: 140, y: 380 };

let R = 6.5; 
let r = 3.6; 
let theta = 0;

let draggingPoint = null;

function tX(x) { return O.x + x * SCALE; }
function tY(y) { return O.y - y * SCALE; }

function dist(x1, y1, x2, y2) { return Math.hypot(x1 - x2, y1 - y2); }

function drawGrid() {
    ctx.strokeStyle = '#eef0f2';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const startX = O.x % SCALE;
    for (let x = startX; x <= canvas.width; x += SCALE) {
        ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height);
    }
    const startY = O.y % SCALE;
    for (let y = startY; y <= canvas.height; y += SCALE) {
        ctx.moveTo(0, y); ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();
}

function drawLabel(text, x, y) {
    ctx.font = '13px Inter';
    const wt = ctx.measureText(text).width;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(x - wt / 2 - 4, y - 14, wt + 8, 20);
    ctx.fillStyle = '#666';
    ctx.fillText(text, x - wt / 2, y);
}

function drawPoint(mathX, mathY, label) {
    const cx = tX(mathX);
    const cy = tY(mathY);
    ctx.fillStyle = label === 'ㅇ' ? '#4CAF50' : '#666';
    
    ctx.beginPath();
    ctx.arc(cx, cy, label === 'ㅇ' ? 6 : 4, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#333';
    ctx.font = '14px Inter';
    ctx.fillText(label, cx + 8, cy - 8);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();

    const rectRightX = Math.PI * (R + r);
    const midY = -(R + r) / 2;

    // 1. Dark green region (Common area)
    ctx.fillStyle = 'rgba(150, 180, 150, 0.6)';
    ctx.beginPath();
    ctx.moveTo(tX(0), tY(-r));
    ctx.lineTo(tX(0), tY(-R));
    ctx.lineTo(tX(rectRightX), tY(-R));
    ctx.lineTo(tX(rectRightX), tY(midY));
    ctx.lineTo(tX(2 * Math.PI * r), tY(-r));
    ctx.closePath();
    ctx.fill();

    // 2. Light Green Triangle (Trapezoid part outside Rectangle)
    ctx.fillStyle = 'rgba(180, 220, 180, 0.6)';
    ctx.beginPath();
    ctx.moveTo(tX(rectRightX), tY(midY));
    ctx.lineTo(tX(rectRightX), tY(-R));
    ctx.lineTo(tX(2 * Math.PI * R), tY(-R));
    ctx.closePath();
    ctx.fill();

    // 3. Pink Triangle (Rectangle part outside Trapezoid)
    ctx.fillStyle = 'rgba(255, 200, 200, 0.6)';
    ctx.beginPath();
    ctx.moveTo(tX(rectRightX), tY(midY));
    ctx.lineTo(tX(rectRightX), tY(-r));
    ctx.lineTo(tX(2 * Math.PI * r), tY(-r));
    ctx.closePath();
    ctx.fill();

    // 4. Annulus Background
    ctx.fillStyle = 'rgba(180, 220, 180, 0.4)';
    ctx.beginPath();
    ctx.arc(tX(0), tY(0), R * SCALE, 0, 2 * Math.PI);
    ctx.arc(tX(0), tY(0), r * SCALE, 0, 2 * Math.PI, true);
    ctx.fill();

    // Fill inner hole with white
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(tX(0), tY(0), r * SCALE, 0, 2 * Math.PI);
    ctx.fill();

    // Orange circle
    ctx.strokeStyle = '#F57C00';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(tX(0), tY(0), (R + r) / 2 * SCALE, 0, 2 * Math.PI);
    ctx.stroke();

    // Outer circle
    ctx.strokeStyle = '#F44336';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(tX(0), tY(0), R * SCALE, 0, 2 * Math.PI);
    ctx.stroke();

    // Inner circle
    ctx.strokeStyle = '#2196F3';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(tX(0), tY(0), r * SCALE, 0, 2 * Math.PI);
    ctx.stroke();

    // Labels removed as requested

    // Unrolling arcs
    const midR = (R + r) / 2;
    const uInnerX = r * theta;
    const uOuterX = R * theta;
    const uMidX = midR * theta;

    // Solid unrolled lines
    ctx.strokeStyle = '#2196F3';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tX(0), tY(-r));
    ctx.lineTo(tX(uInnerX), tY(-r));
    ctx.stroke();

    ctx.strokeStyle = '#F57C00';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(tX(0), tY(-midR));
    ctx.lineTo(tX(uMidX), tY(-midR));
    ctx.stroke();

    ctx.strokeStyle = '#F44336';
    ctx.lineWidth = 2; // Match the other line widths for consistency
    ctx.beginPath();
    ctx.moveTo(tX(0), tY(-R));
    ctx.lineTo(tX(uOuterX), tY(-R));
    ctx.stroke();

    if (theta < 2 * Math.PI) {
        // Inner remaining arc
        ctx.strokeStyle = '#2196F3';
        ctx.beginPath();
        ctx.arc(tX(uInnerX), tY(0), r * SCALE, Math.PI / 2, Math.PI / 2 - (2 * Math.PI - theta), true);
        ctx.stroke();

        // Mid remaining arc
        ctx.strokeStyle = '#F57C00';
        ctx.beginPath();
        ctx.arc(tX(uMidX), tY(0), midR * SCALE, Math.PI / 2, Math.PI / 2 - (2 * Math.PI - theta), true);
        ctx.stroke();

        // Outer remaining arc
        ctx.strokeStyle = '#F44336';
        ctx.beginPath();
        ctx.arc(tX(uOuterX), tY(0), R * SCALE, Math.PI / 2, Math.PI / 2 - (2 * Math.PI - theta), true);
        ctx.stroke();
    }

    // Segments ㄱㄷ and ㄴㄷ with equal-length tick marks
    const gx = tX(0), gy = tY(-r);       // ㄱ
    const dx = tX(0), dy = tY(midY);     // ㄷ
    const nx = tX(0), ny = tY(-R);       // ㄴ

    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(dx, dy);
    ctx.moveTo(dx, dy);
    ctx.lineTo(nx, ny);
    ctx.stroke();

    // Tick marks function: draw n ticks perpendicular to vertical segment at midpoint
    function drawTicks(ax, ay, bx, by, count) {
        const mx = (ax + bx) / 2;
        const my = (ay + by) / 2;
        const tickLen = 7;   // horizontal length of each tick
        const gap = 5;       // vertical spacing between ticks
        const offset = (count - 1) * gap / 2;
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < count; i++) {
            const cy2 = my - offset + i * gap;  // stack ticks vertically
            ctx.beginPath();
            ctx.moveTo(mx - tickLen / 2, cy2);  // horizontal tick
            ctx.lineTo(mx + tickLen / 2, cy2);
            ctx.stroke();
        }
    }

    // Draw double ticks on each segment (indicating equal length)
    drawTicks(gx, gy, dx, dy, 2);
    drawTicks(dx, dy, nx, ny, 2);

    // Fixed Points
    drawPoint(0, 0, 'ㅇ');
    drawPoint(0, -r, 'ㄱ');
    drawPoint(0, midY, 'ㄷ');
    drawPoint(0, -R, 'ㄴ');
}

// Interactivity
canvas.addEventListener('mousedown', e => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (dist(mx, my, tX(0), tY(-R)) < 15) draggingPoint = 'B';
    else if (dist(mx, my, tX(0), tY(-r)) < 12) draggingPoint = 'C'; // Checked before O
    else if (dist(mx, my, tX(0), tY(0)) < 25) draggingPoint = 'O'; // Larger catch area but lower priority
});

canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (!draggingPoint) {
        if (dist(mx, my, tX(0), tY(-R)) < 15 || dist(mx, my, tX(0), tY(-r)) < 12) {
            canvas.style.cursor = 'ns-resize';
        } else if (dist(mx, my, tX(0), tY(0)) < 25) {
            canvas.style.cursor = 'move';
        } else {
            canvas.style.cursor = 'default';
        }
        return;
    }
    
    if (draggingPoint === 'O') {
        O.x = mx;
        O.y = my;
    } else {
        let logicalY = (O.y - my) / SCALE; // This is the logical radial distance relative to O
        if (draggingPoint === 'B') {
            let newR = -logicalY;
            newR = Math.max(newR, r + 0.1);
            newR = Math.min(newR, 12); // Limit max radius logically
            R = newR;
        }
        if (draggingPoint === 'C') {
            let newr = -logicalY;
            newr = Math.max(newr, 0); // Allow C to collapse into O
            newr = Math.min(newr, R - 0.1);
            r = newr;
        }
    }
    draw();
});

canvas.addEventListener('mouseup', () => { draggingPoint = null; });
canvas.addEventListener('mouseleave', () => { draggingPoint = null; });

slider.addEventListener('input', e => {
    const val = parseFloat(e.target.value);
    angleValue.textContent = `a = ${val.toFixed(1)}°`;
    theta = val * (Math.PI / 180);
    draw();
});

// Init
draw();
