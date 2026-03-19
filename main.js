/**
 * ZODIAC FUSION - main.js
 * Master Controller & DBM Virtual Machine
 */

import { EventBus } from './modules/eventbus.js';
import { Movement } from './modules/movement.js';

class ZodiacEngine {
    constructor() {
        // 1. Virtual Memory (64KB)
        this.ram = new Uint8Array(65536);
        
        // 2. DBM Accumulator (Binary Mirror)
        this.acc = 0;
        
        // 3. Hardware State
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.lastTime = 0;
        
        // 4. Input State (WASM Mapping)
        this.input = { up:0, down:0, left:0, right:0, a:0, b:0 };

        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        // Initialize Modules
        this.events = new EventBus(this);
        this.movement = new Movement(this);

        // Start Boot Sequence
        console.log("ZODIAC FUSION: System Boot...");
        requestAnimationFrame((t) => this.loop(t));
    }

    resize() {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        this.ctx.imageRendering = 'pixelated';
    }

    // DBM EXECUTION UNIT
    execute(strand) {
        const glyphs = strand.match(/[a-zA-Z0-9()]/g) || [];
        glyphs.forEach(g => {
            if(g === 'o1') this.acc = 1;
            if(g === 'o9') this.acc = 9;
            if(g === 'O9') this.acc ^= 0x09; // Mirror Logic
        });
    }

    loop(timestamp) {
        const dt = timestamp - this.lastTime;
        this.lastTime = timestamp;

        // 1. Update Physics
        this.movement.update(dt);

        // 2. Render VRAM
        this.draw();

        requestAnimationFrame((t) => this.loop(t));
    }

    draw() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Placeholder for Sprite Render
        this.ctx.fillStyle = '#3498db';
        this.ctx.fillRect(100, 100, 32, 32); 
    }
}

window.game = new ZodiacEngine();
