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
        if (Math.random() < 0.5) {
          voterPreferenceAnalysis.push(`${nameChoice}'s Pro-Business Stance Boosts Voter Confidence`);
        } else {
          voterPreferenceAnalysis.push(`Voters Applaud ${nameChoice}'s Economic Growth Agenda`);
        }
      } else {
        if (Math.random() < 0.5) {
          voterPreferenceAnalysis.push(`${nameChoice}'s Social Spending Push Resonates with Voters`);
        } else {
          voterPreferenceAnalysis.push(`Public Backs ${nameChoice}'s Vision for a Fairer Society`);
        }
      }
      break;
    case "prog_cons":
      if (voterPosition > playerOldPosition) {
        if (Math.random() < 0.5) {
          voterPreferenceAnalysis.push(`Voters Rally Around ${nameChoice}'s Traditional Values Platform`);
        } else {
          voterPreferenceAnalysis.push(`${nameChoice}'s 'Moral Foundation' Message Strikes a Chord`);
        }
      } else {
        if (Math.random() < 0.5) {
          voterPreferenceAnalysis.push(`${nameChoice}'s Progressive Reforms Lauded as 'Forward-Thinking'`);
        } else {
          voterPreferenceAnalysis.push(`Voters Embrace ${nameChoice}'s Push for an Inclusive Society`);
        }
      }
      break;
    case "env_eco":
      if (voterPosition < playerOldPosition) {
        if (Math.random() < 0.5) {
          voterPreferenceAnalysis.push(`${nameChoice}'s Green Policies Hailed as Key to Sustainable Future`);
        } else {
          voterPreferenceAnalysis.push(`Voters Support ${nameChoice}'s Strong Stance on Environment`);
        }
      } else {
        if (Math.random() < 0.5) {
          voterPreferenceAnalysis.push(`${nameChoice}'s Pro-Development Focus Promises Prosperity`);
        } else {
          voterPreferenceAnalysis.push(`Economic Development a Winning Issue for ${nameChoice}, Say Voters`);
        }
      }
      break;
    case "nat_glob":
      if (voterPosition < playerOldPosition) {
        if (Math.random() < 0.5) {
          voterPreferenceAnalysis.push(`'Nation-First' Agenda from ${nameChoice} Gains Traction`);
        } else {
          voterPreferenceAnalysis.push(`Voters Back ${nameChoice}'s 'Domestic First' Approach`);
        }
      } else {
        if (Math.random() < 0.5) {
          voterPreferenceAnalysis.push(`${nameChoice}'s Global Cooperation Stance Seen as Essential`);
        } else {
          voterPreferenceAnalysis.push(`Support Grows for ${nameChoice}'s Internationalist Vision`);
        }
      }
      break;
    case "pac_mil":
      if (voterPosition > playerOldPosition) {
        if (Math.random() < 0.5) {
          voterPreferenceAnalysis.push(`Voters Back ${nameChoice}'s Call for Stronger National Defense`);
        } else {
          voterPreferenceAnalysis.push(`Public Support Grows for ${nameChoice}'s Military Readiness Push`);
        }
      } else {
        if (Math.random() < 0.5) {
          voterPreferenceAnalysis.push(`Peace-First Policy by ${nameChoice} Earns Widespread Praise`);
        } else {
          voterPreferenceAnalysis.push(`Voters See ${nameChoice}'s Diplomacy Push as Path to Stability`);
        }
      }
      break;
    case "auth_ana":
      if (voterPosition < playerOldPosition) {
        if (Math.random() < 0.5) {
          voterPreferenceAnalysis.push(`${nameChoice}'s Law-and-Order Platform Resonates in Polls`);
        } else {
          voterPreferenceAnalysis.push(`Public Backs ${nameChoice}'s Pledge for Safer Communities`);
        }
      } else {
        if (Math.random() < 0.5) {
          voterPreferenceAnalysis.push(`'Individual Freedom' a Rallying Cry for ${nameChoice}'s Supporters`);
        } else {
          voterPreferenceAnalysis.push(`${nameChoice}'s Libertarian Stance Energizes Voter Base`);
        }
      }
      break;
    case "rel_sec":
      if (voterPosition < playerOldPosition) {
        if (Math.random() < 0.5) {
          voterPreferenceAnalysis.push(`${nameChoice}'s Emphasis on Faith and Values Connects with Voters`);
        } else {
          voterPreferenceAnalysis.push(`Voters Applaud ${nameChoice}'s Focus on a Moral Compass`);
        }
      } else {
        if (Math.random() < 0.5) {
          voterPreferenceAnalysis.push(`Support for Secular Governance Grows with ${nameChoice}'s Policies`);
        } else {
          voterPreferenceAnalysis.push(`${nameChoice}'s Inclusive Stance Wins Favor with Secular Voters`);
        }
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
        if (Math.random() < 0.5) {
          voterPreferenceAnalysis.push(`${nameChoice} Under Fire for Being 'Too Pro-Business'`);
        } else {
          voterPreferenceAnalysis.push(`Voters Say ${nameChoice} Favors Big Business Over Workers`);
        }
      } else {
        if (Math.random() < 0.5) {
          voterPreferenceAnalysis.push(`${nameChoice}'s Spending Plans Raise Economic Red Flags`);
        } else {
          voterPreferenceAnalysis.push(`Critics Blast ${nameChoice}'s Spending Push as 'Reckless'`);
        }
      }
      break;
    case "prog_cons":
      if (voterPosition < playerOldPosition) {
        if (Math.random() < 0.5) {
          voterPreferenceAnalysis.push(`${nameChoice}'s Traditional Values Message Seen as 'Out of Touch'`);
        } else {
          voterPreferenceAnalysis.push(`Voters Skeptical of ${nameChoice}'s Conservative Pivot`);
        }
      } else {
        if (Math.random() < 0.5) {
          voterPreferenceAnalysis.push(`Backlash Grows Against ${nameChoice}'s Progressive Reforms`);
        } else {
          voterPreferenceAnalysis.push(`${nameChoice} Accused of Pushing 'Too Much, Too Fast' on Social Change`);
        }
      }
      break;
    case "env_eco":
      if (voterPosition > playerOldPosition) {
        if (Math.random() < 0.5) {
          voterPreferenceAnalysis.push(`${nameChoice}'s Green Agenda Slammed as 'Job-Killer'`);
        } else {
          voterPreferenceAnalysis.push(`Critics Warn ${nameChoice}'s Eco-Policies Will Harm Economy`);
        }
      } else {
        if (Math.random() < 0.5) {
          voterPreferenceAnalysis.push(`${nameChoice} Criticized for Prioritizing Economy Over Environment`);
        } else {
          voterPreferenceAnalysis.push(`Environmental Groups Denounce ${nameChoice}'s 'Development-First' Stance`);
        }
      }
      break;
    case "nat_glob":
      if (voterPosition > playerOldPosition) {
        if (Math.random() < 0.5) {
          voterPreferenceAnalysis.push(`${nameChoice}'s 'Nation-First' Rhetoric Sparks Isolationism Fears`);
        } else {
          voterPreferenceAnalysis.push(`Critics Warn ${nameChoice}'s Nationalism Risks Global Standing`);
        }
      } else {
        if (Math.random() < 0.5) {
          voterPreferenceAnalysis.push(`${nameChoice} Attacked for 'Globalist' Agenda, Undermining Sovereignty`);
        } else {
          voterPreferenceAnalysis.push(`Voters Fear ${nameChoice} Puts Global Interests Before National Ones`);
        }
      }
      break;
    case "pac_mil":
      if (voterPosition < playerOldPosition) {
        if (Math.random() < 0.5) {
          voterPreferenceAnalysis.push(`Critics Label ${nameChoice}'s Defense Stance as 'Warmongering'`);
        } else {
          voterPreferenceAnalysis.push(`Fears of Conflict Escalate Over ${nameChoice}'s Hawkish Tone`);
        }
      } else {
        if (Math.random() < 0.5) {
          voterPreferenceAnalysis.push(`${nameChoice}'s Peace Advocacy Slammed as 'Naive' and 'Weak'`);
        } else {
          voterPreferenceAnalysis.push(`National Security Concerns Rise Over ${nameChoice}'s Pacifist Stance`);
        }
      }
      break;
    case "auth_ana":
      if (voterPosition > playerOldPosition) {
        if (Math.random() < 0.5) {
          voterPreferenceAnalysis.push(`Civil Liberties Fears Mount Over ${nameChoice}'s 'Law-and-Order' Platform`);
        } else {
          voterPreferenceAnalysis.push(`${nameChoice} Accused of 'Authoritarian Creep' by Critics`);
        }
      } else {
        if (Math.random() < 0.5) {
          voterPreferenceAnalysis.push(`Think Tank: ${nameChoice}'s Libertarian Push Is 'Recipe for Chaos'`);
        } else {
          voterPreferenceAnalysis.push(`Voters Question if ${nameChoice}'s 'Freedom' Agenda is Practical`);
        }
      }
      break;
    case "rel_sec":
      if (voterPosition > playerOldPosition) {
        if (Math.random() < 0.5) {
          voterPreferenceAnalysis.push(`${nameChoice} Faces Backlash for Blurring Line Between Church and State`);
        } else {
          voterPreferenceAnalysis.push(`Critics: ${nameChoice}'s Religious Focus Alienates Voters`);
        }
      } else {
        if (Math.random() < 0.5) {
          voterPreferenceAnalysis.push(`${nameChoice}'s Secular Stance Sparks Outcry from Religious Groups`);
        } else {
          voterPreferenceAnalysis.push(`Faith Communities Feel 'Sidelined' by ${nameChoice}'s Policies`);
        }
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

  
  if (DEBUG) {
    console.log(`DEBUG: Voter alignment: ${voterAlignment.toFixed(2)}, Boost: ${boost}`);
    console.log(`DEBUG: Final polling change: ${pollingChange.toFixed(2)}`);
    console.log(`DEBUG: Party popularity changed from ${oldPopularity.toFixed(2)} to ${playerCandidate.party_pop.toFixed(2)}`);
  }
  
  return { pollingChange, newsEvents };
}
