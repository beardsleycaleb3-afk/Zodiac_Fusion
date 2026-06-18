// ═══════════════════════════════════════════════════════
//  engine.js — Isometric 3D Renderer
//  Tile projection · Depth sort · Particles · Minimap
// ═══════════════════════════════════════════════════════
'use strict';

const ENGINE = {
  TW:48, TH:24, TZ:14,

  // Project world tile → canvas screen coords
  project(tx, ty, tz, camX, camY, cvs) {
    const cx = cvs.width  * 0.5 - camX;
    const cy = cvs.height * 0.42 - camY;
    return {
      x: cx + (tx - ty) * this.TW / 2,
      y: cy + (tx + ty) * this.TH / 2 - tz * this.TZ,
    };
  },

  // Draw one isometric block (top + optional side faces)
  drawBlock(ctx, sx, sy, tz, top, wallL, wallR, edge) {
    const hw = this.TW/2, hh = this.TH/2, zH = this.TZ * tz;
    ctx.lineWidth = 0.5; ctx.strokeStyle = edge;
    // Top
    ctx.beginPath();
    ctx.moveTo(sx, sy);       ctx.lineTo(sx+hw, sy+hh);
    ctx.lineTo(sx, sy+this.TH); ctx.lineTo(sx-hw, sy+hh);
    ctx.closePath(); ctx.fillStyle=top; ctx.fill(); ctx.stroke();
    if (tz <= 0) return;
    // Left face
    ctx.beginPath();
    ctx.moveTo(sx-hw, sy+hh);       ctx.lineTo(sx, sy+this.TH);
    ctx.lineTo(sx, sy+this.TH+zH); ctx.lineTo(sx-hw, sy+hh+zH);
    ctx.closePath(); ctx.fillStyle=wallL; ctx.fill(); ctx.stroke();
    // Right face
    ctx.beginPath();
    ctx.moveTo(sx, sy+this.TH);     ctx.lineTo(sx+hw, sy+hh);
    ctx.lineTo(sx+hw, sy+hh+zH);  ctx.lineTo(sx, sy+this.TH+zH);
    ctx.closePath(); ctx.fillStyle=wallR; ctx.fill(); ctx.stroke();
  },

  // Full scene render
  render(ctx, area, vpos, cam, activeObjs, particles) {
    const cvs = ctx.canvas;
    const W = cvs.width, H = cvs.height;
    const pal = area.palette;
    const hmap = area.hmap;
    const rows = hmap.length, cols = hmap[0].length;
    const now = Date.now();

    // ── background ──
    ctx.fillStyle = area.bgColor || '#030610';
    ctx.fillRect(0, 0, W, H);

    // ── build depth-sorted render list ──
    const list = [];
    for (let ty = 0; ty < rows; ty++) {
      for (let tx = 0; tx < cols; tx++) {
        const h = hmap[ty][tx];
        const sp = this.project(tx, ty, 0, cam.x, cam.y, cvs);
        if (sp.x < -80 || sp.x > W+80 || sp.y < -120 || sp.y > H+80) continue;
        list.push({ tx, ty, h, sx: sp.x, sy: sp.y, sort: tx + ty });
      }
    }
    list.sort((a, b) => a.sort - b.sort);

    // ── draw tiles ──
    for (const t of list) {
      const { tx, ty, h, sx, sy } = t;
      if (h === 0) {
        const alt = (tx+ty)%2===0;
        this.drawBlock(ctx, sx, sy, 0,
          alt ? pal.floor : (pal.floor2||pal.floor),
          pal.wallL, pal.wallR, pal.edge);
      } else if (h === 1) {
        this.drawBlock(ctx, sx, sy - this.TZ, 1,
          pal.step||pal.floor, pal.wallL, pal.wallR, pal.edge);
      } else {
        const isTall = h >= 3;
        this.drawBlock(ctx, sx, sy - this.TZ*h, h,
          isTall ? (pal.wall2||pal.wall) : pal.wall,
          pal.wallL, pal.wallR, pal.edge);
      }

      // Objects on walkable tiles
      if (h < 2) {
        const obj = activeObjs && activeObjs.find(o => o.x===tx && o.y===ty);
        if (obj) this._drawObject(ctx, sx, sy, h, obj, now);
      }
    }

    // ── player ──
    this._drawPlayer(ctx, vpos, cam, cvs, now);

    // ── ambient tint ──
    if (pal.ambient) {
      ctx.fillStyle = pal.ambient;
      ctx.fillRect(0, 0, W, H);
    }

    // ── particles ──
    if (particles && particles.length) {
      for (const p of particles) {
        const sp = this.project(p.wx, p.wy, 0, cam.x, cam.y, cvs);
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(sp.x + p.ox, sp.y + p.oy - p.rise, p.size, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // ── minimap (always on top) ──
    this._drawMinimap(ctx, area, vpos, activeObjs, W, H);
  },

  _drawObject(ctx, sx, sy, h, obj, now) {
    const yOff = h === 1 ? -this.TZ : 0;
    const px = sx, py = sy + yOff - this.TH * 0.2;
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

    const pulse = 0.5 + 0.5 * Math.sin(now * 0.003);

    if (obj.t === 'boss') {
      ctx.shadowColor = '#ff003c'; ctx.shadowBlur = 12 + pulse*8;
      ctx.font = `${this.TW*0.5}px serif`;
      ctx.fillText('💀', px, py);
      // Danger ring
      ctx.shadowBlur = 0;
      ctx.strokeStyle = `rgba(255,0,60,${0.3+pulse*0.3})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(px, py+this.TH*0.6, this.TW*0.45, this.TH*0.25, 0, 0, Math.PI*2);
      ctx.stroke();
    } else if (obj.t === 'enemy') {
      ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 8 + pulse*4;
      ctx.font = `${this.TW*0.44}px serif`;
      ctx.fillText('⚠️', px, py);
      ctx.shadowBlur = 0;
    } else if (obj.t === 'chest') {
      ctx.shadowColor = '#d4a017'; ctx.shadowBlur = 10;
      ctx.font = `${this.TW*0.5}px serif`;
      ctx.fillText('📦', px, py);
      ctx.shadowBlur = 0;
    } else if (obj.t === 'save') {
      ctx.shadowColor = '#1aaf8c'; ctx.shadowBlur = 10;
      ctx.font = `${this.TW*0.44}px serif`;
      ctx.fillText('💾', px, py);
      ctx.shadowBlur = 0;
    } else if (obj.t === 'npc') {
      const bob = Math.sin(now * 0.002) * 2.5;
      ctx.shadowColor = '#d4a017'; ctx.shadowBlur = 14;
      ctx.font = `${this.TW*0.55}px serif`;
      ctx.fillText('⚕️', px, py + bob);
      ctx.shadowBlur = 0;
    } else if (obj.t === 'exit') {
      ctx.globalAlpha = 0.55 + pulse * 0.4;
      ctx.shadowColor = '#8b3fe8'; ctx.shadowBlur = 16;
      ctx.font = `${this.TW*0.5}px serif`;
      ctx.fillText('🌀', px, py);
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      // Label
      ctx.font = 'bold 9px system-ui'; ctx.fillStyle = 'rgba(180,140,255,0.8)';
      ctx.shadowBlur = 0;
      if (obj.label) ctx.fillText(obj.label, px, py + this.TH*0.8);
    }
    ctx.restore();
  },

  _drawPlayer(ctx, vpos, cam, cvs, now) {
    const sp = this.project(vpos.x, vpos.y, 0, cam.x, cam.y, cvs);
    const cx = sp.x, cy = sp.y;
    const hw = this.TW/2, hh = this.TH/2;
    const pulse = 0.5 + 0.5 * Math.sin(now * 0.005);
    ctx.save();

    // Ground shadow ellipse
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + this.TH*0.85, this.TW*0.28, this.TH*0.18, 0, 0, Math.PI*2);
    ctx.fill();

    // Glow diamond
    ctx.strokeStyle = `rgba(212,160,23,${0.35 + pulse*0.45})`;
    ctx.lineWidth = 2;
    const dw = hw*0.78, dh = hh*0.78;
    ctx.beginPath();
    ctx.moveTo(cx, cy + this.TH*0.1);
    ctx.lineTo(cx+dw, cy + this.TH*0.1 + dh);
    ctx.lineTo(cx, cy + this.TH*0.1 + this.TH*0.78);
    ctx.lineTo(cx-dw, cy + this.TH*0.1 + dh);
    ctx.closePath(); ctx.stroke();

    // Character icon
    const ic = (typeof GAME !== 'undefined' && GAME.player?.c?.ic) ? GAME.player.c.ic : '⚕️';
    ctx.font = `${this.TW * 0.68}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = '#d4a017'; ctx.shadowBlur = 16;
    ctx.fillText(ic, cx, cy + this.TH * 0.05);
    ctx.shadowBlur = 0;
    ctx.restore();
  },

  _drawMinimap(ctx, area, vpos, activeObjs, W, H) {
    const MM = { x: W-86, y: 8, w: 76, h: 58 };
    const hmap = area.hmap;
    const rows = hmap.length, cols = hmap[0].length;
    const tw = MM.w / cols, th = MM.h / rows;

    ctx.save();
    // Panel
    ctx.fillStyle = 'rgba(3,6,16,0.88)';
    ctx.strokeStyle = 'rgba(38,22,96,0.9)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(MM.x-3, MM.y-3, MM.w+6, MM.h+6, 4);
    else ctx.rect(MM.x-3, MM.y-3, MM.w+6, MM.h+6);
    ctx.fill(); ctx.stroke();

    // Tiles
    for (let y=0; y<rows; y++) {
      for (let x=0; x<cols; x++) {
        const h = hmap[y][x];
        ctx.fillStyle = h>=3?'#2a1a70': h>=2?'#1c1155': h>=1?'#13103a': '#09082a';
        ctx.fillRect(MM.x+x*tw, MM.y+y*th, tw+0.5, th+0.5);
      }
    }

    // Objects
    if (activeObjs) {
      for (const o of activeObjs) {
        ctx.fillStyle =
          o.t==='boss'   ? '#ff003c' :
          o.t==='enemy'  ? '#ff6600' :
          o.t==='chest'  ? '#d4a017' :
          o.t==='save'   ? '#1aaf8c' :
          o.t==='exit'   ? '#8b3fe8' :
          o.t==='npc'    ? '#ffffff' : '#445566';
        const ox = MM.x + o.x*tw, oy = MM.y + o.y*th;
        const os = Math.max(2.5, tw*1.1);
        ctx.fillRect(ox - os*0.5 + tw*0.5, oy - os*0.5 + th*0.5, os, os);
      }
    }

    // Player (pulsing)
    const pulse = 0.5+0.5*Math.sin(Date.now()*0.006);
    ctx.fillStyle = `rgba(212,160,23,${0.85+pulse*0.15})`;
    ctx.beginPath();
    const px = MM.x + vpos.x*tw + tw*0.5, py = MM.y + vpos.y*th + th*0.5;
    ctx.arc(px, py, 3.5, 0, Math.PI*2);
    ctx.fill();

    // Area name
    ctx.fillStyle = 'rgba(180,160,255,0.5)';
    ctx.font = 'bold 7px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(area.name, MM.x + MM.w*0.5, MM.y + MM.h + 8);

    ctx.restore();
  },
};
