/** * ZODIAC FUSION - uiflash.js
 * Mobile Overlay & Dialogue System
 */
export class UIFlash {
    constructor(engine) {
        this.engine = engine;
        this.el = document.createElement('div');
        this.setupStyles();
        document.body.appendChild(this.el);
    }

    setupStyles() {
        Object.assign(this.el.style, {
            position: 'absolute', bottom: '190px', left: '5%',
            width: '90%', height: '80px', background: 'rgba(0,0,0,0.85)',
            border: '2px solid #9b59b6', color: '#fff', padding: '10px',
            fontFamily: 'monospace', display: 'none', zIndex: '100',
            boxSizing: 'border-box', pointerEvents: 'none'
        });
    }

    flash(text) {
        this.el.innerText = text;
        this.el.style.display = 'block';
        setTimeout(() => { this.el.style.display = 'none'; }, 2000);
    }
}
