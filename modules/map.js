/**
 * ZODIAC FUSION - map.js
 * Tile Grid & Trigger Logic
 */

export class Map {
    constructor(engine) {
        this.engine = engine;
        this.tileSize = 32;
        this.grid = [];
        this.cols = 50;
        this.rows = 50;
        
        this.generate();
    }

    generate() {
        // Create a 50x50 world
        for (let y = 0; y < this.rows; y++) {
            let row = [];
            for (let x = 0; x < this.cols; x++) {
                // Outer perimeter = Wall (1)
                if (x === 0 || x === this.cols - 1 || y === 0 || y === this.rows - 1) {
                    row.push(1);
                } 
                // Randomly scatter Purple Rifts (2) - Zodiac Triggers
                else if (Math.random() > 0.98) {
                    row.push(2);
                } 
                // Everything else = Floor (0)
                else {
                    row.push(0);
                }
            }
            this.grid.push(row);
        }
        // Ensure starting area (64,64) is clear
        this.grid[2][2] = 0;
    }

    isWall(gx, gy) {
        if (gx < 0 || gx >= this.cols || gy < 0 || gy >= this.rows) return true;
        return this.grid[gy][gx] === 1;
    }

    checkTrigger(px, py) {
        // Find center-point of the player to check for Rift contact
        let gx = Math.floor((px + 16) / this.tileSize);
        let gy = Math.floor((py + 16) / this.tileSize);

        if (this.grid[gy] && this.grid[gy][gx] === 2) {
            this.grid[gy][gx] = 0; // Consume the rift
            this.engine.execute('b0'); // DBM: Jump to Combat Subroutine
            return true;
        }
        return false;
    }
}
