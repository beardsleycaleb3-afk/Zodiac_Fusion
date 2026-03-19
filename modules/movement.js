/**
 * ZODIAC FUSION - movement.js
 * Touch-Only Physics & 4px Collision Buffer
 */

export class Movement {
    constructor(engine) {
        this.engine = engine;
        this.tileSize = 32;
        this.margin = 4; // The 4px buffer to prevent wall clipping
        this.speed = 2;  // Pixels per frame
        
        // Player Start Position (In Pixels)
        this.px = 64; 
        this.py = 64;
        
        // Direction and Animation State
        this.dir = 's';
        this.isMoving = false;
    }

    update(dt) {
        let dx = 0;
        let dy = 0;

        // Map WASM-style input state to velocity
        if (this.engine.input.up) { dy = -this.speed; this.dir = 'n'; }
        if (this.engine.input.down) { dy = this.speed; this.dir = 's'; }
        if (this.engine.input.left) { dx = -this.speed; this.dir = 'w'; }
        if (this.engine.input.right) { dx = this.speed; this.dir = 'e'; }

        if (dx !== 0 || dy !== 0) {
            this.isMoving = true;
            this.checkCollision(dx, dy);
        } else {
            this.isMoving = false;
        }
    }

    checkCollision(dx, dy) {
        const nextX = this.px + dx;
        const nextY = this.py + dy;

        // Define 4 collision points (corners) with the 4px margin
        // This ensures the sprite "hits" the wall before the pixels overlap
        const points = [
            { x: nextX + this.margin, y: nextY + this.margin },
            { x: nextX + this.tileSize - this.margin, y: nextY + this.margin },
            { x: nextX + this.margin, y: nextY + this.tileSize - this.margin },
            { x: nextX + this.tileSize - this.margin, y: nextY + this.tileSize - this.margin }
        ];

        let collision = false;
        
        for (let p of points) {
            // Convert pixel position to Map Grid coordinate
            let gx = Math.floor(p.x / this.tileSize);
            let gy = Math.floor(p.y / this.tileSize);

            // Access the Map module (we'll build this next)
            if (this.engine.map && this.engine.map.isWall(gx, gy)) {
                collision = true;
                break;
            }
        }

        if (!collision) {
            this.px = nextX;
            this.py = nextY;
            
            // DBM Trigger: Movement Accumulator o1
            if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
                this.engine.execute('o1'); 
            }
        }
    }
}
