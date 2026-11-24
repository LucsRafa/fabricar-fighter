// ============================================================
// HABILIDADES ESPECIAIS — Cladiio AI, Modo Tadalas, agarrões
// e projéteis. O Cladiio é uma entidade interna do jogo.
// ============================================================
FF.Specials = (function () {
  const U = FF.U;
  const S = {};
  S.CLADIIO_DMG = 6;
  S.CLADIIO_HITS = 5;
  S.TADALAS_FRAMES = 300; // 5 s × 60 passos

  // ---------------- início do especial definitivo ----------------
  S.startSuper = function (f) {
    const B = f.battle;
    f.meter = 0;              // barra volta a 0% após o uso
    f.superActive = true;     // trava ganho de barra durante o especial
    f.setState('super', true);
    f.superFrame = 0;
    f.superStow = 0;
    f.superInvuln = true;
    f.vx = 0;
    f.buf.length = 0;
    B.stats.supers[f.id] = (B.stats.supers[f.id] || 0) + 1;
    FF.Audio.sfx('superStart');
    const sup = f.def.super;
    const freeze = { cladiio: 80, tadalas: 74, tester: 60, fumada: 64, rolamento: 40, chicote: 34, tamboreu: 34 }[sup] || 70;
    B.startFreeze(f, freeze);
    B.cam.zoomTo(sup === 'cladiio' ? 1.22 : 1.25, f.x);
  };

  S.superUpdate = function (f) {
    const sup = f.def.super;
    if (sup === 'cladiio') S.cladiioUpdate(f);
    else if (sup === 'tadalas') S.tadalasUpdate(f);
    else if (sup === 'tester') S.testerUpdate(f);
    else if (sup === 'rolamento') S.rolamentoUpdate(f);
    else if (sup === 'chicote') S.chicoteUpdate(f);
    else if (sup === 'tamboreu') S.tamboreuUpdate(f);
    else S.fumadaUpdate(f);
  };

  // ---------------- TOM: Chicote do Prazo ----------------
  S.WHIP_HITS = 6;
  S.WHIP_DMG = 4;
  S.WHIP_RANGE = 560;
  const WHIP_TXT = ['TRABALHA!', 'MAIS UMA HU!', 'PRAZO É HOJE!', 'HORA EXTRA!', 'SEM CAFÉ!', 'ENTREGA!'];
  S.chicoteUpdate = function (f) {
    const B = f.battle;
    const t = f.superFrame++;
    const o = f.opp;
    f.vx = 0;
    if (!f.whip) f.whip = { lash: 0, hits: 0, caught: null, t: 0 };
    const w = f.whip;
    if (w.lash > 0) w.lash--;
    if (t === 4) {
      f.face = 'shout';
      f.say(f.def.lines.super); // "TRABALHA MAIS!"
      B.message('TRABALHA MAIS!', f.slot, 'callout');
      FF.Audio.sfx('whooshH');
    }
    if (t === 8) B.darkT = 34;
    if (t === 34) {
      // primeira chicotada decide se pegou o rival (alcance longo)
      const dist = Math.abs(o.x - f.x);
      w.caught = dist <= S.WHIP_RANGE && !o.isInvulnerable() && o.state !== 'thrown';
      w.lash = 8;
      FF.Audio.sfx('whooshH');
      if (w.caught) S.whipHit(f, o);
      else B.fx.text(f.x + f.facing * 300, f.y - 260, 'FORA DO ESCOPO', '#C9CEF5', 30, 40);
    }
    if (w.caught && t > 34 && (t - 34) % 14 === 0 && w.hits < S.WHIP_HITS) {
      w.lash = 8;
      FF.Audio.sfx('whooshH');
      S.whipHit(f, o);
    }
    const end = w.caught ? 34 + 14 * (S.WHIP_HITS - 1) + 22 : 62;
    if (t >= end) {
      f.whip = null;
      f.face = 'normal';
      f.superActive = false;
      f.superInvuln = false;
      f.setState('idle', true);
    }
  };
  S.whipHit = function (f, o) {
    const B = f.battle;
    const w = f.whip;
    w.hits++;
    B.stats.whipHits++;
    const last = w.hits >= S.WHIP_HITS;
    const dir = Math.sign(o.x - f.x) || f.facing;
    const px = o.x - dir * 20, py = o.y - o.def.height * 0.6;
    FF.Audio.sfx('punchH');
    FF.Audio.sfx('block');
    B.cam.shake(last ? 18 : 8);
    B.fx.text(px + ((w.hits % 3) - 1) * 70, py - 70 - (w.hits % 3) * 42, WHIP_TXT[w.hits - 1] || 'TRABALHA!', '#FFC531', 36, 26);
    if (o.tadalas > 0) {
      B.fx.text(px, py - 30, 'IMUNE', '#FFC531', 40, 40);
      FF.Audio.sfx('imune');
      B.stats.immuneHits++;
      return;
    }
    if (o.hp <= 0) return;
    if (o.sleeping > 0 && o.hp - S.WHIP_DMG > 0) {
      FF.Combat.damage(o, S.WHIP_DMG);
      B.stats.whipDamage += S.WHIP_DMG;
      o.flash = 5;
      B.onHit(f, o, S.WHIP_DMG);
      return;
    }
    if (o.sleeping > 0) o.sleeping = 0;
    // cada chicotada causa exatamente 4 de dano (sem escala, não dá para defender)
    FF.Combat.damage(o, S.WHIP_DMG);
    B.stats.whipDamage += S.WHIP_DMG;
    o.comboHits++;
    o.comboDmg += S.WHIP_DMG;
    o.face = 'hurt';
    o.flash = 5;
    o.gainMeter(3);
    o.hitstop = last ? 12 : 6;
    B.fx.spark(px, py, -dir, '#FFE7A3', last ? 18 : 10, last ? 1.4 : 1);
    B.onHit(f, o, S.WHIP_DMG);
    if (last || o.hp <= 0) {
      o.setState('juggle', true);
      o.airborne = true;
      o.y = Math.min(o.y, -4);
      o.vy = -15;
      o.vx = dir * 14;
      o.juggleKD = true;
      o.juggleInvuln = true;
      o.juggleCount = FF.JUGGLE_LIMIT;
      B.message('SUPER COMBO', f.slot);
      if (o.hp <= 0) B.rounds.onKO(o, f);
    } else {
      o.setState('hitstun', true);
      o.hitstun = 20;
      o.hitHigh = true;
      o.vx = -dir * 1.5; // puxado de leve pelo chicote
      if (o.airborne) o.vy = -4;
    }
  };

  // ---------------- RODOLFO: Saque de Tamboréu ----------------
  S.TB_BALLS = 8;
  S.TB_DMG = 3;
  S.TB_START = 30; // quadro do primeiro saque
  S.TB_EVERY = 9;  // intervalo entre saques
  const TB_TXT = ['SAQUE!', 'PING!', 'ACE!', 'NA LINHA!', 'BOLA DENTRO!', 'REQUEST!', 'TIMEOUT!', 'PONTO!'];
  S.tamboreuUpdate = function (f) {
    const B = f.battle;
    const t = f.superFrame++;
    const o = f.opp;
    f.vx = 0;
    if (!f.tb) f.tb = { balls: [], served: 0, hits: 0, swing: 0 };
    const tb = f.tb;
    if (tb.swing > 0) tb.swing--;
    if (t === 2) f.prop = 'racket'; // saca a raquete de tamboréu
    if (t === 4) {
      f.face = 'shout';
      f.say(f.def.lines.super);
      B.message('SAQUE DE TAMBORÉU!', f.slot, 'callout');
      FF.Audio.sfx('whooshH');
    }
    if (t === 8) B.darkT = 30;
    // saques em sequência, cada bolinha mira onde o rival está agora
    if (t >= S.TB_START && tb.served < S.TB_BALLS && (t - S.TB_START) % S.TB_EVERY === 0) {
      const dir = Math.sign(o.x - f.x) || f.facing;
      f.facing = dir;
      const hx = f.x + dir * f.def.width * 0.9;
      const hy = f.y - f.def.height * 0.72;
      const tx = o.x, ty = o.y - o.def.height * (0.45 + (tb.served % 3) * 0.12);
      const dist = Math.max(1, Math.hypot(tx - hx, ty - hy));
      const sp = 34;
      tb.balls.push({ x: hx, y: hy, vx: ((tx - hx) / dist) * sp, vy: ((ty - hy) / dist) * sp - 3, life: 70, spin: 0, trail: [] });
      tb.served++;
      tb.swing = 7;
      FF.Audio.sfx('pock');
      FF.Audio.sfx('whoosh');
    }
    // bolinhas em voo
    for (const b of tb.balls) {
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > 6) b.trail.shift();
      b.x += b.vx;
      b.y += b.vy;
      b.vy += 0.35;
      b.spin += 0.5;
      b.life--;
      if (b.y > -16) {
        // quicou no chão: some com poeira
        b.life = 0;
        B.fx.dust(b.x, 0, 2);
      }
      if (b.life > 0 && !o.isInvulnerable() && o.state !== 'thrown') {
        const box = { x: b.x - 26, y: b.y - 26, w: 52, h: 52 };
        if (FF.Col.hurtboxes(o).some((h) => FF.Col.overlap(box, h))) {
          b.life = 0;
          S.tbHit(f, o, b);
        }
      }
      if (b.x < -200 || b.x > FF.STAGE_W + 200) b.life = 0;
    }
    tb.balls = tb.balls.filter((b) => b.life > 0);
    const end = S.TB_START + S.TB_EVERY * (S.TB_BALLS - 1) + 26;
    if (t >= end && tb.balls.length === 0) {
      f.tb = null;
      f.prop = null;
      f.face = 'normal';
      f.superActive = false;
      f.superInvuln = false;
      f.setState('idle', true);
    }
  };
  S.tbHit = function (f, o, b) {
    const B = f.battle;
    const tb = f.tb;
    tb.hits++;
    B.stats.ballHits = (B.stats.ballHits || 0) + 1;
    const last = tb.served >= S.TB_BALLS && tb.balls.filter((x) => x.life > 0).length === 0;
    const dir = Math.sign(b.vx) || f.facing;
    FF.Audio.sfx('punchM');
    B.cam.shake(last ? 16 : 6);
    B.fx.text(b.x + ((tb.hits % 3) - 1) * 60, b.y - 60 - (tb.hits % 3) * 38, TB_TXT[(tb.hits - 1) % TB_TXT.length], '#E3F27A', 34, 24);
    if (o.tadalas > 0) {
      B.fx.text(b.x, b.y - 30, 'IMUNE', '#FFC531', 40, 40);
      FF.Audio.sfx('imune');
      B.stats.immuneHits++;
      return;
    }
    if (o.hp <= 0) return;
    if (o.sleeping > 0 && o.hp - S.TB_DMG > 0) {
      FF.Combat.damage(o, S.TB_DMG);
      B.stats.ballDamage = (B.stats.ballDamage || 0) + S.TB_DMG;
      o.flash = 5;
      B.onHit(f, o, S.TB_DMG);
      return;
    }
    if (o.sleeping > 0) o.sleeping = 0;
    // cada bolinha causa exatamente 3 de dano (sem escala, não dá para defender)
    FF.Combat.damage(o, S.TB_DMG);
    B.stats.ballDamage = (B.stats.ballDamage || 0) + S.TB_DMG;
    o.comboHits++;
    o.comboDmg += S.TB_DMG;
    o.face = 'hurt';
    o.flash = 5;
    o.gainMeter(2);
    o.hitstop = last ? 12 : 5;
    B.fx.spark(b.x, b.y, -dir, '#E3F27A', last ? 18 : 9, last ? 1.4 : 0.9);
    B.onHit(f, o, S.TB_DMG);
    if (last || o.hp <= 0) {
      o.setState('juggle', true);
      o.airborne = true;
      o.y = Math.min(o.y, -4);
      o.vy = -14;
      o.vx = dir * 13;
      o.juggleKD = true;
      o.juggleInvuln = true;
      o.juggleCount = FF.JUGGLE_LIMIT;
      B.message('SUPER COMBO', f.slot);
      if (o.hp <= 0) B.rounds.onKO(o, f);
    } else {
      o.setState('hitstun', true);
      o.hitstun = 16;
      o.hitHigh = b.y < o.y - o.def.height * 0.6;
      o.vx = dir * 2.5;
      if (o.airborne) o.vy = -3;
    }
  };
  // bolinha de tamboréu (verde-limão com a costura branca)
  S.drawTBall = function (ctx, x, y, r, spin) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(spin || 0);
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
    g.addColorStop(0, '#F4FF8A');
    g.addColorStop(0.7, '#CDE63A');
    g.addColorStop(1, '#9BB51E');
    ctx.fillStyle = g;
    ctx.strokeStyle = '#1A1033';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = Math.max(2, r * 0.14);
    ctx.beginPath();
    ctx.arc(-r * 1.05, 0, r * 0.8, -0.95, 0.95);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(r * 1.05, 0, r * 0.8, Math.PI - 0.95, Math.PI + 0.95);
    ctx.stroke();
    ctx.restore();
  };
  S.drawTamboreu = function (ctx, f, time) {
    const tb = f.tb;
    if (!tb) return;
    for (const b of tb.balls) {
      b.trail.forEach((p, i) => {
        ctx.globalAlpha = ((i + 1) / b.trail.length) * 0.35;
        S.drawTBall(ctx, p.x, p.y, 14 + i, b.spin);
      });
      ctx.globalAlpha = 1;
      S.drawTBall(ctx, b.x, b.y, 22, b.spin);
    }
  };

  // ---------------- MARCUS: Rolamento ----------------
  S.ROLL_HITS = 3;
  S.ROLL_DMG = 8;
  S.rolamentoUpdate = function (f) {
    const B = f.battle;
    const t = f.superFrame++;
    const o = f.opp;
    if (t === 4) {
      f.face = 'shout';
      f.say(f.def.lines.super);
      B.message('ROLAMENTO!', f.slot, 'callout');
    }
    if (t === 8) B.darkT = 40;
    if (t >= 10 && t < 40 && t % 3 === 0) B.fx.dust(f.x, 0, 3);
    // a barra "compila" antes de sair rolando
    if (t === 12) B.fx.text(f.x, f.y - f.def.height - 40, 'COMPILANDO...', '#9EC1FF', 34, 26);
    if (t === 36) B.fx.text(f.x, f.y - f.def.height - 40, 'BUILD OK ✓', '#7CFF8A', 40, 40);
    if (t === 18) {
      // encolhe e vira bola, girando no lugar para "carregar"
      f.rolling = true;
      FF.Audio.sfx('dash');
    }
    if (t < 40) {
      f.vx = 0;
      return;
    }
    if (t === 40) {
      f.rollPhase = 'roll';
      f.rollHits = 0;
      f.rollT = 0;
      f.rollCd = 0;
      f.rollDir = Math.sign(o.x - f.x) || f.facing;
      f.face = 'normal';
      FF.Audio.sfx('wave');
      B.cam.shake(10);
    }
    if (f.rollPhase === 'roll') {
      f.rollT++;
      if (f.rollCd > 0) {
        // quica para trás depois da pancada
        f.rollCd--;
        f.vx = -f.rollDir * 14;
        if (FF.Combat.atWall(f)) {
          f.rollCd = 0;
          B.cam.shake(8);
          FF.Audio.sfx('land');
        }
      } else {
        // sai rolando pra cima do adversário
        f.rollDir = Math.sign(o.x - f.x) || f.rollDir;
        f.vx = f.rollDir * 30;
      }
      if (B.time % 2 === 0) B.fx.dust(f.x - f.vx * 2, 0, 1, -Math.sign(f.vx));
      if (f.rollCd === 0 && !o.isInvulnerable() && o.state !== 'thrown') {
        const R = f.ballR || 100;
        const box = { x: f.x - R, y: -2 * R, w: 2 * R, h: 2 * R };
        if (FF.Col.hurtboxes(o).some((h) => FF.Col.overlap(box, h))) S.rollHit(f, o);
      }
      if (f.rollHits >= S.ROLL_HITS || f.rollT > 260) {
        f.rollPhase = 'uncurl';
        f.rolling = false;
        f.rollT = 0;
      }
      return;
    }
    if (f.rollPhase === 'uncurl') {
      f.rollT++;
      f.vx *= 0.8;
      if (f.rollT >= 14) {
        f.rollPhase = null;
        f.superActive = false;
        f.superInvuln = false;
        f.setState('idle', true);
      }
    }
  };
  S.rollHit = function (f, o) {
    const B = f.battle;
    f.rollHits++;
    B.stats.rollHits++;
    const last = f.rollHits >= S.ROLL_HITS;
    f.rollCd = last ? 30 : 16;
    const px = (f.x + o.x) / 2, py = o.y - o.def.height * 0.45;
    B.cam.shake(last ? 22 : 12);
    FF.Audio.sfx('punchH');
    FF.Audio.sfx('kickH');
    if (o.tadalas > 0) {
      B.fx.text(px, py - 40, 'IMUNE', '#FFC531', 44, 40);
      FF.Audio.sfx('imune');
      B.stats.immuneHits++;
      return;
    }
    if (o.hp <= 0) return;
    if (o.sleeping > 0 && o.hp - S.ROLL_DMG > 0) {
      FF.Combat.damage(o, S.ROLL_DMG);
      B.stats.rollDamage += S.ROLL_DMG;
      o.flash = 5;
      B.onHit(f, o, S.ROLL_DMG);
      return;
    }
    if (o.sleeping > 0) o.sleeping = 0;
    // cada pancada causa exatamente 8 de dano (inbloqueável, sem escala)
    FF.Combat.damage(o, S.ROLL_DMG);
    B.stats.rollDamage += S.ROLL_DMG;
    o.comboHits++;
    o.comboDmg += S.ROLL_DMG;
    o.face = 'hurt';
    o.flash = 5;
    o.gainMeter(3);
    o.hitstop = last ? 14 : 8;
    B.fx.spark(px, py, f.rollDir, last ? '#FFC531' : '#9EC1FF', last ? 22 : 14, last ? 1.6 : 1.2);
    B.fx.text(px, py - 70, ['COMMIT!', 'PUSH!', 'DEPLOY!'][f.rollHits - 1] || 'PUSH!', '#F3F6FF', 50, 40);
    B.onHit(f, o, S.ROLL_DMG);
    if (last || o.hp <= 0) {
      o.setState('juggle', true);
      o.airborne = true;
      o.y = Math.min(o.y, -4);
      o.vy = -18;
      o.vx = f.rollDir * 20;
      o.juggleKD = true;
      o.juggleInvuln = true;
      o.juggleCount = FF.JUGGLE_LIMIT;
      B.message('SUPER COMBO', f.slot);
      if (o.hp <= 0) B.rounds.onKO(o, f);
    } else {
      o.setState('hitstun', true);
      o.hitstun = 28;
      o.hitHigh = false;
      o.vx = f.rollDir * 10;
      if (o.airborne) o.vy = -6;
    }
  };

  // ---------------- JAILSON: Tester Culposo ----------------
  S.TESTER_HEAL = 25;
  S.TESTER_SLEEP = 240; // 4 s
  S.testerUpdate = function (f) {
    const B = f.battle;
    const t = f.superFrame++;
    f.vx = 0;
    if (t === 2) {
      // 1–3. vai abrir uma HU: pose concentrada e o cartão da HU aparece
      f.huT = 1;
      FF.Audio.sfx('laptop');
      f.face = 'normal';
    }
    if (t === 6) {
      f.say(f.def.lines.super);
      B.message('TESTER CULPOSO!', f.slot, 'callout');
    }
    if (t === 8) B.darkT = 55;
    if (t === 40) {
      // 4. ... e pega no sono
      f.face = 'yawn';
      FF.Audio.sfx('yawn');
    }
    if (t === 58) {
      f.face = 'sleep';
      f.sleeping = S.TESTER_SLEEP;
      f.healed = 0;
      f.superInvuln = false;
      f.huT = 0;
      B.stats.testerActivations++;
    }
    if (f.sleeping > 0) {
      // 5. recupera vida gradualmente enquanto dorme
      const step = S.TESTER_HEAL / S.TESTER_SLEEP;
      const gain = Math.min(step, f.def.hp - f.hp);
      f.hp += Math.max(0, gain);
      f.healed += step;
      B.stats.testerHealed += Math.max(0, gain);
      B.stats.sleepFrames++;
      if (f.sleeping % 18 === 0) B.fx.text(f.x - f.facing * 20 + Math.sin(f.sleeping) * 20, f.y - 120, 'Z', '#C4F59E', 30 + (f.sleeping % 54) / 3, 60, { vy: -2.4 });
      if (f.sleeping % 40 === 0) {
        B.fx.text(f.x + f.facing * 40, f.y - 170, '+' + Math.round(step * 40), '#7CFF8A', 34, 40);
        FF.Audio.sfx('snore', 0.7);
      }
      if (--f.sleeping === 0) {
        f.superWake = 26;
        f.face = 'yawn';
        B.fx.text(f.x, f.y - f.def.height - 40, 'ACORDOU!', '#F3F6FF', 36, 50);
      }
      return;
    }
    if (f.superWake > 0) {
      // 8. acorda e volta ao combate
      if (--f.superWake === 0) {
        f.superActive = false;
        f.face = 'normal';
        f.setState('idle', true);
      }
    }
  };

  // ---------------- THIAGO: Hora da Fumada ----------------
  S.FUMADA_FRAMES = 480; // 8 s
  S.fumadaUpdate = function (f) {
    const B = f.battle;
    const t = f.superFrame++;
    f.vx = 0;
    if (t === 6) B.darkT = 60;
    if (t === 10) {
      f.face = 'drag';
      FF.Audio.sfx('inhale');
    }
    if (t === 16) {
      f.say(f.def.lines.super); // "Hora da fumada"
      B.message('HORA DA FUMADA', f.slot, 'callout');
    }
    if (t >= 34 && t < 60 && t % 2 === 0) {
      const hp = f.emberPos || { x: f.x + f.facing * 40, y: f.y - f.def.height + 30 };
      for (let i = 0; i < 3; i++) B.fx.smoke(hp.x + f.facing * U.rand(0, 60), hp.y + U.rand(-20, 20), 1.6, f.facing);
    }
    if (t === 34) {
      f.face = 'normal';
      FF.Audio.sfx('exhale');
      B.smokeT = S.FUMADA_FRAMES + 60;
      B.cam.shake(8);
    }
    if (t >= 64) {
      f.fumada = S.FUMADA_FRAMES;
      B.stats.fumadaActivations++;
      B.stats.fumadaFrames = 0;
      B.stats.fumadaLoss = 0;
      f.superInvuln = false;
      f.setState('idle', true);
      B.fx.text(f.x, f.y - f.def.height - 60, '+10 FORÇA', '#FFC531', 44, 60);
    }
  };
  S.endFumada = function (f) {
    f.superActive = false;
    f.battle.fx.text(f.x, f.y - f.def.height - 60, 'EFEITO PASSOU', '#F3F6FF', 34, 60);
  };

  // ---------------- ANDINHO: Cladiio AI ----------------
  S.cladiioUpdate = function (f) {
    const B = f.battle;
    const t = f.superFrame++;
    f.vx = 0;
    if (t === 2) {
      f.prop = 'laptop';             // 1. retira o notebook
      FF.Audio.sfx('laptop');
    }
    if (t === 8) B.darkT = 90;       // 2. tela escurece
    if (t >= 14 && t < 70) {         // 3. digita rapidamente
      if (t % 3 === 0) FF.Audio.sfx('type', 0.8);
      if (t % 2 === 0) B.fx.code(f.x + f.facing * 30, f.y - 230, 1);
    }
    if (t === 22) {                  // 4. "CLADIIO, EXECUTA!"
      f.face = 'shout';
      f.say(f.def.lines.super);
      B.message('CLADIIO, EXECUTA!', f.slot, 'callout');
    }
    if (t === 50) {                  // 5. Cladiio surge atrás dele
      B.stands.push(new Cladiio(f));
      FF.Audio.sfx('cladiio');
      B.fx.code(f.x - f.facing * 90, f.y - 260, 26);
      B.fx.ring(f.x - f.facing * 90, -220, '#9B6BFF', 260, 10);
    }
    if (t === 80) {
      f.superInvuln = false;
      f.face = 'normal';
    }
    const stand = B.standOf(f);
    // 9. Cladiio some e Andinho guarda o notebook
    if (t > 60 && !stand) {
      f.superStow++;
      if (f.superStow >= 14) {
        f.prop = null;
        f.superActive = false;
        f.superInvuln = false;
        f.setState('idle', true);
      }
    }
  };

  class Cladiio {
    constructor(owner) {
      this.owner = owner;
      this.target = owner.opp;
      this.facing = owner.facing;
      this.x = owner.x - owner.facing * 100;
      this.y = owner.y;
      this.alpha = 0;
      this.phase = 'emerge';
      this.t = 0;
      this.strikes = 0;
      this.landed = 0;
      this.wait = 0;
      this.striking = false;
      this.punchExt = 0;
      this.done = false;
      this.kw = ['IF!', 'FOR!', 'AWAIT!', 'PUSH!', 'RETURN;'];
    }
    canHit() {
      const s = this.target.state;
      return !['knockdown', 'wakeup', 'thrown', 'intro', 'win', 'lose'].includes(s);
    }
    update(B) {
      this.t++;
      const tg = this.target;
      const side = Math.sign(tg.x - this.x) || this.facing;
      switch (this.phase) {
        case 'emerge':
          this.alpha = Math.min(1, this.alpha + 0.05);
          this.y = this.owner.y;
          if (!B.freeze && this.alpha >= 1) {
            this.phase = 'dash';
            this.t = 0;
            FF.Audio.sfx('dash');
          }
          break;
        case 'dash': {
          // 6. avança contra o adversário
          this.facing = side;
          const tx = tg.x - side * 150;
          this.x += U.clamp(tx - this.x, -44, 44);
          this.y += (tg.y - this.y) * 0.3;
          if (this.t % 2 === 0) B.fx.code(this.x, this.y - 200, 1);
          if (Math.abs(tx - this.x) < 8 || this.t > 40) {
            this.phase = 'strike';
            this.t = 0;
          }
          break;
        }
        case 'strike': {
          this.facing = side;
          const tx = tg.x - side * 150;
          this.x += (tx - this.x) * 0.5;
          this.y += (tg.y - this.y) * 0.3;
          if (!this.canHit() && this.wait < 70) {
            this.wait++;
            this.t = 0;
            this.striking = false;
            break;
          }
          // 5 golpes consecutivos (o último com mais preparo)
          const schedule = [4, 14, 24, 34, 50];
          this.striking = true;
          const next = schedule[this.strikes];
          const k = this.t - (next - 6);
          this.punchExt = U.clamp(k / 6, 0, 1);
          if (this.t === next) this.strike(B, this.strikes);
          if (this.strikes >= S.CLADIIO_HITS && this.t > 62) {
            this.phase = 'vanish';
            this.t = 0;
            this.striking = false;
          }
          break;
        }
        case 'vanish':
          this.alpha -= 1 / 18;
          if (this.t % 2 === 0) B.fx.code(this.x, this.y - 200, 2);
          if (this.alpha <= 0) {
            this.alpha = 0;
            this.done = true;
          }
          break;
      }
    }
    strike(B, i) {
      const tg = this.target;
      const last = i === S.CLADIIO_HITS - 1;
      this.strikes++;
      B.stats.cladiioStrikes++;
      const px = tg.x - this.facing * 30;
      const py = tg.y - tg.def.height * 0.6;
      FF.Audio.sfx('cladiioHit');
      B.fx.text(this.x + this.facing * 120, this.y - 380 - i * 8, this.kw[i], '#4DF3E8', 46, 40);
      B.fx.code(px, py, 6);
      B.cam.shake(last ? 22 : 9);
      // Marcelão invulnerável: golpes não causam dano nem interrompem
      if (tg.tadalas > 0) {
        B.fx.text(px, py - 40, 'IMUNE', '#FFC531', 44, 40);
        B.fx.spark(px, py, this.facing, '#FFC531', 8, 1);
        FF.Audio.sfx('imune');
        B.stats.immuneHits++;
        return;
      }
      if (!this.canHit() || tg.hp <= 0) return;
      if (tg.sleeping > 0 && tg.hp - S.CLADIIO_DMG > 0) {
        FF.Combat.damage(tg, S.CLADIIO_DMG);
        this.landed++;
        B.stats.cladiioDamage += S.CLADIIO_DMG;
        tg.flash = 5;
        B.fx.spark(px, py, this.facing, '#B9A6FF', 10, 1);
        B.onHit(this.owner, tg, S.CLADIIO_DMG);
        return;
      }
      if (tg.sleeping > 0) tg.sleeping = 0;
      // 7. cada golpe causa exatamente 6 de dano (inbloqueável, sem escala)
      FF.Combat.damage(tg, S.CLADIIO_DMG);
      this.landed++;
      B.stats.cladiioDamage += S.CLADIIO_DMG;
      tg.comboHits++;
      tg.comboDmg += S.CLADIIO_DMG;
      tg.face = 'hurt';
      tg.flash = 5;
      tg.gainMeter(3);
      tg.hitstop = last ? 14 : 7;
      B.fx.spark(px, py, this.facing, last ? '#FFC531' : '#B9A6FF', last ? 22 : 10, last ? 1.6 : 1);
      B.fx.flash = last ? 6 : 2;
      B.onHit(this.owner, tg, S.CLADIIO_DMG);
      if (last || tg.hp <= 0) {
        // 8. o último golpe arremessa o adversário para trás
        tg.setState('juggle', true);
        tg.airborne = true;
        tg.y = Math.min(tg.y, -4);
        tg.vy = -17;
        tg.vx = this.facing * 22;
        tg.juggleKD = true;
        tg.juggleInvuln = true;
        tg.juggleCount = FF.JUGGLE_LIMIT;
        B.message('SUPER COMBO', this.owner.slot);
        if (tg.hp <= 0) B.rounds.onKO(tg, this.owner);
      } else {
        tg.setState('hitstun', true);
        tg.hitstun = 22;
        tg.hitHigh = true;
        tg.vx = this.facing * 2;
        if (tg.airborne) {
          tg.vy = -3;
          tg.floatT = 14;
        }
      }
    }
  }
  S.Cladiio = Cladiio;

  // ---------------- MARCELÃO: Modo Tadalas ----------------
  S.tadalasUpdate = function (f) {
    const B = f.battle;
    const t = f.superFrame++;
    f.vx = 0;
    // 1. interrompe a movimentação (t 0–10)
    if (t === 8) B.darkT = 80;
    if (t === 10) {
      f.prop = 'box';                // 2. embalagem fictícia de Tadalas
      FF.Audio.sfx('laptop');
    }
    if (t === 28) {
      f.prop = null;                 // 3. animação caricata de ativação
      f.face = 'shock';
      FF.Audio.sfx('gulp');
    }
    if (t > 28 && t < 50 && t % 3 === 0) {
      const hy = f.y - f.def.height + 40;
      B.fx.steam(f.x - 20, hy);
      B.fx.steam(f.x + 20, hy);
    }
    if (t === 36) {                  // 4. "AGORA NINGUÉM ME SEGURA!"
      f.face = 'shout';
      f.say(f.def.lines.super);
      B.message('AGORA NINGUÉM ME SEGURA!', f.slot, 'callout');
    }
    if (t === 52) {                  // 5–6. músculos + aura vermelha e dourada
      FF.Audio.sfx('tadalas');
      B.cam.shake(18);
      B.fx.ring(f.x, f.y - 200, '#FFC531', 380, 14);
      B.fx.ring(f.x, f.y - 200, '#E8323C', 280, 10);
    }
    if (t > 50) B.fx.aura(f.x, f.y, f.def.height);
    if (t >= 74) {
      // 7. invulnerabilidade total por exatamente 5 segundos
      f.tadalas = S.TADALAS_FRAMES;
      B.stats.tadalasActivations++;
      B.stats.tadalasFrames = 0;
      f.superInvuln = false;
      f.face = 'normal';
      f.setState('idle', true);
    }
  };

  S.endTadalas = function (f) {
    // 10. volta ao estado normal
    f.superActive = false;
    const B = f.battle;
    B.fx.text(f.x, f.y - f.def.height - 60, 'EFEITO ACABOU', '#F3F6FF', 34, 60);
    B.stats.tadalasEnded++;
  };

  // ---------------- agarrões ----------------
  S.beginThrow = function (a, d, hug) {
    const B = a.battle;
    const back = !hug && a.input.dir(a.facing) === 4;
    a.setState('throw', true);
    a.throwData = { victim: d, hug, back };
    a.vx = 0;
    d.setState('thrown', true);
    d.thrower = a;
    d.vx = d.vy = 0;
    d.airborne = false;
    d.y = 0;
    d.face = 'hurt';
    FF.Audio.sfx('throw', 0.6);
    B.stats.throws++;
    if (hug) B.fx.text(a.x, a.y - a.def.height - 50, 'ABRAÇO DE URSO!', '#E8323C', 44, 60);
  };

  S.throwUpdate = function (a) {
    const B = a.battle;
    const T = a.throwData;
    if (!T) return a.setState('idle', true);
    const d = T.victim;
    const t = a.stateFrame;
    const mult = a.strMul() * d.def.defMul;
    // escape de agarrão comum (U+J nos primeiros quadros)
    if (!T.hug && t < 7 && d.chord('lp', 'lk')) {
      a.throwData = null;
      FF.Combat.tech(a, d);
      return;
    }
    if (T.hug) {
      d.x = a.x + a.facing * (a.def.width * 0.45 + d.def.width * 0.2);
      d.y = -20;
      d.thrownRot = Math.sin(t * 0.6) * 6;
      if (t === 14 || t === 30 || t === 46) {
        const dmg = 5 * mult;
        FF.Combat.damage(d, dmg);
        d.comboHits++;
        d.comboDmg += dmg;
        d.gainMeter(3);
        a.hitstop = d.hitstop = 6;
        B.cam.shake(10);
        B.fx.spark(d.x, d.y - d.def.height * 0.55, -a.facing, '#FFC531', 10, 1);
        FF.Audio.sfx('punchH');
        B.onHit(a, d, dmg);
        if (d.hp <= 0) {
          release(a, d, 1, true);
          B.rounds.onKO(d, a);
          return;
        }
      }
      if (t >= 58) release(a, d, 1, false);
    } else {
      if (t < 13) {
        d.x = a.x + a.facing * (a.def.width * 0.55 + d.def.width * 0.3);
        d.y = -10 - t * 2;
        d.thrownRot = -t * 3;
      } else if (t === 13) {
        const dmg = 10 * mult;
        FF.Combat.damage(d, dmg);
        d.comboHits = 1;
        d.comboDmg = dmg;
        d.gainMeter(3);
        B.cam.shake(14);
        B.fx.flash = 3;
        FF.Audio.sfx('throw');
        B.fx.spark(d.x, d.y - 120, a.facing, '#FFFFFF', 12, 1.2);
        B.onHit(a, d, dmg);
        if (T.back) {
          d.x = a.x - a.facing * 90;
        }
        release(a, d, T.back ? -1 : 1, d.hp <= 0);
        if (d.hp <= 0) B.rounds.onKO(d, a);
      }
      if (t >= 26) {
        a.throwData = null;
        a.setState('idle', true);
      }
    }
  };
  function release(a, d, dirSign, ko) {
    d.thrownRot = 0;
    d.setState('juggle', true);
    d.airborne = true;
    d.y = Math.min(d.y, -6);
    d.vy = ko ? -15 : -12;
    d.vx = a.facing * dirSign * (ko ? 13 : 10);
    d.juggleKD = true;
    d.juggleInvuln = true;
    d.juggleCount = FF.JUGGLE_LIMIT;
    if (a.throwData && a.throwData.hug) {
      a.throwData = null;
      a.setState('idle', true);
    }
  }

  // ---------------- projéteis ----------------
  class Projectile {
    constructor(owner, s) {
      this.owner = owner;
      this.type = s.type;
      this.facing = owner.facing;
      this.x = owner.x + owner.facing * s.x;
      this.y = s.y;
      this.w = s.w;
      this.h = s.h;
      this.vx = s.speed * owner.facing;
      this.life = 160;
      this.t = 0;
      this.dead = false;
      this.hit = { dmg: s.dmg, level: s.level, height: s.height || 'mid', hitstun: 19, blockstun: 14, push: 10, hitstop: 8, stun: 7, sfx: s.type === 'wave' ? 'punchH' : 'punchM' };
    }
    box() {
      return { x: this.x - this.w / 2, y: this.y, w: this.w, h: this.h };
    }
    update(B) {
      this.t++;
      this.x += this.vx;
      if (--this.life <= 0 || this.x < -100 || this.x > FF.STAGE_W + 100) this.dead = true;
      if (this.type === 'code' && this.t % 2 === 0) B.fx.code(this.x - this.facing * 40, this.y + 30, 1);
      if (this.type === 'wave' && this.t % 2 === 0) B.fx.dust(this.x, 0, 1, this.facing);
      if (this.type === 'tire' && this.t % 3 === 0) B.fx.dust(this.x, 0, 1, -this.facing);
      if (this.type === 'smoke' && this.t % 2 === 0) B.fx.smoke(this.x - this.facing * 50, this.y + this.h / 2 + U.rand(-30, 30), 1, -this.facing);
    }
    draw(ctx, time) {
      ctx.save();
      ctx.translate(this.x, this.y + this.h / 2);
      ctx.scale(this.facing, 1);
      if (this.type === 'tball') {
        ctx.globalAlpha = 0.3;
        for (let i = 1; i <= 3; i++) S.drawTBall(ctx, -i * 26, Math.sin(this.t * 0.4 - i) * 3, 22 - i * 3, this.t * 0.5);
        ctx.globalAlpha = 1;
        S.drawTBall(ctx, 0, 0, 26, this.t * 0.5);
        ctx.scale(this.facing, 1);
        FF.text(ctx, 'ping 12ms', 0, -44, { size: 16, font: FF.FONT_UI, weight: '700', color: '#E3F27A', lw: 4 });
      } else if (this.type === 'hu') {
        ctx.rotate(Math.sin(time * 0.3) * 0.25);
        ctx.fillStyle = '#F3F6FF';
        ctx.strokeStyle = '#1A1033';
        ctx.lineWidth = 4;
        ctx.fillRect(-46, -34, 92, 68);
        ctx.strokeRect(-46, -34, 92, 68);
        ctx.fillStyle = '#3E7BD6';
        ctx.fillRect(-46, -34, 92, 18);
        ctx.scale(this.facing, 1);
        FF.text(ctx, 'HU-' + (1000 + ((this.t * 7) % 900)), 0, -25, { size: 13, color: '#FFFFFF', lw: 0 });
        ctx.fillStyle = '#8A8F9C';
        for (let i = 0; i < 3; i++) ctx.fillRect(-36, -6 + i * 12, 72 - i * 16, 5);
      } else if (this.type === 'tire') {
        ctx.save();
        ctx.rotate(time * 0.3);
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#1A1033';
        ctx.lineWidth = 16;
        ctx.beginPath();
        ctx.arc(0, 0, 34, 0.3, Math.PI * 1.85);
        ctx.stroke();
        ctx.strokeStyle = '#9EC1FF';
        ctx.lineWidth = 9;
        ctx.stroke();
        // ponta da seta do laço
        const a = Math.PI * 1.85;
        const tx = Math.cos(a) * 34, ty = Math.sin(a) * 34;
        ctx.fillStyle = '#9EC1FF';
        ctx.strokeStyle = '#1A1033';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(tx + 16, ty + 4);
        ctx.lineTo(tx - 4, ty - 14);
        ctx.lineTo(tx - 8, ty + 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        FF.text(ctx, '∞', 0, 2, { size: 30, color: '#E9F1FF', lw: 5 });
        FF.text(ctx, 'while(true)', 0, -56, { size: 16, font: FF.FONT_UI, weight: '700', color: '#9EC1FF', lw: 4 });
      } else if (this.type === 'bug') {
        const wob = Math.sin(time * 0.8) * 4;
        ctx.strokeStyle = '#1A1033';
        ctx.lineWidth = 4;
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(i * 14, 0);
          ctx.lineTo(i * 18 - 6, -30 + wob * i);
          ctx.moveTo(i * 14, 0);
          ctx.lineTo(i * 18 - 6, 30 - wob * i);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.ellipse(0, 0, 40, 26, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#E8323C';
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(40, 0, 14, 0, Math.PI * 2);
        ctx.fillStyle = '#1A1033';
        ctx.fill();
        ctx.fillStyle = '#1A1033';
        [[-14, -10], [8, -12], [-4, 10], [16, 8]].forEach((q) => {
          ctx.beginPath();
          ctx.arc(q[0], q[1], 5, 0, Math.PI * 2);
          ctx.fill();
        });
        FF.text(ctx, 'BUG', 0, -48, { size: 20, color: '#C4F59E', lw: 5 });
      } else if (this.type === 'smoke') {
        for (let i = 0; i < 7; i++) {
          const a = time * 0.05 + i;
          ctx.globalAlpha = 0.75;
          ctx.fillStyle = i % 2 ? '#E6E9F2' : '#C9CEDB';
          ctx.beginPath();
          ctx.arc(Math.cos(a) * 34 - i * 4, Math.sin(a * 1.3) * 22, 30 + (i % 3) * 8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      } else if (this.type === 'code') {
        const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 70);
        g.addColorStop(0, 'rgba(233,255,253,0.95)');
        g.addColorStop(0.4, 'rgba(77,243,232,0.6)');
        g.addColorStop(1, 'rgba(77,243,232,0)');
        ctx.fillStyle = g;
        ctx.fillRect(-80, -60, 160, 120);
        FF.text(ctx, '</>', 0, 2, { size: 46, color: '#E9FFFD', stroke: '#0F6E6A', lw: 7 });
        ctx.strokeStyle = 'rgba(77,243,232,0.7)';
        ctx.lineWidth = 3;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(-50 - i * 16, -18 + i * 12);
          ctx.lineTo(-90 - i * 22 - (time % 6) * 3, -18 + i * 12);
          ctx.stroke();
        }
      } else {
        const h = this.h;
        const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
        g.addColorStop(0, 'rgba(255,197,49,0)');
        g.addColorStop(0.5, 'rgba(255,197,49,0.85)');
        g.addColorStop(1, 'rgba(232,50,60,0.95)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-70, h / 2);
        ctx.quadraticCurveTo(-20, -h / 2 - 10 + Math.sin(time * 0.6) * 8, 50, h / 2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#FFF3C4';
        ctx.lineWidth = 4;
        ctx.stroke();
      }
      ctx.restore();
    }
  }
  S.Projectile = Projectile;

  S.spawnProjectile = function (f, s) {
    const B = f.battle;
    B.projectiles.push(new Projectile(f, s));
    FF.Audio.sfx(s.type === 'wave' ? 'wave' : s.type === 'tball' ? 'pock' : 'projectile');
    if (s.type === 'wave') {
      B.cam.shake(10);
      B.fx.dust(f.x + f.facing * 80, 0, 10);
    }
  };

  return S;
})();
