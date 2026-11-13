function initUI(app) {
    // Main Pattern Execution
    const executeBtn = document.getElementById('execute');
    if (executeBtn) {
        executeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            app.runAll();
        });
    }

    // X Pattern Execution
    const xBtn = document.getElementById('Xexecute');
    if (xBtn) {
        xBtn.addEventListener('click', (e) => {
            e.preventDefault();
            app.runX();
        });
    }

    // Y Pattern Execution
    const yBtn = document.getElementById('Yexecute');
    if (yBtn) {
        yBtn.addEventListener('click', (e) => {
            e.preventDefault();
            app.runY();
        });
    }

    // "Promise" buttons (Update X/Y visualization)
    const xPromiseBtn = document.getElementById('Xexecute2');
    if (xPromiseBtn) {
        xPromiseBtn.addEventListener('click', (e) => {
            e.preventDefault();
            app.runX();
        });
    }

    const yPromiseBtn = document.getElementById('Yexecute2');
    if (yPromiseBtn) {
        yPromiseBtn.addEventListener('click', (e) => {
            e.preventDefault();
            app.runY();
        });
    }

    // Enter key support for inputs
    const inputs = document.querySelectorAll('input[type="text"], input[type="number"]');
    inputs.forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                app.runAll();
            }
        });
    });

    // Initialize Random Stage Number
    const stage4Input = document.getElementById('stage4num');
    if (stage4Input) {
        // Random number between 4 and 20
        const randomN = Math.floor(Math.random() * (20 - 4 + 1)) + 4;
        stage4Input.value = randomN;

        // Auto-update on change
        stage4Input.addEventListener('input', () => {
            app.runStage4();
        });
    }
}

window.initUI = initUI;
