import {
  PROJECT_CATEGORIES,
  type ProfileData,
  type ProjectCategory,
  type ProjectItem,
  type ProjectOverride,
} from '../types/portfolio';

export { PROJECT_CATEGORIES };
export type { ProjectCategory };

export const GITHUB_USERNAME = 'sameerkhichi';
export const LINKEDIN_URL = 'https://www.linkedin.com/in/sameer-khichi';
export const CORE_INITIALS = 'SRK';

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
 * Per-repository configuration & category classification, keyed by GitHub repo name.
 *
 * Available categories (shown in the top filter bar):
 * 'Web App' | 'AI/ML' | 'Cybersecurity' | 'Software/Hardware' | 'Mobile Dev' |
 * 'Video Game Dev' | 'Systems & Tools' | 'Cloud & DevOps' | 'Data Science'
 *
 * You can also enrich any repository here with a longer `fullSummary`, `highlights`,
 * `images` (stored in `public/projects/...`), custom `techStack`, or a `liveUrl`.
 */
export const PROJECT_OVERRIDES: Record<string, ProjectOverride> = {
  'leetcode-library': {
    categories: ['Systems & Tools'],
  },
  BLEScraper: {
    categories: ['Mobile Dev', 'Software/Hardware', 'Cybersecurity'],
  },
  AntiCELDocs: {
    categories: ['Mobile Dev', 'Web App'],
  },
  Facial_Recognition_Model: {
    categories: ['AI/ML'],
  },
  McMaster_Shuttle_Tracker: {
    categories: ['Web App'],
  },
  'Maze-Runner': {
    categories: ['Video Game Dev', 'Systems & Tools'],
  },
  Traffic_Simulator: {
    categories: ['Systems & Tools', 'Data Science'],
  },
  AI_Checklist: {
    categories: ['AI/ML', 'Web App', 'Cloud & DevOps'],
  },
  PDF_Merger: {
    categories: ['Systems & Tools', 'Cybersecurity'],
  },
  keylogger: {
    categories: ['Cybersecurity', 'Systems & Tools'],
  },
  'TicTacToe-Command-Line': {
    categories: ['Video Game Dev'],
  },
  'AimTraining-Game': {
    categories: ['Video Game Dev'],
  },
};

/**
 * Standalone custom projects (e.g., private repositories or non-GitHub work)
 * that you want displayed as nodes in the neural network.
 * Remember to include `categories: [...]` so they appear under the top filter bar.
 */
export const CUSTOM_PROJECTS: ProjectItem[] = [];
