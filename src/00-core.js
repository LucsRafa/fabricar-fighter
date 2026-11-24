// ============================================================
// CORE — constantes, utilitários e configurações persistentes
// ============================================================
'use strict';
const FF = (window.FF = window.FF || {});

FF.W = 1920;
FF.H = 1080;
FF.GROUND_Y = 950;      // linha do chão na tela (zoom 1)
FF.STAGE_W = 2700;      // largura do mundo
FF.STEP = 1000 / 60;    // passo fixo da lógica (60 Hz)
FF.JUGGLE_LIMIT = 4;

FF.U = {
  clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
  lerp: (a, b, t) => a + (b - a) * t,
  rand: (a, b) => a + Math.random() * (b - a),
  randi: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  choice: (arr) => arr[Math.floor(Math.random() * arr.length)],
  chance: (p) => Math.random() < p,
  easeOut: (t) => 1 - Math.pow(1 - t, 3),
  easeIn: (t) => t * t * t,
  easeInOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  D2R: Math.PI / 180,
};

// respeita "reduzir movimento" do sistema
FF.reduced = (() => {
  try {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (e) {
    return false;
  }
})();
// aproxima um valor do alvo (suavização exponencial ≈ ease-out)
FF.approach = (cur, target, k) => (cur == null ? target : cur + (target - cur) * k);

FF.FONT_D = '"Bungee", Impact, "Arial Black", sans-serif';
FF.FONT_UI = '"Chakra Petch", "Trebuchet MS", Arial, sans-serif';

FF.C = {
  night: '#12163A',
  ink: '#1A1033',
  wall: '#232A5C',
  cyan: '#4DF3E8',
  teal: '#19A7A0',
  blue: '#2F7BFF',
  red: '#E8323C',
  gold: '#FFC531',
  violet: '#9B6BFF',
  paper: '#F3F6FF',
  mute: '#8C93C9',
};

FF.Settings = {
  data: null,
  defaults() {
    return {
      music: 0.55,
      sfx: 0.85,
      voice: true,
      shake: !FF.reduced,
      graphics: '3d',
      difficulty: 'normal',
      bindings: FF.Input.defaultBindings(),
    };
  },
  load() {
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem('fabricar-fighter-v1') || 'null');
    } catch (e) {
      saved = null;
    }
    this.data = Object.assign(this.defaults(), saved || {});
    const b = this.data.bindings;
    if (!b || !b.p1 || !b.p2 || !b.p1.lp) this.data.bindings = FF.Input.defaultBindings();
    else {
      const def = FF.Input.defaultBindings();
      const used = new Set();
      for (const p of ['p1', 'p2']) for (const a in b[p]) (b[p][a] || []).forEach((c) => used.add(c));
      for (const p of ['p1', 'p2'])
        for (const a of FF.Input.ACTIONS)
          if (!b[p][a]) b[p][a] = def[p][a].filter((c) => !used.has(c));
    }
  },
  save() {
    try {
      localStorage.setItem('fabricar-fighter-v1', JSON.stringify(this.data));
    } catch (e) {
      /* armazenamento indisponível: segue sem persistir */
    }
  },
};

// Texto com contorno (usado em HUD, menus e anúncios)
FF.text = function (ctx, str, x, y, opt) {
  const o = Object.assign(
    { size: 40, font: FF.FONT_D, color: '#fff', stroke: FF.C.ink, lw: 8, align: 'center', base: 'middle', alpha: 1, weight: '' },
    opt || {}
  );
  ctx.save();
  ctx.globalAlpha *= o.alpha;
  ctx.font = `${o.weight ? o.weight + ' ' : ''}${o.size}px ${o.font}`;
  ctx.textAlign = o.align;
  ctx.textBaseline = o.base;
  if (o.lw > 0) {
    ctx.lineJoin = 'round';
    ctx.strokeStyle = o.stroke;
    ctx.lineWidth = o.lw;
    ctx.strokeText(str, x, y);
  }
  ctx.fillStyle = o.color;
  ctx.fillText(str, x, y);
  ctx.restore();
};
