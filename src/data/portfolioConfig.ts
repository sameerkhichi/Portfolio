import {
  PROJECT_CATEGORIES,
  type ProfileData,
  type ProjectCategory,
  type ProjectItem,
  type ProjectOverride,
} from '../types/portfolio';
import { loadModularProjects } from './projectsLoader';

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
export const HIDDEN_REPOS: string[] = [
  'Portfolio',
  'sameerkhichi',
  'AntiCELDocs',
  'leetcode-library',
];

export const FALLBACK_PROFILE: ProfileData = {
  name: 'Sameer Khichi',
  handle: GITHUB_USERNAME,
  bio: 'Software engineer & builder crafting intelligent systems, full-stack applications, and interactive digital experiences.',
  githubUrl: `https://github.com/${GITHUB_USERNAME}`,
  linkedinUrl: LINKEDIN_URL,
};

const modularProjects = loadModularProjects();

/**
 * Auto-synced GitHub project baselines loaded from `src/data/Projects/<RepoName>/github.json`.
 */
export const MODULAR_GITHUB_PROJECTS: ProjectItem[] =
  modularProjects.githubSeededProjects;

/**
 * Per-repo manual overrides & local screenshots loaded from
 * `src/data/Projects/<RepoName>/override.json` and `screenshots/`.
 */
export const PROJECT_OVERRIDES: Record<string, ProjectOverride> =
  modularProjects.overridesByRepo;

/**
 * Standalone custom/private projects loaded from
 * `src/data/Projects/<Project Name>/project.json` and `screenshots/`.
 */
export const CUSTOM_PROJECTS: ProjectItem[] = modularProjects.customProjects;
