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

export interface ExperienceItem {
  role: string;
  organization: string;
  meta: string;
}

export const ABOUT_DETAILS: {
  city: string;
  storyParagraphs: string[];
  interestedFields: string[];
  experience: ExperienceItem[];
} = {
  city: 'Hamilton, ON',
  storyParagraphs: [
    'I have a deep interest in high-level impactful products and their digital bloodstream.',
    'From a young age, I have always been drawn to technology, how it works, and how so many different pieces come together to create a machine. Naturally, I started to gravitate towards the field of machine learning. The very idea of a machine coming to life, learning, and adapting is still so surreal to me, which ultimately fuels my desire to work with them for the rest of my life.',
    "My enjoyment of working with technology doesn't end there though. Whether it be machine learning or full-stack development, I am always more than happy to put my software engineering skills to good use on something meaningful — something purposeful!",
    "Aside from the wonders of the software world, I am a huge car person. I love working with them, driving them, looking at them — pretty much anything to do with them keeps me entertained. With the way things are evolving in today's day and age, I may soon be able to work with both my passions together: technology in cars, imagine that!",
  ],
  interestedFields: [
    'AI / Machine Learning',
    'Full-Stack Development',
    'Cybersecurity',
  ],
  experience: [
    {
      role: 'Software Engineering Intern',
      organization: 'York Region',
      meta: '1 Year',
    },
    {
      role: '4th Year Student',
      organization: 'McMaster University',
      meta: '3.7 GPA · Expected 2028 Graduation',
    },
  ],
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
