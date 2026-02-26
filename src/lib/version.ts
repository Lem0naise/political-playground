export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '2.3.0',
    date: '2026-02-27',
    changes: [
      'Centralized version string',
      'Various UI and gameplay improvements',
    ],
  },
];

export const VERSION = CHANGELOG[0].version;
