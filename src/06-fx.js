// ============================================================
// EFEITOS — partículas, faíscas, textos flutuantes e câmera
// ============================================================
FF.FX = (function () {
  const U = FF.U;

  class Effects {
    constructor() {
      this.parts = [];
      this.texts = [];
      this.rings = [];
      this.flash = 0;
      this.flashColor = '#fff';
    }
    clear() {
      this.parts.length = 0;
      this.texts.length = 0;
      this.rings.length = 0;
      this.flash = 0;
    }
    add(p) {
      if (this.parts.length < 700) this.parts.push(p);
    }
    spark(x, y, dir, color, n, power) {
      for (let i = 0; i < n; i++) {
        const a = (dir > 0 ? 0 : Math.PI) + U.rand(-1.1, 1.1);
        const s = U.rand(6, 18) * power;
        this.add({ t: 'streak', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: U.randi(10, 20), max: 20, color, w: U.rand(3, 6), g: 0.3 });
      }
      this.rings.push({ x, y, r: 10, vr: 9 * power, life: 12, max: 12, color, w: 7 });
    }
    blockSpark(x, y, dir) {
      for (let i = 0; i < 10; i++) {
        const a = (dir > 0 ? Math.PI : 0) + U.rand(-0.9, 0.9);
        const s = U.rand(5, 12);
        this.add({ t: 'streak', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: U.randi(8, 14), max: 14, color: '#7FD8FF', w: 3, g: 0 });
      }
      this.rings.push({ x, y, r: 20, vr: 4, life: 14, max: 14, color: '#7FD8FF', w: 5, hex: true });
    }
    dust(x, y, n, dir) {
      for (let i = 0; i < n; i++)
        this.add({ t: 'dot', x: x + U.rand(-30, 30), y: y - U.rand(0, 10), vx: U.rand(-3, 3) + (dir || 0) * 3, vy: U.rand(-3, -0.5), life: U.randi(18, 32), max: 32, color: 'rgba(200,205,255,0.55)', r: U.rand(6, 14), g: -0.02, grow: 0.4 });
    }
    code(x, y, n, color) {
      const g = ['{', '}', ';', '0', '1', '=>', '()', '</>', 'if', 'fn', '[]', '&&', 'npm', 'git'];
      for (let i = 0; i < n; i++)
        this.add({ t: 'glyph', x: x + U.rand(-60, 60), y: y + U.rand(-40, 40), vx: U.rand(-4, 4), vy: U.rand(-6, -1), life: U.randi(26, 50), max: 50, color: color || (i % 2 ? '#4DF3E8' : '#B9A6FF'), s: U.randi(16, 30), ch: U.choice(g), g: 0.05 });
    }
    aura(x, y, h) {
      const cols = ['#FFC531', '#E8323C', '#FF8A3D'];
      for (let i = 0; i < 3; i++)
        this.add({ t: 'flame', x: x + U.rand(-70, 70), y: y - U.rand(0, h), vx: U.rand(-1, 1), vy: U.rand(-6, -3), life: U.randi(14, 24), max: 24, color: U.choice(cols), r: U.rand(8, 18), g: 0 });
    }
    steam(x, y) {
      this.add({ t: 'dot', x, y, vx: U.rand(-1.5, 1.5), vy: U.rand(-4, -2), life: 30, max: 30, color: 'rgba(255,255,255,0.6)', r: U.rand(5, 9), g: -0.02, grow: 0.5 });
    }
    smoke(x, y, power, dir) {
      const p = power || 1;
      this.add({ t: 'dot', x, y, vx: U.rand(-0.8, 0.8) * p + (dir || 0) * 1.4 * p, vy: U.rand(-2.2, -0.8) * p, life: U.randi(30, 50), max: 50, color: U.choice(['rgba(230,233,242,0.45)', 'rgba(201,206,219,0.4)', 'rgba(243,246,255,0.35)']), r: U.rand(6, 12) * p, g: -0.01, grow: 0.45 * p });
    }
    stars(x, y, t) {
      for (let i = 0; i < 3; i++) {
        const a = t * 0.12 + (i * Math.PI * 2) / 3;
        this.add({ t: 'star', x: x + Math.cos(a) * 46, y: y + Math.sin(a) * 12, vx: 0, vy: 0, life: 2, max: 2, color: '#FFC531', r: 9, g: 0 });
      }
    }
    ring(x, y, color, size, w) {
      this.rings.push({ x, y, r: 10, vr: size / 14, life: 16, max: 16, color, w: w || 8 });
    }
    text(x, y, str, color, size, life, opt) {
      this.texts.push(Object.assign({ x, y, str, color, size: size || 42, life: life || 50, max: life || 50, vy: -1.6 }, opt || {}));
    }
    update() {
      for (let i = this.parts.length - 1; i >= 0; i--) {
        const p = this.parts[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.g || 0;
        p.vx *= 0.94;
        if (p.grow) p.r += p.grow;
        if (--p.life <= 0) this.parts.splice(i, 1);
      }
      for (let i = this.rings.length - 1; i >= 0; i--) {
        const r = this.rings[i];
        r.r += r.vr;
        r.vr *= 0.88;
        if (--r.life <= 0) this.rings.splice(i, 1);
      }
      for (let i = this.texts.length - 1; i >= 0; i--) {
        const t = this.texts[i];
        t.y += t.vy;
        t.vy *= 0.94;
        if (--t.life <= 0) this.texts.splice(i, 1);
      }
      if (this.flash > 0) this.flash--;
      if (FF.reduced) this.flash = 0;
    }
    // desenho em coordenadas do mundo (já transformadas)
    draw(ctx) {
      ctx.save();
      for (const r of this.rings) {
        ctx.globalAlpha = r.life / r.max;
        ctx.strokeStyle = r.color;
        ctx.lineWidth = r.w * (r.life / r.max) + 1;
        ctx.beginPath();
        if (r.hex) {
          for (let i = 0; i < 6; i++) {
            const a = (Math.PI / 3) * i;
            ctx.lineTo(r.x + Math.cos(a) * r.r, r.y + Math.sin(a) * r.r * 1.6);
          }
          ctx.closePath();
        } else ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (const p of this.parts) {
        const a = p.life / p.max;
        ctx.globalAlpha = Math.min(1, a * 1.4);
        if (p.t === 'streak') {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.w * a + 1;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 2.2, p.y - p.vy * 2.2);
          ctx.stroke();
        } else if (p.t === 'dot' || p.t === 'flame') {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.t === 'flame' ? p.r * a : p.r, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.t === 'glyph') {
          ctx.fillStyle = p.color;
          ctx.font = `${p.s}px ${FF.FONT_UI}`;
          ctx.textAlign = 'center';
          ctx.fillText(p.ch, p.x, p.y);
        } else if (p.t === 'star') {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          for (let i = 0; i < 10; i++) {
            const rr = i % 2 ? p.r * 0.45 : p.r;
            const an = (Math.PI / 5) * i - Math.PI / 2;
            ctx.lineTo(p.x + Math.cos(an) * rr, p.y + Math.sin(an) * rr);
          }
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      for (const t of this.texts) {
        const a = Math.min(1, t.life / (t.max * 0.4));
        const pop = t.life > t.max - 6 ? 1 + (t.life - (t.max - 6)) * 0.08 : 1;
        FF.text(ctx, t.str, t.x, t.y, { size: t.size * pop, color: t.color, alpha: a, lw: t.size * 0.18 });
      }
      ctx.restore();
    }
  }

  class Camera {
    constructor() {
      this.x = FF.STAGE_W / 2;
      this.zoom = 1;
      this.tZoom = 1;
      this.focus = null;
      this.shakeAmp = 0;
      this.sx = 0;
      this.sy = 0;
    }
    shake(a) {
      if (!FF.Settings.data.shake) return;
      this.shakeAmp = Math.max(this.shakeAmp, a);
    }
    zoomTo(z, focusX) {
      this.tZoom = z;
      this.focus = focusX == null ? null : focusX;
    }
    update(f1, f2) {
      let target = (f1.x + f2.x) / 2;
      if (this.focus != null) target = U.lerp(target, this.focus, 0.6);
      const half = FF.W / 2 / this.zoom;
      target = U.clamp(target, half, FF.STAGE_W - half);
      this.x += (target - this.x) * 0.16;
      this.x = U.clamp(this.x, half, FF.STAGE_W - half);
      this.zoom += (this.tZoom - this.zoom) * 0.12;
      if (this.shakeAmp > 0.3) {
        this.sx = U.rand(-1, 1) * this.shakeAmp;
        this.sy = U.rand(-1, 1) * this.shakeAmp;
        this.shakeAmp *= 0.86;
      } else {
        this.sx = this.sy = 0;
        this.shakeAmp = 0;
      }
    }
    // limites horizontais visíveis no mundo
    bounds() {
      const half = FF.W / 2 / this.zoom;
      return { l: this.x - half, r: this.x + half };
    }
  }

  return { Effects, Camera };
})();
