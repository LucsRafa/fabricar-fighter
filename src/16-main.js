// ============================================================
// MAIN — canvas responsivo (base 1920×1080), laço com passo fixo
// de 60 Hz independente da taxa de renderização
// ============================================================
(function () {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  // q = resolução interna do canvas em relação a 1920×1080.
  // Vai até 2× para ficar nítido em telas 1440p/4K e notebooks com escala alta.
  const Q_MAX = 2;
  let q = 1;
  let want = 1; // o que a tela pede (tamanho × devicePixelRatio)
  let perfCap = Q_MAX;
  function setQuality(nq) {
    nq = Math.max(0.5, Math.min(Q_MAX, Math.round(nq * 20) / 20, perfCap));
    if (nq === q && canvas.width === Math.round(FF.W * q)) return;
    q = nq;
    canvas.width = Math.round(FF.W * q);
    canvas.height = Math.round(FF.H * q);
  }
  function fit() {
    const s = Math.min(window.innerWidth / FF.W, window.innerHeight / FF.H);
    canvas.style.width = Math.floor(FF.W * s) + 'px';
    canvas.style.height = Math.floor(FF.H * s) + 'px';
    want = s * (window.devicePixelRatio || 1);
    setQuality(want);
  }
  window.addEventListener('resize', fit);
  fit();

  FF.Settings.load();
  FF.Input.attach(canvas);

  let last = performance.now();
  let acc = 0;
  let fps = 60, fpsAcc = 0, fpsN = 0, slow = 0, verySlow = 0, good = 0;
  let workAcc = 0; // tempo gasto de verdade desenhando (ms), para não confundir PC lento
  // com navegador limitando o FPS (economia de energia, aba em 30 Hz etc.)
  const bootAt = performance.now();
  const isMax = () => FF.Settings.data.graphics === '3dmax';

  // aviso rápido na tela (ex.: motivo de ter trocado para 2D)
  FF.notice = null;
  FF.notify = function (msg, ms) {
    FF.notice = { msg, until: performance.now() + (ms || 6000), at: performance.now() };
  };
  function drawNotice(now) {
    const n = FF.notice;
    if (!n) return;
    if (now > n.until) {
      FF.notice = null;
      return;
    }
    const a = Math.min(1, (now - n.at) / 200, (n.until - now) / 300);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = `700 24px ${FF.FONT_UI}`;
    const w = Math.min(1500, ctx.measureText(n.msg).width + 60);
    const x = FF.W / 2 - w / 2, y = FF.H - 120;
    ctx.fillStyle = 'rgba(10,12,28,0.88)';
    ctx.strokeStyle = 'rgba(255,92,168,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, y, w, 56, 12) : ctx.rect(x, y, w, 56);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#F3F6FF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(n.msg, FF.W / 2, y + 29);
    ctx.restore();
  }
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
    const t0 = performance.now();
    try {
      ctx.setTransform(q, 0, 0, q, 0, 0);
      ctx.imageSmoothingQuality = 'high';
      FF.Scenes.render(ctx);
      drawNotice(now);
    } catch (err) {
      console.error(err);
    }
    workAcc += performance.now() - t0;
    fpsAcc += dt;
    fpsN++;
    if (fpsAcc > 500) {
      fps = (fpsN * 1000) / fpsAcc;
      const work = workAcc / fpsN; // ms por quadro realmente gastos desenhando
      fpsAcc = 0;
      fpsN = 0;
      workAcc = 0;
      FF.perf = { fps, work, q, res: FF.GL.res };
      const warm = now - bootAt > 3000; // ignora os engasgos do carregamento
      // só é "lento" se o FPS caiu E o desenho está pesado de verdade
      const heavy = fps < 48 && work > 11;
      if (!warm || isMax()) {
        slow = verySlow = good = 0;
      } else {
        // máquina sem fôlego nenhum para o 3D: volta sozinho para o 2D (só nesta sessão)
        if (!FF.force2D && !FF.slowGuardOff && FF.GL.ok && FF.GL.res <= 0.75 && fps < 30 && work > 22) {
          if (++verySlow >= 4) {
            FF.force2D = true;
            verySlow = 0;
            FF.notify('3D pesado demais neste PC: trocado para 2D. Em Configurações dá para usar "3D (máximo)".', 8000);
          }
        } else verySlow = 0;
        if (heavy) {
          good = 0;
          slow++;
          // primeiro reduz a resolução da tela (se estiver acima de 1×), depois a dos bonecos
          if (q > 1 && slow >= 2) {
            perfCap = Math.max(1, q - 0.25);
            setQuality(perfCap);
            slow = 0;
          } else if (FF.GL.ok && !FF.force2D && FF.GL.res > 0.7 && slow >= 3) {
            FF.GL.res = Math.max(0.7, FF.GL.res - 0.15);
            slow = 0;
          } else if (q > 0.55 && slow >= 3) {
            perfCap = Math.max(0.5, q - 0.1);
            setQuality(perfCap);
            slow = 0;
          }
        } else {
          slow = 0;
          // sobrou fôlego: devolve a nitidez aos poucos
          if (work < 7 && ++good >= 4) {
            good = 0;
            if (FF.GL.res < 1) FF.GL.res = Math.min(1, FF.GL.res + 0.15);
            else if (perfCap < want) {
              perfCap = Math.min(Q_MAX, perfCap + 0.25);
              setQuality(want);
            }
          }
        }
      }
      if (isMax()) {
        FF.GL.res = 1;
        if (perfCap < Q_MAX) {
          perfCap = Q_MAX;
          setQuality(want);
        }
      }
    }
    if (showFps) FF.text(ctx, `tela ${(q * 100).toFixed(0)}%  ·  bonecos ${(FF.GL.res * 100).toFixed(0)}%`, 60, FF.H - 50, { size: 16, font: FF.FONT_UI, color: '#7CFF8A', lw: 4, align: 'left' });
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
    if (!FF.force2D && !FF.GL.ok) {
      FF.notify('Seu navegador não liberou o WebGL: usando 2D. Ative a aceleração gráfica nas configurações do navegador.', 9000);
    }
    FF.Stage.build();
    FF.Scenes.go(new FF.Scenes.Title());
    requestAnimationFrame(frame);
  });

  // gancho para testes automatizados
  window.__FF = FF;
})();
