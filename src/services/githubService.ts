import seededSnapshotRaw from '../data/seededProjects.json';
import {
  CUSTOM_PROJECTS,
  FALLBACK_PROFILE,
  GITHUB_USERNAME,
  HIDDEN_REPOS,
  LINKEDIN_URL,
  MODULAR_GITHUB_PROJECTS,
  PROJECT_OVERRIDES,
} from '../data/portfolioConfig';
import type {
  ProfileData,
  ProjectItem,
  ProjectOverride,
  SeededProjectItem,
  SeededSnapshot,
} from '../types/portfolio';

const CACHE_KEY = `neural_portfolio_gh_${GITHUB_USERNAME}_v1`;
const CACHE_TTL_MS = 15 * 60 * 1000;

interface GitHubUserResponse {
  name?: string | null;
  login: string;
  bio?: string | null;
  avatar_url?: string;
  html_url?: string;
  location?: string | null;
}

interface GitHubRepoResponse {
  name: string;
  description?: string | null;
  html_url: string;
  homepage?: string | null;
  language?: string | null;
  topics?: string[];
  pushed_at?: string;
  updated_at?: string;
  created_at?: string;
  stargazers_count?: number;
  fork?: boolean;
  archived?: boolean;
  private?: boolean;
}

export interface PortfolioDataResult {
  profile: ProfileData;
  projects: ProjectItem[];
  source: 'live' | 'seeded';
}

const seededSnapshot = seededSnapshotRaw as unknown as SeededSnapshot;

export function formatRepoTitle(name: string): string {
  return name
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatDisplayDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return 'Recent';
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
}

function findOverride(
  repoName: string | undefined,
  overrides: Record<string, ProjectOverride>
): ProjectOverride | undefined {
  if (!repoName) return undefined;
  if (overrides[repoName]) return overrides[repoName];
  const lower = repoName.toLowerCase();
  const matchedKey = Object.keys(overrides).find((k) => k.toLowerCase() === lower);
  return matchedKey ? overrides[matchedKey] : undefined;
}

function isRepoHidden(repoName: string | undefined, hiddenRepos: string[]): boolean {
  if (!repoName) return false;
  const lower = repoName.toLowerCase();
  return hiddenRepos.some((name) => name.toLowerCase() === lower);
}

function normalizeGitHubRepo(repo: GitHubRepoResponse): ProjectItem {
  const dateIso =
    repo.pushed_at || repo.updated_at || repo.created_at || new Date().toISOString();
  const techStack = Array.from(
    new Set(
      [repo.language, ...(Array.isArray(repo.topics) ? repo.topics : [])]
        .filter((value): value is string => Boolean(value && value.trim()))
        .map((tag) => tag.trim())
    )
  );
  const displayDate = formatDisplayDate(dateIso);
  const isPrivate = Boolean(repo.private);

  return {
    id: `gh-${repo.name.toLowerCase()}`,
    repoName: repo.name,
    title: formatRepoTitle(repo.name),
    shortDescription:
      repo.description?.trim() ||
      `${techStack[0] ? `${techStack[0]} ` : ''}project built by ${FALLBACK_PROFILE.name}.`,
    fullSummary:
      repo.description?.trim() ||
      `Repository "${repo.name}" developed with ${
        techStack.length > 0 ? techStack.join(', ') : 'modern software engineering practices'
      }. Add custom narrative details and screenshots anytime in src/data/portfolioConfig.ts.`,
    highlights: [
      techStack.length > 0
        ? `Core stack: ${techStack.join(' · ')}`
        : 'Custom software architecture',
      `Last updated: ${displayDate}`,
      isPrivate
        ? 'Private repository — showcased via metadata sync'
        : repo.stargazers_count
          ? `Open source on GitHub (${repo.stargazers_count} stars)`
          : 'Open source repository on GitHub',
    ],
    date: dateIso,
    displayDate,
    categories: [],
    techStack: techStack.length > 0 ? techStack : ['Software'],
    githubUrl: isPrivate ? undefined : repo.html_url,
    liveUrl: repo.homepage?.trim() || undefined,
    images: [],
    stars: repo.stargazers_count ?? 0,
    fork: Boolean(repo.fork),
    isPrivate,
    source: 'github',
  };
}

const defaultSeededProjects: SeededProjectItem[] =
  MODULAR_GITHUB_PROJECTS.length > 0
    ? MODULAR_GITHUB_PROJECTS
    : seededSnapshot.projects;

