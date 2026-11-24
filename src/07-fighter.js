// ============================================================
// LUTADOR — máquina de estados que impede ações incompatíveis
// ============================================================
FF.Fighter = (function () {
  const U = FF.U;

  // estados em que o jogador tem controle livre
  const NEUTRAL = new Set(['idle', 'walkF', 'walkB', 'crouch']);
  // transições permitidas a partir de cada estado (o que não está aqui é bloqueado)
  const ALLOWED = {
    intro: ['idle', 'win', 'lose'],
    idle: '*', walkF: '*', walkB: '*', crouch: '*',
    jumpSquat: ['air', 'hitstun', 'juggle', 'thrown', 'blockstun', 'super', 'lose', 'win'],
    air: ['attack', 'land', 'juggle', 'blockstun', 'lose', 'win', 'hitstun'],
    land: '*',
    dashF: '*', dashB: '*',
    attack: '*',
    blockstun: '*',
    hitstun: ['hitstun', 'juggle', 'idle', 'crouch', 'dizzy', 'thrown', 'lose', 'win', 'knockdown', 'land'],
    juggle: ['juggle', 'knockdown', 'land', 'hitstun', 'lose', 'win'],
    knockdown: ['wakeup', 'lose', 'win'],
    wakeup: ['idle', 'crouch', 'lose', 'win'],
    dizzy: ['hitstun', 'juggle', 'idle', 'thrown', 'lose', 'win', 'knockdown'],
    throw: ['idle', 'blockstun', 'hitstun', 'juggle', 'lose', 'win'],
    thrown: ['juggle', 'idle', 'blockstun', 'knockdown', 'lose', 'win'],
    super: ['idle', 'hitstun', 'juggle', 'lose', 'win', 'crouch', 'air'],
    win: ['intro', 'idle'],
    lose: ['intro', 'idle'],
  };

  class Fighter {
    constructor(id, slot, battle, alt) {
      this.id = id;
      this.def = FF.Chars[id];
      this.slot = slot;
      this.battle = battle;
      this.altColor = !!alt;
      this.input = null;
      this.meter = 0;
      this.frameCount = 0;
      this.resetRound(slot === 0 ? FF.STAGE_W / 2 - 330 : FF.STAGE_W / 2 + 330, slot === 0 ? 1 : -1);
    }
    get opp() {
      return this.battle.f[1 - this.slot];
    }
    resetRound(x, facing) {
      this.x = x;
      this.y = 0;
      this.vx = 0;
      this.vy = 0;
      this.prevX = x;
      this.facing = facing;
      this.hp = this.def.hp;
      this.hpLag = this.hp;
      this.state = 'intro';
      this.stateFrame = 0;
      this.move = null;
      this.moveFrame = 0;
      this.curFrame = -1;
      this.hitstop = 0;
      this.hitstun = 0;
      this.blockstun = 0;
      this.airborne = false;
      this.jumpDir = 0;
      this.juggleCount = 0;
      this.juggleKD = false;
      this.juggleInvuln = false;
      this.comboHits = 0;
      this.comboDmg = 0;
      this.comboMoves = [];
      this.stun = 0;
      this.dizzyT = 0;
      this.invulnT = 0;
      this.throwInvulnT = 0;
      this.tadalas = 0;
      this.fumada = 0;
      this.rolling = false;
      this.whip = null;
      this.tb = null;
      this.rollPhase = null;
      this.ballR = 0;
      this.rollAng = 0;
      this.sleeping = 0;
      this.superWake = 0;
      this.healed = 0;
      this.pump = 0;
      this.superActive = false;
      this.superInvuln = false;
      this.superFrame = 0;
      this.superStow = 0;
      this.prop = null;
      this.armorLeft = 0;
      this.buf = [];
      this.hitIds = new Set();
      this.hitConfirmed = false;
      this.blockConfirmed = false;
      this.chainCount = 0;
      this.airAttacks = 0;
      this.airChain = 0;
      this.face = 'normal';
      this.speech = null;
      this.flash = 0;
      this.walkPhase = 0;
      this.blocking = false;
      this.crouchBlock = false;
      this.crouchHit = false;
      this.hitHigh = true;
      this.landRec = 4;
      this.trail = [];
      this.throwData = null;
      this.thrower = null;
      this.thrownRot = 0;
      this.floatT = 0;
      this.dizzyUsed = false;
      if (this.input) this.input.clear();
    }

    // ---------- máquina de estados ----------
    setState(s, force) {
      const allow = ALLOWED[this.state];
      if (!force && allow !== '*' && allow && !allow.includes(s)) return false;
      const prev = this.state;
      this.state = s;
      this.stateFrame = 0;
      if (s !== 'attack') {
        this.move = null;
        this.curFrame = -1;
      }
      if (NEUTRAL.has(s) || s === 'land' || s === 'air') {
        if (!['hitstun', 'juggle', 'blockstun', 'thrown', 'dizzy', 'knockdown', 'wakeup'].includes(s)) {
          if (prev === 'hitstun' || prev === 'wakeup' || prev === 'blockstun' || prev === 'dizzy' || prev === 'land') this.throwInvulnT = 5;
          this.endCombo();
        }
        this.face = 'normal';
      }
      return true;
    }
    endCombo() {
      if (this.comboHits > 0) {
        this.battle.onComboEnd(this);
      }
      this.comboHits = 0;
      this.comboDmg = 0;
      this.comboMoves = [];
      this.juggleCount = 0;
      this.juggleInvuln = false;
      this.dizzyUsed = false;
    }
    isNeutral() {
      return NEUTRAL.has(this.state);
    }
    isCrouching() {
      const s = this.state;
      return s === 'crouch' || (s === 'attack' && this.moveCrouch && !this.airborne) || (s === 'blockstun' && this.crouchBlock) || (s === 'hitstun' && this.crouchHit);
    }
    isInvulnerable() {
      if (this.invulnT > 0) return true;
      const s = this.state;
      if (s === 'knockdown' || s === 'wakeup' || s === 'thrown' || s === 'intro' || s === 'win' || s === 'lose') return true;
      if (s === 'super' && this.superInvuln) return true;
      if (s === 'juggle' && this.juggleInvuln) return true;
      if (s === 'dashB' && this.stateFrame < this.def.dashB.invuln) return true;
      if (s === 'attack' && this.move && this.move.invuln && this.moveFrame >= this.move.invuln[0] && this.moveFrame <= this.move.invuln[1]) return true;
      return false;
    }
    isThrowable() {
      if (this.airborne || this.throwInvulnT > 0 || this.isInvulnerable()) return false;
      return NEUTRAL.has(this.state) || ['attack', 'land', 'dashF', 'dashB', 'jumpSquat', 'dizzy'].includes(this.state);
    }
    faceOpponent() {
      if (this.airborne) return;
      const o = this.opp;
      if (Math.abs(o.x - this.x) > 2) this.facing = o.x > this.x ? 1 : -1;
    }

    // ---------- buffer de botões ----------
    consume(list) {
      for (const name of list) {
        for (let i = this.buf.length - 1; i >= 0; i--) {
          if (this.buf[i].b === name) {
            this.buf.splice(i, 1);
            return name;
          }
        }
      }
      return null;
    }
    has(b, maxAge) {
      return this.buf.some((e) => e.b === b && e.age <= (maxAge == null ? 99 : maxAge));
    }
    chord(a, b) {
      const ea = this.buf.find((e) => e.b === a && e.age <= 3);
      const eb = this.buf.find((e) => e.b === b && e.age <= 3);
      if (ea && eb) {
        this.buf.splice(this.buf.indexOf(ea), 1);
        this.buf.splice(this.buf.indexOf(eb), 1);
        return true;
      }
      return false;
    }

    // ---------- barra de especial ----------
    gainMeter(n) {
      if (this.superActive) return; // não carrega durante o próprio especial
      const before = this.meter;
      this.meter = Math.min(100, this.meter + n);
      if (before < 100 && this.meter >= 100) this.battle.onSpecialReady(this);
    }

    // força efetiva (Hora da Fumada soma +10 de Força)
    strMul() {
      const str = this.def.stats.str + (this.fumada > 0 ? 10 : 0);
      return 0.75 + (str / 100) * 0.45;
    }

    say(text) {
      this.speech = { text, t: 130 };
      FF.Audio.speak(text, { pitch: this.def.voice.pitch, rate: this.def.voice.rate });
    }

    // ---------- tentativa de ações ----------
    tryActions(mode) {
      const B = this.battle;
      const inp = this.input;
      if (!B.rounds.fighting) return false;
      const canSuper = this.meter >= 100 && !B.freeze && !this.superActive && !this.airborne && !B.standOf(this);
      if (canSuper) {
        if (this.consume(['sup']) || this.chord('hp', 'hk') || (inp.motion([2, 3, 6, 2, 3, 6], 42, this.facing) && this.consume(['hp', 'hk']))) {
          FF.Specials.startSuper(this);
          return true;
        }
      }
      if (mode === 'super') return false;
      if (!this.airborne) {
        if (!mode && (this.consume(['sec']) || this.chord('mp', 'mk'))) {
          this.startMove(FF.Chars.special(this.id, 'secondary', 'm'));
          return true;
        }
        if (!mode && (this.consume(['grab']) || this.chord('lp', 'lk'))) {
          this.startMove(this.def.moves.throw);
          return true;
        }
        // tecla dedicada de especial (sem meia-lua): força média
        for (const sp of this.def.specialList) {
          if (!this.has(sp.key)) continue;
          if (sp.proj && B.projectiles.some((p) => p.owner === this)) {
            this.consume([sp.key]);
            continue;
          }
          this.consume([sp.key]);
          this.startMove(FF.Chars.special(this.id, sp.id, sp.strong ? 'h' : 'm'));
          this.battle.stats.specials++;
          return true;
        }
        for (const sp of this.def.specialList) {
          if (!inp.motion(sp.motion, sp.win, this.facing)) continue;
          if (sp.proj && B.projectiles.some((p) => p.owner === this)) continue;
          const btns = sp.btn === 'p' ? ['hp', 'mp', 'lp'] : sp.btn === 'k' ? ['hk', 'mk', 'lk'] : ['hp', 'hk', 'mp', 'mk', 'lp', 'lk'];
          const b = this.consume(btns);
          if (b) {
            const s = b[0] === 'l' ? 'l' : b[0] === 'm' ? 'm' : 'h';
            this.startMove(FF.Chars.special(this.id, sp.id, s));
            this.battle.stats.specials++;
            return true;
          }
        }
      }
      if (mode) return false;
      this.buf = this.buf.filter((e) => !['grab', 'sec', 'sp1', 'sp2', 'sp3', 'sp4'].includes(e.b) || e.age < 2);
      if (this.airborne) {
        if (this.airAttacks < 1) {
          const b = this.consume(['hp', 'hk', 'mp', 'mk', 'lp', 'lk']);
          if (b) {
            this.startNormal(b);
            return true;
          }
        }
        return false;
      }
      const b = this.consume(['hp', 'hk', 'mp', 'mk', 'lp', 'lk']);
      if (b) {
        this.startNormal(b);
        return true;
      }
      return false;
    }

    startNormal(b) {
      const d = this.input.dir(this.facing);
      let key = b;
      if (this.airborne) key = 'j' + b;
      else if (d <= 3) key = 'c' + b;
      const m = this.def.moves[key];
      if (!m) return;
      this.startMove(m);
      this.moveBtn = b;
      this.moveCrouch = key[0] === 'c';
      if (this.airborne) this.airAttacks++;
    }

    startMove(m) {
      if (!m) return;
      this.setState('attack', true);
      this.move = m;
      this.moveFrame = 0;
      this.curFrame = -1;
      this.moveCrouch = false;
      this.moveBtn = null;
      this.hitIds = new Set();
      this.hitConfirmed = false;
      this.blockConfirmed = false;
      this.throwDone = false;
      this.armorLeft = m.armorHits || 0;
      if (!this.airborne && !m.vel) this.vx = 0;
      FF.Audio.sfx(m.level === 'heavy' ? 'whooshH' : 'whoosh', 0.7);
    }

    endMove() {
      this.chainCount = 0;
      if (this.airborne) this.setState('air', true);
      else if (this.input.dir(this.facing) <= 3) this.setState('crouch', true);
      else this.setState('idle', true);
    }

    // ---------- ciclo por quadro ----------
    tickAlways() {
      // contadores que avançam todo passo lógico (inclusive durante congelamentos):
      // garante exatamente 5 s (300 passos a 60 Hz) para o Modo Tadalas
      if (this.tadalas > 0) {
        this.tadalas--;
        this.battle.stats.tadalasFrames++;
        if (this.tadalas === 0) FF.Specials.endTadalas(this);
      }
      // Hora da Fumada: perde 1 HP por segundo (1/60 por passo) durante 8 s
      if (this.fumada > 0) {
        this.fumada--;
        this.battle.stats.fumadaFrames++;
        if (this.hp > 1) {
          const loss = Math.min(1 / 60, this.hp - 1);
          this.hp -= loss;
          this.battle.stats.fumadaLoss += loss;
        }
        if (this.fumada === 0) FF.Specials.endFumada(this);
      }
    }

    update() {
      const B = this.battle;
      this.frameCount++;
      if (this.speech && --this.speech.t <= 0) this.speech = null;
      if (this.flash > 0) this.flash--;
      const cur = this.input.cur();
      for (const b of cur.pressed) this.buf.push({ b, age: 0 });
      // Modo Tadalas: músculos inflados
      const pumpT = this.tadalas > 0 || (this.state === 'super' && this.id === 'marcelao' && this.superFrame > 50) ? 1 : 0;
      this.pump += (pumpT - this.pump) * 0.15;
      // Marcus vira bola (Rolamento / Mini-Rolamento)
      const ballT = this.rolling ? 104 : this.state === 'attack' && this.move && this.move.ball && this.moveFrame >= this.move.ball[0] && this.moveFrame <= this.move.ball[1] ? 76 : 0;
      this.ballR = FF.approach(this.ballR, ballT, 0.35);
      if (this.ballR < 1) this.ballR = 0;
      if (this.ballR > 24) this.rollAng += Math.abs(this.vx) > 1 ? this.vx / Math.max(30, this.ballR) : this.rolling ? 0.45 * this.facing : 0;
      if (this.hitstop > 0) {
        this.hitstop--;
        return;
      }
      for (const e of this.buf) e.age++;
      this.buf = this.buf.filter((e) => e.age <= this.def.buffer);
      if (this.invulnT > 0) this.invulnT--;
      if (this.throwInvulnT > 0) this.throwInvulnT--;
      if (!['hitstun', 'juggle', 'dizzy'].includes(this.state)) this.stun = Math.max(0, this.stun - 0.12);
      this.prevX = this.x;
      const fn = this['st_' + this.state];
      if (fn) fn.call(this);
      this.physics();
      this.stateFrame++;
      // rastro de movimento
      const trailing = this.state === 'dashF' || this.state === 'dashB' || (this.state === 'attack' && this.move && this.move.kind !== 'normal') || this.tadalas > 0 || this.fumada > 0;
      if (trailing && this.frameCount % 2 === 0) {
        this.trail.push({ x: this.x, y: this.y, facing: this.facing, pose: FF.Anim.pose(this), life: 8 });
      }
      for (let i = this.trail.length - 1; i >= 0; i--) if (--this.trail[i].life <= 0) this.trail.splice(i, 1);
    }

    // ---------- estados ----------
    neutral() {
      const inp = this.input;
      this.faceOpponent();
      if (!this.battle.rounds.fighting) {
        this.vx = 0;
        if (this.state !== 'idle') this.setState('idle', true);
        return;
      }
      if (this.tryActions()) return;
      const d = inp.dir(this.facing);
      this.blocking = (d === 4 || d === 1) && this.threatened();
      const dash = inp.dash(this.facing);
      if (dash === 'F') {
        this.setState('dashF');
        FF.Audio.sfx('dash');
        this.battle.fx.dust(this.x, 0, 6, -this.facing);
        return;
      }
      if (dash === 'B') {
        this.setState('dashB');
        FF.Audio.sfx('dash');
        this.battle.fx.dust(this.x, 0, 6, this.facing);
        return;
      }
      if (d >= 7) {
        this.jumpDir = d === 7 ? -1 : d === 9 ? 1 : 0;
        this.setState('jumpSquat');
        this.vx = 0;
        return;
      }
      if (d <= 3) {
        if (this.state !== 'crouch') this.setState('crouch');
        this.vx = 0;
        return;
      }
      const sp = this.def.stats.spd / 95;
      if (d === 6) {
        if (this.state !== 'walkF') this.setState('walkF');
        this.vx = this.def.walkF * this.facing;
        this.walkPhase += 0.2 * sp;
      } else if (d === 4) {
        if (this.state !== 'walkB') this.setState('walkB');
        this.vx = -this.def.walkB * this.facing;
        this.walkPhase -= 0.17 * sp;
      } else {
        if (this.state !== 'idle') this.setState('idle');
        this.vx = 0;
      }
    }
    threatened() {
      const o = this.opp;
      const B = this.battle;
      if (o.state === 'attack' && Math.abs(o.x - this.x) < 520) return true;
      if (B.projectiles.some((p) => p.owner === o && Math.abs(p.x - this.x) < 650)) return true;
      if (B.standOf(o)) return true;
      return false;
    }
    st_idle() { this.neutral(); }
    st_walkF() { this.neutral(); }
    st_walkB() { this.neutral(); }
    st_crouch() { this.neutral(); }

    st_jumpSquat() {
      if (this.stateFrame >= this.def.jumpSquat) {
        this.airborne = true;
        this.vy = this.def.jumpV;
        this.vx = this.jumpDir * this.def.jumpX * this.facing;
        this.airAttacks = 0;
        this.airChain = 0;
        this.setState('air');
        FF.Audio.sfx('jump');
      }
    }
    st_air() {
      if (this.battle.rounds.fighting) this.tryActions();
    }
    st_land() {
      this.vx *= 0.7;
      if (this.stateFrame >= this.landRec) {
        this.setState(this.input.dir(this.facing) <= 3 ? 'crouch' : 'idle', true);
      }
    }
    st_dashF() {
      const d = this.def.dashF;
      const k = this.stateFrame / d.frames;
      this.vx = this.facing * d.speed * Math.pow(1 - k, 1.3);
      if (this.stateFrame >= d.frames) this.setState('idle', true);
    }
    st_dashB() {
      const d = this.def.dashB;
      const k = this.stateFrame / d.frames;
      this.vx = -this.facing * d.speed * Math.pow(1 - k, 1.3);
      if (this.stateFrame >= d.frames) this.setState('idle', true);
    }
    st_attack() {
      const m = this.move;
      if (!m) return this.endMove();
      this.curFrame = this.moveFrame;
      const f = this.curFrame;
      // "kara": botão parceiro logo após um normal vira agarrão / especial secundário / definitivo
      if (f <= 2 && m.kind === 'normal' && !this.airborne && this.moveBtn) {
        const pair = { lp: 'lk', lk: 'lp', mp: 'mk', mk: 'mp', hp: 'hk', hk: 'hp' }[this.moveBtn];
        if (pair && this.has(pair, 3)) {
          if (this.moveBtn === 'lp' || this.moveBtn === 'lk') {
            this.consume([pair]);
            return this.startMove(this.def.moves.throw);
          }
          if (this.moveBtn === 'mp' || this.moveBtn === 'mk') {
            this.consume([pair]);
            return this.startMove(FF.Chars.special(this.id, 'secondary', 'm'));
          }
          if (this.meter >= 100 && !this.battle.freeze && !this.superActive && !this.battle.standOf(this)) {
            this.consume([pair]);
            return FF.Specials.startSuper(this);
          }
        }
      }
      if (m.vel) {
        for (const v of m.vel) {
          if (f >= v.f0 && f <= v.f1) {
            if (v.vx != null) this.vx = v.vx * this.facing;
            if (v.vy != null && f === v.f0) {
              this.vy = v.vy;
              this.airborne = true;
            }
          }
        }
        if (!this.airborne && !m.vel.some((v) => f >= v.f0 && f <= v.f1)) this.vx *= 0.75;
      } else if (!this.airborne) this.vx *= 0.7;
      if (m.spawn && f === m.spawn.f) FF.Specials.spawnProjectile(this, m.spawn);
      if (m.anim === 'counterStance' && f % 3 === 0) this.battle.fx.code(this.x + this.facing * 40, this.y - 220, 1);
      // cancelamentos
      if (m.hits.length && (this.hitConfirmed || this.blockConfirmed) && m.cancel) {
        const h0 = m.hits[0].f0;
        const h1 = m.hits[m.hits.length - 1].f1;
        if (f >= h0 && f <= h1 + 10) {
          if (m.air) {
            if (this.hitConfirmed && this.airChain < 2) {
              const b = this.consume(['hp', 'hk', 'mp', 'mk', 'lp', 'lk']);
              if (b && this.def.moves['j' + b] !== m) {
                this.airChain++;
                this.startNormal(b);
                return;
              }
            }
          } else {
            const lvl = m.cancel === 'super' ? 'super' : 'special';
            if (this.tryActions(lvl)) return;
            if (m.chainable && this.chainCount < 3) {
              const b = this.consume(['mp', 'mk', 'lp', 'lk']);
              if (b) {
                this.chainCount++;
                const cc = this.chainCount;
                this.startNormal(b);
                this.chainCount = cc;
                return;
              }
            }
            if (m.cancel === 'chain' && m.level === 'medium' && this.chainCount < 4) {
              // médio → forte (combo alvo)
              const b = this.consume(['hp', 'hk']);
              if (b) {
                const cc = this.chainCount + 1;
                this.startNormal(b);
                this.chainCount = cc;
                return;
              }
            }
          }
        }
      }
      if (m.jumpCancel && this.hitConfirmed && f > m.hits[0].f0 && this.input.dir(this.facing) >= 7) {
        const d = this.input.dir(this.facing);
        this.jumpDir = d === 7 ? -1 : d === 9 ? 1 : 0;
        this.setState('jumpSquat', true);
        return;
      }
      this.moveFrame++;
      if (m.untilLand) {
        if (!this.airborne && this.moveFrame > 6) {
          this.landRec = m.landRec || 10;
          this.setState('land', true);
        }
      } else if (this.moveFrame >= m.total) {
        if (m.kind === 'throw' || m.kind === 'cmdgrab') this.throwDone = true;
        this.endMove();
      }
    }
    st_blockstun() {
      this.vx *= 0.82;
      if (--this.blockstun <= 0) {
        this.setState(this.input.dir(this.facing) <= 3 ? 'crouch' : 'idle', true);
      }
    }
    st_hitstun() {
      this.vx *= 0.84;
      if (--this.hitstun <= 0 && !this.airborne) {
        if (this.stun >= this.def.stunMax && !this.dizzyUsed && this.hp > 0) {
          this.dizzyUsed = true;
          this.dizzyT = 100;
          this.setState('dizzy', true);
          this.battle.fx.text(this.x, this.y - this.def.height - 70, 'ATORDOADO!', '#FFC531', 44, 70);
          return;
        }
        this.setState('idle', true);
      }
    }
    st_juggle() {}
    st_knockdown() {
      this.vx *= 0.8;
      if (this.stateFrame >= 34 && this.hp > 0) {
        this.setState('wakeup', true);
      }
    }
    st_wakeup() {
      if (this.stateFrame >= 18) {
        this.invulnT = 3;
        this.setState('idle', true);
      }
    }
    st_dizzy() {
      this.dizzyT--;
      if (this.input.cur().pressed.length) this.dizzyT -= 3;
      if (this.frameCount % 2 === 0) this.battle.fx.stars(this.x, this.y - this.def.height - 20, this.frameCount);
      if (this.dizzyT <= 0) {
        this.stun = 0;
        this.setState('idle', true);
      }
    }
    st_throw() {
      FF.Specials.throwUpdate(this);
    }
    st_thrown() {}
    st_super() {
      FF.Specials.superUpdate(this);
    }
    st_intro() {
      this.vx = 0;
    }
    st_win() {
      this.vx *= 0.8;
    }
    st_lose() {
      this.vx *= 0.8;
    }

    // ---------- física ----------
    physics() {
      if (this.state === 'thrown') return;
      if (this.airborne) {
        let g = this.def.gravity;
        if (this.state === 'juggle') g *= 0.92;
        this.vy += g;
        if (this.floatT > 0) {
          this.floatT--;
          this.vy = Math.min(this.vy, 0.6);
        }
        this.x += this.vx;
        this.y += this.vy;
        if (this.y >= 0) {
          this.y = 0;
          this.vy = 0;
          this.airborne = false;
          this.onLand();
        }
      } else {
        this.x += this.vx;
      }
    }
    onLand() {
      const B = this.battle;
      const s = this.state;
      if (s === 'air') {
        this.landRec = 4;
        this.setState('land', true);
        FF.Audio.sfx('land', 0.6);
        B.fx.dust(this.x, 0, 4);
      } else if (s === 'attack') {
        this.landRec = this.move && this.move.untilLand ? this.move.landRec || 10 : 3;
        this.setState('land', true);
        B.fx.dust(this.x, 0, 4);
      } else if (s === 'juggle') {
        if (this.juggleKD || this.hp <= 0) {
          this.setState('knockdown', true);
          this.vx *= 0.4;
          B.cam.shake(10);
          FF.Audio.sfx('land', 1);
          B.fx.dust(this.x, 0, 14);
        } else {
          this.landRec = 6;
          this.setState('land', true);
        }
      } else if (s === 'hitstun' || s === 'super' || s === 'dizzy') {
        B.fx.dust(this.x, 0, 3);
      } else {
        this.setState('land', true);
      }
    }
  }

  return Fighter;
})();
