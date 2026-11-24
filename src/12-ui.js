// ============================================================
// INTERFACE — HUD da luta (vida, tempo, barras, combos, rounds),
// anúncios, legendas de falas e componentes de menu
// ============================================================
FF.UI = (function () {
  const U = FF.U;
  const W = FF.W;
  const T = FF.text;

  // barra inclinada (paralelogramo)
  function slant(ctx, x, y, w, h, skew, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + skew, y);
    ctx.lineTo(x + w + skew, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 4;
      ctx.stroke();
    }
  }

  function healthBar(ctx, f, side, B) {
    const bw = 720, bh = 40, y = 52;
    const x = side === 0 ? W / 2 - 110 - bw : W / 2 + 110;
    const max = f.def.hp;
    const pct = U.clamp(f.hp / max, 0, 1);
    const lagPct = U.clamp(f.hpLag / max, 0, 1);
    ctx.save();
    slant(ctx, x - 6, y - 6, bw + 12, bh + 12, side === 0 ? 14 : -14, '#1A1033');
    slant(ctx, x, y, bw, bh, side === 0 ? 12 : -12, '#2B2150');
    // dano atrasado
    const fillW = (p) => bw * p;
    ctx.save();
    ctx.beginPath();
    if (side === 0) ctx.rect(x + bw - fillW(lagPct), y, fillW(lagPct) + 14, bh);
    else ctx.rect(x - 14, y, fillW(lagPct) + 14, bh);
    ctx.clip();
    slant(ctx, x, y, bw, bh, side === 0 ? 12 : -12, '#F3F6FF');
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    if (side === 0) ctx.rect(x + bw - fillW(pct), y, fillW(pct) + 14, bh);
    else ctx.rect(x - 14, y, fillW(pct) + 14, bh);
    ctx.clip();
    const low = pct < 0.3;
    const g = ctx.createLinearGradient(0, y, 0, y + bh);
    g.addColorStop(0, low ? '#FF6A6A' : '#FFE07A');
    g.addColorStop(1, low ? '#C21E2A' : '#FFB21A');
    slant(ctx, x, y, bw, bh, side === 0 ? 12 : -12, g);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(x - 20, y + 4, bw + 40, 6);
    ctx.restore();
    const ring = f.tadalas > 0 ? '#FFC531' : f.sleeping > 0 ? '#7CFF8A' : f.fumada > 0 ? '#C9CEDB' : pct < 0.25 && pct > 0 ? '#FF6A6A' : null;
    if (ring) {
      ctx.save();
      ctx.globalAlpha = 0.55 + Math.sin(B.time * 0.12) * 0.25;
      slant(ctx, x, y, bw, bh, side === 0 ? 12 : -12, null, ring);
      ctx.restore();
    }
    ctx.restore();
    // retrato
    const px = side === 0 ? x - 70 : x + bw + 70;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(px - 54, 20); ctx.lineTo(px + 54, 20); ctx.lineTo(px + 54, 130); ctx.lineTo(px - 54, 130); ctx.closePath();
    ctx.fillStyle = f.def.portraitTint;
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#1A1033';
    ctx.stroke();
    ctx.clip();
    FF.Anim.drawPortrait(ctx, f.id, px, 80, 1.15, side === 0 ? 1 : -1, f.state === 'hitstun' || f.state === 'juggle' ? 'hurt' : 'normal');
    ctx.restore();
    // nome
    T(ctx, f.def.name, side === 0 ? x + 6 : x + bw - 6, y + bh + 30, { size: 30, align: side === 0 ? 'left' : 'right', color: '#F3F6FF', lw: 7 });
    // rounds vencidos
    const wins = B.rounds.wins[side];
    for (let i = 0; i < 2; i++) {
      const cx = side === 0 ? x + bw - 20 - i * 40 : x + 20 + i * 40;
      ctx.save();
      ctx.translate(cx, y + bh + 28);
      const popT = B.winPop && B.winPop.side === side && i === wins - 1 ? B.winPop.t : 0;
      if (popT > 0 && !FF.reduced) ctx.scale(1 + popT / 24 * 0.7, 1 + popT / 24 * 0.7);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = i < wins ? '#FFC531' : '#2B2150';
      ctx.strokeStyle = '#1A1033';
      ctx.lineWidth = 4;
      ctx.fillRect(-11, -11, 22, 22);
      ctx.strokeRect(-11, -11, 22, 22);
      ctx.restore();
    }
  }

  function meterBar(ctx, f, side, B) {
    const bw = 520, bh = 26, y = 1010;
    const x = side === 0 ? 70 : W - 70 - bw;
    const pct = U.clamp((f._meterShown == null ? f.meter : f._meterShown) / 100, 0, 1);
    const ready = f.meter >= 100;
    ctx.save();
    slant(ctx, x - 5, y - 5, bw + 10, bh + 10, side === 0 ? 10 : -10, '#1A1033');
    slant(ctx, x, y, bw, bh, side === 0 ? 8 : -8, '#241A48');
    ctx.save();
    ctx.beginPath();
    if (side === 0) ctx.rect(x - 10, y, bw * pct + 10, bh);
    else ctx.rect(x + bw - bw * pct, y, bw * pct + 10, bh);
    ctx.clip();
    const col = f.def.look.meter;
    const g = ctx.createLinearGradient(x, 0, x + bw, 0);
    g.addColorStop(0, side === 0 ? col[1] : col[0]);
    g.addColorStop(1, side === 0 ? col[0] : col[1]);
    // animação de preenchimento suave
    f._meterShown = FF.approach(f._meterShown, f.meter, 0.18);
    slant(ctx, x, y, bw, bh, side === 0 ? 8 : -8, g);
    if (ready && !FF.reduced) {
      const p = ((B.time % 72) / 72) * (bw + 240) - 120;
      const sx = side === 0 ? x + p : x + bw - p;
      const sh = ctx.createLinearGradient(sx - 70, 0, sx + 70, 0);
      sh.addColorStop(0, 'rgba(255,255,255,0)');
      sh.addColorStop(0.5, 'rgba(255,255,255,0.75)');
      sh.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sh;
      ctx.fillRect(sx - 70, y, 140, bh);
    }
    ctx.restore();
    // marcas de 25%
    ctx.strokeStyle = 'rgba(26,16,51,0.7)';
    ctx.lineWidth = 3;
    for (let i = 1; i < 4; i++) {
      const mx = x + (bw * i) / 4;
      ctx.beginPath();
      ctx.moveTo(mx + 6, y);
      ctx.lineTo(mx, y + bh);
      ctx.stroke();
    }
    ctx.restore();
    const label = ready ? 'SPECIAL READY' : `${Math.floor(f.meter)}%`;
    T(ctx, label, side === 0 ? x : x + bw, y - 26, {
      size: ready ? 30 : 24, align: side === 0 ? 'left' : 'right', color: ready ? (Math.sin(B.time * 0.075) > 0 ? '#FFC531' : '#FFE7A3') : '#C9CEF5', lw: 6,
    });
    T(ctx, f.def.superName, side === 0 ? x + bw : x, y - 26, { size: 18, font: FF.FONT_UI, weight: '700', align: side === 0 ? 'right' : 'left', color: '#8C93C9', lw: 5 });
    // indicador de habilidade ativa
    let active = null;
    if (f.tadalas > 0) active = { text: `MODO TADALAS  ${(f.tadalas / 60).toFixed(1)}s`, color: '#FFC531' };
    else if (f.tb) active = { text: `SAQUE DE TAMBORÉU  ${f.tb.hits}/8`, color: '#E3F27A' };
    else if (f.whip) active = { text: `CHICOTE DO PRAZO  ${f.whip.hits}/6`, color: '#A9C8F5' };
    else if (f.rolling) active = { text: `ROLAMENTO  ${f.rollHits || 0}/3`, color: '#9EC1FF' };
    else if (f.fumada > 0) active = { text: `FUMADA ${(f.fumada / 60).toFixed(1)}s · +10 ATQ · −1 HP/s`, color: '#C9CEDB' };
    else if (f.sleeping > 0) active = { text: `TESTER CULPOSO  +${f.healed.toFixed(0)} HP`, color: '#7CFF8A' };
    else if (B.standOf(f)) active = { text: 'CLADIIO ONLINE', color: '#4DF3E8' };
    else if (f.state === 'super') active = { text: f.def.superName.toUpperCase(), color: '#F3F6FF' };
    if (active) {
      const ax = side === 0 ? x : x + bw;
      ctx.save();
      ctx.globalAlpha = 0.9;
      slant(ctx, side === 0 ? ax : ax - 440, y - 96, 440, 44, 12, 'rgba(26,16,51,0.85)', active.color);
      ctx.restore();
      T(ctx, active.text, side === 0 ? ax + 226 : ax - 214, y - 74, { size: 26, color: active.color, lw: 6 });
    }
  }

  function timer(ctx, B) {
    const t = B.rounds.timerDisplay();
    ctx.save();
    ctx.translate(W / 2, 80);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i;
      ctx.lineTo(Math.cos(a) * 82, Math.sin(a) * 66);
    }
    ctx.closePath();
    ctx.fillStyle = '#1A1033';
    ctx.fill();
    ctx.strokeStyle = '#4DF3E8';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
    const low = typeof t === 'number' && t <= 10;
    T(ctx, String(t), W / 2, 86, { size: 74, color: low ? '#FF6A6A' : '#F3F6FF', lw: 8 });
    T(ctx, `ROUND ${B.rounds.round}`, W / 2, 160, { size: 20, color: '#8C93C9', lw: 5 });
  }

  function combos(ctx, B) {
    for (let s = 0; s < 2; s++) {
      const c = B.combos[s];
      if (!c || c.hits < 2) continue;
      const a = Math.min(1, c.t / 20);
      const x = s === 0 ? 120 : W - 120;
      const pop = c.pop > 0 ? 1 + c.pop * 0.04 : 1;
      T(ctx, `${c.hits}`, x, 330, { size: 110 * pop, color: '#FFC531', align: s === 0 ? 'left' : 'right', alpha: a, lw: 12 });
      T(ctx, 'HITS', x, 410, { size: 44, color: '#F3F6FF', align: s === 0 ? 'left' : 'right', alpha: a, lw: 8 });
      T(ctx, `${c.dmg.toFixed(0)} de dano`, x, 456, { size: 24, font: FF.FONT_UI, weight: '700', color: '#C9CEF5', align: s === 0 ? 'left' : 'right', alpha: a, lw: 6 });
    }
  }

  // anúncios centrais (ROUND 1, FIGHT!, K.O. ...)
  const STYLE = {
    big: { size: 170, color: '#FFC531', stroke: '#1A1033', y: 470 },
    fight: { size: 220, color: '#E8323C', stroke: '#1A1033', y: 480 },
    ko: { size: 260, color: '#E8323C', stroke: '#FFF', y: 480 },
    side: { size: 64, color: '#FF4FA3', stroke: '#1A1033', y: 250 },
    callout: { size: 70, color: '#F3F6FF', stroke: '#1A1033', y: 260 },
    result: { size: 180, color: '#FFC531', stroke: '#1A1033', y: 470 },
    ready: { size: 54, color: '#4DF3E8', stroke: '#1A1033', y: 900 },
  };
  function announcements(ctx, B) {
    for (const m of B.msgs) {
      const st = STYLE[m.style] || STYLE.big;
      const age = m.max - m.t;
      const pop = age < 8 ? 1.6 - age * 0.075 : 1;
      const a = m.t < 12 ? m.t / 12 : 1;
      let x = W / 2;
      if (m.style === 'side' || m.style === 'ready') x = m.slot === 0 ? 420 : W - 420;
      if (m.style === 'callout') x = m.slot === 0 ? 560 : W - 560;
      const y = st.y + (m.style === 'side' ? m.row * 70 : 0);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(m.style === 'big' || m.style === 'fight' || m.style === 'result' ? -0.05 : 0);
      if (m.style === 'fight' || m.style === 'ko' || m.style === 'result') {
        ctx.globalAlpha = a * 0.5;
        ctx.fillStyle = '#1A1033';
        ctx.fillRect(-W, -st.size * 0.55, W * 2, st.size * 1.1);
        ctx.globalAlpha = 1;
      }
      T(ctx, m.text, 0, 0, { size: st.size * pop, color: st.color, stroke: st.stroke, lw: st.size * 0.12, alpha: a });
      ctx.restore();
    }
  }

  function speech(ctx, B) {
    for (const f of B.f) {
      if (!f.speech) continue;
      const sp = B.worldToScreen(f.x, f.y - f.def.height - 120);
      const a = Math.min(1, f.speech.t / 15);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.font = `700 30px ${FF.FONT_UI}`;
      const w = ctx.measureText(f.speech.text).width + 40;
      const x = U.clamp(sp.x - w / 2, 20, W - w - 20);
      const y = U.clamp(sp.y - 40, 190, 800);
      ctx.fillStyle = '#F3F6FF';
      ctx.strokeStyle = '#1A1033';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x, y, w, 56, 14) : ctx.rect(x, y, w, 56);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      const tx = U.clamp(sp.x, x + 20, x + w - 20);
      ctx.moveTo(tx - 12, y + 54);
      ctx.lineTo(tx, y + 80);
      ctx.lineTo(tx + 12, y + 54);
      ctx.fill();
      ctx.fillStyle = '#1A1033';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(f.speech.text, x + 20, y + 29);
      ctx.restore();
    }
  }

  function trainingPanel(ctx, B) {
    const o = B.trainingOpts;
    const x = W - 340, y = 196;
    ctx.save();
    ctx.fillStyle = 'rgba(18,22,58,0.55)';
    ctx.fillRect(x, y, 320, 548);
    ctx.fillStyle = '#4DF3E8';
    ctx.fillRect(x, y, 4, 548);
    ctx.restore();
    T(ctx, 'Treinamento', x + 20, y + 30, { size: 28, align: 'left', color: '#4DF3E8', lw: 5 });
    const rows = [
      ['Dano do combo', B.trainingStats.last.toFixed(1)],
      ['Maior combo', `${B.trainingStats.maxHits} hits / ${B.trainingStats.maxDmg.toFixed(1)}`],
      ['Dano total', B.trainingStats.total.toFixed(1)],
      ['Adversário (F2)', { stand: 'Parado', block: 'Defende tudo', crouch: 'Agachado', cpu: 'CPU' }[o.dummy]],
      ['Vida infinita', o.infiniteLife ? 'Sim' : 'Não'],
      ['Barra infinita (F3)', o.infiniteMeter ? 'Sim' : 'Não'],
      ['Hitboxes (F1)', o.hitboxes ? 'Visíveis' : 'Ocultas'],
      ['Reiniciar posição', 'Backspace'],
    ];
    rows.forEach((r, i) => {
      T(ctx, r[0], x + 20, y + 76 + i * 36, { size: 20, font: FF.FONT_UI, weight: '600', align: 'left', color: '#C9CEF5', lw: 0 });
      T(ctx, String(r[1]), x + 300, y + 76 + i * 36, { size: 20, font: FF.FONT_UI, weight: '700', align: 'right', color: '#F3F6FF', lw: 0 });
    });
    // histórico de comandos (P1)
    T(ctx, 'Histórico de comandos', x + 20, y + 380, { size: 20, font: FF.FONT_UI, weight: '700', align: 'left', color: '#4DF3E8', lw: 0 });
    const arrows = { 1: '↙', 2: '↓', 3: '↘', 4: '←', 5: '•', 6: '→', 7: '↖', 8: '↑', 9: '↗' };
    const names = { lp: 'SL', mp: 'SM', hp: 'SF', lk: 'CL', mk: 'CM', hk: 'CF', grab: 'AGR', sec: 'SEC', sup: 'DEF', sp1: 'E1', sp2: 'E2', sp3: 'E3', sp4: 'E4' };
    const log = B.inputs[0].log;
    for (let i = 0; i < Math.min(8, log.length); i++) {
      const e = log[i];
      const line = `${arrows[e.d]}  ${e.b.map((b) => names[b]).join('+')}`;
      T(ctx, line, x + 20, y + 410 + i * 18, { size: 16, font: FF.FONT_UI, weight: '700', align: 'left', color: i === 0 ? '#FFC531' : '#F3F6FF', lw: 0 });
      T(ctx, String(e.n), x + 300, y + 410 + i * 18, { size: 14, font: FF.FONT_UI, align: 'right', color: '#8C93C9', lw: 0 });
    }
  }

  function hud(ctx, B) {
    healthBar(ctx, B.f[0], 0, B);
    healthBar(ctx, B.f[1], 1, B);
    timer(ctx, B);
    meterBar(ctx, B.f[0], 0, B);
    meterBar(ctx, B.f[1], 1, B);
    combos(ctx, B);
    speech(ctx, B);
    announcements(ctx, B);
    if (B.training) trainingPanel(ctx, B);
    if (B.mode === 'cpu') {
      T(ctx, `CPU · ${{ easy: 'Fácil', normal: 'Normal', hard: 'Difícil' }[B.difficulty]}`, W - 70, 180, { size: 18, font: FF.FONT_UI, weight: '700', align: 'right', color: '#8C93C9', lw: 4 });
    }
  }

  // ---------- componentes de menu ----------
  function button(ctx, label, x, y, w, h, focused, opt) {
    const o = opt || {};
    ctx.save();
    ctx.translate(x, y);
    const sk = 18;
    ctx.beginPath();
    ctx.moveTo(sk, 0);
    ctx.lineTo(w, 0);
    ctx.lineTo(w - sk, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = focused ? (o.color || '#FFC531') : 'rgba(26,16,51,0.82)';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = focused ? '#1A1033' : 'rgba(140,147,201,0.6)';
    ctx.stroke();
    ctx.restore();
    T(ctx, label, x + w / 2, y + h / 2 + 2, { size: o.size || 36, color: focused ? '#1A1033' : '#F3F6FF', stroke: focused ? '#FFF3C4' : '#1A1033', lw: focused ? 0 : 6 });
    if (focused) {
      ctx.save();
      ctx.fillStyle = o.color || '#FFC531';
      ctx.beginPath();
      ctx.moveTo(x - 34, y + h / 2 - 14);
      ctx.lineTo(x - 12, y + h / 2);
      ctx.lineTo(x - 34, y + h / 2 + 14);
      ctx.fill();
      ctx.restore();
    }
  }
  function inside(mx, my, x, y, w, h) {
    return mx >= x && mx <= x + w && my >= y && my <= y + h;
  }

  return { hud, button, inside, slant };
})();
