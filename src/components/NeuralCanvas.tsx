import { useEffect, useRef } from 'react';
import type {
  CameraState,
  PositionedProjectNode,
  SynapseEdge,
  ViewMode,
  YearRing,
} from '../types/portfolio';
import type { AccentTheme } from '../data/themes';
import { nanotechAudio } from '../utils/nanotechAudio';

interface NeuralCanvasProps {
  nodes: PositionedProjectNode[];
  edges: SynapseEdge[];
  yearRings: YearRing[];
  theme: AccentTheme;
  cameraRef: React.MutableRefObject<CameraState>;
  velocityRef: React.MutableRefObject<number>;
  pointerScreenRef: React.MutableRefObject<{ x: number; y: number; active: boolean }>;
  viewMode: ViewMode;
  generationEpoch: number;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  activeFilter: string | null;
  onNodeRevealChange?: (revealedIds: Set<string>) => void;
}

interface AmbientParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  twinklePhase: number;
  isStarHub: boolean;
}

interface EdgeAnimState {
  progress: number;
  delayMs: number;
  sparkBurst: number;
  wasVisible: boolean;
  pulsePhase: number;
}

function evalQuadBezier(
  x0: number,
  y0: number,
  cx: number,
  cy: number,
  x1: number,
  y1: number,
  t: number
): { x: number; y: number } {
  const mt = 1 - t;
  return {
    x: mt * mt * x0 + 2 * mt * t * cx + t * t * x1,
    y: mt * mt * y0 + 2 * mt * t * cy + t * t * y1,
  };
}

/**
 * Draws a sub-segment [0, t] of a quadratic Bezier curve via de Casteljau subdivision.
 */
function strokePartialQuadBezier(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  cx: number,
  cy: number,
  x1: number,
  y1: number,
  t: number
): { tipX: number; tipY: number } {
  const clamped = Math.max(0, Math.min(1, t));
  const q0x = x0 + (cx - x0) * clamped;
  const q0y = y0 + (cy - y0) * clamped;
  const q1x = cx + (x1 - cx) * clamped;
  const q1y = cy + (y1 - cy) * clamped;
  const tipX = q0x + (q1x - q0x) * clamped;
  const tipY = q0y + (q1y - q0y) * clamped;

  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(q0x, q0y, tipX, tipY);
  ctx.stroke();

  return { tipX, tipY };
}

