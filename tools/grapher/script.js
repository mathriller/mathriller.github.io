document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('graphCanvas');
    const ctx = canvas.getContext('2d');
    const functionInput = document.getElementById('functionInput');
    const drawBtn = document.getElementById('drawBtn');
    const resetBtn = document.getElementById('resetBtn');

    let width, height;
    let scale = 40; // pixels per unit
    let offsetX = 0;
    let offsetY = 0;
    let isDragging = false;
    let lastMouseX, lastMouseY;
    let currentFunction = null;

    function resize() {
        width = canvas.parentElement.clientWidth;
        height = canvas.parentElement.clientHeight;
        canvas.width = width;
        canvas.height = height;
        draw();
    }

    window.addEventListener('resize', resize);
    resize();

    // Event Listeners
    drawBtn.addEventListener('click', parseAndDraw);

    functionInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            parseAndDraw();
        }
    });

    resetBtn.addEventListener('click', () => {
        scale = 40;
        offsetX = 0;
        offsetY = 0;
        draw();
    });

    // Mouse Events for Pan
    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        canvas.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;
        offsetX += dx;
        offsetY += dy;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        draw();
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
        canvas.style.cursor = 'crosshair';
    });

    // Wheel Event for Zoom
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomIntensity = 0.1;
        const delta = e.deltaY > 0 ? -zoomIntensity : zoomIntensity;
        const newScale = scale * (1 + delta);

        // Zoom towards mouse pointer
        // Current mouse position relative to center
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const graphX = (mouseX - width / 2 - offsetX) / scale;
        const graphY = (height / 2 - mouseY + offsetY) / scale;

        scale = Math.max(5, Math.min(500, newScale));

        // Adjust offset to keep mouse point stable
        offsetX = mouseX - width / 2 - graphX * scale;
        offsetY = mouseY - height / 2 + graphY * scale; // Note: Y axis is inverted in canvas

        draw();
    }, { passive: false });

    function parseAndDraw() {
        const input = functionInput.value.trim();
        if (!input) return;

        try {
            currentFunction = parsePolynomial(input);
            draw();
        } catch (e) {
            alert('Invalid function format. Please use format like "x^2 - 2x + 1"');
            console.error(e);
        }
    }

    function parsePolynomial(str) {
        // Remove spaces
        str = str.replace(/\s+/g, '');

        // Handle empty input
        if (!str) throw new Error("Empty input");

        // Regex to match terms: ([+-]?)([\d\.]*)(x)?(\^(\d+))?
        const regex = /([+-]?)(?:(\d+(?:\.\d+)?))?(?:(x)(?:\^(\d+))?)?/g;

        const terms = [];
        let match;

        while ((match = regex.exec(str)) !== null) {
            if (match.index === regex.lastIndex) {
                regex.lastIndex++;
            }

            if (!match[0]) continue;

            let sign = match[1] === '-' ? -1 : 1;
            let coeffStr = match[2];
            let hasX = !!match[3];
            let expStr = match[4];

            let coeff = 1;
            if (coeffStr) {
                coeff = parseFloat(coeffStr);
            }

            coeff *= sign;

            let exp = 0;
            if (hasX) {
                exp = expStr ? parseInt(expStr) : 1;
            } else {
                exp = 0;
            }

            terms.push({ coeff, exp });
        }

        return (x) => {
            let result = 0;
            for (const term of terms) {
                result += term.coeff * Math.pow(x, term.exp);
            }
            return result;
        };
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);
        drawGrid();
        drawAxes();
        if (currentFunction) {
            drawFunction(currentFunction);
        }
    }

    function drawGrid() {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;

        const centerX = width / 2 + offsetX;
        const centerY = height / 2 + offsetY;

        // Vertical lines
        const startCol = Math.floor(-centerX / scale);
        const endCol = Math.floor((width - centerX) / scale) + 1;

        for (let i = startCol; i <= endCol; i++) {
            const x = centerX + i * scale;
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
        }

        // Horizontal lines
        const startRow = Math.floor((centerY - height) / scale);
        const endRow = Math.floor(centerY / scale) + 1;

        for (let i = startRow; i <= endRow; i++) {
            const y = centerY - i * scale;
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
        }

        ctx.stroke();
    }

    function drawAxes() {
        const centerX = width / 2 + offsetX;
        const centerY = height / 2 + offsetY;

        ctx.beginPath();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;

        // X Axis
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);

        // Y Axis
        ctx.moveTo(centerX, 0);
        ctx.lineTo(centerX, height);

        ctx.stroke();

        // Draw numbers
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px Outfit';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // X Axis numbers
        const startCol = Math.floor(-centerX / scale);
        const endCol = Math.floor((width - centerX) / scale) + 1;

        for (let i = startCol; i <= endCol; i++) {
            if (i === 0) continue;
            const x = centerX + i * scale;
            ctx.fillText(i.toString(), x, centerY + 5);
        }

        // Y Axis numbers
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        const startRow = Math.floor((centerY - height) / scale);
        const endRow = Math.floor(centerY / scale) + 1;

        for (let i = startRow; i <= endRow; i++) {
            if (i === 0) continue;
            const y = centerY - i * scale;
            ctx.fillText(i.toString(), centerX - 5, y);
        }
    }

    function drawFunction(func) {
        ctx.beginPath();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;

        const centerX = width / 2 + offsetX;
        const centerY = height / 2 + offsetY;

        let started = false;

        for (let px = 0; px < width; px++) {
            const xMath = (px - centerX) / scale;
            let yMath;
            try {
                yMath = func(xMath);
            } catch (e) {
                continue;
            }

            const py = centerY - yMath * scale;

            if (!started) {
                ctx.moveTo(px, py);
                started = true;
            } else {
                ctx.lineTo(px, py);
            }
        }

        ctx.stroke();
    }
});
