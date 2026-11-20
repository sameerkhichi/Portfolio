import {
  PROJECT_CATEGORIES,
  type ProfileData,
  type ProjectCategory,
  type ProjectItem,
  type ProjectOverride,
} from '../types/portfolio';
import { loadCustomProjects } from './customProjectsLoader';

export { PROJECT_CATEGORIES };
export type { ProjectCategory };

export const GITHUB_USERNAME = 'sameerkhichi';
export const LINKEDIN_URL = 'https://www.linkedin.com/in/sameer-khichi';
export const CORE_INITIALS = 'SRK';

/**
 * Repositories hidden from the Neural Project Library (case-insensitive).
 * Portfolio, profile README, and AntiCELDocs (replaced by the real AntiCEL app node)
 * are hidden by default.
 */
export const HIDDEN_REPOS: string[] = ['Portfolio', 'sameerkhichi', 'AntiCELDocs'];

export const FALLBACK_PROFILE: ProfileData = {
  name: 'Sameer Khichi',
  handle: GITHUB_USERNAME,
  bio: 'Software engineer & builder crafting intelligent systems, full-stack applications, and interactive digital experiences.',
  githubUrl: `https://github.com/${GITHUB_USERNAME}`,
  linkedinUrl: LINKEDIN_URL,
};

/**
 * Per-repository configuration & category classification for public GitHub repos,
 * keyed by GitHub repository name.
 *
 * Available categories (shown in the top filter bar):
 * 'Web App' | 'AI/ML' | 'Cybersecurity' | 'Software/Hardware' | 'Mobile Dev' |
 * 'Video Game Dev' | 'Systems & Tools' | 'Cloud & DevOps' | 'Data Science'
 */
export const PROJECT_OVERRIDES: Record<string, ProjectOverride> = {
  'leetcode-library': {
    categories: ['Systems & Tools'],
  },
  BLEScraper: {
    categories: ['Mobile Dev', 'Software/Hardware', 'Cybersecurity'],
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
 * Modular custom projects automatically loaded from `src/data/customProjects/<Project Name>/project.json`.
 * See `src/data/customProjects/usage.txt` for how to add new projects and screenshots.
 */
export const CUSTOM_PROJECTS: ProjectItem[] = loadCustomProjects();