export function NeuralCanvas({
  nodes,
  edges,
  yearRings,
  theme,
  cameraRef,
  velocityRef,
  pointerScreenRef,
  viewMode,
  generationEpoch,
  selectedNodeId,
  hoveredNodeId,
  activeFilter,
  onNodeRevealChange,
}: NeuralCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<AmbientParticle[]>([]);
  const edgeStatesRef = useRef<Map<string, EdgeAnimState>>(new Map());
  const generationStartRef = useRef<number>(performance.now());
  const revealedSetRef = useRef<Set<string>>(new Set());
  const hexLensRef = useRef({ x: 0, y: 0, alpha: 0, initialized: false });

  // Keep latest props accessible inside RAF loop without restarting canvas
  const propsRef = useRef({
    nodes,
    edges,
    yearRings,
    theme,
    viewMode,
    selectedNodeId,
    hoveredNodeId,
    activeFilter,
    onNodeRevealChange,
  });
  propsRef.current = {
    nodes,
    edges,
    yearRings,
    theme,
    viewMode,
    selectedNodeId,
    hoveredNodeId,
    activeFilter,
    onNodeRevealChange,
  };

  // Initialize ambient starfield & subtle constellation particles once
  useEffect(() => {
    const particles: AmbientParticle[] = [];
    const count = 175;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      // Square-root distribution keeps density even across inner & outer space
      const dist = 75 + Math.sqrt(Math.random()) * 1320;
      const isStarHub = i < 20;
      particles.push({
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 0.14,
        vy: (Math.random() - 0.5) * 0.14,
        size: isStarHub ? 2.1 + Math.random() * 1.1 : 0.9 + Math.random() * 1.65,
        alpha: isStarHub ? 0.45 + Math.random() * 0.25 : 0.18 + Math.random() * 0.38,
        twinklePhase: Math.random() * Math.PI * 2,
        isStarHub,
      });
    }
    particlesRef.current = particles;
  }, []);

  // Reset nanotech filament drawing states whenever generationEpoch triggers or edges change
  useEffect(() => {
    generationStartRef.current = performance.now();
    const map = new Map<string, EdgeAnimState>();
    const nodeById = new Map(nodes.map((n) => [n.project.id, n]));

    let primaryIndex = 0;
    for (const edge of edges) {
      if (edge.kind === 'primary') {
        const node = nodeById.get(edge.toId);
        // Innermost (most recent) filaments launch first, rippling outward!
        const delayMs = node ? (1 - node.recencyScore) * 520 : 0;
        map.set(edge.id, {
          progress: viewMode === 'ABOUT_FULLSCREEN' ? 0.12 : 0,
          delayMs,
          sparkBurst: 0,
          wasVisible: true,
          // Stagger initial pulse phases across [0, 1.35) so orbs ripple organically
          pulsePhase: (primaryIndex * 0.29) % 1.35,
        });
        primaryIndex++;
      } else {
        map.set(edge.id, {
          progress: 0,
          delayMs: 360 + Math.random() * 320,
          sparkBurst: 0,
          wasVisible: false,
          pulsePhase: 0,
        });
      }
    }

    edgeStatesRef.current = map;
    revealedSetRef.current = new Set();
    onNodeRevealChange?.(new Set());
  }, [edges, nodes, generationEpoch]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let lastTime = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const render = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const width = window.innerWidth;
      const height = window.innerHeight;
      const cam = cameraRef.current;
      const velocity = velocityRef.current;
      const pointer = pointerScreenRef.current;
      const {
        nodes: currentNodes,
        edges: currentEdges,
        yearRings: currentYearRings,
        theme: activeTheme,
        viewMode: mode,
        selectedNodeId: selectedId,
        hoveredNodeId: hoveredId,
        activeFilter: filter,
        onNodeRevealChange: notifyRevealed,
      } = propsRef.current;

      const accentRgb = activeTheme.accentRgb;
      const glowRgb = activeTheme.glowRgb;
      const secondaryRgb = activeTheme.secondaryRgb;
      const softRgb = activeTheme.softRgb;
      const midRgb = activeTheme.midRgb;

      ctx.clearRect(0, 0, width, height);

      // Subtle radial core atmospheric glow
      const coreScreenX = width * 0.5 - cam.x * cam.zoom;
      const coreScreenY = height * 0.5 - cam.y * cam.zoom;
      const glowRadius = Math.max(260, 460 * cam.zoom);
      const bgGlow = ctx.createRadialGradient(
        coreScreenX,
        coreScreenY,
        0,
        coreScreenX,
        coreScreenY,
        glowRadius
      );
      bgGlow.addColorStop(0, `rgba(${accentRgb}, 0.13)`);
      bgGlow.addColorStop(0.45, `rgba(${midRgb}, 0.045)`);
      bgGlow.addColorStop(1, 'rgba(4, 8, 15, 0)');
      ctx.fillStyle = bgGlow;
      ctx.fillRect(0, 0, width, height);

      // 0. Interactive 3D-Bulging Hex / Constellation Cursor Lens (Node View only)
      const lens = hexLensRef.current;
      const lensTargetAlpha =
        pointer.active && (mode === 'NETWORK' || mode === 'NODE_PREVIEW')
          ? 1
          : 0;

      if (pointer.active && !lens.initialized) {
        lens.x = pointer.x;
        lens.y = pointer.y;
        lens.initialized = true;
      } else if (pointer.active) {
        const follow = 1 - Math.exp(-18 * dt);
        lens.x += (pointer.x - lens.x) * follow;
        lens.y += (pointer.y - lens.y) * follow;
      }
      lens.alpha += (lensTargetAlpha - lens.alpha) * (1 - Math.exp(-9 * dt));

      if (lens.alpha > 0.015) {
        const lensRadius = 215;
        const hexR = 22;
        const colStep = Math.sqrt(3) * hexR;
        const rowStep = 1.5 * hexR;

        // Soft holographic spotlight beneath the bulging dome
        const domeGlow = ctx.createRadialGradient(
          lens.x,
          lens.y,
          0,
          lens.x,
          lens.y,
          lensRadius
        );
        domeGlow.addColorStop(0, `rgba(${accentRgb}, ${0.095 * lens.alpha})`);
        domeGlow.addColorStop(0.48, `rgba(${secondaryRgb}, ${0.035 * lens.alpha})`);
        domeGlow.addColorStop(1, `rgba(${accentRgb}, 0)`);
        ctx.fillStyle = domeGlow;
        ctx.beginPath();
        ctx.arc(lens.x, lens.y, lensRadius, 0, Math.PI * 2);
        ctx.fill();

        const warpPoint = (px: number, py: number) => {
          const dx = px - lens.x;
          const dy = py - lens.y;
          const dist = Math.hypot(dx, dy);
          if (dist >= lensRadius) {
            return { x: px, y: py, f: 0 };
          }
          const u = 1 - dist / lensRadius;
          const f = u * u * (3 - 2 * u); // Smooth cubic dome falloff
          if (dist < 0.001) {
            return { x: px, y: py, f };
          }
          // Outward spherical perspective bulge toward viewer
          const bulge = Math.sin(u * Math.PI * 0.92) * 19 * lens.alpha;
          const invDist = 1 / dist;
          return {
            x: px + dx * invDist * bulge,
            y: py + dy * invDist * bulge,
            f,
          };
        };

        // Anchor lattice to world camera origin so panning slides the hex grid naturally
        const minRow = Math.floor((lens.y - lensRadius - coreScreenY) / rowStep) - 1;
        const maxRow = Math.ceil((lens.y + lensRadius - coreScreenY) / rowStep) + 1;
        const drawnVertices = new Set<string>();

        ctx.save();
        for (let row = minRow; row <= maxRow; row++) {
          const rowOffsetX = (row & 1) !== 0 ? colStep * 0.5 : 0;
          const cy = coreScreenY + row * rowStep;
          const minCol =
            Math.floor((lens.x - lensRadius - coreScreenX - rowOffsetX) / colStep) - 1;
          const maxCol =
            Math.ceil((lens.x + lensRadius - coreScreenX - rowOffsetX) / colStep) + 1;

          for (let col = minCol; col <= maxCol; col++) {
            const cx = coreScreenX + col * colStep + rowOffsetX;
            const centerDist = Math.hypot(cx - lens.x, cy - lens.y);
            if (centerDist > lensRadius + hexR) continue;

            const warpedCenter = warpPoint(cx, cy);
            const cellAlpha = warpedCenter.f * lens.alpha;
            if (cellAlpha <= 0.015) continue;

            // Compute 6 pointy-top hex vertices with spherical bulge warp
            const verts: Array<{ x: number; y: number; f: number; key: string }> = [];
            for (let k = 0; k < 6; k++) {
              const ang = (Math.PI / 3) * k - Math.PI / 6;
              const vx = cx + Math.cos(ang) * hexR;
              const vy = cy + Math.sin(ang) * hexR;
              const wv = warpPoint(vx, vy);
              verts.push({
                ...wv,
                key: `${Math.round(vx * 0.5)}:${Math.round(vy * 0.5)}`,
              });
            }

            // Hex perimeter edges
            ctx.beginPath();
            ctx.moveTo(verts[0].x, verts[0].y);
            for (let k = 1; k < 6; k++) {
              ctx.lineTo(verts[k].x, verts[k].y);
            }
            ctx.closePath();
            ctx.strokeStyle = `rgba(${accentRgb}, ${cellAlpha * 0.34})`;
            ctx.lineWidth = 0.65 + cellAlpha * 0.85;
            ctx.stroke();

            // Inner constellation triangulation spokes near the dome peak
            if (cellAlpha > 0.16) {
              ctx.beginPath();
              for (let k = 0; k < 6; k += 2) {
                ctx.moveTo(warpedCenter.x, warpedCenter.y);
                ctx.lineTo(verts[k].x, verts[k].y);
              }
              ctx.strokeStyle = `rgba(${secondaryRgb}, ${cellAlpha * 0.2})`;
              ctx.lineWidth = 0.6;
              ctx.stroke();

              // Center constellation star dot
              ctx.beginPath();
              ctx.arc(
                warpedCenter.x,
                warpedCenter.y,
                0.8 + cellAlpha * 1.15,
                0,
                Math.PI * 2
              );
              ctx.fillStyle = `rgba(${softRgb}, ${cellAlpha * 0.58})`;
              ctx.fill();
            }

            // Glowing constellation dots at hex vertices (deduped so shared corners stay clean)
            for (const v of verts) {
              if (v.f <= 0.04 || drawnVertices.has(v.key)) continue;
              drawnVertices.add(v.key);
              const va = v.f * lens.alpha;
              const dotR = 0.85 + va * 1.55;
              ctx.beginPath();
              ctx.arc(v.x, v.y, dotR, 0, Math.PI * 2);
              ctx.fillStyle =
                va > 0.68
                  ? `rgba(255, 255, 255, ${va * 0.85})`
                  : `rgba(${softRgb}, ${va * 0.72})`;
              ctx.fill();
            }
          }
        }
        ctx.restore();
      }

      // Convert pointer screen coords to world coords for dynamic nanotech weave
      const pointerWorldX = cam.x + (pointer.x - width * 0.5) / cam.zoom;
      const pointerWorldY = cam.y + (pointer.y - height * 0.5) / cam.zoom;

      // World-space viewport bounds (for viewport-reactive line drawing)
      const halfWorldW = (width * 0.52) / cam.zoom;
      const halfWorldH = (height * 0.52) / cam.zoom;
      const isInViewport = (wx: number, wy: number, pad = 90) =>
        Math.abs(wx - cam.x) <= halfWorldW + pad &&
        Math.abs(wy - cam.y) <= halfWorldH + pad;

      ctx.save();
      ctx.translate(width * 0.5, height * 0.5);
      ctx.scale(cam.zoom, cam.zoom);
      ctx.translate(-cam.x, -cam.y);

      // 1. Concentric Year Rings around Center Core (0, 0) — grows by 1 ring per year
      ctx.save();
      for (const ring of currentYearRings) {
        ctx.beginPath();
        ctx.arc(0, 0, ring.outerRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${accentRgb}, 0.11)`;
        ctx.lineWidth = 1 / cam.zoom;
        ctx.setLineDash([5 / cam.zoom, 9 / cam.zoom]);
        ctx.stroke();

        if (mode !== 'ABOUT_FULLSCREEN' && cam.zoom > 0.35) {
          ctx.setLineDash([]);
          ctx.fillStyle = `rgba(${accentRgb}, 0.42)`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.font = `500 ${Math.max(9, 11 / cam.zoom)}px "JetBrains Mono", monospace`;
          ctx.fillText(String(ring.year), 0, -ring.outerRadius + 8 / cam.zoom);
        }
      }
      ctx.restore();

      // 2. Ambient starfield, persistent subtle constellations & dynamic cursor mesh
      const particles = particlesRef.current;
      const visibleParticles: AmbientParticle[] = [];
      const nearbyParticles: AmbientParticle[] = [];
      const fieldBound = 1420;

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x > fieldBound) p.x = -fieldBound;
        else if (p.x < -fieldBound) p.x = fieldBound;
        if (p.y > fieldBound) p.y = -fieldBound;
        else if (p.y < -fieldBound) p.y = fieldBound;

        if (!isInViewport(p.x, p.y, 160)) continue;
        visibleParticles.push(p);

        const twinkle = 0.78 + 0.22 * Math.sin(now * 0.0014 + p.twinklePhase);
        const dotRadius = p.size / Math.sqrt(cam.zoom);

        if (p.isStarHub) {
          const halo = ctx.createRadialGradient(
            p.x,
            p.y,
            0,
            p.x,
            p.y,
            dotRadius * 3.4
          );
          halo.addColorStop(0, `rgba(${softRgb}, ${p.alpha * 0.75 * twinkle})`);
          halo.addColorStop(0.45, `rgba(${accentRgb}, ${p.alpha * 0.22 * twinkle})`);
          halo.addColorStop(1, `rgba(${accentRgb}, 0)`);
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(p.x, p.y, dotRadius * 3.4, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, dotRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${accentRgb}, ${p.alpha * 0.72 * twinkle})`;
        ctx.fill();

        const distToFocus = pointer.active
          ? Math.hypot(p.x - pointerWorldX, p.y - pointerWorldY)
          : Math.hypot(p.x - cam.x, p.y - cam.y);
        if (distToFocus < 270 / Math.max(0.6, cam.zoom)) {
          nearbyParticles.push(p);
        }
      }

      // Subtle always-on background constellations across the node view (capped per star to stay airy)
      if (mode !== 'ABOUT_FULLSCREEN' && visibleParticles.length > 1) {
        const linksPerStar = new Uint8Array(visibleParticles.length);
        const maxDist = 152;
        ctx.lineWidth = 0.65 / cam.zoom;

        for (let i = 0; i < visibleParticles.length; i++) {
          if (linksPerStar[i] >= 2) continue;
          const a = visibleParticles[i];
          for (let j = i + 1; j < visibleParticles.length; j++) {
            if (linksPerStar[j] >= 2) continue;
            const b = visibleParticles[j];
            const d = Math.hypot(b.x - a.x, b.y - a.y);
            if (d < maxDist) {
              const alpha = (1 - d / maxDist) * 0.11;
              ctx.strokeStyle = `rgba(${secondaryRgb}, ${alpha})`;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
              linksPerStar[i]++;
              linksPerStar[j]++;
              if (linksPerStar[i] >= 2) break;
            }
          }
        }
      }

      // Dynamic nanotech micro-mesh weaving brighter around pointer or during active panning
      if (mode !== 'ABOUT_FULLSCREEN' && nearbyParticles.length > 1) {
        const meshStrength = Math.min(1, 0.34 + velocity * 0.06);
        ctx.lineWidth = 0.85 / cam.zoom;
        for (let i = 0; i < nearbyParticles.length; i++) {
          for (let j = i + 1; j < nearbyParticles.length; j++) {
            const a = nearbyParticles[i];
            const b = nearbyParticles[j];
            const d = Math.hypot(b.x - a.x, b.y - a.y);
            if (d < 165) {
              const alpha = (1 - d / 165) * 0.24 * meshStrength;
              ctx.strokeStyle = `rgba(${accentRgb}, ${alpha})`;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }
          }
        }
      }

      // 3. Draw Primary & Secondary Synapse Edges with progressive nanotech assembly
      const elapsedSinceGen = now - generationStartRef.current;
      const matchingNodeIds = new Set<string>();
      if (filter) {
        const filterLower = filter.toLowerCase();
        for (const n of currentNodes) {
          if (n.project.categories.some((c) => c.toLowerCase() === filterLower)) {
            matchingNodeIds.add(n.project.id);
          }
        }
      }

      let revealDirtyCount = 0;
      let triggeredMovementSound = false;

      for (const edge of currentEdges) {
        let state = edgeStatesRef.current.get(edge.id);
        if (!state) {
          state = {
            progress: 1,
            delayMs: 0,
            sparkBurst: 0,
            wasVisible: true,
            pulsePhase: 0,
          };
          edgeStatesRef.current.set(edge.id, state);
        }

        const inView =
          edge.kind === 'primary'
            ? isInViewport(edge.toX, edge.toY, 24)
            : isInViewport(edge.toX, edge.toY, 65) ||
              isInViewport(edge.controlX, edge.controlY, 45);
        const nearPointer =
          pointer.active &&
          (Math.hypot(edge.toX - pointerWorldX, edge.toY - pointerWorldY) < 270 ||
            Math.hypot(edge.controlX - pointerWorldX, edge.controlY - pointerWorldY) < 250);

        const isHighlighted =
          selectedId === edge.toId ||
          selectedId === edge.fromId ||
          hoveredId === edge.toId ||
          hoveredId === edge.fromId;

        if (mode === 'ABOUT_FULLSCREEN') {
          // Subtle pulsing core filaments radiating out behind About Me card
          if (edge.kind === 'primary') {
            state.progress += (0.42 - state.progress) * Math.min(1, dt * 3);
          } else {
            state.progress += (0 - state.progress) * Math.min(1, dt * 4);
          }
        } else if (edge.kind === 'primary') {
          if (elapsedSinceGen >= state.delayMs) {
            const target = inView || isHighlighted ? 1 : 0.2;
            const prev = state.progress;
            const speed = target > prev ? 2.45 : 1.35;
            state.progress =
              target > prev
                ? Math.min(target, prev + dt * speed)
                : Math.max(target, prev - dt * speed);

            // Detect newly entering viewport while moving around -> nanotech trickle!
            if (!state.wasVisible && inView && prev < 0.78) {
              triggeredMovementSound = true;
            }
            state.wasVisible = inView;

            // Fire node materialization burst when primary dendrite arrives
            if (prev < 0.96 && state.progress >= 0.96) {
              state.sparkBurst = 1;
              if (!revealedSetRef.current.has(edge.toId)) {
                revealedSetRef.current.add(edge.toId);
                revealDirtyCount++;
              }
            } else if (
              !inView &&
              !isHighlighted &&
              state.progress < 0.45 &&
              revealedSetRef.current.has(edge.toId)
            ) {
              // Off-screen nodes retract so panning back re-forges them dynamically
              revealedSetRef.current.delete(edge.toId);
              revealDirtyCount++;
            }
          }
        } else {
          // Secondary associative synapses dynamically draw in when in view + moving/hovering
          const shouldDraw =
            elapsedSinceGen >= state.delayMs &&
            (isHighlighted || (inView && (nearPointer || velocity > 0.6 || cam.zoom > 0.85)));
          const target = shouldDraw ? 1 : 0;
          const prev = state.progress;
          state.progress =
            target > prev
              ? Math.min(1, prev + dt * 2.1)
              : Math.max(0, prev - dt * 1.45);

          if (prev < 0.08 && state.progress >= 0.08 && velocity > 0.8) {
            triggeredMovementSound = true;
          }
        }

        if (state.sparkBurst > 0) {
          state.sparkBurst = Math.max(0, state.sparkBurst - dt * 2.4);
        }

        if (state.progress <= 0.01) continue;

        const isDimmedByFilter =
          Boolean(filter) &&
          !(matchingNodeIds.has(edge.toId) || matchingNodeIds.has(edge.fromId));

        // Base edge styling
        let strokeColor: string;
        let lineWidth: number;
        if (edge.kind === 'primary') {
          const baseAlpha = isDimmedByFilter
            ? 0.08
            : isHighlighted
              ? 0.92
              : 0.2 + edge.recencyWeight * 0.34;
          strokeColor = isHighlighted
            ? `rgba(${accentRgb}, ${baseAlpha})`
            : `rgba(${glowRgb}, ${baseAlpha})`;
          lineWidth = (isHighlighted ? 2.6 : 1.15 + edge.recencyWeight * 0.95) / Math.sqrt(cam.zoom);
        } else {
          const secAlpha = isDimmedByFilter
            ? 0.04
            : isHighlighted
              ? 0.52
              : 0.16;
          strokeColor = `rgba(${secondaryRgb}, ${secAlpha})`;
          lineWidth = (isHighlighted ? 1.5 : 0.9) / Math.sqrt(cam.zoom);
        }

        ctx.save();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        if (isHighlighted) {
          ctx.shadowColor = `rgba(${accentRgb}, 0.85)`;
          ctx.shadowBlur = 14;
        }

        const { tipX, tipY } = strokePartialQuadBezier(
          ctx,
          edge.fromX,
          edge.fromY,
          edge.controlX,
          edge.controlY,
          edge.toX,
          edge.toY,
          state.progress
        );
        ctx.restore();

        // Draw glowing nanotech forge spark at the active drawing tip!
        if (state.progress > 0.03 && state.progress < 0.99) {
          const sparkFade =
            state.progress > 0.88 ? (0.99 - state.progress) / 0.11 : 1;
          const sparkRadius = (14 / Math.sqrt(cam.zoom)) * (0.5 + 0.5 * sparkFade);
          const sparkGrad = ctx.createRadialGradient(
            tipX,
            tipY,
            0,
            tipX,
            tipY,
            sparkRadius
          );
          sparkGrad.addColorStop(0, `rgba(255, 255, 255, ${sparkFade})`);
          sparkGrad.addColorStop(0.35, `rgba(${accentRgb}, ${0.95 * sparkFade})`);
          sparkGrad.addColorStop(1, `rgba(${accentRgb}, 0)`);
          ctx.fillStyle = sparkGrad;
          ctx.beginPath();
          ctx.arc(tipX, tipY, sparkRadius, 0, Math.PI * 2);
          ctx.fill();
        }

        // Materialization arrival ring burst when filament locks onto its node
        if (state.sparkBurst > 0) {
          const burstR = (1 - state.sparkBurst) * 44 + 14;
          ctx.beginPath();
          ctx.arc(edge.toX, edge.toY, burstR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${accentRgb}, ${state.sparkBurst * 0.78})`;
          ctx.lineWidth = 1.8 / Math.sqrt(cam.zoom);
          ctx.stroke();
        }

        // Animated bioluminescent signal pulse along completed primary dendrites
        if (
          edge.kind === 'primary' &&
          state.progress >= 0.99 &&
          !isDimmedByFilter &&
          mode !== 'ABOUT_FULLSCREEN'
        ) {
          const PULSE_TRAVEL_END = 0.94;
          const PULSE_CYCLE_LEN = 1.38; // [0.94..1.38] = clean off-state cooldown
          const speed = isHighlighted ? 0.62 : 0.24 + edge.recencyWeight * 0.14;
          state.pulsePhase = (state.pulsePhase + dt * speed) % PULSE_CYCLE_LEN;

          const p = state.pulsePhase;
          // Only render while actively traveling; once it reaches the outer node, stay disappeared until next pulse
          if (p > 0.04 && p < PULSE_TRAVEL_END) {
            const fadeIn = Math.min(1, (p - 0.04) / 0.1);
            const fadeOut =
              p > 0.78 ? Math.max(0, (PULSE_TRAVEL_END - p) / (PULSE_TRAVEL_END - 0.78)) : 1;
            const alpha = fadeIn * fadeOut;

            if (alpha > 0.01) {
              const pt = evalQuadBezier(
                edge.fromX,
                edge.fromY,
                edge.controlX,
                edge.controlY,
                edge.toX,
                edge.toY,
                p
              );
              const pulseRadius =
                ((isHighlighted ? 5.2 : 3.2) / Math.sqrt(cam.zoom)) *
                (0.45 + 0.55 * alpha);
              const pulseGrad = ctx.createRadialGradient(
                pt.x,
                pt.y,
                0,
                pt.x,
                pt.y,
                pulseRadius * 2.5
              );
              pulseGrad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
              pulseGrad.addColorStop(0.4, `rgba(${accentRgb}, ${0.9 * alpha})`);
              pulseGrad.addColorStop(1, `rgba(${accentRgb}, 0)`);
              ctx.fillStyle = pulseGrad;
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, pulseRadius * 2.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }

      ctx.restore();

      // Notify DOM overlay when nodes materialize or retract
      if (revealDirtyCount > 0) {
        notifyRevealed?.(new Set(revealedSetRef.current));
      }

      // Fire subtle metallic trickling sound as lines draw while moving around
      if (
        mode !== 'ABOUT_FULLSCREEN' &&
        mode !== 'PROJECT_FULLSCREEN' &&
        (triggeredMovementSound || velocity > 2.4)
      ) {
        const panHint = pointer.active
          ? (pointer.x / Math.max(1, width) - 0.5) * 1.1
          : 0;
        nanotechAudio.playMovementTick(
          Math.min(1, velocity / 14 + (triggeredMovementSound ? 0.35 : 0)),
          panHint
        );
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [cameraRef, velocityRef, pointerScreenRef]);

  return <canvas ref={canvasRef} className="neural-canvas" aria-hidden="true" />;
}
