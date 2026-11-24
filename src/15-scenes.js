// ============================================================
// CENAS — título/menu, seleção de personagens, controles,
// configurações, luta (com pausa) e resultado
// ============================================================
FF.Scenes = (function () {
  const U = FF.U;
  const W = FF.W, H = FF.H;
  const T = FF.text;
  const S = {};
  let current = null;
  let fade = 0;

  S.go = function (scene) {
    current = scene;
    fade = 18;
    if (scene.enter) scene.enter();
  };
  S.current = () => current;
  S.update = function (ev) {
    if (current) current.update(ev);
  };
  S.render = function (ctx) {
    if (current) current.render(ctx);
    if (fade > 0) {
      ctx.fillStyle = `rgba(10,8,30,${fade / 18})`;
      ctx.fillRect(0, 0, W, H);
      fade--;
    }
  };

  // boneco de vitrine (usa o mesmo desenhista dos lutadores)
  function mock(id, state, facing, alt) {
    return { id, state: state || 'idle', stateFrame: 0, frameCount: 0, facing: facing || 1, pump: 0, altColor: !!alt, face: 'normal', prop: null, airborne: false, blocking: false, walkPhase: 0, vy: 0, jumpDir: 0, superFrame: 0, superStow: 0, def: FF.Chars[id] };
  }
  function drawMock(ctx, m, x, y, scale, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale * m.facing, scale);
    if (alpha != null) ctx.globalAlpha = alpha;
    FF.Anim.drawBody(ctx, m, FF.Anim.pose(m), null);
    ctx.restore();
  }

  function backdrop(ctx, t, dim) {
    FF.Stage.drawBack(ctx, FF.STAGE_W / 2 + Math.sin(t * 0.004) * 300, { hype: 0.3 }, t);
    FF.Stage.drawFront(ctx, FF.STAGE_W / 2 + Math.sin(t * 0.004) * 300, null, t);
    ctx.fillStyle = `rgba(12,10,40,${dim == null ? 0.62 : dim})`;
    ctx.fillRect(0, 0, W, H);
  }

  // ---------- logotipo ----------
  function logo(ctx, cx, cy, t, scale) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    // FABRICAR: letreiro em neon
    const on = t > 20 && (t > 60 || Math.floor(t / 4) % 3 !== 0);
    ctx.font = `120px ${FF.FONT_D}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    if (on) {
      ctx.save();
      ctx.shadowColor = '#FF4FA3';
      ctx.shadowBlur = 36;
      ctx.strokeStyle = '#FF4FA3';
      ctx.lineWidth = 9;
      ctx.strokeText('FABRICAR', 0, -70);
      ctx.restore();
      ctx.strokeStyle = '#FFE1F0';
      ctx.lineWidth = 3;
      ctx.strokeText('FABRICAR', 0, -70);
    } else {
      ctx.strokeStyle = 'rgba(255,79,163,0.25)';
      ctx.lineWidth = 6;
      ctx.strokeText('FABRICAR', 0, -70);
    }
    // FIGHTER: bloco inclinado com extrusão
    const k = U.clamp((t - 30) / 14, 0, 1);
    const s = k < 1 ? 2.2 - U.easeOut(k) * 1.2 : 1;
    if (t > 30) {
      ctx.save();
      ctx.translate(0, 80);
      ctx.scale(s, s);
      ctx.transform(1, 0, -0.18, 1, 0, 0);
      ctx.font = `176px ${FF.FONT_D}`;
      for (let i = 12; i > 0; i--) {
        ctx.fillStyle = i > 6 ? '#5A0E1A' : '#B81D2B';
        ctx.fillText('FIGHTER', i * 1.6, i * 1.6);
      }
      ctx.strokeStyle = '#1A1033';
      ctx.lineWidth = 14;
      ctx.strokeText('FIGHTER', 0, 0);
      const g = ctx.createLinearGradient(0, -80, 0, 80);
      g.addColorStop(0, '#FFF3C4');
      g.addColorStop(0.45, '#FFC531');
      g.addColorStop(1, '#FF8A1F');
      ctx.fillStyle = g;
      ctx.fillText('FIGHTER', 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  // ---------- lista de botões verticais ----------
  // lista de botões: o realce desliza até o item focado (~200 ms, ease-out)
  // e os itens entram escalonados só na primeira vez que a lista aparece
  function menuList(ctx, items, sel, x, y, w, h, gap, rects) {
    rects.length = 0;
    rects._t = (rects._t || 0) + 1;
    const ty = y + sel * (h + gap);
    rects._hy = FF.reduced ? ty : FF.approach(rects._hy, ty, 0.3);
    if (rects._n !== items.length) {
      rects._n = items.length;
      rects._hy = ty;
    }
    const enter = (i) => (FF.reduced ? 1 : U.easeOut(U.clamp((rects._t - i * 4) / 14, 0, 1)));
    items.forEach((it, i) => {
      const yy = y + i * (h + gap);
      const k = enter(i);
      ctx.save();
      ctx.globalAlpha *= k;
      ctx.translate((1 - k) * -40, 0);
      FF.UI.button(ctx, it.label, x, yy, w, h, false, { size: it.size || 34 });
      ctx.restore();
      rects.push({ x, y: yy, w, h, i });
    });
    // realce
    const col = (items[sel] && items[sel].color) || '#FFC531';
    const hy = rects._hy;
    const slab = () => {
      ctx.beginPath();
      ctx.moveTo(x + 18, hy);
      ctx.lineTo(x + w, hy);
      ctx.lineTo(x + w - 18, hy + h);
      ctx.lineTo(x, hy + h);
      ctx.closePath();
    };
    ctx.save();
    ctx.globalAlpha *= enter(sel);
    slab();
    ctx.fillStyle = col;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#1A1033';
    ctx.stroke();
    // rótulos dentro do realce ficam escuros (recorte)
    slab();
    ctx.clip();
    items.forEach((it, i) => T(ctx, it.label, x + w / 2, y + i * (h + gap) + h / 2 + 2, { size: it.size || 34, color: '#1A1033', lw: 0 }));
    ctx.restore();
    ctx.save();
    ctx.globalAlpha *= enter(sel);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x - 34, hy + h / 2 - 14);
    ctx.lineTo(x - 12, hy + h / 2);
    ctx.lineTo(x - 34, hy + h / 2 + 14);
    ctx.fill();
    ctx.restore();
  }
  function mouseSel(rects) {
    const m = FF.Input.mouse;
    if (!m.moved && !m.click) return -1;
    for (const r of rects) if (FF.UI.inside(m.x, m.y, r.x, r.y, r.w, r.h)) return r.i;
    return -1;
  }

  // =========================================================
  // TÍTULO + MENU PRINCIPAL
  // =========================================================
  S.Title = function () {
    this.t = 0;
    this.started = false;
    this.sel = 0;
    this.sub = null;
    this.rects = [];
    this.mA = mock('andinho', 'idle', 1);
    this.mM = mock('marcelao', 'idle', -1);
    this.mJ = mock('jailson', 'idle', 1);
    this.mT = mock('thiago', 'idle', -1);
  };
  S.Title.prototype.enter = function () {
    if (this.started) FF.Audio.playMusic('menu');
  };
  S.Title.prototype.items = function () {
    if (this.sub === 'play')
      return [
        { label: 'Contra a CPU', act: 'cpu' },
        { label: 'Dois jogadores', act: 'vs' },
        { label: 'Voltar', act: 'back' },
      ];
    const d = FF.Settings.data.difficulty;
    return [
      { label: 'Jogar', act: 'play' },
      { label: 'Treinamento', act: 'training' },
      { label: 'Controles', act: 'controls' },
      { label: 'Configurações', act: 'settings' },
      { label: `◀  ${{ easy: 'Fácil', normal: 'Normal', hard: 'Difícil' }[d]}  ▶`, act: 'diff', size: 28, color: '#4DF3E8' },
    ];
  };
  S.Title.prototype.update = function (ev) {
    this.t++;
    this.mA.frameCount++;
    this.mM.frameCount++;
    this.mJ.frameCount++;
    this.mT.frameCount++;
    const click = FF.Input.consumeClick();
    if (!this.started) {
      if (ev.some((e) => e.type === 'key' || e.src === 'pad') || click) {
        this.started = true;
        FF.Audio.init();
        FF.Audio.playMusic('menu');
        FF.Audio.sfx('ok');
        this.t = Math.max(this.t, 80);
      }
      return;
    }
    const items = this.items();
    const ms = mouseSel(this.rects);
    if (ms >= 0 && FF.Input.mouse.moved) {
      if (ms !== this.sel) FF.Audio.sfx('ui');
      this.sel = ms;
      FF.Input.mouse.moved = false;
    }
    let act = null;
    for (const e of ev) {
      if (e.type === 'up') { this.sel = (this.sel + items.length - 1) % items.length; FF.Audio.sfx('ui'); }
      if (e.type === 'down') { this.sel = (this.sel + 1) % items.length; FF.Audio.sfx('ui'); }
      if ((e.type === 'left' || e.type === 'right') && items[this.sel].act === 'diff') this.cycleDiff(e.type === 'left' ? -1 : 1);
      if (e.type === 'ok') act = items[this.sel].act;
      if (e.type === 'back' && this.sub) act = 'back';
    }
    if (click && ms >= 0) {
      this.sel = ms;
      act = items[ms].act;
    }
    if (!act) return;
    FF.Audio.sfx(act === 'back' ? 'back' : 'ok');
    switch (act) {
      case 'play': this.sub = 'play'; this.sel = 0; break;
      case 'back': this.sub = null; this.sel = 0; break;
      case 'diff': this.cycleDiff(1); break;
      case 'cpu': S.go(new S.Select('cpu')); break;
      case 'vs': S.go(new S.Select('vs')); break;
      case 'training': S.go(new S.Select('training')); break;
      case 'controls': S.go(new S.Controls()); break;
      case 'settings': S.go(new S.Settings()); break;
    }
  };
  S.Title.prototype.cycleDiff = function (d) {
    const order = ['easy', 'normal', 'hard'];
    const s = FF.Settings.data;
    s.difficulty = order[(order.indexOf(s.difficulty) + d + 3) % 3];
    FF.Settings.save();
    FF.Audio.sfx('ui');
  };
  S.Title.prototype.render = function (ctx) {
    const t = this.t;
    backdrop(ctx, t, 0.55);
    // lutadores de vitrine
    const sway = Math.sin(t * 0.03) * 6;
    drawMock(ctx, this.mJ, 150, 1010, 1.5, 0.75);
    drawMock(ctx, this.mT, 1770, 1010, 1.45, 0.75);
    drawMock(ctx, this.mA, 380, 1010 + sway * 0.3, 1.55, 0.95);
    drawMock(ctx, this.mM, 1540, 1010, 1.5, 0.95);
    // faixa diagonal
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#12163A';
    ctx.beginPath();
    ctx.moveTo(620, 0); ctx.lineTo(1300, 0); ctx.lineTo(1300, H); ctx.lineTo(620, H);
    ctx.fill();
    ctx.restore();
    logo(ctx, W / 2, 250, t, 1);
    if (!this.started) {
      if (Math.floor(t / 30) % 2 === 0) T(ctx, 'Pressione qualquer tecla', W / 2, 700, { size: 40, color: '#F3F6FF' });
      T(ctx, 'teclado ou controle', W / 2, 760, { size: 22, font: FF.FONT_UI, weight: '700', color: '#8C93C9', lw: 4 });
    } else {
      const items = this.items();
      menuList(ctx, items, this.sel, W / 2 - 230, 480, 460, 72, 18, this.rects);
      if (!this.sub) T(ctx, 'Dificuldade da CPU', W / 2, 480 + 4 * 90 + 100, { size: 18, font: FF.FONT_UI, weight: '700', color: '#8C93C9', lw: 4 });
    }
    T(ctx, 'Setas/WASD navegam · Enter/U confirma · Esc volta', W / 2, H - 30, { size: 18, font: FF.FONT_UI, weight: '600', color: '#8C93C9', lw: 4 });
  };

  // =========================================================
  // SELEÇÃO DE PERSONAGENS
  // =========================================================
  S.Select = function (mode) {
    this.mode = mode;
    this.t = 0;
    const ids = FF.Chars.list;
    this.cur = [0, 1];
    this.lock = [false, false];
    this.phase = 0; // treino: 0 = escolhe lutador, 1 = escolhe alvo
    this.roll = 0; // CPU sorteando
    this.go = 0;
    this.rects = [];
    this.side = [mock(ids[0], 'intro', 1), mock(ids[1], 'intro', -1)];
    this.slide = [1, 1];
    this.statsShown = [[0, 0, 0, 0], [0, 0, 0, 0]];
    this.lift = ids.map(() => 0);
  };
  S.Select.prototype.enter = function () {
    FF.Audio.playMusic('select');
  };
  S.Select.prototype.setSide = function (s) {
    const ids = FF.Chars.list;
    const id = ids[this.cur[s]];
    const mirror = s === 1 && this.cur[0] === this.cur[1];
    if (this.side[s] && this.side[s].id === id && this.side[s].altColor === mirror) return;
    this.side[s] = mock(id, 'intro', s === 0 ? 1 : -1, mirror);
    this.slide[s] = 1; // entra deslizando de fora da tela
  };
  // quem está escolhendo agora com o cursor do jogador 1
  S.Select.prototype.activeSlot = function () {
    if (this.mode === 'training' && this.lock[0]) return 1;
    return 0;
  };
  S.Select.prototype.move = function (s, d) {
    const n = FF.Chars.list.length;
    this.cur[s] = (this.cur[s] + d + n) % n;
    this.setSide(s);
    if (s === 0 && this.lock[1] === false && this.mode !== 'vs') this.setSide(1);
    FF.Audio.sfx('ui');
  };
  S.Select.prototype.update = function (ev) {
    this.t++;
    for (let s = 0; s < 2; s++) this.slide[s] = FF.reduced ? 0 : Math.max(0, this.slide[s] - 1 / 14);
    for (const m of this.side) {
      m.frameCount++;
      m.stateFrame++;
      if (m.state === 'intro' && m.stateFrame > 90) {
        m.state = 'idle';
        m.stateFrame = 0;
      }
    }
    const click = FF.Input.consumeClick();
    if (this.go > 0) {
      if (--this.go === 0) this.start();
      return;
    }
    // CPU sorteando o rival
    if (this.roll > 0) {
      this.roll--;
      if (this.roll % 5 === 0) {
        this.cur[1] = (this.cur[1] + 1) % FF.Chars.list.length;
        this.setSide(1);
        this.slide[1] = 0;
        FF.Audio.sfx('ui');
      }
      if (this.roll === 0) {
        const others = FF.Chars.list.map((_, i) => i).filter((i) => i !== this.cur[0]);
        this.cur[1] = U.choice(others);
        this.setSide(1);
        this.confirm(1);
      }
      return;
    }
    for (const e of ev) {
      let p = this.mode === 'vs' ? (e.player === 1 ? 1 : 0) : this.activeSlot();
      if (this.mode === 'vs' && e.src === 'kb' && e.player < 0) p = 0;
      if (e.type === 'back') {
        if (this.mode === 'training' && this.lock[0] && !this.lock[1]) {
          this.lock[0] = false;
          FF.Audio.sfx('back');
        } else if (this.mode === 'vs' && this.lock[p]) {
          this.lock[p] = false;
          FF.Audio.sfx('back');
        } else {
          FF.Audio.sfx('back');
          const tt = new S.Title();
          tt.started = true;
          S.go(tt);
          return;
        }
        continue;
      }
      if (this.lock[p]) continue;
      if (e.type === 'left') this.move(p, -1);
      if (e.type === 'right') this.move(p, 1);
      if (e.type === 'up' || e.type === 'down') {
        // grade 4 × 2: cima/baixo pula uma linha
        const n = FF.Chars.list.length;
        const ni = this.cur[p] + (e.type === 'up' ? -4 : 4);
        if (ni >= 0 && ni < n) this.move(p, ni - this.cur[p]);
      }
      if (e.type === 'ok' || (e.type === 'key' && p === 1 && ['Numpad4', 'Insert', 'NumpadEnter'].includes(e.code))) this.confirm(p);
    }
    // mouse: passar por cima escolhe, clicar confirma
    const m = FF.Input.mouse;
    for (const r of this.rects) {
      if (FF.UI.inside(m.x, m.y, r.x, r.y, r.w, r.h)) {
        const s = this.mode === 'vs' ? (this.lock[0] ? 1 : 0) : this.activeSlot();
        if (!this.lock[s] && m.moved && this.cur[s] !== r.i) {
          this.cur[s] = r.i;
          this.setSide(s);
          if (s === 0 && this.mode !== 'vs') this.setSide(1);
          FF.Audio.sfx('ui');
        }
        if (click && !this.lock[s]) {
          this.cur[s] = r.i;
          this.setSide(s);
          this.confirm(s);
        }
      }
    }
    m.moved = false;
    if (this.lock[0] && this.lock[1] && this.go === 0) this.go = 80;
  };
  S.Select.prototype.confirm = function (p) {
    if (this.lock[p]) return;
    this.lock[p] = true;
    const id = FF.Chars.list[this.cur[p]];
    const m = this.side[p];
    m.state = 'win';
    m.stateFrame = 0;
    FF.Audio.sfx('ok');
    FF.Audio.speak(FF.Chars[id].lines.intro, FF.Chars[id].voice);
    if (p === 0 && this.mode === 'cpu') this.roll = 40;
    if (p === 0 && this.mode === 'training') {
      this.cur[1] = (this.cur[0] + 1) % FF.Chars.list.length;
      this.setSide(1);
    }
  };
  S.Select.prototype.start = function () {
    const ids = FF.Chars.list;
    S.go(new S.Versus({ mode: this.mode, p1: ids[this.cur[0]], p2: ids[this.cur[1]], difficulty: FF.Settings.data.difficulty }));
  };

  // =========================================================
  // TELA DE CONFRONTO (o momento marcante antes da luta)
  // =========================================================
  S.Versus = function (opts) {
    this.opts = opts;
    this.t = 0;
    this.m = [mock(opts.p1, 'win', 1), mock(opts.p2, 'win', -1, opts.p1 === opts.p2)];
  };
  S.Versus.prototype.enter = function () {
    const a = FF.Chars[this.opts.p1], b = FF.Chars[this.opts.p2];
    FF.Audio.speak(`${a.name.toLowerCase()} contra ${b.name.toLowerCase()}`, { pitch: 0.55, rate: 1 });
  };
  S.Versus.prototype.update = function (ev) {
    this.t++;
    this.m.forEach((m) => {
      m.frameCount++;
      m.stateFrame++;
    });
    if (this.t === 20) {
      FF.Audio.sfx('stinger');
      FF.Audio.sfx('punchH');
    }
    const click = FF.Input.consumeClick();
    const skip = this.t > 24 && (click || ev.some((e) => e.type === 'ok' || e.type === 'back' || e.type === 'pause'));
    if (this.t >= 150 || skip) S.go(new S.Fight(this.opts));
  };
  S.Versus.prototype.render = function (ctx) {
    const t = this.t;
    const R = FF.reduced;
    const a = FF.Chars[this.opts.p1], b = FF.Chars[this.opts.p2];
    const k = R ? 1 : U.easeOut(U.clamp(t / 18, 0, 1));
    // metades diagonais com a cor de cada lutador
    const half = (side, tint) => {
      ctx.save();
      ctx.beginPath();
      if (side === 0) { ctx.moveTo(0, 0); ctx.lineTo(W / 2 + 140, 0); ctx.lineTo(W / 2 - 140, H); ctx.lineTo(0, H); }
      else { ctx.moveTo(W / 2 + 140, 0); ctx.lineTo(W, 0); ctx.lineTo(W, H); ctx.lineTo(W / 2 - 140, H); }
      ctx.closePath();
      const g = ctx.createLinearGradient(side === 0 ? 0 : W, 0, W / 2, 0);
      g.addColorStop(0, tint);
      g.addColorStop(1, '#14152A');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.restore();
    };
    half(0, a.portraitTint);
    half(1, b.portraitTint);
    // faixa diagonal central
    ctx.save();
    ctx.strokeStyle = '#FFC531';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(W / 2 + 140, 0);
    ctx.lineTo(W / 2 - 140, H);
    ctx.stroke();
    ctx.restore();
    // lutadores entram pelos lados
    const scaleFor = (id) => 700 / FF.Chars[id].height * (id === 'jailson' ? 0.85 : 1);
    drawMock(ctx, this.m[0], 430 - (1 - k) * 600, 1040, scaleFor(this.opts.p1), 1);
    drawMock(ctx, this.m[1], W - 430 + (1 - k) * 600, 1040, scaleFor(this.opts.p2), 1);
    // nomes
    T(ctx, a.name, 120 - (1 - k) * 300, 150, { size: 96, align: 'left', color: a.look.nameColor, lw: 12 });
    T(ctx, a.title, 124 - (1 - k) * 300, 225, { size: 26, font: FF.FONT_UI, weight: '700', align: 'left', color: '#F3F6FF', lw: 6 });
    T(ctx, b.name, W - 120 + (1 - k) * 300, 150, { size: 96, align: 'right', color: b.look.nameColor, lw: 12 });
    T(ctx, b.title, W - 124 + (1 - k) * 300, 225, { size: 26, font: FF.FONT_UI, weight: '700', align: 'right', color: '#F3F6FF', lw: 6 });
    // VS bate no centro
    if (t >= 18 || R) {
      const v = R ? 1 : U.clamp((t - 18) / 8, 0, 1);
      const sc = R ? 1 : 2.2 - U.easeOut(v) * 1.2;
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.rotate(-0.12);
      ctx.scale(sc, sc);
      ctx.globalAlpha = v;
      T(ctx, 'VS', 0, 0, { size: 230, color: '#FFC531', stroke: '#1A1033', lw: 22 });
      ctx.restore();
    }
    T(ctx, 'Fabricar Arena', W / 2, H - 70, { size: 34, color: '#F3F6FF', lw: 7, alpha: k });
    if (t > 24) T(ctx, 'Enter pula', W / 2, H - 26, { size: 18, font: FF.FONT_UI, weight: '700', color: '#C9CEF5', lw: 4 });
  };

  // emblema original do jogo (hexágono com </>), no lugar de qualquer logotipo de terceiros
  function emblem(ctx, x, y, r, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = 0.45;
    for (let ring = 0; ring < 2; ring++) {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i + Math.PI / 6;
        const rr = r * (ring ? 0.8 : 1);
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.lineWidth = ring ? 6 : 18;
      ctx.strokeStyle = ring ? 'rgba(255,225,240,0.55)' : 'rgba(255,225,240,0.85)';
      ctx.stroke();
    }
    ctx.font = `${r * 0.62}px ${FF.FONT_D}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,225,240,0.9)';
    ctx.fillText('</>', 0, r * 0.04);
    ctx.restore();
  }

  // tela de seleção no estilo dos jogos de luta modernos: cenário ao fundo,
  // logotipo no centro, lutadores 3D grandes nas laterais e grade de retratos embaixo
  S.Select.prototype.render = function (ctx) {
    const t = this.t;
    const ids = FF.Chars.list;
    const camX = FF.STAGE_W / 2 + 620 + Math.sin(t * 0.003) * 80;
    FF.Stage.drawBack(ctx, camX, { hype: 0.35 }, t);
    // gradação cinematográfica: topo e base escurecidos, centro quente
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(12,8,30,0.7)');
    g.addColorStop(0.45, 'rgba(60,20,50,0.25)');
    g.addColorStop(0.66, 'rgba(12,8,30,0.35)');
    g.addColorStop(1, 'rgba(8,6,20,0.92)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // logotipo central
    logo(ctx, W / 2, 250, Math.max(t, 80), 0.72);

    // lutadores grandes, virados um para o outro
    const hideRight = this.mode === 'cpu' && !this.lock[0];
    const scaleFor = (id) => (600 / FF.Chars[id].height) * (id === 'jailson' ? 0.86 : 1);
    const FEET = 690;
    for (let s = 0; s < 2; s++) {
      const x0 = s === 0 ? 430 : W - 430;
      if (s === 1 && hideRight) {
        FF.text(ctx, '?', x0, 420, { size: 280, color: 'rgba(255,225,240,0.35)', lw: 0 });
        continue;
      }
      const m = this.side[s];
      const k = 1 - U.easeOut(1 - this.slide[s]);
      const x = x0 + (s === 0 ? -1 : 1) * 260 * k;
      ctx.save();
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = 'rgba(5,4,20,0.5)';
      ctx.beginPath();
      ctx.ellipse(x, FEET + 4, 190, 30, 0, 0, Math.PI * 2);
      ctx.fill();
      drawMock(ctx, m, x, FEET, scaleFor(m.id), 1 - k);
      ctx.restore();
    }

    // nomes acima da grade
    const nameOf = (s) => FF.Chars[ids[this.cur[s]]].name;
    T(ctx, nameOf(0), 70, 718, { size: 50, align: 'left', color: '#FFFFFF', stroke: '#140E26', lw: 10 });
    if (!hideRight) T(ctx, nameOf(1), W - 70, 718, { size: 50, align: 'right', color: '#FFFFFF', stroke: '#140E26', lw: 10 });

    // fichas laterais (atributos, frase e especial)
    const info = (s, x, al) => {
      const d = FF.Chars[ids[this.cur[s]]];
      const y0 = 770;
      T(ctx, `${d.role} · ${d.hp} HP`, x, y0, { size: 18, font: FF.FONT_UI, weight: '700', align: al, color: '#C9CEF5', lw: 4 });
      wrap(ctx, `“${d.lines.intro}”`, x, y0 + 30, 470, 20, al, '#FFFFFF');
      const stats = [['Força', d.stats.str], ['Velocidade', d.stats.spd], ['Defesa', d.stats.def], ['Inteligência', d.stats.int]];
      stats.forEach((st, k) => {
        const y = y0 + 92 + k * 28;
        const bx = al === 'left' ? x + 128 : x - 128 - 230;
        T(ctx, st[0], x, y, { size: 16, font: FF.FONT_UI, weight: '700', align: al, color: '#C9CEF5', lw: 4 });
        const shown = (this.statsShown[s][k] = FF.reduced ? st[1] : FF.approach(this.statsShown[s][k], st[1], 0.16));
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bx, y - 6, 230, 12, 4); else ctx.rect(bx, y - 6, 230, 12);
        ctx.fill();
        ctx.fillStyle = d.look.meter[0];
        const fw = Math.max(4, (230 * shown) / 100);
        ctx.beginPath();
        const xx = al === 'left' ? bx : bx + 230 - fw;
        if (ctx.roundRect) ctx.roundRect(xx, y - 6, fw, 12, 4); else ctx.rect(xx, y - 6, fw, 12);
        ctx.fill();
        T(ctx, String(st[1]), al === 'left' ? bx + 242 : bx - 12, y, { size: 16, font: FF.FONT_UI, weight: '700', align: al, color: '#FFFFFF', lw: 4 });
      });
      T(ctx, `Especial: ${d.superName}`, x, y0 + 214, { size: 20, align: al, color: '#FFC531', lw: 5 });
      wrap(ctx, d.superDesc, x, y0 + 244, 470, 16, al, '#E6E9F7');
    };
    info(0, 70, 'left');
    if (!hideRight) info(1, W - 70, 'right');

    // grade de retratos 4 × 2
    const cols = 4, tw = 128, th = 152, gap = 10;
    const gx0 = W / 2 - (cols * tw + (cols - 1) * gap) / 2;
    const gy0 = 742;
    this.rects.length = 0;
    const slots = 8;
    for (let i = 0; i < slots; i++) {
      const x = gx0 + (i % cols) * (tw + gap);
      const y = gy0 + Math.floor(i / cols) * (th + gap);
      const id = ids[i];
      ctx.save();
      ctx.fillStyle = '#211D2A';
      ctx.fillRect(x - 3, y - 3, tw + 6, th + 6);
      if (!id) {
        // vaga futura (personagem por vir)
        ctx.fillStyle = '#2C2836';
        ctx.fillRect(x, y, tw, th);
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.beginPath();
        ctx.arc(x + tw / 2, y + 58, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(x + tw / 2 - 40, y + 92, 80, 60);
        FF.text(ctx, '+', x + tw / 2, y + th - 30, { size: 34, color: 'rgba(255,255,255,0.35)', lw: 0 });
        ctx.restore();
        continue;
      }
      this.rects.push({ x, y, w: tw, h: th, i });
      const d = FF.Chars[id];
      const sel0 = this.cur[0] === i;
      const sel1 = !hideRight && this.cur[1] === i && (this.mode !== 'training' || this.lock[0]);
      const mm = FF.Input.mouse;
      const hov = FF.UI.inside(mm.x, mm.y, x, y, tw, th);
      this.lift[i] = FF.reduced ? 0 : FF.approach(this.lift[i], hov && !sel0 ? -4 : 0, 0.25);
      const yy = y + this.lift[i];
      const pg = ctx.createLinearGradient(0, yy, 0, yy + th);
      pg.addColorStop(0, d.portraitTint);
      pg.addColorStop(1, '#121020');
      ctx.fillStyle = pg;
      ctx.fillRect(x, yy, tw, th);
      ctx.beginPath();
      ctx.rect(x, yy, tw, th);
      ctx.clip();
      FF.Anim.drawPortrait(ctx, id, x + tw / 2, yy + 76, 1.25, 1, 'normal');
      ctx.restore();
      // moldura de seleção (P1 em fogo, P2/CPU em azul)
      if (sel0 || sel1) {
        ctx.save();
        ctx.lineWidth = 5;
        const og = ctx.createLinearGradient(x, yy, x, yy + th);
        og.addColorStop(0, sel0 ? '#FFC531' : '#7FD8FF');
        og.addColorStop(1, sel0 ? '#FF5A1F' : '#2F7BFF');
        ctx.strokeStyle = og;
        ctx.strokeRect(x - 1, yy - 1, tw + 2, th + 2);
        ctx.restore();
      }
      const tag = (label, col, right) => {
        ctx.save();
        ctx.font = `16px ${FF.FONT_D}`;
        const w = ctx.measureText(label).width + 14;
        const tx = right ? x + tw - w : x;
        ctx.fillStyle = '#140E26';
        ctx.fillRect(tx, yy - 24, w, 22);
        ctx.fillStyle = col;
        ctx.fillRect(tx, yy - 4, w, 3);
        ctx.restore();
        T(ctx, label, tx + w / 2, yy - 13, { size: 15, color: col, lw: 0 });
      };
      if (sel0) tag(this.lock[0] ? 'P1 OK' : 'P1', '#FFC531', false);
      if (sel1) tag(this.mode === 'cpu' ? 'CPU' : this.mode === 'training' ? 'ALVO' : this.lock[1] ? 'P2 OK' : 'P2', '#7FD8FF', true);
    }

    // atalhos nos cantos, como nos menus de console
    const chip = (label, x, al) => {
      ctx.save();
      ctx.font = `700 18px ${FF.FONT_UI}`;
      const w = ctx.measureText(label).width + 26;
      const cx = al === 'right' ? x - w : x;
      ctx.fillStyle = 'rgba(20,14,38,0.7)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(cx, 22, w, 34, 17); else ctx.rect(cx, 22, w, 34);
      ctx.fill();
      ctx.restore();
      T(ctx, label, cx + w / 2, 40, { size: 18, font: FF.FONT_UI, weight: '700', color: '#F3F6FF', lw: 0 });
    };
    chip('Esc  voltar', 24, 'left');
    chip({ cpu: 'P1  vs  CPU', vs: 'P1  vs  P2', training: this.lock[0] ? 'Treino · escolha o alvo' : 'Treino' }[this.mode], W - 24, 'right');
    if (this.go > 0) {
      ctx.fillStyle = `rgba(255,255,255,${Math.max(0, (this.go - 60) / 20) * 0.6})`;
      ctx.fillRect(0, 0, W, H);
    }
  };
  function wrap(ctx, text, x, y, maxW, size, align, color) {
    ctx.save();
    ctx.font = `700 ${size}px ${FF.FONT_UI}`;
    const words = text.split(' ');
    let line = '';
    let yy = y;
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) {
        T(ctx, line, x, yy, { size, font: FF.FONT_UI, weight: '700', align, color: color || '#F3F6FF', lw: 5 });
        line = w;
        yy += size * 1.35;
      } else line = test;
    }
    if (line) T(ctx, line, x, yy, { size, font: FF.FONT_UI, weight: '700', align, color: color || '#F3F6FF', lw: 5 });
    ctx.restore();
  }

  // =========================================================
  // LUTA
  // =========================================================
  S.Fight = function (opts) {
    this.opts = opts;
    this.battle = new FF.Battle(Object.assign({}, opts, { onFinish: (w) => this.finish(w) }));
    this.pauseSel = 0;
    this.showMoves = false;
    this.rects = [];
  };
  S.Fight.prototype.enter = function () {
    FF.Audio.playMusic('battle');
  };
  S.Fight.prototype.finish = function (w) {
    S.go(new S.Results(this.opts, w, this.battle));
  };
  S.Fight.prototype.pauseItems = function () {
    const B = this.battle;
    const o = B.trainingOpts;
    const items = [{ label: 'Continuar', act: 'resume' }, { label: 'Lista de golpes', act: 'moves' }];
    if (B.training) {
      items.push({ label: `Adversário: ${{ stand: 'Parado', block: 'Defende tudo', crouch: 'Agachado', cpu: 'CPU' }[o.dummy]}`, act: 'dummy', size: 28 });
      items.push({ label: `Vida infinita: ${o.infiniteLife ? 'Sim' : 'Não'}`, act: 'life', size: 28 });
      items.push({ label: `Barra infinita: ${o.infiniteMeter ? 'Sim' : 'Não'}`, act: 'meter', size: 28 });
      items.push({ label: `Hitboxes: ${o.hitboxes ? 'Visíveis' : 'Ocultas'}`, act: 'hitbox', size: 28 });
      items.push({ label: 'Reiniciar posição', act: 'reset', size: 28 });
    } else items.push({ label: 'Reiniciar partida', act: 'restart' });
    items.push({ label: 'Sair para o menu', act: 'quit' });
    return items;
  };
  S.Fight.prototype.update = function (ev) {
    const B = this.battle;
    const click = FF.Input.consumeClick();
    for (const e of ev) {
      if ((e.type === 'key' && e.code === 'Escape') || e.type === 'pause') {
        if (this.showMoves) this.showMoves = false;
        else {
          B.paused = !B.paused;
          this.pauseSel = 0;
          FF.Audio.sfx(B.paused ? 'ok' : 'back');
        }
      }
      if (B.training && e.type === 'key') {
        if (e.code === 'F1') B.trainingOpts.hitboxes = !B.trainingOpts.hitboxes;
        if (e.code === 'F2') B.cycleDummy();
        if (e.code === 'F3') B.trainingOpts.infiniteMeter = !B.trainingOpts.infiniteMeter;
        if (e.code === 'Backspace' && !B.paused) B.trainingResetPos();
      }
      if (B.training && e.type === 'select') B.trainingResetPos();
    }
    if (B.paused) {
      if (this.showMoves) {
        if (ev.some((e) => e.type === 'back' || e.type === 'ok') || click) this.showMoves = false;
        return;
      }
      const items = this.pauseItems();
      const ms = mouseSel(this.rects);
      if (ms >= 0 && FF.Input.mouse.moved) {
        this.pauseSel = ms;
        FF.Input.mouse.moved = false;
      }
      let act = null;
      for (const e of ev) {
        if (e.type === 'up') { this.pauseSel = (this.pauseSel + items.length - 1) % items.length; FF.Audio.sfx('ui'); }
        if (e.type === 'down') { this.pauseSel = (this.pauseSel + 1) % items.length; FF.Audio.sfx('ui'); }
        if (e.type === 'ok') act = items[this.pauseSel].act;
        if (e.type === 'back' && !(e.code === 'Escape')) act = 'resume';
      }
      if (click && ms >= 0) act = items[ms].act;
      if (act) this.pauseAction(act);
      return;
    }
    B.update();
  };
  S.Fight.prototype.pauseAction = function (act) {
    const B = this.battle;
    const o = B.trainingOpts;
    FF.Audio.sfx('ok');
    switch (act) {
      case 'resume': B.paused = false; break;
      case 'moves': this.showMoves = true; break;
      case 'dummy': B.cycleDummy(); break;
      case 'life': o.infiniteLife = !o.infiniteLife; break;
      case 'meter': o.infiniteMeter = !o.infiniteMeter; break;
      case 'hitbox': o.hitboxes = !o.hitboxes; break;
      case 'reset': B.trainingResetPos(); B.paused = false; break;
      case 'restart': S.go(new S.Fight(this.opts)); break;
      case 'quit': {
        FF.Audio.hush();
        const tt = new S.Title();
        tt.started = true;
        S.go(tt);
        break;
      }
    }
  };
  S.Fight.prototype.render = function (ctx) {
    const B = this.battle;
    B.render(ctx);
    this.pauseT = B.paused ? (this.pauseT || 0) + 1 : 0;
    if (B.paused) {
      // painel de pausa entra com leve escala (ease-out ~200 ms)
      const k = FF.reduced ? 1 : U.easeOut(U.clamp(this.pauseT / 12, 0, 1));
      ctx.fillStyle = `rgba(10,8,30,${0.72 * k})`;
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.globalAlpha = k;
      ctx.translate(W / 2, H / 2);
      ctx.scale(0.96 + 0.04 * k, 0.96 + 0.04 * k);
      ctx.translate(-W / 2, -H / 2);
      if (this.showMoves) moveList(ctx, B);
      else {
        T(ctx, 'PAUSA', W / 2, 200, { size: 90, color: '#FFC531', lw: 12 });
        const items = this.pauseItems();
        menuList(ctx, items, this.pauseSel, W / 2 - 260, 300, 520, 62, 14, this.rects);
      }
      ctx.restore();
    }
  };
  function moveList(ctx, B) {
    T(ctx, 'Lista de golpes', W / 2, 90, { size: 56, color: '#FFC531' });
    B.f.forEach((f, i) => {
      const x = i === 0 ? 140 : W / 2 + 60;
      const d = f.def;
      T(ctx, d.name, x, 180, { size: 44, align: 'left', color: i === 0 ? '#5FE0D2' : '#FF6A78' });
      const bk = FF.Settings.data.bindings[B.mode === 'vs' && i === 1 ? 'p2' : 'p1'];
      const kl = (a) => FF.Input.keyLabel((bk[a] || [])[0]);
      const rows = [
        [`${d.superName} (especial definitivo)`, `${kl('sup')}  ou  O + L  ou  ↓↘→↓↘→ + forte`],
        [d.secondaryName.replace(' (I+K)', ''), `${kl('sec')}  ou  I + K`],
        ...d.specialList.map((s) => [s.name, `${kl(s.key)}  ou  ${s.label}`]),
        ['Agarrão', `${kl('grab')}  ou  U + J (perto)`],
        ['Dash', 'frente/trás duas vezes'],
        ['Upper lançador → combo aéreo', '↓ + O, depois ↑ no acerto'],
      ];
      rows.forEach((r, k) => {
        T(ctx, r[0], x, 250 + k * 70, { size: 26, font: FF.FONT_UI, weight: '700', align: 'left', color: '#F3F6FF', lw: 5 });
        T(ctx, r[1], x, 280 + k * 70, { size: 22, font: FF.FONT_UI, weight: '600', align: 'left', color: '#8C93C9', lw: 4 });
      });
    });
    T(ctx, 'Comandos se invertem sozinhos conforme o lado do personagem · Enter ou Esc volta', W / 2, H - 50, { size: 20, font: FF.FONT_UI, weight: '700', color: '#C9CEF5', lw: 4 });
  }

  // =========================================================
  // RESULTADO
  // =========================================================
  S.Results = function (opts, w, battle) {
    this.opts = opts;
    this.w = w;
    this.t = 0;
    this.sel = 0;
    this.rects = [];
    const id = w === 0 ? opts.p1 : opts.p2;
    this.id = id;
    this.mock = mock(id, 'win', 1, w === 1 && opts.p1 === opts.p2);
    this.stats = battle.stats;
    this.rounds = battle.rounds.wins.slice();
  };
  S.Results.prototype.enter = function () {
    FF.Audio.playMusic('victory');
  };
  S.Results.prototype.update = function (ev) {
    this.t++;
    this.mock.frameCount++;
    const items = ['Revanche', 'Trocar personagem', 'Menu principal'];
    const click = FF.Input.consumeClick();
    const ms = mouseSel(this.rects);
    if (ms >= 0 && FF.Input.mouse.moved) {
      this.sel = ms;
      FF.Input.mouse.moved = false;
    }
    let act = -1;
    for (const e of ev) {
      if (e.type === 'up') this.sel = (this.sel + 2) % 3;
      if (e.type === 'down') this.sel = (this.sel + 1) % 3;
      if (e.type === 'ok') act = this.sel;
    }
    if (click && ms >= 0) act = ms;
    if (act < 0 || this.t < 30) return;
    FF.Audio.sfx('ok');
    if (act === 0) S.go(new S.Fight(this.opts));
    else if (act === 1) S.go(new S.Select(this.opts.mode));
    else {
      const tt = new S.Title();
      tt.started = true;
      S.go(tt);
    }
    void items;
  };
  S.Results.prototype.render = function (ctx) {
    backdrop(ctx, this.t, 0.74);
    const def = FF.Chars[this.id];
    const k = FF.reduced ? 1 : U.easeOut(U.clamp(this.t / 20, 0, 1));
    drawMock(ctx, this.mock, 520 - (1 - k) * 300, 1010, 1.8, 1);
    const head = this.opts.mode === 'cpu' ? (this.w === 0 ? 'YOU WIN' : 'YOU LOSE') : `JOGADOR ${this.w + 1} VENCE`;
    T(ctx, head, 1300, 140, { size: 110, color: '#FFC531', lw: 14 });
    T(ctx, def.name, 1300, 252, { size: 60, color: def.look.nameColor });
    T(ctx, `“${def.lines.win}”`, 1300, 326, { size: 30, font: FF.FONT_UI, weight: '700', color: '#F3F6FF', lw: 6 });
    // resumo da partida em números grandes com rótulo curto
    const mc = this.stats.maxCombo || [0, 0];
    const tiles = [
      [`${this.rounds[0]}×${this.rounds[1]}`, 'Placar'],
      [String(this.stats.hits), 'Golpes certos'],
      [String(this.stats.blocks), 'Defesas'],
      [String(Math.max(mc[0], mc[1])), 'Maior combo'],
    ];
    const tw = 200, gap = 20, tx0 = 1300 - (tiles.length * tw + (tiles.length - 1) * gap) / 2;
    tiles.forEach((tl, i) => {
      const x = tx0 + i * (tw + gap);
      const kk = FF.reduced ? 1 : U.easeOut(U.clamp((this.t - 10 - i * 4) / 14, 0, 1));
      ctx.save();
      ctx.globalAlpha = kk;
      ctx.fillStyle = 'rgba(18,22,58,0.78)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, 380, tw, 112, 8);
      else ctx.rect(x, 380, tw, 112);
      ctx.fill();
      ctx.restore();
      T(ctx, tl[0], x + tw / 2, 426, { size: 50, color: '#F3F6FF', lw: 0, alpha: kk });
      T(ctx, tl[1], x + tw / 2, 470, { size: 20, font: FF.FONT_UI, weight: '700', color: '#C9CEF5', lw: 0, alpha: kk });
    });
    menuList(ctx, [{ label: 'Revanche' }, { label: 'Trocar personagem' }, { label: 'Menu principal' }], this.sel, 1060, 560, 480, 72, 18, this.rects);
  };

  // =========================================================
  // CONTROLES (reconfiguração de teclas)
  // =========================================================
  const ACTION_LABEL = {
    left: 'Esquerda', right: 'Direita', up: 'Pular', down: 'Agachar',
    lp: 'Soco leve', mp: 'Soco médio', hp: 'Soco forte', lk: 'Chute leve', mk: 'Chute médio', hk: 'Chute forte',
    grab: 'Agarrão', sec: 'Especial secundário', sup: 'Especial definitivo',
    sp1: 'Especial 1 · projétil', sp2: 'Especial 2 · upper', sp3: 'Especial 3 · avanço', sp4: 'Especial 4 · meia-lua',
  };
  S.Controls = function () {
    this.t = 0;
    this.col = 0;
    this.row = 0;
    this.waiting = false;
    this.rects = [];
  };
  S.Controls.prototype.rows = function () {
    return FF.Input.ACTIONS.concat(['reset', 'back']);
  };
  S.Controls.prototype.update = function (ev) {
    this.t++;
    if (this.waiting) return;
    const rows = this.rows();
    const click = FF.Input.consumeClick();
    let act = false;
    for (const e of ev) {
      if (e.type === 'up') this.row = (this.row + rows.length - 1) % rows.length;
      if (e.type === 'down') this.row = (this.row + 1) % rows.length;
      if (e.type === 'left' || e.type === 'right') this.col = 1 - this.col;
      if (e.type === 'ok') act = true;
      if (e.type === 'back') {
        FF.Audio.sfx('back');
        const tt = new S.Title();
        tt.started = true;
        S.go(tt);
        return;
      }
      if (e.type === 'up' || e.type === 'down' || e.type === 'left' || e.type === 'right') FF.Audio.sfx('ui');
    }
    if (click) {
      const m = FF.Input.mouse;
      for (const r of this.rects) if (FF.UI.inside(m.x, m.y, r.x, r.y, r.w, r.h)) {
        this.row = r.row;
        this.col = r.col;
        act = true;
      }
    }
    if (!act) return;
    const key = rows[this.row];
    if (key === 'back') {
      const tt = new S.Title();
      tt.started = true;
      S.go(tt);
      return;
    }
    if (key === 'reset') {
      FF.Settings.data.bindings = FF.Input.defaultBindings();
      FF.Settings.save();
      FF.Audio.sfx('ok');
      return;
    }
    this.waiting = true;
    FF.Audio.sfx('ok');
    FF.Input.waitRebind((code) => {
      this.waiting = false;
      if (code === 'Escape') return;
      const b = FF.Settings.data.bindings[this.col === 0 ? 'p1' : 'p2'];
      // remove a tecla de qualquer outra ação para evitar conflito
      for (const p of ['p1', 'p2'])
        for (const a of FF.Input.ACTIONS) {
          const arr = FF.Settings.data.bindings[p][a];
          const i = arr.indexOf(code);
          if (i >= 0) arr.splice(i, 1);
        }
      b[key] = [code].concat((b[key] || []).filter((c) => c !== code).slice(0, 1));
      FF.Settings.save();
      FF.Audio.sfx('ok');
    });
  };
  S.Controls.prototype.render = function (ctx) {
    backdrop(ctx, this.t, 0.78);
    T(ctx, 'Controles', W / 2, 70, { size: 60, color: '#FFC531' });
    const rows = this.rows();
    this.rects.length = 0;
    const b = FF.Settings.data.bindings;
    const x0 = 90, colW = 270, rh = 45, y0 = 160;
    T(ctx, 'Jogador 1', x0 + 310 + colW / 2, y0 - 30, { size: 26, color: '#4DF3E8' });
    T(ctx, 'Jogador 2', x0 + 310 + colW + 20 + colW / 2, y0 - 30, { size: 26, color: '#FF6A78' });
    rows.forEach((r, i) => {
      const y = y0 + i * rh;
      const label = r === 'reset' ? 'Restaurar padrão' : r === 'back' ? 'Voltar' : ACTION_LABEL[r];
      T(ctx, label, x0, y + 18, { size: 21, font: FF.FONT_UI, weight: '700', align: 'left', color: this.row === i ? '#FFC531' : '#F3F6FF', lw: 5 });
      if (r === 'reset' || r === 'back') {
        if (this.row === i) FF.UI.slant(ctx, x0 - 20, y + 36, 260, 4, 0, '#FFC531');
        this.rects.push({ x: x0, y, w: 300, h: rh - 6, row: i, col: this.col });
        return;
      }
      for (let c = 0; c < 2; c++) {
        const bx = x0 + 310 + c * (colW + 20);
        const focused = this.row === i && this.col === c;
        const keys = b[c === 0 ? 'p1' : 'p2'][r] || [];
        const txt = this.waiting && focused ? 'Pressione uma tecla…' : keys.map(FF.Input.keyLabel).join(' / ') || '—';
        FF.UI.button(ctx, txt, bx, y, colW, rh - 8, focused, { size: 20, color: c === 0 ? '#4DF3E8' : '#FF6A78' });
        this.rects.push({ x: bx, y, w: colW, h: rh - 8, row: i, col: c });
      }
    });
    // comandos e controle
    const rx = 1130;
    T(ctx, 'Comandos especiais', rx, 160, { size: 30, align: 'left', color: '#FFC531' });
    const k1 = (a) => FF.Input.keyLabel((FF.Settings.data.bindings.p1[a] || [])[0]);
    const cmds = [
      [`${k1('grab')}  (ou U + J)`, 'Agarrão'],
      [`${k1('sec')}  (ou I + K)`, 'Especial secundário'],
      [`${k1('sup')}  (ou O + L)`, 'Especial definitivo (barra 100%)'],
      [`${k1('sp1')}  (ou ↓↘→ + soco)`, 'Especial 1 · projétil'],
      [`${k1('sp2')}  (ou →↓↘ + soco)`, 'Especial 2 · upper'],
      [`${k1('sp3')}  (ou ↓↙← + chute)`, 'Especial 3 · avanço'],
      [`${k1('sp4')}  (ou meia-lua + ataque)`, 'Especial 4 · meia-lua'],
      ['Toque duplo ← ou →', 'Dash'],
      ['Segurar trás / ↙', 'Defesa em pé / baixa'],
      ['Esc', 'Pausar'],
    ];
    cmds.forEach((c, i) => {
      T(ctx, c[0], rx, 210 + i * 46, { size: 22, font: FF.FONT_UI, weight: '700', align: 'left', color: '#F3F6FF', lw: 4 });
      T(ctx, c[1], rx + 330, 210 + i * 46, { size: 20, font: FF.FONT_UI, weight: '600', align: 'left', color: '#C9CEF5', lw: 4 });
    });
    T(ctx, 'Controle (Gamepad API)', rx, 720, { size: 26, align: 'left', color: '#FFC531' });
    const pads = [
      'X / Y / RB = socos leve, médio, forte',
      'A / B / RT = chutes leve, médio, forte',
      'LB = agarrão · LT = especial definitivo',
      'L3 = especial secundário · R3 = especial 1',
      'Direcional ou analógico move · Start pausa',
      `Controles conectados: ${FF.Input.padCount()}`,
    ];
    pads.forEach((p, i) => T(ctx, p, rx, 770 + i * 32, { size: 20, font: FF.FONT_UI, weight: '600', align: 'left', color: '#C9CEF5', lw: 4 }));
    T(ctx, 'Enter para trocar a tecla · ←/→ muda de jogador · Esc volta', W / 2, H - 30, { size: 20, font: FF.FONT_UI, weight: '700', color: '#8C93C9', lw: 4 });
  };

  // =========================================================
  // CONFIGURAÇÕES
  // =========================================================
  S.Settings = function () {
    this.t = 0;
    this.sel = 0;
    this.rects = [];
  };
  S.Settings.prototype.items = function () {
    const s = FF.Settings.data;
    const pct = (v) => `${Math.round(v * 100)}%`;
    return [
      { key: 'music', label: `Música: ${pct(s.music)}` },
      { key: 'sfx', label: `Efeitos sonoros: ${pct(s.sfx)}` },
      { key: 'voice', label: `Falas e locutor: ${s.voice ? 'Ligado' : 'Desligado'}` },
      { key: 'shake', label: `Tremor de câmera: ${s.shake ? 'Ligado' : 'Desligado'}` },
      { key: 'graphics', label: `Gráficos: ${{ '3d': '3D (automático)', '3dmax': '3D (máximo)', '2d': '2D clássico' }[s.graphics] || '3D (automático)'}` },
      { key: 'difficulty', label: `Dificuldade da CPU: ${{ easy: 'Fácil', normal: 'Normal', hard: 'Difícil' }[s.difficulty]}` },
      { key: 'back', label: 'Voltar' },
    ];
  };
  S.Settings.prototype.change = function (key, d) {
    const s = FF.Settings.data;
    if (key === 'music' || key === 'sfx') s[key] = U.clamp(Math.round((s[key] + d * 0.1) * 10) / 10, 0, 1);
    if (key === 'voice' || key === 'shake') s[key] = !s[key];
    if (key === 'graphics') {
      const o = ['3d', '3dmax', '2d'];
      s.graphics = o[(Math.max(0, o.indexOf(s.graphics)) + (d || 1) + 3) % 3];
      FF.force2D = s.graphics === '2d';
      if (s.graphics === '3dmax') FF.GL.res = 1;
      if (!FF.force2D && !FF.GL.ok) FF.notify('WebGL indisponível neste navegador: o 3D não pode ser ligado.', 6000);
    }
    if (key === 'difficulty') {
      const o = ['easy', 'normal', 'hard'];
      s.difficulty = o[(o.indexOf(s.difficulty) + d + 3) % 3];
    }
    FF.Settings.save();
    FF.Audio.applyVolumes();
    FF.Audio.sfx('ui');
  };
  S.Settings.prototype.update = function (ev) {
    this.t++;
    const items = this.items();
    const click = FF.Input.consumeClick();
    const ms = mouseSel(this.rects);
    if (ms >= 0 && FF.Input.mouse.moved) {
      this.sel = ms;
      FF.Input.mouse.moved = false;
    }
    const leave = () => {
      FF.Audio.sfx('back');
      const tt = new S.Title();
      tt.started = true;
      S.go(tt);
    };
    for (const e of ev) {
      if (e.type === 'up') this.sel = (this.sel + items.length - 1) % items.length;
      if (e.type === 'down') this.sel = (this.sel + 1) % items.length;
      if (e.type === 'left') this.change(items[this.sel].key, -1);
      if (e.type === 'right') this.change(items[this.sel].key, 1);
      if (e.type === 'ok') {
        if (items[this.sel].key === 'back') return leave();
        this.change(items[this.sel].key, 1);
      }
      if (e.type === 'back') return leave();
    }
    if (click && ms >= 0) {
      if (items[ms].key === 'back') return leave();
      this.change(items[ms].key, 1);
    }
  };
  S.Settings.prototype.render = function (ctx) {
    backdrop(ctx, this.t, 0.75);
    T(ctx, 'Configurações', W / 2, 120, { size: 64, color: '#FFC531' });
    menuList(ctx, this.items(), this.sel, W / 2 - 330, 240, 660, 70, 18, this.rects);
    T(ctx, '←/→ ajusta · Enter alterna · Esc volta', W / 2, H - 40, { size: 20, font: FF.FONT_UI, weight: '700', color: '#8C93C9', lw: 4 });
  };

  return S;
})();
