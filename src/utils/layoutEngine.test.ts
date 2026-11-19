import { describe, expect, it } from 'vitest';
import type { ProjectItem } from '../types/portfolio';
import {
  CORE_NODE_ID,
  computeNeuralLayout,
  computeSynapseEdges,
  computeYearRings,
} from './layoutEngine';

function makeProject(id: string, date: string, techStack = ['TypeScript']): ProjectItem {
  return {
    id,
    title: `Project ${id}`,
    shortDescription: 'Short summary',
    fullSummary: 'Full summary',
    highlights: ['Highlight 1'],
    date,
    displayDate: date.slice(0, 7),
    categories: ['Web App'],
    techStack,
    images: [],
    source: 'custom',
  };
}

describe('computeNeuralLayout', () => {
  it('returns empty array for no projects', () => {
    expect(computeNeuralLayout([])).toEqual([]);
  });

  it('places more recent projects strictly closer to the center than older projects', () => {
    const projects = [
      makeProject('old', '2022-01-15T00:00:00Z'),
      makeProject('newest', '2026-11-01T00:00:00Z'),
      makeProject('mid', '2024-06-20T00:00:00Z'),
      makeProject('recent', '2026-04-10T00:00:00Z'),
    ];

    const layout = computeNeuralLayout(projects);
    expect(layout.map((n) => n.project.id)).toEqual([
      'newest',
      'recent',
      'mid',
      'old',
    ]);

    for (let i = 1; i < layout.length; i++) {
      expect(layout[i].radius).toBeGreaterThanOrEqual(layout[i - 1].radius);
      // Verify actual Euclidean distance matches radius
      expect(Math.hypot(layout[i].x, layout[i].y)).toBeCloseTo(
        layout[i].radius,
        4
      );
    }

    expect(layout[0].radius).toBeLessThan(layout[layout.length - 1].radius);
  });

  it('handles identical timestamps without overlapping nodes', () => {
    const sameDate = '2026-05-01T00:00:00Z';
    const projects = Array.from({ length: 8 }, (_, idx) =>
      makeProject(`same-${idx}`, sameDate)
    );

    const layout = computeNeuralLayout(projects, { minNodeSpacing: 100 });
    expect(layout).toHaveLength(8);

    for (let i = 0; i < layout.length; i++) {
      for (let j = i + 1; j < layout.length; j++) {
        const dist = Math.hypot(
          layout[j].x - layout[i].x,
          layout[j].y - layout[i].y
        );
        expect(dist).toBeGreaterThan(80);
      }
    }
  });

  it('scales cleanly for 24+ projects without breaking monotonic recency order', () => {
    const projects = Array.from({ length: 24 }, (_, idx) => {
      const year = 2021 + Math.floor(idx / 4);
      const month = String((idx % 12) + 1).padStart(2, '0');
      return makeProject(`p-${idx}`, `${year}-${month}-10T00:00:00Z`);
    });

    const layout = computeNeuralLayout(projects);
    expect(layout).toHaveLength(24);
    for (let i = 1; i < layout.length; i++) {
      expect(layout[i].radius).toBeGreaterThanOrEqual(layout[i - 1].radius);
    }
  });
  it('creates one concentric ring per calendar year and encapsulates every project inside its year band by month', () => {
    const projects = [
      makeProject('dec-2026', '2026-12-15T00:00:00Z'),
      makeProject('feb-2026', '2026-02-10T00:00:00Z'),
      makeProject('jul-2025', '2025-07-01T00:00:00Z'),
      makeProject('nov-2024', '2024-11-20T00:00:00Z'),
    ];

    const rings = computeYearRings(projects);
    expect(rings.map((r) => r.year)).toEqual([2026, 2025, 2024]);

    const layout = computeNeuralLayout(projects);
    const ringMap = new Map(rings.map((r) => [r.year, r]));

    for (const node of layout) {
      const year = new Date(node.project.date).getUTCFullYear();
      const ring = ringMap.get(year)!;
      expect(node.radius).toBeGreaterThan(ring.innerRadius);
      expect(node.radius).toBeLessThan(ring.outerRadius);
    }

    const dec2026 = layout.find((n) => n.project.id === 'dec-2026')!;
    const feb2026 = layout.find((n) => n.project.id === 'feb-2026')!;
    expect(dec2026.radius).toBeLessThan(feb2026.radius);
  });
});

describe('computeSynapseEdges', () => {
  it('connects every project node to the central About Me core node', () => {
    const projects = [
      makeProject('a', '2026-10-01T00:00:00Z', ['React', 'TypeScript']),
      makeProject('b', '2025-05-01T00:00:00Z', ['React', 'Node.js']),
      makeProject('c', '2024-01-01T00:00:00Z', ['Python']),
    ];

    const layout = computeNeuralLayout(projects);
    const edges = computeSynapseEdges(layout);

    const primaryEdges = edges.filter((e) => e.kind === 'primary');
    expect(primaryEdges).toHaveLength(3);
    for (const edge of primaryEdges) {
      expect(edge.fromId).toBe(CORE_NODE_ID);
      expect(edge.fromX).toBe(0);
      expect(edge.fromY).toBe(0);
    }
  });
});
