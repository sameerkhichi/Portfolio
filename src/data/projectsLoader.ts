import {
  PROJECT_CATEGORIES,
  type ProjectCategory,
  type ProjectImage,
  type ProjectItem,
  type ProjectOverride,
} from '../types/portfolio';

export interface ProjectFolderJson {
  id?: string;
  repoName?: string;
  title?: string;
  shortDescription?: string;
  fullSummary?: string;
  highlights?: string[];
  date?: string;
  displayDate?: string;
  categories?: string[];
  techStack?: string[];
  githubUrl?: string;
  liveUrl?: string;
  images?: ProjectImage[];
  stars?: number;
  fork?: boolean;
  isPrivate?: boolean;
  featured?: boolean;
  hidden?: boolean;
  source?: 'github' | 'custom' | 'hybrid';
}

export interface ModularProjectsBundle {
  githubSeededProjects: ProjectItem[];
  customProjects: ProjectItem[];
  overridesByRepo: Record<string, ProjectOverride>;
  localScreenshotsByFolder: Record<string, ProjectImage[]>;
}

const projectJsonModules = import.meta.glob<ProjectFolderJson>(
  './Projects/*/project.json',
  { eager: true, import: 'default' }
);

const githubJsonModules = import.meta.glob<ProjectFolderJson>(
  './Projects/*/github.json',
  { eager: true, import: 'default' }
);

const overrideJsonModules = import.meta.glob<ProjectFolderJson>(
  './Projects/*/override.json',
  { eager: true, import: 'default' }
);

const screenshotModules = import.meta.glob<string>(
  './Projects/*/screenshots/*.{png,jpg,jpeg,webp,gif,avif,PNG,JPG,JPEG,WEBP,GIF,AVIF}',
  { eager: true, import: 'default' }
);

const validCategoryMap = new Map<string, ProjectCategory>(
  PROJECT_CATEGORIES.map((cat) => [cat.toLowerCase(), cat])
);

export function slugifyFolderName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function formatCaptionFromFilename(filename: string): string {
  const withoutExt = filename.replace(/\.[^.]+$/, '');
  const withoutLeadingIndex = withoutExt.replace(/^\d+[\s._-]*/, '');
  const cleaned = (withoutLeadingIndex || withoutExt)
    .replace(/[-_]+/g, ' ')
    .trim();
  return cleaned.replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function formatDisplayDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return 'Recent';
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
}

function normalizeCategories(raw: string[] | undefined): ProjectCategory[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const result: ProjectCategory[] = [];
  for (const entry of raw) {
    const matched = validCategoryMap.get(String(entry).trim().toLowerCase());
    if (matched && !result.includes(matched)) {
      result.push(matched);
    }
  }
  return result;
}

function toProjectOverride(
  raw: ProjectFolderJson | undefined,
  localImages: ProjectImage[]
): ProjectOverride | undefined {
  if (!raw && localImages.length === 0) return undefined;

  const override: ProjectOverride = {};
  if (raw) {
    if (raw.title?.trim()) override.title = raw.title.trim();
    if (raw.shortDescription?.trim())
      override.shortDescription = raw.shortDescription.trim();
    if (raw.fullSummary?.trim()) override.fullSummary = raw.fullSummary.trim();
    if (Array.isArray(raw.highlights)) override.highlights = raw.highlights;
    if (raw.date?.trim()) override.date = raw.date.trim();
    if (raw.displayDate?.trim()) override.displayDate = raw.displayDate.trim();
    const cats = normalizeCategories(raw.categories);
    if (cats !== undefined) override.categories = cats;
    if (Array.isArray(raw.techStack) && raw.techStack.length > 0) {
      override.techStack = raw.techStack;
    }
    if (raw.githubUrl?.trim()) override.githubUrl = raw.githubUrl.trim();
    if (raw.liveUrl?.trim()) override.liveUrl = raw.liveUrl.trim();
    if (typeof raw.isPrivate === 'boolean') override.isPrivate = raw.isPrivate;
    if (typeof raw.featured === 'boolean') override.featured = raw.featured;
    if (typeof raw.hidden === 'boolean') override.hidden = raw.hidden;
  }

  const jsonImages: ProjectImage[] = Array.isArray(raw?.images)
    ? raw.images.filter((img) => Boolean(img?.src))
    : [];

  if (localImages.length > 0 || jsonImages.length > 0) {
    override.images = [...localImages, ...jsonImages];
  }

  return Object.keys(override).length > 0 ? override : undefined;
}

