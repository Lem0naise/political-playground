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
    newsEvents.push("Campaign season officially begins as parties establish their platforms.");
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
// General Political Events
"Leaked messages from former Finance Minister reveal clandestine negotiations with corporate lobbyists.",
"Cross-party infrastructure bill gains unexpected support from deputies in marginal constituencies.",
"Voter registration surges by 34% in university towns following a viral social media mobilization campaign.",
"Electoral commission announces a controversial multi-party debate format with live, AI-powered fact-checking.",
"The 'Green Alliance' party endorses a rival candidate, fracturing the environmental voting bloc.",
"Secret coalition negotiations revealed as three minor parties discuss forming a 'government of national unity'.",
"Campaign Finance Transparency Act passes a key legislative hurdle despite fierce opposition.",
"A snap election is called after the government loses a crucial no-confidence vote by a single ballot.",
"The nation's High Court agrees to hear a case challenging the legality of new voter ID laws.",
"Rural communities form a political action group to protest new agricultural water usage quotas.",
"The Head of State's ceremonial visit to a former colony is met with protests demanding reparations.",
"Anti-corruption prosecutor files charges against three sitting Members of Parliament (MPs).",
"Debate rages over lowering the national voting age to 16, splitting the ruling coalition.",

// Economic Events
"Global tech giant 'OmniCorp' shares plummet 23% amid fears of pension fund exposure to volatile crypto markets.",
"Unemployment in former industrial regions drops to 4.2%, while capital city unemployment climbs to 7.8%.",
"The National Chamber of Commerce confidence index reaches an 18-month high following deregulation announcements.",
"Average home prices soar to 847,000 local currency units as the government debates a foreign buyer's tax.",
"Trade negotiations with the 'East Pacific Trade Bloc' enter a final, tense phase over fishing rights.",
"The 'Silicon Steppe' tech hub reports 15% annual job growth, while traditional manufacturing stagnates.",
"Consumer Price Index rises 0.9% in a month as energy costs spike following a major port workers' strike.",
"Agricultural exports face a new 20% tariff after a diplomatic dispute over intellectual property.",
"Discovery of massive rare earth mineral deposits sparks an economic boom in a remote northern province.",
"Tourism revenue rebounds to 94% of pre-pandemic levels following the successful 'World Expo' event.",
"The central bank unexpectedly raises interest rates by 50 basis points to combat spiraling inflation.",

// Social & Cultural Issues
"Emergency room wait times average 6 hours, making healthcare reform the defining election issue.",
"The National Teachers' Union mobilizes 25,000 members for a march on the capital demanding better pay.",
"A national debate erupts over revising history textbooks to include the state's role in colonial-era atrocities.",
"Deepfake videos of political leaders prompt an emergency session on misinformation and election integrity.",
"A prominent religious leader calls for interfaith dialogue following politically motivated vandalism at a historic temple.",
"The national language preservation society receives a major grant to digitize ancient and dying dialects.",
"The national symphony orchestra faces closure due to funding cuts, sparking public outcry and a private donation drive.",
"Internationally acclaimed musician's endorsement video reaches 15 million views, shifting youth opinion polls.",
"The country's most famous football star is arrested on tax evasion charges, dominating the news cycle.",
"Archaeological dig unearths ruins of a previously unknown ancient civilization, forcing a halt to a major dam project.",

// International & Geopolitical Affairs
"A Global Climate Summit concludes with heated exchanges over carbon credit trading and aid to developing nations.",
"Border authorities report a sharp increase in smuggling attempts following a neighboring country's economic collapse.",
"The foreign aid budget faces opposition from nationalist parties citing domestic priorities.",
"International election observers from 20 countries praise the nation's new biometric voter verification system.",
"A state-sponsored cyberattack targets the national power grid, causing rolling blackouts in three major cities.",
"Amnesty report on human rights abuses in a neighboring state strains diplomatic ties and threatens a trade deal.",
"Tensions rise over disputed fishing waters in the Cerulean Sea after a naval patrol vessel is rammed.",
"The nation recalls its ambassador from a regional power following public accusations of espionage.",
"Joint military exercises by the 'Jade Dragon Alliance' demonstrate new drone and hypersonic capabilities.",
"Student exchange programs with a bloc of 15 nations expand to include vocational and technical training.",

// Environmental & Scientific Issues
"Category 5 Typhoon 'Amihan' highlights coastal infrastructure vulnerabilities and slow government response.",
"Residents of the Verde Valley protest a planned 400-megawatt solar installation over loss of fertile farmland.",
"The capital's water authority implements Stage 4 restrictions as reservoir levels drop to a record 28% capacity.",
"Laws protecting the critically endangered mountain gorilla trigger debate between conservationists and mining interests.",
"A sudden, unexplained decline in bee populations threatens the nation's multi-billion dollar agricultural sector.",
"Air quality alerts issued for the eighth consecutive day as smoke from continental wildfires blankets major cities.",
"A volcanic eruption in the Azure Islands disrupts global air travel for weeks, stranding thousands.",
"The international space agency announces a joint mission with two other nations to land humans on Mars.",
"Scientific journal retracts a landmark study on AI consciousness after accusations of data fabrication.",
"Ocean cleanup initiative removes 15 tons of plastic from a major river delta before it can reach the sea.",

