export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '3.16.0',
    date: '2026-03-07',
    changes: [
      "Reduce frequency of AI offering coalition positions.",
    ],
  },
];

export const VERSION = CHANGELOG[0].version;
