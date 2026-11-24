// ============================================================
// PERSONAGENS — atributos, dimensões, golpes (frame data) e falas
// Caixas de golpe: [x à frente, y (negativo = acima do pé), largura, altura]
// ============================================================
FF.Chars = (function () {
  const LV = {
    light: { hitstun: 13, blockstun: 9, push: 9, hitstop: 6, stun: 5, sfx: 'L' },
    medium: { hitstun: 17, blockstun: 12, push: 11, hitstop: 8, stun: 8, sfx: 'M' },
    heavy: { hitstun: 21, blockstun: 15, push: 14, hitstop: 11, stun: 12, sfx: 'H' },
  };

  // golpe normal genérico
  function N(name, anim, startup, active, recovery, dmg, level, box, opt) {
    const lv = LV[level];
    const isKick = /kick|sweep|poke/i.test(anim) || /k$/.test(opt && opt.btn ? opt.btn : '');
    const hit = Object.assign(
      {
        f0: startup, f1: startup + active - 1, box, dmg, level, height: 'mid',
        hitstun: lv.hitstun, blockstun: lv.blockstun, push: lv.push, hitstop: lv.hitstop, stun: lv.stun,
        sfx: (isKick ? 'kick' : 'punch') + lv.sfx,
      },
      (opt && opt.hit) || {}
    );
    return Object.assign(
      {
        name, anim, kind: 'normal', level, startup, total: startup + active + recovery,
        hits: [hit], cancel: level === 'heavy' ? 'special' : 'chain',
      },
      opt || {},
      { hit: undefined }
    );
  }

  // escala os normais de um personagem (alcance, altura e velocidade)
  function scaleMoves(moves, sx, sy, slow) {
    const out = {};
    for (const k in moves) {
      const m = JSON.parse(JSON.stringify(moves[k]));
      const add = slow[m.level] || 0;
      m.startup += add;
      m.total += add + Math.round(add * 0.6);
      m.hits.forEach((h) => {
        h.f0 += add;
        h.f1 += add;
        h.box = [Math.round(h.box[0] * sx), Math.round(h.box[1] * sy), Math.round(h.box[2] * sx), Math.round(h.box[3] * sy)];
      });
      out[k] = m;
    }
    return out;
  }

  // normais base (proporções do Andinho)
  const BASE = {
    lp: N('Jab', 'jab', 3, 2, 7, 3, 'light', [28, -268, 98, 36]),
    mp: N('Direto', 'straight', 5, 3, 11, 5, 'medium', [32, -268, 120, 40]),
    hp: N('Gancho', 'hook', 8, 4, 18, 8, 'heavy', [30, -285, 128, 56]),
    lk: N('Chute curto', 'kickLow', 4, 3, 8, 3, 'light', [24, -132, 108, 44], { hit: { sfx: 'kickL' } }),
    mk: N('Chute médio', 'kickMid', 6, 3, 14, 6, 'medium', [28, -215, 136, 48], { hit: { sfx: 'kickM' } }),
    hk: N('Chute alto', 'kickHigh', 9, 4, 19, 9, 'heavy', [26, -300, 146, 64], { cancel: null, hit: { sfx: 'kickH', kbBig: true } }),
    clp: N('Jab baixo', 'cJab', 3, 2, 7, 3, 'light', [26, -186, 96, 32]),
    cmp: N('Soco baixo', 'cPunch', 5, 3, 11, 5, 'medium', [28, -192, 116, 38]),
    chp: N('Upper lançador', 'cUpper', 6, 4, 21, 8, 'heavy', [6, -340, 96, 160], { jumpCancel: true, hit: { launch: true } }),
    clk: N('Rasteira curta', 'cKickLow', 4, 2, 8, 3, 'light', [24, -52, 108, 42], { hit: { height: 'low', sfx: 'kickL' } }),
    cmk: N('Rasteira média', 'cPoke', 6, 3, 14, 5, 'medium', [28, -52, 142, 42], { cancel: 'special', hit: { height: 'low', sfx: 'kickM' } }),
    chk: N('Rasteira', 'sweep', 8, 3, 23, 8, 'heavy', [26, -46, 166, 44], { cancel: null, hit: { height: 'low', knockdown: true, sfx: 'kickH' } }),
    jlp: N('Soco aéreo', 'airPunch', 4, 7, 5, 3, 'light', [18, -235, 96, 76], { air: true, hit: { height: 'overhead' } }),
    jmp: N('Soco aéreo médio', 'airPunch', 6, 6, 8, 5, 'medium', [20, -230, 112, 84], { air: true, hit: { height: 'overhead' } }),
    jhp: N('Martelada aérea', 'airHammer', 8, 6, 10, 8, 'heavy', [10, -250, 128, 110], { air: true, cancel: null, hit: { height: 'overhead' } }),
    jlk: N('Chute aéreo', 'airKick', 4, 8, 5, 3, 'light', [14, -140, 104, 72], { air: true, hit: { height: 'overhead', sfx: 'kickL' } }),
    jmk: N('Chute aéreo médio', 'airKick', 6, 6, 8, 6, 'medium', [14, -140, 124, 82], { air: true, hit: { height: 'overhead', sfx: 'kickM' } }),
    jhk: N('Voadora', 'airKickH', 8, 7, 10, 9, 'heavy', [10, -160, 146, 94], { air: true, cancel: null, hit: { height: 'overhead', sfx: 'kickH' } }),
  };
  BASE.lp.chainable = true;
  BASE.lk.chainable = true;
  BASE.clp.chainable = true;
  BASE.clk.chainable = true;

  const THROW = {
    name: 'Agarrão', anim: 'throwTry', kind: 'throw', level: 'heavy', startup: 4, total: 26,
    hits: [], range: 150, dmg: 10, cancel: null,
  };

  // ---------------- ANDINHO ----------------
  const andinho = {
    id: 'andinho',
    name: 'ANDINHO',
    title: 'Dev full stack, movido a café e prompt',
    stats: { str: 65, spd: 95, def: 60, int: 100 },
    hp: 100,
    dims: { thigh: 72, shin: 70, torso: 108, upper: 56, fore: 54, head: 31, neck: 12, hipW: 28, chest: 80, waist: 58, limbW: [26, 22, 32, 27] },
    width: 82, height: 330,
    walkF: 7.4, walkB: 5.8, jumpV: -27.5, jumpX: 8.6, gravity: 1.38, jumpSquat: 3,
    dashF: { frames: 15, speed: 25 }, dashB: { frames: 19, speed: 21, invuln: 7 },
    buffer: 7, stunMax: 58,
    colors: { main: '#19A7A0', shade: '#0F6E6A', light: '#5FE0D2', pants: '#2D4372', pantsShade: '#1E2D52', skin: '#EDB48A', skinShade: '#C98B63', hair: '#2B1D16', accent: '#FFC531', shoe: '#F3F6FF', shoeAccent: '#E8323C' },
    alt: { main: '#7B5CFF', shade: '#4A33B5', light: '#B9A6FF', pants: '#3A3A44', pantsShade: '#26262E' },
    portraitTint: '#19A7A0',
    build: 'slim', sleeves: 'long', heavy: false,
    look: { trail: '#4DF3E8', glow: 'rgba(77,243,232,0.10)', meter: ['#4DF3E8', '#9B6BFF'], intro: 'introA', win: 'winA', nameColor: '#5FE0D2' },
    role: 'Dev full stack',
    ai: { superMaxDist: 1300, superMinHp: 0, superMaxHp: 100 },
    super: 'cladiio',
    superName: 'Cladiio AI',
    superDesc: 'Abre o notebook e invoca o Cladiio: 5 golpes de 6 de dano (30 no total). O último arremessa o rival.',
    secondaryName: 'Modo Debug (I+K)',
    voice: { pitch: 1.3, rate: 1.18 },
    lines: {
      intro: 'Vou resolver isso com inteligência artificial!',
      super: 'CLADIIO, EXECUTA!',
      ready: 'Já mandei o prompt!',
      hit: 'Isso aí é bug de produção!',
      win: 'Nem precisei fazer code review!',
    },
    specialList: [
      { id: 'stack', key: 'sp4', motion: [4, 1, 2, 3, 6], win: 26, btn: 'any', label: 'Meia-lua + ataque', name: 'Stack Overflow' },
      { id: 'hotfix', strong: true, key: 'sp2', motion: [6, 2, 3], win: 18, btn: 'p', label: 'Frente, baixo, diagonal + soco', name: 'Hotfix Uppercut' },
      { id: 'deploy', proj: true, key: 'sp1', motion: [2, 3, 6], win: 18, btn: 'p', label: '¼ lua p/ frente + soco', name: 'Deploy em Produção' },
      { id: 'refactor', key: 'sp3', motion: [2, 1, 4], win: 18, btn: 'k', label: '¼ lua p/ trás + chute', name: 'Refactor Slide' },
    ],
  };
  andinho.moves = Object.assign({}, JSON.parse(JSON.stringify(BASE)), { throw: Object.assign({}, THROW) });

  // ---------------- MARCELÃO ----------------
  const marcelao = {
    id: 'marcelao',
    name: 'MARCELÃO',
    title: '50 anos, 100% shape, 0% paciência',
    stats: { str: 100, spd: 60, def: 90, int: 70 },
    hp: 100,
    dims: { thigh: 86, shin: 82, torso: 138, upper: 70, fore: 64, head: 34, neck: 14, hipW: 38, chest: 132, waist: 84, limbW: [44, 36, 46, 38] },
    width: 124, height: 392,
    walkF: 4.6, walkB: 3.9, jumpV: -24.5, jumpX: 6.6, gravity: 1.5, jumpSquat: 5,
    dashF: { frames: 20, speed: 19 }, dashB: { frames: 22, speed: 16, invuln: 5 },
    buffer: 6, stunMax: 72,
    colors: { main: '#D7263D', shade: '#8E1626', light: '#FF6A78', pants: '#23232F', pantsShade: '#15151D', skin: '#F4CDB2', skinShade: '#D9A588', hair: '#17171C', accent: '#FFC531', shoe: '#2A2A33', shoeAccent: '#F3F6FF' },
    alt: { main: '#2C9A4A', shade: '#1B6230', light: '#6FD98B', pants: '#2B2B3B', pantsShade: '#1A1A26' },
    portraitTint: '#D7263D',
    build: 'muscle', sleeves: 'none', heavy: true,
    look: { trail: '#FF6A78', glow: 'rgba(232,50,60,0.10)', meter: ['#FFC531', '#E8323C'], intro: 'introM', win: 'winM', nameColor: '#FF6A78' },
    role: 'Força bruta',
    ai: { superMaxDist: 520, superMinHp: 0, superMaxHp: 100, lowHpAny: 45 },
    super: 'tadalas',
    superName: 'Modo Tadalas',
    superDesc: 'Toma o Tadalas fictício e fica invulnerável por exatamente 5 segundos. Nenhum golpe tira vida ou interrompe.',
    secondaryName: 'Soco Blindado (I+K)',
    voice: { pitch: 0.45, rate: 0.95 },
    lines: {
      intro: 'Aqui é força bruta!',
      super: 'AGORA NINGUÉM ME SEGURA!',
      ready: 'Ativar os Tadalas!',
      hit: 'Respeita os cinquenta!',
      win: 'Nem inteligência artificial me derruba!',
    },
    specialList: [
      { id: 'abraco', key: 'sp4', motion: [4, 1, 2, 3, 6], win: 26, btn: 'any', label: 'Meia-lua + ataque', name: 'Abraço de Urso' },
      { id: 'upper', strong: true, key: 'sp2', motion: [6, 2, 3], win: 18, btn: 'p', label: 'Frente, baixo, diagonal + soco', name: 'Upper do Supino' },
      { id: 'wave', proj: true, key: 'sp1', motion: [2, 3, 6], win: 18, btn: 'p', label: '¼ lua p/ frente + soco', name: 'Onda do Supino' },
      { id: 'ombrada', key: 'sp3', motion: [2, 1, 4], win: 18, btn: 'k', label: '¼ lua p/ trás + chute', name: 'Ombrada Tanque' },
    ],
  };
  marcelao.moves = Object.assign(
    {},
    scaleMoves(BASE, 1.2, 1.17, { light: 2, medium: 2, heavy: 3 }),
    { throw: Object.assign({}, THROW, { range: 175, startup: 5, total: 30 }) }
  );
  marcelao.moves.hk.anim = 'kickHigh';
  marcelao.moves.hp.anim = 'hammer';

  // ---------------- JAILSON (QA) ----------------
  const jailson = {
    id: 'jailson',
    name: 'JAILSON',
    title: 'QA de carteirinha, testa tudo (menos o sono)',
    role: 'QA',
    stats: { str: 55, spd: 90, def: 60, int: 85 },
    hp: 95,
    dims: { thigh: 60, shin: 58, torso: 92, upper: 47, fore: 45, head: 30, neck: 10, hipW: 28, chest: 74, waist: 68, limbW: [24, 21, 30, 25] },
    width: 74, height: 282,
    walkF: 7.1, walkB: 5.7, jumpV: -26, jumpX: 8.3, gravity: 1.36, jumpSquat: 3,
    dashF: { frames: 14, speed: 24 }, dashB: { frames: 18, speed: 21, invuln: 8 },
    buffer: 7, stunMax: 52,
    colors: { main: '#6DBE45', shade: '#437C26', light: '#C4F59E', pants: '#B89C6A', pantsShade: '#8A744E', skin: '#F8DCC9', skinShade: '#DDB29C', hair: '#5A3B26', accent: '#E8323C', shoe: '#3A3A44', shoeAccent: '#F3F6FF' },
    alt: { main: '#F08BB4', shade: '#B4567E', light: '#FFD1E3', pants: '#6E7A8A', pantsShade: '#4C5664' },
    portraitTint: '#6DBE45',
    build: 'slim', sleeves: 'short', heavy: false,
    look: { trail: '#C4F59E', glow: 'rgba(109,190,69,0.12)', meter: ['#C4F59E', '#2F9E5B'], intro: 'introJ', win: 'winJ', nameColor: '#A6E77E' },
    ai: { superMaxDist: 9999, superMinDist: 380, superMaxHp: 70 },
    super: 'tester',
    superName: 'Tester Culposo',
    superDesc: 'Vai abrir uma HU, pega no sono e recupera 25 de vida em 4 segundos. Apanha dormindo, mas não acorda.',
    secondaryName: 'Cenário de Teste (I+K)',
    voice: { pitch: 1.5, rate: 1.2 },
    lines: {
      intro: 'Vou abrir uma HU.',
      super: 'Tester Culposo!',
      ready: 'Só mais um teste...',
      hit: 'QA também sofre.',
      win: 'Dormir também faz parte do processo.',
    },
    specialList: [
      { id: 'bateria', key: 'sp4', motion: [4, 1, 2, 3, 6], win: 26, btn: 'any', label: 'Meia-lua + ataque', name: 'Bateria de Testes' },
      { id: 'regressao', strong: true, key: 'sp2', motion: [6, 2, 3], win: 18, btn: 'p', label: 'Frente, baixo, diagonal + soco', name: 'Teste de Regressão' },
      { id: 'bugreport', proj: true, key: 'sp1', motion: [2, 3, 6], win: 18, btn: 'p', label: '¼ lua p/ frente + soco', name: 'Bug Report' },
      { id: 'homolog', key: 'sp3', motion: [2, 1, 4], win: 18, btn: 'k', label: '¼ lua p/ trás + chute', name: 'Rasteira de Homologação' },
    ],
  };
  jailson.moves = Object.assign({}, scaleMoves(BASE, 0.86, 0.85, { light: 0, medium: 0, heavy: -1 }), { throw: Object.assign({}, THROW, { range: 135 }) });

  // ---------------- THIAGO (PHP e fumaça) ----------------
  const thiago = {
    id: 'thiago',
    name: 'THIAGO',
    title: 'Sênior em PHP, barba de fumaça e calma de produção',
    role: 'Dev PHP',
    stats: { str: 78, spd: 72, def: 68, int: 88 },
    hp: 100,
    dims: { thigh: 72, shin: 70, torso: 110, upper: 57, fore: 54, head: 33, neck: 12, hipW: 32, chest: 98, waist: 92, limbW: [29, 25, 36, 30] },
    width: 96, height: 334,
    walkF: 6.0, walkB: 4.9, jumpV: -26.5, jumpX: 7.7, gravity: 1.42, jumpSquat: 4,
    dashF: { frames: 17, speed: 22 }, dashB: { frames: 20, speed: 19, invuln: 6 },
    buffer: 7, stunMax: 62,
    colors: { main: '#2B2D42', shade: '#1A1B2B', light: '#8892BF', pants: '#3B4A6B', pantsShade: '#28334C', skin: '#9A6845', skinShade: '#734B30', hair: '#F3F6FF', accent: '#FF8A3D', shoe: '#7A4E2A', shoeAccent: '#F3F6FF' },
    alt: { main: '#6B2737', shade: '#451824', light: '#F2B6C4', pants: '#4A4A52', pantsShade: '#33333A' },
    portraitTint: '#7A5BA8',
    build: 'chubby', sleeves: 'short', heavy: false,
    look: { trail: '#C9CEDB', glow: 'rgba(136,146,191,0.14)', meter: ['#C9CEDB', '#8892BF'], intro: 'introT', win: 'winT', nameColor: '#B9C0E8' },
    ai: { superMaxDist: 600, superMinHp: 30, superMaxHp: 100 },
    super: 'fumada',
    superName: 'Hora da Fumada',
    superDesc: 'Puxa um tragão: +10 de Força por 8 segundos, mas perde 1 de vida por segundo (8 no total).',
    secondaryName: 'Echo na Cara (I+K)',
    voice: { pitch: 0.75, rate: 0.92 },
    lines: {
      intro: 'PHP e fumaça.',
      super: 'Hora da fumada',
      ready: 'Agora vai.',
      hit: 'Segura essa.',
      win: 'Isso aqui aumenta meu dano.',
    },
    specialList: [
      { id: 'trycatch', key: 'sp4', motion: [4, 1, 2, 3, 6], win: 26, btn: 'any', label: 'Meia-lua + ataque', name: 'Try/Catch' },
      { id: 'sextafeira', strong: true, key: 'sp2', motion: [6, 2, 3], win: 18, btn: 'p', label: 'Frente, baixo, diagonal + soco', name: 'Deploy de Sexta' },
      { id: 'baforada', proj: true, key: 'sp1', motion: [2, 3, 6], win: 18, btn: 'p', label: '¼ lua p/ frente + soco', name: 'Baforada' },
      { id: 'composer', key: 'sp3', motion: [2, 1, 4], win: 18, btn: 'k', label: '¼ lua p/ trás + chute', name: 'Composer Install' },
    ],
  };
  thiago.moves = Object.assign({}, scaleMoves(BASE, 1.04, 1.0, { light: 1, medium: 1, heavy: 1 }), { throw: Object.assign({}, THROW, { range: 155 }) });

  // ---------------- MARCUS (o Michelin) ----------------
  const marcus = {
    id: 'marcus',
    name: 'MARCUS',
    title: 'Dev back-end, o Michelin: compila, carrega e sai rolando',
    role: 'Dev back-end',
    stats: { str: 80, spd: 68, def: 78, int: 74 },
    hp: 100,
    dims: { thigh: 72, shin: 70, torso: 112, upper: 56, fore: 54, head: 33, neck: 12, hipW: 34, chest: 104, waist: 112, limbW: [30, 26, 38, 31] },
    width: 104, height: 340,
    walkF: 5.4, walkB: 4.5, jumpV: -25.5, jumpX: 7.2, gravity: 1.46, jumpSquat: 4,
    dashF: { frames: 18, speed: 21 }, dashB: { frames: 20, speed: 18, invuln: 6 },
    buffer: 7, stunMax: 66,
    colors: { main: '#24252D', shade: '#15161C', light: '#5A5D6E', pants: '#4A72B8', pantsShade: '#2F4E85', skin: '#F6D5C0', skinShade: '#DDB39C', hair: '#6B4A33', accent: '#9EC1FF', shoe: '#3A2A22', shoeAccent: '#F3F6FF' },
    alt: { main: '#3B5B3A', shade: '#253A25', light: '#8FB88D', pants: '#6E6A5E', pantsShade: '#4E4B42' },
    portraitTint: '#3E6FB0',
    build: 'chubby', sleeves: 'short', heavy: false,
    look: { trail: '#9EC1FF', glow: 'rgba(110,150,220,0.14)', meter: ['#9EC1FF', '#3E6FB0'], intro: 'introK', win: 'winK', nameColor: '#9EC1FF' },
    ai: { superMaxDist: 1100, superMinHp: 0, superMaxHp: 100 },
    super: 'rolamento',
    superName: 'Rolamento',
    superDesc: 'Compila o build, vira bola e sai rolando em produção: 3 pancadas de 8 (24 no total), quicando nas paredes.',
    secondaryName: 'Code Review na Cara (I+K)',
    voice: { pitch: 0.8, rate: 1.05 },
    lines: {
      intro: 'Subindo o build... e rolando pra cima!',
      super: 'ROLAMENTO EM PRODUÇÃO!',
      ready: 'Build carregado, cem por cento!',
      hit: 'Isso aí é só um warning.',
      win: 'Deploy concluído. Sem rollback.',
    },
    specialList: [
      { id: 'barrigada', key: 'sp4', motion: [4, 1, 2, 3, 6], win: 26, btn: 'any', label: 'Meia-lua + ataque', name: 'Push --force' },
      { id: 'quebramolas', strong: true, key: 'sp2', motion: [6, 2, 3], win: 18, btn: 'p', label: 'Frente, baixo, diagonal + soco', name: 'Merge Forçado' },
      { id: 'pneu', proj: true, key: 'sp1', motion: [2, 3, 6], win: 18, btn: 'p', label: '¼ lua p/ frente + soco', name: 'Loop Infinito' },
      { id: 'minirolo', key: 'sp3', motion: [2, 1, 4], win: 18, btn: 'k', label: '¼ lua p/ trás + chute', name: 'Rolling Update' },
    ],
  };
  marcus.moves = Object.assign({}, scaleMoves(BASE, 1.08, 1.03, { light: 1, medium: 1, heavy: 2 }), { throw: Object.assign({}, THROW, { range: 165 }) });

  // ---------------- TOM (analista de TI) ----------------
  const tom = {
    id: 'tom',
    name: 'TOM',
    title: 'Analista de TI: escreve HU, cobra prazo e não aceita "tá quase"',
    role: 'Analista de TI',
    stats: { str: 70, spd: 80, def: 65, int: 92 },
    hp: 100,
    dims: { thigh: 73, shin: 71, torso: 110, upper: 57, fore: 55, head: 32, neck: 12, hipW: 28, chest: 84, waist: 60, limbW: [26, 22, 32, 27] },
    width: 84, height: 336,
    walkF: 6.6, walkB: 5.3, jumpV: -26.8, jumpX: 8.0, gravity: 1.4, jumpSquat: 3,
    dashF: { frames: 16, speed: 23 }, dashB: { frames: 19, speed: 20, invuln: 7 },
    buffer: 7, stunMax: 58,
    colors: { main: '#3E7BD6', shade: '#2A57A0', light: '#A9C8F5', pants: '#2E3242', pantsShade: '#1F2230', skin: '#F0C3A2', skinShade: '#D29E7E', hair: '#3A2A1E', accent: '#7A5A3A', shoe: '#1C1C22', shoeAccent: '#8A8F9C' },
    alt: { main: '#E9E4D8', shade: '#BDB6A6', light: '#FFFFFF', pants: '#3B2F2A', pantsShade: '#2A211D' },
    eyeColor: '#2FA866',
    portraitTint: '#2F6BC4',
    build: 'slim', sleeves: 'long', heavy: false,
    look: { trail: '#A9C8F5', glow: 'rgba(62,123,214,0.14)', meter: ['#A9C8F5', '#2F6BC4'], intro: 'introTom', win: 'winTom', nameColor: '#A9C8F5' },
    ai: { superMaxDist: 520, superMinHp: 0, superMaxHp: 100 },
    super: 'chicote',
    superName: 'Chicote do Prazo',
    superDesc: 'Saca o chicote e grita "trabalha mais!": se pegar o rival, são 6 chicotadas de 4 (24 no total). Alcance longo, mas erra se estiver longe demais.',
    secondaryName: 'Mudança de Escopo (I+K)',
    voice: { pitch: 1.0, rate: 1.12 },
    lines: {
      intro: 'Bora, que a sprint não espera!',
      super: 'TRABALHA MAIS!',
      ready: 'Tem HU nova pra você!',
      hit: 'Isso não estava no escopo!',
      win: 'Entrega aprovada. Próxima sprint!',
    },
    specialList: [
      { id: 'backlog', key: 'sp4', motion: [4, 1, 2, 3, 6], win: 26, btn: 'any', label: 'Meia-lua + ataque', name: 'Backlog Infinito' },
      { id: 'reuniao', strong: true, key: 'sp2', motion: [6, 2, 3], win: 18, btn: 'p', label: 'Frente, baixo, diagonal + soco', name: 'Reunião de Alinhamento' },
      { id: 'hu', proj: true, key: 'sp1', motion: [2, 3, 6], win: 18, btn: 'p', label: '¼ lua p/ frente + soco', name: 'HU Urgente' },
      { id: 'daily', key: 'sp3', motion: [2, 1, 4], win: 18, btn: 'k', label: '¼ lua p/ trás + chute', name: 'Daily de 15 Minutos' },
    ],
  };
  tom.moves = Object.assign({}, scaleMoves(BASE, 1.0, 1.0, { light: 0, medium: 1, heavy: 1 }), { throw: Object.assign({}, THROW, { range: 150 }) });

  // multiplicadores de dano a partir dos atributos
  [andinho, marcelao, jailson, thiago, marcus, tom].forEach((c) => {
    c.strMul = 0.75 + (c.stats.str / 100) * 0.45;
    c.defMul = 1.2 - (c.stats.def / 100) * 0.45;
  });

  // ---------------- ESPECIAIS (variações por força do botão) ----------------
  const S = (s, l, m, h) => (s === 'l' ? l : s === 'm' ? m : h);

  function special(charId, id, s) {
    if (charId === 'jailson') {
      switch (id) {
        case 'bugreport':
          return {
            name: 'Bug Report', anim: 'cast', kind: 'special', level: 'medium', startup: 11, total: 36, hits: [], cancel: null,
            spawn: { f: 11, type: 'bug', speed: S(s, 11, 14, 17), dmg: 6, level: 'medium', w: 90, h: 60, y: -215, x: 70 },
          };
        case 'regressao':
          return {
            name: 'Teste de Regressão', anim: 'rising', kind: 'special', level: 'heavy', startup: 4, total: 30, untilLand: true, landRec: 13, cancel: 'super',
            invuln: [0, S(s, 5, 7, 9)],
            vel: [{ f0: 3, f1: 3, vx: S(s, 3, 4, 5), vy: S(s, -18, -21, -24) }],
            hits: [{ f0: 4, f1: 12, box: [-6, -320, 96, 180], dmg: S(s, 9, 10, 11), level: 'heavy', height: 'mid', hitstun: 24, blockstun: 16, push: 6, hitstop: 10, stun: 10, launch: true, sfx: 'kickH' }],
          };
        case 'homolog':
          return {
            name: 'Rasteira de Homologação', anim: 'slide', kind: 'special', level: 'medium', startup: 7, total: 38, cancel: null,
            vel: [{ f0: 5, f1: 21, vx: S(s, 14, 17, 20) }],
            hits: [{ f0: 7, f1: 21, box: [6, -56, 136, 52], dmg: 6, level: 'medium', height: 'low', hitstun: 20, blockstun: 12, push: 10, hitstop: 8, stun: 8, knockdown: s === 'h', sfx: 'kickM' }],
          };
        case 'bateria': {
          const hits = [];
          for (let i = 0; i < 6; i++)
            hits.push({ f0: 7 + i * 4, f1: 8 + i * 4, box: [20, -250, 120, 100], dmg: S(s, 1.7, 1.9, 2.1), level: i === 5 ? 'heavy' : 'light', height: 'mid', hitstun: i === 5 ? 22 : 15, blockstun: 9, push: i === 5 ? 14 : 2, hitstop: i === 5 ? 9 : 4, stun: 3, sfx: 'kickL' });
          return { name: 'Bateria de Testes', anim: 'flurry', kind: 'special', level: 'medium', startup: 7, total: 50, hits, cancel: 'super' };
        }
        case 'secondary':
          return { name: 'Cenário de Teste', anim: 'counterStance', kind: 'special', level: 'medium', startup: 2, total: 40, hits: [], cancel: null, counterWindow: [2, 22] };
        case 'counterStrike':
          return { name: 'Reprovado!', anim: 'counterStrike', kind: 'special', level: 'heavy', startup: 2, total: 26, hits: [], cancel: null };
      }
      return null;
    }
    if (charId === 'tom') {
      switch (id) {
        case 'hu':
          return {
            name: 'HU Urgente', anim: 'cast', kind: 'special', level: 'medium', startup: 11, total: 36, hits: [], cancel: null,
            spawn: { f: 11, type: 'hu', speed: S(s, 12, 15, 18), dmg: 6, level: 'medium', w: 96, h: 70, y: -262, x: 80 },
          };
        case 'reuniao':
          return {
            name: 'Reunião de Alinhamento', anim: 'rising', kind: 'special', level: 'heavy', startup: 4, total: 30, untilLand: true, landRec: 14, cancel: 'super',
            invuln: [0, S(s, 4, 6, 8)],
            vel: [{ f0: 3, f1: 3, vx: S(s, 3, 4, 5), vy: S(s, -17, -20, -23) }],
            hits: [{ f0: 4, f1: 12, box: [-6, -360, 104, 190], dmg: S(s, 10, 11, 12), level: 'heavy', height: 'mid', hitstun: 24, blockstun: 16, push: 6, hitstop: 10, stun: 10, launch: true, sfx: 'punchH' }],
          };
        case 'daily':
          return {
            name: 'Daily de 15 Minutos', anim: 'slide', kind: 'special', level: 'medium', startup: 8, total: 40, cancel: null,
            vel: [{ f0: 6, f1: 22, vx: S(s, 13, 16, 19) }],
            hits: [{ f0: 8, f1: 22, box: [6, -66, 150, 60], dmg: 7, level: 'medium', height: 'low', hitstun: 20, blockstun: 12, push: 10, hitstop: 8, stun: 8, knockdown: s === 'h', sfx: 'kickM' }],
          };
        case 'backlog': {
          const hits = [];
          for (let i = 0; i < 5; i++)
            hits.push({ f0: 8 + i * 4, f1: 9 + i * 4, box: [26, -290, 138, 110], dmg: S(s, 2, 2.2, 2.4), level: i === 4 ? 'heavy' : 'light', height: 'mid', hitstun: i === 4 ? 22 : 15, blockstun: 9, push: i === 4 ? 14 : 2, hitstop: i === 4 ? 9 : 4, stun: 3, sfx: 'punchL' });
          return { name: 'Backlog Infinito', anim: 'flurry', kind: 'special', level: 'medium', startup: 8, total: 48, hits, cancel: 'super' };
        }
        case 'secondary':
          return {
            name: 'Mudança de Escopo', anim: 'armorPunch', kind: 'special', level: 'heavy', startup: 15, total: 42, cancel: 'super',
            armor: [3, 14], armorHits: 1,
            hits: [{ f0: 15, f1: 18, box: [30, -310, 160, 80], dmg: 10, level: 'heavy', height: 'mid', hitstun: 24, blockstun: 17, push: 18, hitstop: 12, stun: 13, kbBig: true, sfx: 'punchH' }],
          };
      }
      return null;
    }
    if (charId === 'marcus') {
      switch (id) {
        case 'pneu':
          return {
            name: 'Loop Infinito', anim: 'cast', kind: 'special', level: 'medium', startup: 13, total: 40, hits: [], cancel: null,
            spawn: { f: 13, type: 'tire', speed: S(s, 10, 13, 16), dmg: 7, level: 'medium', w: 90, h: 90, y: -110, x: 80 },
          };
        case 'quebramolas':
          return {
            name: 'Merge Forçado', anim: 'rising', kind: 'special', level: 'heavy', startup: 5, total: 32, untilLand: true, landRec: 16, cancel: 'super',
            invuln: [0, S(s, 4, 5, 7)],
            vel: [{ f0: 4, f1: 4, vx: S(s, 3, 4, 5), vy: S(s, -15, -18, -21) }],
            hits: [{ f0: 5, f1: 13, box: [-6, -380, 116, 210], dmg: S(s, 11, 12, 13), level: 'heavy', height: 'mid', hitstun: 24, blockstun: 16, push: 7, hitstop: 11, stun: 11, launch: true, sfx: 'punchH' }],
          };
        case 'minirolo':
          return {
            name: 'Rolling Update', anim: 'slide', kind: 'special', level: 'medium', startup: 8, total: 40, cancel: null,
            ball: [3, 28],
            vel: [{ f0: 6, f1: 26, vx: S(s, 15, 18, 21) }],
            hits: [{ f0: 8, f1: 26, box: [-40, -150, 150, 150], dmg: 8, level: 'medium', height: 'mid', hitstun: 22, blockstun: 14, push: 14, hitstop: 9, stun: 9, knockdown: s === 'h', sfx: 'kickH' }],
          };
        case 'barrigada':
          return {
            name: 'Push --force', anim: 'shoulder', kind: 'special', level: 'heavy', startup: 10, total: 40, cancel: null,
            armor: [2, 18], armorHits: 1,
            vel: [{ f0: 8, f1: 18, vx: S(s, 9, 11, 13) }],
            hits: [{ f0: 10, f1: 18, box: [10, -250, 120, 140], dmg: 10, level: 'heavy', height: 'mid', hitstun: 22, blockstun: 15, push: 22, hitstop: 12, stun: 11, kbBig: true, knockdown: s === 'h', sfx: 'punchH' }],
          };
        case 'secondary':
          return {
            name: 'Code Review na Cara', anim: 'armorPunch', kind: 'special', level: 'heavy', startup: 15, total: 42, cancel: 'super',
            armor: [3, 14], armorHits: 1,
            hits: [{ f0: 15, f1: 18, box: [30, -310, 160, 80], dmg: 10, level: 'heavy', height: 'mid', hitstun: 24, blockstun: 17, push: 18, hitstop: 12, stun: 13, kbBig: true, sfx: 'punchH' }],
          };
      }
      return null;
    }
    if (charId === 'thiago') {
      switch (id) {
        case 'baforada':
          return {
            name: 'Baforada', anim: 'cast', kind: 'special', level: 'medium', startup: 14, total: 42, hits: [], cancel: null,
            spawn: { f: 14, type: 'smoke', speed: S(s, 8, 10, 12), dmg: 7, level: 'medium', w: 150, h: 120, y: -300, x: 90 },
          };
        case 'sextafeira':
          return {
            name: 'Deploy de Sexta', anim: 'rising', kind: 'special', level: 'heavy', startup: 5, total: 32, untilLand: true, landRec: 15, cancel: 'super',
            invuln: [0, S(s, 4, 6, 7)],
            vel: [{ f0: 4, f1: 4, vx: S(s, 3, 4, 5), vy: S(s, -16, -19, -22) }],
            hits: [{ f0: 5, f1: 13, box: [-6, -370, 108, 200], dmg: S(s, 11, 12, 13), level: 'heavy', height: 'mid', hitstun: 24, blockstun: 16, push: 7, hitstop: 11, stun: 11, launch: true, sfx: 'punchH' }],
          };
        case 'composer':
          return {
            name: 'Composer Install', anim: 'shoulder', kind: 'special', level: 'heavy', startup: 9, total: 40, cancel: null,
            armor: [2, 18], armorHits: 1,
            vel: [{ f0: 7, f1: 23, vx: S(s, 14, 17, 20) }],
            hits: [{ f0: 9, f1: 23, box: [14, -290, 104, 210], dmg: 10, level: 'heavy', height: 'mid', hitstun: 22, blockstun: 15, push: 16, hitstop: 11, stun: 11, kbBig: true, knockdown: s === 'h', sfx: 'punchH' }],
          };
        case 'trycatch':
          return { name: 'Try/Catch', anim: 'grabTry', kind: 'cmdgrab', level: 'heavy', startup: 6, total: 34, hits: [], cancel: null, range: 185, dmg: 13 };
        case 'secondary':
          return {
            name: 'Echo na Cara', anim: 'armorPunch', kind: 'special', level: 'heavy', startup: 14, total: 40, cancel: 'super',
            armor: [3, 13], armorHits: 1,
            hits: [{ f0: 14, f1: 17, box: [28, -300, 150, 76], dmg: 10, level: 'heavy', height: 'mid', hitstun: 24, blockstun: 17, push: 18, hitstop: 12, stun: 13, kbBig: true, sfx: 'punchH' }],
          };
      }
      return null;
    }
    if (charId === 'andinho') {
      switch (id) {
        case 'deploy':
          return {
            name: 'Deploy em Produção', anim: 'cast', kind: 'special', level: 'medium', startup: 12, total: 38, hits: [], cancel: null,
            spawn: { f: 12, type: 'code', speed: S(s, 12, 15, 18), dmg: 6, level: 'medium', w: 110, h: 64, y: -268, x: 80 },
          };
        case 'hotfix':
          return {
            name: 'Hotfix Uppercut', anim: 'rising', kind: 'special', level: 'heavy', startup: 4, total: 30, untilLand: true, landRec: 14, cancel: 'super',
            invuln: [0, S(s, 4, 6, 8)],
            vel: [{ f0: 3, f1: 3, vx: S(s, 3, 4, 5), vy: S(s, -17, -20, -23) }],
            hits: [{ f0: 4, f1: 12, box: [-6, -360, 104, 190], dmg: S(s, 10, 11, 12), level: 'heavy', height: 'mid', hitstun: 24, blockstun: 16, push: 6, hitstop: 10, stun: 10, launch: true, sfx: 'punchH' }],
          };
        case 'refactor':
          return {
            name: 'Refactor Slide', anim: 'slide', kind: 'special', level: 'medium', startup: 8, total: 40, cancel: null,
            vel: [{ f0: 6, f1: 22, vx: S(s, 13, 16, 19) }],
            hits: [{ f0: 8, f1: 22, box: [6, -66, 150, 60], dmg: 7, level: 'medium', height: 'low', hitstun: 20, blockstun: 12, push: 10, hitstop: 8, stun: 8, knockdown: s === 'h', sfx: 'kickM' }],
          };
        case 'stack': {
          const hits = [];
          for (let i = 0; i < 5; i++)
            hits.push({ f0: 8 + i * 4, f1: 9 + i * 4, box: [26, -290, 138, 110], dmg: S(s, 2, 2.2, 2.4), level: i === 4 ? 'heavy' : 'light', height: 'mid', hitstun: i === 4 ? 22 : 15, blockstun: 9, push: i === 4 ? 14 : 2, hitstop: i === 4 ? 9 : 4, stun: 3, sfx: 'punchL' });
          return { name: 'Stack Overflow', anim: 'flurry', kind: 'special', level: 'medium', startup: 8, total: 48, hits, cancel: 'super' };
        }
        case 'secondary':
          return {
            name: 'Modo Debug', anim: 'counterStance', kind: 'special', level: 'medium', startup: 2, total: 40, hits: [], cancel: null,
            counterWindow: [2, 24],
          };
        case 'counterStrike':
          return { name: 'Debugado!', anim: 'counterStrike', kind: 'special', level: 'heavy', startup: 2, total: 26, hits: [], cancel: null };
      }
    } else {
      switch (id) {
        case 'wave':
          return {
            name: 'Onda do Supino', anim: 'slam', kind: 'special', level: 'heavy', startup: 16, total: 46, hits: [], cancel: null,
            spawn: { f: 16, type: 'wave', speed: S(s, 10, 12, 14), dmg: 8, level: 'heavy', w: 120, h: 96, y: -96, x: 90, height: 'low' },
          };
        case 'upper':
          return {
            name: 'Upper do Supino', anim: 'rising', kind: 'special', level: 'heavy', startup: 5, total: 34, untilLand: true, landRec: 18, cancel: 'super',
            invuln: [0, S(s, 4, 5, 7)],
            vel: [{ f0: 4, f1: 4, vx: S(s, 2, 3, 4), vy: S(s, -14, -16, -18) }],
            hits: [{ f0: 5, f1: 13, box: [-4, -420, 124, 220], dmg: S(s, 12, 13, 14), level: 'heavy', height: 'mid', hitstun: 26, blockstun: 18, push: 8, hitstop: 12, stun: 12, launch: true, sfx: 'punchH' }],
          };
        case 'ombrada':
          return {
            name: 'Ombrada Tanque', anim: 'shoulder', kind: 'special', level: 'heavy', startup: 10, total: 42, cancel: null,
            armor: [2, 22], armorHits: 1,
            vel: [{ f0: 8, f1: 26, vx: S(s, 14, 17, 20) }],
            hits: [{ f0: 10, f1: 26, box: [16, -310, 112, 230], dmg: 11, level: 'heavy', height: 'mid', hitstun: 22, blockstun: 16, push: 18, hitstop: 12, stun: 12, kbBig: true, knockdown: s === 'h', sfx: 'punchH' }],
          };
        case 'abraco':
          return {
            name: 'Abraço de Urso', anim: 'grabTry', kind: 'cmdgrab', level: 'heavy', startup: 6, total: 36, hits: [], cancel: null,
            range: 200, dmg: 15,
          };
        case 'secondary':
          return {
            name: 'Soco Blindado', anim: 'armorPunch', kind: 'special', level: 'heavy', startup: 18, total: 44, cancel: 'super',
            armor: [3, 17], armorHits: 2,
            hits: [{ f0: 18, f1: 21, box: [30, -330, 170, 84], dmg: 11, level: 'heavy', height: 'mid', hitstun: 24, blockstun: 18, push: 20, hitstop: 13, stun: 14, kbBig: true, sfx: 'punchH' }],
          };
      }
    }
    return null;
  }

  return { andinho, marcelao, jailson, thiago, marcus, tom, special, LV, list: ['andinho', 'marcelao', 'jailson', 'thiago', 'marcus', 'tom'] };
})();
