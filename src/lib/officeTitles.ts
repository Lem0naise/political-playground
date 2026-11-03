import type { Country } from '@/types/game';

export const DEFAULT_HEAD_OF_GOVERNMENT_TITLE = 'Prime Minister';

/** Resolve the player/winner's office from country data, with a safe legacy fallback. */
export function getHeadOfGovernmentTitle(
  countryData?: Pick<Country, 'headOfGovernmentTitle'> | null
): string {
  const title = countryData?.headOfGovernmentTitle?.trim();
  return title || DEFAULT_HEAD_OF_GOVERNMENT_TITLE;
}

/**
 * Cabinet allocation keys are stable save data. Only their display changes for
 * countries whose leader is not called "Prime Minister".
 */
export function formatCabinetPosition(position: string, leaderTitle: string): string {
  if (position === 'Prime Minister') return leaderTitle;
  if (position === 'Deputy Prime Minister') return `Deputy ${leaderTitle}`;
  return position;
}
