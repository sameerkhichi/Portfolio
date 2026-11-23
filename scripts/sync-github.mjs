/**
 * Build-time & local GitHub sync script.
 *
 * Fetches profile & repository metadata for `sameerkhichi` and:
 * 1. Updates `src/data/seededProjects.json` (profile bio & snapshot backup).
 * 2. Auto-scaffolds/updates `src/data/Projects/<RepoName>/github.json` for every
 *    visible repository.
 * 3. Creates a starter `src/data/Projects/<RepoName>/override.json` ONLY if it
 *    does NOT already exist — NEVER overwriting your manual edits or `screenshots/`.
 */

import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const USERNAME = process.env.GITHUB_USERNAME || 'sameerkhichi';
const TOKEN = process.env.GITHUB_TOKEN || '';
const HIDDEN_REPOS = new Set([
  'portfolio',
  'sameerkhichi',
  'anticeldocs',
  'leetcode-library',
]);

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_SNAPSHOT_PATH = resolve(__dirname, '../src/data/seededProjects.json');
const PROJECTS_DIR = resolve(__dirname, '../src/data/Projects');

const headers = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'sameerkhichi-portfolio-sync',
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
};

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function fetchJson(url) {
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status} ${res.statusText} for ${url}`);
  }
  return res.json();
}

function formatRepoTitle(name) {
  return name
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function formatDisplayDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Recent';
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

async function main() {
  console.log(
    `Syncing GitHub metadata for @${USERNAME} (${TOKEN ? 'authenticated: public + private metadata' : 'public only'})...`
  );

  const userUrl = TOKEN
    ? 'https://api.github.com/user'
    : `https://api.github.com/users/${USERNAME}`;
  const reposUrl = TOKEN
    ? 'https://api.github.com/user/repos?affiliation=owner&sort=pushed&per_page=100'
    : `https://api.github.com/users/${USERNAME}/repos?type=owner&sort=pushed&per_page=100`;

  const [user, repos] = await Promise.all([
    fetchJson(userUrl),
    fetchJson(reposUrl),
  ]);

  const cleanedRepos = repos
    .filter((repo) => !repo.archived)
    .map((repo) => {
      const dateIso = repo.pushed_at || repo.updated_at || repo.created_at;
      const techStack = Array.from(
        new Set(
          [repo.language, ...(Array.isArray(repo.topics) ? repo.topics : [])]
            .filter(Boolean)
            .map((t) => String(t))
        )
      );

      const isPrivate = Boolean(repo.private);
      return {
        id: `gh-${repo.name.toLowerCase()}`,
        repoName: repo.name,
        title: formatRepoTitle(repo.name),
        shortDescription:
          repo.description ||
          `${techStack[0] ? `${techStack[0]} ` : ''}software project engineered by ${user.name || 'Sameer Khichi'}.`,
        fullSummary:
          repo.description ||
          `Repository "${repo.name}" created on GitHub${techStack.length ? ` using ${techStack.join(', ')}` : ''}.`,
        highlights: [
          techStack.length
            ? `Primary technologies: ${techStack.join(', ')}`
            : 'Custom software implementation',
          `Last active: ${formatDisplayDate(dateIso)}`,
          isPrivate
            ? 'Private repository — metadata showcased in portfolio'
            : `Open-source repository on GitHub${repo.stargazers_count ? ` (${repo.stargazers_count} stars)` : ''}`,
        ],
        date: dateIso,
        displayDate: formatDisplayDate(dateIso),
        categories: [],
        techStack: techStack.length ? techStack : ['Software'],
        githubUrl: isPrivate ? undefined : repo.html_url,
        liveUrl: repo.homepage || undefined,
        images: [],
        stars: repo.stargazers_count || 0,
        fork: Boolean(repo.fork),
        isPrivate,
        source: 'github',
      };
    });

  // 1. Write snapshot backup & profile bio
  const snapshot = {
    syncedAt: new Date().toISOString(),
    profile: {
      name: user.name || 'Sameer Khichi',
      handle: user.login || USERNAME,
      bio: user.bio || '',
      avatarUrl: user.avatar_url || undefined,
      githubUrl: user.html_url || `https://github.com/${USERNAME}`,
      location: user.location || undefined,
    },
    projects: cleanedRepos,
  };
  await writeFile(OUT_SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');

  // 2. Scaffold / refresh modular project folders in `src/data/Projects/<RepoName>/`
  await mkdir(PROJECTS_DIR, { recursive: true });
  let scaffoldedCount = 0;
  let newOverridesCreated = 0;

  for (const repo of cleanedRepos) {
    if (HIDDEN_REPOS.has(repo.repoName.toLowerCase())) continue;

    const repoDir = resolve(PROJECTS_DIR, repo.repoName);
    const overridePath = resolve(repoDir, 'override.json');
    const githubJsonPath = resolve(repoDir, 'github.json');

    // Skip forks unless the user explicitly created an override featuring them
    if (repo.fork) {
      if (!(await fileExists(overridePath))) continue;
      try {
        const parsed = JSON.parse(await readFile(overridePath, 'utf8'));
        if (!parsed.featured) continue;
      } catch {
        continue;
      }
    }

    await mkdir(repoDir, { recursive: true });
    await writeFile(githubJsonPath, JSON.stringify(repo, null, 2) + '\n', 'utf8');
    scaffoldedCount++;

    // Create starter override.json ONLY if it doesn't already exist
    if (!(await fileExists(overridePath))) {
      const starterOverride = {
        categories: [],
      };
      await writeFile(
        overridePath,
        JSON.stringify(starterOverride, null, 2) + '\n',
        'utf8'
      );
      newOverridesCreated++;
    }
  }

  console.log(
    `Synced ${cleanedRepos.length} repos -> updated ${scaffoldedCount} project folders in src/data/Projects/ (${newOverridesCreated} new starter override.json created; existing overrides untouched).`
  );
}

main().catch((err) => {
  console.error('GitHub sync failed:', err.message);
  process.exit(1);
});
