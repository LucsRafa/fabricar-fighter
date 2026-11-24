// ============================================================
// CENÁRIO — Fabricar Arena: escritório de software à noite,
// com parallax, iluminação dinâmica, torcida e telas animadas
// ============================================================
FF.Stage = (function () {
  const U = FF.U;
  const W = FF.W, H = FF.H, GY = FF.GROUND_Y;
  const layers = {};
  let built = false;
  const leds = [];
  const monitors = [];
  const crowd = [];
  const codeLines = [];

  function mk(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }
  // largura de cada camada: cobre todo o deslocamento da câmera
  const layerW = (k) => Math.ceil(W + (FF.STAGE_W - W) * k + 200);
  const layerX = (k, camX) => -100 - (camX - W / 2) * k;

  const CODE = [
    'const deploy = async () => {', '  await git.push("main");', '  if (bug) return hotfix();', '};',
    'SELECT * FROM navios;', 'function cladiio(prompt) {', '  return executa(prompt);', '}',
    'docker compose up -d', 'npm run build', '// TODO: refatorar', 'php artisan migrate',
    'if (marcelao.tadalas) {', '  throw new Error("IMUNE");', '}', 'while (true) coffee++;',
  ];

  function radialSprite(w, h, stops) {
    const c = mk(w, h), g = c.getContext('2d');
    const r = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, Math.max(w, h) / 2);
    stops.forEach((s) => r.addColorStop(s[0], s[1]));
    g.fillStyle = r;
    g.fillRect(0, 0, w, h);
    return c;
  }

  function build() {
    if (built) return;
    built = true;
    layers.signGlow = radialSprite(1400, 1400, [[0, 'rgba(255,79,163,0.28)'], [0.5, 'rgba(255,79,163,0)'], [1, 'rgba(255,79,163,0)']]);
    layers.reflect = radialSprite(1040, 1040, [[0, 'rgba(255,79,163,0.16)'], [0.5, 'rgba(255,79,163,0)'], [1, 'rgba(255,79,163,0)']]);
    {
      const k = 0.9, w = layerW(k), c = mk(w, GY + 200), g = c.getContext('2d');
      for (let i = 0; i < 8; i++) {
        const lx = 150 + i * 360;
        const gr = g.createLinearGradient(lx, 0, lx, GY + 200);
        gr.addColorStop(0, 'rgba(180,200,255,0.10)');
        gr.addColorStop(1, 'rgba(180,200,255,0)');
        g.fillStyle = gr;
        g.beginPath();
        g.moveTo(lx - 30, 0);
        g.lineTo(lx + 30, 0);
        g.lineTo(lx + 240, GY + 200);
        g.lineTo(lx - 240, GY + 200);
        g.closePath();
        g.fill();
      }
      layers.cones = { c, k };
    }
    // ---- camada 0: céu noturno, cidade e porto (k = 0.15) ----
    {
      const k = 0.15, w = layerW(k), c = mk(w, 760), g = c.getContext('2d');
      const sky = g.createLinearGradient(0, 0, 0, 760);
      sky.addColorStop(0, '#0B1033');
      sky.addColorStop(0.6, '#2A1E5C');
      sky.addColorStop(1, '#5B2A6E');
      g.fillStyle = sky;
      g.fillRect(0, 0, w, 760);
      g.fillStyle = 'rgba(255,255,255,0.8)';
      for (let i = 0; i < 90; i++) g.fillRect(Math.random() * w, Math.random() * 360, 2, 2);
      g.fillStyle = '#F3E9C8';
      g.beginPath();
      g.arc(w * 0.72, 150, 46, 0, Math.PI * 2);
      g.fill();
      // prédios
      let x = 0;
      while (x < w) {
        const bw = U.rand(60, 150), bh = U.rand(160, 420);
        g.fillStyle = U.choice(['#161A44', '#1C2152', '#131638']);
        g.fillRect(x, 640 - bh, bw, bh + 120);
        g.fillStyle = 'rgba(255,214,120,0.55)';
        for (let yy = 640 - bh + 14; yy < 620; yy += 22)
          for (let xx = x + 8; xx < x + bw - 10; xx += 18) if (Math.random() < 0.35) g.fillRect(xx, yy, 8, 10);
        x += bw + U.rand(4, 20);
      }
      // guindastes do porto
      g.strokeStyle = '#E8323C';
      g.lineWidth = 6;
      for (let i = 0; i < 4; i++) {
        const cx = 200 + i * (w / 4);
        g.strokeStyle = i % 2 ? '#3B3F7A' : '#45306E';
        g.beginPath();
        g.moveTo(cx, 660); g.lineTo(cx, 380); g.lineTo(cx + 180, 380); g.moveTo(cx - 60, 400); g.lineTo(cx + 40, 380);
        g.moveTo(cx + 40, 660); g.lineTo(cx + 40, 380);
        g.stroke();
        g.fillStyle = '#E8323C';
        g.fillRect(cx + 170, 372, 10, 10);
      }
      layers.sky = { c, k };
    }
    // ---- camada 1: parede do escritório com janelas, letreiro, servidores (k = 0.42) ----
    {
      const k = 0.42, w = layerW(k), c = mk(w, 760), g = c.getContext('2d');
      const wall = g.createLinearGradient(0, 0, 0, 760);
      wall.addColorStop(0, '#1C2250');
      wall.addColorStop(1, '#2A3170');
      g.fillStyle = wall;
      g.fillRect(0, 0, w, 760);
      // janelas (furos transparentes)
      g.globalCompositeOperation = 'destination-out';
      const winW = 300, gap = 70;
      for (let x = 60; x < w - 100; x += winW + gap) {
        if (x > w * 0.36 && x < w * 0.6) continue; // espaço do letreiro
        g.fillRect(x, 70, winW, 400);
      }
      g.globalCompositeOperation = 'source-over';
      g.strokeStyle = '#121640';
      g.lineWidth = 14;
      for (let x = 60; x < w - 100; x += winW + gap) {
        if (x > w * 0.36 && x < w * 0.6) continue;
        g.strokeRect(x, 70, winW, 400);
        g.beginPath();
        g.moveTo(x + winW / 2, 70);
        g.lineTo(x + winW / 2, 470);
        g.stroke();
      }
      // rodapé e piso do fundo
      g.fillStyle = '#161A44';
      g.fillRect(0, 600, w, 160);
      // servidores (esquerda e direita)
      const rack = (rx) => {
        for (let r = 0; r < 3; r++) {
          const x0 = rx + r * 92;
          g.fillStyle = '#0E1130';
          g.fillRect(x0, 300, 84, 300);
          g.strokeStyle = '#3B4290';
          g.lineWidth = 3;
          g.strokeRect(x0, 300, 84, 300);
          for (let s = 0; s < 12; s++) {
            g.fillStyle = '#1B2050';
            g.fillRect(x0 + 6, 310 + s * 24, 72, 18);
            leds.push({ x: x0 + 12 + (s % 3) * 8, y: 316 + s * 24, k, ph: Math.random() * 10, c: U.choice(['#4DF3E8', '#7CFF8A', '#FFC531']) });
          }
        }
      };
      rack(40);
      rack(w - 330);
      // letreiro FABRICAR em neon (pré-renderizado com brilho)
      const sx = w / 2;
      g.save();
      g.font = `150px ${FF.FONT_D}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = '#10143A';
      g.fillRect(sx - 560, 120, 1120, 230);
      g.strokeStyle = '#3B4290';
      g.lineWidth = 6;
      g.strokeRect(sx - 560, 120, 1120, 230);
      g.shadowColor = '#FF4FA3';
      g.shadowBlur = 40;
      g.lineWidth = 10;
      g.strokeStyle = '#FF4FA3';
      g.strokeText('FABRICAR', sx, 240);
      g.shadowBlur = 16;
      g.lineWidth = 4;
      g.strokeStyle = '#FFE1F0';
      g.strokeText('FABRICAR', sx, 240);
      g.restore();
      layers.wallSign = { x: w / 2, y: 240 };
      g.drawImage(layers.signGlow, sx - 700, 240 - 700);
      for (let i = 0; i < Math.ceil(w / 420); i++) {
        const lx = 120 + i * 420;
        const gr = g.createLinearGradient(lx, 0, lx, 760);
        gr.addColorStop(0, 'rgba(180,200,255,0.10)');
        gr.addColorStop(1, 'rgba(180,200,255,0)');
        g.fillStyle = gr;
        g.beginPath();
        g.moveTo(lx - 24, 0);
        g.lineTo(lx + 24, 0);
        g.lineTo(lx + 170, 760);
        g.lineTo(lx - 170, 760);
        g.closePath();
        g.fill();
      }
      // quadro kanban
      const kx = w * 0.26;
      g.fillStyle = '#E9ECF8';
      g.fillRect(kx, 500, 260, 90);
      g.fillStyle = '#3B4290';
      g.font = `14px ${FF.FONT_UI}`;
      ['A fazer', 'Fazendo', 'Pronto'].forEach((t, i) => g.fillText(t, kx + 12 + i * 86, 518));
      for (let i = 0; i < 9; i++) {
        g.fillStyle = U.choice(['#FFC531', '#7FD8FF', '#FF8FB8', '#9BF29B']);
        g.fillRect(kx + 12 + (i % 3) * 86, 528 + Math.floor(i / 3) * 20, 40, 14);
      }
      // máquina de café
      const mx = w * 0.7;
      g.fillStyle = '#2B2F45';
      g.fillRect(mx, 470, 110, 130);
      g.fillStyle = '#E8323C';
      g.fillRect(mx + 10, 480, 90, 30);
      g.fillStyle = '#F3F6FF';
      g.font = `14px ${FF.FONT_D}`;
      g.fillText('CAFÉ', mx + 30, 500);
      g.fillStyle = '#111';
      g.fillRect(mx + 35, 530, 40, 40);
      g.fillStyle = '#F3F6FF';
      g.fillRect(mx + 42, 548, 26, 22);
      layers.coffee = { x: mx + 55, y: 528 };
      layers.wall = { c, k };
    }
    // ---- camada 3: mesas com monitores (k = 0.78) ----
    {
      const k = 0.78, w = layerW(k), c = mk(w, 420), g = c.getContext('2d');
      for (let x = 30; x < w - 200; x += 420) {
        // mesa
        g.fillStyle = '#3A3F78';
        g.fillRect(x, 250, 380, 24);
        g.fillStyle = '#262A58';
        g.fillRect(x + 10, 274, 16, 140);
        g.fillRect(x + 354, 274, 16, 140);
        // cabos pendurados
        g.strokeStyle = '#151838';
        g.lineWidth = 4;
        g.beginPath();
        g.moveTo(x + 120, 274);
        g.quadraticCurveTo(x + 150, 400, x + 190, 420);
        g.moveTo(x + 260, 274);
        g.quadraticCurveTo(x + 230, 380, x + 300, 420);
        g.stroke();
        // dois monitores
        for (let m = 0; m < 2; m++) {
          const mx = x + 40 + m * 170;
          g.fillStyle = '#0D0F26';
          g.fillRect(mx, 120, 150, 100);
          g.strokeStyle = '#4A5199';
          g.lineWidth = 5;
          g.strokeRect(mx, 120, 150, 100);
          g.fillStyle = '#2B2F5F';
          g.fillRect(mx + 66, 220, 18, 30);
          monitors.push({ x: mx + 6, y: 126, w: 138, h: 88, k, off: U.randi(0, 20), color: U.choice(['#4DF3E8', '#7CFF8A', '#B9A6FF']) });
        }
        // caneca e teclado
        g.fillStyle = '#E8323C';
        g.fillRect(x + 340, 226, 22, 24);
        g.fillStyle = '#1B1F40';
        g.fillRect(x + 90, 240, 120, 10);
        // cadeira
        g.fillStyle = '#1A1D3E';
        g.fillRect(x + 150, 230, 80, 90);
        g.fillRect(x + 180, 320, 20, 60);
        g.fillRect(x + 140, 376, 100, 10);
      }
      layers.desks = { c, k, y: 470 };
    }
    // código para monitores
    const cc = mk(140, 400);
    const cg = cc.getContext('2d');
    cg.font = `9px ${FF.FONT_UI}`;
    for (let i = 0; i < 40; i++) {
      cg.fillStyle = i % 5 === 0 ? '#FFC531' : 'rgba(220,240,255,0.85)';
      cg.fillText(CODE[i % CODE.length], 2, 10 + i * 10);
    }
    layers.code = cc;
    // torcida
    const shirts = ['#2F7BFF', '#E8323C', '#FFC531', '#19A7A0', '#9B6BFF', '#F3F6FF', '#FF8FB8', '#7CFF8A'];
    const skins = ['#EDB48A', '#C98A62', '#8D5A3C', '#F2C9A5', '#6B4430'];
    const wl = layerW(0.62);
    for (let x = 60; x < wl - 60; x += U.rand(70, 110)) {
      crowd.push({ x, shirt: U.choice(shirts), skin: U.choice(skins), h: U.rand(0.9, 1.1), ph: Math.random() * 6, prop: U.choice([null, null, 'mug', 'laptop', 'sign']) });
    }
    codeLines.length = 0;
  }

  function drawCrowd(ctx, camX, B, time) {
    const k = 0.62;
    const ox = layerX(k, camX);
    const hype = B ? B.hype : 0.3;
    const baseY = 760;
    for (const p of crowd) {
      const x = ox + p.x;
      if (x < -80 || x > W + 80) continue;
      const jump = Math.max(0, Math.sin(time * 0.25 + p.ph)) * 18 * hype;
      const bob = Math.sin(time * 0.08 + p.ph) * 3;
      const y = baseY - jump + bob;
      const s = p.h;
      ctx.fillStyle = p.shirt;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.moveTo(x - 30 * s, y);
      ctx.lineTo(x - 24 * s, y - 80 * s);
      ctx.lineTo(x + 24 * s, y - 80 * s);
      ctx.lineTo(x + 30 * s, y);
      ctx.fill();
      ctx.fillStyle = p.skin;
      ctx.beginPath();
      ctx.arc(x, y - 100 * s, 20 * s, 0, Math.PI * 2);
      ctx.fill();
      // braços levantados quando empolgados
      ctx.strokeStyle = p.shirt;
      ctx.lineWidth = 10 * s;
      ctx.lineCap = 'round';
      const up = hype > 0.35 ? 1 : 0;
      ctx.beginPath();
      ctx.moveTo(x - 22 * s, y - 72 * s);
      ctx.lineTo(x - 34 * s, y - (up ? 130 : 30) * s);
      ctx.moveTo(x + 22 * s, y - 72 * s);
      ctx.lineTo(x + 34 * s, y - (up ? 130 : 30) * s);
      ctx.stroke();
      if (p.prop === 'mug') {
        ctx.fillStyle = '#F3F6FF';
        ctx.fillRect(x + 28 * s, y - (up ? 146 : 46) * s, 14, 16);
      } else if (p.prop === 'sign' && hype > 0.2) {
        ctx.fillStyle = '#F3F6FF';
        ctx.fillRect(x - 46 * s, y - 190 * s, 92 * s, 44 * s);
        ctx.fillStyle = '#1A1033';
        ctx.font = `${13 * s}px ${FF.FONT_D}`;
        ctx.textAlign = 'center';
        ctx.fillText(p.x % 3 < 1.5 ? 'LGTM!' : 'DEPLOY!', x, y - 162 * s);
      } else if (p.prop === 'laptop') {
        ctx.fillStyle = '#3A3F78';
        ctx.fillRect(x - 26 * s, y - 60 * s, 52 * s, 30 * s);
      }
      ctx.globalAlpha = 1;
    }
  }

  // camadas de trás (desenhadas com a transformação de zoom já aplicada)
  function drawBack(ctx, camX, B, time) {
    build();
    const top = GY - 760 - 190;
    ctx.fillStyle = '#161A44';
    ctx.fillRect(-400, -400, W + 800, H + 800);
    // céu e cidade
    const sk = layers.sky;
    ctx.drawImage(sk.c, layerX(sk.k, camX), top);
    // parede
    const wl = layers.wall;
    const wx = layerX(wl.k, camX);
    ctx.drawImage(wl.c, wx, top);
    // letreiro piscando
    const flick = Math.sin(time * 0.05) > -0.97 || (time % 7) > 3;
    if (flick) {
      ctx.save();
      ctx.font = `150px ${FF.FONT_D}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255,225,240,0.92)';
      ctx.fillText('FABRICAR', wx + layers.wallSign.x, top + layers.wallSign.y);
      ctx.restore();
    }
    // LEDs dos servidores
    for (const l of leds) {
      const on = Math.sin(time * 0.2 + l.ph * 3) > 0.2;
      if (!on) continue;
      ctx.fillStyle = l.c;
      ctx.fillRect(wx + l.x, top + l.y, 5, 5);
    }
    // vapor do café
    if (time % 6 === 0 && B && B.fx) {
      /* vapor é desenhado aqui mesmo, sem partículas de mundo */
    }
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#F3F6FF';
    for (let i = 0; i < 4; i++) {
      const t = (time * 0.6 + i * 18) % 70;
      ctx.beginPath();
      ctx.arc(wx + layers.coffee.x + Math.sin((time + i * 20) * 0.08) * 6, top + layers.coffee.y - t, 6 + t * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // torcida
    drawCrowd(ctx, camX, B, time);
    // mesas e monitores com código rolando
    const dk = layers.desks;
    const dx = layerX(dk.k, camX);
    const dy = GY - dk.y;
    ctx.drawImage(dk.c, dx, dy);
    for (const m of monitors) {
      const sx = dx + m.x;
      if (sx < -160 || sx > W + 20) continue;
      const off = ((time * 0.6 + m.off * 10) % 300);
      ctx.save();
      ctx.beginPath();
      ctx.rect(sx, dy + m.y, m.w, m.h);
      ctx.clip();
      ctx.fillStyle = 'rgba(10,14,40,1)';
      ctx.fillRect(sx, dy + m.y, m.w, m.h);
      ctx.drawImage(layers.code, sx, dy + m.y - off);
      ctx.fillStyle = m.color;
      ctx.globalAlpha = 0.12;
      ctx.fillRect(sx, dy + m.y, m.w, m.h);
      ctx.restore();
    }
    // piso
    const fy = GY - 70;
    const fl = ctx.createLinearGradient(0, fy, 0, H + 200);
    fl.addColorStop(0, '#2B2A62');
    fl.addColorStop(1, '#141433');
    ctx.fillStyle = fl;
    ctx.fillRect(-300, fy, W + 600, H - fy + 300);
    // linhas de perspectiva do piso (movem com a câmera)
    ctx.strokeStyle = 'rgba(120,130,220,0.18)';
    ctx.lineWidth = 2;
    const step = 160;
    const start = Math.floor((camX - W) / step) * step;
    for (let x = start; x < camX + W; x += step) {
      const sxTop = x - camX + W / 2;
      const sxBot = W / 2 + (sxTop - W / 2) * 1.9;
      ctx.beginPath();
      ctx.moveTo(sxTop, fy);
      ctx.lineTo(sxBot, H + 200);
      ctx.stroke();
    }
    for (let i = 0; i < 4; i++) {
      const yy = fy + 40 + i * i * 22;
      ctx.beginPath();
      ctx.moveTo(-300, yy);
      ctx.lineTo(W + 300, yy);
      ctx.stroke();
    }
    // reflexo do letreiro no piso
    ctx.save();
    const rx = wx + layers.wallSign.x;
    ctx.globalAlpha = flick ? 1 : 0.3;
    ctx.save();
    ctx.beginPath();
    ctx.rect(rx - 600, fy, 1200, 400);
    ctx.clip();
    ctx.drawImage(layers.reflect, rx - 520, GY + 30 - 520);
    ctx.restore();
    ctx.restore();
  }

  // luzes de teto (cones) + primeiro plano
  function drawFront(ctx, camX, B, time) {
    build();
    // primeiro plano: cabos e bordas de cadeiras desfocadas
    const fx = layerX(1.3, camX);
    ctx.fillStyle = 'rgba(8,8,24,0.85)';
    for (let i = 0; i < 6; i++) {
      const x = fx + i * 760;
      if (x < -300 || x > W + 300) continue;
      ctx.beginPath();
      ctx.ellipse(x, H + 30, 200, 70, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(x - 12, H - 120, 24, 120);
      ctx.beginPath();
      ctx.ellipse(x, H - 130, 90, 26, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(8,8,24,0.9)';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(fx - 200, H - 10);
    for (let i = 0; i < 12; i++) ctx.quadraticCurveTo(fx + i * 300 + 150, H - 40, fx + (i + 1) * 300, H - 8);
    ctx.stroke();
  }

  return { drawBack, drawFront, drawCrowd, build };
})();
