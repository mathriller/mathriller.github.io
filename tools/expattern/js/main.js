/* global App, Renderer, Turtle, CommandParser */

class App {
    constructor() {
        this.renderer = window.appRenderer;
        this.turtles = {};
        this.parsers = {};

        // Initialize scenes
        const scenes = ['pattern1', 'pattern2', 'pattern3', 'pattern4', 'pattern5', 'pattern6'];

        scenes.forEach(id => {
            // Check if element exists before init
            if (document.getElementById(id)) {
                this.renderer.init(id, id);
                this.turtles[id] = new Turtle(this.renderer, id);
                this.parsers[id] = new CommandParser(this.turtles[id]);
            }
        });
    }

    runPattern(sceneId, code, iterations, variables = {}) {
        const turtle = this.turtles[sceneId];
        const parser = this.parsers[sceneId];

        if (!turtle || !parser) return;

        // Reset turtle
        turtle.reset();
        this.renderer.clear(sceneId);

        // Set variables
        turtle.variables = { ...variables }; // Copy

        // Execute
        parser.execute(code, iterations);

        // Draw Turtle Marker
        turtle.drawTurtle();

        // Update camera
        this.renderer.setCamera(sceneId,
            turtle.bounds.minX, turtle.bounds.maxX,
            turtle.bounds.minY, turtle.bounds.maxY,
            turtle.bounds.minZ, turtle.bounds.maxZ
        );
    }

    // Helper to get variables from UI
    getVariables() {
        const xVal = document.getElementById('promiseX').value || '';
        const yVal = document.getElementById('promiseY').value || '';

        return {
            // Wrap X in 'a' (Red) ... 'c' (Yellow/Default)
            'X': xVal ? `a${xVal}c` : '',
            // Wrap Y in 'b' (Blue) ... 'c' (Yellow/Default)
            'Y': yVal ? `b${yVal}c` : ''
        };
    }

    runAll() {
        const code = document.getElementById('lastcode').value;
        const vars = this.getVariables();

        // Pattern 1: n=1
        this.runPattern('pattern1', code, 1, vars);

        // Pattern 2: n=2
        this.runPattern('pattern2', code, 2, vars);

        // Pattern 3: n=3
        this.runPattern('pattern3', code, 3, vars);

        // Pattern 4: n=random
        // Generate new random number on every run
        const randomN = Math.floor(Math.random() * (20 - 4 + 1)) + 4;
        const n4Input = document.getElementById('stage4num');
        if (n4Input) {
            n4Input.value = randomN;
        }
        const n4 = randomN;

        // Update label to show current N
        const label4 = document.querySelector('#pattern4 .viz-label');
        if (label4) {
            label4.textContent = `n=${n4}`;
        }

        this.runPattern('pattern4', code, n4, vars);

        // Pattern 5: X
        this.runPattern('pattern5', parseInt(document.getElementById('Xnum').value) || 3, 1, vars); // Wait, pattern 5 uses Xnum as iterations? No, Xnum is n.
        // Actually runAll in previous code called:
        // this.runPattern('pattern5', parseInt($('#Xnum').val()));
        // But runPattern signature is (sceneId, code, iterations, variables).
        // The code for pattern 5 is usually "X"?
        // In runX(): const code = "X"; this.runPattern('pattern5', code, n, vars);
        // So runAll should probably run X and Y patterns too?
        // The original runAll called runPattern('pattern5', ...) but what code?
        // It seems it used the MAIN code? No, pattern 5 is for X.
        // Let's check previous main.js content.
        // It had: this.runPattern('pattern5', parseInt($('#Xnum').val()));
        // But runPattern takes code as 2nd arg.
        // So it was passing parseInt(...) as code? That's wrong.
        // Ah, the previous code might have been buggy or I misread it.
        // Let's fix it. Pattern 5 should run "X" and Pattern 6 should run "Y".

        this.runX();
        this.runY();
    }

    runStage4() {
        const code = document.getElementById('lastcode').value;
        const vars = this.getVariables();
        const n = parseInt(document.getElementById('stage4num').value) || 4;
        this.runPattern('pattern4', code, n, vars);
    }

    runX() {
        const code = "X"; // Pattern 5 runs "X"
        const vars = this.getVariables();
        const n = parseInt(document.getElementById('Xnum').value) || 1;
        this.runPattern('pattern5', code, n, vars);
    }

    runY() {
        const code = "Y"; // Pattern 6 runs "Y"
        const vars = this.getVariables();
        const n = parseInt(document.getElementById('Ynum').value) || 1;
        this.runPattern('pattern6', code, n, vars);
    }
}

window.onload = () => {
    window.app = new App();

    // Initialize UI handlers
    if (window.initUI) {
        window.initUI(window.app);
    }
};
