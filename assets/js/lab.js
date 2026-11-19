/* Hero "inspection cell": vision + agent + robot arm, working together.
   Parts ride a conveyor. A camera detects each part and spots defects (computer vision),
   an agent decides what to do and calls tools (agentic AI), and a robot arm moves rejects
   to a bin (physical AI). Click any part to flag it for the agent.
   Geometry is in arm units (reach = 1, arm base at the origin), scaled to pixels at draw time. */
(function () {
  "use strict";
  const cv = document.getElementById("lab");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  const hero = cv.parentElement;
  const hint = document.getElementById("hint");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- layout ---------- */
  let W = 0, H = 0, DPR = 1, R = 300, B = { x: 0, y: 0 }, mobile = false, textRight = 0, textBottom = 0;
  let SIZE = 0.08;                  // part size (arm units)
  let SPEED = 0.1;                  // belt speed (arm units / s)
  const BELT_Y = -0.62, BELT_H = 0.1;
  let SCAN_X = -0.8, START_X = -2, END_X = 2;
  const BIN = { x: 0.56, y: -0.16 };
  const bg = document.createElement("canvas");
  const bgx = bg.getContext("2d");
  let C = {};

  function readColors() {
    const s = getComputedStyle(document.documentElement);
    const v = (n) => s.getPropertyValue(n).trim();
    const light = document.documentElement.dataset.theme === "light";
    C = {
      bg: v("--bg"), text: v("--text"), muted: v("--muted"), faint: v("--faint"), act: v("--act"), see: v("--see"),
      seeInk: v("--see-ink"), actInk: v("--act-ink"),
      link: light ? "#ffffff" : "#1a1e25", linkEdge: light ? "rgba(18,20,24,.55)" : "rgba(236,235,230,.55)",
      shadow: light ? "rgba(60,40,10,.12)" : "rgba(0,0,0,.42)",
      grid: light ? "rgba(18,20,24,.05)" : "rgba(236,235,230,.035)",
      grid2: light ? "rgba(18,20,24,.085)" : "rgba(236,235,230,.06)",
      belt: light ? "#e2dfd8" : "#14171c", beltEdge: light ? "rgba(18,20,24,.25)" : "rgba(236,235,230,.18)",
      roller: light ? "rgba(18,20,24,.08)" : "rgba(236,235,230,.05)",
      light,
    };
  }

  function layout() {
    const r = hero.getBoundingClientRect();
    W = Math.max(320, r.width); H = Math.max(480, r.height);
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = W * DPR; cv.height = H * DPR;
    mobile = W < 860;
    const h1 = hero.querySelector("h1"), sub = hero.querySelector(".hero-sub"), cta = hero.querySelector(".hero-cta");
    textRight = Math.max(h1 ? h1.getBoundingClientRect().right : 0, sub ? sub.getBoundingClientRect().right : 0) - r.left;
    textBottom = (cta ? cta.getBoundingClientRect().bottom : 0) - r.top;
    if (mobile) {
      R = Math.min(W * 0.5, H * 0.3, 240);
      B = { x: W * 0.5, y: H - 58 };
    } else {
      R = Math.min(H * 0.56, W * 0.3, 500);
      B = { x: Math.min(W * 0.74, W - R * 0.8 - 24), y: H * 0.93 };
    }
    SIZE = Math.min(Math.max(0.085 * R, 22), 36) / R;
    SPEED = (mobile ? 30 : 44) / R;
    START_X = (Math.max(mobile ? -40 : textRight - 160, -40) - B.x) / R;
    END_X = (W + 40 - B.x) / R;
    SCAN_X = Math.max(-0.82, START_X + 0.35);
    readColors();
    paintBackground();
  }

  const toPx = (p) => ({ x: B.x + p.x * R, y: B.y + p.y * R });
  const toArm = (x, y) => ({ x: (x - B.x) / R, y: (y - B.y) / R });
  function hexA(c, a) {
    const m = /^#([0-9a-f]{6})$/i.exec(c);
    if (!m) return c;
    const n = parseInt(m[1], 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }
  const mono = (w, s) => `${w} ${s}px "JetBrains Mono", monospace`;

  function paintBackground() {
    bg.width = W * DPR; bg.height = H * DPR;
    const g = bgx;
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    g.clearRect(0, 0, W, H);
    const step = mobile ? 22 : 28;
    g.lineWidth = 1;
    for (let x = B.x % step; x < W; x += step) {
      g.strokeStyle = Math.round((x - B.x) / step) % 5 === 0 ? C.grid2 : C.grid;
      g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, H); g.stroke();
    }
    for (let y = B.y % step; y < H; y += step) {
      g.strokeStyle = Math.round((y - B.y) / step) % 5 === 0 ? C.grid2 : C.grid;
      g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); g.stroke();
    }
    const glow = g.createRadialGradient(B.x, B.y, 0, B.x, B.y, R * 1.2);
    glow.addColorStop(0, hexA(C.act, C.light ? 0.07 : 0.09));
    glow.addColorStop(1, hexA(C.act, 0));
    g.fillStyle = glow; g.fillRect(0, 0, W, H);
    // reach envelope
    g.setLineDash([3, 7]); g.strokeStyle = hexA(C.act, 0.35); g.lineWidth = 1.2;
    g.beginPath(); g.arc(B.x, B.y, R, Math.PI, 2 * Math.PI); g.stroke(); g.setLineDash([]);
    // reject bin
    const p = toPx(BIN), s = SIZE * R * 3;
    g.setLineDash([4, 5]); g.strokeStyle = C.linkEdge; g.lineWidth = 1.2;
    rr(g, p.x - s / 2, p.y - s / 2, s, s, 8); g.stroke(); g.setLineDash([]);
    g.fillStyle = hexA(C.act, 0.05); g.fill();
  }

  function rr(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }

  /* ---------- arm & IK (FABRIK) ---------- */
  const L = [0.4, 0.34, 0.26];
  const J = [{ x: 0, y: 0 }, { x: 0.08, y: -0.39 }, { x: -0.2, y: -0.6 }, { x: -0.3, y: -0.45 }];
  function clampReach(t) {
    const d = Math.hypot(t.x, t.y) || 1e-6;
    let s = 1;
    if (d > 0.985) s = 0.985 / d;
    if (d < 0.24) s = 0.24 / d;
    return { x: t.x * s, y: Math.min(t.y * s, 0.02) };
  }
  function solve(A, target, iters = 8) {
    const t = clampReach(target);
    const len = Math.hypot(t.x, t.y) || 1;
    A[1].x += (-t.y / len) * 0.012; A[1].y += (t.x / len) * 0.012;
    for (let k = 0; k < iters; k++) {
      A[3].x = t.x; A[3].y = t.y;
      for (let i = 2; i >= 0; i--) {
        const dx = A[i].x - A[i + 1].x, dy = A[i].y - A[i + 1].y, l = Math.hypot(dx, dy) || 1e-6;
        A[i].x = A[i + 1].x + (dx / l) * L[i]; A[i].y = A[i + 1].y + (dy / l) * L[i];
      }
      A[0].x = 0; A[0].y = 0;
      for (let i = 0; i < 3; i++) {
        const dx = A[i + 1].x - A[i].x, dy = A[i + 1].y - A[i].y, l = Math.hypot(dx, dy) || 1e-6;
        A[i + 1].x = A[i].x + (dx / l) * L[i]; A[i + 1].y = A[i].y + (dy / l) * L[i];
      }
      if (Math.hypot(A[3].x - t.x, A[3].y - t.y) < 1e-4) break;
    }
  }
  const ang = (a, b) => Math.atan2(b.x - a.x, -(b.y - a.y));
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  function dir() {
    const dx = J[3].x - J[2].x, dy = J[3].y - J[2].y, l = Math.hypot(dx, dy) || 1;
    return { x: dx / l, y: dy / l };
  }

  /* ---------- world ---------- */
  const KINDS = ["gear", "nut", "bracket", "pcb"];
  const DEFECT = { gear: "missing tooth", nut: "crack", bracket: "crack", pcb: "missing part" };
  let parts = [], uid = 100, queue = [], log = [], binned = [];
  let stats = { seen: 0, defects: 0, rejected: 0 };
  let state = "idle", stateT = 0, current = null, carry = null;
  let grip = 1, ee = { x: -0.3, y: -0.45 }, eeV = { x: 0, y: 0 }, trail = [];
  let mouse = null, mouseT = -1e9, now = 0, nextSpawn = 0, interactions = 0, toasts = [];

  function say(text, kind) {
    log.push({ text, kind, t: now });
    if (log.length > 6) log.shift();
  }

  function spawn(x) {
    const kind = KINDS[Math.floor(Math.random() * KINDS.length)];
    parts.push({
      id: ++uid, kind, x: x ?? START_X, y: BELT_Y + (Math.random() - 0.5) * BELT_H * 0.5,
      rot: Math.random() * Math.PI * 2, defect: Math.random() < 0.34 ? DEFECT[kind] : null,
      seed: Math.random(), scanned: false, flagged: false, held: false, conf: 0.9 + Math.random() * 0.09, born: now,
    });
  }

  const reachable = (p) => Math.hypot(p.x, p.y) < 0.95 && p.x > -0.78;

  function setState(s) { state = s; stateT = 0; }

  function update(dt) {
    stateT += dt;
    // belt
    if (now >= nextSpawn) {
      const last = parts.reduce((m, p) => (p.held ? m : Math.min(m, p.x)), Infinity);
      if (last - START_X > SIZE * 2.6) spawn();
      nextSpawn = now + 1.4 + Math.random() * 1.4;
    }
    for (const p of parts) {
      if (p.held) continue;
      p.x += SPEED * dt;
      p.rot += dt * 0.15 * (p.seed - 0.5);
      if (!p.scanned && p.x >= SCAN_X) {
        p.scanned = true; p.scanT = now; stats.seen++;
        if (p.defect) {
          stats.defects++;
          say(`vision.detect → ${p.kind} #${p.id} · ${p.defect} ${p.conf.toFixed(2)}`, "act");
          if (!queue.includes(p)) { queue.push(p); say(`agent → defect > 0.85, reject #${p.id}`, "agent"); }
        } else {
          say(`vision.detect → ${p.kind} #${p.id} · ok ${p.conf.toFixed(2)}`, "see");
        }
      }
    }
    parts = parts.filter((p) => p.held || p.x < END_X);
    queue = queue.filter((p) => parts.includes(p));

    // arm state machine
    let target = null;
    if (state === "idle") {
      grip += (1 - grip) * Math.min(1, dt * 10);
      const next = queue.find((p) => reachable(p));
      const missed = queue.find((p) => p.x > 0.75);
      if (missed) { queue = queue.filter((p) => p !== missed); say(`agent → #${missed.id} out of reach, flag for manual check`, "warn"); }
      if (next) {
        current = next; queue = queue.filter((p) => p !== next);
        say(`tool → arm.pick(#${next.id}, bin="reject")`, "agent");
        setState("reach");
      } else {
        const active = mouse && now - mouseT < 2.5;
        target = active ? mouse : { x: -0.2 + Math.sin(now * 0.5) * 0.1, y: -0.42 + Math.cos(now * 0.4) * 0.04 };
      }
    }
    if (state === "reach") {
      if (!parts.includes(current)) { current = null; setState("idle"); }
      else {
        const lead = { x: current.x + SPEED * 0.12, y: current.y };
        target = lead;
        if (Math.hypot(ee.x - current.x, ee.y - current.y) < 0.035) setState("grasp");
        else if (current.x > 0.8) { say(`agent → missed #${current.id}, flag for manual check`, "warn"); current = null; setState("idle"); }
      }
    }
    if (state === "grasp") {
      target = { x: current.x, y: current.y };
      grip = Math.max(0, 1 - stateT / 0.22);
      if (stateT > 0.26) {
        current.held = true;
        carry = { a: { x: ee.x, y: ee.y }, b: { x: BIN.x + (Math.random() - 0.5) * SIZE, y: BIN.y + (Math.random() - 0.5) * SIZE } };
        carry.c = { x: (carry.a.x + carry.b.x) / 2, y: Math.min(carry.a.y, carry.b.y) - 0.16 };
        setState("carry");
      }
    }
    if (state === "carry") {
      const dur = 0.55 + Math.hypot(carry.b.x - carry.a.x, carry.b.y - carry.a.y) * 0.8;
      const s = Math.min(1, stateT / dur), e = s < 0.5 ? 2 * s * s : 1 - Math.pow(-2 * s + 2, 2) / 2;
      const u = 1 - e;
      target = { x: u * u * carry.a.x + 2 * u * e * carry.c.x + e * e * carry.b.x, y: u * u * carry.a.y + 2 * u * e * carry.c.y + e * e * carry.b.y };
      if (s >= 1) setState("release");
    }
    if (state === "release") {
      target = carry.b;
      grip = Math.min(1, stateT / 0.2);
      if (stateT > 0.24) {
        parts = parts.filter((p) => p !== current);
        binned.push({ ...current, x: carry.b.x, y: carry.b.y, t: now });
        if (binned.length > 5) binned.shift();
        stats.rejected++;
        say(`✓ #${current.id} → reject bin`, "ok");
        toasts.push({ text: "rejected ✓", p: { ...carry.b }, t: now });
        current = null; carry = null;
        setState("idle");
      }
    }

    // move end effector
    if (state === "carry" || state === "release" || state === "grasp") {
      ee.x = target.x; ee.y = target.y; eeV.x = eeV.y = 0;
    } else {
      const k = state === "reach" ? 120 : 60, d = state === "reach" ? 20 : 14;
      const t = clampReach(target);
      eeV.x += (k * (t.x - ee.x) - d * eeV.x) * dt; eeV.y += (k * (t.y - ee.y) - d * eeV.y) * dt;
      ee.x += eeV.x * dt; ee.y += eeV.y * dt;
    }
    solve(J, ee, 6);
    if (current && current.held) {
      const d = dir();
      current.x = J[3].x + d.x * SIZE * 0.3; current.y = J[3].y + d.y * SIZE * 0.3;
    }
    const tip = toPx(J[3]);
    trail.push({ x: tip.x, y: tip.y });
    if (trail.length > 40) trail.shift();
    toasts = toasts.filter((t) => now - t.t < 1.4);
  }

  /* ---------- draw: parts ---------- */
  function drawPart(p, lift, alpha = 1) {
    const c = toPx(p), s = SIZE * R * (1 + lift * 0.15);
    ctx.save();
    ctx.globalAlpha = alpha;
    // shadow
    ctx.save(); ctx.translate(c.x + 3 + lift * 9, c.y + 4 + lift * 11); ctx.rotate(p.rot);
    ctx.fillStyle = C.shadow; ctx.beginPath(); ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.translate(c.x, c.y); ctx.rotate(p.rot);
    const metal = ctx.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2);
    metal.addColorStop(0, C.light ? "#c9ced5" : "#b9c0c9"); metal.addColorStop(1, C.light ? "#7f8790" : "#5d656f");
    ctx.lineWidth = 1; ctx.strokeStyle = "rgba(255,255,255,.25)";
    const crack = () => {
      ctx.strokeStyle = "rgba(30,10,5,.85)"; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(-s * 0.05, -s * 0.42); ctx.lineTo(s * 0.06, -s * 0.15); ctx.lineTo(-s * 0.04, s * 0.05); ctx.lineTo(s * 0.1, s * 0.3); ctx.stroke();
    };
    if (p.kind === "gear") {
      const teeth = 8, r1 = s * 0.38, r2 = s * 0.5;
      ctx.fillStyle = metal; ctx.beginPath();
      for (let i = 0; i < teeth; i++) {
        if (p.defect && i === 2) { ctx.arc(0, 0, r1, (i / teeth) * Math.PI * 2, ((i + 1) / teeth) * Math.PI * 2); continue; }
        const a0 = (i / teeth) * Math.PI * 2, a1 = a0 + (Math.PI * 2) / teeth;
        ctx.arc(0, 0, r1, a0, a0 + (a1 - a0) * 0.35);
        ctx.arc(0, 0, r2, a0 + (a1 - a0) * 0.4, a0 + (a1 - a0) * 0.75);
        ctx.arc(0, 0, r1, a0 + (a1 - a0) * 0.8, a1);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.belt; ctx.beginPath(); ctx.arc(0, 0, s * 0.13, 0, Math.PI * 2); ctx.fill();
    } else if (p.kind === "nut") {
      ctx.fillStyle = metal; ctx.beginPath();
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; ctx.lineTo(Math.cos(a) * s * 0.48, Math.sin(a) * s * 0.48); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.belt; ctx.beginPath(); ctx.arc(0, 0, s * 0.2, 0, Math.PI * 2); ctx.fill();
      if (p.defect) crack();
    } else if (p.kind === "bracket") {
      ctx.fillStyle = metal; ctx.beginPath();
      ctx.moveTo(-s * 0.45, -s * 0.45); ctx.lineTo(-s * 0.12, -s * 0.45); ctx.lineTo(-s * 0.12, s * 0.15); ctx.lineTo(s * 0.45, s * 0.15);
      ctx.lineTo(s * 0.45, s * 0.45); ctx.lineTo(-s * 0.45, s * 0.45); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.belt;
      ctx.beginPath(); ctx.arc(-s * 0.29, -s * 0.22, s * 0.07, 0, 7); ctx.arc(s * 0.25, s * 0.3, s * 0.07, 0, 7); ctx.fill();
      if (p.defect) { ctx.save(); ctx.translate(-s * 0.2, s * 0.12); crack(); ctx.restore(); }
    } else {
      ctx.fillStyle = "#1f6f4a"; rr(ctx, -s * 0.48, -s * 0.36, s * 0.96, s * 0.72, 3); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.2)"; ctx.stroke();
      ctx.fillStyle = "#11161c"; rr(ctx, -s * 0.16, -s * 0.16, s * 0.32, s * 0.32, 2); ctx.fill();
      ctx.fillStyle = "#d8b45a";
      for (let i = 0; i < 4; i++) { ctx.fillRect(-s * 0.4 + i * s * 0.07, s * 0.22, s * 0.04, s * 0.08); }
      if (p.defect) { ctx.strokeStyle = "#d8b45a"; ctx.setLineDash([2, 2]); ctx.strokeRect(s * 0.22, -s * 0.28, s * 0.16, s * 0.16); ctx.setLineDash([]); }
      else { ctx.fillStyle = "#2b3440"; ctx.fillRect(s * 0.22, -s * 0.28, s * 0.16, s * 0.16); }
    }
    ctx.restore();
  }

  function brackets(x, y, w, h, col, k) {
    ctx.strokeStyle = col; ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x, y + k); ctx.lineTo(x, y); ctx.lineTo(x + k, y);
    ctx.moveTo(x + w - k, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + k);
    ctx.moveTo(x + w, y + h - k); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - k, y + h);
    ctx.moveTo(x + k, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - k);
    ctx.stroke();
  }
  function tag(x, y, text, bgc, fg) {
    ctx.font = mono(600, 10);
    const tw = ctx.measureText(text).width + 10;
    x = Math.max(4, Math.min(x, W - tw - 4)); // keep labels on screen
    ctx.fillStyle = bgc; rr(ctx, x, y - 15, tw, 15, 3); ctx.fill();
    ctx.fillStyle = fg; ctx.fillText(text, x + 5, y - 4);
  }

  function drawDetections(hover) {
    let row = 0;
    for (const p of parts) {
      if (p.held || !p.scanned) continue;
      const c = toPx(p), half = SIZE * R * 0.62;
      const bad = !!p.defect || p.flagged;
      const col = bad ? C.act : C.see;
      const age = now - p.scanT;
      ctx.save();
      ctx.globalAlpha = age < 0.3 ? 0.4 + 0.6 * Math.abs(Math.sin(age * 25)) : 1;
      brackets(c.x - half, c.y - half, half * 2, half * 2, col, Math.max(6, half * 0.45));
      // defect heat-map
      if (p.defect) {
        const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, half);
        g.addColorStop(0, hexA(C.act, 0.4)); g.addColorStop(1, hexA(C.act, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c.x, c.y, half, 0, Math.PI * 2); ctx.fill();
      }
      const label = p.flagged && !p.defect ? `${p.kind} · flagged` : p.defect ? `${p.kind} · ${p.defect}` : `${p.kind} ${p.conf.toFixed(2)}`;
      // stagger labels so neighbours never collide
      const up = (row++ % 2 === 0) || p === hover;
      tag(c.x - half, up ? c.y - half - 3 : c.y + half + 18, label, col, bad ? C.actInk : C.seeInk);
      ctx.restore();
    }
  }

  /* ---------- draw: cell ---------- */
  function drawBelt() {
    const a = toPx({ x: 0, y: BELT_Y - BELT_H }), b = toPx({ x: 0, y: BELT_Y + BELT_H });
    const x0 = Math.max(0, toPx({ x: START_X, y: 0 }).x - 20);
    ctx.fillStyle = C.belt; ctx.fillRect(x0, a.y, W - x0, b.y - a.y);
    // moving rollers
    const gap = 18, off = ((now * SPEED * R) % gap + gap) % gap;
    ctx.strokeStyle = C.roller; ctx.lineWidth = 2;
    for (let x = x0 + off; x < W; x += gap) { ctx.beginPath(); ctx.moveTo(x, a.y + 2); ctx.lineTo(x, b.y - 2); ctx.stroke(); }
    ctx.strokeStyle = C.beltEdge; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x0, a.y); ctx.lineTo(W, a.y); ctx.moveTo(x0, b.y); ctx.lineTo(W, b.y); ctx.stroke();
    // direction chevrons
    ctx.fillStyle = C.faint; ctx.font = mono(500, 10);
    if (!mobile) ctx.fillText("CONVEYOR →", W - 110, b.y + 16);
  }

  function drawCamera() {
    const top = toPx({ x: SCAN_X, y: BELT_Y - 0.34 }), a = toPx({ x: SCAN_X - 0.09, y: BELT_Y - BELT_H }), b = toPx({ x: SCAN_X + 0.09, y: BELT_Y - BELT_H });
    const bot = toPx({ x: SCAN_X, y: BELT_Y + BELT_H });
    // field of view
    const g = ctx.createLinearGradient(0, top.y, 0, a.y);
    g.addColorStop(0, hexA(C.see, 0.02)); g.addColorStop(1, hexA(C.see, 0.12));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = hexA(C.see, 0.5); ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(a.x, a.y); ctx.moveTo(top.x, top.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]);
    // scan zone on belt
    ctx.fillStyle = hexA(C.see, 0.08); ctx.fillRect(a.x, a.y, b.x - a.x, bot.y - a.y);
    const sweep = a.x + ((Math.sin(now * 3) + 1) / 2) * (b.x - a.x);
    ctx.strokeStyle = hexA(C.see, 0.8); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(sweep, a.y); ctx.lineTo(sweep, bot.y); ctx.stroke();
    // camera body
    ctx.fillStyle = C.link; ctx.strokeStyle = C.linkEdge; ctx.lineWidth = 1.4;
    rr(ctx, top.x - 16, top.y - 22, 32, 20, 4); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(top.x, top.y - 2, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.see; ctx.beginPath(); ctx.arc(top.x, top.y - 2, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.font = mono(500, 10); ctx.fillStyle = C.see;
    ctx.fillText("CAM 01 · detector", top.x + 22, top.y - 9);
  }

  function capsule(a, b, w, fill, edge) {
    ctx.lineCap = "round";
    ctx.strokeStyle = edge; ctx.lineWidth = w + 2.4;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.strokeStyle = fill; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }

  function drawArm() {
    const P = J.map(toPx);
    const w = [0.07, 0.058, 0.046].map((f) => Math.max(f * R, mobile ? 7 : 9));
    ctx.save(); ctx.translate(9, 12);
    for (let i = 0; i < 3; i++) capsule(P[i], P[i + 1], w[i], C.shadow, "transparent");
    ctx.restore();
    for (let i = 0; i < 3; i++) {
      capsule(P[i], P[i + 1], w[i], C.link, C.linkEdge);
      ctx.strokeStyle = hexA(C.act, 0.35); ctx.lineWidth = 1; ctx.setLineDash([2, 4]);
      ctx.beginPath(); ctx.moveTo(P[i].x, P[i].y); ctx.lineTo(P[i + 1].x, P[i + 1].y); ctx.stroke(); ctx.setLineDash([]);
    }
    const d = dir(), n = { x: -d.y, y: d.x }, t = P[3];
    const open = SIZE * (0.95 + grip * 0.7) * R, fl = Math.max(0.075 * R, 12);
    if (current && current.held) drawPart(current, 1);
    const fw = Math.max(4, R * 0.014);
    const pa = { x: t.x + n.x * (open / 2 + 3), y: t.y + n.y * (open / 2 + 3) }, pb = { x: t.x - n.x * (open / 2 + 3), y: t.y - n.y * (open / 2 + 3) };
    const seg = (a, b, col, lw) => { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); };
    ctx.lineCap = "round";
    for (const [col, lw] of [[C.linkEdge, fw + 2.4], [C.link, fw]]) {
      seg(pa, pb, col, lw);
      seg(pa, { x: pa.x + d.x * fl, y: pa.y + d.y * fl }, col, lw);
      seg(pb, { x: pb.x + d.x * fl, y: pb.y + d.y * fl }, col, lw);
    }
    P.forEach((p, i) => {
      const r = i === 0 ? Math.max(R * 0.085, 14) : Math.max(R * 0.036, 6);
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = C.link; ctx.fill(); ctx.strokeStyle = C.linkEdge; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.42, 0, Math.PI * 2); ctx.fillStyle = C.act; ctx.fill();
      if (i === 0) {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(ang(J[0], J[1]));
        ctx.strokeStyle = C.linkEdge; ctx.lineWidth = 1;
        for (let k = 0; k < 12; k++) { ctx.rotate(Math.PI / 6); ctx.beginPath(); ctx.moveTo(0, -r * 0.65); ctx.lineTo(0, -r * 0.85); ctx.stroke(); }
        ctx.restore();
      }
    });
  }

  function drawPlan() {
    if (state !== "reach" || !current) return;
    const a = toPx(J[3]), b = toPx(current), c = toPx(BIN);
    ctx.save();
    ctx.setLineDash([2, 6]); ctx.lineDashOffset = -now * 30; ctx.lineWidth = 1.6; ctx.strokeStyle = C.act; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    ctx.quadraticCurveTo((b.x + c.x) / 2, Math.min(b.y, c.y) - 0.16 * R, c.x, c.y); ctx.stroke();
    ctx.restore();
  }

  function drawTrail() {
    ctx.lineCap = "round";
    for (let i = 1; i < trail.length; i++) {
      ctx.strokeStyle = hexA(C.act, (i / trail.length) * 0.3); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(trail[i - 1].x, trail[i - 1].y); ctx.lineTo(trail[i].x, trail[i].y); ctx.stroke();
    }
  }

  function drawBin() {
    const p = toPx(BIN), s = SIZE * R * 3;
    binned.forEach((q, i) => drawPart(q, 0, Math.min(1, (now - q.t) * 4) * (0.45 + 0.55 * (i / Math.max(1, binned.length - 1)))));
    ctx.font = mono(500, 10); ctx.fillStyle = C.faint;
    ctx.fillText(`REJECT · ${stats.rejected}`, p.x - s / 2, p.y + s / 2 + 14);
  }

  function drawCursor(hover) {
    if (!mouse || now - mouseT > 2.5 || hover) return;
    const p = toPx(mouse);
    ctx.save(); ctx.strokeStyle = C.see; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(p.x - 15, p.y); ctx.lineTo(p.x - 5, p.y); ctx.moveTo(p.x + 5, p.y); ctx.lineTo(p.x + 15, p.y);
    ctx.moveTo(p.x, p.y - 15); ctx.lineTo(p.x, p.y - 5); ctx.moveTo(p.x, p.y + 5); ctx.lineTo(p.x, p.y + 15); ctx.stroke();
    ctx.restore();
  }

  function drawHUD() {
    if (mobile) return;
    const w = 300, x = W - Math.max(24, (W - 1240) / 2 + 40) - w, y = 92, lines = 5, h = 70 + lines * 17;
    ctx.save();
    ctx.fillStyle = C.light ? "rgba(255,255,255,.78)" : "rgba(13,15,19,.78)";
    rr(ctx, x, y, w, h, 10); ctx.fill();
    ctx.strokeStyle = C.light ? "rgba(18,20,24,.1)" : "rgba(255,255,255,.08)"; ctx.lineWidth = 1; ctx.stroke();
    ctx.font = mono(500, 10);
    ctx.fillStyle = C.faint; ctx.fillText("INSPECTION CELL · VISION + AGENT + ARM", x + 14, y + 22);
    ctx.fillStyle = C.see; ctx.fillText("● live", x + w - 50, y + 22);
    ctx.fillStyle = C.muted;
    ctx.fillText(`inspected ${stats.seen}   defects ${stats.defects}   rejected ${stats.rejected}`, x + 14, y + 44);
    ctx.strokeStyle = C.light ? "rgba(18,20,24,.08)" : "rgba(255,255,255,.06)";
    ctx.beginPath(); ctx.moveTo(x + 14, y + 56); ctx.lineTo(x + w - 14, y + 56); ctx.stroke();
    const cols = { see: C.see, act: C.act, agent: C.text, ok: C.see, warn: C.faint };
    const shown = log.slice(-lines);
    shown.forEach((l, i) => {
      const a = Math.min(1, (now - l.t) * 5);
      ctx.globalAlpha = a * (0.45 + 0.55 * ((i + 1) / shown.length));
      ctx.fillStyle = cols[l.kind] || C.muted;
      let text = l.text;
      while (ctx.measureText(text).width > w - 28 && text.length > 4) text = text.slice(0, -2);
      if (text !== l.text) text = text.slice(0, -1) + "…";
      ctx.fillText(text, x + 14, y + 76 + i * 17);
    });
    ctx.restore();
  }

  function drawToasts() {
    ctx.font = mono(700, 11);
    for (const t of toasts) {
      const a = 1 - (now - t.t) / 1.4, p = toPx(t.p);
      ctx.globalAlpha = Math.max(0, a); ctx.fillStyle = t.col || C.act;
      ctx.fillText(t.text, p.x - 26, p.y - SIZE * R * 1.8 - (1 - a) * 18);
      ctx.globalAlpha = 1;
    }
  }

  function hoverPart() {
    if (!mouse || now - mouseT > 2.5) return null;
    let best = null, bd = SIZE * 0.9;
    for (const p of parts) { if (p.held) continue; const d = Math.hypot(p.x - mouse.x, p.y - mouse.y); if (d < bd) { bd = d; best = p; } }
    return best;
  }

  function draw() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(bg, 0, 0, W, H);
    const hover = hoverPart();
    cv.style.cursor = hover ? "pointer" : "default";
    drawBelt();
    drawCamera();
    drawBin();
    for (const p of parts) if (!p.held) drawPart(p, 0);
    drawPlan();
    drawTrail();
    drawArm();
    drawDetections(hover);
    drawCursor(hover);
    drawToasts();
    if (!mobile) {
      const g = ctx.createLinearGradient(0, 0, Math.min(textRight + 140, W * 0.7), 0);
      g.addColorStop(0, hexA(C.bg, 0.88)); g.addColorStop(0.75, hexA(C.bg, 0.55)); g.addColorStop(1, hexA(C.bg, 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, textBottom + 40);
      g.addColorStop(0, hexA(C.bg, 0.9)); g.addColorStop(0.85, hexA(C.bg, 0.65)); g.addColorStop(1, hexA(C.bg, 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, textBottom + 40);
    }
    drawHUD();
    const f = ctx.createLinearGradient(0, H - 60, 0, H);
    f.addColorStop(0, hexA(C.bg, 0)); f.addColorStop(1, hexA(C.bg, 0.9));
    ctx.fillStyle = f; ctx.fillRect(0, H - 60, W, 60);
  }

  /* ---------- input ---------- */
  function pointer(e) {
    const r = cv.getBoundingClientRect();
    return toArm(e.clientX - r.left, e.clientY - r.top);
  }
  cv.addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") { mouse = pointer(e); mouseT = now; } });
  cv.addEventListener("pointerleave", () => { mouseT = -1e9; });
  cv.addEventListener("click", (e) => {
    const m = pointer(e);
    mouse = m; mouseT = now;
    let hit = null, bd = SIZE * 0.9;
    for (const p of parts) { if (p.held) continue; const d = Math.hypot(p.x - m.x, p.y - m.y); if (d < bd) { bd = d; hit = p; } }
    if (hit) {
      if (!hit.flagged && current !== hit && !queue.includes(hit)) {
        hit.flagged = true;
        if (!hit.scanned) { hit.scanned = true; hit.scanT = now; stats.seen++; }
        queue.unshift(hit);
        say(`operator flagged #${hit.id} → agent → reject`, "agent");
        toasts.push({ text: "flagged", p: { x: hit.x, y: hit.y }, t: now });
      }
    } else if (Math.abs(m.y - BELT_Y) < BELT_H * 1.4 && m.x > START_X && m.x < 0.7) {
      spawn(m.x);
      say("operator added a part to the line", "warn");
    }
    interactions++;
    const verb = window.matchMedia("(hover: none)").matches ? "tap" : "click";
    if (hint && interactions === 2) hint.innerHTML = `<span class="key">tip</span> ${verb} the belt to add parts<span class="long"> · flag several and watch the queue</span>`;
    if (hint && interactions === 5) hint.style.opacity = "0";
    if (reduced) draw();
  });

  /* ---------- loop ---------- */
  let last = 0, running = true, raf = 0;
  function frame(t) {
    const dt = Math.min(0.05, (t - last) / 1000 || 0.016);
    last = t; now += dt;
    update(dt); draw();
    if (running && !reduced) raf = requestAnimationFrame(frame);
  }
  function start() { if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); } }
  function stop() { running = false; cancelAnimationFrame(raf); }

  layout();
  // pre-populate the belt so the scene is alive on first paint
  for (let x = START_X + 0.05; x < 0.7; x += SIZE * 3.2 + Math.random() * SIZE * 2) spawn(x);
  say("agent ready · tools: vision.detect, arm.pick", "warn");
  for (let i = 0; i < 30; i++) solve(J, ee, 8);
  if (reduced) { for (let i = 0; i < 40; i++) { now += 0.05; update(0.05); } draw(); }
  else { last = performance.now(); raf = requestAnimationFrame(frame); }

  let lastW = W, lastH = H;
  new ResizeObserver(() => {
    const r = hero.getBoundingClientRect();
    if (Math.abs(r.width - lastW) < 2 && Math.abs(r.height - lastH) < 2) return;
    lastW = r.width; lastH = r.height;
    layout();
    if (reduced) draw();
  }).observe(hero);
  if ("IntersectionObserver" in window && !reduced) {
    new IntersectionObserver(([en]) => (en.isIntersecting ? start() : stop()), { threshold: 0.02 }).observe(hero);
  }
  document.addEventListener("visibilitychange", () => { if (reduced) return; document.hidden ? stop() : start(); });
  document.addEventListener("themechange", () => { readColors(); paintBackground(); if (reduced) draw(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => layout());
})();
