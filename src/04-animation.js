// ============================================================
// ANIMAÇÕES — esqueleto procedural, poses-chave por personagem,
// interpolação e desenho dos lutadores e do Cladiio
// ============================================================
FF.Anim = (function () {
  const D = Math.PI / 180;
  const U = FF.U;
  const dir = (a, l) => ({ x: Math.sin(a * D) * l, y: Math.cos(a * D) * l });
  const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });

  const KEYS = ['lean', 'head', 'fa1', 'fa2', 'ba1', 'ba2', 'fl1', 'fl2', 'bl1', 'bl2', 'rot'];

  // ---------- poses base ----------
  const BASE = {
    andinho: {
      stance: { lean: 6, head: 0, fa1: 50, fa2: 102, ba1: 34, ba2: 118, fl1: 22, fl2: -22, bl1: -20, bl2: -12, rot: 0 },
      crouch: { lean: 22, head: -6, fa1: 58, fa2: 100, ba1: 44, ba2: 112, fl1: 70, fl2: -110, bl1: -5, bl2: -95, rot: 0 },
      jump: { lean: 10, head: 0, fa1: 62, fa2: 92, ba1: 40, ba2: 110, fl1: 72, fl2: -112, bl1: 22, bl2: -100, rot: 0 },
    },
    marcelao: {
      stance: { lean: 10, head: -4, fa1: 38, fa2: 96, ba1: 24, ba2: 102, fl1: 26, fl2: -26, bl1: -26, bl2: -14, rot: 0 },
      crouch: { lean: 26, head: -8, fa1: 50, fa2: 96, ba1: 36, ba2: 104, fl1: 68, fl2: -108, bl1: -5, bl2: -95, rot: 0 },
      jump: { lean: 12, head: -4, fa1: 55, fa2: 90, ba1: 35, ba2: 104, fl1: 66, fl2: -104, bl1: 20, bl2: -96, rot: 0 },
    },
  };

  BASE.jailson = {
    stance: { lean: 4, head: -4, fa1: 58, fa2: 108, ba1: 40, ba2: 116, fl1: 20, fl2: -24, bl1: -18, bl2: -14, rot: 0 },
    crouch: BASE.andinho.crouch,
    jump: BASE.andinho.jump,
  };
  BASE.tom = {
    stance: { lean: 5, head: -2, fa1: 52, fa2: 104, ba1: 32, ba2: 112, fl1: 22, fl2: -20, bl1: -20, bl2: -12, rot: 0 },
    crouch: BASE.andinho.crouch,
    jump: BASE.andinho.jump,
  };
  BASE.marcus = {
    stance: { lean: 6, head: -2, fa1: 46, fa2: 100, ba1: 30, ba2: 108, fl1: 24, fl2: -22, bl1: -24, bl2: -12, rot: 0 },
    crouch: BASE.andinho.crouch,
    jump: BASE.andinho.jump,
  };
  BASE.thiago = {
    stance: { lean: 2, head: -6, fa1: 36, fa2: 98, ba1: 16, ba2: 72, fl1: 18, fl2: -16, bl1: -18, bl2: -10, rot: 0 },
    crouch: BASE.andinho.crouch,
    jump: BASE.andinho.jump,
  };

  // ---------- poses de golpes: preparo (wind) e extensão (ext) ----------
  const ATK = {
    jab: { base: 'stance', wind: { fa1: 70, fa2: 112 }, ext: { fa1: 92, fa2: 2, lean: 14 } },
    straight: { base: 'stance', wind: { fa1: 52, fa2: 122, lean: 0 }, ext: { fa1: 92, fa2: 0, lean: 24, fl1: 34, bl1: -36, ba1: 20, ba2: 84 } },
    hook: { base: 'stance', wind: { fa1: 38, fa2: 100, lean: -10, ba1: 62 }, ext: { fa1: 104, fa2: 26, lean: 28, fl1: 34, bl1: -34, ba1: 18, ba2: 80 } },
    hammer: { base: 'stance', wind: { fa1: 168, fa2: 22, lean: -12 }, ext: { fa1: 78, fa2: 4, lean: 32, fl1: 36, bl1: -36 } },
    kickLow: { base: 'stance', wind: { fl1: 42, fl2: -62 }, ext: { fl1: 72, fl2: -6, lean: -6, bl1: -14 } },
    kickMid: { base: 'stance', wind: { fl1: 62, fl2: -102, lean: -4 }, ext: { fl1: 96, fl2: -2, lean: -18, bl1: -10, bl2: -4 } },
    kickHigh: { base: 'stance', wind: { fl1: 78, fl2: -112, lean: -10 }, ext: { fl1: 132, fl2: -4, lean: -34, bl1: -8, bl2: -2, fa1: 30, ba1: -22, ba2: 60 } },
    cJab: { base: 'crouch', wind: { fa1: 70, fa2: 110 }, ext: { fa1: 90, fa2: 4, lean: 28 } },
    cPunch: { base: 'crouch', wind: { fa1: 52, fa2: 120 }, ext: { fa1: 88, fa2: 0, lean: 34 } },
    cUpper: { base: 'crouch', wind: { fa1: 22, fa2: 60, lean: 32 }, ext: { fa1: 172, fa2: 6, lean: 4, fl1: 38, fl2: -40, bl1: -22, bl2: -30 } },
    cKickLow: { base: 'crouch', wind: { fl1: 74, fl2: -100 }, ext: { fl1: 84, fl2: -8, lean: 10 } },
    cPoke: { base: 'crouch', wind: { fl1: 70, fl2: -110 }, ext: { fl1: 88, fl2: 0, lean: -4 } },
    sweep: { base: 'crouch', wind: { lean: 34, fl1: 60 }, ext: { fl1: 92, fl2: 0, lean: 32, fa1: 14, fa2: 30 } },
    airPunch: { base: 'jump', wind: { fa1: 70, fa2: 110 }, ext: { fa1: 56, fa2: 0, lean: 22 } },
    airHammer: { base: 'jump', wind: { fa1: 170, fa2: 12, lean: -8 }, ext: { fa1: 62, fa2: 0, lean: 30 } },
    airKick: { base: 'jump', wind: { fl1: 70, fl2: -110 }, ext: { fl1: 58, fl2: 0, bl2: -112, lean: -10 } },
    airKickH: { base: 'jump', wind: { fl1: 50, fl2: -110, lean: 4 }, ext: { fl1: 82, fl2: 0, bl1: -12, bl2: -96, lean: -22 } },
    throwTry: { base: 'stance', wind: { fa1: 70, fa2: 60 }, ext: { fa1: 90, fa2: 20, ba1: 86, ba2: 28, lean: 18 } },
    grabTry: { base: 'stance', wind: { fa1: 60, fa2: 60, ba1: 55, ba2: 60 }, ext: { fa1: 100, fa2: 40, ba1: 96, ba2: 40, lean: 16 } },
    cast: { base: 'stance', wind: { fa1: 22, fa2: 40, ba1: 12, ba2: 40, lean: -8 }, ext: { fa1: 90, fa2: 0, ba1: 86, ba2: 0, lean: 22, fl1: 34, bl1: -36 } },
    rising: { base: 'crouch', wind: { fa1: 30, fa2: 80, lean: 30 }, ext: { fa1: 176, fa2: 4, ba1: 30, ba2: 84, fl1: 32, fl2: -82, bl1: -10, bl2: -12, lean: -6 } },
    slide: { base: 'stance', wind: { lean: 10, fl1: 40 }, ext: { fl1: 86, fl2: 0, bl1: 30, bl2: -128, lean: -42, fa1: -30, fa2: 20, ba1: -40, ba2: 30 } },
    flurry: { base: 'stance', wind: { fa1: 60, fa2: 110 }, ext: { fa1: 92, fa2: 2, lean: 18 } },
    counterStance: { base: 'stance', wind: { fa1: 100, fa2: 140 }, ext: { lean: -8, fa1: 112, fa2: 140, ba1: 100, ba2: 150, fl1: 30, bl1: -30 } },
    counterStrike: { base: 'stance', wind: { fa1: 40, fa2: 120 }, ext: { fa1: 94, fa2: 0, lean: 30, fl1: 40, bl1: -42 } },
    slam: { base: 'stance', wind: { fa1: 176, fa2: 10, ba1: 170, ba2: 10, lean: -14 }, ext: { fa1: 30, fa2: 0, ba1: 24, ba2: 0, lean: 56, fl1: 50, fl2: -60, bl1: -30 } },
    shoulder: { base: 'stance', wind: { lean: 20, fa1: 20, fa2: 100 }, ext: { lean: 38, fa1: 18, fa2: 104, ba1: 8, ba2: 92, fl1: 40, fl2: -40, bl1: -42, bl2: -10 } },
    armorPunch: { base: 'stance', wind: { fa1: 20, fa2: 150, lean: -16, ba1: 62 }, ext: { fa1: 92, fa2: 0, lean: 32, fl1: 40, bl1: -42 } },
  };

  const P = {
    block: { lean: -6, fa1: 96, fa2: 126, ba1: 82, ba2: 136, fl1: 16, fl2: -16, bl1: -26, bl2: -14 },
    blockLow: { fa1: 96, fa2: 120, ba1: 84, ba2: 130 },
    hitHigh: { lean: -24, head: -26, fa1: 18, fa2: 40, ba1: -12, ba2: 34, fl1: 10, fl2: -10, bl1: -30, bl2: -8 },
    hitBody: { lean: 32, head: 18, fa1: 30, fa2: 60, ba1: 20, ba2: 50, fl1: 16, fl2: -24, bl1: -20, bl2: -10 },
    air: { rot: -30, lean: -16, head: -20, fa1: 150, fa2: 30, ba1: 170, ba2: 20, fl1: 40, fl2: -30, bl1: -10, bl2: -40 },
    down: { rot: -90, lean: 0, head: 6, fa1: 160, fa2: 8, ba1: 176, ba2: 0, fl1: 6, fl2: -4, bl1: -4, bl2: 0 },
    dizzy: { fa1: 12, fa2: 20, ba1: 6, ba2: 16 },
    winA: { lean: -4, head: -8, fa1: 150, fa2: 150, ba1: 18, ba2: 70, fl1: 14, fl2: -10, bl1: -16, bl2: -6 },
    winM: { lean: -2, head: -10, fa1: 96, fa2: 84, ba1: -96, ba2: -84, fl1: 24, fl2: -12, bl1: -24, bl2: -10 },
    lose: { lean: 38, head: 30, fa1: 6, fa2: 10, ba1: 0, ba2: 8, fl1: 14, fl2: -30, bl1: -12, bl2: -24 },
    laptop: { lean: 12, head: 10, fa1: 42, fa2: 72, ba1: 36, ba2: 76 },
    pill: { fa1: 22, fa2: 122, lean: 4 },
    gulp: { head: -32, fa1: 150, fa2: 168, lean: -10, ba1: 30, ba2: 60 },
    flex: { lean: -2, head: -14, fa1: 96, fa2: 84, ba1: -96, ba2: -84, fl1: 30, fl2: -20, bl1: -30, bl2: -10 },
    throwHold: { fa1: 96, fa2: 30, ba1: 90, ba2: 30, lean: 10 },
    throwToss: { fa1: 162, fa2: 10, ba1: 150, ba2: 12, lean: -22 },
    hug: { fa1: 86, fa2: 84, ba1: 80, ba2: 84, lean: -16 },
    introA: { fa1: 150, fa2: 150, ba1: 30, ba2: 100, lean: 0 },
    introTom: { fa1: 150, fa2: 150, ba1: 24, ba2: 96, lean: -2, head: -6 },
    winTom: { fa1: 92, fa2: 2, ba1: 30, ba2: 120, lean: 4, head: -6, fl1: 18, fl2: -10, bl1: -16, bl2: -6 },
    whipUp: { fa1: 166, fa2: 34, ba1: 30, ba2: 100, lean: -8, head: -6 },
    whipCrack: { fa1: 96, fa2: 0, ba1: 20, ba2: 90, lean: 22, fl1: 34, bl1: -36 },
    introK: { fa1: 20, fa2: 120, ba1: 15, ba2: 125, lean: -6, head: -8 },
    winK: { fa1: 165, fa2: 10, ba1: 160, ba2: 15, lean: -6, head: -14, fl1: 20, fl2: -10, bl1: -20, bl2: -8 },
    curl: { lean: 62, head: 34, fa1: 120, fa2: 140, ba1: 110, ba2: 140, fl1: 100, fl2: -140, bl1: 64, bl2: -130 },
    introJ: { fa1: 118, fa2: 100, ba1: 20, ba2: 60, lean: 16, head: 12 },
    winJ: { fa1: 150, fa2: 30, ba1: 20, ba2: 40, lean: -4, head: -8, fl1: 14, fl2: -10, bl1: -16, bl2: -6 },
    introT: { fa1: 40, fa2: 150, ba1: 10, ba2: 20, lean: -2, head: -10 },
    winT: { fa1: 72, fa2: 122, ba1: 70, ba2: 126, lean: -6, head: -12, fl1: 14, fl2: -8, bl1: -14, bl2: -6 },
    hu: { fa1: 72, fa2: 122, ba1: 50, ba2: 92, lean: 10, head: 14 },
    yawn: { fa1: 162, fa2: 12, ba1: 152, ba2: 22, lean: -10, head: -22 },
    sleep: { rot: -86, lean: 0, head: 8, fa1: 176, fa2: 150, ba1: 170, ba2: 150, fl1: 34, fl2: -46, bl1: 4, bl2: -2 },
    drag: { fa1: 40, fa2: 152, ba1: 12, ba2: 30, lean: -8, head: -18 },
    exhale: { fa1: 116, fa2: 24, ba1: 100, ba2: 30, lean: -14, head: -26 },
    introM: { fa1: 84, fa2: 100, ba1: 70, ba2: 104, lean: 6 },
  };

  function lerpPose(a, b, t) {
    const o = {};
    for (const k of KEYS) {
      const va = a[k] == null ? 0 : a[k];
      const vb = b[k] == null ? va : b[k];
      o[k] = va + (vb - va) * t;
    }
    return o;
  }
  const over = (a, b) => Object.assign({}, a, b);

  // ---------- pose atual do lutador ----------
  function pose(f) {
    const B = BASE[f.id];
    const st = f.state;
    const t = f.stateFrame;
    const fc = f.frameCount;
    let p;
    if (st === 'attack' && f.move) {
      const m = f.move;
      const a = ATK[m.anim] || ATK.jab;
      const base = f.airborne && a.base !== 'jump' ? B.jump : B[a.base] || B.stance;
      const wind = over(base, a.wind);
      let ext = over(base, a.ext);
      if (m.anim === 'flurry') {
        const alt = Math.floor(f.moveFrame / 4) % 2;
        if (alt) ext = over(ext, { fa1: 60, fa2: 110, ba1: 92, ba2: 4 });
      }
      if (m.anim === 'counterStrike') ext = over(ext, {});
      const fr = f.moveFrame;
      const hit0 = m.hits.length ? m.hits[0].f0 : m.startup;
      const hit1 = m.hits.length ? m.hits[m.hits.length - 1].f1 : m.startup + 5;
      if (fr < hit0) {
        const k = fr / Math.max(1, hit0);
        p = k < 0.6 ? lerpPose(base, wind, U.easeOut(k / 0.6)) : lerpPose(wind, ext, U.easeIn((k - 0.6) / 0.4));
      } else if (fr <= hit1 || m.untilLand) {
        p = ext;
        if (m.untilLand && f.vy > 4) p = lerpPose(ext, B.jump, 0.5);
      } else {
        const k = (fr - hit1) / Math.max(1, m.total - hit1);
        const back = f.airborne ? B.jump : m.anim.startsWith('c') || m.anim === 'sweep' ? B.crouch : B.stance;
        p = lerpPose(ext, back, U.easeInOut(U.clamp(k, 0, 1)));
      }
      if (m.anim === 'counterStance') p = lerpPose(p, ext, 1);
    } else {
      switch (st) {
        case 'walkF':
        case 'walkB': {
          const ph = f.walkPhase;
          const s = Math.sin(ph);
          p = over(B.stance, {
            fl1: B.stance.fl1 + s * 20,
            fl2: B.stance.fl2 - Math.max(0, Math.cos(ph)) * 26,
            bl1: B.stance.bl1 - s * 20,
            bl2: B.stance.bl2 - Math.max(0, -Math.cos(ph)) * 26,
            lean: B.stance.lean + (st === 'walkF' ? 4 : -4),
          });
          break;
        }
        case 'crouch':
        case 'crouchDown':
          p = f.blocking ? over(B.crouch, P.blockLow) : B.crouch;
          if (st === 'crouch' && t < 4) p = lerpPose(B.stance, p, t / 4);
          break;
        case 'jumpSquat':
          p = lerpPose(B.stance, B.crouch, 0.5);
          break;
        case 'air':
          p = f.vy < 0 ? B.jump : lerpPose(B.jump, over(B.stance, { fl1: 30, fl2: -20 }), U.clamp(f.vy / 20, 0, 1));
          if (f.jumpDir !== 0 && f.vy < 6) p = over(p, { rot: f.jumpDir * f.facing > 0 ? -(t * 14) % 360 : 0 });
          break;
        case 'land':
          p = lerpPose(B.crouch, B.stance, t / 4);
          break;
        case 'dashF':
          p = over(B.stance, { lean: 24, fl1: 40, fl2: -40, bl1: -40, bl2: -30, fa1: 30, fa2: 100, ba1: 10, ba2: 90 });
          break;
        case 'dashB':
          p = over(B.stance, { lean: -16, fl1: 30, fl2: -50, bl1: -10, bl2: -20 });
          break;
        case 'blockstun':
          p = f.crouchBlock ? over(B.crouch, P.blockLow) : over(B.stance, P.block);
          break;
        case 'hitstun':
          p = over(B.stance, f.hitHigh ? P.hitHigh : P.hitBody);
          if (f.crouchHit) p = over(B.crouch, { lean: -6, head: -24 });
          break;
        case 'juggle':
          p = over(B.stance, P.air);
          p.rot = U.clamp(-30 - (f.vy > 0 ? f.vy * 3 : 0), -85, -20);
          break;
        case 'knockdown':
          p = over(B.stance, P.down);
          break;
        case 'wakeup': {
          const k = t / 18;
          p = k < 0.5 ? lerpPose(over(B.stance, P.down), B.crouch, k * 2) : lerpPose(B.crouch, B.stance, (k - 0.5) * 2);
          break;
        }
        case 'dizzy':
          p = over(B.stance, P.dizzy);
          p.lean = 10 + Math.sin(fc * 0.12) * 14;
          p.head = Math.sin(fc * 0.12 + 1) * 18;
          break;
        case 'throw': {
          const m = f.throwData;
          if (m && m.hug) p = over(B.stance, P.hug);
          else p = t < 12 ? over(B.stance, P.throwHold) : lerpPose(over(B.stance, P.throwHold), over(B.stance, P.throwToss), U.clamp((t - 12) / 8, 0, 1));
          break;
        }
        case 'thrown':
          p = over(B.stance, P.hitHigh);
          p.rot = f.thrownRot || 0;
          break;
        case 'super':
          p = superPose(f, B);
          break;
        case 'win':
          p = over(B.stance, P[f.def.look.win] || P.winA);
          if (f.id === 'marcelao') p.lean += Math.sin(fc * 0.15) * 3;
          break;
        case 'lose':
          p = over(B.stance, P.lose);
          break;
        case 'intro': {
          const k = U.clamp(t / 60, 0, 1);
          const ip = over(B.stance, P[f.def.look.intro] || P.introA);
          p = k < 0.7 ? ip : lerpPose(ip, B.stance, (k - 0.7) / 0.3);
          break;
        }
        default: {
          // idle com respiração
          const br = Math.sin(fc * (f.def.heavy ? 0.07 : 0.11));
          p = over(B.stance, { lean: B.stance.lean + br * 2, fa1: B.stance.fa1 + br * 3, ba1: B.stance.ba1 + br * 2 });
          if (f.blocking) p = over(B.stance, P.block);
        }
      }
    }
    return p;
  }

  function superPose(f, B) {
    const t = f.superFrame;
    const sup = f.def.super;
    if (sup === 'tester') {
      const st = B.stance;
      if (f.sleeping > 0) {
        const s = over(st, P.sleep);
        s.fa2 += Math.sin(f.frameCount * 0.06) * 4;
        return s;
      }
      if (f.superWake > 0) return lerpPose(over(st, P.sleep), over(st, P.yawn), U.clamp(1 - f.superWake / 26, 0, 1));
      if (t < 12) return lerpPose(st, over(st, P.hu), t / 12);
      if (t < 40) {
        const h = over(st, P.hu);
        h.head += Math.sin(t * 0.5) * 3;
        return h;
      }
      if (t < 52) return lerpPose(over(st, P.hu), over(st, P.yawn), (t - 40) / 12);
      return lerpPose(over(st, P.yawn), over(st, P.sleep), U.clamp((t - 52) / 8, 0, 1));
    }
    if (sup === 'chicote') {
      if (f.whip && f.whip.lash > 0) return over(B.stance, P.whipCrack);
      return lerpPose(B.stance, over(B.stance, P.whipUp), U.clamp(t / 14, 0, 1));
    }
    if (sup === 'rolamento') {
      if (f.rollPhase === 'uncurl') return lerpPose(over(B.stance, P.curl), B.stance, U.clamp(f.rollT / 14, 0, 1));
      return lerpPose(B.stance, over(B.stance, P.curl), U.clamp(t / 18, 0, 1));
    }
    if (sup === 'fumada') {
      const st = B.stance;
      if (t < 8) return st;
      if (t < 34) {
        const d = over(st, P.drag);
        d.lean -= Math.min(6, (t - 8) * 0.3);
        return lerpPose(st, d, U.clamp((t - 8) / 8, 0, 1));
      }
      return lerpPose(over(st, P.drag), over(st, P.exhale), U.clamp((t - 34) / 10, 0, 1));
    }
    if (sup === 'cladiio') {
      if (t < 14) return lerpPose(B.stance, over(B.stance, P.laptop), t / 14);
      const typing = over(B.stance, P.laptop);
      typing.fa2 += Math.sin(t * 2.1) * 10;
      typing.ba2 += Math.cos(t * 2.4) * 10;
      if (f.superStow > 0) return lerpPose(typing, B.stance, 1 - f.superStow / 14);
      return typing;
    }
    if (t < 10) return B.stance;
    if (t < 28) return lerpPose(B.stance, over(B.stance, P.pill), (t - 10) / 18);
    if (t < 50) {
      const g = over(B.stance, P.gulp);
      g.lean += Math.sin(t * 1.7) * 6;
      return g;
    }
    return lerpPose(over(B.stance, P.gulp), over(B.stance, P.flex), U.clamp((t - 50) / 10, 0, 1));
  }

  // ---------- resolução do esqueleto ----------
  function solve(dims, p) {
    const hf = { x: dims.hipW * 0.25, y: 0 };
    const hb = { x: -dims.hipW * 0.25, y: 0 };
    const fk = add(hf, dir(p.fl1, dims.thigh));
    const ff = add(fk, dir(p.fl1 + p.fl2, dims.shin));
    const bk = add(hb, dir(p.bl1, dims.thigh));
    const bf = add(bk, dir(p.bl1 + p.bl2, dims.shin));
    const sp = 180 - p.lean;
    const hip = { x: 0, y: 0 };
    const neck = add(hip, dir(sp, dims.torso));
    const head = add(neck, dir(sp - p.head * 0.5, dims.neck + dims.head));
    const sf = add(neck, dir(sp + 180, 14));
    sf.x += 4;
    const sb = add(neck, dir(sp + 180, 16));
    sb.x -= 6;
    const ao = p.lean * 0.35;
    const fe = add(sf, dir(p.fa1 + ao, dims.upper));
    const fh = add(fe, dir(p.fa1 + ao + p.fa2, dims.fore));
    const be = add(sb, dir(p.ba1 + ao, dims.upper));
    const bh = add(be, dir(p.ba1 + ao + p.ba2, dims.fore));
    const J = { hip, hf, hb, fk, ff, bk, bf, neck, head, sf, sb, fe, fh, be, bh };
    J.ang = { sp, ff: p.fl1 + p.fl2, bf: p.bl1 + p.bl2, head: p.head };
    if (p.rot) {
      const r = p.rot * D;
      const c = Math.cos(r), s = Math.sin(r);
      for (const k in J) {
        if (k === 'ang') continue;
        const q = J[k];
        J[k] = { x: q.x * c - q.y * s, y: q.x * s + q.y * c };
      }
      J.ang.sp += -p.rot;
      J.ang.ff += -p.rot;
      J.ang.bf += -p.rot;
    }
    // ponto mais baixo (para apoiar no chão)
    let maxY = Math.max(J.ff.y, J.bf.y, J.fk.y, J.bk.y);
    if (p.rot) maxY = Math.max(maxY, J.head.y + dims.head * 0.9, J.neck.y + 18, J.hip.y + 20);
    J.low = maxY;
    return J;
  }

  const standCache = {};
  function standHeight(id) {
    if (standCache[id] == null) standCache[id] = solve(FF.Chars[id].dims, BASE[id].stance).low;
    return standCache[id];
  }

  // ---------- desenho ----------
  const OUT = '#1A1033';
  function seg(ctx, a, b, w, col) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = w + 7;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.stroke();
    if (w > 10) {
      const dx = b.x - a.x, dy = b.y - a.y;
      const L = Math.hypot(dx, dy) || 1;
      const ox = (-dy / L) * w * 0.22, oy = (dx / L) * w * 0.22;
      ctx.strokeStyle = 'rgba(255,255,255,0.16)';
      ctx.lineWidth = w * 0.28;
      ctx.beginPath();
      ctx.moveTo(a.x - ox, a.y - Math.abs(oy) - 1);
      ctx.lineTo(b.x - ox, b.y - Math.abs(oy) - 1);
      ctx.stroke();
    }
  }
  function blob(ctx, a, b, w, col) {
    // músculo (elipse ao longo do segmento)
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.ellipse(0, 0, len / 2 + w * 0.2, w / 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 3.5;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  function circle(ctx, p, r, col, lw) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = lw == null ? 3.5 : lw;
    ctx.stroke();
  }
  function mixHex(a, b, t) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t);
    const g = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t);
    const bl = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
  }

  function palette(f, override) {
    const def = FF.Chars[f.id];
    let c = Object.assign({}, def.colors, f.altColor ? def.alt : {});
    if (f.pump > 0) {
      c.skin = mixHex(c.skin, '#E0604A', f.pump * 0.45);
      c.skinShade = mixHex(c.skinShade, '#A8352A', f.pump * 0.45);
    }
    if (override) {
      const o = {};
      for (const k in c) o[k] = override;
      c = o;
    }
    return c;
  }

  function drawShoe(ctx, foot, ang, len, w, col, acc) {
    const d = dir(ang + 90, len);
    const tip = add(foot, d);
    const heel = add(foot, dir(ang - 90, len * 0.25));
    seg(ctx, heel, tip, w, col);
    ctx.strokeStyle = acc;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(heel.x + (tip.x - heel.x) * 0.3, heel.y + (tip.y - heel.y) * 0.3 + 2);
    ctx.lineTo(heel.x + (tip.x - heel.x) * 0.75, heel.y + (tip.y - heel.y) * 0.75 + 2);
    ctx.stroke();
  }

  function torsoPoly(J, chest, waist) {
    const s = { x: J.neck.x - J.hip.x, y: J.neck.y - J.hip.y };
    const L = Math.hypot(s.x, s.y) || 1;
    const px = -s.y / L, py = s.x / L; // perpendicular (frente)
    const fwd = px > 0 || (px === 0 && py < 0) ? 1 : -1;
    const q = (pt, w) => ({ x: pt.x + px * w * fwd, y: pt.y + py * w * fwd });
    return [q(J.hip, waist / 2), q(J.neck, chest / 2), q(J.neck, -chest / 2), q(J.hip, -waist / 2)];
  }
  function shadeTorso(ctx, pts) {
    const L = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    ctx.save();
    ctx.fillStyle = 'rgba(10,6,30,0.22)';
    ctx.beginPath();
    ctx.moveTo(pts[3].x, pts[3].y);
    ctx.lineTo(pts[2].x, pts[2].y);
    const a = L(pts[2], pts[1], 0.32), b = L(pts[3], pts[0], 0.32);
    ctx.lineTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.13)';
    const c1 = L(pts[0], pts[3], 0.1), c2 = L(pts[1], pts[2], 0.1), c3 = L(pts[1], pts[2], 0.24), c4 = L(pts[0], pts[3], 0.24);
    ctx.beginPath();
    ctx.moveTo(c1.x, c1.y); ctx.lineTo(c2.x, c2.y); ctx.lineTo(c3.x, c3.y); ctx.lineTo(c4.x, c4.y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  function poly(ctx, pts, col, lw) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.fill();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = lw == null ? 4 : lw;
    ctx.stroke();
  }

  function drawHeadAndinho(ctx, h, r, ang, c, face) {
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate((180 - ang) * D);
    // cabeça
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.92, r, 0, 0, Math.PI * 2);
    ctx.fillStyle = c.skin;
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 4;
    ctx.stroke();
    // orelha
    circle(ctx, { x: -r * 0.12, y: r * 0.05 }, r * 0.22, c.skinShade, 3);
    // cabelo curto espetado
    ctx.beginPath();
    ctx.moveTo(-r * 0.95, r * 0.05);
    ctx.lineTo(-r * 0.9, -r * 0.7);
    ctx.lineTo(-r * 0.55, -r * 1.12);
    ctx.lineTo(-r * 0.2, -r * 0.98);
    ctx.lineTo(r * 0.1, -r * 1.2);
    ctx.lineTo(r * 0.35, -r * 0.96);
    ctx.lineTo(r * 0.75, -r * 1.08);
    ctx.lineTo(r * 0.9, -r * 0.55);
    ctx.lineTo(r * 0.55, -r * 0.62);
    ctx.lineTo(r * 0.1, -r * 0.55);
    ctx.lineTo(-r * 0.5, -r * 0.3);
    ctx.lineTo(-r * 0.65, r * 0.1);
    ctx.closePath();
    ctx.fillStyle = c.hair;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.stroke();
    // cavanhaque
    ctx.beginPath();
    ctx.moveTo(r * 0.35, r * 0.62);
    ctx.lineTo(r * 0.78, r * 0.6);
    ctx.lineTo(r * 0.62, r * 1.05);
    ctx.lineTo(r * 0.45, r * 1.02);
    ctx.closePath();
    ctx.fillStyle = c.hair;
    ctx.fill();
    // boca
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (face === 'shout' || face === 'hurt') {
      ctx.ellipse(r * 0.66, r * 0.42, r * 0.16, r * 0.14, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#5A1020';
      ctx.fill();
      ctx.stroke();
    } else if (face === 'smug') {
      ctx.moveTo(r * 0.45, r * 0.45);
      ctx.quadraticCurveTo(r * 0.7, r * 0.55, r * 0.86, r * 0.32);
      ctx.stroke();
    } else {
      ctx.moveTo(r * 0.5, r * 0.45);
      ctx.lineTo(r * 0.82, r * 0.42);
      ctx.stroke();
    }
    // óculos
    ctx.fillStyle = 'rgba(77,243,232,0.28)';
    ctx.strokeStyle = '#0D0A1A';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.rect(r * 0.32, -r * 0.3, r * 0.56, r * 0.36);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(r * 0.32, -r * 0.18);
    ctx.lineTo(-r * 0.1, -r * 0.08);
    ctx.stroke();
    if (face === 'hurt') {
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(r * 0.5, -r * 0.22);
      ctx.lineTo(r * 0.7, -r * 0.02);
      ctx.moveTo(r * 0.7, -r * 0.22);
      ctx.lineTo(r * 0.5, -r * 0.02);
      ctx.stroke();
    } else {
      ctx.fillStyle = OUT;
      ctx.beginPath();
      ctx.arc(r * 0.64, -r * 0.12, r * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(r * 0.4, -r * 0.24);
    ctx.lineTo(r * 0.52, -r * 0.24);
    ctx.stroke();
    ctx.restore();
  }

  function drawHeadMarcelao(ctx, h, r, ang, c, face) {
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate((180 - ang) * D);
    // cabeça quadrada
    ctx.beginPath();
    const w = r * 0.95, hh = r * 1.02;
    ctx.moveTo(-w, -hh * 0.6);
    ctx.quadraticCurveTo(-w, -hh, -w * 0.4, -hh);
    ctx.lineTo(w * 0.55, -hh);
    ctx.quadraticCurveTo(w, -hh, w, -hh * 0.4);
    ctx.lineTo(w * 1.02, hh * 0.55);
    ctx.quadraticCurveTo(w * 0.9, hh * 1.02, w * 0.3, hh * 1.02);
    ctx.lineTo(-w * 0.5, hh * 0.9);
    ctx.quadraticCurveTo(-w, hh * 0.7, -w, 0);
    ctx.closePath();
    ctx.fillStyle = c.skin;
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 4;
    ctx.stroke();
    circle(ctx, { x: -r * 0.15, y: r * 0.05 }, r * 0.22, c.skinShade, 3);
    // cabelo preto com fios grisalhos
    ctx.beginPath();
    ctx.moveTo(-w * 1.02, r * 0.1);
    ctx.lineTo(-w * 1.04, -hh * 0.75);
    ctx.quadraticCurveTo(-w * 0.8, -hh * 1.22, 0, -hh * 1.18);
    ctx.quadraticCurveTo(w * 0.9, -hh * 1.2, w * 0.98, -hh * 0.62);
    ctx.lineTo(w * 0.4, -hh * 0.72);
    ctx.lineTo(-w * 0.5, -hh * 0.6);
    ctx.lineTo(-w * 0.62, r * 0.1);
    ctx.closePath();
    ctx.fillStyle = c.hair;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = '#A8AEB8';
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 5; i++) {
      const x0 = -w * 0.85 + i * w * 0.34;
      ctx.beginPath();
      ctx.moveTo(x0, -hh * 0.8);
      ctx.quadraticCurveTo(x0 + w * 0.12, -hh * 0.98, x0 + w * 0.26, -hh * (1.0 + (i % 2) * 0.04));
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(-w * 0.98, -hh * 0.3);
    ctx.lineTo(-w * 0.9, r * 0.05);
    ctx.stroke();
    // sobrancelha pesada
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(r * 0.28, -r * 0.4);
    ctx.lineTo(r * 0.92, -r * 0.24);
    ctx.stroke();
    // olho
    ctx.lineWidth = 3;
    if (face === 'hurt') {
      ctx.beginPath();
      ctx.moveTo(r * 0.5, -r * 0.2);
      ctx.lineTo(r * 0.75, -r * 0.0);
      ctx.moveTo(r * 0.75, -r * 0.2);
      ctx.lineTo(r * 0.5, -r * 0.0);
      ctx.stroke();
    } else if (face === 'shock') {
      circle(ctx, { x: r * 0.62, y: -r * 0.1 }, r * 0.14, '#fff', 2.5);
      ctx.fillStyle = OUT;
      ctx.beginPath();
      ctx.arc(r * 0.66, -r * 0.1, r * 0.05, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(r * 0.48, -r * 0.08);
      ctx.lineTo(r * 0.8, -r * 0.1);
      ctx.stroke();
    }
    // nariz e boca
    ctx.beginPath();
    ctx.moveTo(r * 0.92, -r * 0.05);
    ctx.lineTo(r * 1.08, r * 0.22);
    ctx.lineTo(r * 0.92, r * 0.28);
    ctx.stroke();
    ctx.beginPath();
    if (face === 'shout' || face === 'hurt' || face === 'shock') {
      ctx.ellipse(r * 0.7, r * 0.6, r * 0.2, r * 0.16, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#5A1020';
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.lineWidth = 4;
      ctx.moveTo(r * 0.48, r * 0.58);
      ctx.lineTo(r * 0.9, r * 0.6);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawHeadJailson(ctx, h, r, ang, c, face) {
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate((180 - ang) * D);
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.04, r * 0.96, r * 1.04, 0, 0, Math.PI * 2);
    ctx.fillStyle = c.skin;
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 4;
    ctx.stroke();
    // careca brilhando no topo
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(-r * 0.05, -r * 0.1, r * 0.72, Math.PI * 1.18, Math.PI * 1.45);
    ctx.stroke();
    // pouco cabelo: só nas laterais/nuca
    ctx.strokeStyle = c.hair;
    ctx.lineWidth = r * 0.3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, -r * 0.02, r * 0.86, Math.PI * 0.62, Math.PI * 1.08);
    ctx.stroke();
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-r * 0.1, -r * 1.0);
    ctx.quadraticCurveTo(r * 0.05, -r * 1.3, r * 0.2, -r * 1.1);
    ctx.moveTo(r * 0.05, -r * 1.02);
    ctx.quadraticCurveTo(r * 0.25, -r * 1.25, r * 0.35, -r * 1.02);
    ctx.stroke();
    // orelha de abano
    circle(ctx, { x: -r * 0.12, y: r * 0.06 }, r * 0.28, c.skinShade, 3);
    // cavanhaque
    ctx.beginPath();
    ctx.moveTo(r * 0.36, r * 0.66);
    ctx.lineTo(r * 0.8, r * 0.62);
    ctx.lineTo(r * 0.64, r * 1.12);
    ctx.lineTo(r * 0.44, r * 1.06);
    ctx.closePath();
    ctx.fillStyle = c.hair;
    ctx.fill();
    // sobrancelha levantada (cara de "achei um bug")
    ctx.strokeStyle = c.hair;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(r * 0.4, -r * 0.42);
    ctx.quadraticCurveTo(r * 0.62, -r * 0.6, r * 0.86, -r * 0.42);
    ctx.stroke();
    // olho
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 3;
    if (face === 'sleep') {
      ctx.beginPath();
      ctx.arc(r * 0.64, -r * 0.14, r * 0.13, 0.1, Math.PI - 0.1);
      ctx.stroke();
    } else if (face === 'hurt') {
      ctx.beginPath();
      ctx.moveTo(r * 0.52, -r * 0.24); ctx.lineTo(r * 0.76, -r * 0.02);
      ctx.moveTo(r * 0.76, -r * 0.24); ctx.lineTo(r * 0.52, -r * 0.02);
      ctx.stroke();
    } else {
      circle(ctx, { x: r * 0.64, y: -r * 0.13 }, r * 0.16, '#FFFFFF', 2.5);
      ctx.fillStyle = OUT;
      ctx.beginPath();
      ctx.arc(r * 0.7, -r * 0.12, r * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }
    // nariz
    ctx.beginPath();
    ctx.moveTo(r * 0.9, -r * 0.02);
    ctx.quadraticCurveTo(r * 1.08, r * 0.18, r * 0.9, r * 0.26);
    ctx.stroke();
    // boca
    ctx.beginPath();
    if (face === 'shout' || face === 'hurt' || face === 'yawn') {
      ctx.ellipse(r * 0.64, r * 0.46, r * 0.17, face === 'yawn' ? r * 0.24 : r * 0.14, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#5A1020';
      ctx.fill();
      ctx.stroke();
    } else if (face === 'sleep') {
      ctx.arc(r * 0.64, r * 0.44, r * 0.08, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.moveTo(r * 0.46, r * 0.42);
      ctx.quadraticCurveTo(r * 0.66, r * 0.56, r * 0.86, r * 0.4);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawHeadThiago(ctx, h, r, ang, c, face, f) {
    const t = f ? f.frameCount || 0 : 0;
    const strong = f && (f.fumada > 0 || (f.state === 'super' && f.def && f.def.super === 'fumada'));
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate((180 - ang) * D);
    // careca em tom de madeira
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.05, r * 0.95, r * 1.05, 0, 0, Math.PI * 2);
    ctx.fillStyle = c.skin;
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,230,200,0.55)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, -r * 0.1, r * 0.72, Math.PI * 1.2, Math.PI * 1.55);
    ctx.stroke();
    circle(ctx, { x: -r * 0.14, y: r * 0.04 }, r * 0.22, c.skinShade, 3);
    // sobrancelha branca e olhar tranquilo
    ctx.strokeStyle = '#F3F6FF';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(r * 0.36, -r * 0.36);
    ctx.lineTo(r * 0.88, -r * 0.3);
    ctx.stroke();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 3;
    if (face === 'hurt') {
      ctx.beginPath();
      ctx.moveTo(r * 0.5, -r * 0.2); ctx.lineTo(r * 0.74, 0);
      ctx.moveTo(r * 0.74, -r * 0.2); ctx.lineTo(r * 0.5, 0);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(r * 0.5, -r * 0.12);
      ctx.lineTo(r * 0.82, -r * 0.14);
      ctx.stroke();
      ctx.fillStyle = OUT;
      ctx.beginPath();
      ctx.arc(r * 0.68, -r * 0.07, r * 0.06, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(r * 0.92, -r * 0.04);
    ctx.lineTo(r * 1.06, r * 0.2);
    ctx.lineTo(r * 0.9, r * 0.26);
    ctx.stroke();
    // barba branca de fumaça (anima e cresce durante o especial)
    const n = strong ? 14 : 9;
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1);
      const bx = -r * 0.1 + k * r * 0.75 + Math.sin(t * 0.08 + i) * r * 0.05;
      const by = r * 0.5 + Math.sin(k * Math.PI) * r * 0.5 + (strong ? k * r * 0.3 : 0);
      const rr = r * (0.2 + Math.sin(k * Math.PI) * 0.12) * (strong ? 1.25 : 1) * (1 + Math.sin(t * 0.12 + i * 1.7) * 0.08);
      ctx.globalAlpha = strong ? 0.95 : 0.85;
      ctx.fillStyle = i % 2 ? '#F3F6FF' : '#DDE2EE';
      ctx.beginPath();
      ctx.arc(bx, by, rr, 0, Math.PI * 2);
      ctx.fill();
    }
    // fiapos de fumaça saindo da barba
    for (let i = 0; i < (strong ? 4 : 2); i++) {
      const ph = ((t * 0.8 + i * 30) % 60) / 60;
      ctx.globalAlpha = (1 - ph) * 0.6;
      ctx.fillStyle = '#F3F6FF';
      ctx.beginPath();
      ctx.arc(r * (0.2 + i * 0.2) + Math.sin(t * 0.1 + i) * 6, r * 1.1 + ph * r * 0.8, r * (0.12 + ph * 0.2), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // cigarro no canto da boca
    const ember = face === 'drag' ? '#FFE16A' : '#FF8A3D';
    ctx.lineCap = 'butt';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(r * 0.7, r * 0.42);
    ctx.lineTo(r * 1.42, r * 0.6);
    ctx.stroke();
    ctx.strokeStyle = '#F3F6FF';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.strokeStyle = '#D9A15A';
    ctx.beginPath();
    ctx.moveTo(r * 0.7, r * 0.42);
    ctx.lineTo(r * 0.88, r * 0.46);
    ctx.stroke();
    ctx.fillStyle = ember;
    ctx.beginPath();
    ctx.arc(r * 1.44, r * 0.6, face === 'drag' ? 6 : 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineCap = 'round';
    ctx.restore();
  }

  function drawHeadMarcus(ctx, h, r, ang, c, face) {
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate((180 - ang) * D);
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.04, r * 0.98, r * 1.04, 0, 0, Math.PI * 2);
    ctx.fillStyle = c.skin;
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(-r * 0.02, -r * 0.1, r * 0.74, Math.PI * 1.2, Math.PI * 1.5);
    ctx.stroke();
    circle(ctx, { x: -r * 0.14, y: r * 0.04 }, r * 0.24, c.skinShade, 3);
    // barba cheia (da orelha ao queixo) + bigode
    ctx.beginPath();
    ctx.moveTo(-r * 0.05, r * 0.25);
    ctx.quadraticCurveTo(-r * 0.05, r * 1.05, r * 0.45, r * 1.12);
    ctx.quadraticCurveTo(r * 0.95, r * 1.08, r * 1.0, r * 0.45);
    ctx.lineTo(r * 0.82, r * 0.38);
    ctx.quadraticCurveTo(r * 0.6, r * 0.62, r * 0.44, r * 0.42);
    ctx.quadraticCurveTo(r * 0.2, r * 0.5, r * 0.15, r * 0.22);
    ctx.closePath();
    ctx.fillStyle = c.hair;
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(r * 0.52, r * 0.34);
    ctx.quadraticCurveTo(r * 0.75, r * 0.24, r * 1.0, r * 0.36);
    ctx.lineWidth = 7;
    ctx.strokeStyle = c.hair;
    ctx.stroke();
    // boca
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (face === 'shout' || face === 'hurt') {
      ctx.ellipse(r * 0.72, r * 0.56, r * 0.15, r * 0.13, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#5A1020';
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.moveTo(r * 0.6, r * 0.55);
      ctx.lineTo(r * 0.86, r * 0.53);
      ctx.stroke();
    }
    // nariz
    ctx.beginPath();
    ctx.moveTo(r * 0.92, -r * 0.05);
    ctx.quadraticCurveTo(r * 1.12, r * 0.16, r * 0.92, r * 0.24);
    ctx.stroke();
    // sobrancelha
    ctx.strokeStyle = c.hair;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(r * 0.38, -r * 0.42);
    ctx.lineTo(r * 0.88, -r * 0.36);
    ctx.stroke();
    // óculos redondos
    ctx.fillStyle = 'rgba(158,193,255,0.25)';
    ctx.strokeStyle = '#0D0A1A';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(r * 0.62, -r * 0.12, r * 0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(r * 0.38, -r * 0.14);
    ctx.lineTo(-r * 0.12, -r * 0.06);
    ctx.stroke();
    if (face === 'hurt') {
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(r * 0.52, -r * 0.22); ctx.lineTo(r * 0.72, -r * 0.02);
      ctx.moveTo(r * 0.72, -r * 0.22); ctx.lineTo(r * 0.52, -r * 0.02);
      ctx.stroke();
    } else {
      ctx.fillStyle = OUT;
      ctx.beginPath();
      ctx.arc(r * 0.66, -r * 0.11, r * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(r * 0.62, -r * 0.12, r * 0.15, Math.PI * 1.1, Math.PI * 1.5);
    ctx.stroke();
    ctx.restore();
  }

  // Marcus enrolado como bola (Rolamento / Mini-Rolamento)
  function drawBall(ctx, f, c) {
    const R = f.ballR;
    ctx.save();
    ctx.translate(0, -R);
    // linhas de velocidade atrás da bola
    if (Math.abs(f.vx) > 6) {
      ctx.strokeStyle = 'rgba(158,193,255,0.55)';
      ctx.lineWidth = 5;
      for (let i = 0; i < 4; i++) {
        const yy = -R * 0.6 + i * R * 0.4;
        ctx.beginPath();
        ctx.moveTo(-R - 20, yy);
        ctx.lineTo(-R - 70 - i * 18, yy);
        ctx.stroke();
      }
    }
    ctx.rotate(f.rollAng || 0);
    // corpo (camisa preta)
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fillStyle = c.main;
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = OUT;
    ctx.stroke();
    // pernas de jeans enroladas
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, R - 3, Math.PI * 0.15, Math.PI * 0.95);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fillStyle = c.pants;
    ctx.fill();
    ctx.strokeStyle = c.pantsShade;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.62, Math.PI * 0.2, Math.PI * 0.9);
    ctx.stroke();
    ctx.restore();
    // braços abraçando os joelhos
    ctx.strokeStyle = OUT;
    ctx.lineWidth = R * 0.28 + 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.78, Math.PI * 1.05, Math.PI * 1.55);
    ctx.stroke();
    ctx.strokeStyle = c.skin;
    ctx.lineWidth = R * 0.28;
    ctx.stroke();
    // tênis
    circle(ctx, { x: Math.cos(Math.PI * 0.55) * R * 0.86, y: Math.sin(Math.PI * 0.55) * R * 0.86 }, R * 0.16, c.shoe, 3);
    // cabeça careca de óculos aparecendo
    ctx.save();
    ctx.translate(R * 0.55, -R * 0.45);
    ctx.scale(0.62, 0.62);
    drawHeadMarcus(ctx, { x: 0, y: 0 }, FF.Chars.marcus.dims.head, 150, c, f.face);
    ctx.restore();
    // brilho de volume
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = R * 0.12;
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.8, Math.PI * 1.15, Math.PI * 1.45);
    ctx.stroke();
    ctx.restore();
    return { head: { x: 0, y: -R * 2 }, ground: 0, ball: true };
  }

  function drawHeadTom(ctx, h, r, ang, c, face) {
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate((180 - ang) * D);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.94, r * 1.04, 0, 0, Math.PI * 2);
    ctx.fillStyle = c.skin;
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 4;
    ctx.stroke();
    // laterais raspadas
    ctx.fillStyle = 'rgba(90,70,55,0.45)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.25, -r * 0.05, r * 0.6, r * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    // topete penteado para trás
    ctx.beginPath();
    ctx.moveTo(r * 0.75, -r * 0.55);
    ctx.quadraticCurveTo(r * 0.3, -r * 1.35, -r * 0.95, -r * 0.7);
    ctx.quadraticCurveTo(-r * 0.3, -r * 0.8, r * 0.75, -r * 0.55);
    ctx.fillStyle = c.hair;
    ctx.fill();
    ctx.stroke();
    circle(ctx, { x: -r * 0.12, y: r * 0.05 }, r * 0.22, c.skinShade, 3);
    // cavanhaque bem clarinho
    ctx.save();
    ctx.globalAlpha *= 0.5;
    ctx.fillStyle = '#C2A27E';
    ctx.beginPath();
    ctx.moveTo(r * 0.4, r * 0.66);
    ctx.lineTo(r * 0.8, r * 0.62);
    ctx.lineTo(r * 0.64, r * 1.04);
    ctx.lineTo(r * 0.46, r * 1.0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // olho verde
    circle(ctx, { x: r * 0.64, y: -r * 0.12 }, r * 0.15, '#FFFFFF', 2.5);
    ctx.fillStyle = '#2FA866';
    ctx.beginPath();
    ctx.arc(r * 0.69, -r * 0.12, r * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = OUT;
    ctx.beginPath();
    ctx.arc(r * 0.71, -r * 0.12, r * 0.04, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (face === 'shout' || face === 'hurt') {
      ctx.ellipse(r * 0.68, r * 0.48, r * 0.15, r * 0.13, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#5A1020';
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.moveTo(r * 0.5, r * 0.46);
      ctx.lineTo(r * 0.84, r * 0.44);
      ctx.stroke();
    }
    ctx.restore();
  }

  const HEADS = {
    tom: drawHeadTom,
    marcus: drawHeadMarcus,
    andinho: (ctx, h, r, a, c, face) => drawHeadAndinho(ctx, h, r, a, c, face),
    marcelao: (ctx, h, r, a, c, face) => drawHeadMarcelao(ctx, h, r, a, c, face),
    jailson: drawHeadJailson,
    thiago: drawHeadThiago,
  };

  function drawProp(ctx, f, J, c) {
    if (f.prop === 'laptop') {
      const hx = (J.fh.x + J.bh.x) / 2, hy = (J.fh.y + J.bh.y) / 2;
      ctx.save();
      ctx.translate(hx + 10, hy + 6);
      ctx.fillStyle = '#2A2F45';
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 3;
      ctx.fillRect(-46, -4, 92, 12);
      ctx.strokeRect(-46, -4, 92, 12);
      ctx.save();
      ctx.transform(1, 0, -0.35, 1, 0, 0);
      ctx.fillStyle = '#1B1F33';
      ctx.fillRect(-30, -66, 84, 62);
      ctx.strokeRect(-30, -66, 84, 62);
      ctx.fillStyle = '#4DF3E8';
      for (let i = 0; i < 5; i++) {
        const w = 20 + ((i * 37 + f.frameCount * 3) % 46);
        ctx.globalAlpha = 0.8;
        ctx.fillRect(-24 + (i % 2) * 8, -58 + i * 10, w, 4);
      }
      ctx.restore();
      ctx.restore();
    } else if (f.prop === 'box') {
      ctx.save();
      ctx.translate(J.fh.x + 6, J.fh.y - 16);
      ctx.rotate(-0.2);
      ctx.scale(f.facing || 1, 1);
      ctx.fillStyle = '#F3F6FF';
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 3;
      ctx.fillRect(-30, -20, 60, 40);
      ctx.strokeRect(-30, -20, 60, 40);
      ctx.fillStyle = '#E8323C';
      ctx.fillRect(-30, -20, 60, 12);
      ctx.fillStyle = '#1A1033';
      ctx.font = `10px ${FF.FONT_D}`;
      ctx.textAlign = 'center';
      ctx.fillText('TADALAS', 0, 8);
      ctx.font = `7px ${FF.FONT_UI}`;
      ctx.fillText('100% fictício', 0, 17);
      ctx.restore();
    }
  }

  // desenha o lutador com os pés em (0,0) do contexto atual
  function drawBody(ctx, f, p, override) {
    const def = FF.Chars[f.id];
    const dm = def.dims;
    // modo 3D (WebGL): bonecos com volume; rastros coloridos continuam em 2D
    if ((!override || override === '#FFFFFF') && FF.GL && FF.GL.ok && !FF.force2D) {
      const r3 = FF.GL.drawActor(ctx, f, p, override === '#FFFFFF');
      if (r3) return r3;
    }
    const c = palette(f, override);
    if (f.ballR > 24) return drawBall(ctx, f, c);
    const J = solve(dm, p);
    const pump = 1 + (f.pump || 0) * 0.3;
    const [uw, fw, tw, sw] = dm.limbW;
    const ground = f.airborne || f.state === 'juggle' || f.state === 'thrown' ? standHeight(f.id) : J.low;
    ctx.save();
    ctx.translate(0, -ground);
    const isM = def.build === 'muscle';
    const shortS = def.sleeves === 'short';
    // braço de trás
    const backArm = c.shade;
    if (isM) {
      blob(ctx, J.sb, J.be, uw * pump, c.skinShade);
      seg(ctx, J.be, J.bh, fw * pump, c.skinShade);
      seg(ctx, add(J.be, { x: (J.bh.x - J.be.x) * 0.75, y: (J.bh.y - J.be.y) * 0.75 }), J.bh, fw * pump * 0.95, c.accent);
    } else {
      seg(ctx, J.sb, J.be, uw, backArm);
      seg(ctx, J.be, J.bh, fw, shortS ? c.skinShade : backArm);
    }
    circle(ctx, J.bh, fw * 0.7 * (isM ? pump : 1), c.skinShade);
    // perna de trás
    seg(ctx, J.hb, J.bk, tw, c.pantsShade);
    seg(ctx, J.bk, J.bf, sw, c.pantsShade);
    drawShoe(ctx, J.bf, J.ang.bf, isM ? 34 : 28, isM ? 20 : 17, c.shoe, c.shoeAccent);
    // tronco
    if (isM) {
      const chest = dm.chest * (1 + (f.pump || 0) * 0.12);
      poly(ctx, torsoPoly(J, chest, dm.waist), c.skin);
      shadeTorso(ctx, torsoPoly(J, chest, dm.waist));
      const tp = torsoPoly(J, chest * 0.78, dm.waist * 1.0);
      // regata
      const t2 = [tp[0], { x: tp[1].x + (tp[0].x - tp[1].x) * 0.12, y: tp[1].y + (tp[0].y - tp[1].y) * 0.12 }, { x: tp[2].x + (tp[3].x - tp[2].x) * 0.12, y: tp[2].y + (tp[3].y - tp[2].y) * 0.12 }, tp[3]];
      poly(ctx, t2, c.main);
      shadeTorso(ctx, t2);
      // cinto de academia
      const bp = torsoPoly(J, dm.waist * 1.08, dm.waist * 1.06);
      const lerpP = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      poly(ctx, [bp[0], lerpP(bp[0], bp[1], 0.16), lerpP(bp[3], bp[2], 0.16), bp[3]], '#6B4226');
      const bc = lerpP(J.hip, J.neck, 0.08);
      ctx.fillStyle = c.accent;
      ctx.fillRect(bc.x - 7, bc.y - 7, 14, 14);
      if (f.pump > 0.4) {
        ctx.strokeStyle = 'rgba(120,20,20,0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(J.neck.x - 10, J.neck.y + 30);
        ctx.lineTo(J.neck.x + 6, J.neck.y + 48);
        ctx.lineTo(J.neck.x - 4, J.neck.y + 60);
        ctx.stroke();
      }
      // pescoço grosso
      seg(ctx, J.neck, J.head, 34, c.skin);
    } else if (f.id === 'jailson') {
      seg(ctx, J.neck, J.head, 13, c.skin);
      poly(ctx, torsoPoly(J, dm.chest, dm.waist), c.main);
      shadeTorso(ctx, torsoPoly(J, dm.chest, dm.waist));
      // gola da camisa polo
      const sv = { x: J.neck.x - J.hip.x, y: J.neck.y - J.hip.y };
      const L = Math.hypot(sv.x, sv.y) || 1;
      const ux = sv.x / L, uy = sv.y / L;
      poly(ctx, [add(J.neck, { x: 12, y: 4 }), add(J.neck, { x: -2, y: 6 }), add(J.neck, { x: 8 - ux * 22, y: 4 - uy * 22 })], c.light, 3);
      // crachá de QA no cordão
      const b = { x: J.neck.x - ux * 52 + 10, y: J.neck.y - uy * 52 };
      ctx.strokeStyle = '#E8323C';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(J.neck.x - 4, J.neck.y + 6);
      ctx.lineTo(b.x, b.y - 12);
      ctx.lineTo(J.neck.x + 16, J.neck.y + 6);
      ctx.stroke();
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(-(J.ang.sp - 180) * D);
      ctx.scale(f.facing || 1, 1);
      ctx.fillStyle = '#F3F6FF';
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 2.5;
      ctx.fillRect(-13, -12, 26, 24);
      ctx.strokeRect(-13, -12, 26, 24);
      ctx.fillStyle = '#E8323C';
      ctx.font = `11px ${FF.FONT_D}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('QA', 0, 1);
      ctx.restore();
    } else if (f.id === 'tom') {
      seg(ctx, J.neck, J.head, 14, c.skin);
      const tp = torsoPoly(J, dm.chest, dm.waist);
      poly(ctx, tp, c.main);
      shadeTorso(ctx, tp);
      ctx.fillStyle = '#F3F6FF';
      for (let k = 0.2; k < 0.85; k += 0.2) {
        const q = { x: J.hip.x + (J.neck.x - J.hip.x) * k + 10, y: J.hip.y + (J.neck.y - J.hip.y) * k };
        ctx.beginPath();
        ctx.arc(q.x, q.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (f.id === 'marcus') {
      seg(ctx, J.neck, J.head, 20, c.skin);
      const tp = torsoPoly(J, dm.chest, dm.waist);
      poly(ctx, tp, c.main);
      shadeTorso(ctx, tp);
      // barriga redonda na frente
      const mid = { x: J.hip.x + (J.neck.x - J.hip.x) * 0.32, y: J.hip.y + (J.neck.y - J.hip.y) * 0.32 };
      ctx.save();
      ctx.translate(mid.x + dm.waist * 0.4, mid.y);
      ctx.rotate(-(J.ang.sp - 180) * D);
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 40, 0, -Math.PI / 2, Math.PI / 2);
      ctx.fillStyle = c.main;
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();
    } else if (f.id === 'thiago') {
      seg(ctx, J.neck, J.head, 17, c.skin);
      poly(ctx, torsoPoly(J, dm.chest, dm.waist), c.main);
      shadeTorso(ctx, torsoPoly(J, dm.chest, dm.waist));
      const mid = { x: (J.hip.x + J.neck.x) / 2, y: (J.hip.y + J.neck.y) / 2 };
      ctx.save();
      ctx.translate(mid.x - 2, mid.y - 22);
      ctx.rotate(-(J.ang.sp - 180) * D);
      ctx.scale(f.facing || 1, 1);
      ctx.font = `26px ${FF.FONT_D}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 4;
      ctx.strokeStyle = OUT;
      ctx.strokeText('PHP', 0, 0);
      ctx.fillStyle = c.light;
      ctx.fillText('PHP', 0, 0);
      ctx.restore();
    } else {
      seg(ctx, J.neck, J.head, 15, c.skin);
      // capuz
      circle(ctx, add(J.neck, { x: -14, y: 6 }), 22, c.shade, 3.5);
      poly(ctx, torsoPoly(J, dm.chest, dm.waist), c.main);
      shadeTorso(ctx, torsoPoly(J, dm.chest, dm.waist));
      // logo </>
      const mid = { x: (J.hip.x + J.neck.x) / 2, y: (J.hip.y + J.neck.y) / 2 };
      ctx.save();
      ctx.translate(mid.x + 6, mid.y - 6);
      ctx.rotate(-(J.ang.sp - 180) * D);
      ctx.scale(f.facing || 1, 1);
      ctx.fillStyle = c.light;
      ctx.font = `20px ${FF.FONT_D}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('</>', 0, 0);
      ctx.restore();
      // fone no pescoço
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.arc(J.neck.x + 2, J.neck.y + 4, 15, Math.PI * 0.1, Math.PI * 0.9);
      ctx.stroke();
      ctx.strokeStyle = c.accent;
      ctx.lineWidth = 5;
      ctx.stroke();
    }
    // cabeça
    const headAng = J.ang.sp - (J.ang.head || 0) * 0.5;
    (HEADS[f.id] || HEADS.andinho)(ctx, J.head, dm.head, headAng, c, f.face, f);
    J.headAng = headAng;
    // perna da frente
    seg(ctx, J.hf, J.fk, tw, c.pants);
    seg(ctx, J.fk, J.ff, sw, c.pants);
    if (isM) {
      ctx.strokeStyle = c.main;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(J.hf.x, J.hf.y);
      ctx.lineTo(J.fk.x, J.fk.y);
      ctx.lineTo(J.ff.x, J.ff.y);
      ctx.stroke();
    }
    drawShoe(ctx, J.ff, J.ang.ff, isM ? 34 : 28, isM ? 20 : 17, c.shoe, c.shoeAccent);
    drawProp(ctx, f, J, c);
    // braço da frente
    if (isM) {
      blob(ctx, J.sf, J.fe, uw * pump * 1.05, c.skin);
      seg(ctx, J.fe, J.fh, fw * pump, c.skin);
      seg(ctx, add(J.fe, { x: (J.fh.x - J.fe.x) * 0.75, y: (J.fh.y - J.fe.y) * 0.75 }), J.fh, fw * pump * 0.95, c.accent);
      if (f.pump > 0.4) {
        ctx.strokeStyle = 'rgba(120,20,20,0.7)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        const m = { x: (J.sf.x + J.fe.x) / 2, y: (J.sf.y + J.fe.y) / 2 };
        ctx.moveTo(m.x - 8, m.y - 6);
        ctx.lineTo(m.x + 4, m.y + 2);
        ctx.lineTo(m.x - 2, m.y + 10);
        ctx.stroke();
      }
      // ombro
      circle(ctx, J.sf, uw * pump * 0.55, c.skin, 3.5);
    } else {
      seg(ctx, J.sf, J.fe, uw, c.main);
      seg(ctx, J.fe, J.fh, fw, shortS ? c.skin : c.main);
    }
    circle(ctx, J.fh, fw * 0.7 * (isM ? pump : 1), c.skin);
    ctx.restore();
    J.ground = ground;
    return J;
  }

  // ---------- Cladiio: entidade de IA original (estilo "stand") ----------
  function drawCladiio(ctx, e, time) {
    ctx.save();
    ctx.globalAlpha = e.alpha;
    ctx.scale(e.facing, 1);
    const bob = Math.sin(time * 0.15) * 6;
    ctx.translate(0, bob);
    // aura
    const g = ctx.createRadialGradient(0, -170, 20, 0, -170, 230);
    g.addColorStop(0, 'rgba(155,107,255,0.45)');
    g.addColorStop(1, 'rgba(77,243,232,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-240, -420, 480, 460);
    // cauda de código
    ctx.font = `20px ${FF.FONT_UI}`;
    ctx.textAlign = 'center';
    const glyphs = ['{', '}', ';', '0', '1', '=>', '()', '</>', '&&'];
    for (let i = 0; i < 14; i++) {
      const yy = -60 + i * 14 + ((time * 2) % 14);
      ctx.globalAlpha = e.alpha * (1 - i / 14) * 0.9;
      ctx.fillStyle = i % 2 ? '#4DF3E8' : '#B9A6FF';
      ctx.fillText(glyphs[(i + Math.floor(time / 4)) % glyphs.length], Math.sin(i + time * 0.2) * (20 - i), yy);
    }
    ctx.globalAlpha = e.alpha;
    // tronco em V
    const tg = ctx.createLinearGradient(0, -300, 0, -60);
    tg.addColorStop(0, '#9B6BFF');
    tg.addColorStop(1, 'rgba(77,243,232,0.25)');
    ctx.beginPath();
    ctx.moveTo(-90, -270);
    ctx.lineTo(90, -270);
    ctx.lineTo(34, -70);
    ctx.lineTo(-34, -70);
    ctx.closePath();
    ctx.fillStyle = tg;
    ctx.fill();
    ctx.strokeStyle = '#E9FFFD';
    ctx.lineWidth = 3;
    ctx.stroke();
    // circuitos
    ctx.strokeStyle = 'rgba(233,255,253,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-50, -240); ctx.lineTo(-20, -210); ctx.lineTo(-20, -150);
    ctx.moveTo(40, -245); ctx.lineTo(18, -220); ctx.lineTo(18, -120);
    ctx.stroke();
    // núcleo
    ctx.beginPath();
    ctx.arc(0, -200, 16, 0, Math.PI * 2);
    ctx.fillStyle = '#E9FFFD';
    ctx.fill();
    // ombreiras de chaves { }
    ctx.font = `92px ${FF.FONT_D}`;
    ctx.fillStyle = '#4DF3E8';
    ctx.strokeStyle = '#1A1033';
    ctx.lineWidth = 6;
    ctx.textBaseline = 'middle';
    ctx.strokeText('{', -104, -262);
    ctx.fillText('{', -104, -262);
    ctx.strokeText('}', 104, -262);
    ctx.fillText('}', 104, -262);
    // cabeça hexagonal com visor
    ctx.save();
    ctx.translate(0, -330);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i + Math.PI / 6;
      ctx.lineTo(Math.cos(a) * 58, Math.sin(a) * 54);
    }
    ctx.closePath();
    ctx.fillStyle = '#1B1440';
    ctx.fill();
    ctx.strokeStyle = '#B9A6FF';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = '#4DF3E8';
    ctx.fillRect(-42, -10, 84, 20);
    ctx.fillStyle = '#1B1440';
    ctx.font = `18px ${FF.FONT_D}`;
    ctx.fillText(e.striking ? '> <' : '^ ^', 6, 1);
    ctx.restore();
    // punhos (com fantasmas de velocidade ao golpear)
    const fist = (x, y, a) => {
      ctx.save();
      ctx.globalAlpha = e.alpha * a;
      ctx.translate(x, y);
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const ang = (Math.PI / 3) * i;
        ctx.lineTo(Math.cos(ang) * 34, Math.sin(ang) * 30);
      }
      ctx.closePath();
      ctx.fillStyle = '#9B6BFF';
      ctx.fill();
      ctx.strokeStyle = '#E9FFFD';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();
    };
    if (e.striking) {
      const ext = e.punchExt;
      for (let k = 3; k >= 0; k--) fist(80 + ext * 140 - k * 34, -230 + ((k * 23) % 40) - 20, 1 - k * 0.22);
      ctx.strokeStyle = 'rgba(233,255,253,0.6)';
      ctx.lineWidth = 3;
      for (let k = 0; k < 5; k++) {
        ctx.beginPath();
        ctx.moveTo(60, -280 + k * 22);
        ctx.lineTo(60 + ext * 180, -280 + k * 22);
        ctx.stroke();
      }
      fist(-70, -190, 0.8);
    } else {
      fist(-96, -190, 1);
      fist(96, -190, 1);
    }
    ctx.restore();
  }

  // retrato (cabeça) para HUD e seleção
  function drawPortrait(ctx, id, x, y, scale, facing, face) {
    if (FF.GL && FF.GL.ok && !FF.force2D) {
      const img = FF.GL.portrait(id, false);
      if (img) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale * (facing || 1), scale);
        ctx.drawImage(img, -80, -80, 160, 160);
        ctx.restore();
        return;
      }
    }
    const def = FF.Chars[id];
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale * (facing || 1), scale);
    const c = def.colors;
    if (id === 'marcelao') {
      ctx.fillStyle = c.skin;
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-50, 70); ctx.lineTo(-22, 20); ctx.lineTo(22, 20); ctx.lineTo(50, 70);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = c.main;
      ctx.fillRect(-26, 46, 52, 30);
      drawHeadMarcelao(ctx, { x: 0, y: 0 }, def.dims.head, 180, c, face || 'normal');
    } else {
      ctx.fillStyle = c.main;
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-44, 70); ctx.lineTo(-16, 24); ctx.lineTo(16, 24); ctx.lineTo(44, 70);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      if (id === 'thiago') {
        ctx.save();
        ctx.scale(facing || 1, 1);
        ctx.fillStyle = c.light;
        ctx.font = `14px ${FF.FONT_D}`;
        ctx.textAlign = 'center';
        ctx.fillText('PHP', 0, 62);
        ctx.restore();
      }
      (HEADS[id] || HEADS.andinho)(ctx, { x: 0, y: 0 }, def.dims.head, 180, c, face || 'normal', { frameCount: Math.floor(performance.now() / 16), fumada: 0, state: 'idle', def });
    }
    ctx.restore();
  }


  return { pose, solve, drawBody, drawCladiio, drawPortrait, standHeight, lerpPose, BASE, mixHex };
})();
