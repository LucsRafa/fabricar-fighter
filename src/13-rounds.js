// ============================================================
// GERENCIAMENTO DE ROUNDS — melhor de três, cronômetro de 99 s,
// K.O., PERFECT, tempo esgotado e round de desempate
// ============================================================
FF.Rounds = (function () {
  const ROUND_TIME = 99 * 60;

  class Rounds {
    constructor(B) {
      this.B = B;
      this.wins = [0, 0];
      this.round = 0;
      this.phase = 'none';
      this.t = 0;
      this.timer = ROUND_TIME;
      this.fighting = false;
      this.slow = false;
      this.matchOver = false;
      this.lastDraw = false;
      this.koLoser = null;
      this.winner = -1;
      this.history = [];
    }
    timerDisplay() {
      if (this.B.training) return '∞';
      return Math.max(0, Math.ceil(this.timer / 60));
    }
    label() {
      if (this.lastDraw) return 'DESEMPATE';
      if (this.wins[0] === 1 && this.wins[1] === 1) return 'FINAL ROUND';
      return `ROUND ${this.round}`;
    }
    startRound() {
      const B = this.B;
      this.round++;
      this.phase = 'intro';
      this.t = 0;
      this.timer = ROUND_TIME;
      this.fighting = false;
      this.slow = false;
      this.koLoser = null;
      this.winner = -1;
      B.resetPositions();
      if (B.training) {
        this.phase = 'fight';
        this.fighting = true;
        B.f.forEach((f) => f.setState('idle', true));
      }
    }
    update() {
      const B = this.B;
      this.t++;
      switch (this.phase) {
        case 'intro':
          if (this.t === 8 && this.round === 1) {
            const f = B.f[0];
            f.say(f.def.lines.intro);
          }
          if (this.t === 30) {
            B.message(this.label(), -1, 'big', 70);
            FF.Audio.announce(this.label() === 'DESEMPATE' ? 'Extra round' : this.label().replace('ROUND', 'Round'));
          }
          if (this.t === 105) {
            B.message('FIGHT!', -1, 'fight', 45);
            FF.Audio.announce('Fight!');
          }
          if (this.t === 110) {
            this.phase = 'fight';
            this.fighting = true;
            B.f.forEach((f) => f.setState('idle', true));
          }
          break;
        case 'fight':
          if (!B.training && !B.freeze) {
            this.timer--;
            if (this.timer <= 0) this.timeOver();
          }
          break;
        case 'ko':
          if (this.t === 2) {
            // K.O. duplo?
            const [a, b] = B.f;
            if (a.hp <= 0 && b.hp <= 0) this.winner = -2;
          }
          if (this.t === 70) this.slow = false;
          if (this.t === 90 && this.winner >= 0) {
            const w = B.f[this.winner];
            if (w.hp >= w.def.hp - 0.001) {
              B.message('PERFECT', -1, 'big', 80);
              FF.Audio.announce('Perfect');
            }
          }
          if (this.t === 120 && this.winner >= 0) {
            const w = B.f[this.winner];
            if (w.isNeutral() || w.state === 'land' || w.state === 'idle' || w.state === 'blockstun' || w.state === 'hitstun' || w.state === 'attack') w.setState('win', true);
          }
          if (this.t >= 210) this.endRound();
          break;
        case 'timeover':
          if (this.t === 90) {
            if (this.winner >= 0) {
              B.f[this.winner].setState('win', true);
              B.f[1 - this.winner].setState('lose', true);
            } else B.f.forEach((f) => f.setState('lose', true));
          }
          if (this.t >= 200) this.endRound();
          break;
        case 'matchEnd':
          if (this.t >= 260) B.finishMatch(this.winner);
          break;
      }
    }
    onKO(loser, winner) {
      const B = this.B;
      if (B.training) {
        loser.hp = 0;
        B.message('K.O.', -1, 'ko', 50);
        B.trainingKO = 70;
        return;
      }
      if (this.phase !== 'fight') return;
      this.phase = 'ko';
      this.t = 0;
      this.fighting = false;
      this.slow = true;
      this.koLoser = loser;
      this.winner = winner.slot;
      B.message('K.O.', -1, 'ko', 90);
      FF.Audio.sfx('ko');
      FF.Audio.announce('K.O.');
      B.cam.shake(26);
      B.fx.flash = 8;
      B.hype = 1;
    }
    timeOver() {
      const B = this.B;
      this.phase = 'timeover';
      this.t = 0;
      this.fighting = false;
      const [a, b] = B.f;
      const diff = a.hp - b.hp;
      this.winner = Math.abs(diff) < 0.01 ? -2 : diff > 0 ? 0 : 1;
      B.message('TEMPO ESGOTADO', -1, 'big', 80);
      FF.Audio.announce('Time');
    }
    endRound() {
      const B = this.B;
      const draw = this.winner < 0;
      this.history.push(draw ? 'draw' : this.winner);
      this.lastDraw = draw;
      if (!draw) {
        this.wins[this.winner]++;
        B.winPop = { side: this.winner, t: 24 };
      }
      if (draw) B.message('EMPATE', -1, 'big', 60);
      const champ = this.wins[0] >= 2 ? 0 : this.wins[1] >= 2 ? 1 : -1;
      // segurança: após 9 rounds decide pela soma de vitórias
      if (champ < 0 && this.round >= 9) {
        this.matchEnd(this.wins[0] >= this.wins[1] ? 0 : 1);
        return;
      }
      if (champ >= 0) this.matchEnd(champ);
      else this.startRound();
    }
    matchEnd(w) {
      const B = this.B;
      this.phase = 'matchEnd';
      this.t = 0;
      this.winner = w;
      this.matchOver = true;
      const wf = B.f[w];
      wf.setState('win', true);
      wf.say(wf.def.lines.win);
      if (B.mode === 'cpu') {
        const youWin = w === 0;
        B.message(youWin ? 'YOU WIN' : 'YOU LOSE', -1, 'result', 240);
        FF.Audio.announce(youWin ? 'You win' : 'You lose');
      } else {
        B.message(`JOGADOR ${w + 1} VENCE`, -1, 'result', 240);
        FF.Audio.announce(`Player ${w + 1} wins`);
      }
      FF.Audio.playMusic('victory');
    }
  }

  return Rounds;
})();
