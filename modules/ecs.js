/** * ZODIAC FUSION - ecs.js
 * Entity Component System: Sprite & Stat Mapping
 */
export class ECS {
    constructor(engine) {
        this.engine = engine;
        this.entities = new Map();
        this.playerID = this.createEntity('liora', {
            hp: 100, maxHp: 100, mp: 50,
            sprite: 'assets/hero.png', // Hook for your artwork
            frame: 0, dir: 's'
        });
    }

    createEntity(type, components) {
        const id = Math.random().toString(36).substr(2, 9);
        this.entities.set(id, { type, ...components });
        return id;
    }

    updateSprite(id, dir, frame) {
        const ent = this.entities.get(id);
        if (ent) { ent.dir = dir; ent.frame = frame; }
    }
}
