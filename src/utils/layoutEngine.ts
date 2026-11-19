import type {
  PositionedProjectNode,
  ProjectItem,
  SynapseEdge,
  YearRing,
} from '../types/portfolio';

export const CORE_NODE_ID = 'about-me-core';
export const BASE_INNER_RADIUS = 135;
export const YEAR_RING_STEP = 175;
const BAND_PADDING = 32;
const GOLDEN_ANGLE_RAD = Math.PI * (3 - Math.sqrt(5)); // ~137.508 deg

function getProjectDateParts(iso: string): {
  timestamp: number;
  year: number;
  yearProgressFromEnd: number; // 0 = Dec 31 (newest in year), 1 = Jan 1 (oldest in year)
} {
  const parsed = Date.parse(iso);
  const date = Number.isNaN(parsed) ? new Date() : new Date(parsed);
  const year = date.getUTCFullYear();
  const startOfYear = Date.UTC(year, 0, 1, 0, 0, 0);
  const endOfYear = Date.UTC(year + 1, 0, 1, 0, 0, 0);
  const span = Math.max(1, endOfYear - startOfYear);
  const fractionFromStart = Math.max(
    0,
    Math.min(1, (date.getTime() - startOfYear) / span)
  );
  return {
    timestamp: date.getTime(),
    year,
    yearProgressFromEnd: 1 - fractionFromStart,
  };
}

/**
 * Generates one concentric ring per calendar year spanning from the most recent
 * project year outward to the oldest project year. Grows automatically by one
 * ring whenever a project from a new year is added.
 */
export function computeYearRings(
  projects: ProjectItem[],
  options?: {
    baseInnerRadius?: number;
    yearRingStep?: number;
  }
): YearRing[] {
  if (projects.length === 0) return [];

  const baseInner = options?.baseInnerRadius ?? BASE_INNER_RADIUS;
  const step = options?.yearRingStep ?? YEAR_RING_STEP;

  const years = projects.map((p) => getProjectDateParts(p.date).year);
  const newestYear = Math.max(...years);
  const oldestYear = Math.min(...years);

  const rings: YearRing[] = [];
  for (let y = newestYear; y >= oldestYear; y--) {
    const idx = newestYear - y;
    rings.push({
      year: y,
      innerRadius: baseInner + idx * step,
      outerRadius: baseInner + (idx + 1) * step,
    });
  }
  return rings;
}

/**
 * Deterministic year-ring radial neural network layout engine.
 *
 * Guarantees:
 * 1. Each calendar year occupies its own concentric ring band (newest year innermost).
 * 2. Within each year's ring, projects are positioned radially by month/date
 *    (later in the year = closer to center, earlier in the year = closer to outer ring).
 * 3. More recent projects ALWAYS sit closer to the center (0, 0) than older projects.
 * 4. Angular-only collision relaxation eliminates visual overlap without ever
 *    pushing a node outside its year ring.
 */
export function computeNeuralLayout(
  projects: ProjectItem[],
  options?: {
    baseInnerRadius?: number;
    yearRingStep?: number;
    minNodeSpacing?: number;
  }
): PositionedProjectNode[] {
  if (projects.length === 0) return [];

  const baseInner = options?.baseInnerRadius ?? BASE_INNER_RADIUS;
  const step = options?.yearRingStep ?? YEAR_RING_STEP;
  const minNodeSpacing = options?.minNodeSpacing ?? 124;

  const yearRings = computeYearRings(projects, {
    baseInnerRadius: baseInner,
    yearRingStep: step,
  });
  const ringByYear = new Map(yearRings.map((r) => [r.year, r]));
  const totalOuterSpan =
    yearRings.length > 0
      ? yearRings[yearRings.length - 1].outerRadius - baseInner
      : step;

  // Sort strictly newest -> oldest
  const sorted = [...projects].sort((a, b) => {
    const tA = Date.parse(a.date) || 0;
    const tB = Date.parse(b.date) || 0;
    if (tB !== tA) return tB - tA;
    return a.title.localeCompare(b.title);
  });

  const rawNodes: PositionedProjectNode[] = sorted.map((project, index) => {
    const { year, yearProgressFromEnd } = getProjectDateParts(project.date);
    const ring = ringByYear.get(year) ?? yearRings[0];
    const usableSpan = Math.max(20, ring.outerRadius - ring.innerRadius - BAND_PADDING * 2);

    // Place radially inside [ring.innerRadius + pad, ring.outerRadius - pad] based on month/date in year
    const radius = ring.innerRadius + BAND_PADDING + yearProgressFromEnd * usableSpan;

    const normalizedDepth = Math.min(
      1,
      Math.max(0, (radius - baseInner) / Math.max(1, totalOuterSpan))
    );
    const recencyScore = 1 - normalizedDepth;

    // Golden-angle distribution around the ring for organic spacing
    const angle = index * GOLDEN_ANGLE_RAD - Math.PI / 5;
    const nodeSize = Math.round(21 + recencyScore * 9);

    return {
      project,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      radius,
      angle,
      recencyScore,
      nodeSize,
    };
  });

  // Angular-only collision relaxation (preserves exact year-ring radius!)
  const iterations = 32;
  for (let iter = 0; iter < iterations; iter++) {
    let moved = false;
    for (let i = 0; i < rawNodes.length; i++) {
      for (let j = i + 1; j < rawNodes.length; j++) {
        const a = rawNodes[i];
        const b = rawNodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);

        if (dist < minNodeSpacing) {
          moved = true;
          const overlap = (minNodeSpacing - dist) * 0.55;
          const angleDiff = Math.atan2(
            Math.sin(b.angle - a.angle),
            Math.cos(b.angle - a.angle)
          );
          const dir = angleDiff >= 0 ? 1 : -1;
          const dThetaA = (overlap / Math.max(120, a.radius)) * 0.5;
          const dThetaB = (overlap / Math.max(120, b.radius)) * 0.5;

          a.angle -= dir * dThetaA;
          b.angle += dir * dThetaB;

          a.x = Math.cos(a.angle) * a.radius;
          a.y = Math.sin(a.angle) * a.radius;
          b.x = Math.cos(b.angle) * b.radius;
          b.y = Math.sin(b.angle) * b.radius;
        }
      }
    }
    if (!moved) break;
  }

  return rawNodes;
}

