class Turtle {
    constructor(renderer, sceneId) {
        this.renderer = renderer;
        this.sceneId = sceneId;

        this.pos = [0, 0, 0];
        this.lvec = [0, 1, 0]; // Look vector
        this.nvec = [1, 0, 0]; // Normal vector
        this.pen = true;

        this.stack = []; // For push/pop
        this.variables = {}; // For promises/macros

        // Current color config
        this.colorConfig = { color: 'default' };

        // Bounds tracking
        this.bounds = {
            minX: 0, maxX: 0,
            minY: 0, maxY: 0, // Added Y bounds (Vertical)
            minZ: 0, maxZ: 0
        };
    }

    reset() {
        this.pos = [0, 0, 0];
        this.lvec = [0, 1, 0];
        this.nvec = [1, 0, 0];
        this.pen = true;
        this.stack = [];
        this.bounds = { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 };
        this.colorConfig = { color: 'default' };
    }

    setPos(x, y, z) {
        this.pos = [x, y, z];
        this.updateBounds();
    }

    updateBounds() {
        if (this.pos[0] > this.bounds.maxX) this.bounds.maxX = this.pos[0];
        if (this.pos[0] < this.bounds.minX) this.bounds.minX = this.pos[0];
        if (this.pos[1] > this.bounds.maxY) this.bounds.maxY = this.pos[1]; // Track Y
        if (this.pos[1] < this.bounds.minY) this.bounds.minY = this.pos[1]; // Track Y
        if (this.pos[2] > this.bounds.maxZ) this.bounds.maxZ = this.pos[2];
        if (this.pos[2] < this.bounds.minZ) this.bounds.minZ = this.pos[2];
    }

    // Movement
    forward(n = 1) {
        for (let i = 0; i < n; i++) {
            this.pos[0] += this.nvec[0];
            this.pos[1] += this.nvec[1];
            this.pos[2] += this.nvec[2];
            this.updateBounds();
            if (this.pen) this.draw();
        }
    }

    back(n = 1) {
        for (let i = 0; i < n; i++) {
            this.pos[0] -= this.nvec[0];
            this.pos[1] -= this.nvec[1];
            this.pos[2] -= this.nvec[2];
            this.updateBounds();
            if (this.pen) this.draw();
        }
    }

    cross(v1, v2) {
        return [
            v1[1] * v2[2] - v1[2] * v2[1],
            v1[2] * v2[0] - v1[0] * v2[2],
            v1[0] * v2[1] - v1[1] * v2[0]
        ];
    }

    moveLeft(n = 1) { // 'l'
        const vec = this.cross(this.nvec, this.lvec);
        for (let i = 0; i < n; i++) {
            this.pos[0] += vec[0];
            this.pos[1] += vec[1];
            this.pos[2] += vec[2];
            this.updateBounds();
            if (this.pen) this.draw();
        }
    }

    moveRight(n = 1) { // 'r'
        const vec = this.cross(this.lvec, this.nvec);
        for (let i = 0; i < n; i++) {
            this.pos[0] += vec[0];
            this.pos[1] += vec[1];
            this.pos[2] += vec[2];
            this.updateBounds();
            if (this.pen) this.draw();
        }
    }

    rotateLeft() { // 'L'
        this.nvec = this.cross(this.nvec, this.lvec);
    }

    rotateRight() { // 'R'
        this.nvec = this.cross(this.lvec, this.nvec);
    }

    // Stack
    push() {
        this.stack.push({
            pos: [...this.pos],
            nvec: [...this.nvec],
            lvec: [...this.lvec],
            pen: this.pen,
            colorConfig: { ...this.colorConfig }
        });
    }

    pop() {
        if (this.stack.length === 0) return;
        const state = this.stack.pop();
        this.pos = state.pos;
        this.nvec = state.nvec;
        this.lvec = state.lvec;
        this.pen = state.pen;
        this.colorConfig = state.colorConfig;
    }

    // Pen
    penUp() { this.pen = false; }
    penDown() { this.pen = true; }

    setColor(color) {
        if (color === 'a' || color === 'red') this.colorConfig = { color: 'red' };
        else if (color === 'b' || color === 'blue') this.colorConfig = { color: 'blue' };
        else this.colorConfig = { color: 'default' };
    }

    // Drawing
    draw() {
        if (!this.renderer) return;

        // Coordinate transformation: x -> x, y -> -z, z -> y (Three.js Y is up)
        // VoxelCSS was: x*100, z*100, -y*100
        // We keep the same transformation for consistency with Renderer.setCamera logic

        const vx = this.pos[0] * 100;
        const vy = this.pos[2] * 100;
        const vz = -this.pos[1] * 100;

        // Check if voxel exists (collision) -> draw black if so
        const exists = this.renderer.checkVoxel(this.sceneId, vx, vy, vz);
        const config = exists ? { color: 'black' } : this.colorConfig;

        this.renderer.addVoxel(this.sceneId, vx, vy, vz, config);
    }

    drawTurtle() {
        if (!this.renderer) return;

        const vx = this.pos[0] * 100;
        const vy = this.pos[2] * 100;
        const vz = -this.pos[1] * 100; // Standard voxel Z

        let orientation = 'right';

        // Determine orientation based on nvec
        if (this.nvec[0] === 1) orientation = 'right';
        else if (this.nvec[0] === -1) orientation = 'left';
        else if (this.nvec[2] === 1) orientation = 'up'; // Turtle Y+ is Up on screen
        else if (this.nvec[2] === -1) orientation = 'down'; // Turtle Y- is Down on screen

        // Draw Surface Turtle
        this.renderer.addSurfaceTurtle(this.sceneId, vx, vy, vz, orientation);
    }

    // Promise/Variable logic
    setVariable(name, value) {
        this.variables[name] = value;
    }
}
