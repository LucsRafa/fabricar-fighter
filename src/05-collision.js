// ============================================================
// SISTEMA DE COLISÕES — hitboxes, hurtboxes e pushboxes
// ============================================================
FF.Col = (function () {
  const C = {};

  C.overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  // caixa local [x à frente, y, w, h] → caixa no mundo
  C.world = function (f, box) {
    const [bx, by, bw, bh] = box;
    const x = f.facing > 0 ? f.x + bx : f.x - bx - bw;
    return { x, y: f.y + by, w: bw, h: bh };
  };

  // hurtboxes individuais (cabeça, tronco, pernas) conforme o estado
  C.hurtboxes = function (f) {
    if (f.isInvulnerable()) return [];
    const d = FF.Chars[f.id];
    const w = d.width;
    const h = d.height;
    const st = f.state;
    const out = [];
    const push = (box, tag) => {
      const r = C.world(f, box);
      r.tag = tag;
      out.push(r);
    };
    if (st === 'knockdown' || st === 'wakeup' || st === 'thrown') return out;
    if (f.ballR > 24) {
      const R = f.ballR;
      push([-R, -2 * R, 2 * R, 2 * R], 'body');
      return out;
    }
    if (f.sleeping > 0 || f.superWake > 0) {
      push([-w * 1.6, -80, w * 3.2, 80], 'body');
      return out;
    }
    if (st === 'juggle') {
      push([-w * 0.8, -h * 0.75, w * 1.6, h * 0.55], 'body');
      return out;
    }
    const crouching = f.isCrouching();
    if (f.airborne) {
      push([-w * 0.32, -h * 0.98, w * 0.64, h * 0.24], 'head');
      push([-w * 0.5, -h * 0.76, w, h * 0.42], 'body');
      push([-w * 0.45, -h * 0.36, w * 0.9, h * 0.22], 'legs');
    } else if (crouching) {
      const ch = h * 0.64;
      push([-w * 0.2, -ch, w * 0.62, h * 0.2], 'head');
      push([-w * 0.55, -ch + h * 0.18, w * 1.1, ch - h * 0.18], 'body');
    } else {
      const lean = f.state === 'attack' ? 10 : 0;
      push([-w * 0.32 + lean, -h, w * 0.64, h * 0.22], 'head');
      push([-w * 0.5, -h * 0.79, w, h * 0.42], 'body');
      push([-w * 0.45, -h * 0.38, w * 0.9, h * 0.38], 'legs');
    }
    // membro estendido também pode ser atingido (permite punir golpes)
    if (st === 'attack' && f.move && f.move.hits.length && f.move.kind !== 'super') {
      const m = f.move;
      const hit = m.hits[0];
      if (f.moveFrame >= hit.f0 && f.moveFrame <= m.hits[m.hits.length - 1].f1 + 6) {
        const b = hit.box;
        push([b[0] + b[2] * 0.1, b[1] + b[3] * 0.15, b[2] * 0.75, b[3] * 0.7], 'limb');
      }
    }
    return out;
  };

  C.pushbox = function (f) {
    const d = FF.Chars[f.id];
    const w = d.width * 0.62;
    if (f.airborne || f.state === 'juggle') return C.world(f, [-w / 2, -d.height * 0.72, w, d.height * 0.5]);
    return C.world(f, [-w / 2, -d.height * 0.62, w, d.height * 0.62]);
  };

  C.hitboxes = function (f) {
    if (f.state !== 'attack' || !f.move) return [];
    const out = [];
    const fr = f.curFrame;
    f.move.hits.forEach((h, i) => {
      if (fr >= h.f0 && fr <= h.f1) {
        const r = C.world(f, h.box);
        r.idx = i;
        r.hit = h;
        out.push(r);
      }
    });
    return out;
  };

  C.center = (r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

  // ponto de impacto (meio da interseção)
  C.impact = function (a, b) {
    const x0 = Math.max(a.x, b.x), x1 = Math.min(a.x + a.w, b.x + b.w);
    const y0 = Math.max(a.y, b.y), y1 = Math.min(a.y + a.h, b.y + b.h);
    return { x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
  };

  return C;
})();