/**
 * Generates primary dendrites connecting every project node to the center About Me
 * core, plus subtle secondary associative synapses between nearby projects sharing
 * a category or tech tag.
 */
export function computeSynapseEdges(nodes: PositionedProjectNode[]): SynapseEdge[] {
  const edges: SynapseEdge[] = [];

  // Primary edges: Center Core (0, 0) -> Every project node
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const midX = node.x * 0.5;
    const midY = node.y * 0.5;
    const perpX = -node.y / Math.max(1, node.radius);
    const perpY = node.x / Math.max(1, node.radius);
    const bend = (i % 2 === 0 ? 1 : -1) * Math.min(48, node.radius * 0.14);

    edges.push({
      id: `primary-${node.project.id}`,
      fromId: CORE_NODE_ID,
      toId: node.project.id,
      fromX: 0,
      fromY: 0,
      toX: node.x,
      toY: node.y,
      controlX: midX + perpX * bend,
      controlY: midY + perpY * bend,
      kind: 'primary',
      recencyWeight: node.recencyScore,
    });
  }

  // Secondary cross-synapses: connect nearby nodes sharing a category or tech tag
  const maxSecondaryPerNode = 2;
  const secondaryCount = new Map<string, number>();

  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    const tagsA = new Set([
      ...a.project.categories.map((c) => c.toLowerCase()),
      ...a.project.techStack.map((t) => t.toLowerCase()),
    ]);
    const candidates: Array<{ node: PositionedProjectNode; dist: number; tag: string }> = [];

    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j];
      const shared =
        b.project.categories.find((c) => tagsA.has(c.toLowerCase())) ??
        b.project.techStack.find((t) => tagsA.has(t.toLowerCase()));
      if (!shared) continue;
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      if (dist < 420) {
        candidates.push({ node: b, dist, tag: shared });
      }
    }

    candidates.sort((c1, c2) => c1.dist - c2.dist);

    for (const candidate of candidates) {
      const countA = secondaryCount.get(a.project.id) ?? 0;
      const countB = secondaryCount.get(candidate.node.project.id) ?? 0;
      if (countA >= maxSecondaryPerNode || countB >= maxSecondaryPerNode) continue;

      secondaryCount.set(a.project.id, countA + 1);
      secondaryCount.set(candidate.node.project.id, countB + 1);

      const midX = (a.x + candidate.node.x) * 0.5;
      const midY = (a.y + candidate.node.y) * 0.5;
      const dx = candidate.node.x - a.x;
      const dy = candidate.node.y - a.y;
      const len = Math.max(1, Math.hypot(dx, dy));
      const curve = 24;

      edges.push({
        id: `secondary-${a.project.id}-${candidate.node.project.id}`,
        fromId: a.project.id,
        toId: candidate.node.project.id,
        fromX: a.x,
        fromY: a.y,
        toX: candidate.node.x,
        toY: candidate.node.y,
        controlX: midX + (-dy / len) * curve,
        controlY: midY + (dx / len) * curve,
        kind: 'secondary',
        recencyWeight: (a.recencyScore + candidate.node.recencyScore) * 0.5,
        sharedTag: candidate.tag,
      });
    }
  }

  return edges;
}
