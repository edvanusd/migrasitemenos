import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { SceneFallback } from "./SceneFallback";

/**
 * 3D "perjalanan record": data dari tiga sistem legacy → ring staging → grid T24.
 * Tampilan berubah mengikuti 5 fase migrasi (0 Initiasi … 4 Cutover).
 *  - amber  = record di sistem legacy
 *  - putih  = record sedang divalidasi/dibersihkan di staging
 *  - hijau  = record sudah ter-load di T24
 *  - merah  = record gagal validasi
 */

export type ErrorMode = "cycle" | "stuck" | "none";

export interface MigrationSceneProps {
  /** 0 Initiasi, 1 Mapping, 2 Preparation, 3 Testing, 4 Cutover */
  stage: number;
  /** cycle: dry run berulang dengan sebagian record gagal; stuck: record gagal tertahan; none: semua lolos */
  errors?: ErrorMode;
  compact?: boolean;
  onZoneSelect?: (stage: number) => void;
  label?: string;
}

const ZONES = [
  { title: "Sistem legacy", sub: "tiga sistem sumber", anchor: [-4.6, 1.78, 0], stage: 0 },
  { title: "Staging", sub: "validasi dan cleansing", anchor: [0, 1.82, 0], stage: 2 },
  { title: "Temenos T24", sub: "OFS load dan rekonsiliasi", anchor: [4.6, 1.3, 0], stage: 4 },
] as const;
const ACTIVE_ZONES: number[][] = [[0], [0, 2], [1], [1, 2], [2]];

const STATUS = [
  "Masih di sistem sumber",
  "Field sudah dipetakan ke T24",
  "Divalidasi dan dibersihkan di staging",
  "Trial load ke T24",
  "Dry run selesai, kembali ke staging",
  "Gagal validasi, kembali ke staging",
  "Gagal validasi, menunggu perbaikan",
  "Ter-load di T24",
  "Cocok saat rekonsiliasi",
];
const ST_LEGACY = 0, ST_MAPPED = 1, ST_STAGING = 2, ST_TRIAL = 3, ST_RETURN = 4,
  ST_FAIL = 5, ST_STUCK = 6, ST_LOADED = 7, ST_RECON = 8;

function lin(hex: string): [number, number, number] {
  const c = new THREE.Color(hex);
  return [c.r, c.g, c.b];
}
const C_AMBER = [lin("#F2A93B"), lin("#EE8A3C"), lin("#F7C766")];
const C_CLEAN = lin("#D9E6F2");
const C_TEAL = lin("#2DD4A7");
const C_RED = lin("#FF5A5F");
const C_WHITE = lin("#F2FFFA");

// level targets per stage (legacy boxes, slot points, ring, grid outline)
const LV_LEGACY = [0.6, 0.45, 0.25, 0.18, 0.07];
const LV_SLOTS = [0.16, 0.8, 0.22, 0.18, 0.06];
const LV_RING = [0.22, 0.22, 0.95, 0.75, 0.25];
const LV_GRID = [0.16, 0.45, 0.2, 0.45, 0.95];
const FOCUS_X = [-0.2, -0.1, 0, 0.1, 0.2];

function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const easeInOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

function haloTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  if (g) {
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(0.35, "rgba(255,255,255,0.35)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export default function MigrationScene({ stage, errors = "cycle", compact = false, onZoneSelect, label }: MigrationSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<(HTMLElement | null)[]>([]);
  const tipRef = useRef<HTMLDivElement>(null);
  const tipIdRef = useRef<HTMLSpanElement>(null);
  const tipStRef = useRef<HTMLSpanElement>(null);
  const cfgRef = useRef({ stage, errors });
  const [failed, setFailed] = useState(false);
  // narrow hosts (phones) get a tighter layout so records stay legible
  const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && window.innerWidth < 700);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      const w = host.clientWidth;
      if (w) setNarrow(w < 620);
    });
    ro.observe(host);
    return () => ro.disconnect();
  }, [failed]);

  useEffect(() => {
    cfgRef.current = { stage: clamp(Math.round(stage), 0, 4), errors };
  }, [stage, errors]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    const canvas = renderer.domElement;
    canvas.className = "scene3d-canvas";
    canvas.setAttribute("aria-hidden", "true");
    host.prepend(canvas);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    const group = new THREE.Group();
    group.rotation.y = -0.5;
    scene.add(group);
    const disposables: { dispose: () => void }[] = [];
    const track = <T extends { dispose: () => void }>(x: T): T => {
      disposables.push(x);
      return x;
    };

    // ---------- per-record data ----------
    const F = narrow ? 0.7 : 1; // horizontal spread
    const N = compact ? 400 : 600;
    const L = N / 100; // grid layers (10 x 10 per layer)
    const S = 0.22; // slot spacing
    const GX = 4.6 * F; // T24 grid x
    const R = 1.3; // staging ring radius
    const GATE_X = 2.35 * F;
    const rnd = mulberry32(24);
    const CL = [[-4.75 * F, 0.95, -0.55], [-4.95 * F, -0.4, 0.55], [-4.35 * F, -1.4, -0.25]];
    const CB = [0.75 * (narrow ? 0.8 : 1), 0.42, 0.6];
    const anchors = ZONES.map((z) => [z.anchor[0] * F, z.anchor[1], z.anchor[2]]);

    const seed = new Float32Array(N), seed2 = new Float32Array(N);
    const legacy = new Float32Array(N * 3), slot = new Float32Array(N * 3);
    const from = new Float32Array(N * 3), cur = new Float32Array(N * 3), col = new Float32Array(N * 3);
    const order = new Float32Array(N), delay = new Float32Array(N), slotOrder = new Float32Array(N);
    const ringBase = new Float32Array(N), ringDx = new Float32Array(N), ringDr = new Float32Array(N), ringSpd = new Float32Array(N);
    const axis: THREE.Vector3[] = [], spin = new Float32Array(N);
    const cluster = new Uint8Array(N), natErr = new Uint8Array(N), stuckErr = new Uint8Array(N), state = new Uint8Array(N);

    for (let i = 0; i < N; i++) {
      const i3 = i * 3;
      seed[i] = rnd(); seed2[i] = rnd();
      const c = i % 3; cluster[i] = c;
      legacy[i3] = CL[c][0] + (rnd() * 2 - 1) * CB[0];
      legacy[i3 + 1] = CL[c][1] + (rnd() * 2 - 1) * CB[1];
      legacy[i3 + 2] = CL[c][2] + (rnd() * 2 - 1) * CB[2];
      const gc = i % 10, gr = Math.floor(i / 10) % 10, gl = Math.floor(i / 100);
      slot[i3] = GX + (gc - 4.5) * S;
      slot[i3 + 1] = (gr - 4.5) * S - 0.1;
      slot[i3 + 2] = (gl - (L - 1) / 2) * S;
      slotOrder[i] = (gr * L * 10 + gl * 10 + gc) / N;
      ringBase[i] = rnd() * Math.PI * 2;
      ringDx[i] = (rnd() - 0.5) * 0.35;
      ringDr[i] = (rnd() - 0.5) * 0.26;
      ringSpd[i] = 0.22 + rnd() * 0.2;
      axis.push(new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize());
      spin[i] = 0.3 + rnd() * 0.9;
      natErr[i] = rnd() < 0.08 ? 1 : 0;
      stuckErr[i] = rnd() < 0.06 ? 1 : 0;
      cur[i3] = from[i3] = legacy[i3];
      cur[i3 + 1] = from[i3 + 1] = legacy[i3 + 1];
      cur[i3 + 2] = from[i3 + 2] = legacy[i3 + 2];
      const a = C_AMBER[c];
      col[i3] = a[0]; col[i3 + 1] = a[1]; col[i3 + 2] = a[2];
    }

    // ---------- records (instanced cubes with baked face shading) ----------
    const boxGeo = track(new THREE.BoxGeometry(0.115, 0.115, 0.115));
    const shade = [0.78, 0.6, 1.0, 0.5, 0.9, 0.66];
    const vcol = new Float32Array(24 * 3);
    for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) vcol.fill(shade[f], (f * 4 + v) * 3, (f * 4 + v) * 3 + 3);
    boxGeo.setAttribute("color", new THREE.BufferAttribute(vcol, 3));
    const boxMat = track(new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true }));
    const mesh = new THREE.InstancedMesh(boxGeo, boxMat, N);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3);
    mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    group.add(mesh);

    // glow halo (additive points sharing record positions)
    const haloTex = track(haloTexture());
    const haloGeo = track(new THREE.BufferGeometry());
    const haloPos = new THREE.BufferAttribute(new Float32Array(N * 3), 3).setUsage(THREE.DynamicDrawUsage);
    const haloCol = new THREE.BufferAttribute(new Float32Array(N * 3), 3).setUsage(THREE.DynamicDrawUsage);
    haloGeo.setAttribute("position", haloPos);
    haloGeo.setAttribute("color", haloCol);
    const haloMat = track(new THREE.PointsMaterial({
      size: 0.55, map: haloTex, vertexColors: true, transparent: true, opacity: 0.3,
      depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    const halo = new THREE.Points(haloGeo, haloMat);
    halo.frustumCulled = false;
    group.add(halo);

    // legacy system boxes
    const legacyMat = track(new THREE.LineBasicMaterial({ color: "#F2A93B", transparent: true, opacity: 0.5 }));
    const legacyGeo = track(new THREE.EdgesGeometry(new THREE.BoxGeometry(CB[0] * 2 + 0.3, CB[1] * 2 + 0.24, CB[2] * 2 + 0.3)));
    for (const c of CL) {
      const box = new THREE.LineSegments(legacyGeo, legacyMat);
      box.position.set(c[0], c[1], c[2]);
      group.add(box);
    }

    // T24 slots + outline
    const slotGeo = track(new THREE.BufferGeometry());
    slotGeo.setAttribute("position", new THREE.BufferAttribute(slot.slice(), 3));
    const slotMat = track(new THREE.PointsMaterial({ color: "#6F93BC", size: 0.045, transparent: true, opacity: 0.2, depthWrite: false }));
    group.add(new THREE.Points(slotGeo, slotMat));
    const gridMat = track(new THREE.LineBasicMaterial({ color: "#2DD4A7", transparent: true, opacity: 0.2 }));
    const gridBox = new THREE.LineSegments(track(new THREE.EdgesGeometry(new THREE.BoxGeometry(10 * S + 0.14, 10 * S + 0.14, L * S + 0.14))), gridMat);
    gridBox.position.set(GX, -0.1, 0);
    group.add(gridBox);
    const gridTop = 4.5 * S - 0.1, gridBottom = -4.5 * S - 0.1;

    // staging ring
    const ringGroup = new THREE.Group();
    ringGroup.rotation.y = Math.PI / 2;
    group.add(ringGroup);
    const ringMat = track(new THREE.MeshBasicMaterial({ color: "#A9C1DC", transparent: true, opacity: 0.3 }));
    ringGroup.add(new THREE.Mesh(track(new THREE.TorusGeometry(R, 0.012, 6, 180)), ringMat));
    const ringMat2 = track(new THREE.MeshBasicMaterial({ color: "#A9C1DC", transparent: true, opacity: 0.15 }));
    ringGroup.add(new THREE.Mesh(track(new THREE.TorusGeometry(R * 0.8, 0.006, 4, 160)), ringMat2));
    const dots = 120, dotPos = new Float32Array(dots * 3);
    for (let d = 0; d < dots; d++) {
      const a = (d / dots) * Math.PI * 2;
      dotPos[d * 3] = Math.cos(a) * R * 1.17;
      dotPos[d * 3 + 1] = Math.sin(a) * R * 1.17;
    }
    const dotGeo = track(new THREE.BufferGeometry());
    dotGeo.setAttribute("position", new THREE.BufferAttribute(dotPos, 3));
    const dotMat = track(new THREE.PointsMaterial({ color: "#A9C1DC", size: 0.035, transparent: true, opacity: 0.3, depthWrite: false }));
    const dotRing = new THREE.Points(dotGeo, dotMat);
    ringGroup.add(dotRing);

    // validation gate (DSC verify) between staging and T24
    const gateMat = track(new THREE.LineBasicMaterial({ color: "#FF5A5F", transparent: true, opacity: 0 }));
    const gate = new THREE.LineSegments(track(new THREE.EdgesGeometry(new THREE.PlaneGeometry(2.3, 2.3))), gateMat);
    gate.rotation.y = Math.PI / 2;
    gate.position.x = GATE_X;
    group.add(gate);

    // reconciliation scan plane
    const scanMat = track(new THREE.MeshBasicMaterial({
      color: "#2DD4A7", transparent: true, opacity: 0, side: THREE.DoubleSide,
      depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    const scanPlane = new THREE.Mesh(track(new THREE.PlaneGeometry(10 * S + 0.06, L * S + 0.06)), scanMat);
    scanPlane.rotation.x = -Math.PI / 2;
    scanPlane.position.set(GX, gridTop, 0);
    group.add(scanPlane);

    // mapping lines (stage 1)
    const M = 90, mapIdx = new Uint16Array(M);
    const linePos = new THREE.BufferAttribute(new Float32Array(M * 6), 3).setUsage(THREE.DynamicDrawUsage);
    const lineCol = new Float32Array(M * 6);
    for (let k = 0; k < M; k++) {
      const j = Math.floor((k * N) / M + (k % 3));
      mapIdx[k] = j;
      const a = C_AMBER[cluster[j]];
      lineCol.set(a, k * 6);
      lineCol.set(C_TEAL, k * 6 + 3);
    }
    const lineGeo = track(new THREE.BufferGeometry());
    lineGeo.setAttribute("position", linePos);
    lineGeo.setAttribute("color", new THREE.BufferAttribute(lineCol, 3));
    const lineMat = track(new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, depthWrite: false }));
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    lines.frustumCulled = false;
    lines.visible = false;
    group.add(lines);

    // ---------- sizing ----------
    let dist = 10;
    const resize = () => {
      const w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      dist = Math.max((6.7 * F + 0.35) / (tanH * camera.aspect), 2.55 / tanH) + 0.6;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    // ---------- pointer ----------
    const ptr = { x: 0, y: 0, px: 0, py: 0, inside: false, down: false, moved: 0, lastX: 0, lastY: 0, type: "mouse" };
    let rotY = 0, rotX = 0, sx = 0, sy = 0, lastInteract = -10, hovered = -1, pinned = -1, needPick = false;
    const now = () => performance.now() / 1000;
    const setPtr = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      ptr.px = e.clientX - r.left;
      ptr.py = e.clientY - r.top;
      ptr.x = (ptr.px / r.width) * 2 - 1;
      ptr.y = -((ptr.py / r.height) * 2 - 1);
      ptr.type = e.pointerType;
    };
    const onDown = (e: PointerEvent) => {
      setPtr(e);
      ptr.down = true; ptr.moved = 0; ptr.lastX = e.clientX; ptr.lastY = e.clientY; ptr.inside = true;
      try { canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    };
    const onMove = (e: PointerEvent) => {
      setPtr(e);
      ptr.inside = true;
      if (ptr.down) {
        const dx = e.clientX - ptr.lastX, dy = e.clientY - ptr.lastY;
        ptr.moved += Math.abs(dx) + Math.abs(dy);
        rotY = clamp(rotY + dx * 0.006, -0.9, 0.9);
        rotX = clamp(rotX + dy * 0.003, -0.3, 0.3);
        ptr.lastX = e.clientX; ptr.lastY = e.clientY;
        lastInteract = now();
      }
      needPick = true;
    };
    const onUp = (e: PointerEvent) => {
      if (ptr.down && ptr.moved < 6) {
        setPtr(e);
        pinned = pick();
      }
      ptr.down = false;
      lastInteract = now();
      try { canvas.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    };
    const onLeave = () => {
      if (!ptr.down) { ptr.inside = false; hovered = -1; }
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("pointerleave", onLeave);

    const v = new THREE.Vector3();
    const toScreen = (x: number, y: number, z: number) => {
      v.set(x, y, z).applyMatrix4(group.matrixWorld).project(camera);
      return v;
    };
    function pick() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      let best = -1, bd = 18 * 18;
      for (let i = 0; i < N; i++) {
        const p = toScreen(cur[i * 3], cur[i * 3 + 1], cur[i * 3 + 2]);
        if (p.z > 1) continue;
        const dx = ((p.x + 1) / 2) * w - ptr.px, dy = ((1 - p.y) / 2) * h - ptr.py;
        const d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = i; }
      }
      return best;
    }

    // ---------- visibility ----------
    let visible = true, raf = 0, last = now();
    const io = new IntersectionObserver((ents) => {
      visible = ents.some((x) => x.isIntersecting) && document.visibilityState === "visible";
      if (visible && !raf) { last = now(); raf = requestAnimationFrame(tick); }
    });
    io.observe(host);
    const onVis = () => {
      visible = document.visibilityState === "visible";
      if (visible && !raf) { last = now(); raf = requestAnimationFrame(tick); }
    };
    document.addEventListener("visibilitychange", onVis);

    // ---------- loop ----------
    const DUR = 1.6;
    const lv = { legacy: LV_LEGACY[0], slots: LV_SLOTS[0], ring: LV_RING[0], grid: LV_GRID[0], map: 0, gate: 0, fx: FOCUS_X[0] };
    let activeKey = "", activeStage = -1, transStart = -10, labelsShown = false, tipKey = "";
    const q = new THREE.Quaternion(), qId = new THREE.Quaternion(), pos = new THREE.Vector3(), scl = new THREE.Vector3(), mtx = new THREE.Matrix4();
    const instCol = mesh.instanceColor.array as Float32Array;
    const hPos = haloPos.array as Float32Array, hCol = haloCol.array as Float32Array;
    const lPos = linePos.array as Float32Array;
    const startT = now();

    function tick() {
      if (!visible) { raf = 0; return; }
      raf = requestAnimationFrame(tick);
      const tNow = now();
      const dt = Math.min(0.05, tNow - last);
      last = tNow;
      const t = reduced ? 0 : tNow - startT;
      const { stage: stg, errors: err } = cfgRef.current;
      const key = `${stg}|${err}`;
      if (key !== activeKey) {
        const toCutover = stg === 4 && activeStage !== 4;
        from.set(cur);
        for (let i = 0; i < N; i++) delay[i] = toCutover ? slotOrder[i] * 1.8 : seed[i] * 0.5;
        transStart = tNow;
        activeKey = key;
        if (stg !== activeStage) {
          activeStage = stg;
          labelRefs.current.forEach((el, zi) => el?.classList.toggle("is-active", ACTIVE_ZONES[stg].includes(zi)));
        }
      }
      const ck = reduced ? 1 : 1 - Math.exp(-dt * 5);
      const lk = reduced ? 1 : 1 - Math.exp(-dt * 3);
      lv.legacy += (LV_LEGACY[stg] - lv.legacy) * lk;
      lv.slots += (LV_SLOTS[stg] - lv.slots) * lk;
      lv.ring += (LV_RING[stg] - lv.ring) * lk;
      lv.grid += (LV_GRID[stg] - lv.grid) * lk;
      lv.map += ((stg === 1 ? 1 : 0) - lv.map) * lk;
      lv.gate += ((stg === 3 ? (err === "none" ? 0.12 : 0.55) : 0) - lv.gate) * lk;
      lv.fx += (FOCUS_X[stg] - lv.fx) * lk;

      // reconciliation scan (cutover)
      const sinceTrans = tNow - transStart;
      let scanY = Infinity, scanOn = 0, sweeps = 0;
      if (stg === 4 && !reduced) {
        const st = sinceTrans - 3.6;
        if (st > 0) {
          const period = 3.4;
          sweeps = Math.floor(st / period);
          const ph = (st % period) / period;
          scanY = gridTop + 0.25 - ph * (gridTop - gridBottom + 0.5);
          scanOn = Math.sin(ph * Math.PI);
        }
      }
      scanPlane.position.y = scanY === Infinity ? gridTop : scanY;
      scanMat.opacity = 0.12 * scanOn;

      const tipIdx = pinned >= 0 ? pinned : hovered;

      for (let i = 0; i < N; i++) {
        const i3 = i * 3;
        let x: number, y: number, z: number, c: [number, number, number], ord: number, st: number, sc = 1;
        const ringA = ringBase[i] + t * ringSpd[i], ringR = R + ringDr[i];
        if (stg <= 1) {
          const ph = seed[i] * 6.283;
          x = legacy[i3] + Math.sin(t * 0.6 + ph) * 0.04;
          y = legacy[i3 + 1] + Math.cos(t * 0.5 + ph * 1.3) * 0.04;
          z = legacy[i3 + 2] + Math.sin(t * 0.4 + ph * 0.7) * 0.04;
          c = C_AMBER[cluster[i]];
          ord = stg === 1 ? 0.3 : 0;
          st = stg === 1 ? ST_MAPPED : ST_LEGACY;
        } else if (stg === 2) {
          x = ringDx[i]; y = Math.sin(ringA) * ringR; z = Math.cos(ringA) * ringR;
          c = C_CLEAN; ord = 0.55; st = ST_STAGING;
        } else if (stg === 3 && err === "cycle") {
          const u = (t * 0.085 + seed[i]) % 1;
          const rx = ringDx[i], ry = Math.sin(ringA) * ringR, rz = Math.cos(ringA) * ringR;
          const bad = natErr[i] === 1;
          const dx = bad ? GATE_X - 0.12 : slot[i3];
          const dy = bad ? Math.sin(ringBase[i]) * 0.85 : slot[i3 + 1];
          const dz = bad ? Math.cos(ringBase[i]) * 0.85 : slot[i3 + 2];
          const dc = bad ? C_RED : C_TEAL;
          if (u < 0.38) {
            x = rx; y = ry; z = rz; c = C_CLEAN; ord = 0.55; st = ST_STAGING;
          } else if (u < 0.52) {
            const k = easeInOut((u - 0.38) / 0.14), b = Math.sin(Math.PI * k) * 0.6;
            x = rx + (dx - rx) * k; y = ry + (dy - ry) * k + b; z = rz + (dz - rz) * k;
            c = k > 0.5 ? dc : C_CLEAN; ord = 0.55 + 0.45 * k; st = bad ? ST_FAIL : ST_TRIAL;
          } else if (u < 0.8) {
            x = dx; y = dy; z = dz; c = dc; ord = 1; st = bad ? ST_FAIL : ST_TRIAL;
            if (bad) sc = 1 + 0.25 * Math.sin(t * 7 + seed[i] * 6);
          } else {
            const k = easeInOut((u - 0.8) / 0.2), b = Math.sin(Math.PI * k) * 0.6;
            x = dx + (rx - dx) * k; y = dy + (ry - dy) * k + b; z = dz + (rz - dz) * k;
            c = k > 0.4 ? C_CLEAN : dc; ord = 1 - 0.45 * k; st = bad ? ST_FAIL : ST_RETURN;
          }
        } else if (stg === 3 && err === "stuck" && stuckErr[i] === 1) {
          x = GATE_X - 0.12 + Math.sin(t * 9 + seed[i] * 6) * 0.015;
          y = Math.sin(ringBase[i]) * 0.85; z = Math.cos(ringBase[i]) * 0.85;
          c = C_RED; ord = 0.2; st = ST_STUCK; sc = 1 + 0.3 * Math.sin(t * 6 + seed[i] * 6);
        } else {
          x = slot[i3]; y = slot[i3 + 1]; z = slot[i3 + 2];
          c = C_TEAL; ord = 1;
          st = stg === 4 && (sweeps > 0 || slot[i3 + 1] > scanY || reduced) ? ST_RECON : ST_LOADED;
        }

        // transition from captured position (with an arc for long moves)
        let k = reduced ? 1 : (tNow - transStart - delay[i]) / DUR;
        if (k < 1) {
          k = k < 0 ? 0 : k;
          const e = easeInOut(k);
          const fx = from[i3], fy = from[i3 + 1], fz = from[i3 + 2];
          const d2 = (x - fx) * (x - fx) + (y - fy) * (y - fy) + (z - fz) * (z - fz);
          const b = Math.sin(Math.PI * e) * Math.min(1, d2 / 9);
          x = fx + (x - fx) * e;
          y = fy + (y - fy) * e + b * (0.5 + seed2[i] * 0.9);
          z = fz + (z - fz) * e + b * (seed[i] - 0.5) * 1.2;
        }
        cur[i3] = x; cur[i3 + 1] = y; cur[i3 + 2] = z;
        state[i] = st;

        col[i3] += (c[0] - col[i3]) * ck;
        col[i3 + 1] += (c[1] - col[i3 + 1]) * ck;
        col[i3 + 2] += (c[2] - col[i3 + 2]) * ck;
        order[i] += (ord - order[i]) * ck;

        let boost = 0;
        if (scanOn > 0 && k >= 1) boost = Math.max(0, 1 - Math.abs(y - scanY) / 0.16) * 0.8;
        if (i === tipIdx) { boost = Math.max(boost, 0.45); sc *= 2.1; }
        const r = col[i3] + (C_WHITE[0] - col[i3]) * boost;
        const g = col[i3 + 1] + (C_WHITE[1] - col[i3 + 1]) * boost;
        const bl = col[i3 + 2] + (C_WHITE[2] - col[i3 + 2]) * boost;
        instCol[i3] = r; instCol[i3 + 1] = g; instCol[i3 + 2] = bl;
        hCol[i3] = r; hCol[i3 + 1] = g; hCol[i3 + 2] = bl;
        hPos[i3] = x; hPos[i3 + 1] = y; hPos[i3 + 2] = z;

        q.setFromAxisAngle(axis[i], seed[i] * 6 + t * spin[i]).slerp(qId, order[i]);
        pos.set(x, y, z);
        scl.setScalar(sc);
        mtx.compose(pos, q, scl);
        mesh.setMatrixAt(i, mtx);
      }
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor!.needsUpdate = true;
      haloPos.needsUpdate = true;
      haloCol.needsUpdate = true;

      // mapping lines
      lines.visible = lv.map > 0.01;
      if (lines.visible) {
        for (let m = 0; m < M; m++) {
          const j = mapIdx[m] * 3;
          lPos[m * 6] = cur[j]; lPos[m * 6 + 1] = cur[j + 1]; lPos[m * 6 + 2] = cur[j + 2];
          lPos[m * 6 + 3] = slot[j]; lPos[m * 6 + 4] = slot[j + 1]; lPos[m * 6 + 5] = slot[j + 2];
        }
        linePos.needsUpdate = true;
        lineMat.opacity = lv.map * 0.45;
      }

      legacyMat.opacity = lv.legacy;
      slotMat.opacity = lv.slots;
      ringMat.opacity = lv.ring;
      ringMat2.opacity = lv.ring * 0.45;
      dotMat.opacity = lv.ring * 0.6;
      gridMat.opacity = lv.grid;
      gateMat.opacity = lv.gate * (err === "stuck" && stg === 3 ? 0.7 + 0.3 * Math.sin(t * 5) : 1);
      dotRing.rotation.z = t * 0.15;

      // view: drag rotation, gentle parallax, spring back when idle
      if (!ptr.down && tNow - lastInteract > 2.5) {
        rotY += (0 - rotY) * Math.min(1, dt * 1.2);
        rotX += (0 - rotX) * Math.min(1, dt * 1.2);
      }
      const px = ptr.inside && !reduced && ptr.type === "mouse" ? ptr.x : 0;
      const py = ptr.inside && !reduced && ptr.type === "mouse" ? ptr.y : 0;
      sx += (px - sx) * Math.min(1, dt * 3);
      sy += (py - sy) * Math.min(1, dt * 3);
      group.rotation.y = -0.5 + rotY + sx * 0.12;
      group.rotation.x = rotX - sy * 0.05;
      const camX = 0.75 * F + lv.fx;
      camera.position.set(camX + Math.sin(t * 0.07) * 0.3, 2.1, dist);
      camera.lookAt(camX, -0.15, 0);
      camera.updateMatrixWorld();
      group.updateMatrixWorld();

      // zone labels
      const w = canvas.clientWidth, h = canvas.clientHeight;
      anchors.forEach((an, zi) => {
        const el = labelRefs.current[zi];
        if (!el) return;
        const p = toScreen(an[0], an[1], an[2]);
        el.style.transform = `translate(${((p.x + 1) / 2) * w}px, ${((1 - p.y) / 2) * h}px) translate(-50%, -100%)`;
      });
      if (!labelsShown) {
        labelRefs.current.forEach((el) => el && (el.style.opacity = ""));
        labelsShown = true;
      }

      // record tooltip
      if (needPick && ptr.type === "mouse" && !ptr.down) {
        hovered = ptr.inside ? pick() : -1;
        needPick = false;
      }
      const tip = tipRef.current;
      if (tip) {
        const idx = pinned >= 0 ? pinned : hovered;
        if (idx >= 0) {
          const p = toScreen(cur[idx * 3], cur[idx * 3 + 1], cur[idx * 3 + 2]);
          const inT24 = state[idx] >= ST_LOADED || state[idx] === ST_TRIAL || state[idx] === ST_RETURN;
          const legacyId = `CL-${String(idx + 1).padStart(4, "0")}`;
          const idText = inT24 || state[idx] === ST_MAPPED ? `${legacyId} → ${100001 + idx}` : legacyId;
          const k2 = `${idx}|${state[idx]}`;
          if (k2 !== tipKey) {
            if (tipIdRef.current) tipIdRef.current.textContent = idText;
            if (tipStRef.current) tipStRef.current.textContent = `Sumber ${cluster[idx] + 1}. ${STATUS[state[idx]]}`;
            tip.dataset.state = state[idx] === ST_FAIL || state[idx] === ST_STUCK ? "error" : state[idx] >= ST_LOADED ? "ok" : "";
            tipKey = k2;
          }
          const tx = clamp(((p.x + 1) / 2) * w, 90, w - 90);
          tip.style.transform = `translate(${tx}px, ${((1 - p.y) / 2) * h - 14}px) translate(-50%, -100%)`;
          tip.style.opacity = "1";
        } else if (tip.style.opacity !== "0") {
          tip.style.opacity = "0";
          tipKey = "";
        }
      }

      renderer.render(scene, camera);
    }
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      visible = false;
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("pointerleave", onLeave);
      mesh.dispose();
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      canvas.remove();
    };
  }, [compact, narrow]);

  if (failed) return <SceneFallback compact={compact} />;

  return (
    <div ref={hostRef} className={compact ? "scene3d scene3d--compact" : "scene3d"} role="group" aria-label={label ?? "Animasi 3D perjalanan data migrasi"}>
      {ZONES.map((z, i) => {
        const content = <>
          <span className="scene3d-label-title">{z.title}</span>
          {!compact && <span className="scene3d-label-sub">{z.sub}</span>}
        </>;
        return onZoneSelect
          ? <button key={z.title} type="button" ref={(el) => { labelRefs.current[i] = el; }} className="scene3d-label" style={{ opacity: 0 }}
              onClick={() => onZoneSelect(z.stage)} onPointerDown={(e) => e.stopPropagation()}>{content}</button>
          : <span key={z.title} ref={(el) => { labelRefs.current[i] = el; }} className="scene3d-label" style={{ opacity: 0 }}>{content}</span>;
      })}
      <div ref={tipRef} className="scene3d-tip" style={{ opacity: 0 }} aria-hidden="true">
        <span ref={tipIdRef} className="scene3d-tip-id" />
        <span ref={tipStRef} className="scene3d-tip-status" />
      </div>
      <ul className="scene3d-legend" aria-label="Arti warna">
        <li><i style={{ background: "#F2A93B" }} />Legacy</li>
        <li><i style={{ background: "#D9E6F2" }} />Staging</li>
        <li><i style={{ background: "#2DD4A7" }} />Di T24</li>
        <li><i style={{ background: "#FF5A5F" }} />Gagal validasi</li>
      </ul>
    </div>
  );
}
