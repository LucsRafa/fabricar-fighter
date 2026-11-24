// ============================================================
// PARTIDA — orquestra lutadores, IA, combate, especiais, rounds,
// câmera e renderização da luta
// ============================================================
FF.Battle = (function () {
  const U = FF.U;
  const W = FF.W, GY = FF.GROUND_Y;

  const SPR = {};
  function sprites() {
    if (SPR.vig) return SPR;
    const mk = (w, h) => {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      return c;
    };
    SPR.vig = mk(W, FF.H);
    let g = SPR.vig.getContext('2d');
    const vg = g.createRadialGradient(W / 2, FF.H / 2, FF.H * 0.45, W / 2, FF.H / 2, FF.H * 1.05);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(6,4,22,0.55)');
    g.fillStyle = vg;
    g.fillRect(0, 0, W, FF.H);
    const glow = (col) => {
      const c = mk(840, 840);
      const gg = c.getContext('2d');
      const r = gg.createRadialGradient(420, 420, 10, 420, 420, 420);
      r.addColorStop(0, col);
      r.addColorStop(1, 'rgba(0,0,0,0)');
      gg.fillStyle = r;
      gg.fillRect(0, 0, 840, 840);
      return c;
    };
    FF.Chars.list.forEach((id) => (SPR[id] = glow(FF.Chars[id].look.glow)));
    SPR.tadalas = glow('rgba(255,170,60,0.22)');
    SPR.heal = glow('rgba(124,255,138,0.22)');
    SPR.smoke = glow('rgba(220,224,236,0.20)');
    return SPR;
  }

  class Battle {
    constructor(opts) {
      this.mode = opts.mode; // cpu | vs | training
      this.training = opts.mode === 'training';
      this.difficulty = opts.difficulty || 'normal';
      const mirror = opts.p1 === opts.p2;
      this.f = [new FF.Fighter(opts.p1, 0, this, false), new FF.Fighter(opts.p2, 1, this, mirror)];
      this.inputs = [new FF.Input.PlayerInput(0), new FF.Input.PlayerInput(1)];
      this.f[0].input = this.inputs[0];
      this.f[1].input = this.inputs[1];
      this.ai = [null, null];
      if (this.mode === 'cpu' || this.training) {
        this.inputs[0].padMode = 'any';
        this.inputs[1].useKeyboard = false;
        this.inputs[1].padMode = 'none';
        const ai = new FF.AI.Controller(this.f[1], this.difficulty, this.training ? 'stand' : 'cpu');
        this.ai[1] = ai;
        this.inputs[1].virtual = ai;
      }
      if (opts.cpuBoth) {
        const ai0 = new FF.AI.Controller(this.f[0], opts.cpuLevel0 || this.difficulty, 'cpu');
        this.ai[0] = ai0;
        this.inputs[0].virtual = ai0;
      }
      this.trainingOpts = { dummy: 'stand', infiniteLife: true, infiniteMeter: true, hitboxes: false };
      this.trainingStats = { last: 0, maxHits: 0, maxDmg: 0, total: 0 };
      this.trainingKO = 0;
      this.fx = new FF.FX.Effects();
      this.cam = new FF.FX.Camera();
      this.projectiles = [];
      this.stands = [];
      this.freeze = null;
      this.darkT = 0;
      this.smokeT = 0;
      this.combos = [null, null];
      this.msgs = [];
      this.hype = 0.25;
      this.time = 0;
      this.paused = false;
      this.done = false;
      this.onFinish = opts.onFinish || null;
      this.stats = {
        hits: 0, blocks: 0, throws: 0, specials: 0, supers: {}, cladiioStrikes: 0, cladiioDamage: 0,
        immuneHits: 0, tadalasFrames: 0, tadalasActivations: 0, tadalasEnded: 0, superCombos: 0, frames: 0,
        rollHits: 0, rollDamage: 0, whipHits: 0, whipDamage: 0, ballHits: 0, ballDamage: 0,
        testerActivations: 0, testerHealed: 0, sleepFrames: 0, fumadaActivations: 0, fumadaFrames: 0, fumadaLoss: 0,
      };
      this.rounds = new FF.Rounds(this);
      this.rounds.startRound();
    }

    resetPositions() {
      const mid = FF.STAGE_W / 2;
      this.f[0].resetRound(mid - 330, 1);
      this.f[1].resetRound(mid + 330, -1);
      this.projectiles.length = 0;
      this.stands.length = 0;
      this.freeze = null;
      this.darkT = 0;
      this.smokeT = 0;
      this.combos = [null, null];
      this.cam.x = mid;
      this.cam.zoomTo(1, null);
      this.fx.clear();
      if (this.ai[0]) this.ai[0].queue.length = 0;
      if (this.ai[1]) this.ai[1].queue.length = 0;
    }

    standOf(f) {
      return this.stands.find((s) => s.owner === f && !s.done) || null;
    }
    startFreeze(owner, frames) {
      this.freeze = { owner, t: frames };
    }
    message(text, slot, style, life) {
      style = style || 'side';
      if (style === 'side') {
        const row = this.msgs.filter((m) => m.style === 'side' && m.slot === slot).length;
        this.msgs.push({ text, slot, style, t: life || 50, max: life || 50, row });
      } else {
        if (style === 'big' || style === 'fight' || style === 'ko' || style === 'result')
          this.msgs = this.msgs.filter((m) => !(m.style === 'big' || m.style === 'fight' || m.style === 'ko'));
        this.msgs.push({ text, slot, style, t: life || 60, max: life || 60, row: 0 });
      }
      if (text === 'SUPER COMBO') {
        this.stats.superCombos++;
        FF.Audio.sfx('ready');
      }
    }
    onSpecialReady(f) {
      this.message('SPECIAL READY', f.slot, 'ready', 70);
      FF.Audio.sfx('ready');
      if (!f.speech && this.rounds.fighting) f.say(f.def.lines.ready);
    }
    onHit(att, def, dmg) {
      const c = this.combos[att.slot] || (this.combos[att.slot] = { hits: 0, dmg: 0, t: 0, pop: 0, superShown: false });
      if (def.comboHits <= 1) {
        c.hits = 0;
        c.dmg = 0;
        c.superShown = false;
      }
      c.hits = def.comboHits;
      c.dmg = def.comboDmg;
      this.stats.maxCombo = this.stats.maxCombo || [0, 0];
      this.stats.maxCombo[att.slot] = Math.max(this.stats.maxCombo[att.slot], c.hits);
      c.t = 110;
      c.pop = 8;
      if (c.hits >= 7 && !c.superShown && !this.standOf(att)) {
        c.superShown = true;
        this.message('SUPER COMBO', att.slot);
      }
      if (this.training) {
        this.trainingStats.total += dmg;
      }
    }
    onComboEnd(def) {
      if (this.training && def.slot === 1) {
        this.trainingStats.last = def.comboDmg;
        if (def.comboHits > this.trainingStats.maxHits) this.trainingStats.maxHits = def.comboHits;
        if (def.comboDmg > this.trainingStats.maxDmg) this.trainingStats.maxDmg = def.comboDmg;
      }
    }
    worldToScreen(x, y) {
      const z = this.cam.zoom;
      const sx = (x - this.cam.x) * z + W / 2;
      const sy = GY + y * z;
      return { x: sx, y: sy };
    }

    // ---------- treinamento ----------
    trainingResetPos() {
      const mid = this.cam.x;
      this.f[0].resetRound(mid - 300, 1);
      this.f[1].resetRound(mid + 300, -1);
      this.f.forEach((f) => f.setState('idle', true));
      this.projectiles.length = 0;
      this.stands.length = 0;
      this.freeze = null;
    }
    cycleDummy() {
      const order = ['stand', 'block', 'crouch', 'cpu'];
      const o = this.trainingOpts;
      o.dummy = order[(order.indexOf(o.dummy) + 1) % order.length];
      this.ai[1].mode = o.dummy;
      this.ai[1].queue.length = 0;
    }

    // ---------- passo lógico (60 Hz) ----------
    update() {
      if (this.paused || this.done) return;
      this.time++;
      this.stats.frames++;
      // IA pensa e entradas são amostradas todo passo
      for (let i = 0; i < 2; i++) {
        if (this.ai[i]) this.ai[i].think();
        this.inputs[i].sample(this.f[i].facing);
      }
      for (const f of this.f) f.tickAlways();
      if (this.training) this.trainingTick();
      for (let i = this.msgs.length - 1; i >= 0; i--) if (--this.msgs[i].t <= 0) this.msgs.splice(i, 1);
      for (const c of this.combos) if (c && c.t > 0) {
        c.t--;
        if (c.pop > 0) c.pop--;
      }
      for (const f of this.f) f.hpLag += (f.hp - f.hpLag) * (f.hpLag > f.hp ? 0.04 : 1);
      this.hype = Math.max(0.12, this.hype - 0.004);
      if (this.darkT > 0) this.darkT--;
      if (this.smokeT > 0) this.smokeT--;
      if (this.winPop && this.winPop.t > 0) this.winPop.t--;
      for (const f of this.f) {
        if (f.id !== 'thiago' || !f.emberPos) continue;
        const every = f.fumada > 0 ? 2 : 6;
        if (this.time % every === 0) this.fx.smoke(f.emberPos.x, f.emberPos.y - 6, f.fumada > 0 ? 1.3 : 0.7, f.facing * 0.4);
        if (f.fumada > 0 && this.time % 3 === 0) this.fx.smoke(f.x + U.rand(-60, 60), f.y - U.rand(40, f.def.height), 1.1, 0);
      }
      // câmera lenta do K.O.
      if (this.rounds.slow && this.time % 3 !== 0) {
        this.fx.update();
        this.cam.update(this.f[0], this.f[1]);
        this.rounds.update();
        return;
      }
      if (this.freeze) {
        const o = this.freeze.owner;
        o.update();
        for (const s of this.stands) if (s.owner === o) s.update(this);
        if (--this.freeze.t <= 0) {
          this.freeze = null;
          this.cam.zoomTo(1, null);
        }
        this.fx.update();
        this.cam.update(this.f[0], this.f[1]);
        return;
      }
      for (const f of this.f) f.update();
      for (const s of this.stands) s.update(this);
      this.stands = this.stands.filter((s) => !s.done);
      FF.Combat.step(this);
      this.rounds.update();
      this.fx.update();
      this.cam.update(this.f[0], this.f[1]);
    }
    trainingTick() {
      const o = this.trainingOpts;
      if (o.infiniteMeter) for (const f of this.f) if (!f.superActive && f.state !== 'super') f.meter = 100;
      for (const f of this.f) {
        if (o.infiniteLife && f.isNeutral() && f.stateFrame > 50 && f.hp < f.def.hp) f.hp = f.def.hp;
      }
      if (this.trainingKO > 0 && --this.trainingKO === 0) {
        this.f.forEach((f) => (f.hp = f.def.hp));
        this.trainingResetPos();
      }
    }

    finishMatch(w) {
      if (this.done) return;
      this.done = true;
      if (this.onFinish) this.onFinish(w);
    }

    // ---------- renderização ----------
    drawFighter(ctx, f, alpha) {
      ctx.save();
      let ox = 0;
      if (f.hitstop > 0 && ['hitstun', 'juggle', 'blockstun', 'dizzy'].includes(f.state)) ox = (f.hitstop % 2 ? 1 : -1) * 5;
      // rastros
      for (const tr of f.trail) {
        ctx.save();
        ctx.globalAlpha = (tr.life / 8) * 0.35;
        ctx.translate(tr.x, tr.y);
        ctx.scale(tr.facing, 1);
        const col = f.tadalas > 0 ? '#FFC531' : f.fumada > 0 ? '#C9CEDB' : f.def.look.trail;
        FF.Anim.drawBody(ctx, f, tr.pose, col);
        ctx.restore();
      }
      ctx.translate(f.x + ox, f.y);
      ctx.scale(f.facing, 1);
      if (alpha != null) ctx.globalAlpha = alpha;
      const pose = FF.Anim.pose(f);
      const J = FF.Anim.drawBody(ctx, f, pose, f.flash > 0 && f.flash % 2 ? '#FFFFFF' : null);
      ctx.restore();
      // posição da brasa do cigarro (para soltar fumaça no mundo)
      if (f.id === 'thiago' && J) {
        const r = f.def.dims.head;
        f.emberPos = { x: f.x + (J.head.x + r * 1.4) * f.facing, y: f.y + J.head.y - J.ground + r * 0.6 };
      }
      if (J) f.headPos = { x: f.x + J.head.x * f.facing, y: f.y + J.head.y - J.ground };
      if (J && J.fh) f.handPos = { x: f.x + J.fh.x * f.facing * 0.93, y: f.y + J.fh.y - J.ground };
    }
    // chicote do Tom (linha curva da mão até o alvo)
    drawWhip(ctx, f) {
      const h = f.handPos || { x: f.x + f.facing * 40, y: f.y - f.def.height * 0.75 };
      const w = f.whip;
      const o = f.opp;
      let tip;
      if (w.lash > 0) {
        const k = 1 - w.lash / 8;
        const far = w.caught ? { x: o.x - Math.sign(o.x - f.x) * 20, y: o.y - o.def.height * 0.6 } : { x: f.x + f.facing * FF.Specials.WHIP_RANGE, y: f.y - 150 };
        tip = { x: h.x + (far.x - h.x) * Math.min(1, k * 1.6), y: h.y + (far.y - h.y) * Math.min(1, k * 1.6) };
      } else {
        const sw = Math.sin(this.time * 0.25) * 30;
        tip = { x: h.x - f.facing * 60, y: h.y - 140 + sw };
      }
      const cx = (h.x + tip.x) / 2 + f.facing * 20, cy = Math.min(h.y, tip.y) - 70;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#1A1033';
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(h.x, h.y);
      ctx.quadraticCurveTo(cx, cy, tip.x, tip.y);
      ctx.stroke();
      ctx.strokeStyle = '#7A5A3A';
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.strokeStyle = '#B08A5E';
      ctx.lineWidth = 2;
      ctx.stroke();
      if (w.lash > 0 && w.lash < 4) {
        ctx.fillStyle = '#FFE7A3';
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, 12, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    // cartão da HU do Jailson
    drawHU(ctx, f) {
      const t = f.superFrame;
      const x = f.x - 150, y = f.y - f.def.height - 340;
      const a = Math.min(1, t / 8);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = '#F3F6FF';
      ctx.strokeStyle = '#1A1033';
      ctx.lineWidth = 5;
      ctx.fillRect(x, y, 300, 170);
      ctx.strokeRect(x, y, 300, 170);
      ctx.fillStyle = '#6DBE45';
      ctx.fillRect(x, y, 300, 34);
      FF.text(ctx, 'HU-4271', x + 14, y + 18, { size: 20, align: 'left', color: '#1A1033', lw: 0 });
      FF.text(ctx, 'Validar fluxo de login', x + 14, y + 56, { size: 18, font: FF.FONT_UI, weight: '700', align: 'left', color: '#1A1033', lw: 0 });
      const items = ['Abrir tela', 'Preencher campos', 'Clicar em entrar', 'Conferir log'];
      items.forEach((it, i) => {
        const done = t > 14 + i * 6;
        const yy = y + 88 + i * 20;
        ctx.strokeStyle = '#1A1033';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 14, yy - 8, 14, 14);
        if (done) FF.text(ctx, '✓', x + 21, yy, { size: 16, font: FF.FONT_UI, color: '#2F9E5B', lw: 0 });
        FF.text(ctx, it, x + 38, yy, { size: 15, font: FF.FONT_UI, weight: '600', align: 'left', color: done ? '#5F5E5A' : '#1A1033', lw: 0 });
      });
      ctx.restore();
    }
    drawShadow(ctx, f) {
      const h = Math.max(0, -f.y);
      const s = Math.max(0.35, 1 - h / 500);
      ctx.save();
      ctx.fillStyle = 'rgba(5,4,20,0.45)';
      ctx.beginPath();
      ctx.ellipse(f.x, 4, f.def.width * 0.9 * s, 18 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    drawAura(ctx, f) {
      if (f.fumada > 0 || f.sleeping > 0) {
        const h = f.def.height;
        ctx.save();
        const g = ctx.createRadialGradient(f.x, f.y - h * 0.45, 20, f.x, f.y - h * 0.45, h * 0.8);
        g.addColorStop(0, f.sleeping > 0 ? 'rgba(124,255,138,0.28)' : 'rgba(225,230,242,0.30)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(f.x - h, f.y - h * 1.3, h * 2, h * 1.5);
        ctx.restore();
        return;
      }
      if (f.tadalas <= 0 && !(f.state === 'super' && f.id === 'marcelao' && f.superFrame > 50)) return;
      const h = f.def.height;
      const pulse = 1 + Math.sin(this.time * 0.3) * 0.06;
      ctx.save();
      const g = ctx.createRadialGradient(f.x, f.y - h * 0.5, 20, f.x, f.y - h * 0.5, h * 0.75 * pulse);
      g.addColorStop(0, 'rgba(255,197,49,0.35)');
      g.addColorStop(0.6, 'rgba(232,50,60,0.25)');
      g.addColorStop(1, 'rgba(232,50,60,0)');
      ctx.fillStyle = g;
      ctx.fillRect(f.x - h, f.y - h * 1.3, h * 2, h * 1.5);
      ctx.restore();
      if (f.tadalas > 0 && this.time % 2 === 0) this.fx.aura(f.x, f.y, h);
      if (f.tadalas > 0 && this.time % 40 === 0) FF.Audio.sfx('heartbeat', 0.6);
    }
    drawHitboxes(ctx) {
      ctx.save();
      ctx.lineWidth = 3;
      for (const f of this.f) {
        for (const h of FF.Col.hurtboxes(f)) {
          ctx.fillStyle = 'rgba(80,140,255,0.2)';
          ctx.strokeStyle = 'rgba(80,160,255,0.9)';
          ctx.fillRect(h.x, h.y, h.w, h.h);
          ctx.strokeRect(h.x, h.y, h.w, h.h);
        }
        for (const h of FF.Col.hitboxes(f)) {
          ctx.fillStyle = 'rgba(255,60,60,0.3)';
          ctx.strokeStyle = 'rgba(255,60,60,1)';
          ctx.fillRect(h.x, h.y, h.w, h.h);
          ctx.strokeRect(h.x, h.y, h.w, h.h);
        }
        const p = FF.Col.pushbox(f);
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.strokeRect(p.x, p.y, p.w, p.h);
      }
      for (const p of this.projectiles) {
        const b = p.box();
        ctx.strokeStyle = 'rgba(255,60,60,1)';
        ctx.strokeRect(b.x, b.y, b.w, b.h);
      }
      ctx.restore();
    }
    render(ctx) {
      const cam = this.cam;
      ctx.save();
      ctx.translate(W / 2 + cam.sx, GY + cam.sy);
      ctx.scale(cam.zoom, cam.zoom);
      ctx.translate(-W / 2, -GY);
      FF.Stage.drawBack(ctx, cam.x, this, this.time);
      // escurecimento durante especiais
      const darkA = this.freeze ? 0.62 : this.darkT > 0 ? Math.min(0.62, this.darkT / 30) : 0;
      if (darkA > 0) {
        ctx.fillStyle = `rgba(8,5,26,${darkA})`;
        ctx.fillRect(-400, -400, W + 800, FF.H + 800);
        if (this.freeze && this.freeze.owner.def.super === 'cladiio') {
          // linhas de código caindo no fundo
          ctx.save();
          ctx.globalAlpha = 0.25;
          ctx.fillStyle = '#4DF3E8';
          ctx.font = `22px ${FF.FONT_UI}`;
          for (let i = 0; i < 26; i++) {
            const x = (i * 83) % W;
            const y = ((this.time * 9 + i * 137) % 1200) - 100;
            ctx.fillText(['01101', '=>', 'await', '{ }', 'npm i', 'git push'][i % 6], x, y);
          }
          ctx.restore();
        }
      }
      // névoa de fumaça no cenário (Hora da Fumada)
      if (this.smokeT > 0) {
        const a = Math.min(1, this.smokeT / 60) * 0.32;
        ctx.save();
        ctx.fillStyle = `rgba(205,210,225,${a * 0.5})`;
        ctx.fillRect(-400, -400, W + 800, FF.H + 800);
        for (let i = 0; i < 9; i++) {
          const x = ((i * 260 + this.time * (0.6 + (i % 3) * 0.3)) % (W + 400)) - 200;
          const y = 520 + Math.sin(this.time * 0.01 + i) * 60 + (i % 3) * 90;
          ctx.globalAlpha = a;
          ctx.fillStyle = '#E6E9F2';
          ctx.beginPath();
          ctx.ellipse(x, y, 260, 70, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      // mundo
      ctx.save();
      ctx.translate(W / 2 - cam.x, GY);
      // luzes dinâmicas sob os lutadores
      ctx.save();
      const sp = sprites();
      for (const f of this.f) {
        const img = f.tadalas > 0 ? sp.tadalas : f.sleeping > 0 ? sp.heal : f.fumada > 0 ? sp.smoke : sp[f.id];
        ctx.drawImage(img, 0, 0, 840, 590, f.x - 420, -570, 840, 590);
      }
      ctx.restore();
      for (const f of this.f) this.drawShadow(ctx, f);
      for (const s of this.stands) {
        ctx.save();
        ctx.translate(s.x, s.y);
        FF.Anim.drawCladiio(ctx, s, this.time);
        ctx.restore();
      }
      // quem ataca é desenhado na frente
      const order = this.f.slice().sort((a, b) => (a.state === 'attack' || a.state === 'super' ? 1 : 0) - (b.state === 'attack' || b.state === 'super' ? 1 : 0));
      for (const f of order) this.drawAura(ctx, f);
      FF.GL.begin();
      for (const f of order) this.drawFighter(ctx, f);
      FF.GL.flush(ctx);
      for (const f of order) if (f.whip) this.drawWhip(ctx, f);
      for (const f of order) if (f.tb) FF.Specials.drawTamboreu(ctx, f, this.time);
      for (const f of order) {
        if (f.tadalas > 0) {
          FF.text(ctx, (f.tadalas / 60).toFixed(1), f.x, f.y - f.def.height - 70, { size: 46, color: '#FFC531', lw: 8 });
        }
        if (f.fumada > 0) {
          FF.text(ctx, `+10 ATQ  ${(f.fumada / 60).toFixed(1)}`, f.x, f.y - f.def.height - 70, { size: 34, color: '#FFC531', lw: 7 });
        }
        if (f.sleeping > 0) {
          FF.text(ctx, `+${f.healed.toFixed(0)} HP`, f.x, f.y - 200, { size: 34, color: '#7CFF8A', lw: 7 });
        }
        if (f.huT > 0 && f.state === 'super') this.drawHU(ctx, f);
      }
      for (const p of this.projectiles) p.draw(ctx, this.time);
      this.fx.draw(ctx);
      if (this.training && this.trainingOpts.hitboxes) this.drawHitboxes(ctx);
      ctx.restore();
      FF.Stage.drawFront(ctx, cam.x, this, this.time);
      ctx.restore();
      if (this.fx.flash > 0) {
        ctx.fillStyle = `rgba(255,255,255,${this.fx.flash * 0.05})`;
        ctx.fillRect(0, 0, W, FF.H);
      }
      // vinheta
      ctx.drawImage(sprites().vig, 0, 0);
      FF.UI.hud(ctx, this);
    }
  }

  return Battle;
})();
