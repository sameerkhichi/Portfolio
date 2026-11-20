import {
  PROJECT_CATEGORIES,
  type ProfileData,
  type ProjectCategory,
  type ProjectItem,
  type ProjectOverride,
} from '../types/portfolio';

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
export const HIDDEN_REPOS: string[] = ['Portfolio', 'sameerkhichi', 'AntiCELDocs'];

export const FALLBACK_PROFILE: ProfileData = {
  name: 'Sameer Khichi',
  handle: GITHUB_USERNAME,
  bio: 'Software engineer & builder crafting intelligent systems, full-stack applications, and interactive digital experiences.',
  githubUrl: `https://github.com/${GITHUB_USERNAME}`,
  linkedinUrl: LINKEDIN_URL,
};

/**
 * Per-repository configuration & category classification, keyed by GitHub repo name.
 *
 * Available categories (shown in the top filter bar):
 * 'Web App' | 'AI/ML' | 'Cybersecurity' | 'Software/Hardware' | 'Mobile Dev' |
 * 'Video Game Dev' | 'Systems & Tools' | 'Cloud & DevOps' | 'Data Science'
 *
 * You can also enrich any repository here with a longer `fullSummary`, `highlights`,
 * `images` (stored in `public/projects/...`), custom `techStack`, or a `liveUrl`.
 */
export const PROJECT_OVERRIDES: Record<string, ProjectOverride> = {
  'leetcode-library': {
    categories: ['Systems & Tools'],
  },
  BLEScraper: {
    categories: ['Mobile Dev', 'Software/Hardware', 'Cybersecurity'],
  },
  Facial_Recognition_Model: {
    categories: ['AI/ML'],
  },
  McMaster_Shuttle_Tracker: {
    categories: ['Web App'],
  },
  'Maze-Runner': {
    categories: ['Video Game Dev', 'Systems & Tools'],
  },
  Traffic_Simulator: {
    categories: ['Systems & Tools', 'Data Science'],
  },
  AI_Checklist: {
    categories: ['AI/ML', 'Web App', 'Cloud & DevOps'],
  },
  PDF_Merger: {
    categories: ['Systems & Tools', 'Cybersecurity'],
  },
  keylogger: {
    categories: ['Cybersecurity', 'Systems & Tools'],
  },
  'TicTacToe-Command-Line': {
    categories: ['Video Game Dev'],
  },
  'AimTraining-Game': {
    categories: ['Video Game Dev'],
  },
};

/**
 * Standalone custom projects (e.g., published private-repo apps or non-GitHub work)
 * displayed as nodes in the neural network.
 */
