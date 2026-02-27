export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '2.6.0',
    date: '2026-02-27',
    changes: [
    ],
  },
];

export const VERSION = CHANGELOG[0].version;
