import type { ProfileData, ProjectItem, ProjectOverride } from '../types/portfolio';

export const GITHUB_USERNAME = 'sameerkhichi';
export const LINKEDIN_URL = 'https://www.linkedin.com/in/sameer-khichi';

/**
 * Repositories hidden from the Neural Project Library (case-insensitive).
 * The Portfolio repository itself is hidden by default.
 */
export const HIDDEN_REPOS: string[] = ['Portfolio', 'sameerkhichi'];

export const FALLBACK_PROFILE: ProfileData = {
  name: 'Sameer Khichi',
  handle: GITHUB_USERNAME,
  bio: 'Software engineer & builder crafting intelligent systems, full-stack applications, and interactive digital experiences.',
  githubUrl: `https://github.com/${GITHUB_USERNAME}`,
  linkedinUrl: LINKEDIN_URL,
};

/**
 * Per-repository overrides keyed by GitHub repository name (exact or lowercase).
 * Use this to enrich any GitHub project with a longer catalog summary, highlights,
 * screenshots (placed in `public/projects/...`), custom tech tags, or a live URL.
 *
 * Example:
 * 'my-project-repo': {
 *   title: 'My Project',
 *   shortDescription: 'One-line overview shown on 1st click.',
 *   fullSummary: 'In-depth architecture and story shown on 2nd click.',
 *   highlights: ['Built real-time pipeline', 'Reduced latency by 40%'],
 *   images: [{ src: 'projects/my-project-1.png', alt: 'Dashboard screenshot' }],
 *   liveUrl: 'https://example.com',
 * }
 */
export const PROJECT_OVERRIDES: Record<string, ProjectOverride> = {};

/**
 * Standalone custom projects (e.g., private repositories or non-GitHub work)
 * that you want displayed as nodes in the neural network.
 */
export const CUSTOM_PROJECTS: ProjectItem[] = [];
