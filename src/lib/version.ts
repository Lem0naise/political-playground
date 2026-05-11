export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '4.0.0',
    date: '2026-05-11',
    changes: [
      "Major simulation overhaul: loyalty by candidate ID, scaled dynamics, party splits, mid-campaign mergers.",
      "Axis targeting system: focus campaign events on specific ideological axes.",
      "Dissolved/split/merged parties now correctly track in incumbent government.",
      "Polling graph persists dissolved party history.",
      "Base utility modifier scaled to ±500. Fixed ideology profiler centrist default.",
    ],
  },
  {
    version: '3.17.1',
    date: '2026-03-07',
    changes: [
      "Allow parties to dissolve.",
      "Allow parties to merge.",
    ],
  },
];

export const VERSION = CHANGELOG[0].version;
