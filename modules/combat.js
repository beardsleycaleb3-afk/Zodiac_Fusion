/** * ZODIAC FUSION - combat.js
 * Battle Logic & DBM Subroutines
 */
export class Combat {
    constructor(engine) {
        this.engine = engine;
        this.active = false;
        this.enemy = null;
    }

    start(enemyType) {
        this.active = true;
        this.enemy = { type: enemyType, hp: 50 };
        this.engine.ui.flash("ZODIAC RIFT DETECTED!"); // Calls uiflash.js
    }

    processInput(btn) {
        if (!this.active) return;
        if (btn === 'a') this.attack();
        if (btn === 'b') this.run();
    }

    attack() {
        const dmg = this.engine.stats.calculateDamage(10);
        this.enemy.hp -= dmg;
        this.engine.ui.flash(`HIT: ${dmg} DMG`);
        if (this.enemy.hp <= 0) this.end();
    }

    end() {
        this.active = false;
        this.engine.ui.flash("FUSION COMPLETE");
    }
}
