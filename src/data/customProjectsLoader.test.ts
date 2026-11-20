import { describe, expect, it } from 'vitest';
import {
  formatCaptionFromFilename,
  loadCustomProjects,
  slugifyFolderName,
} from './customProjectsLoader';

describe('customProjectsLoader', () => {
  it('loads AntiCEL from src/data/customProjects/AntiCEL/project.json and ignores usage.txt', () => {
    const projects = loadCustomProjects();
    const anticel = projects.find((p) => p.title === 'AntiCEL');

    expect(anticel).toBeDefined();
    expect(anticel?.id).toBe('custom-anticel');
    expect(anticel?.isPrivate).toBe(true);
    expect(anticel?.categories).toEqual([
      'Mobile Dev',
      'Software/Hardware',
      'Systems & Tools',
    ]);
    expect(anticel?.techStack).toContain('WidgetKit');
    expect(anticel?.techStack).toContain('Siri Integration');
    expect(anticel?.images.length).toBeGreaterThan(0);

    // Confirm usage.txt never produces a project node
    expect(projects.some((p) => p.title.toLowerCase().includes('usage'))).toBe(
      false
    );
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