export function mergePortfolioProjects(params: {
  liveRepos?: GitHubRepoResponse[];
  seededProjects?: SeededProjectItem[];
  overrides?: Record<string, ProjectOverride>;
  customProjects?: ProjectItem[];
  hiddenRepos?: string[];
}): ProjectItem[] {
  const {
    liveRepos = [],
    seededProjects = defaultSeededProjects,
    overrides = PROJECT_OVERRIDES,
    customProjects = CUSTOM_PROJECTS,
    hiddenRepos = HIDDEN_REPOS,
  } = params;

  const byKey = new Map<string, ProjectItem>();

  // 1. Seed with build-time snapshot first (preserves any build-time private repo metadata)
  for (const seeded of seededProjects) {
    const key = (seeded.repoName || seeded.id).toLowerCase();
    byKey.set(key, {
      ...seeded,
      categories: seeded.categories ?? [],
    });
  }

  // 2. Overlay fresh live public GitHub repos
  for (const repo of liveRepos) {
    if (repo.archived) continue;
    const normalized = normalizeGitHubRepo(repo);
    const key = repo.name.toLowerCase();
    const existing = byKey.get(key);
    byKey.set(key, {
      ...existing,
      ...normalized,
      images: existing?.images?.length ? existing.images : normalized.images,
    });
  }

  // 3. Apply per-repo overrides and filter hidden/unfeatured forks
  const merged: ProjectItem[] = [];
  for (const item of byKey.values()) {
    const override = findOverride(item.repoName, overrides);
    if (override?.hidden) continue;
    if (isRepoHidden(item.repoName, hiddenRepos) && !override?.featured) continue;
    if (item.fork && !override?.featured) continue;

    const finalDate = override?.date || item.date;
    merged.push({
      ...item,
      ...override,
      date: finalDate,
      displayDate: override?.displayDate || formatDisplayDate(finalDate),
      categories: override?.categories ?? item.categories ?? [],
      techStack: override?.techStack ?? item.techStack,
      highlights: override?.highlights ?? item.highlights,
      images: override?.images ?? item.images,
      source: override ? 'hybrid' : item.source,
    });
  }

  // 4. Append standalone custom projects
  for (const custom of customProjects) {
    if (custom.hidden) continue;
    merged.push({
      ...custom,
      categories: custom.categories ?? [],
      displayDate: custom.displayDate || formatDisplayDate(custom.date),
      source: 'custom',
    });
  }

  // 5. Sort strictly newest -> oldest
  merged.sort((a, b) => {
    const timeA = Date.parse(a.date) || 0;
    const timeB = Date.parse(b.date) || 0;
    if (timeB !== timeA) return timeB - timeA;
    return a.title.localeCompare(b.title);
  });

  return merged;
}

export function getSeededPortfolioData(): PortfolioDataResult {
  const profile: ProfileData = {
    name: seededSnapshot.profile.name || FALLBACK_PROFILE.name,
    handle: seededSnapshot.profile.handle || FALLBACK_PROFILE.handle,
    bio: seededSnapshot.profile.bio?.trim() || FALLBACK_PROFILE.bio,
    githubUrl: seededSnapshot.profile.githubUrl || FALLBACK_PROFILE.githubUrl,
    linkedinUrl: LINKEDIN_URL,
    avatarUrl: seededSnapshot.profile.avatarUrl,
    location: seededSnapshot.profile.location,
  };

  const projects = mergePortfolioProjects({
    liveRepos: [],
    seededProjects: defaultSeededProjects,
  });

  return { profile, projects, source: 'seeded' };
}

function readSessionCache(): { user: GitHubUserResponse; repos: GitHubRepoResponse[] } | null {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      timestamp: number;
      user: GitHubUserResponse;
      repos: GitHubRepoResponse[];
    };
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) return null;
    return { user: parsed.user, repos: parsed.repos };
  } catch {
    return null;
  }
}

function writeSessionCache(user: GitHubUserResponse, repos: GitHubRepoResponse[]): void {
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ timestamp: Date.now(), user, repos })
    );
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

export async function fetchPortfolioData(
  fetchImpl: typeof fetch = fetch
): Promise<PortfolioDataResult> {
  const seeded = getSeededPortfolioData();

  try {
    const cached = readSessionCache();
    let user: GitHubUserResponse;
    let repos: GitHubRepoResponse[];

    if (cached) {
      user = cached.user;
      repos = cached.repos;
    } else {
      const [userRes, reposRes] = await Promise.all([
        fetchImpl(`https://api.github.com/users/${GITHUB_USERNAME}`, {
          headers: { Accept: 'application/vnd.github+json' },
        }),
        fetchImpl(
          `https://api.github.com/users/${GITHUB_USERNAME}/repos?type=owner&sort=pushed&per_page=50`,
          {
            headers: { Accept: 'application/vnd.github+json' },
          }
        ),
      ]);

      if (!userRes.ok || !reposRes.ok) {
        return seeded;
      }

      user = (await userRes.json()) as GitHubUserResponse;
      repos = (await reposRes.json()) as GitHubRepoResponse[];
      writeSessionCache(user, repos);
    }

    const profile: ProfileData = {
      name: user.name?.trim() || seeded.profile.name,
      handle: user.login || seeded.profile.handle,
      bio: user.bio?.trim() || seeded.profile.bio,
      githubUrl: user.html_url || seeded.profile.githubUrl,
      linkedinUrl: LINKEDIN_URL,
      avatarUrl: user.avatar_url || seeded.profile.avatarUrl,
      location: user.location || seeded.profile.location,
    };

    const projects = mergePortfolioProjects({
      liveRepos: repos,
      seededProjects: defaultSeededProjects,
    });

    return { profile, projects, source: 'live' };
  } catch {
    return seeded;
  }
}
