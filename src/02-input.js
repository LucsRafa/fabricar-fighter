// ============================================================
// GERENCIAMENTO DE COMANDOS — teclado, Gamepad API, histórico,
// leitura de meia-lua / quarto de lua / shoryuken, dash e menus
// ============================================================
FF.Input = (function () {
  const BUTTONS = ['lp', 'mp', 'hp', 'lk', 'mk', 'hk'];
  // teclas dedicadas: agarrão, especial secundário, definitivo e os 4 especiais (sem combinação)
  const EXTRA = ['grab', 'sec', 'sup', 'sp1', 'sp2', 'sp3', 'sp4'];
  const ACTIONS = ['left', 'right', 'up', 'down'].concat(BUTTONS, EXTRA);
  const keys = new Set();
  const menuQueue = [];
  let rebindCb = null;
  let pads = [];
  const padPrev = {};
  const padRepeat = {};

  const I = { BUTTONS, EXTRA, ACTIONS, keys, mouse: { x: 0, y: 0, click: false, moved: false } };

  I.defaultBindings = function () {
    return {
      p1: {
        left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'],
        lp: ['KeyU'], mp: ['KeyI'], hp: ['KeyO'], lk: ['KeyJ'], mk: ['KeyK'], hk: ['KeyL'],
        grab: ['KeyH'], sec: ['KeyY'], sup: ['Space'],
        sp1: ['KeyQ'], sp2: ['KeyE'], sp3: ['KeyR'], sp4: ['KeyF'],
      },
      p2: {
        left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'],
        lp: ['Numpad4', 'Insert'], mp: ['Numpad5', 'Home'], hp: ['Numpad6', 'PageUp'],
        lk: ['Numpad1', 'Delete'], mk: ['Numpad2', 'End'], hk: ['Numpad3', 'PageDown'],
        grab: ['Numpad7'], sec: ['Numpad8'], sup: ['Numpad9'],
        sp1: ['Numpad0'], sp2: ['NumpadDecimal'], sp3: ['NumpadAdd'], sp4: ['NumpadSubtract'],
      },
    };
  };

  I.keyLabel = function (code) {
    if (!code) return '—';
    return code
      .replace('Key', '')
      .replace('Digit', '')
      .replace('Arrow', '')
      .replace('Numpad', 'Num ')
      .replace('Left', '←').replace('Right', '→').replace('Up', '↑').replace('Down', '↓')
      .replace('Page↑', 'PgUp').replace('Page↓', 'PgDn').replace('Space', 'Espaço').replace('Decimal', ',').replace('Add', '+').replace('Subtract', '−');
  };

  const PREVENT = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab', 'F1', 'F2', 'F3', 'F4', 'Backspace']);

  I.attach = function (canvas) {
    window.addEventListener('keydown', (e) => {
      if (PREVENT.has(e.code)) e.preventDefault();
      if (rebindCb) {
        e.preventDefault();
        const cb = rebindCb;
        rebindCb = null;
        cb(e.code);
        return;
      }
      if (!e.repeat) menuQueue.push(e.code);
      keys.add(e.code);
      FF.Audio.init();
    });
    window.addEventListener('keyup', (e) => keys.delete(e.code));
    window.addEventListener('blur', () => keys.clear());
    const toCanvas = (e) => {
      const r = canvas.getBoundingClientRect();
      I.mouse.x = ((e.clientX - r.left) / r.width) * FF.W;
      I.mouse.y = ((e.clientY - r.top) / r.height) * FF.H;
    };
    canvas.addEventListener('mousemove', (e) => {
      toCanvas(e);
      I.mouse.moved = true;
    });
    canvas.addEventListener('mousedown', (e) => {
      toCanvas(e);
      I.mouse.click = true;
      FF.Audio.init();
    });
    window.addEventListener('gamepadconnected', () => FF.Audio.init());
  };

  I.waitRebind = function (cb) {
    rebindCb = cb;
  };
  I.cancelRebind = function () {
    rebindCb = null;
  };
  I.isRebinding = () => !!rebindCb;

  // ---------- Gamepad API ----------
  I.pollPads = function () {
    let list = [];
    try {
      list = navigator.getGamepads ? Array.from(navigator.getGamepads()) : [];
    } catch (e) {
      list = [];
    }
    pads = list.filter((p) => p && p.connected);
  };
  I.padCount = () => pads.length;

  function padRaw(gp) {
    const b = (i) => !!(gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.5));
    const ax = gp.axes[0] || 0;
    const ay = gp.axes[1] || 0;
    const r = {
      left: b(14) || ax < -0.5,
      right: b(15) || ax > 0.5,
      up: b(12) || ay < -0.55,
      down: b(13) || ay > 0.55,
      lp: b(2), mp: b(3), hp: b(5), lk: b(0), mk: b(1), hk: b(7),
      start: b(9), select: b(8),
    };
    r.grab = b(4); // LB = agarrão
    r.sup = b(6);  // LT = especial definitivo
    r.sec = b(10); // L3 = especial secundário
    r.sp1 = b(11); // R3 = especial 1
    return r;
  }
  I.padState = function (index) {
    const gp = pads.find((p) => p.index === index) || (index < pads.length ? pads[index] : null);
    return gp ? padRaw(gp) : null;
  };
  I.anyPadState = function () {
    const out = {};
    pads.forEach((gp) => {
      const r = padRaw(gp);
      for (const k in r) out[k] = out[k] || r[k];
    });
    return out;
  };

  // ---------- eventos de menu (teclado + controles + mouse) ----------
  const MENU_KEYS = {
    up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'], left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'],
    ok: ['Enter', 'Space', 'KeyU', 'KeyJ', 'NumpadEnter'], back: ['Escape', 'Backspace'],
  };
  I.menuEvents = function () {
    const ev = [];
    while (menuQueue.length) {
      const code = menuQueue.shift();
      for (const k in MENU_KEYS) if (MENU_KEYS[k].includes(code)) ev.push({ type: k, src: 'kb', code, player: playerForCode(code) });
      ev.push({ type: 'key', code, src: 'kb', player: playerForCode(code) });
    }
    pads.forEach((gp, slot) => {
      const r = padRaw(gp);
      const prev = padPrev[gp.index] || {};
      const rep = padRepeat[gp.index] || (padRepeat[gp.index] = {});
      const edge = (k, type) => {
        if (r[k] && !prev[k]) {
          ev.push({ type, src: 'pad', player: slot });
          rep[k] = 0;
        } else if (r[k] && ['up', 'down', 'left', 'right'].includes(k)) {
          rep[k] = (rep[k] || 0) + 1;
          if (rep[k] > 22 && rep[k] % 6 === 0) ev.push({ type, src: 'pad', player: slot });
        }
      };
      edge('up', 'up'); edge('down', 'down'); edge('left', 'left'); edge('right', 'right');
      edge('lk', 'ok'); edge('mk', 'back'); edge('grab', 'grabBtn'); edge('start', 'pause'); edge('select', 'select');
      padPrev[gp.index] = r;
    });
    return ev;
  };
  function playerForCode(code) {
    const b = FF.Settings.data.bindings;
    for (const a of ACTIONS) {
      if (b.p1[a] && b.p1[a].includes(code)) return 0;
      if (b.p2[a] && b.p2[a].includes(code)) return 1;
    }
    if (code === 'Enter' || code === 'Space') return 0;
    if (code === 'NumpadEnter') return 1;
    return -1;
  }
  I.consumeClick = function () {
    const c = I.mouse.click;
    I.mouse.click = false;
    return c;
  };

  // numpad relativo ao lado do personagem (6 = frente, 4 = trás)
  I.rel = function (fr, facing) {
    const fwd = fr.x * facing;
    if (fr.y > 0) return fwd < 0 ? 1 : fwd > 0 ? 3 : 2;
    if (fr.y < 0) return fwd < 0 ? 7 : fwd > 0 ? 9 : 8;
    return fwd < 0 ? 4 : fwd > 0 ? 6 : 5;
  };

  // ============================================================
  // PlayerInput — um por jogador (teclado / controle / IA)
  // ============================================================
  class PlayerInput {
    constructor(slot) {
      this.slot = slot;
      this.raw = {};
      this.prev = {};
      this.hist = [];
      this.log = [];
      this.virtual = null; // IA escreve aqui
      this.useKeyboard = true;
      this.padMode = 'slot'; // 'slot' | 'any' | 'none'
    }
    sample(facing) {
      let r = {};
      if (this.virtual) {
        r = this.virtual.out;
      } else {
        const b = FF.Settings.data.bindings[this.slot === 0 ? 'p1' : 'p2'];
        if (this.useKeyboard)
          for (const a of ACTIONS) r[a] = (b[a] || []).some((c) => keys.has(c));
        const pad = this.padMode === 'any' ? I.anyPadState() : this.padMode === 'slot' ? I.padState(this.slot) : null;
        if (pad) for (const a of ACTIONS) r[a] = r[a] || pad[a];
      }
      this.prev = this.raw;
      this.raw = r;
      const x = (r.right ? 1 : 0) - (r.left ? 1 : 0);
      const y = (r.down ? 1 : 0) - (r.up ? 1 : 0);
      const pressed = [];
      for (const k of BUTTONS) if (r[k] && !this.prev[k]) pressed.push(k);
      for (const k of EXTRA) if (r[k] && !this.prev[k]) pressed.push(k);
      const fr = {
        x, y, pressed,
        tapL: !!r.left && !this.prev.left,
        tapR: !!r.right && !this.prev.right,
      };
      this.hist.push(fr);
      if (this.hist.length > 90) this.hist.shift();
      // histórico para o modo treinamento
      const d = I.rel(fr, facing);
      const last = this.log[0];
      if (!last || last.d !== d || pressed.length) {
        this.log.unshift({ d, b: pressed.slice(), n: 1 });
        if (this.log.length > 18) this.log.pop();
      } else last.n = Math.min(99, last.n + 1);
    }
    cur() {
      return this.hist[this.hist.length - 1] || { x: 0, y: 0, pressed: [] };
    }
    dir(facing) {
      return I.rel(this.cur(), facing);
    }
    // reconhece sequência direcional (ex. [2,3,6]) dentro de uma janela
    motion(seq, win, facing) {
      const h = this.hist;
      const n = h.length;
      if (!n) return false;
      let lastNN = -1;
      for (let k = n - 1; k >= Math.max(0, n - 10); k--) {
        const d = I.rel(h[k], facing);
        if (d !== 5) {
          lastNN = d;
          break;
        }
      }
      if (lastNN !== seq[seq.length - 1]) return false;
      let idx = seq.length - 1;
      for (let k = n - 1; k >= Math.max(0, n - win); k--) {
        if (I.rel(h[k], facing) === seq[idx]) {
          idx--;
          if (idx < 0) return true;
        }
      }
      return false;
    }
    // toque duplo para dash: retorna 'F', 'B' ou null
    dash(facing) {
      const h = this.hist;
      const n = h.length;
      const c = h[n - 1];
      if (!c || c.y !== 0) return null;
      const key = c.tapR ? 'tapR' : c.tapL ? 'tapL' : null;
      if (!key) return null;
      for (let k = n - 2; k >= Math.max(0, n - 14); k--) {
        if (h[k][key]) {
          const dx = key === 'tapR' ? 1 : -1;
          return dx * facing > 0 ? 'F' : 'B';
        }
      }
      return null;
    }
    clear() {
      this.hist.length = 0;
      this.log.length = 0;
      this.raw = {};
      this.prev = {};
    }
  }
  I.PlayerInput = PlayerInput;

  return I;
})();
