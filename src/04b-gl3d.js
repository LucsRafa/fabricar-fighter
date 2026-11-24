// ============================================================
// RENDERIZADOR 3D (WebGL próprio, sem dependências externas)
// Monta cada lutador com volumes 3D (esferas, cilindros, toros,
// caixas) sobre o MESMO esqueleto 2D da jogabilidade: hitboxes,
// golpes e especiais continuam idênticos. Luz principal, preenchimento,
// brilho especular e luz de contorno dão o visual de jogo de luta 3D.
// ============================================================
FF.GL = (function () {
  const G = { ok: false, yaw: 0.38, res: 1 };
  let batch = null;
  let canvas = null, gl = null, prog = null, L = {};
  const meshes = {};
  const colCache = {};
  const portraits = {};

  // ---------------- matrizes 4x4 (coluna-maior) ----------------
  const M = {
    id: () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),
    mul(a, b) {
      const o = new Float32Array(16);
      for (let c = 0; c < 4; c++)
        for (let r = 0; r < 4; r++)
          o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
      return o;
    },
    T: (x, y, z) => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]),
    S: (x, y, z) => new Float32Array([x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1]),
    Rz(a) {
      const c = Math.cos(a), s = Math.sin(a);
      return new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    },
    Ry(a) {
      const c = Math.cos(a), s = Math.sin(a);
      return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]);
    },
    Rx(a) {
      const c = Math.cos(a), s = Math.sin(a);
      return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]);
    },
    // inversa-transposta 3x3 (normais corretas com escala não uniforme e espelhamento)
    nrm(m) {
      const a = m[0], b = m[1], c = m[2], d = m[4], e = m[5], f = m[6], g = m[8], h = m[9], i = m[10];
      const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
      const D = -(b * i - c * h), E = a * i - c * g, F = -(a * h - b * g);
      const Gg = b * f - c * e, H = -(a * f - c * d), I = a * e - b * d;
      let det = a * A + b * B + c * C;
      if (Math.abs(det) < 1e-9) det = 1e-9;
      const k = 1 / det;
      return new Float32Array([A * k, B * k, C * k, D * k, E * k, F * k, Gg * k, H * k, I * k]);
    },
    apply(m, v) {
      return [m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12], m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13], m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14]];
    },
  };
  G.M = M;

  // ---------------- shaders ----------------
  const VS = `
attribute vec3 aPos; attribute vec3 aNor;
uniform mat4 uM; uniform mat4 uP; uniform mat3 uN;
varying vec3 vN;
void main(){ vN = normalize(uN * aNor); gl_Position = uP * (uM * vec4(aPos, 1.0)); }`;
  const FS = `
precision mediump float;
varying vec3 vN;
uniform vec4 uColor; uniform vec3 uKey; uniform vec3 uKeyCol; uniform vec3 uFill; uniform vec3 uRim;
uniform float uShine; uniform float uEmit;
void main(){
  vec3 N = normalize(vN);
  vec3 V = vec3(0.0, 0.0, 1.0);
  float nk = dot(N, uKey);
  float wrap = max((nk + 0.3) / 1.3, 0.0);
  float band = smoothstep(0.0, 0.08, nk);
  vec3 H = normalize(uKey + V);
  float spec = uShine > 1.0 ? pow(max(dot(N, H), 0.0), uShine) * 0.45 * band : 0.0;
  float rim = pow(1.0 - max(dot(N, V), 0.0), 2.6);
  float fill = max(dot(N, uFill), 0.0) * 0.28;
  vec3 base = uColor.rgb;
  vec3 c = base * (0.30 + 0.82 * wrap * uKeyCol + fill) + spec * uKeyCol + rim * uRim * 0.65;
  c = mix(c, base, uEmit);
  gl_FragColor = vec4(c, uColor.a);
}`;

  function shader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }

  // ---------------- malhas ----------------
  function upload(pos, nor, idx) {
    const data = new Float32Array(pos.length * 2);
    for (let i = 0; i < pos.length / 3; i++) {
      data.set(pos.slice(i * 3, i * 3 + 3), i * 6);
      data.set(nor.slice(i * 3, i * 3 + 3), i * 6 + 3);
    }
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
    return { vbo, ibo, n: idx.length };
  }
  function sphere(lat, lon, phiMax) {
    const pos = [], nor = [], idx = [];
    phiMax = phiMax || Math.PI;
    for (let i = 0; i <= lat; i++) {
      const th = (i / lat) * phiMax;
      for (let j = 0; j <= lon; j++) {
        const ph = (j / lon) * Math.PI * 2;
        const x = Math.sin(th) * Math.cos(ph), y = Math.cos(th), z = Math.sin(th) * Math.sin(ph);
        pos.push(x, y, z);
        nor.push(x, y, z);
      }
    }
    for (let i = 0; i < lat; i++)
      for (let j = 0; j < lon; j++) {
        const a = i * (lon + 1) + j, b = a + lon + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    return upload(pos, nor, idx);
  }
  // cilindro com ponta superior de raio "top" (inferior = 1), altura 1 centrada, com tampas
  function cylinder(top, seg) {
    const pos = [], nor = [], idx = [];
    seg = seg || 18;
    const slope = 1 - top;
    for (let j = 0; j <= seg; j++) {
      const a = (j / seg) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      const nl = Math.hypot(1, slope);
      pos.push(c, -0.5, s, c * top, 0.5, s * top);
      nor.push(c / nl, slope / nl, s / nl, c / nl, slope / nl, s / nl);
    }
    for (let j = 0; j < seg; j++) {
      const a = j * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
    const capBase = pos.length / 3;
    pos.push(0, 0.5, 0);
    nor.push(0, 1, 0);
    pos.push(0, -0.5, 0);
    nor.push(0, -1, 0);
    for (let j = 0; j <= seg; j++) {
      const a = (j / seg) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      pos.push(c * top, 0.5, s * top);
      nor.push(0, 1, 0);
      pos.push(c, -0.5, s);
      nor.push(0, -1, 0);
    }
    for (let j = 0; j < seg; j++) {
      const t = capBase + 2 + j * 2;
      idx.push(capBase, t, t + 2, capBase + 1, t + 3, t + 1);
    }
    return upload(pos, nor, idx);
  }
  function torus(r, seg, sides) {
    const pos = [], nor = [], idx = [];
    seg = seg || 24;
    sides = sides || 8;
    for (let i = 0; i <= seg; i++) {
      const u = (i / seg) * Math.PI * 2, cu = Math.cos(u), su = Math.sin(u);
      for (let j = 0; j <= sides; j++) {
        const v = (j / sides) * Math.PI * 2, cv = Math.cos(v), sv = Math.sin(v);
        pos.push((1 + r * cv) * cu, (1 + r * cv) * su, r * sv);
        nor.push(cv * cu, cv * su, sv);
      }
    }
    for (let i = 0; i < seg; i++)
      for (let j = 0; j < sides; j++) {
        const a = i * (sides + 1) + j, b = a + sides + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    return upload(pos, nor, idx);
  }
  function box() {
    const pos = [], nor = [], idx = [];
    const faces = [
      [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
    ];
    faces.forEach((n, f) => {
      const u = [n[1], n[2], n[0]], v = [n[2], n[0], n[1]];
      const base = pos.length / 3;
      for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        pos.push(n[0] * 0.5 + (u[0] * a + v[0] * b) * 0.5, n[1] * 0.5 + (u[1] * a + v[1] * b) * 0.5, n[2] * 0.5 + (u[2] * a + v[2] * b) * 0.5);
        nor.push(n[0], n[1], n[2]);
      }
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
      void f;
    });
    return upload(pos, nor, idx);
  }
  function cyl(top) {
    const k = 'c' + top.toFixed(2);
    if (!meshes[k]) meshes[k] = cylinder(top);
    return meshes[k];
  }

  G.init = function () {
    if (G.ok) return true;
    try {
      canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, preserveDrawingBuffer: true, antialias: true, depth: true });
      if (!gl) return false;
      prog = gl.createProgram();
      gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS));
      gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      gl.useProgram(prog);
      ['uM', 'uP', 'uN', 'uColor', 'uKey', 'uKeyCol', 'uFill', 'uRim', 'uShine', 'uEmit'].forEach((n) => (L[n] = gl.getUniformLocation(prog, n)));
      L.aPos = gl.getAttribLocation(prog, 'aPos');
      L.aNor = gl.getAttribLocation(prog, 'aNor');
      meshes.sphere = sphere(12, 18);
      meshes.half = sphere(8, 18, Math.PI / 2);
      meshes.box = box();
      meshes.torus = torus(0.16);
      meshes.ring = torus(0.1, 28, 6);
      meshes.cyl = cylinder(1);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.disable(gl.CULL_FACE);
      const k = [-0.38, 0.72, 0.58], kl = Math.hypot(...k);
      gl.uniform3f(L.uKey, k[0] / kl, k[1] / kl, k[2] / kl);
      gl.uniform3f(L.uKeyCol, 1.0, 0.96, 0.9);
      gl.uniform3f(L.uFill, 0.55, -0.1, 0.6);
      G.ok = true;
    } catch (e) {
      console.warn('3D indisponível, usando 2D', e && e.message);
      G.ok = false;
    }
    return G.ok;
  };

  function hexRGB(h) {
    if (colCache[h]) return colCache[h];
    const n = parseInt(h.slice(1), 16);
    return (colCache[h] = [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]);
  }

  // ---------------- montagem do boneco ----------------
  // retorna lista de peças {mesh, m (matriz no espaço do ator), col, a, shine}
  function buildActor(f, p, opts) {
    const def = FF.Chars[f.id];
    const dm = def.dims;
    const c = Object.assign({}, def.colors, f.altColor ? def.alt : {});
    if (f.pump > 0) {
      c.skin = FF.Anim.mixHex(c.skin, '#E0604A', f.pump * 0.45);
      c.skinShade = FF.Anim.mixHex(c.skinShade, '#A8352A', f.pump * 0.45);
    }
    const J = FF.Anim.solve(dm, p);
    const ground = f.airborne || f.state === 'juggle' || f.state === 'thrown' ? FF.Anim.standHeight(f.id) : J.low;
    const items = [];
    const A = opts.actor; // ator: espelho + giro 3/4
    const P3 = (q, z) => [q.x, ground - q.y, z || 0];
    const put = (mesh, local, col, o) => {
      items.push({ mesh, m: M.mul(A, local), col: hexRGB(col), a: (o && o.a) || 1, shine: o && o.shine != null ? o.shine : 18, emit: (o && o.emit) || 0 });
    };
    const ell = (v, sx, sy, sz, col, o, rot) => put(meshes.sphere, M.mul(M.mul(M.T(v[0], v[1], v[2]), rot || M.id()), M.S(sx, sy, sz)), col, o);
    // cápsula entre dois pontos
    const capsule = (a, b, r, col, o, zs) => {
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const len = Math.hypot(dx, dy) || 0.01;
      const ang = Math.atan2(dy, dx) - Math.PI / 2;
      const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
      put(meshes.cyl, M.mul(M.mul(M.T(mid[0], mid[1], mid[2]), M.Rz(ang)), M.S(r, len, r * (zs || 1))), col, o);
      ell(a, r, r, r * (zs || 1), col, o);
      ell(b, r, r, r * (zs || 1), col, o);
    };
    const tapered = (a, b, rBot, rTop, depth, col, o) => {
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const len = Math.hypot(dx, dy) || 0.01;
      const ang = Math.atan2(dy, dx) - Math.PI / 2;
      const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
      put(cyl(rTop / rBot), M.mul(M.mul(M.T(mid[0], mid[1], mid[2]), M.Rz(ang)), M.S(rBot, len, rBot * depth)), col, o);
      return { ang, len, mid };
    };

    // ---- Marcus enrolado como bola ----
    if (f.ballR > 24) {
      const R = f.ballR;
      const rot = M.Rz(-(f.rollAng || 0));
      const ctr = M.T(0, R, 0);
      put(meshes.sphere, M.mul(M.mul(ctr, rot), M.S(R, R, R)), c.main, { shine: 10 });
      put(meshes.half, M.mul(M.mul(M.mul(ctr, rot), M.Rz(Math.PI * 0.6)), M.S(R * 1.02, R * 1.02, R * 1.02)), c.pants, { shine: 8 });
      put(meshes.torus, M.mul(M.mul(ctr, rot), M.mul(M.Rx(Math.PI / 2), M.S(R * 0.62, R * 0.62, R * 0.9))), c.skin);
      const hp = M.mul(M.mul(ctr, rot), M.T(R * 0.55, R * 0.5, R * 0.3));
      put(meshes.sphere, M.mul(hp, M.S(R * 0.34, R * 0.36, R * 0.34)), c.skin, { shine: 40 });
      put(meshes.ring, M.mul(hp, M.mul(M.T(R * 0.28, R * 0.05, R * 0.12), M.mul(M.Ry(Math.PI / 2), M.S(R * 0.1, R * 0.1, R * 0.1)))), '#15151C');
      return { items, J: Object.assign(J, { ground: 0, head: { x: 0, y: -2 * R } }), ground: 0, ball: true };
    }

    const r = dm.head;
    const [uw, fw, tw, sw] = dm.limbW;
    const isM = def.build === 'muscle';
    const pump = 1 + (f.pump || 0) * 0.3;
    const zA = dm.chest * 0.32;
    const zL = dm.hipW * 0.42;
    const sleeveUpper = isM ? c.skin : c.main;
    const sleeveUpperBack = isM ? c.skinShade : c.shade;
    const foreFront = isM || def.sleeves !== 'long' ? c.skin : c.main;
    const foreBack = isM || def.sleeves !== 'long' ? c.skinShade : c.shade;

    // pernas
    const leg = (h, k, ft, ang, z, colP) => {
      capsule(P3(h, z), P3(k, z), tw / 2, colP, { shine: 6 });
      capsule(P3(k, z), P3(ft, z), sw / 2, colP, { shine: 6 });
      // tênis orientado pelo pé
      const fa = ((ang + 90) * Math.PI) / 180;
      const len = isM ? 50 : 42;
      const dx3 = Math.sin(fa), dy3 = -Math.cos(fa);
      const f3 = P3(ft, z);
      const base = M.mul(M.T(f3[0] + dx3 * len * 0.3, f3[1] + dy3 * len * 0.3, z), M.Rz(Math.atan2(dy3, dx3)));
      put(meshes.box, M.mul(base, M.S(len, sw * 0.62, sw * 0.95)), c.shoe, { shine: 30 });
      put(meshes.box, M.mul(M.mul(base, M.T(0, -sw * 0.32, 0)), M.S(len * 1.04, 5, sw)), c.shoeAccent, { shine: 4 });
    };
    leg(J.hb, J.bk, J.bf, J.ang.bf, -zL, c.pantsShade);
    // braço de trás
    const arm = (s, e, h, z, upCol, foreCol, handCol) => {
      capsule(P3(s, z), P3(e, z), (uw / 2) * (isM ? pump : 1), upCol, { shine: isM ? 26 : 8 });
      capsule(P3(e, z), P3(h, z), (fw / 2) * (isM ? pump : 1), foreCol, { shine: isM ? 26 : 8 });
      if (isM) {
        const w = { x: e.x + (h.x - e.x) * 0.78, y: e.y + (h.y - e.y) * 0.78 };
        capsule(P3(w, z), P3(h, z), (fw / 2) * pump * 1.08, c.accent, { shine: 40 });
      }
      ell(P3(h, z), fw * 0.66 * (isM ? pump : 1), fw * 0.62 * (isM ? pump : 1), fw * 0.6, handCol, { shine: 20 });
    };
    arm(J.sb, J.be, J.bh, -zA, sleeveUpperBack, foreBack, c.skinShade);
    // quadril
    ell(P3(J.hip, 0), dm.hipW * 0.62 + tw * 0.2, tw * 0.55, dm.hipW * 0.5 + tw * 0.3, c.pants, { shine: 6 });
    // tronco
    const tDepth = isM ? 0.72 : def.build === 'chubby' ? 0.85 : 0.62;
    const hip3 = P3(J.hip, 0), neck3 = P3(J.neck, 0);
    const chestR = (dm.chest / 2) * (isM ? 1 + (f.pump || 0) * 0.12 : 1);
    const T0 = tapered(hip3, neck3, dm.waist / 2, chestR, tDepth, isM ? c.skin : c.main, { shine: isM ? 26 : 8 });
    const along = (k, fwd) => {
      // ponto ao longo do tronco (k = 0 quadril → 1 pescoço), deslocado para frente
      const x = hip3[0] + (neck3[0] - hip3[0]) * k, y = hip3[1] + (neck3[1] - hip3[1]) * k;
      const nx = Math.cos(T0.ang), ny = Math.sin(T0.ang);
      return [x + nx * (fwd || 0), y + ny * (fwd || 0), 0];
    };
    if (isM) {
      // regata vermelha sobre o peitoral + cinto
      const top = along(0.82);
      const topR = (dm.waist / 2 + (chestR - dm.waist / 2) * 0.82) * 1.04;
      tapered(hip3, top, (dm.waist / 2) * 1.05, topR, tDepth * 1.05, c.main, { shine: 8 });
      const b0 = along(0.0), b1 = along(0.16);
      tapered(b0, b1, (dm.waist / 2) * 1.08, (dm.waist / 2) * 1.08, tDepth * 1.06, '#6B4226', { shine: 10 });
      ell(along(0.08, dm.waist / 2 * 1.05), 8, 8, 6, c.accent, { shine: 60 });
    }
    // ombros arredondados no topo do tronco (tira a cara de "caixa")
    ell(along(0.93), chestR * 1.02, Math.max(20, chestR * 0.42), chestR * tDepth * 1.0, isM ? c.skin : c.main, { shine: isM ? 26 : 8 });
    ell(along(0.04), (dm.waist / 2) * 1.0, 16, (dm.waist / 2) * tDepth, isM ? c.skin : c.main, { shine: 8 });
    // ombros
    ell(P3(J.sf, zA * 0.9), (uw / 2) * 1.15 * (isM ? pump : 1), (uw / 2) * 1.1 * (isM ? pump : 1), (uw / 2) * 1.1, sleeveUpper, { shine: isM ? 26 : 8 });
    ell(P3(J.sb, -zA * 0.9), (uw / 2) * 1.1 * (isM ? pump : 1), (uw / 2) * 1.05 * (isM ? pump : 1), (uw / 2) * 1.05, sleeveUpperBack, { shine: 8 });
    // pescoço
    const headC = P3(J.head, 0);
    const neckR = { andinho: 9, marcelao: 19, jailson: 8, thiago: 12, marcus: 12, tom: 10, rodolfo: 14 }[f.id] || 10;
    capsule(neck3, [headC[0] + (neck3[0] - headC[0]) * 0.4, headC[1] + (neck3[1] - headC[1]) * 0.4, 0], neckR, c.skin, { shine: 16 });
    // acessórios do tronco
    if (f.id === 'andinho') {
      // capuz e fone dourado no pescoço
      put(meshes.torus, M.mul(M.mul(M.T(neck3[0] - 10, neck3[1] - 6, -6), M.Rx(Math.PI / 2)), M.S(24, 24, 40)), c.shade, { shine: 6 });
      put(meshes.torus, M.mul(M.mul(M.T(neck3[0] + 2, neck3[1] - 4, 0), M.Rx(Math.PI / 2 + 0.3)), M.S(16, 16, 16)), c.accent, { shine: 70 });
    }
    if (f.id === 'tom') {
      // gola da camisa social + botões
      put(meshes.torus, M.mul(M.mul(M.T(neck3[0], neck3[1] - 4, 0), M.Rx(Math.PI / 2 + 0.25)), M.S(13, 13, 22)), c.light, { shine: 20 });
      for (const k of [0.22, 0.42, 0.62, 0.8]) {
        const rk = dm.waist / 2 + (chestR - dm.waist / 2) * k;
        const b = along(k, rk * 0.97);
        ell(b, 3.5, 3.5, 3.5, '#F3F6FF', { shine: 60 });
      }
    }
    if (f.id === 'jailson') {
      const bp = along(0.58, chestR * tDepth * 0.2);
      put(meshes.box, M.mul(M.T(bp[0] + chestR * 0.75, bp[1], chestR * tDepth * 0.5), M.S(6, 26, 24)), '#F3F6FF', { shine: 10 });
      capsule([neck3[0] + 6, neck3[1] - 4, chestR * tDepth * 0.4], [bp[0] + chestR * 0.72, bp[1] + 12, chestR * tDepth * 0.5], 2, '#E8323C');
    }
    // perna da frente
    leg(J.hf, J.fk, J.ff, J.ang.ff, zL, c.pants);

    // ---- cabeça ----
    const hang = (J.ang.sp - (J.ang.head || 0) * 0.5 - 180) * (Math.PI / 180);
    const HM = M.mul(M.T(headC[0], headC[1], 0), M.Rz(-hang));
    const hp = (x, y, z) => [x * r, y * r, z * r];
    const hput = (mesh, local, col, o) => put(mesh, M.mul(HM, local), col, o);
    const hell = (v, sx, sy, sz, col, o, rot) => hput(meshes.sphere, M.mul(M.mul(M.T(...hp(...v)), rot || M.id()), M.S(sx * r, sy * r, sz * r)), col, o);
    const hbox = (v, sx, sy, sz, col, o, rot) => hput(meshes.box, M.mul(M.mul(M.T(...hp(...v)), rot || M.id()), M.S(sx * r, sy * r, sz * r)), col, o);
    const skull = { marcelao: [1.0, 1.04, 0.98], jailson: [0.98, 1.06, 0.96], marcus: [1.0, 1.04, 0.98], rodolfo: [1.0, 1.04, 0.98] }[f.id] || [0.95, 1.05, 0.92];
    hell([0, 0, 0], ...skull, c.skin, { shine: f.id === 'thiago' || f.id === 'marcus' || f.id === 'jailson' ? 55 : 22 });
    if (f.id === 'marcelao') hell([0.32, -0.5, 0], 0.62, 0.48, 0.82, c.skin, { shine: 18 });
    // orelhas
    const earS = f.id === 'jailson' ? 0.3 : 0.22;
    hell([-0.08, 0.02, 0.9], earS * 0.6, earS, earS * 0.5, c.skinShade);
    hell([-0.08, 0.02, -0.9], earS * 0.6, earS, earS * 0.5, c.skinShade);
    // nariz
    hell([0.95, -0.08, 0], 0.18, 0.2, 0.16, c.skinShade, { shine: 20 });
    // olhos
    const face = f.face || 'normal';
    const closed = face === 'sleep' || face === 'hurt';
    for (const z of [0.38, -0.38]) {
      if (closed) hbox([0.86, 0.12, z], 0.05, 0.04, 0.22, '#1A1033');
      else {
        hell([0.8, 0.12, z], 0.1, face === 'shock' ? 0.15 : 0.12, 0.13, '#F7F7FB', { shine: 60 });
        if (def.eyeColor) hell([0.86, 0.12, z * 1.01], 0.06, 0.08, 0.085, def.eyeColor, { shine: 80 });
        hell([0.88, 0.12, z * 1.02], def.eyeColor ? 0.04 : 0.055, def.eyeColor ? 0.045 : 0.07, def.eyeColor ? 0.045 : 0.07, '#1A1033', { shine: 80 });
      }
    }
    // boca
    if (face === 'shout' || face === 'hurt' || face === 'yawn' || face === 'shock') hell([0.84, -0.5, 0], 0.1, face === 'yawn' ? 0.2 : 0.13, 0.2, '#5A1020');
    else hbox([0.88, -0.5, 0], 0.04, 0.04, 0.34, '#3A1A1A');
    // sobrancelhas
    const browCol = f.id === 'thiago' ? '#F3F6FF' : c.hair;
    const browH = f.id === 'marcelao' ? 0.1 : 0.06;
    for (const z of [0.38, -0.38]) hbox([0.84, 0.38, z], 0.1, browH, 0.3, browCol, null, M.Rz(f.id === 'marcelao' ? -0.25 : 0.05));

    if (f.id === 'andinho') {
      hell([-0.12, 0.38, 0], 0.92, 0.68, 0.94, c.hair, { shine: 30 });
      [[-0.2, 0.95, 0.2], [0.15, 0.98, -0.1], [0.45, 0.85, 0.25], [-0.5, 0.78, -0.25]].forEach((v, i) => hell(v, 0.2, 0.34, 0.2, c.hair, { shine: 30 }, M.Rz(-0.3 - i * 0.12)));
      // óculos retangulares
      for (const z of [0.38, -0.38]) hput(meshes.ring, M.mul(M.T(...hp(0.96, 0.12, z)), M.mul(M.Ry(Math.PI / 2), M.S(0.28 * r, 0.2 * r, 0.2 * r))), '#15151C', { shine: 80 });
      hbox([0.98, 0.14, 0], 0.04, 0.04, 0.3, '#15151C');
      for (const z of [0.62, -0.62]) hbox([0.45, 0.16, z * 1.05], 0.9, 0.04, 0.04, '#15151C');
      hell([0.72, -0.8, 0], 0.22, 0.24, 0.26, c.hair, { shine: 10 });
    } else if (f.id === 'marcelao') {
      hell([-0.05, 0.5, 0], 1.0, 0.56, 1.0, c.hair, { shine: 40 });
      [[0.3, 0.85, 0.5], [-0.2, 0.9, 0.6], [0.1, 0.95, -0.5], [-0.45, 0.75, 0.3]].forEach((v) => hell(v, 0.16, 0.06, 0.16, '#A8AEB8', { shine: 40 }));
    } else if (f.id === 'jailson') {
      hell([-0.42, -0.05, 0], 0.62, 0.55, 0.98, c.hair, { shine: 20 });
      hell([0.7, -0.84, 0], 0.22, 0.24, 0.26, c.hair, { shine: 10 });
      hell([0.1, 1.0, 0.1], 0.04, 0.16, 0.04, c.hair, null, M.Rz(0.5));
    } else if (f.id === 'thiago') {
      // barba de fumaça (esferas translúcidas que se movem)
      const t = f.frameCount || 0;
      const strong = f.fumada > 0 || (f.state === 'super' && def.super === 'fumada');
      const n = strong ? 16 : 11;
      for (let i = 0; i < n; i++) {
        const k = i / (n - 1);
        const ang2 = -0.6 + k * 2.4;
        const x = 0.2 + Math.cos(ang2) * 0.55 + Math.sin(t * 0.08 + i) * 0.04;
        const y = -0.55 - Math.sin(k * Math.PI) * 0.35 - (strong ? k * 0.25 : 0);
        const z = Math.sin(ang2 * 1.7) * 0.7;
        const s = (0.22 + Math.sin(k * Math.PI) * 0.1) * (strong ? 1.3 : 1) * (1 + Math.sin(t * 0.12 + i * 1.7) * 0.08);
        hell([x, y, z], s, s, s, i % 2 ? '#F3F6FF' : '#DDE2EE', { a: 0.85, shine: 4, emit: 0.6 });
      }
      // cigarro + brasa
      const cig = M.mul(M.T(...hp(0.95, -0.45, 0.28)), M.Rz(-Math.PI / 2 - 0.2));
      hput(meshes.cyl, M.mul(cig, M.mul(M.T(0, 0.35 * r, 0), M.S(0.07 * r, 0.7 * r, 0.07 * r))), '#F3F6FF', { shine: 10 });
      hput(meshes.sphere, M.mul(cig, M.mul(M.T(0, 0.72 * r, 0), M.S(0.09 * r, 0.09 * r, 0.09 * r))), face === 'drag' ? '#FFE16A' : '#FF8A3D', { emit: 0.9 });
    } else if (f.id === 'tom') {
      // laterais raspadas (sombra de cabelo curtinho) + topete penteado para trás
      hell([-0.18, 0.02, 0], 0.84, 0.8, 0.99, '#8C7462', { shine: 4 });
      hell([-0.12, 0.62, 0], 0.96, 0.44, 0.86, c.hair, { shine: 80 });
      hell([-0.6, 0.45, 0], 0.5, 0.36, 0.74, c.hair, { shine: 80 });
      hell([0.42, 0.78, 0], 0.4, 0.22, 0.6, c.hair, { shine: 80 }, M.Rz(-0.3));
      // barba, costeletas e bigode bem ralos: camada fina e translúcida colada no rosto
      const st = { a: 0.34, shine: 2 };
      hell([0.3, -0.5, 0], 0.68, 0.52, 0.99, c.hair, st);          // mandíbula e queixo
      hell([0.02, -0.08, 0.86], 0.2, 0.4, 0.14, c.hair, st);        // costeleta
      hell([0.02, -0.08, -0.86], 0.2, 0.4, 0.14, c.hair, st);
      hell([0.9, -0.33, 0], 0.09, 0.05, 0.32, c.hair, { a: 0.42, shine: 2 }); // bigode
    } else if (f.id === 'rodolfo') {
      // laterais raspadas + topete só em cima, alto na frente
      hell([-0.2, 0.05, 0], 0.83, 0.8, 1.0, '#5A4434', { a: 0.5, shine: 4 });
      hell([-0.05, 0.68, 0], 0.86, 0.38, 0.72, c.hair, { shine: 50 });
      hell([0.42, 0.92, 0], 0.48, 0.34, 0.6, c.hair, { shine: 50 }, M.Rz(-0.35));
      hell([0.72, 0.86, 0], 0.22, 0.2, 0.46, c.hair, { shine: 50 }, M.Rz(-0.6));
      // barba ralinha (barba por fazer): camada fina e translúcida + costeletas e bigode
      const st = { a: 0.42, shine: 2 };
      hell([0.3, -0.5, 0], 0.68, 0.52, 0.99, c.hair, st);
      hell([0.02, -0.08, 0.86], 0.2, 0.4, 0.14, c.hair, st);
      hell([0.02, -0.08, -0.86], 0.2, 0.4, 0.14, c.hair, st);
      hell([0.9, -0.33, 0], 0.09, 0.05, 0.34, c.hair, { a: 0.5, shine: 2 });
    } else if (f.id === 'marcus') {
      hell([0.35, -0.55, 0], 0.72, 0.6, 0.96, c.hair, { shine: 8 });
      hell([0.9, -0.3, 0], 0.16, 0.1, 0.42, c.hair, { shine: 8 });
      for (const z of [0.38, -0.38]) hput(meshes.ring, M.mul(M.T(...hp(0.97, 0.12, z)), M.mul(M.Ry(Math.PI / 2), M.S(0.24 * r, 0.24 * r, 0.24 * r))), '#15151C', { shine: 80 });
      hbox([0.99, 0.14, 0], 0.04, 0.04, 0.3, '#15151C');
      for (const z of [0.62, -0.62]) hbox([0.45, 0.16, z * 1.05], 0.9, 0.04, 0.04, '#15151C');
    }

    // braço da frente (por cima do corpo)
    arm(J.sf, J.fe, J.fh, zA, sleeveUpper, foreFront, c.skin);

    // objetos de cena
    if (FF.Anim.hasRacket(f)) {
      // raquete de tamboréu: aro grosso de madeira + face lisa, virada para o rival
      const rp = FF.Anim.racketPos(J);
      const v = P3(rp, zA);
      const R0 = M.mul(M.T(v[0], v[1], v[2]), M.mul(M.Rz(-rp.ang), M.Ry(0.95)));
      put(meshes.torus, M.mul(R0, M.S(46, 46, 64)), '#B8541F', { shine: 60 });
      put(meshes.ring, M.mul(R0, M.S(38, 38, 38)), '#8A3C14', { shine: 40 });
      put(meshes.sphere, M.mul(R0, M.S(41, 41, 3)), '#E9B98C', { shine: 30 });
    }
    if (f.prop === 'laptop') {
      const m = { x: (J.fh.x + J.bh.x) / 2 + 12, y: (J.fh.y + J.bh.y) / 2 + 4 };
      const v = P3(m, 0);
      put(meshes.box, M.mul(M.T(v[0], v[1], v[2]), M.S(90, 8, 60)), '#2A2F45', { shine: 60 });
      put(meshes.box, M.mul(M.mul(M.T(v[0] - 20, v[1] + 30, v[2]), M.Rz(-0.35)), M.S(6, 62, 60)), '#4DF3E8', { emit: 0.8 });
    } else if (f.prop === 'box') {
      const v = P3({ x: J.fh.x + 6, y: J.fh.y - 16 }, zA);
      put(meshes.box, M.mul(M.T(v[0], v[1], v[2]), M.S(56, 38, 26)), '#F3F6FF', { shine: 20 });
      put(meshes.box, M.mul(M.T(v[0], v[1] + 14, v[2]), M.S(58, 12, 28)), '#E8323C', { shine: 20 });
    }
    return { items, J: Object.assign(J, { ground }), ground, chest: along(0.5, chestR * 0.2), chestR, tDepth, badge: f.id === 'jailson' ? along(0.58) : null };
  }

  function ensureSize(w, h) {
    w = Math.max(256, w | 0);
    h = Math.max(256, h | 0);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  // desenha as peças numa região do canvas WebGL
  function renderItems(items, fx, fy, s, rx, ry, rw, rh, rim) {
    const H = canvas.height;
    gl.viewport(rx, H - ry - rh, rw, rh);
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(rx, H - ry - rh, rw, rh);
    gl.clearColor(0, 0, 0, 0);
    gl.depthMask(true);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const P = new Float32Array([
      (2 * s) / rw, 0, 0, 0,
      0, (2 * s) / rh, 0, 0,
      0, 0, -1 / 3000, 0,
      (2 * (fx - rx)) / rw - 1, 1 - (2 * (fy - ry)) / rh, 0, 1,
    ]);
    gl.uniformMatrix4fv(L.uP, false, P);
    gl.uniform3f(L.uRim, rim[0], rim[1], rim[2]);
    let bound = null;
    const draw = (it) => {
      if (bound !== it.mesh) {
        gl.bindBuffer(gl.ARRAY_BUFFER, it.mesh.vbo);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, it.mesh.ibo);
        gl.enableVertexAttribArray(L.aPos);
        gl.enableVertexAttribArray(L.aNor);
        gl.vertexAttribPointer(L.aPos, 3, gl.FLOAT, false, 24, 0);
        gl.vertexAttribPointer(L.aNor, 3, gl.FLOAT, false, 24, 12);
        bound = it.mesh;
      }
      gl.uniformMatrix4fv(L.uM, false, it.m);
      gl.uniformMatrix3fv(L.uN, false, M.nrm(it.m));
      gl.uniform4f(L.uColor, it.col[0], it.col[1], it.col[2], it.a);
      gl.uniform1f(L.uShine, it.shine);
      gl.uniform1f(L.uEmit, it.emit);
      gl.drawElements(gl.TRIANGLES, it.mesh.n, gl.UNSIGNED_SHORT, 0);
    };
    gl.disable(gl.BLEND);
    for (const it of items) if (it.a >= 1) draw(it);
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    for (const it of items) if (it.a < 1) draw(it);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }

  const RIM = [1.0, 0.42, 0.72];

  // ---------------- API: desenhar o lutador no contexto 2D ----------------
  // G.begin() / G.flush(ctx): junta os lutadores e renderiza tudo numa passada só
  // (o buffer de profundidade resolve quem fica na frente de quem)
  G.begin = function () {
    batch = G.ok ? [] : null;
  };
  G.flush = function (ctx) {
    const b = batch;
    batch = null;
    if (b && b.length) renderBatch(ctx, b);
  };
  G.drawActor = function (ctx, f, p, flash) {
    if (!G.ok) return null;
    const m = ctx.getTransform();
    const facing = m.a < 0 ? -1 : 1;
    const actor = M.mul(M.Ry(-G.yaw * facing), M.S(facing, 1, 1));
    const built = buildActor(f, p, { actor });
    if (flash) for (const it of built.items) {
      it.col = [1, 1, 1];
      it.emit = 0.75;
    }
    const e = { f, built, actor, flash, fx: m.e, fy: m.f, s: Math.abs(m.d) || 1, alpha: ctx.globalAlpha };
    if (batch) batch.push(e);
    else renderBatch(ctx, [e]);
    return built.J;
  };
  function renderBatch(ctx, list) {
    const cw = ctx.canvas.width, ch = ctx.canvas.height;
    const gs = G.res;
    ensureSize(Math.ceil(cw * gs), Math.ceil(ch * gs));
    const ref = list[0];
    const s = ref.s;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const items = [];
    list.forEach((e, i) => {
      const h = FF.Chars[e.f.id].height;
      const ext = h * 1.05;
      x0 = Math.min(x0, e.fx - ext * e.s);
      x1 = Math.max(x1, e.fx + ext * e.s);
      y0 = Math.min(y0, e.fy - h * 1.45 * e.s);
      y1 = Math.max(y1, e.fy + h * 0.15 * e.s);
      const O = M.T((e.fx - ref.fx) / s, -(e.fy - ref.fy) / s, i * 160);
      for (const it of e.built.items) {
        it.m = M.mul(O, it.m);
        items.push(it);
      }
    });
    x0 = Math.max(0, Math.floor(x0));
    y0 = Math.max(0, Math.floor(y0));
    x1 = Math.min(cw, Math.ceil(x1));
    y1 = Math.min(ch, Math.ceil(y1));
    if (x1 <= x0 || y1 <= y0) return;
    const gx = Math.floor(x0 * gs), gy = Math.floor(y0 * gs), gw = Math.max(1, Math.ceil((x1 - x0) * gs)), gh = Math.max(1, Math.ceil((y1 - y0) * gs));
    renderItems(items, ref.fx * gs, ref.fy * gs, s * gs, gx, gy, gw, gh, RIM);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = ref.alpha == null ? 1 : ref.alpha;
    ctx.drawImage(canvas, gx, gy, gw, gh, x0, y0, x1 - x0, y1 - y0);
    // estampas (texto nunca espelhado)
    for (const e of list) {
      const built = e.built;
      if (built.ball || e.flash) continue;
      const proj = (v) => {
        const w = M.apply(e.actor, v);
        return { x: e.fx + w[0] * e.s, y: e.fy - w[1] * e.s };
      };
      const decal = (txt, v, size, col) => {
        const q = proj(v);
        FF.text(ctx, txt, q.x, q.y, { size: size * e.s, color: col, stroke: '#1A1033', lw: 4 * e.s });
      };
      const front = [built.chest[0] + built.chestR * 0.25, built.chest[1], built.chestR * built.tDepth * 0.95];
      if (e.f.id === 'andinho') decal('</>', front, 20, '#5FE0D2');
      if (e.f.id === 'rodolfo') decal('{ }', [front[0], front[1] + 12, front[2]], 24, '#D8F04A');
      if (e.f.id === 'thiago') decal('PHP', [front[0], front[1] + 14, front[2]], 22, '#B6BEE8');
      if (e.f.id === 'jailson' && built.badge) decal('QA', [built.badge[0] + built.chestR * 0.78, built.badge[1], built.chestR * built.tDepth * 0.6], 12, '#E8323C');
    }
    ctx.restore();
  }

  // ---------------- retratos (cabeça e ombros, em cache) ----------------
  G.portrait = function (id, alt) {
    if (!G.ok) return null;
    const key = id + (alt ? '-alt' : '');
    if (portraits[key]) return portraits[key];
    const def = FF.Chars[id];
    const mockF = { id, state: 'idle', stateFrame: 0, frameCount: 40, facing: 1, pump: 0, altColor: !!alt, face: 'normal', prop: null, airborne: false, blocking: false, walkPhase: 0, vy: 0, jumpDir: 0, def };
    const pose = Object.assign({}, FF.Anim.BASE[id].stance, { fa1: 10, fa2: 10, ba1: 6, ba2: 10, lean: 0, head: 0 });
    const yaw = 0.62;
    const actor = M.mul(M.Ry(-yaw), M.S(1, 1, 1));
    const built = buildActor(mockF, pose, { actor });
    const headW = M.apply(actor, [built.J.head.x, built.ground - built.J.head.y, 0]);
    const S = 512; // retrato em alta para ficar nítido em telas grandes
    ensureSize(Math.max(canvas.width, S), Math.max(canvas.height, S));
    const s = S / 160;
    const fx = S / 2 - headW[0] * s;
    const fy = S / 2 + headW[1] * s - 6 * s;
    renderItems(built.items, fx, fy, s, 0, 0, S, S, [0.9, 0.55, 0.8]);
    const out = document.createElement('canvas');
    out.width = out.height = S;
    const o = out.getContext('2d');
    o.drawImage(canvas, 0, 0, S, S, 0, 0, S, S);
    if (id === 'thiago') FF.text(o, 'PHP', S / 2 + 6, S - 18, { size: 20, color: '#B6BEE8', lw: 4 });
    portraits[key] = out;
    return out;
  };

  return G;
})();
