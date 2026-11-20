import {
  PROJECT_CATEGORIES,
  type ProjectCategory,
  type ProjectImage,
  type ProjectItem,
} from '../types/portfolio';

export interface CustomProjectJson {
  id?: string;
  title?: string;
  shortDescription: string;
  fullSummary?: string;
  highlights?: string[];
  date: string;
  displayDate?: string;
  categories?: string[];
  techStack?: string[];
  githubUrl?: string;
  liveUrl?: string;
  images?: ProjectImage[];
  isPrivate?: boolean;
  featured?: boolean;
  hidden?: boolean;
}

const projectJsonModules = import.meta.glob<CustomProjectJson>(
  './customProjects/*/project.json',
  { eager: true, import: 'default' }
);

const screenshotModules = import.meta.glob<string>(
  './customProjects/*/screenshots/*.{png,jpg,jpeg,webp,gif,avif,PNG,JPG,JPEG,WEBP,GIF,AVIF}',
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

function normalizeCategories(raw: string[] | undefined): ProjectCategory[] {
  if (!Array.isArray(raw)) return [];
  const result: ProjectCategory[] = [];
  for (const entry of raw) {
    const matched = validCategoryMap.get(String(entry).trim().toLowerCase());
    if (matched && !result.includes(matched)) {
      result.push(matched);
    }
  }
  return result;
}

/**
 * Loads all modular custom projects from `src/data/customProjects/<Project Name>/project.json`
 * and automatically attaches any images placed in that project's optional `screenshots/` folder.
 *
 * Non-folder files like `src/data/customProjects/usage.txt` are completely ignored.
 */
export function loadCustomProjects(): ProjectItem[] {
  // Group discovered local screenshots by project folder name
  const screenshotsByFolder = new Map<
    string,
    Array<{ filename: string; url: string }>
  >();

  for (const [modulePath, assetUrl] of Object.entries(screenshotModules)) {
    const match = modulePath.match(/^\.\/customProjects\/([^/]+)\/screenshots\/([^/]+)$/);
    if (!match) continue;
    const [, folderName, filename] = match;
    const list = screenshotsByFolder.get(folderName) ?? [];
    list.push({ filename, url: assetUrl });
    screenshotsByFolder.set(folderName, list);
  }

  // Sort screenshots naturally by filename (e.g., 01-home.png, 02-detail.png, 10-settings.png)
  for (const list of screenshotsByFolder.values()) {
    list.sort((a, b) =>
      a.filename.localeCompare(b.filename, undefined, {
        numeric: true,
        sensitivity: 'base',
      })
    );
  }

  const projects: ProjectItem[] = [];

  for (const [modulePath, raw] of Object.entries(projectJsonModules)) {
    const match = modulePath.match(/^\.\/customProjects\/([^/]+)\/project\.json$/);
    if (!match || !raw || raw.hidden) continue;

    const folderName = match[1];
    const title = raw.title?.trim() || folderName;
    const slug = slugifyFolderName(folderName) || 'project';
    const dateIso = raw.date || new Date().toISOString();

    const localImages: ProjectImage[] = (
      screenshotsByFolder.get(folderName) ?? []
    ).map(({ filename, url }) => {
      const caption = formatCaptionFromFilename(filename);
      return {
        src: url,
        alt: `${title} — ${caption}`,
        caption,
      };
    });

    const jsonImages: ProjectImage[] = Array.isArray(raw.images)
      ? raw.images.filter((img) => Boolean(img?.src))
      : [];

    projects.push({
      id: raw.id?.trim() || `custom-${slug}`,
      title,
      shortDescription: raw.shortDescription?.trim() || `${title} project.`,
      fullSummary:
        raw.fullSummary?.trim() ||
        raw.shortDescription?.trim() ||
        `${title} project.`,
      highlights: Array.isArray(raw.highlights) ? raw.highlights : [],
      date: dateIso,
      displayDate: raw.displayDate?.trim() || formatDisplayDate(dateIso),
      categories: normalizeCategories(raw.categories),
      techStack:
        Array.isArray(raw.techStack) && raw.techStack.length > 0
          ? raw.techStack
          : ['Software'],
      githubUrl: raw.githubUrl?.trim() || undefined,
      liveUrl: raw.liveUrl?.trim() || undefined,
      images: [...localImages, ...jsonImages],
      isPrivate: Boolean(raw.isPrivate),
      featured: Boolean(raw.featured),
      hidden: Boolean(raw.hidden),
      source: 'custom',
    });
  }

  return projects;
}
