import { Event } from '@/types/game';

export interface EventVariables {
  generic: Record<string, string[]>;
  countrySpecific: Record<string, Record<string, string[]>>;
}

/**
 * Picks a random element from an array
 */
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Resolves a single variable key to a concrete value
 * Prefers country-specific variables (60% chance) if available, otherwise uses generic
 */
function resolveVariable(
  key: string,
  variables: EventVariables,
  country: string
): string {
  const countryVars = variables.countrySpecific?.[country];
  const hasCountrySpecific = countryVars && countryVars[key] && countryVars[key].length > 0;
  const hasGeneric = variables.generic?.[key] && variables.generic[key].length > 0;

  // 60% chance to use country-specific if available
  if (hasCountrySpecific && Math.random() < 0.6) {
    return pickRandom(countryVars[key]);
  }

  // Fallback to country-specific if no generic, or use generic
  if (hasCountrySpecific && !hasGeneric) {
    return pickRandom(countryVars[key]);
  }

  if (hasGeneric) {
    return pickRandom(variables.generic[key]);
  }

  // If neither exists, return placeholder
  return `{${key}}`;
}

/**
 * Substitutes all {variable} placeholders in a string with resolved values
 */
function substituteVariables(
  text: string,
  resolvedVars: Record<string, string>
): string {
  return text.replace(/\{(\w+)\}/g, (match, key) => {
    return resolvedVars[key] || match;
  });
}

/**
 * Finds all unique variable keys used in an event (title, description, choice texts)
 */
function extractVariableKeys(event: Event): string[] {
  const keys = new Set<string>();
  const regex = /\{(\w+)\}/g;

  // Extract from title
  let match;
  while ((match = regex.exec(event.title)) !== null) {
    keys.add(match[1]);
  }

  // Extract from description
  regex.lastIndex = 0;
  while ((match = regex.exec(event.description)) !== null) {
    keys.add(match[1]);
  }

  // Extract from choice texts
  event.choices.forEach(choice => {
    regex.lastIndex = 0;
    while ((match = regex.exec(choice.text)) !== null) {
      keys.add(match[1]);
    }
  });

  return Array.from(keys);
}

/**
 * Instantiates an event template by resolving all variables
 * Keeps the same event structure, just substitutes variable placeholders
 */
export function instantiateEvent(
  event: Event,
  variables: EventVariables,
  country: string
): Event {
  // Find all variables used in this event
  const variableKeys = extractVariableKeys(event);

  // Resolve each variable once (consistent values throughout the event)
  const resolvedVars: Record<string, string> = {};
  variableKeys.forEach(key => {
    resolvedVars[key] = resolveVariable(key, variables, country);
  });

  // Substitute variables in all text fields
  return {
    title: substituteVariables(event.title, resolvedVars),
    description: substituteVariables(event.description, resolvedVars),
    choices: event.choices.map(choice => ({
      ...choice,
      text: substituteVariables(choice.text, resolvedVars)
    }))
  };
}

/**
 * Loads event variables from a JSON file
 */
export async function loadEventVariables(path: string = '/data/event_variables.json'): Promise<EventVariables> {
  try {
    const response = await fetch(path);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to load event variables:', error);
    return {
      generic: {},
      countrySpecific: {}
    };
  }
}
