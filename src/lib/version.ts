export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '3.3.0',
    date: '2026-03-02',
    changes: [
    ],
  },
];

export const VERSION = CHANGELOG[0].version;
