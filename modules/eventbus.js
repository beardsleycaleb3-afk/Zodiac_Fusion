/**
 * ZODIAC FUSION - eventbus.js
 * Hardware Interrupt & Input Mapping
 */

export class EventBus {
    constructor(engine) {
        this.engine = engine;
        this.buttons = {
            'upBtn': 'up', 'downBtn': 'down', 
            'leftBtn': 'left', 'rightBtn': 'right',
            'aBtn': 'a', 'bBtn': 'b'
        };
        this.init();
    }

    init() {
        Object.keys(this.buttons).forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;

            const key = this.buttons[id];

            // Primary Touch Handler (Mobile)
            el.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.setKeyState(key, 1);
            }, { passive: false });

            el.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.setKeyState(key, 0);
            }, { passive: false });

            // Fallback Mouse Handler (Desktop Dev)
            el.addEventListener('mousedown', () => this.setKeyState(key, 1));
            el.addEventListener('mouseup', () => this.setKeyState(key, 0));
            el.addEventListener('mouseleave', () => this.setKeyState(key, 0));
        });

        // Global Keyboard Listeners for Debugging
        window.addEventListener('keydown', (e) => this.handleKey(e, 1));
        window.addEventListener('keyup', (e) => this.handleKey(e, 0));
    }

    setKeyState(key, state) {
        this.engine.input[key] = state;
        
        // DBM Trigger on 'A' Press
        if (key === 'a' && state === 1) {
            this.engine.execute('o1O9'); // Execute Mirror Logic on Interact
        }
    }

    handleKey(e, state) {
        const map = {
            'ArrowUp': 'up', 'ArrowDown': 'down',
            'ArrowLeft': 'left', 'ArrowRight': 'right',
            'z': 'a', 'x': 'b'
        };
        if (map[e.key]) this.setKeyState(map[e.key], state);
    }
}
