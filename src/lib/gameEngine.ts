import { Candidate, Country, VALUES, PoliticalValues, DEBUG, TOO_FAR_DISTANCE, VOTE_MANDATE } from '@/types/game';

// Generate random normal distribution using Box-Muller transform
function randomNormal(mean: number = 0, std: number = 1): number {
  let u = 0, v = 0;
  while(u === 0) u = Math.random(); // Converting [0,1) to (0,1)
  while(v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * std + mean;
}

export function createCandidate(
  id: number,
  name: string,
  party: string,
  party_pop: number,
  prog_cons: number,
  nat_glob: number,
  env_eco: number,
  soc_cap: number,
  pac_mil: number,
  auth_ana: number,
  rel_sec: number,
  colour?: string,
  swing?: number
): Candidate {
  return {
    id,
    name,
    party,
    party_pop,
    vals: [prog_cons, nat_glob, env_eco, soc_cap, pac_mil, auth_ana, rel_sec],
    colour: colour || 'gray',
    swing,
    is_player: false
  };
}

export function generateVotingData(country: Country): number[][] {
  const data: number[][] = [];
  
  for (const valueKey of VALUES) {
    const voters: number[] = [];
    for (let i = 0; i < country.pop; i++) {
      const voterValue = randomNormal(country.vals[valueKey], 100);
      voters.push(Math.max(-100, Math.min(100, voterValue)));
    }
    // Shuffle to add randomness
    for (let i = voters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [voters[i], voters[j]] = [voters[j], voters[i]];
    }
    data.push(voters);
  }
  
  return data;
}

export function voteForCandidate(voterIndex: number, candidates: Candidate[], data: number[][]): number | null {
  const dists: number[] = [];
  
  for (let i = 0; i < candidates.length; i++) {
    const cand = candidates[i];
    let eucSum = 0;
    
    for (let o = 0; o < VALUES.length; o++) {
      const voterVal = data[o][voterIndex];
      eucSum += Math.pow(voterVal - cand.vals[o], 2);
    }
    
    let eucDist = eucSum;
    
    // Apply party popularity effect
    const popularityEffect = Math.pow(cand.party_pop * 4, 2);
    eucDist -= popularityEffect;
    
    if (cand.swing) {
      eucDist -= (cand.swing * 5) * Math.abs(cand.swing * 5);
    }
    
    dists.push(eucDist);
  }
  
  const indexMin = dists.indexOf(Math.min(...dists));
  
  if (dists[indexMin] <= Math.pow(TOO_FAR_DISTANCE, 2) || VOTE_MANDATE) {
    return indexMin;
  } else {
    return null; // Don't participate in polling
  }
}

export function applyPoliticalDynamics(candidates: Candidate[], pollIteration: number): string[] {
  const newsEvents: string[] = [];
  
  if (pollIteration === 1) {
    // First poll - minimal variation to establish baseline
    for (const candidate of candidates) {
      const baselineVariation = (Math.random() - 0.5) * 0.4; // -0.2 to 0.2
      candidate.party_pop += baselineVariation;
      
      // Initialize momentum tracking
      if (!candidate.momentum) candidate.momentum = 0;
      if (!candidate.previous_popularity) candidate.previous_popularity = candidate.party_pop;
    }
    newsEvents.push("ELECTION SEASON OFFICIALLY BEGINS.");
    return newsEvents;
  }
  
  // Calculate current standings for bandwagon effects
  const currentStandings = [...candidates].sort((a, b) => b.party_pop - a.party_pop);
  const leader = currentStandings[0];
  
  // Market volatility - occasional larger political shifts
  let marketVolatility = 0.0;
  if (Math.random() < 0.15) { // 15% chance of significant political event
    marketVolatility = (Math.random() - 0.5) * 3; // -1.5 to 1.5
    if (DEBUG) {
      console.log(`DEBUG: Market volatility event: ${marketVolatility.toFixed(2)}`);
    }
  }
  
  // Track momentum and bandwagon effects for news
  const highMomentumParties: string[] = [];
  const decliningParties: string[] = [];
  
  for (const candidate of candidates) {
    const oldPopularity = candidate.party_pop;
    
    // Calculate momentum from recent performance
    if (candidate.previous_popularity !== undefined) {
      const momentumChange = candidate.party_pop - candidate.previous_popularity;
      // Momentum factor - carry forward 30% of recent change
      candidate.momentum = (candidate.momentum || 0) * 0.7 + momentumChange * 0.3;
    }
    
    // Incumbency effects - popular parties face erosion, struggling ones get recovery
    let incumbencyEffect = 0;
    if (candidate.party_pop > 10) {
      incumbencyEffect = -0.1 * (candidate.party_pop / 20); // Voter fatigue
    } else {
      incumbencyEffect = 0.05; // Small recovery boost for struggling parties
    }
    
    // Bandwagon effect - leading parties get small boost
    let bandwagonEffect = 0;
    if (candidate === leader && candidate.party_pop > 15) {
      bandwagonEffect = 0.2;
    } else if (candidate.party_pop < -10) {
      bandwagonEffect = -0.1; // Additional losses for struggling parties
    }
    
    // Apply momentum with decay
    const momentumEffect = (candidate.momentum || 0) * 0.3; // 30% of momentum carries forward
    if (candidate.momentum) candidate.momentum *= 0.85; // Momentum decays over time
    
    // Natural political variation (smaller than old random changes)
    const naturalVariation = (Math.random() - 0.5) * 0.6; // -0.3 to 0.3
    
    // Combine all effects
    const totalChange = incumbencyEffect + bandwagonEffect + momentumEffect + naturalVariation + marketVolatility;
    
    candidate.party_pop += totalChange;
    
    // Store previous popularity for next iteration
    candidate.previous_popularity = oldPopularity;
    
    // Ensure party popularity doesn't go extreme values
    if (candidate.party_pop > 100) {
      candidate.party_pop = 100;
    } else if (candidate.party_pop < -50) {
      candidate.party_pop = -50;
    }
    
    // Track parties with significant momentum changes for news
    if (momentumEffect > 1.0) {
      highMomentumParties.push(candidate.party);
    } else if (momentumEffect < -1.0) {
      decliningParties.push(candidate.party);
    }
    
    if (DEBUG && Math.abs(totalChange) > 0.5) {
      console.log(`DEBUG: ${candidate.party} change: ${totalChange.toFixed(2)}`);
    }
  }
  
  // Generate momentum-based news events
  if (highMomentumParties.length > 0) {
    if (highMomentumParties.length === 1) {
      newsEvents.push(`${highMomentumParties[0]} gains momentum as their message resonates with voters.`);
    } else {
      newsEvents.push(`Multiple parties see rising support as the race intensifies.`);
    }
  }
  
  if (decliningParties.length > 0) {
    if (decliningParties.length === 1) {
      newsEvents.push(`${decliningParties[0]} faces challenges as support begins to waver.`);
    } else {
      newsEvents.push(`Several parties struggle to maintain voter confidence.`);
    }
  }
  
  return newsEvents;
}

const RANDOM_NEWS_EVENTS = [
  // General Politics
  "LEAK: Ex-Finance Minister's Messages Show Secret Talks With Corporate Lobbyists",
  "INFRASTRUCTURE BILL GAINS SURPRISE SUPPORT FROM DEPUTIES IN MARGINAL SEATS",
  "VIRAL CAMPAIGN SPARKS 34% YOUTH VOTER REGISTRATION SURGE IN UNIVERSITY TOWNS",
  "ELECTORAL COMMISSION UNVEILS CONTROVERSIAL DEBATE FORMAT WITH LIVE AI FACT-CHECKING",
  "GREEN ALLIANCE ENDORSES RIVAL, FRACTURING ENVIRONMENTAL VOTING BLOC",
  "SECRET TALKS REVEALED: THREE MINOR PARTIES PLOT 'GOVERNMENT OF NATIONAL UNITY'",
  "CAMPAIGN FINANCE ACT PASSES KEY HURDLE DESPITE FIERCE LOBBYING",
  "GOVERNMENT COLLAPSES BY 1 VOTE; SNAP ELECTION CALLED",
  "HIGH COURT TO HEAR LEGAL CHALLENGE TO NEW VOTER ID LAWS",
  "FARMERS FORM PROTEST GROUP OVER NEW AGRICULTURAL WATER QUOTAS",
  "HEAD OF STATE'S VISIT TO FORMER COLONY MET WITH REPARATIONS PROTESTS",
  "ANTI-CORRUPTION PROSECUTOR CHARGES THREE SITTING MPS",
  "PROPOSAL TO LOWER VOTING AGE TO 16 SPLITS RULING COALITION",

  // Economy
  "OMNICORP SHARES PLUMMET 23% ON PENSION FUND'S CRYPTO EXPOSURE FEARS",
  "JOB GAP WIDENS: UNEMPLOYMENT AT 4.2% IN RUST BELT, 7.8% IN CAPITAL",
  "BUSINESS CONFIDENCE HITS 18-MONTH HIGH AFTER DEREGULATION MOVES",
  "HOME PRICES SOAR TO 847K AVERAGE; GOV'T DEBATES FOREIGN BUYER TAX",
  "TRADE TALKS WITH EAST PACIFIC BLOC STALL OVER DISPUTED FISHING RIGHTS",
  "'SILICON STEPPE' TECH JOBS GROW 15%; TRADITIONAL MANUFACTURING STAGNATES",
  "INFLATION SPIKES 0.9% IN A MONTH AS PORT STRIKE DRIVES UP ENERGY COSTS",
  "DIPLOMATIC ROW OVER IP TRIGGERS NEW 20% TARIFF ON FARM EXPORTS",
  "MASSIVE RARE EARTH MINERAL DISCOVERY SPARKS BOOM IN NORTHERN PROVINCE",
  "TOURISM REVENUE HITS 94% OF PRE-PANDEMIC LEVELS AFTER WORLD EXPO SUCCESS",
  "CENTRAL BANK IN SHOCK MOVE, RAISES INTEREST RATES 50 BPS TO FIGHT INFLATION",

  // Society & Culture
  "6-HOUR ER WAITS MAKE HEALTHCARE REFORM TOP ELECTION ISSUE",
  "25,000 TEACHERS MARCH ON CAPITAL DEMANDING BETTER PAY",
  "NATIONAL DEBATE ERUPTS OVER REVISING TEXTBOOKS ON COLONIAL-ERA ROLE",
  "DEEPFAKE VIDEOS OF LEADERS PROMPT EMERGENCY SESSION ON ELECTION MISINFORMATION",
  "RELIGIOUS LEADER URGES INTERFAITH DIALOGUE AFTER VANDALS HIT HISTORIC TEMPLE",
  "LANGUAGE SOCIETY WINS MAJOR GRANT TO DIGITIZE ANCIENT, DYING DIALECTS",
  "NATIONAL SYMPHONY FACES CLOSURE FROM FUNDING CUTS; PUBLIC RALLIES TO SAVE IT",
  "MUSICIAN'S ENDORSEMENT VIDEO HITS 15M VIEWS, SWAYS YOUTH POLLS",
  "NATION'S TOP FOOTBALL STAR ARRESTED ON TAX EVASION CHARGES",
  "ANCIENT RUINS HALT MAJOR DAM PROJECT AFTER UNEXPECTED DISCOVERY",

  // International & Geopolitics
  "CLIMATE SUMMIT ENDS IN DEADLOCK OVER CARBON CREDITS, DEVELOPING NATION AID",
  "NEIGHBOR'S ECONOMIC COLLAPSE SPARKS SHARP RISE IN BORDER SMUGGLING",
  "NATIONALIST PARTIES OPPOSE FOREIGN AID BUDGET, CITE DOMESTIC NEEDS",
  "INTERNATIONAL OBSERVERS FROM 20 NATIONS PRAISE NEW BIOMETRIC VOTER SYSTEM",
  "STATE-SPONSORED CYBERATTACK ON POWER GRID CAUSES BLACKOUTS IN 3 CITIES",
  "AMNESTY REPORT ON NEIGHBOR'S ABUSES STRAINS TIES, THREATENS TRADE DEAL",
  "NAVAL VESSEL RAMMED IN CERULEAN SEA; TENSIONS RISE OVER FISHING WATERS",
  "AMBASSADOR RECALLED FROM REGIONAL POWER AMID PUBLIC SPYING ACCUSATIONS",
  "'JADE DRAGON ALLIANCE' SHOWCASES NEW DRONE, HYPERSONIC TECH IN WARGAMES",
  "STUDENT EXCHANGE WITH 15-NATION BLOC EXPANDS TO VOCATIONAL TRAINING",

  // Environment & Science
  "TYPHOON AMIHAN EXPOSES COASTAL WEAKNESSES, SLOW GOV'T RESPONSE",
  "VERDE VALLEY RESIDENTS PROTEST 400-MEGAWATT SOLAR FARM ON FERTILE LAND",
  "CAPITAL FACES STAGE 4 WATER RESTRICTIONS; RESERVOIRS AT RECORD 28% LOW",
  "GORILLA PROTECTION LAWS SPARK CLASH BETWEEN CONSERVATIONISTS & MINING FIRMS",
  "MYSTERY BEE DECLINE THREATENS MULTI-BILLION DOLLAR FARM SECTOR",
  "WILDFIRE SMOKE TRIGGERS 8TH STRAIGHT DAY OF AIR QUALITY ALERTS",
  "AZURE ISLANDS VOLCANO ERUPTS, STRANDING THOUSANDS, DISRUPTING GLOBAL AIR TRAVEL",
  "INTERNATIONAL SPACE AGENCY ANNOUNCES JOINT 3-NATION MANNED MISSION TO MARS",
  "LANDMARK AI CONSCIOUSNESS STUDY RETRACTED OVER FABRICATED DATA CLAIMS",
  "CLEANUP CREWS REMOVE 15 TONS OF PLASTIC FROM MAJOR RIVER DELTA",

  // Technology & Random
  "AI WATCHDOG PROPOSES MANDATORY ALGORITHM AUDITS FOR GOV'T SERVICES",
  "MASSIVE CYBER-HEIST DRAINS MILLIONS; NATIONAL BANKING SYSTEM HALTED",
  "STRANGE ATMOSPHERIC EVENT CREATES UNEXPLAINED AURORAS NATIONWIDE",
  "NATIONAL 'CHEESE CRISIS' LOOMS AS BACTERIAL BLIGHT HITS 90% OF DAIRY HERDS",
  "MYSTERY ONLINE PUZZLE CAPTIVATES MILLIONS IN GLOBAL COLLABORATION",
  "NATIONAL DIGITAL ID ROLLOUT PAUSED AFTER 500K CITIZENS' DATA BREACHED",
  "POP STAR SPARKS NATIONWIDE SHORTAGE OF TRADITIONAL FOLK HATS",
  "BELOVED GIANT PANDA AT NATIONAL ZOO GIVES BIRTH TO TWINS",
  "FISHING BOAT DISCOVERS 400-YEAR-OLD SHIPWRECK FILLED WITH ARTIFACTS",
  "THOUSANDS OF MIGRATORY BIRDS UNEXPECTEDLY DESCEND ON CAPITAL CITY PARK"
];

const ECONOMIC_CRISIS_EVENTS = [
  "RECESSION FEARS MOUNT AS GLOBALMANUFACTURING CLOSES 3 PLANTS, CUTS 12,000 JOBS",
  "CREDIT CRUNCH: LARGEST BANK HALTS BUSINESS LENDING AS DEFAULTS HIT 9.1%",
  "CHIP SHORTAGE FORCES INDEFINITE HALT TO AUTO, ELECTRONICS PRODUCTION",
  "CURRENCY PLUNGES 15%; SKYROCKETING IMPORT COSTS HIT HOUSEHOLDS",
  "COMMERCIAL REAL ESTATE VALUES COLLAPSE 25% AS OFFICE TOWERS SIT EMPTY",
  "SME REVENUES DOWN 40% AMID SUPPLY CHAIN, ENERGY PRICE CHAOS",
  "DEBT-TO-GDP HITS 130%, TRIGGERING AUTOMATIC, PAINFUL SPENDING CUTS",
  "ECONOMY SHRINKS AGAIN; GROWTH FORECAST SLASHED FROM 2.1% TO -1.5%"
];

const ECONOMIC_OPTIMISM_EVENTS = [
  "AUTO GIANT TO BUILD 3B-CREDIT EV BATTERY PLANT, CREATING 9,000 JOBS",
  "BOOM TIMES: UNEMPLOYMENT HITS 50-YEAR LOW AT 2.9% AMID LABOR SHORTAGE",
  "MANUFACTURING EXPORTS SURGE 30% AFTER LANDMARK TRADE DEAL SIGNED",
  "AI TOOLS BOOST WORKER OUTPUT 18%, SPARKING WAGE GROWTH IN SERVICE SECTOR",
  "CONSUMER CONFIDENCE SOARS TO 20-YEAR HIGH; SAVINGS RATES STABILIZE",
  "BANKS BOOST SMALL BUSINESS LENDING 25%, FUNDING THOUSANDS OF PROJECTS",
  "NATIONAL INFRASTRUCTURE PLAN KICKS OFF, CREATING 50,000 CONSTRUCTION JOBS",
  "INDICATORS POINT TO SUSTAINED 3.5% GROWTH DRIVEN BY INNOVATION, EXPORTS"
];

const POLARIZATION_EVENTS = [
  "NATION DIVIDED AS HIGH COURT'S 5-4 ABORTION RULING TRIGGERS MASS PROTESTS",
  "PROPOSED 'RELIGIOUS FREEDOM ACT' SPARKS PUBLIC FEUD BETWEEN FAITH LEADERS",
  "IMMIGRATION RAIDS LEAD TO STANDOFFS BETWEEN NATIONAL POLICE, LOCAL OFFICIALS",
  "VIOLENT CLASHES AT UNIVERSITY FORCE CANCELLATION OF PROFESSOR'S LECTURE",
  "SAME-SEX MARRIAGE DEBATE INTENSIFIES AS NATION HEADS FOR BINDING REFERENDUM",
  "CALLS FOR CONSTITUTIONAL REWRITE GAIN TRACTION, DEEPLY DIVIDING PARTIES"
];

export function applyVoterDynamics(data: number[][], pollIteration: number): string[] {
  const newsEvents: string[] = [];
  
  if (pollIteration === 1) {
    return newsEvents; // No changes for baseline poll
  }
  
  // Add random flavor news events (30% chance)
  if (Math.random() < 0.3) {
    const randomEvent = RANDOM_NEWS_EVENTS[Math.floor(Math.random() * RANDOM_NEWS_EVENTS.length)];
    newsEvents.push(randomEvent);
  }
  
  // Economic anxiety factor - affects economic issues more
  let economicAnxiety = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
  let economicCrisis = false;
  if (Math.random() < 0.1) { // 10% chance of significant economic uncertainty
    economicAnxiety = 0.5 + Math.random() * 1.3; // 0.5 to 1.8
    economicCrisis = true;
    if (economicAnxiety > 1.4) {
      const crisisEvent = ECONOMIC_CRISIS_EVENTS[Math.floor(Math.random() * ECONOMIC_CRISIS_EVENTS.length)];
      newsEvents.push(crisisEvent);
    } else if (economicAnxiety < 0.7) {
      const optimismEvent = ECONOMIC_OPTIMISM_EVENTS[Math.floor(Math.random() * ECONOMIC_OPTIMISM_EVENTS.length)];
      newsEvents.push(optimismEvent);
    }
  }
  
  // Social polarization events
  const polarizationEvent = Math.random() < 0.08; // 8% chance
  const polarizationStrength = polarizationEvent ? 1.2 + Math.random() * 0.8 : 1.0; // 1.2 to 2.0
  
  if (polarizationEvent) {
    const polarizationNews = POLARIZATION_EVENTS[Math.floor(Math.random() * POLARIZATION_EVENTS.length)];
    newsEvents.push(polarizationNews);
  }
  
  // Apply small random changes to voter opinions
  for (let voterIndex = 0; voterIndex < data[0].length; voterIndex++) {
    for (let i = 0; i < VALUES.length; i++) {
      if (Math.random() < 0.015) { // 1.5% chance per voter per issue
        const change = (Math.random() - 0.5) * 3; // Smaller change range
        const newValue = data[i][voterIndex] + change;
        data[i][voterIndex] = Math.max(-100, Math.min(100, newValue));
      }
    }
  }
  
  return newsEvents;
}

export function conductPoll(
  data: number[][],
  candidates: Candidate[],
  pollIteration: number = 0
): { results: Array<{ candidate: Candidate; votes: number; percentage: number }>, newsEvents: string[] } {
  // Reset results for this poll
  const pollResults: number[] = new Array(candidates.length).fill(0);
  let notVoted = 0;
  
  // Apply political dynamics to parties
  const politicalNews = applyPoliticalDynamics(candidates, pollIteration);
  
  // Apply voter opinion evolution
  const voterNews = applyVoterDynamics(data, pollIteration);
  
  // Combine news events
  const allNewsEvents = [...politicalNews, ...voterNews];
  
  // Apply minimal polling noise to simulate margin of error
  const pollingNoise = 0.995 + Math.random() * 0.01; // 0.995 to 1.005
  
  // Poll the entire electorate
  for (let voterIndex = 0; voterIndex < data[0].length; voterIndex++) {
    const choice = voteForCandidate(voterIndex, candidates, data);
    if (choice !== null) {
      pollResults[choice]++;
    } else {
      notVoted++;
    }
  }
  
  // Apply minimal polling noise to results (only if there are votes)
  const totalRawVotes = pollResults.reduce((sum, votes) => sum + votes, 0);
  if (totalRawVotes > 0) {
    for (let i = 0; i < pollResults.length; i++) {
      pollResults[i] = Math.max(0, pollResults[i] * pollingNoise);
    }
  }
  
  // Calculate total votes and percentages
  const totalVotes = pollResults.reduce((sum, votes) => sum + votes, 0);
  
  // Return results as array of objects with percentages
  const results = candidates.map((candidate, index) => ({
    candidate,
    votes: Math.round(pollResults[index]), // Round to whole votes
    percentage: totalVotes > 0 ? (pollResults[index] / totalVotes) * 100 : 0
  }));
  
  // Ensure percentages add up to 100% (handle rounding errors)
  if (totalVotes > 0) {
    const totalPercentage = results.reduce((sum, result) => sum + result.percentage, 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      // Find the candidate with the most votes and adjust their percentage
      const maxIndex = results.findIndex(r => r.votes === Math.max(...results.map(res => res.votes)));
      if (maxIndex !== -1) {
        results[maxIndex].percentage += (100 - totalPercentage);
      }
    }
  }
  
  return { results, newsEvents: allNewsEvents };
}

export function formatVotes(votes: number, scaleFactor: number): string {
  const formattedVotes = Math.abs(votes * scaleFactor + (Math.random() * 1000));
  return Math.round(formattedVotes).toLocaleString();
}

export function applyEventEffect(
  playerCandidate: Candidate,
  effect: Partial<PoliticalValues>,
  boost: number,
  countryData: Country
): { pollingChange: number; newsEvents: string[] } {
  const newsEvents: string[] = [];
  
  // Calculate polling impact BEFORE applying the changes
  let voterAlignment = 0;
  
  if (DEBUG) {
    console.log(`DEBUG: Calculating voter alignment for effects: ${JSON.stringify(effect)}`);
  }
  
  const voterPreferenceAnalysis: string[] = [];
  
  for (const [valueKey, change] of Object.entries(effect)) {
    if (valueKey in countryData.vals && change !== undefined) {
      const voterPosition = countryData.vals[valueKey as keyof PoliticalValues];
      
      // Find player's CURRENT position on this issue
      const valueIndex = VALUES.indexOf(valueKey as any);
      if (valueIndex !== -1) {
        const playerOldPosition = playerCandidate.vals[valueIndex];
        const playerNewPosition = Math.max(-100, Math.min(100, playerOldPosition + change));
        
        // Calculate how much closer/further this moves player to voter center
        const distanceBefore = Math.abs(voterPosition - playerOldPosition);
        const distanceAfter = Math.abs(voterPosition - playerNewPosition);
        const alignmentChange = distanceBefore - distanceAfter;
        voterAlignment += alignmentChange;
        
        if (DEBUG) {
          console.log(`DEBUG: ${valueKey}: voter=${voterPosition}, old=${playerOldPosition}, new=${playerNewPosition}`);
          console.log(`DEBUG: distance_before=${distanceBefore}, distance_after=${distanceAfter}, alignment_change=${alignmentChange}`);
        }
        
        // Analyze voter preference trends for news
        if (Math.abs(change) >= 5) { // this is an absolute number from -100 to 100 of the change of the corresponding value
          if (alignmentChange > 0) { // Moving closer to voter preference
            const nameChoice = Math.random() > 0.5 ? playerCandidate.party : playerCandidate.name;
            
            switch (valueKey) {
              case "soc_cap":
                if (voterPosition > playerOldPosition) {
                  voterPreferenceAnalysis.push(`${nameChoice}'s pro-business stance is praised by voters as a key driver for economic growth and job creation.`);
                } else {
                  voterPreferenceAnalysis.push(`Voters applaud ${nameChoice}'s commitment to increased social spending as a move toward a fairer society.`);
                }
                break;
              case "prog_cons":
                if (voterPosition > playerOldPosition) {
                  voterPreferenceAnalysis.push(`${nameChoice}'s messaging on traditional values resonates with voters seeking stability and a strong moral foundation.`);
                } else {
                  voterPreferenceAnalysis.push(`Progressive reforms advocated by ${nameChoice} are embraced by voters as a step towards a more inclusive, forward-thinking society.`);
                }
                break;
              case "env_eco":
                if (voterPosition < playerOldPosition) {
                  voterPreferenceAnalysis.push(`Environmental protection proposals by ${nameChoice} are hailed as a responsible and necessary approach for a sustainable future.`);
                } else {
                  voterPreferenceAnalysis.push(`Voters support ${nameChoice}'s focus on economic development, believing it will bring prosperity and new opportunities.`);
                }
                break;
              case "nat_glob":
                if (voterPosition < playerOldPosition) {
                  voterPreferenceAnalysis.push(`${nameChoice}'s 'nation-first' approach is popular with voters who want to prioritize domestic issues and strengthen national identity.`);
                } else {
                  voterPreferenceAnalysis.push(`A stance favoring global cooperation by ${nameChoice} is commended by voters as essential for addressing worldwide challenges.`);
                }
                break;
              case "pac_mil":
                if (voterPosition > playerOldPosition) {
                  voterPreferenceAnalysis.push(`Calls for a stronger defense from ${nameChoice} gain support from voters who see it as vital for ensuring national security.`);
                } else {
                  voterPreferenceAnalysis.push(`Peace advocacy from ${nameChoice} is praised by voters as the most effective path to long-term stability and international respect.`);
                }
                break;
              case "auth_ana":
                if (voterPosition < playerOldPosition) {
                  voterPreferenceAnalysis.push(`${nameChoice}'s strong law-and-order platform is popular with voters who desire safer communities and public stability.`);
                } else {
                  voterPreferenceAnalysis.push(`Libertarian-leaning proposals by ${nameChoice} energize voters who champion individual freedom and limited government.`);
                }
                break;
              case "rel_sec":
                if (voterPosition < playerOldPosition) {
                  voterPreferenceAnalysis.push(`An emphasis on religious values by ${nameChoice} connects with voters who appreciate a focus on moral and ethical principles.`);
                } else {
                  voterPreferenceAnalysis.push(`Secular policy positions from ${nameChoice} gain favor with voters who support inclusive governance for all beliefs.`);
                }
                break;
              // Add more cases as needed
            }
          }
          else { // If alignment change is negative, away from the voters
            const nameChoice = Math.random() > 0.5 ? playerCandidate.party : playerCandidate.name;
            
            switch (valueKey) {
              case "soc_cap":
                if (voterPosition < playerOldPosition) {
                  voterPreferenceAnalysis.push(`Voters criticize ${nameChoice}'s recent stance as too favorable to big business at the expense of workers.`);
                } else {
                  voterPreferenceAnalysis.push(`Concerns rise over ${nameChoice}'s push for increased social spending with critics warning of economic drawbacks.`);
                }
                break;
              case "prog_cons":
                if (voterPosition < playerOldPosition) {
                  voterPreferenceAnalysis.push(`Traditional values messaging from ${nameChoice} is met with skepticism, as many voters see it as out of touch with modern society.`);
                } else {
                  voterPreferenceAnalysis.push(`Progressive reforms advocated by ${nameChoice} face backlash from segments of the electorate wary of rapid social change.`);
                }
                break;
              case "env_eco":
                if (voterPosition > playerOldPosition) {
                  voterPreferenceAnalysis.push(`Environmental protection proposals by ${nameChoice} are criticized as unrealistic and potentially harmful to economic growth.`);
                } else {
                  voterPreferenceAnalysis.push(`Economic development focus from ${nameChoice} draws criticism for neglecting urgent environmental concerns.`);
                }
                break;
              case "nat_glob":
                if (voterPosition > playerOldPosition) {
                  voterPreferenceAnalysis.push(`Nationalist rhetoric from ${nameChoice} sparks fears of isolationism and international backlash.`);
                } else {
                  voterPreferenceAnalysis.push(`Global cooperation stance by ${nameChoice} is criticized as undermining national sovereignty and local interests.`);
                }
                break;
              case "pac_mil":
                if (voterPosition < playerOldPosition) {
                  voterPreferenceAnalysis.push(`Calls for stronger defense by ${nameChoice} are seen as warmongering and risk escalating conflicts.`);
                } else {
                  voterPreferenceAnalysis.push(`Peace advocacy from ${nameChoice} is criticized as naive and potentially weakening national security.`);
                }
                break;
              case "auth_ana":
                if (voterPosition > playerOldPosition) {
                  voterPreferenceAnalysis.push(`Law-and-order promises from ${nameChoice} raise concerns about overreach and threats to civil liberties.`);
                } else {
                  voterPreferenceAnalysis.push(`Libertarian-leaning proposals by ${nameChoice} are criticized for potentially undermining effective governance.`);
                }
                break;
              case "rel_sec":
                if (voterPosition > playerOldPosition) {
                  voterPreferenceAnalysis.push(`Emphasis on religious values by ${nameChoice} is met with criticism for alienating secular voters and minority faiths.`);
                } else {
                  voterPreferenceAnalysis.push(`Secular policy positions from ${nameChoice} spark backlash among religious communities who feel their traditions are being sidelined.`);
                }
                break;
              // Add more cases as needed
            }
          }
        }
      }
    }
  }
  
  // NOW apply the changes to the candidate
  for (let i = 0; i < VALUES.length; i++) {
    const valueKey = VALUES[i];
    if (valueKey in effect && effect[valueKey] !== undefined) {
      const oldVal = playerCandidate.vals[i];
      playerCandidate.vals[i] += effect[valueKey]!;
      // Clamp values to valid range
      playerCandidate.vals[i] = Math.max(-100, Math.min(100, playerCandidate.vals[i]));
      
      if (DEBUG) {
        console.log(`DEBUG: Changed ${valueKey} from ${oldVal} to ${playerCandidate.vals[i]}`);
      }
    }
  }
  
  // Convert voter alignment to polling change
  const baseChange = voterAlignment / 30.0;
  let pollingChange = baseChange * (boost / 12.0);
  
  // Add moderate randomness for event uncertainty
  const randomFactor = (Math.random() - 0.5) * 2; // -1.0 to 1.0
  pollingChange += randomFactor;
  
  // Simplified minimum effect logic
  if (Math.abs(pollingChange) < 0.5) {
    const sign = boost >= 0 ? 1 : -1;
    const minimumEffect = sign * Math.abs(boost) / 30.0;
    pollingChange = minimumEffect;
  }
  
  // Cap maximum polling change
  pollingChange = Math.max(-5.0, Math.min(5.0, pollingChange));
  
  // Apply polling change with proper bounds checking
  const oldPopularity = playerCandidate.party_pop;
  playerCandidate.party_pop += pollingChange;
  
  // Ensure party popularity stays within reasonable bounds
  if (playerCandidate.party_pop > 100) {
    playerCandidate.party_pop = 100;
  } else if (playerCandidate.party_pop < -50) {
    playerCandidate.party_pop = -50;
  }
  
  // Generate news based on voter preference analysis
  if (voterPreferenceAnalysis.length > 0) {
    newsEvents.push(...voterPreferenceAnalysis.slice(0, 2)); // Max 2 items
  }
  
  // Generate news based on polling impact
  if (Math.abs(pollingChange) > 2) {
    if (pollingChange > 0) {
      const surgeMessages = [
        `${playerCandidate.party} surges in polls`,
        `${playerCandidate.party} enjoys a new wave of support`,
        `Polls show a sharp rise for ${playerCandidate.party}`,
        `Momentum shifts in favor of ${playerCandidate.party}`
      ];
      newsEvents.push(surgeMessages[Math.floor(Math.random() * surgeMessages.length)]);
    } else {
      const loseMessages = [
        `${playerCandidate.party} loses ground following controversial policy`,
        `Support for ${playerCandidate.party} drops sharply`,
        `Polls decline for ${playerCandidate.party} amid public backlash`,
        `${playerCandidate.party} faces harsh criticism `
      ];
      newsEvents.push(loseMessages[Math.floor(Math.random() * loseMessages.length)]);
    }
  } else if (Math.abs(pollingChange) > 0.5) {
    if (voterAlignment > 0) {
      const adjustMessages = [
        `${playerCandidate.party} steadily climbs in polls`,
        `${playerCandidate.party} wins local elections`,
        `Analysts say ${playerCandidate.party} shifting policy positions`,
        `${playerCandidate.party} makes clear changes to connect with voters`
      ];
      newsEvents.push(adjustMessages[Math.floor(Math.random() * adjustMessages.length)]);
    } else {
      const mixedMessages = [
        `Mixed voter reaction to ${playerCandidate.party}'s latest policy`,
        `Public opinion divided over ${playerCandidate.party}'s recent announcement.`,
        `Voters express uncertainty about ${playerCandidate.party}'s direction.`,
        `The electorate remains split on ${playerCandidate.party}'s new proposals.`
      ];
      newsEvents.push(mixedMessages[Math.floor(Math.random() * mixedMessages.length)]);
    }
  }
  
  if (DEBUG) {
    console.log(`DEBUG: Voter alignment: ${voterAlignment.toFixed(2)}, Boost: ${boost}`);
    console.log(`DEBUG: Final polling change: ${pollingChange.toFixed(2)}`);
    console.log(`DEBUG: Party popularity changed from ${oldPopularity.toFixed(2)} to ${playerCandidate.party_pop.toFixed(2)}`);
  }
  
  return { pollingChange, newsEvents };
}
