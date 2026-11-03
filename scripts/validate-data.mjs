import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];

function readJson(relativePath) {
  const filePath = path.join(root, relativePath);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    errors.push(`${relativePath}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function hasInertBlocKeys(blocs) {
  return Array.isArray(blocs) && blocs.some(
    (bloc) => bloc && (Object.hasOwn(bloc, 'turnout') || Object.hasOwn(bloc, 'partyAffinity'))
  );
}

const countries = readJson('public/data/countries.json');
const parties = readJson('public/data/parties.json');
const events = readJson('public/data/events.json');
const eventVariables = readJson('public/data/event_variables.json');

if (countries) {
  for (const [name, country] of Object.entries(countries)) {
    const title = country?.headOfGovernmentTitle;
    if (typeof title !== 'string' || !title.trim()) {
      errors.push(`countries.json: ${name} is missing headOfGovernmentTitle`);
    }
    if (hasInertBlocKeys(country?.blocs)) {
      errors.push(`countries.json: ${name} still has turnout/partyAffinity in a bloc`);
    }
  }
}

if (parties) {
  for (const [listName, list] of Object.entries(parties)) {
    if (!Array.isArray(list)) {
      errors.push(`parties.json: ${listName} is not an array`);
      continue;
    }
    for (const [index, party] of list.entries()) {
      if (!party || typeof party.party !== 'string' || !party.party.trim()) {
        errors.push(`parties.json: ${listName}[${index}] has no party name`);
      }
      if (typeof party?.colour !== 'string' || !/^#[0-9a-f]{6}$/i.test(party.colour)) {
        errors.push(`parties.json: ${listName}[${index}] has invalid colour`);
      }
      const axes = ['prog_cons', 'nat_glob', 'env_eco', 'soc_cap', 'pac_mil', 'auth_ana', 'rel_sec'];
      const hasAxes = axes.every((axis) => typeof party?.[axis] === 'number');
      const hasValuesArray = Array.isArray(party?.vals) && party.vals.length === 7;
      if (!hasAxes && !hasValuesArray) {
        errors.push(`parties.json: ${listName}[${index}] has invalid values`);
      }
    }
  }
}

if (events) {
  for (const [index, event] of events.entries()) {
    if (!event || !Array.isArray(event.choices) || event.choices.length === 0) {
      errors.push(`events.json: event ${index} has no choices`);
    }
  }
}

if (countries && eventVariables) {
  const countryKeys = new Set(Object.keys(countries));
  const variableKeys = new Set(Object.keys(eventVariables.countrySpecific ?? {}));
  for (const key of countryKeys) {
    if (!variableKeys.has(key)) errors.push(`event_variables.json: missing countrySpecific key ${key}`);
  }
  for (const key of variableKeys) {
    if (!countryKeys.has(key)) errors.push(`event_variables.json: unknown countrySpecific key ${key}`);
  }
}

if (errors.length > 0) {
  console.error(`Data validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  const partyCount = parties
    ? Object.values(parties).reduce((total, list) => total + (Array.isArray(list) ? list.length : 0), 0)
    : 0;
  console.log(
    `Data valid: ${Object.keys(countries ?? {}).length} countries, ` +
    `${Object.keys(parties ?? {}).length} party lists / ${partyCount} parties, ` +
    `${(events ?? []).length} events, ` +
    `${Object.keys(eventVariables?.countrySpecific ?? {}).length} country variable sets.`
  );
}
