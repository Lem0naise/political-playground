export interface PoliticalValues {
  prog_cons: number;     // Progressive(-) to Conservative(+)
  nat_glob: number;      // Nationalist(-) to Globalist(+)
  env_eco: number;       // Environmental(-) to Economic(+)
  soc_cap: number;       // Socialist(-) to Capitalist(+)
  pac_mil: number;       // Pacifist(-) to Militaristic(+)
  auth_ana: number;      // Authoritarian(-) to Anarchist(+)
  rel_sec: number;       // Religious(-) to Secular(+)
}

export interface Candidate {
  id: number;
  name: string;
  party: string;
  party_pop: number;
  vals: number[];
  colour: string;
  swing?: number;
  is_player: boolean;
  momentum?: number;
  previous_popularity?: number;
}

export interface Country {
  pop: number;
  vals: PoliticalValues;
  scale: number;
  hos: string;
}

export interface Event {
  title: string;
  description: string;
  choices: EventChoice[];
}

export interface EventChoice {
  text: string;
  effect: Partial<PoliticalValues>;
  boost: number;
}

export interface PollResult {
  candidate: Candidate;
  votes: number;
  percentage: number;
  change?: number;
}

export interface GameState {
  country: string;
  countryData: Country;
  partyList: string;
  candidates: Candidate[];
  playerCandidate: Candidate | null;
  currentPoll: number;
  totalPolls: number;
  pollResults: PollResult[];
  previousPollResults: Record<string, number>;
  initialPollResults: Record<string, number>;
  politicalNews: string[];
  playerEventNews: string[];
  votingData: number[][];
  pendingParties?: any[];
  coalitionState?: CoalitionState;
  phase: 'setup' | 'party-selection' | 'partyMerging' | 'player-selection' | 'campaign' | 'results' | 'coalition';
}

export interface CoalitionState {
  coalitionPartners: Candidate[];
  currentCoalitionPercentage: number;
  availablePartners: Candidate[];
  cabinetAllocations: Record<string, string[]>;
  isPlayerLead: boolean;
  negotiationPhase: 'partner-selection' | 'cabinet-negotiation' | 'complete';
  currentNegotiatingPartner?: Candidate;
}

export interface CabinetPosition {
  importance: number;
  max_slots: number;
  description: string;
}

export const VALUES = [
  "prog_cons",
  "nat_glob", 
  "env_eco",
  "soc_cap",
  "pac_mil",
  "auth_ana",
  "rel_sec"
] as const;

export const CABINET_POSITIONS: Record<string, CabinetPosition> = {
  "Deputy Prime Minister": { importance: 30, max_slots: 1, description: "Second-in-command of the government" },
  "Finance Minister": { importance: 25, max_slots: 1, description: "Controls economic policy and budget" },
  "Foreign Minister": { importance: 20, max_slots: 1, description: "Leads international relations and diplomacy" },
  "Defense Minister": { importance: 18, max_slots: 1, description: "Oversees military and national security" },
  "Home/Interior Minister": { importance: 16, max_slots: 1, description: "Manages domestic security and law enforcement" },
  "Health Minister": { importance: 14, max_slots: 1, description: "Oversees healthcare system and public health" },
  "Education Minister": { importance: 12, max_slots: 1, description: "Manages education policy and schools" },
  "Environment Minister": { importance: 10, max_slots: 1, description: "Handles environmental policy and climate action" },
  "Justice Minister": { importance: 10, max_slots: 1, description: "Oversees legal system and courts" },
  "Transport Minister": { importance: 8, max_slots: 1, description: "Manages transportation infrastructure" },
  "Junior Minister": { importance: 5, max_slots: 5, description: "Supporting ministerial roles" },
  "Parliamentary Secretary": { importance: 3, max_slots: 10, description: "Administrative support positions" }
};

export const DESCRIPTORS: Record<string, Record<string, string | null>> = {
  "prog_cons": {"-100": "very progressive", "-30": "progressive", "0": null, "30": "conservative", "100": "ultraconservative"},
  "nat_glob": {"-100": "ultranationalist", "-30": "nationalist", "0": null, "30": "globalist", "100": "internationalist"},
  "env_eco": {"-100": "environmentalist", "0": null, "50": null, "100": "anti-environmentalist"},
  "soc_cap": {"-80": "far-left", "-40": "left-wing", "-20": "centre-left", "0": "centrist", "20": "centre-right", "100": "corporatist"},
  "pac_mil": {"-100": "pacifist", "20": null, "60": "militarist", "100": "ultramilitaristic"},
  "auth_ana": {"-100": "dictatorial", "-60": "authoritarian", "-10": null, "60": "liberal", "100": "anarchist"},
  "rel_sec": {"-100": "theocratic", "-30": "religious", "0": null, "70": "secular"},
};

// Game configuration constants
export const DEBUG = false;
export const TOO_FAR_DISTANCE = 190;
export const COALITION_FACTOR = 1.1;
export const TOO_CLOSE_PARTY = 100;
export const VOTE_MANDATE = false;
export const POLL_COUNTER = 30;

// Disclaimer constants
export const DISCLAIMER_TEXT = {
  SHORT: "Fictional simulation for entertainment purposes only",
  FULL: "This is a fictional political simulation for entertainment and educational purposes. It does not accurately represent real political processes, parties, or voting systems.",
  FOOTER: "This simulation does not reflect real politics or endorse any political views. Political opinions are subjective and complex."
} as const;

export type PoliticalValueKey = keyof PoliticalValues;
