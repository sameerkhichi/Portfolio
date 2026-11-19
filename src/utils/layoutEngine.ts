import type {
  PositionedProjectNode,
  ProjectItem,
  SynapseEdge,
} from '../types/portfolio';

export const CORE_NODE_ID = 'about-me-core';
export const MIN_ORBIT_RADIUS = 195;
export const MAX_ORBIT_RADIUS = 560;
const GOLDEN_ANGLE_RAD = Math.PI * (3 - Math.sqrt(5)); // ~137.508 deg

/**
 * Deterministic radial neural network layout engine.
 *
 * Guarantees:
 * 1. More recent projects ALWAYS sit closer to the center (0, 0) than older projects.
 * 2. Nodes are evenly distributed around the center via a golden-angle spiral.
 * 3. Angular-only collision relaxation eliminates visual overlap without breaking
 *    the recency-to-radius invariant.
 */
export function computeNeuralLayout(
  projects: ProjectItem[],
  options?: {
    minRadius?: number;
    maxRadius?: number;
    minNodeSpacing?: number;
  }
): PositionedProjectNode[] {
  if (projects.length === 0) return [];

  const minRadius = options?.minRadius ?? MIN_ORBIT_RADIUS;
  const adaptiveMax = Math.max(
    options?.maxRadius ?? MAX_ORBIT_RADIUS,
    minRadius + projects.length * 30
  );
  const minNodeSpacing = options?.minNodeSpacing ?? 128;

  // Sort strictly newest -> oldest
  const sorted = [...projects].sort((a, b) => {
    const tA = Date.parse(a.date) || 0;
    const tB = Date.parse(b.date) || 0;
    if (tB !== tA) return tB - tA;
    return a.title.localeCompare(b.title);
  });

  const timestamps = sorted.map((p) => Date.parse(p.date) || 0);
  const newestTs = Math.max(...timestamps);
  const oldestTs = Math.min(...timestamps);
  const timeSpan = Math.max(1, newestTs - oldestTs);

  const count = sorted.length;
  const rawNodes: PositionedProjectNode[] = sorted.map((project, index) => {
    const ts = timestamps[index];
    const rankProgress = count === 1 ? 0 : index / (count - 1); // 0 = newest, 1 = oldest
    const timeProgress =
      newestTs === oldestTs ? rankProgress : (newestTs - ts) / timeSpan;

    // Blend rank (55%) + real chronological time gap (45%) so closely-dated projects
    // stay nicely spaced while genuinely older projects sit distinctly further out.
    const blendedDepth = Math.min(1, Math.max(0, rankProgress * 0.55 + timeProgress * 0.45));
    const recencyScore = 1 - blendedDepth;
    const radius = minRadius + blendedDepth * (adaptiveMax - minRadius);

    // Offset initial angle slightly so innermost node sits aesthetically at upper-right
    const angle = index * GOLDEN_ANGLE_RAD - Math.PI / 5;
    const nodeSize = Math.round(21 + recencyScore * 10);

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

  // Enforce monotonic non-decreasing radius strictly across sorted order
  for (let i = 1; i < rawNodes.length; i++) {
    if (rawNodes[i].radius < rawNodes[i - 1].radius) {
      rawNodes[i].radius = rawNodes[i - 1].radius;
    }
  }

  // Angular-only collision relaxation (preserves exact radius!)
  const iterations = 28;
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
          // Push both nodes tangentially along their respective orbits
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
 * a technology tag.
 */
export function computeSynapseEdges(nodes: PositionedProjectNode[]): SynapseEdge[] {
  const edges: SynapseEdge[] = [];

  // Primary edges: Center Core (0, 0) -> Every project node
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const midX = node.x * 0.5;
    const midY = node.y * 0.5;
    // Gentle organic curve perpendicular to the vector
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
