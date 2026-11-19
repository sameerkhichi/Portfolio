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
  projects: ProjectItem[];
}
