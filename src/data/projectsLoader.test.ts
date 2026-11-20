import { describe, expect, it } from 'vitest';
import {
  formatCaptionFromFilename,
  loadModularProjects,
  slugifyFolderName,
} from './projectsLoader';

describe('projectsLoader', () => {
  it('loads custom projects (AntiCEL), synced GitHub repos, and per-folder overrides while ignoring usage.txt', () => {
    const bundle = loadModularProjects();

    const anticel = bundle.customProjects.find((p) => p.title === 'AntiCEL');
    expect(anticel).toBeDefined();
    expect(anticel?.id).toBe('custom-anticel');
    expect(anticel?.isPrivate).toBe(true);
    expect(anticel?.categories).toEqual([
      'Mobile Dev',
      'Software/Hardware',
      'Systems & Tools',
    ]);
    expect(anticel?.images.length).toBeGreaterThan(0);

    // GitHub repos should be scaffolded with both github.json and override.json
    const bleRepo = bundle.githubSeededProjects.find(
      (p) => p.repoName === 'BLEScraper'
    );
    expect(bleRepo).toBeDefined();
    expect(bundle.overridesByRepo['BLEScraper']?.categories).toEqual([
      'Mobile Dev',
      'Software/Hardware',
      'Cybersecurity',
    ]);

    // Confirm usage.txt never creates a node
    const allTitles = [
      ...bundle.customProjects,
      ...bundle.githubSeededProjects,
    ].map((p) => p.title.toLowerCase());
    expect(allTitles.some((t) => t.includes('usage'))).toBe(false);
  });

  it('formats screenshot filenames into clean human-readable captions', () => {
    expect(formatCaptionFromFilename('01-garage-view.png')).toBe('Garage View');
    expect(formatCaptionFromFilename('02_3d_drivetrain.webp')).toBe(
      '3d Drivetrain'
    );
    expect(formatCaptionFromFilename('dashboard.jpg')).toBe('Dashboard');
    expect(slugifyFolderName('My Cool App 2.0')).toBe('my-cool-app-2-0');
  });
});