export const CUSTOM_PROJECTS: ProjectItem[] = [
  {
    id: 'custom-anticel',
    title: 'AntiCEL',
    shortDescription:
      'Published local-first iOS & iPadOS vehicle management and BLE OBD-II diagnostics tool featuring LiDAR 3D car models, automated maintenance tracking, and deep ECU telemetry.',
    fullSummary:
      'Built to keep Check Engine Lights away without accounts, cloud tracking, or forced subscriptions, AntiCEL unifies a vehicle’s maintenance schedule, service history, documents, photos, and live OBD-II diagnostics in one local-first iOS & iPadOS app. Manage vehicles from a central Garage, log repairs and mods onto an interactive 3D model of your own car (scanned with LiDAR or imported via USDZ), scan Carfax reports and receipts automatically, and pair with BLE OBD-II adapters via AntiCEL Connect for live telemetry and 17,000+ fault code breakdowns. Upcoming updates expand AntiCEL Connect with a vehicle data catalog that scans and parses manufacturer-specific PIDs and DIDs for proprietary ECU telemetry beyond standard Mode 01 reads—plus a manual hex command mode for power users to query custom ECU data directly.',
    highlights: [
      'LiDAR 3D Scanning & USDZ Support: Scan your vehicle’s exterior and interior with LiDAR (or import custom .usdz models) to explore repair, maintenance, and mod history directly on an interactive 3D model—and display it in a Home Screen widget.',
      'BLE OBD-II Telemetry & 17,000+ Fault Codes: Pairs with BLE ELM327 adapters via dynamic proximity auto-reconnect, live fuel/coolant/oil temperature monitoring, Quick Scan, and 9,000+ generic + 8,000+ manufacturer-specific DTC diagnostics (symptoms, causes, steps, cost & difficulty).',
      'Manufacturer PID/DID Data Catalog & Custom Hex Commands (Upcoming): Parses and scans manufacturer-specific PIDs and DIDs to surface proprietary ECU data beyond standard Mode 01 reads, plus manual raw hex command entry for advanced users.',
      'Automated Records & Reminders: Date/mileage service reminders, document expiry alerts, and Carfax/receipt scanning that automatically creates vehicle history entries.',
      'Deep iOS Ecosystem & Local-First Privacy: WidgetKit Home & Lock Screen widgets, Siri Integration for hands-free mileage updates, Low Storage Mode album linking, and 100% on-device storage.',
    ],
    date: '2026-11-13T23:34:27Z',
    displayDate: 'Nov 2026',
    categories: ['Mobile Dev', 'Software/Hardware', 'Systems & Tools'],
    techStack: [
      'Swift',
      'SwiftUI',
      'CoreBluetooth',
      'OBD-II / BLE',
      'LiDAR / 3D (USDZ)',
      'WidgetKit',
      'Siri Integration',
      'StoreKit 2',
    ],
    liveUrl: 'https://apps.apple.com/ca/app/anticel/id6808880922',
    images: [
      {
        src: 'https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/bf/05/1d/bf051dc8-fec3-f4b2-64bd-580dce7fe7b6/Garage-View.png/900x0w.jpg',
        alt: 'AntiCEL Garage view',
        caption: 'Garage — Manage all your vehicles and pull down for Quick Scan',
      },
      {
        src: 'https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/9b/f3/0a/9bf30a0b-60e1-f37f-e532-3f697af4d36b/Overview-Top.png/900x0w.jpg',
        alt: 'AntiCEL Overview top screen',
        caption: 'Overview — Track mileage and date/mileage maintenance reminders',
      },
      {
        src: 'https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/a4/f5/93/a4f59357-42bb-ef89-3a03-2dad6d9a5c3e/Overview-Botton.png/900x0w.jpg',
        alt: 'AntiCEL Overview details screen',
        caption: 'Overview — Vehicle notes, paint codes, specs, and favourite shops',
      },
      {
        src: 'https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/8b/c9/3f/8bc93f46-9503-ea45-8161-37d01dc691f8/History-Top.png/900x0w.jpg',
        alt: 'AntiCEL 3D interactive model history',
        caption: 'Interactive 3D History — Explore repairs and mods directly on your vehicle',
      },
      {
        src: 'https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/c9/9c/eb/c99ceb05-3d33-c285-5a60-7c4c02b358d5/History-DrivetrainView.png/900x0w.jpg',
        alt: 'AntiCEL 3D drivetrain history view',
        caption: '3D Drivetrain View — Inspect tagged vehicle components and service logs',
      },
      {
        src: 'https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/fd/d3/a4/fdd3a4c0-4137-80c4-008b-ee8518fb575a/History-ListView.png/900x0w.jpg',
        alt: 'AntiCEL chronological history list',
        caption: 'History List — Complete chronological build and maintenance timeline',
      },
      {
        src: 'https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/0d/15/0a/0d150a60-9532-2cac-4088-2db14f1c8cbd/Album.png/900x0w.jpg',
        alt: 'AntiCEL vehicle photo album',
        caption: 'Album — Dedicated car photo library with Low Storage Mode',
      },
      {
        src: 'https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/fd/98/e7/fd98e733-73d6-5f6b-cdf6-7d81d6490fe5/Documents.png/900x0w.jpg',
        alt: 'AntiCEL vehicle documents vault',
        caption: 'Documents — Registration, insurance, bills of sale, and expiry alerts',
      },
      {
        src: 'https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/72/63/6a/72636a31-5c1c-c57f-c401-27ef79185eb7/Connect-Page-DESCView.png/900x0w.jpg',
        alt: 'AntiCEL Connect OBD-II diagnostics',
        caption: 'AntiCEL Connect — BLE OBD-II live telemetry & fault code scanning',
      },
      {
        src: 'https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/15/11/ed/1511edb1-345d-172a-fafa-2718c5067cb1/Connect-Plans.png/900x0w.jpg',
        alt: 'AntiCEL Connect plans',
        caption: 'AntiCEL Connect — Flexible subscription or one-time lifetime unlock',
      },
    ],
    isPrivate: true,
    featured: true,
    source: 'custom',
  },
];
