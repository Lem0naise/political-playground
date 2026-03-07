export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '3.17.0',
    date: '2026-03-07',
    changes: [
      "Allow parties to dissolve.",
    ],
  },
];

export const VERSION = CHANGELOG[0].version;
