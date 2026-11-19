import { describe, expect, it } from 'vitest';
import {
  fetchPortfolioData,
  mergePortfolioProjects,
} from './githubService';
import type { ProjectItem } from '../types/portfolio';

describe('mergePortfolioProjects', () => {
  it('hides the Portfolio repository by default', () => {
    const merged = mergePortfolioProjects({
      liveRepos: [
        {
          name: 'Portfolio',
          html_url: 'https://github.com/sameerkhichi/Portfolio',
          pushed_at: '2026-11-18T00:00:00Z',
          language: 'TypeScript',
        },
        {
          name: 'Neural-Vision',
          html_url: 'https://github.com/sameerkhichi/Neural-Vision',
          pushed_at: '2026-10-10T00:00:00Z',
          language: 'Python',
        },
      ],
      seededProjects: [],
      overrides: {},
      customProjects: [],
    });

    expect(merged.map((p) => p.repoName)).toEqual(['Neural-Vision']);
  });

  it('merges live GitHub data with overrides, preserves seeded private repos, and appends custom projects', () => {
    const seededPrivate: ProjectItem = {
      id: 'gh-secret-engine',
      repoName: 'secret-engine',
      title: 'Secret Engine',
      shortDescription: 'Private ML inference engine.',
      fullSummary: 'Private engine summary.',
      highlights: ['Fast inference'],
      date: '2026-08-01T00:00:00Z',
      displayDate: 'Aug 2026',
      categories: ['AI/ML'],
      techStack: ['Rust'],
      images: [],
      isPrivate: true,
      source: 'github',
    };

    const customProject: ProjectItem = {
      id: 'custom-robotics',
      title: 'Autonomous Drone',
      shortDescription: 'Flight control system.',
      fullSummary: 'Built custom flight controller.',
      highlights: ['PID stabilization'],
      date: '2025-02-01T00:00:00Z',
      displayDate: 'Feb 2025',
      categories: ['Software/Hardware'],
      techStack: ['C++'],
      images: [],
      source: 'custom',
    };

    const merged = mergePortfolioProjects({
      liveRepos: [
        {
          name: 'neural-api',
          description: 'Original GitHub description',
          html_url: 'https://github.com/sameerkhichi/neural-api',
          pushed_at: '2026-11-05T00:00:00Z',
          language: 'TypeScript',
          topics: ['react', 'vite'],
        },
      ],
      seededProjects: [seededPrivate],
      overrides: {
        'neural-api': {
          title: 'Neural API Studio',
          categories: ['Web App', 'AI/ML'],
          liveUrl: 'https://demo.example.com',
          images: [{ src: 'projects/api.png', alt: 'Screenshot' }],
        },
      },
      customProjects: [customProject],
    });

    expect(merged).toHaveLength(3);
    expect(merged[0].title).toBe('Neural API Studio');
    expect(merged[0].categories).toEqual(['Web App', 'AI/ML']);
    expect(merged[0].liveUrl).toBe('https://demo.example.com');
    expect(merged[0].images).toHaveLength(1);
    expect(merged[0].source).toBe('hybrid');

    expect(merged[1].repoName).toBe('secret-engine');
    expect(merged[1].isPrivate).toBe(true);

    expect(merged[2].id).toBe('custom-robotics');
  });

  it('falls back gracefully to seeded profile & projects when fetch fails', async () => {
    const failingFetch = (async () => {
      throw new Error('Network unreachable');
    }) as unknown as typeof fetch;

    const result = await fetchPortfolioData(failingFetch);
    expect(result.source).toBe('seeded');
    expect(result.profile.name).toBeTruthy();
    expect(result.profile.linkedinUrl).toBe(
      'https://www.linkedin.com/in/sameer-khichi'
    );
  });
});
