// ============================================================
// INTELIGÊNCIA ARTIFICIAL (CPU) — usa o mesmo pipeline de comandos
// do jogador: "aperta" direções e botões virtuais com tempo de reação
// ============================================================
FF.AI = (function () {
  const U = FF.U;
  const LEVELS = {
    easy: { reaction: 24, think: 18, aggr: 0.35, block: 0.22, combo: 0.15, antiAir: 0.15, superUse: 0.25, drop: 0.45 },
    normal: { reaction: 13, think: 9, aggr: 0.58, block: 0.55, combo: 0.6, antiAir: 0.5, superUse: 0.55, drop: 0.15 },
    hard: { reaction: 6, think: 3, aggr: 0.78, block: 0.85, combo: 0.95, antiAir: 0.85, superUse: 0.85, drop: 0.02 },
  };

  class Controller {
    constructor(fighter, level, mode) {
      this.f = fighter;
      this.mode = mode || 'cpu'; // cpu | stand | block | crouch
      this.setLevel(level || 'normal');
      this.out = {};
      this.queue = [];
      this.snaps = [];
      this.cool = 30;
      this.holdBlock = 0;
      this.blockLow = false;
    }
    setLevel(l) {
      this.level = l;
      this.L = LEVELS[l] || LEVELS.normal;
    }
    // converte numpad relativo → teclas absolutas
    dirFlags(n) {
      const fc = this.f.facing;
      const o = {};
      const x = [1, 4, 7].includes(n) ? -1 : [3, 6, 9].includes(n) ? 1 : 0;
      const ax = x * fc;
      if (ax < 0) o.left = true;
      if (ax > 0) o.right = true;
      if (n <= 3) o.down = true;
      if (n >= 7) o.up = true;
      return o;
    }
    snapshot() {
      const o = this.f.opp;
      const m = o.move;
      this.snaps.push({
        x: o.x, y: o.y, vy: o.vy, state: o.state, airborne: o.airborne,
        attacking: o.state === 'attack' && m && m.hits.length && o.moveFrame <= m.hits[m.hits.length - 1].f1,
        low: o.state === 'attack' && m && m.hits.length && m.hits[0].height === 'low',
        overhead: o.state === 'attack' && m && m.hits.length && m.hits[0].height === 'overhead',
        grab: o.state === 'attack' && m && (m.kind === 'throw' || m.kind === 'cmdgrab'),
        tadalas: o.tadalas, crouch: o.isCrouching(), knock: o.state === 'knockdown' || o.state === 'wakeup',
        dizzy: o.state === 'dizzy',
      });
      if (this.snaps.length > 40) this.snaps.shift();
    }
    perceived() {
      const i = Math.max(0, this.snaps.length - 1 - this.L.reaction);
      return this.snaps[i];
    }
    push(steps) {
      for (const s of steps) this.queue.push(Object.assign({ d: 5, n: 2, b: null }, s));
    }
    // macros de comandos
    motion(name, btn) {
      const M = {
        qcf: [2, 3, 6], qcb: [2, 1, 4], dp: [6, 2, 3], hcf: [4, 1, 2, 3, 6],
      }[name];
      const steps = M.map((d) => ({ d, n: 2 }));
      steps[steps.length - 1].b = [btn];
      steps.push({ d: 5, n: 2 });
      return steps;
    }
    think() {
      const f = this.f;
      const B = f.battle;
      this.snapshot();
      this.out = {};
      if (!B.rounds.fighting || f.state === 'super') {
        this.queue.length = 0;
        return;
      }
      if (this.mode === 'stand') return;
      if (this.mode === 'crouch') {
        this.out = this.dirFlags(2);
        return;
      }
      if (this.mode === 'block') {
        const p = this.snaps[this.snaps.length - 1];
        const proj = B.projectiles.find((q) => q.owner !== f);
        const low = (p && p.low) || (proj && proj.hit.height === 'low');
        this.out = this.dirFlags(low ? 1 : 4);
        return;
      }
      // executa fila
      if (this.queue.length) {
        const s = this.queue[0];
        if (s.confirm && !f.hitConfirmed && !f.blockConfirmed) {
          this.queue.length = 0;
        } else {
          const o = this.dirFlags(s.d);
          if (s.b && !s.started) for (const b of s.b) o[b] = true;
          s.started = true;
          this.out = o;
          if (--s.n <= 0) this.queue.shift();
          return;
        }
      }
      if (this.holdBlock > 0) {
        this.holdBlock--;
        const p = this.snaps[this.snaps.length - 1];
        this.out = this.dirFlags(p && p.low ? 1 : p && p.overhead ? 4 : this.blockLow ? 1 : 4);
        return;
      }
      if (--this.cool > 0 && !f.airborne) {
        // segurando defesa leve enquanto pensa
        return;
      }
      this.cool = this.L.think + U.randi(0, 6);
      this.decide();
    }
    decide() {
      const f = this.f, o = f.opp, B = f.battle, L = this.L;
      const p = this.perceived();
      if (!p) return;
      const dist = Math.abs(o.x - f.x);
      const isA = !f.def.heavy;
      if (f.airborne) {
        if (f.state === 'air' && f.vy > -6 && dist < 260 && U.chance(0.7)) this.push([{ d: 5, n: 2, b: [U.choice(['hk', 'hp', 'mk'])] }]);
        return;
      }
      if (!f.isNeutral()) return;
      // ameaça: projétil
      const proj = B.projectiles.find((q) => q.owner !== f && Math.sign(q.vx) === Math.sign(f.x - q.x) && Math.abs(q.x - f.x) < 520);
      if (proj) {
        if (U.chance(L.block)) {
          if (U.chance(0.35 * L.combo)) this.push([{ d: 9, n: 4 }]);
          else {
            this.holdBlock = 18;
            this.blockLow = proj.hit.height === 'low';
          }
          return;
        }
      }
      // ameaça: Cladiio em campo
      const st = B.standOf(o);
      if (st && f.tadalas <= 0) {
        if (U.chance(0.5)) this.push([{ d: 4, n: 10 }]);
        return;
      }
      // Modo Tadalas do rival: Andinho foge
      if (p.tadalas > 0 && isA) {
        const r = Math.random();
        if (r < 0.35) this.push([{ d: 7, n: 4 }]);
        else if (r < 0.6 && !B.projectiles.some((q) => q.owner === f)) this.push(this.motion('qcf', 'lp'));
        else this.push([{ d: 4, n: 16 }]);
        return;
      }
      // defesa contra ataques
      if (p.attacking && dist < 400 && U.chance(L.block)) {
        if (p.grab && dist < 220) {
          if (U.chance(L.combo)) this.push([{ d: 5, n: 2, b: ['lp', 'lk'] }]);
          else this.push([{ d: 7, n: 4 }]);
          return;
        }
        this.holdBlock = 14;
        this.blockLow = p.low;
        return;
      }
      // anti-aéreo
      if (p.airborne && p.state === 'air' && dist < 340 && U.chance(L.antiAir)) {
        if (U.chance(0.6)) this.push(this.motion('dp', 'hp'));
        else this.push([{ d: 2, n: 2 }, { d: 2, n: 2, b: ['hp'] }]);
        return;
      }
      // especial definitivo
      if (f.meter >= 100 && f.tadalas <= 0 && U.chance(L.superUse * 0.35)) {
        const ai = f.def.ai || {};
        let ok = dist <= (ai.superMaxDist || 9999) && dist >= (ai.superMinDist || 0) && f.hp >= (ai.superMinHp || 0) && f.hp <= (ai.superMaxHp || 999);
        if (ai.lowHpAny && f.hp < ai.lowHpAny) ok = true;
        if (p.tadalas > 0 && f.def.super !== 'tester' && f.def.super !== 'tadalas') ok = false;
        if (ok) {
          this.push([{ d: 5, n: 3, b: ['hp', 'hk'] }]);
          return;
        }
      }
      // rival caído: aproxima
      if (p.knock) {
        this.push([{ d: dist > 260 ? 6 : 5, n: 10 }]);
        return;
      }
      if (p.dizzy && dist < 300) {
        this.combo(true);
        return;
      }
      // Marcelão em Modo Tadalas: avança sem medo
      const aggr = f.tadalas > 0 ? 0.95 : L.aggr;
      const r = Math.random();
      if (dist > 640) {
        if (r < 0.3 && !B.projectiles.some((q) => q.owner === f)) this.push(this.motion('qcf', U.choice(['lp', 'mp', 'hp'])));
        else if (r < 0.65 * (0.5 + aggr)) this.push([{ d: 6, n: U.randi(14, 30) }]);
        else if (r < 0.8) this.push([{ d: 6, n: 2 }, { d: 5, n: 2 }, { d: 6, n: 2 }, { d: 5, n: 1 }]);
        else if (r < 0.9) this.push([{ d: 9, n: 4 }]);
        else this.push([{ d: 5, n: 12 }]);
      } else if (dist > 250) {
        if (r < aggr * 0.45) {
          const poke = U.choice(['mk', 'mk', 'mp']);
          const low = U.chance(0.4);
          const steps = [{ d: low ? 2 : 5, n: 2, b: [poke] }, { d: low ? 2 : 5, n: 6 }];
          if (U.chance(L.combo * 0.6)) {
            steps.push(...this.motion('qcf', 'lp').map((s, i) => (i === 0 ? Object.assign(s, { confirm: true }) : s)));
          }
          this.push(steps);
        } else if (r < aggr * 0.75) this.push([{ d: 6, n: U.randi(10, 20) }]);
        else if (r < aggr * 0.75 + 0.1) {
          this.push([{ d: 9, n: 4 }]);
        } else if (r < aggr * 0.75 + 0.18 && (f.def.heavy || f.id === 'thiago')) {
          this.push(this.motion('qcb', U.choice(['lk', 'mk'])));
        } else if (r < 0.92) {
          this.holdBlock = 12;
        } else this.push([{ d: 6, n: 2 }, { d: 5, n: 2 }, { d: 6, n: 2 }, { d: 5, n: 1 }]);
      } else {
        if (r < aggr) this.combo(false);
        else if (r < aggr + 0.12) {
          if ((f.def.heavy || f.id === 'thiago') && U.chance(0.5)) this.push(this.motion('hcf', 'hp'));
          else this.push([{ d: 6, n: 2, b: ['lp', 'lk'] }]);
        } else if (r < aggr + 0.2 && isA) {
          this.push([{ d: 5, n: 2, b: ['mp', 'mk'] }]);
        } else if (r < aggr + 0.3) {
          this.push([{ d: 4, n: 2 }, { d: 5, n: 2 }, { d: 4, n: 2 }, { d: 5, n: 1 }]);
        } else this.holdBlock = 14;
      }
    }
    combo(sure) {
      const f = this.f;
      const L = this.L;
      const isA = !f.def.heavy;
      const skilled = sure || Math.random() < L.combo;
      const drop = Math.random() < L.drop;
      const p = (b, d, n, confirm) => ({ d: d || 5, n: n || 2, b: [b], confirm });
      let seq;
      if (!skilled) {
        seq = [p(U.choice(['lp', 'mp', 'lk', 'mk', 'hp']), U.chance(0.3) ? 2 : 5, 2), { d: 5, n: 10 }];
      } else if (isA) {
        const opts = [
          [p('lk', 2, 2), { d: 2, n: 5 }, p('lk', 2, 2, true), { d: 2, n: 5 }, p('mk', 2, 2, true), { d: 2, n: 3 }, ...this.motion('qcf', 'lp')],
          [p('lp', 5, 2), { d: 5, n: 5 }, p('mp', 5, 2, true), { d: 5, n: 4 }, ...this.motion('hcf', 'hp')],
          [p('mp', 5, 2), { d: 5, n: 5 }, p('hp', 5, 2, true), { d: 5, n: 5 }, ...this.motion('dp', 'hp')],
          [p('hp', 2, 2), { d: 2, n: 8 }, ...this.motion('dp', 'mp')],
        ];
        seq = U.choice(opts);
      } else {
        const opts = [
          [p('lp', 5, 2), { d: 5, n: 7 }, p('mp', 5, 2, true), { d: 5, n: 5 }, ...this.motion('qcf', 'hp')],
          [p('mk', 2, 2), { d: 2, n: 6 }, ...this.motion('qcb', 'hk')],
          [p('mp', 5, 2), { d: 5, n: 7 }, p('hp', 5, 2, true), { d: 5, n: 6 }, ...this.motion('dp', 'hp')],
          [p('lk', 2, 2), { d: 2, n: 6 }, p('lk', 2, 2, true), { d: 2, n: 6 }, p('hk', 2, 2, true)],
        ];
        seq = U.choice(opts);
      }
      if (drop && seq.length > 3) seq = seq.slice(0, 3);
      if (f.def.stats.int < 80 && seq.length > 4 && Math.random() < 0.15) seq = seq.slice(0, 4);
      this.push(seq);
    }
  }

  return { Controller, LEVELS };
})();
