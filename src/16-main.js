// ============================================================
// MAIN — canvas responsivo (base 1920×1080), laço com passo fixo
// de 60 Hz independente da taxa de renderização
// ============================================================
(function () {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  let q = 1;
  let perfCap = 1;
  function setQuality(nq) {
    nq = Math.max(0.5, Math.min(1, Math.round(nq * 20) / 20, perfCap));
    if (nq === q && canvas.width === Math.round(FF.W * q)) return;
    q = nq;
    canvas.width = Math.round(FF.W * q);
    canvas.height = Math.round(FF.H * q);
  }
  function fit() {
    const s = Math.min(window.innerWidth / FF.W, window.innerHeight / FF.H);
    canvas.style.width = Math.floor(FF.W * s) + 'px';
    canvas.style.height = Math.floor(FF.H * s) + 'px';
    setQuality(s * (window.devicePixelRatio || 1));
  }
  window.addEventListener('resize', fit);
  fit();

  FF.Settings.load();
  FF.Input.attach(canvas);

  let last = performance.now();
  let acc = 0;
  let fps = 60, fpsAcc = 0, fpsN = 0, slow = 0, verySlow = 0;
  let showFps = false;
  window.addEventListener('keydown', (e) => {
    if (e.code === 'F4') showFps = !showFps;
  });

  function step() {
    FF.Input.pollPads();
    const ev = FF.Input.isRebinding() ? [] : FF.Input.menuEvents();
    FF.Scenes.update(ev);
  }

  function frame(now) {
    const dt = Math.min(250, now - last);
    last = now;
    acc += dt;
    let n = 0;
    while (acc >= FF.STEP && n < 6) {
      try {
        step();
      } catch (err) {
        console.error(err);
      }
      acc -= FF.STEP;
      n++;
    }
    if (n >= 6) acc = 0;
    try {
      ctx.setTransform(q, 0, 0, q, 0, 0);
      FF.Scenes.render(ctx);
    } catch (err) {
      console.error(err);
    }
    fpsAcc += dt;
    fpsN++;
    if (fpsAcc > 500) {
      fps = (fpsN * 1000) / fpsAcc;
      fpsAcc = 0;
      fpsN = 0;
      // máquina lenta: reduz a resolução interna para manter a fluidez
      // máquina sem fôlego para o 3D: volta sozinho para o 2D clássico (só nesta sessão)
      if (!FF.force2D && !FF.slowGuardOff && FF.GL.ok && FF.GL.res <= 0.6 && fps < 30) {
        if (++verySlow >= 4) {
          FF.force2D = true;
          verySlow = 0;
        }
      } else verySlow = 0;
      if (fps < 48 && FF.GL.ok && !FF.force2D && FF.GL.res > 0.6) {
        // primeiro reduz a resolução do 3D (os bonecos), depois a da tela
        slow++;
        if (slow >= 2) {
          FF.GL.res = Math.max(0.55, FF.GL.res - 0.15);
          slow = 0;
        }
      } else if (fps < 48 && q > 0.55) {
        slow++;
        if (slow >= 3) {
          perfCap = Math.max(0.5, q - 0.1);
          setQuality(perfCap);
          slow = 0;
        }
      } else slow = 0;
    }
    if (showFps) FF.text(ctx, `${(q * 100).toFixed(0)}%`, 60, FF.H - 50, { size: 16, font: FF.FONT_UI, color: '#7CFF8A', lw: 4, align: 'left' });
    if (showFps) FF.text(ctx, `${fps.toFixed(0)} FPS`, 60, FF.H - 24, { size: 18, font: FF.FONT_UI, color: '#7CFF8A', lw: 4, align: 'left' });
    requestAnimationFrame(frame);
  }

  // espera as fontes (com limite) antes de desenhar o letreiro
  const fontsReady = Promise.race([
    Promise.all([
      document.fonts ? document.fonts.load(`40px "Bungee"`) : Promise.resolve(),
      document.fonts ? document.fonts.load(`700 20px "Chakra Petch"`) : Promise.resolve(),
    ]).catch(() => {}),
    new Promise((r) => setTimeout(r, 2500)),
  ]);
  fontsReady.then(() => {
    FF.GL.init();
    FF.force2D = FF.Settings.data.graphics === '2d';
    FF.Stage.build();
    FF.Scenes.go(new FF.Scenes.Title());
    requestAnimationFrame(frame);
  });

  // gancho para testes automatizados
  window.__FF = FF;
})();