// Technology & Random Events
"The national AI oversight board proposes mandatory algorithm audits for all public-facing government services.",
"A massive, coordinated cyber-heist drains millions from the national banking system, forcing a temporary shutdown.",
"A strange atmospheric phenomenon creates stunning, unexplained auroras visible across the entire country.",
"National 'cheese crisis' looms as a bacterial blight affects 90% of the country's dairy herds.",
"A cryptic online puzzle posted by an anonymous user captivates millions, with participants collaborating to solve it.",
"The rollout of a national digital ID system is paused after a data breach exposes 500,000 citizens' information.",
"A sudden fashion trend for wearing traditional folk hats, sparked by a pop star, causes a nationwide shortage.",
"The beloved giant panda at the National Zoo gives birth to twins, providing a rare moment of national unity.",
"A 400-year-old shipwreck containing priceless artifacts is discovered by a commercial fishing vessel.",
"A flock of migratory birds, thousands strong, unexpectedly diverts and settles in the capital city's main park.",
];

const ECONOMIC_CRISIS_EVENTS = [
"GlobalManufacturing announces the closure of three plants, affecting 12,000 workers across the industrial heartland.",
"The nation's largest bank restricts all new commercial lending as credit default rates climb to a decade high of 9.1%.",
"A critical semiconductor shortage forces automotive and electronics assembly lines to halt production indefinitely.",
"The national currency weakens 15% against a basket of international currencies, causing import costs to skyrocket.",
"Commercial real estate values drop 25% as remote work policies leave downtown office towers half-empty.",
"Small and medium-sized enterprises (SMEs) report a 40% revenue decline due to supply chain and energy cost crises.",
"The national debt-to-GDP ratio reaches 130%, triggering an automatic, painful review of all public spending.",
"Economic growth projections are slashed from 2.1% to -1.5% following a second consecutive quarter of contraction.",
];

const ECONOMIC_OPTIMISM_EVENTS = [
"An international automotive giant announces a 3 billion-credit electric vehicle battery plant, creating 9,000 jobs.",
"Unemployment plummets to 2.9%, a 50-year low, as job openings far exceed the number of available workers.",
"Manufacturing export orders surge 30% following a landmark new trade agreement with a major economic bloc.",
"AI-driven productivity tools boost worker output by 18% across the service sector, leading to wage growth.",
"Consumer confidence reaches a 20-year high as household savings rates stabilize and inflation fears recede.",
"Domestic bank lending to small businesses increases 25%, funding thousands of local expansion projects.",
"A massive national infrastructure program begins, creating 50,000 jobs to rebuild rail lines, ports, and grids.",
"Economic indicators signal sustained 3.5% annual growth, driven by innovation and strong export performance.",
];

const POLARIZATION_EVENTS = [
"The High Court's narrow 5-4 ruling on abortion access triggers massive, competing demonstrations across the country.",
"A proposed 'Religious Freedom Act' sparks interfaith tensions, with leaders issuing contradictory public letters.",
"Immigration enforcement raids in three cities create community standoffs between national police and local residents.",
"A controversial professor's lecture on national identity is cancelled after violent clashes erupt on campus.",
"Heated debates over same-sex marriage rights intensify as the issue heads for a binding national referendum.",
"Calls for a 'Constituent Assembly' to rewrite the constitution gain traction, deeply dividing political parties.",
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
                  voterPreferenceAnalysis.push(`Voters applaud ${nameChoice}'s commitment to increased social spending and worker protections as a move toward a fairer society.`);
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
                  voterPreferenceAnalysis.push(`Concerns rise over ${nameChoice}'s push for increased social spending and worker protections, with critics warning of economic drawbacks.`);
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
        `${playerCandidate.party} surges as their stance connects with key voter concerns.`,
        `${playerCandidate.party} enjoys a wave of support following recent campaign moves.`,
        `Polls show a sharp rise for ${playerCandidate.party} after their latest announcement.`,
        `Momentum shifts in favor of ${playerCandidate.party} as voters respond positively.`
      ];
      newsEvents.push(surgeMessages[Math.floor(Math.random() * surgeMessages.length)]);
    } else {
      const loseMessages = [
        `${playerCandidate.party} loses ground following controversial policy position.`,
        `Support for ${playerCandidate.party} drops sharply after recent missteps.`,
        `Polls show a significant decline for ${playerCandidate.party} amid public backlash.`,
        `${playerCandidate.party} faces criticism as their popularity takes a hit.`
      ];
      newsEvents.push(loseMessages[Math.floor(Math.random() * loseMessages.length)]);
    }
  } else if (Math.abs(pollingChange) > 0.5) {
    if (voterAlignment > 0) {
      const adjustMessages = [
        `${playerCandidate.party} is improving their strategy to better align with public opinion.`,
        `${playerCandidate.party} tweaks campaign messaging in response to voter feedback.`,
        `Analysts note ${playerCandidate.party} is shifting positions to appeal to more voters.`,
        `${playerCandidate.party} makes clear changes to connect with the electorate.`
      ];
      newsEvents.push(adjustMessages[Math.floor(Math.random() * adjustMessages.length)]);
    } else {
      const mixedMessages = [
        `Mixed voter reaction to ${playerCandidate.party}'s latest policy stance.`,
        `Public opinion is divided over ${playerCandidate.party}'s recent announcement.`,
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
