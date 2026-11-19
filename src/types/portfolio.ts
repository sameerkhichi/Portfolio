export const PROJECT_CATEGORIES = [
  'Web App',
  'AI/ML',
  'Cybersecurity',
  'Software/Hardware',
  'Mobile Dev',
  'Video Game Dev',
  'Systems & Tools',
  'Cloud & DevOps',
  'Data Science',
] as const;

export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];

export type ViewMode =
  | 'ABOUT_FULLSCREEN'
  | 'NETWORK'
  | 'NODE_PREVIEW'
  | 'PROJECT_FULLSCREEN';

export interface ProfileData {
  name: string;
  handle: string;
  bio: string;
  githubUrl: string;
  linkedinUrl: string;
  avatarUrl?: string;
  location?: string;
}

export interface ProjectImage {
  src: string;
  alt: string;
  caption?: string;
}

export interface ProjectItem {
  id: string;
  repoName?: string;
  title: string;
  shortDescription: string;
  fullSummary: string;
  highlights: string[];
  date: string;
  displayDate: string;
  categories: ProjectCategory[];
  techStack: string[];
  githubUrl?: string;
  liveUrl?: string;
  images: ProjectImage[];
  stars?: number;
  fork?: boolean;
  isPrivate?: boolean;
  featured?: boolean;
  hidden?: boolean;
  source: 'github' | 'custom' | 'hybrid';
}

export type ProjectOverride = Partial<
  Omit<ProjectItem, 'id' | 'source'>
> & {
  hidden?: boolean;
};

export interface YearRing {
  year: number;
  innerRadius: number;
  outerRadius: number;
}

export interface PositionedProjectNode {
  project: ProjectItem;
  x: number;
  y: number;
  radius: number;
  angle: number;
  recencyScore: number;
  nodeSize: number;
}

export interface SynapseEdge {
  id: string;
  fromId: string;
  toId: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  controlX: number;
  controlY: number;
  kind: 'primary' | 'secondary';
  recencyWeight: number;
  sharedTag?: string;
}

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
}

export type SeededProjectItem = Omit<ProjectItem, 'categories'> & {
  categories?: ProjectCategory[];
};

export interface SeededSnapshot {
  syncedAt: string;
  profile: {
    name: string;
    handle: string;
    bio: string;
    avatarUrl?: string;
    githubUrl: string;
    location?: string;
  };
  projects: SeededProjectItem[];
}