/**
 * Loads all modular projects from `src/data/Projects/<Project Name>/`.
 *
 * - Custom projects: folder contains `project.json` (and optional `screenshots/`).
 * - Auto-synced GitHub repos: folder contains `github.json` (auto-updated by sync),
 *   optional `override.json` (never overwritten), and optional `screenshots/`.
 * - Non-folder files like `src/data/Projects/usage.txt` are completely ignored.
 */
export function loadModularProjects(): ModularProjectsBundle {
  // 1. Collect all local screenshots grouped by project folder name
  const rawScreenshots = new Map<
    string,
    Array<{ filename: string; url: string }>
  >();

  for (const [modulePath, assetUrl] of Object.entries(screenshotModules)) {
    const match = modulePath.match(/^\.\/Projects\/([^/]+)\/screenshots\/([^/]+)$/);
    if (!match) continue;
    const [, folderName, filename] = match;
    const list = rawScreenshots.get(folderName) ?? [];
    list.push({ filename, url: assetUrl });
    rawScreenshots.set(folderName, list);
  }

  const localScreenshotsByFolder: Record<string, ProjectImage[]> = {};
  for (const [folderName, list] of rawScreenshots.entries()) {
    list.sort((a, b) =>
      a.filename.localeCompare(b.filename, undefined, {
        numeric: true,
        sensitivity: 'base',
      })
    );
    localScreenshotsByFolder[folderName] = list.map(({ filename, url }) => {
      const caption = formatCaptionFromFilename(filename);
      return {
        src: url,
        alt: `${folderName} — ${caption}`,
        caption,
      };
    });
  }

  // 2. Index project.json, github.json, and override.json by folder name
  const projectByFolder = new Map<string, ProjectFolderJson>();
  const githubByFolder = new Map<string, ProjectFolderJson>();
  const overrideByFolder = new Map<string, ProjectFolderJson>();
  const allFolders = new Set<string>(Object.keys(localScreenshotsByFolder));

  for (const [modulePath, raw] of Object.entries(projectJsonModules)) {
    const match = modulePath.match(/^\.\/Projects\/([^/]+)\/project\.json$/);
    if (!match || !raw) continue;
    projectByFolder.set(match[1], raw);
    allFolders.add(match[1]);
  }

  for (const [modulePath, raw] of Object.entries(githubJsonModules)) {
    const match = modulePath.match(/^\.\/Projects\/([^/]+)\/github\.json$/);
    if (!match || !raw) continue;
    githubByFolder.set(match[1], raw);
    allFolders.add(match[1]);
  }

  for (const [modulePath, raw] of Object.entries(overrideJsonModules)) {
    const match = modulePath.match(/^\.\/Projects\/([^/]+)\/override\.json$/);
    if (!match || !raw) continue;
    overrideByFolder.set(match[1], raw);
    allFolders.add(match[1]);
  }

  const githubSeededProjects: ProjectItem[] = [];
  const customProjects: ProjectItem[] = [];
  const overridesByRepo: Record<string, ProjectOverride> = {};

  // 3. Build unified project records & per-repo overrides
  for (const folderName of allFolders) {
    const githubRaw = githubByFolder.get(folderName);
    const projectRaw = projectByFolder.get(folderName);
    const overrideRaw = overrideByFolder.get(folderName);
    const localImages = localScreenshotsByFolder[folderName] ?? [];

    // Case A: GitHub-synced repo folder (has github.json OR override.json without project.json)
    if (githubRaw || (overrideRaw && !projectRaw)) {
      const repoKey = githubRaw?.repoName?.trim() || folderName;

      if (githubRaw) {
        const dateIso = githubRaw.date || new Date().toISOString();
        const title = githubRaw.title?.trim() || folderName;
        githubSeededProjects.push({
          id: githubRaw.id?.trim() || `gh-${repoKey.toLowerCase()}`,
          repoName: repoKey,
          title,
          shortDescription:
            githubRaw.shortDescription?.trim() || `${title} project.`,
          fullSummary:
            githubRaw.fullSummary?.trim() ||
            githubRaw.shortDescription?.trim() ||
            `${title} project.`,
          highlights: Array.isArray(githubRaw.highlights)
            ? githubRaw.highlights
            : [],
          date: dateIso,
          displayDate:
            githubRaw.displayDate?.trim() || formatDisplayDate(dateIso),
          categories: normalizeCategories(githubRaw.categories) ?? [],
          techStack:
            Array.isArray(githubRaw.techStack) && githubRaw.techStack.length > 0
              ? githubRaw.techStack
              : ['Software'],
          githubUrl: githubRaw.githubUrl?.trim() || undefined,
          liveUrl: githubRaw.liveUrl?.trim() || undefined,
          images: Array.isArray(githubRaw.images) ? githubRaw.images : [],
          stars: githubRaw.stars ?? 0,
          fork: Boolean(githubRaw.fork),
          isPrivate: Boolean(githubRaw.isPrivate),
          featured: Boolean(githubRaw.featured),
          hidden: Boolean(githubRaw.hidden),
          source: 'github',
        });
      }

      const override = toProjectOverride(overrideRaw, localImages);
      if (override) {
        overridesByRepo[repoKey] = override;
      }
      continue;
    }

    // Case B: Standalone custom project folder (has project.json)
    if (projectRaw) {
      if (projectRaw.hidden || overrideRaw?.hidden) continue;

      const mergedRaw: ProjectFolderJson = {
        ...projectRaw,
        ...overrideRaw,
      };
      const title = mergedRaw.title?.trim() || folderName;
      const slug = slugifyFolderName(folderName) || 'project';
      const dateIso = mergedRaw.date || new Date().toISOString();
      const jsonImages: ProjectImage[] = Array.isArray(mergedRaw.images)
        ? mergedRaw.images.filter((img) => Boolean(img?.src))
        : [];

      customProjects.push({
        id: mergedRaw.id?.trim() || `custom-${slug}`,
        title,
        shortDescription:
          mergedRaw.shortDescription?.trim() || `${title} project.`,
        fullSummary:
          mergedRaw.fullSummary?.trim() ||
          mergedRaw.shortDescription?.trim() ||
          `${title} project.`,
        highlights: Array.isArray(mergedRaw.highlights)
          ? mergedRaw.highlights
          : [],
        date: dateIso,
        displayDate:
          mergedRaw.displayDate?.trim() || formatDisplayDate(dateIso),
        categories: normalizeCategories(mergedRaw.categories) ?? [],
        techStack:
          Array.isArray(mergedRaw.techStack) && mergedRaw.techStack.length > 0
            ? mergedRaw.techStack
            : ['Software'],
        githubUrl: mergedRaw.githubUrl?.trim() || undefined,
        liveUrl: mergedRaw.liveUrl?.trim() || undefined,
        images: [...localImages, ...jsonImages],
        isPrivate: Boolean(mergedRaw.isPrivate),
        featured: Boolean(mergedRaw.featured),
        hidden: Boolean(mergedRaw.hidden),
        source: 'custom',
      });
    }
  }

  return {
    githubSeededProjects,
    customProjects,
    overridesByRepo,
    localScreenshotsByFolder,
  };
}
