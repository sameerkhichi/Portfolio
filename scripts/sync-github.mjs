/**
 * Optional build-time & local GitHub sync script.
 *
 * Fetches profile & repository metadata for `sameerkhichi` and writes
 * a public-safe snapshot to `src/data/seededProjects.json`.
 *
 * - Without GITHUB_TOKEN: fetches public profile & public repositories.
 * - With GITHUB_TOKEN (or GitHub Actions secret PORTFOLIO_GH_TOKEN):
 *   fetches both public AND private repository metadata (name, description,
 *   dates, languages, topics — never private source code) and flags private
 *   repos with `isPrivate: true`.
 */

import { writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const USERNAME = process.env.GITHUB_USERNAME || 'sameerkhichi';
const TOKEN = process.env.GITHUB_TOKEN || '';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, '../src/data/seededProjects.json');

const headers = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'sameerkhichi-portfolio-sync',
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
};

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

  await writeFile(OUT_PATH, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
  console.log(
    `Wrote ${cleanedRepos.length} repositories and profile bio to ${OUT_PATH}`
  );
}

main().catch((err) => {
  console.error('GitHub sync failed:', err.message);
  process.exit(1);
});
