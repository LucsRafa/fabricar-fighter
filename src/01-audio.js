// ============================================================
// ÁUDIO — síntese WebAudio (música, efeitos) + falas via Web Speech
// Nada de arquivos externos: tudo é gerado no navegador.
// ============================================================
FF.Audio = (function () {
  const A = {
    ctx: null,
    master: null,
    music: null,
    sfxBus: null,
    noise: null,
    track: null,
    trackName: null,
    nextTime: 0,
    step: 0,
    timer: null,
    voices: [],
  };

  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

  A.init = function () {
    if (A.ctx) {
      if (A.ctx.state === 'suspended') A.ctx.resume().catch(() => {});
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      A.ctx = new AC();
    } catch (e) {
      A.ctx = null;
      return;
    }
    const c = A.ctx;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    A.master = c.createGain();
    A.master.gain.value = 0.9;
    A.master.connect(comp);
    comp.connect(c.destination);
    A.music = c.createGain();
    A.music.connect(A.master);
    A.sfxBus = c.createGain();
    A.sfxBus.connect(A.master);
    const len = c.sampleRate;
    A.noise = c.createBuffer(1, len, c.sampleRate);
    const d = A.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    A.applyVolumes();
    A.timer = setInterval(schedule, 25);
    try {
      if (window.speechSynthesis) {
        const load = () => (A.voices = window.speechSynthesis.getVoices() || []);
        load();
        window.speechSynthesis.onvoiceschanged = load;
      }
    } catch (e) {
      /* sem vozes */
    }
  };

  A.applyVolumes = function () {
    if (!A.ctx) return;
    const s = FF.Settings.data;
    A.music.gain.value = s.music * 0.42;
    A.sfxBus.gain.value = s.sfx;
  };

  // ---------- instrumentos ----------
  function env(g, t, a, peak, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  function osc(type, freq, t, dur, peak, dest, opt) {
    const c = A.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (opt && opt.to) o.frequency.exponentialRampToValueAtTime(Math.max(20, opt.to), t + (opt.glide || dur));
    if (opt && opt.detune) o.detune.value = opt.detune;
    env(g, t, (opt && opt.a) || 0.005, peak, dur);
    let node = o;
    if (opt && opt.lp) {
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = opt.lp;
      f.Q.value = opt.q || 1;
      o.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  function noise(t, dur, peak, dest, type, freq, q) {
    const c = A.ctx;
    const s = c.createBufferSource();
    s.buffer = A.noise;
    const f = c.createBiquadFilter();
    f.type = type || 'highpass';
    f.frequency.value = freq || 1000;
    f.Q.value = q || 0.8;
    const g = c.createGain();
    env(g, t, 0.002, peak, dur);
    s.connect(f);
    f.connect(g);
    g.connect(dest);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.05);
  }
  const kick = (t, v) => osc('sine', 150, t, 0.28, 0.9 * v, A.music, { to: 42, glide: 0.18 });
  const snare = (t, v) => {
    noise(t, 0.16, 0.45 * v, A.music, 'bandpass', 1800, 0.7);
    osc('triangle', 220, t, 0.1, 0.25 * v, A.music, { to: 140 });
  };
  const hat = (t, v) => noise(t, 0.045, 0.16 * v, A.music, 'highpass', 7000);

  // ---------- trilhas (sequenciador de 16 passos) ----------
  // chords: [raiz em semitons, menor?]
  const TRACKS = {
    menu: {
      bpm: 100, root: 45,
      chords: [[0, 1], [-4, 0], [3, 0], [-2, 0]],
      kick: 'x.......x.......', snare: '....x.......x...', hat: '..x...x...x...x.',
      bass: [0, null, null, 0, null, null, 12, null, 0, null, null, 7, null, null, 12, null],
      arp: [0, 2, 1, 3, 2, 1, 0, 2, 0, 2, 1, 3, 2, 3, 1, 2],
      arpOct: 24, arpType: 'triangle', arpVol: 0.06,
      lead: null,
    },
    select: {
      bpm: 128, root: 43,
      chords: [[0, 0], [5, 0], [-3, 1], [-5, 0]],
      kick: 'x...x...x...x...', snare: '....x.......x..x', hat: 'xxx.xxx.xxx.xxx.',
      bass: [0, null, 12, null, 0, 0, 12, null, 0, null, 12, null, 0, 7, 12, 7],
      arp: [0, 1, 2, 3, 2, 1, 0, 1, 0, 1, 2, 3, 2, 1, 0, 3],
      arpOct: 24, arpType: 'square', arpVol: 0.035,
      lead: null,
    },
    battle: {
      bpm: 152, root: 40,
      chords: [[0, 1], [0, 1], [-4, 0], [-2, 0], [0, 1], [0, 1], [3, 0], [-2, 0]],
      kick: 'x..x..x.x..x..x.', snare: '....x.......x...', hat: 'x.xxx.xxx.xxx.xx',
      bass: [0, 0, 12, 0, 0, 12, 0, 10, 0, 0, 12, 0, 7, 0, 10, 12],
      arp: [0, 2, 1, 2, 3, 2, 1, 2, 0, 2, 1, 2, 3, 2, 1, 3],
      arpOct: 24, arpType: 'square', arpVol: 0.028,
      lead: [
        12, null, 15, null, 19, null, 17, 15, 14, null, 12, null, 10, null, 12, null,
        12, null, 15, null, 19, null, 22, null, 24, null, 22, 19, 17, null, 15, null,
      ],
    },
    victory: {
      bpm: 120, root: 48,
      chords: [[0, 0], [5, 0], [7, 0], [0, 0]],
      kick: 'x.......x...x...', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.',
      bass: [0, null, 7, null, 12, null, 7, null, 0, null, 7, null, 12, 12, 7, null],
      arp: [0, 1, 2, 3, 0, 1, 2, 3, 3, 2, 1, 0, 3, 2, 1, 0],
      arpOct: 24, arpType: 'triangle', arpVol: 0.07,
      lead: null,
    },
  };

  function chordTones(ch) {
    const third = ch[1] ? 3 : 4;
    return [0, third, 7, 12];
  }

  function schedule() {
    if (!A.ctx || !A.track) return;
    const tr = A.track;
    const stepDur = 60 / tr.bpm / 4;
    while (A.nextTime < A.ctx.currentTime + 0.12) {
      const s = A.step % 16;
      const bar = Math.floor(A.step / 16) % tr.chords.length;
      const ch = tr.chords[bar];
      const t = A.nextTime;
      const root = tr.root + ch[0];
      if (tr.kick[s] === 'x') kick(t, 1);
      if (tr.snare[s] === 'x') snare(t, 1);
      if (tr.hat[s] === 'x') hat(t, s % 4 === 0 ? 1 : 0.6);
      const b = tr.bass[s];
      if (b !== null && b !== undefined) osc('sawtooth', midi(root + b), t, stepDur * 1.6, 0.16, A.music, { lp: 700, q: 4 });
      const ai = tr.arp[s];
      if (ai !== null && ai !== undefined) {
        const tones = chordTones(ch);
        osc(tr.arpType, midi(root + tr.arpOct + tones[ai]), t, stepDur * 0.9, tr.arpVol, A.music, { lp: 3200 });
      }
      if (tr.lead) {
        const li = tr.lead[(A.step % (tr.lead.length))];
        if (li !== null && li !== undefined && Math.floor(A.step / 32) % 2 === 1)
          osc('square', midi(tr.root + 12 + li), t, stepDur * 1.8, 0.05, A.music, { lp: 2400, detune: 6 });
      }
      A.nextTime += stepDur;
      A.step++;
    }
  }

  A.playMusic = function (name) {
    if (A.trackName === name) return;
    A.trackName = name;
    A.track = TRACKS[name] || null;
    A.step = 0;
    if (A.ctx) A.nextTime = A.ctx.currentTime + 0.08;
  };
  A.stopMusic = function () {
    A.track = null;
    A.trackName = null;
  };

  // ---------- efeitos ----------
  A.sfx = function (name, v) {
    if (!A.ctx) return;
    const t = A.ctx.currentTime + 0.005;
    const d = A.sfxBus;
    v = v == null ? 1 : v;
    switch (name) {
      case 'punchL':
        noise(t, 0.06, 0.5 * v, d, 'highpass', 1500);
        osc('sine', 190, t, 0.09, 0.6 * v, d, { to: 90 });
        break;
      case 'punchM':
        noise(t, 0.09, 0.6 * v, d, 'bandpass', 1100, 0.9);
        osc('sine', 160, t, 0.14, 0.8 * v, d, { to: 70 });
        break;
      case 'punchH':
        noise(t, 0.16, 0.75 * v, d, 'bandpass', 700, 0.8);
        osc('sine', 130, t, 0.22, 1 * v, d, { to: 45 });
        osc('square', 70, t, 0.12, 0.2 * v, d, { to: 40, lp: 400 });
        break;
      case 'kickL':
        noise(t, 0.07, 0.45 * v, d, 'lowpass', 2200);
        osc('sine', 150, t, 0.11, 0.7 * v, d, { to: 70 });
        break;
      case 'kickM':
        noise(t, 0.11, 0.6 * v, d, 'lowpass', 1600);
        osc('sine', 125, t, 0.17, 0.85 * v, d, { to: 55 });
        break;
      case 'kickH':
        noise(t, 0.2, 0.8 * v, d, 'lowpass', 1200);
        osc('sine', 110, t, 0.28, 1 * v, d, { to: 38 });
        break;
      case 'whoosh':
        noise(t, 0.12, 0.18 * v, d, 'bandpass', 900, 2.5);
        break;
      case 'pock':
        // batida seca da raquete de madeira na bolinha
        osc('triangle', 820, t, 0.07, 0.55 * v, d, { to: 520 });
        noise(t, 0.04, 0.35 * v, d, 'bandpass', 1800, 3);
        break;
      case 'whooshH':
        noise(t, 0.2, 0.26 * v, d, 'bandpass', 600, 2);
        break;
      case 'block':
        osc('square', 1300, t, 0.05, 0.12 * v, d, { to: 700 });
        noise(t, 0.05, 0.3 * v, d, 'highpass', 4000);
        break;
      case 'imune':
        osc('triangle', 1800, t, 0.35, 0.22 * v, d, { to: 1500 });
        osc('triangle', 2700, t, 0.3, 0.12 * v, d);
        break;
      case 'jump':
        osc('sine', 260, t, 0.1, 0.12 * v, d, { to: 420 });
        break;
      case 'land':
        noise(t, 0.06, 0.2 * v, d, 'lowpass', 500);
        break;
      case 'dash':
        noise(t, 0.16, 0.25 * v, d, 'bandpass', 1300, 1.5);
        break;
      case 'throw':
        osc('sine', 90, t, 0.35, 1 * v, d, { to: 35 });
        noise(t, 0.3, 0.6 * v, d, 'lowpass', 800);
        break;
      case 'ko':
        osc('sine', 110, t, 1.4, 1 * v, d, { to: 28, glide: 1.2 });
        noise(t, 1, 0.7 * v, d, 'lowpass', 600);
        osc('sawtooth', 220, t, 0.9, 0.15 * v, d, { to: 55, lp: 900 });
        break;
      case 'counter':
        osc('square', 880, t, 0.08, 0.15 * v, d);
        osc('square', 1320, t + 0.08, 0.12, 0.15 * v, d);
        break;
      case 'ready':
        [0, 4, 7, 12].forEach((n, i) => osc('square', midi(72 + n), t + i * 0.06, 0.12, 0.1 * v, d, { lp: 3000 }));
        break;
      case 'projectile':
        osc('sawtooth', 600, t, 0.25, 0.15 * v, d, { to: 300, lp: 2500 });
        noise(t, 0.2, 0.15 * v, d, 'bandpass', 2400, 2);
        break;
      case 'wave':
        osc('sine', 80, t, 0.5, 0.9 * v, d, { to: 40 });
        noise(t, 0.45, 0.5 * v, d, 'lowpass', 500);
        break;
      case 'superStart':
        osc('sawtooth', 110, t, 0.7, 0.25 * v, d, { to: 880, glide: 0.6, lp: 3000 });
        noise(t, 0.6, 0.3 * v, d, 'bandpass', 2000, 1);
        break;
      case 'laptop':
        osc('square', 520, t, 0.06, 0.12 * v, d);
        osc('square', 780, t + 0.07, 0.08, 0.12 * v, d);
        break;
      case 'type':
        noise(t, 0.02, 0.25 * v, d, 'highpass', 3500);
        break;
      case 'cladiio':
        for (let i = 0; i < 10; i++)
          osc('square', midi(64 + ((i * 7) % 24)), t + i * 0.035, 0.05, 0.07 * v, d, { lp: 5000 });
        osc('sine', 60, t, 0.6, 0.5 * v, d, { to: 120 });
        break;
      case 'cladiioHit':
        osc('square', 1600, t, 0.12, 0.18 * v, d, { to: 120, lp: 6000 });
        noise(t, 0.1, 0.5 * v, d, 'bandpass', 1400, 1);
        osc('sine', 140, t, 0.16, 0.8 * v, d, { to: 50 });
        break;
      case 'gulp':
        osc('sine', 300, t, 0.16, 0.25 * v, d, { to: 120 });
        osc('sine', 260, t + 0.18, 0.16, 0.25 * v, d, { to: 100 });
        break;
      case 'tadalas':
        osc('sawtooth', 55, t, 1.1, 0.35 * v, d, { to: 440, glide: 0.9, lp: 1800 });
        osc('square', 110, t + 0.5, 0.6, 0.12 * v, d, { to: 220, lp: 1200 });
        noise(t, 0.9, 0.3 * v, d, 'lowpass', 900);
        break;
      case 'heartbeat':
        osc('sine', 70, t, 0.12, 0.5 * v, d, { to: 45 });
        osc('sine', 70, t + 0.16, 0.12, 0.4 * v, d, { to: 45 });
        break;
      case 'inhale':
        noise(t, 0.9, 0.22 * v, d, 'bandpass', 900, 0.6);
        osc('sine', 120, t + 0.1, 0.8, 0.08 * v, d, { to: 240 });
        break;
      case 'exhale':
        noise(t, 1.2, 0.35 * v, d, 'lowpass', 1400);
        break;
      case 'yawn':
        osc('sawtooth', 320, t, 0.7, 0.08 * v, d, { to: 140, lp: 900 });
        break;
      case 'snore':
        noise(t, 0.5, 0.25 * v, d, 'lowpass', 300);
        osc('sawtooth', 70, t, 0.45, 0.08 * v, d, { to: 55, lp: 400 });
        break;
      case 'stinger':
        osc('sawtooth', 110, t, 0.5, 0.2 * v, d, { lp: 1500 });
        osc('sawtooth', 165, t, 0.5, 0.15 * v, d, { lp: 1500 });
        noise(t, 0.3, 0.25 * v, d, 'lowpass', 900);
        break;
      case 'ui':
        osc('square', 660, t, 0.04, 0.07 * v, d, { lp: 3000 });
        break;
      case 'ok':
        osc('square', 660, t, 0.05, 0.08 * v, d);
        osc('square', 990, t + 0.05, 0.08, 0.08 * v, d);
        break;
      case 'back':
        osc('square', 440, t, 0.06, 0.07 * v, d, { to: 300 });
        break;
      case 'crowd':
        noise(t, 0.9, 0.12 * v, d, 'bandpass', 900, 0.4);
        break;
      default:
        break;
    }
  };

  // ---------- vozes (Web Speech API nativa do navegador) ----------
  function pickVoice(lang) {
    const vs = A.voices || [];
    return vs.find((x) => x.lang && x.lang.toLowerCase().startsWith(lang)) || null;
  }
  A.speak = function (text, opt) {
    if (!FF.Settings.data.voice) return;
    const ss = window.speechSynthesis;
    if (!ss || typeof SpeechSynthesisUtterance === 'undefined') return;
    try {
      const o = opt || {};
      const u = new SpeechSynthesisUtterance(text);
      const lang = o.lang || 'pt-BR';
      u.lang = lang;
      const v = pickVoice(lang.slice(0, 2).toLowerCase());
      if (v) u.voice = v;
      u.pitch = o.pitch == null ? 1 : o.pitch;
      u.rate = o.rate == null ? 1.1 : o.rate;
      u.volume = Math.min(1, FF.Settings.data.sfx + 0.1);
      if (o.interrupt !== false) ss.cancel();
      ss.speak(u);
    } catch (e) {
      /* fala indisponível: legenda continua na tela */
    }
  };
  A.hush = function () {
    try {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    } catch (e) {
      /* nada */
    }
  };
  A.announce = function (text) {
    A.sfx('stinger');
    A.speak(text, { lang: 'en-US', pitch: 0.55, rate: 0.95 });
  };

  return A;
})();
