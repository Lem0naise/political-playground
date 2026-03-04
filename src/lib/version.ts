export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '3.9.0',
    date: '2026-03-04',
    changes: [
      "Add cooldown for leader change. Allow player's parties to have leadership replacements, after a bad election loss.",
    ],
  },
];

export const VERSION = CHANGELOG[0].version;
