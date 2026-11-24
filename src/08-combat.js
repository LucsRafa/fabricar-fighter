// ============================================================
// MOTOR DE COMBATE — acertos, defesa, agarrões, dano, knockback,
// hitstop, contra-ataques, sistema de combos e anti-infinito
// ============================================================
FF.Combat = (function () {
  const U = FF.U;
  const Col = FF.Col;
  const METER = { light: 4, medium: 6, heavy: 8 };
  const MAXD = FF.W - 150; // distância máxima entre lutadores (cabem na tela)

  const C = {};

  C.step = function (B) {
    const [a, b] = B.f;
    C.separate(a, b);
    C.bounds(B);
    C.projectiles(B);
    // agarrões
    C.checkThrow(a, b);
    C.checkThrow(b, a);
    // golpes: detecta os dois lados antes de aplicar (permite trocas)
    const ha = C.findStrike(a, b);
    const hb = C.findStrike(b, a);
    if (ha) C.resolveStrike(a, b, ha);
    if (hb) C.resolveStrike(b, a, hb);
  };

  // ---------- empurrar caixas de corpo ----------
  C.separate = function (a, b) {
    if (a.state === 'thrown' || b.state === 'thrown') return;
    const pa = Col.pushbox(a), pb = Col.pushbox(b);
    if (!Col.overlap(pa, pb)) return;
    const ov = Math.min(pa.x + pa.w - pb.x, pb.x + pb.w - pa.x);
    let dir = Math.sign(a.x - b.x) || (a.facing > 0 ? -1 : 1);
    const minX = 70, maxX = FF.STAGE_W - 70;
    let ma = (ov / 2) * dir, mb = (-ov / 2) * dir;
    if ((a.x + ma < minX) || (a.x + ma > maxX)) { mb -= ma; ma = 0; }
    if ((b.x + mb < minX) || (b.x + mb > maxX)) { ma -= mb; mb = 0; }
    a.x += ma;
    b.x += mb;
  };

  C.bounds = function (B) {
    const minX = 70, maxX = FF.STAGE_W - 70;
    const [a, b] = B.f;
    for (const f of B.f) f.x = U.clamp(f.x, minX, maxX);
    const dist = Math.abs(a.x - b.x);
    if (dist > MAXD) {
      for (const f of B.f) {
        const o = f.opp;
        const away = Math.sign(f.x - o.x) === Math.sign(f.x - f.prevX) && f.x !== f.prevX;
        if (away || f.state === 'juggle') f.x = o.x + Math.sign(f.x - o.x) * MAXD;
      }
      if (Math.abs(a.x - b.x) > MAXD + 1) {
        const mid = (a.x + b.x) / 2;
        a.x = mid + Math.sign(a.x - mid) * MAXD / 2;
        b.x = mid + Math.sign(b.x - mid) * MAXD / 2;
      }
    }
  };
  C.atWall = (f) => f.x <= 72 || f.x >= FF.STAGE_W - 72;

  // ---------- projéteis ----------
  C.projectiles = function (B) {
    const ps = B.projectiles;
    for (const p of ps) p.update(B);
    // choque entre projéteis
    for (let i = 0; i < ps.length; i++)
      for (let j = i + 1; j < ps.length; j++) {
        const p = ps[i], q = ps[j];
        if (p.dead || q.dead || p.owner === q.owner) continue;
        if (Col.overlap(p.box(), q.box())) {
          p.dead = q.dead = true;
          const c = Col.impact(p.box(), q.box());
          B.fx.spark(c.x, c.y, 1, '#FFFFFF', 14, 1.2);
          B.fx.ring(c.x, c.y, '#FFC531', 160);
          FF.Audio.sfx('punchH');
        }
      }
    for (const p of ps) {
      if (p.dead) continue;
      const def = p.owner.opp;
      if (def.isInvulnerable()) continue;
      const pb = p.box();
      const hurt = Col.hurtboxes(def).find((h) => Col.overlap(pb, h));
      if (!hurt) continue;
      p.dead = true;
      const pt = Col.impact(pb, hurt);
      // Modo Debug absorve projétil
      if (def.state === 'attack' && def.move && def.move.counterWindow && def.curFrame >= def.move.counterWindow[0] && def.curFrame <= def.move.counterWindow[1]) {
        B.fx.code(pt.x, pt.y, 10);
        B.fx.text(pt.x, pt.y - 40, 'BUG CORRIGIDO', '#4DF3E8', 34, 50);
        continue;
      }
      C.applyHit(p.owner, def, p.hit, pt, { proj: true });
    }
    B.projectiles = ps.filter((p) => !p.dead);
  };

  // ---------- agarrões ----------
  C.checkThrow = function (att, def) {
    if (att.state !== 'attack' || !att.move) return;
    const m = att.move;
    if (m.kind !== 'throw' && m.kind !== 'cmdgrab') return;
    if (att.throwDone) return;
    const f = att.curFrame;
    if (f < m.startup || f > m.startup + 2) return;
    const dist = Math.abs(def.x - att.x) - FF.Chars[def.id].width * 0.5;
    const inFront = Math.sign(def.x - att.x) === att.facing || Math.abs(def.x - att.x) < 20;
    if (dist > m.range * 0.7 || !inFront) return;
    if (!def.isThrowable()) return;
    att.throwDone = true;
    const B = att.battle;
    if (def.tadalas > 0) {
      // Modo Tadalas: agarrão não faz efeito
      B.fx.text(def.x, def.y - def.def.height - 30, 'IMUNE', '#FFC531', 46, 50);
      FF.Audio.sfx('imune');
      att.hitstop = 8;
      return;
    }
    if (def.state === 'attack' && def.move && (def.move.kind === 'throw') && def.curFrame >= def.move.startup && def.curFrame <= def.move.startup + 2) {
      C.tech(att, def);
      return;
    }
    att.gainMeter(8);
    FF.Specials.beginThrow(att, def, m.kind === 'cmdgrab');
  };

  C.tech = function (a, b) {
    const B = a.battle;
    for (const f of [a, b]) {
      f.setState('blockstun', true);
      f.blockstun = 14;
      f.vx = -f.facing * 11;
      f.throwData = null;
    }
    B.fx.text((a.x + b.x) / 2, -360, 'ESCAPOU!', '#7FD8FF', 46, 50);
    FF.Audio.sfx('block');
  };

  // ---------- golpes ----------
  C.findStrike = function (att, def) {
    if (att.state !== 'attack' || !att.move || !att.move.hits.length) return null;
    if (def.isInvulnerable()) return null;
    const hbs = Col.hitboxes(att);
    if (!hbs.length) return null;
    const hurts = Col.hurtboxes(def);
    for (const hb of hbs) {
      if (att.hitIds.has(hb.idx)) continue;
      for (const hu of hurts) {
        if (Col.overlap(hb, hu)) return { hit: hb.hit, idx: hb.idx, pt: Col.impact(hb, hu), tag: hu.tag };
      }
    }
    return null;
  };

  C.resolveStrike = function (att, def, s) {
    att.hitIds.add(s.idx);
    const B = att.battle;
    // Modo Debug (contra-ataque do Andinho)
    if (def.state === 'attack' && def.move && def.move.counterWindow && def.curFrame >= def.move.counterWindow[0] && def.curFrame <= def.move.counterWindow[1]) {
      C.debugCounter(def, att, s.pt);
      return;
    }
    C.applyHit(att, def, s.hit, s.pt, { tag: s.tag });
  };

  C.canBlock = function (def, hit, opts) {
    if (opts && opts.unblockable) return false;
    const okState = def.isNeutral() || def.state === 'blockstun';
    if (!okState || def.airborne) return false;
    const d = def.input.dir(def.facing);
    // segura a direção oposta ao rival (considera de onde vem o golpe)
    const backOk = d === 4 || d === 1;
    if (!backOk) return false;
    if (hit.height === 'low' && d !== 1) return false;
    if (hit.height === 'overhead' && d === 1) return false;
    return true;
  };

  C.calcDamage = function (att, def, base, counter) {
    let dmg = base * att.strMul() * def.def.defMul;
    const n = def.comboHits; // golpes anteriores no combo
    const scale = n <= 1 ? 1 : Math.max(0.3, 1 - 0.1 * n);
    dmg *= scale;
    if (counter) dmg *= 1.2;
    return dmg;
  };

  // aplica um acerto (golpe, projétil ou golpe de especial)
  C.applyHit = function (att, def, hit, pt, opts) {
    const B = att.battle;
    opts = opts || {};
    att.hitConfirmed = att.hitConfirmed || !opts.proj;
    // invulnerabilidade do Modo Tadalas: nada de dano, nada de interrupção
    if (def.tadalas > 0) {
      if (!opts.proj) att.hitstop = Math.max(att.hitstop, 6);
      B.fx.text(pt.x, pt.y - 30, 'IMUNE', '#FFC531', 40, 40);
      B.fx.spark(pt.x, pt.y, att.facing, '#FFC531', 6, 0.7);
      FF.Audio.sfx('imune', 0.8);
      B.stats.immuneHits++;
      return 'immune';
    }
    // armadura (Ombrada / Soco Blindado)
    if (def.state === 'attack' && def.move && def.move.armor && def.armorLeft > 0 && def.curFrame >= def.move.armor[0] && def.curFrame <= def.move.armor[1]) {
      def.armorLeft--;
      const dmg = C.calcDamage(att, def, hit.dmg, false) * 0.5;
      C.damage(def, dmg);
      def.flash = 6;
      att.hitstop = def.hitstop = 9;
      B.fx.text(pt.x, pt.y - 20, 'BLINDADO', '#FFC531', 34, 40);
      B.fx.ring(pt.x, pt.y, '#FFC531', 120);
      FF.Audio.sfx('block');
      if (def.hp <= 0) B.rounds.onKO(def, att);
      return 'armor';
    }
    // Jailson dormindo (Tester Culposo): leva dano, mas não acorda nem é interrompido
    if (def.sleeping > 0) {
      const dmg = C.calcDamage(att, def, hit.dmg, false);
      if (def.hp - dmg > 0) {
        C.damage(def, dmg);
        def.flash = 5;
        if (!opts.proj) att.hitstop = Math.max(att.hitstop, hit.hitstop);
        att.gainMeter(METER[hit.level] || 4);
        B.fx.spark(pt.x, pt.y, att.facing, '#FFFFFF', 8, 0.9);
        B.fx.text(pt.x, pt.y - 40, 'Zzz...', '#C4F59E', 30, 36);
        FF.Audio.sfx(hit.sfx || 'punchM');
        B.onHit(att, def, dmg);
        return 'sleep';
      }
      def.sleeping = 0;
      def.superActive = false;
      def.face = 'hurt';
    }
    // defesa
    if (C.canBlock(def, hit, opts)) {
      const crouch = def.input.dir(def.facing) === 1;
      def.setState('blockstun', true);
      def.blockstun = hit.blockstun;
      def.crouchBlock = crouch;
      def.blocking = true;
      const dirP = Math.sign(def.x - att.x) || att.facing;
      def.vx = dirP * hit.push * 0.9;
      if (C.atWall(def) && !opts.proj) att.vx = -dirP * hit.push * 0.7;
      if (!opts.proj) att.hitstop = Math.max(att.hitstop, hit.hitstop - 2);
      def.hitstop = hit.hitstop - 2;
      if (opts.proj || (att.move && att.move.kind === 'special')) C.damage(def, 0.8, true);
      def.gainMeter(2);
      att.blockConfirmed = true;
      B.fx.blockSpark(pt.x, pt.y, att.facing);
      FF.Audio.sfx('block');
      B.stats.blocks++;
      return 'block';
    }
    // acerto
    const counter = def.state === 'attack' && def.move && def.curFrame < def.move.startup && def.move.kind !== 'super';
    const wasCombo = ['hitstun', 'juggle', 'dizzy', 'knockdown'].includes(def.state) || def.hitstun > 0 && def.state === 'hitstun';
    if (!wasCombo) {
      def.comboHits = 0;
      def.comboDmg = 0;
      def.comboMoves = [];
    }
    const dmg = C.calcDamage(att, def, hit.dmg, counter);
    C.damage(def, dmg);
    def.comboHits++;
    def.comboDmg += dmg;
    const mv = att.move ? att.move.name : 'proj';
    def.comboMoves.push(mv);
    const reps = def.comboMoves.filter((x) => x === mv).length;
    B.stats.hits++;
    // hitstun com decaimento (prevenção de combos infinitos)
    let hs = hit.hitstun + (counter ? 4 : 0) - Math.max(0, def.comboHits - 4);
    if (reps > 2) hs = Math.round(hs * 0.6);
    hs = Math.max(7, hs);
    const dirP = Math.sign(def.x - att.x) || att.facing;
    const wasAir = def.airborne || def.state === 'juggle';
    def.hitHigh = !(s_isLow(hit));
    def.crouchHit = def.isCrouching() && !wasAir;
    def.face = 'hurt';
    def.flash = 4;
    if (def.state === 'dizzy') def.stun = 0;
    else if (!def.dizzyUsed) def.stun += hit.stun || 0;

    if (wasAir) {
      if (def.state === 'juggle') def.juggleCount++;
      else def.juggleCount = FF.JUGGLE_LIMIT - 2;
      def.setState('juggle', true);
      def.airborne = true;
      def.vy = hit.launch ? -18 : -11;
      def.vx = dirP * (hit.kbBig ? 9 : 5);
      def.juggleKD = def.juggleKD || hit.level === 'heavy' || hit.knockdown || (att.move && att.move.kind === 'special');
      if (def.juggleCount >= FF.JUGGLE_LIMIT) def.juggleInvuln = true;
    } else if (hit.launch) {
      def.setState('juggle', true);
      def.airborne = true;
      def.y = -2;
      def.vy = -21;
      def.vx = dirP * 3;
      def.juggleCount = 1;
      def.juggleKD = true;
    } else if (hit.knockdown || def.hp <= 0) {
      def.setState('juggle', true);
      def.airborne = true;
      def.y = -2;
      def.vy = def.hp <= 0 ? -16 : -9;
      def.vx = dirP * (def.hp <= 0 ? 12 : 7);
      def.juggleKD = true;
      def.juggleCount = FF.JUGGLE_LIMIT;
      def.juggleInvuln = true;
    } else {
      def.setState('hitstun', true);
      def.hitstun = hs;
      let push = hit.push * (1 + Math.min(0.8, def.comboHits * 0.06)) * (att.def.stats.str >= 90 ? 1.15 : 1);
      if (hit.kbBig) push *= 1.6;
      def.vx = dirP * push;
      if (C.atWall(def) && !opts.proj) att.vx = -dirP * push * 0.8;
    }
    if (!opts.proj) att.hitstop = Math.max(att.hitstop, hit.hitstop);
    def.hitstop = hit.hitstop;
    // barra de especial
    att.gainMeter(METER[hit.level] || 4);
    def.gainMeter(3);
    // efeitos
    const heavy = hit.level === 'heavy';
    B.fx.spark(pt.x, pt.y, att.facing, heavy ? '#FFC531' : '#FFFFFF', heavy ? 16 : 9, heavy ? 1.3 : 0.9);
    if (counter) {
      B.fx.spark(pt.x, pt.y, att.facing, '#E8323C', 12, 1.4);
      B.message('COUNTER', att.slot);
      FF.Audio.sfx('counter');
    }
    B.cam.shake(heavy ? 14 : hit.level === 'medium' ? 7 : 3);
    if (heavy) B.fx.flash = 3;
    FF.Audio.sfx(hit.sfx || 'punchM');
    B.hype = Math.min(1, B.hype + (heavy ? 0.25 : 0.1));
    if (B.training) B.fx.text(pt.x, pt.y - 50, dmg.toFixed(1), '#F3F6FF', 28, 40);
    B.onHit(att, def, dmg);
    if (def.hp <= 0) B.rounds.onKO(def, att);
    else if (def.comboHits === 3 && U.chance(0.25) && !def.speech) def.say(def.def.lines.hit);
    return 'hit';
  };

  function s_isLow(hit) {
    return hit.height === 'low';
  }

  C.damage = function (def, dmg, chip) {
    const B = def.battle;
    if (B.training && B.trainingOpts.infiniteLife) {
      def.hp = Math.max(1, def.hp - dmg);
      return;
    }
    if (chip) def.hp = Math.max(1, def.hp - dmg);
    else def.hp = Math.max(0, def.hp - dmg);
  };

  // Modo Debug: absorve o golpe e devolve um contra-ataque
  C.debugCounter = function (andinho, att, pt) {
    const B = andinho.battle;
    att.hitstop = 16;
    const cs = FF.Chars.special(andinho.id, 'counterStrike', 'h');
    andinho.startMove(cs);
    andinho.invulnT = 20;
    B.message('COUNTER', andinho.slot);
    B.fx.code(pt.x, pt.y, 18);
    B.fx.text(andinho.x, andinho.y - andinho.def.height - 70, cs.name.toUpperCase(), andinho.def.look.trail, 50, 60);
    FF.Audio.sfx('counter');
    const hit = { dmg: 9, level: 'heavy', height: 'mid', hitstun: 24, push: 14, hitstop: 12, stun: 10, knockdown: true, sfx: 'punchH' };
    andinho.hitConfirmed = true;
    C.applyHit(andinho, att, hit, pt, { unblockable: true });
  };

  return C;
})();
