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
  
  // Bandwagon effect news
  if (leader.party_pop > 20) {
    newsEvents.push(`${leader.party} consolidates frontrunner status as voters rally behind clear leader.`);
  } else if (leader.party_pop < 5) {
    newsEvents.push("Close race continues with no clear frontrunner emerging.");
  }
  
  return newsEvents;
}

const RANDOM_NEWS_EVENTS = [
  // General Political Events
  "Former Treasury Secretary's leaked emails reveal behind-the-scenes campaign strategy discussions.",
  "Bipartisan Infrastructure Reform Act gains unexpected support from 12 swing district representatives.",
  "Voter registration surges by 34% in college towns following TikTok mobilization campaign.",
  "Presidential debate commission announces controversial town hall format with live fact-checking display.",
  "Popular independent mayor Sarah Chen endorses surprise candidate after months of speculation.",
  "Secret coalition negotiations revealed as three minor parties discuss joint manifesto.",
  "Campaign Finance Transparency Bill passes committee vote 8-5 despite fierce lobbying opposition.",
  "Political advertising spending hits $2.3 billion mark, breaking all previous election records.",
  "University of Westfield reports 89% student registration rate following campus voter drives.",
  "Rural farming communities unite against proposed urban development tax incentives.",
  
  // Economic Events
  "TechCorp shares plummet 23% amid fears of pension fund exposure to volatile markets.",
  "Regional unemployment drops to 4.2% while metropolitan areas struggle at 7.8%.",
  "Local Chamber of Commerce confidence index reaches 78-point high following tax reform announcements.",
  "Average home prices soar to $847,000 as City Council debates emergency rent control measures.",
  "Free trade negotiations with Northland Republic enter final phase despite tariff disputes.",
  "Silicon Valley tech jobs grow 15% annually while manufacturing employment stagnates at -2%.",
  "Consumer Price Index rises 0.7% monthly as energy costs spike following pipeline maintenance.",
  "Agricultural exports face 18% tariff increase following trade dispute over fishing rights.",
  "Midwest Manufacturing announces $450 million expansion creating 3,200 jobs over two years.",
  "Tourism revenue rebounds to 94% of pre-pandemic levels following festival season success.",
  
  // Social Issues
  "Emergency room wait times average 4.7 hours as healthcare becomes defining campaign issue.",
  "Teachers' union mobilizes 15,000 members for education funding march on State Capitol.",
  "Immigration processing backlog reaches 180,000 cases as border town mayors demand federal action.",
  "Deepfake political advertisements prompt emergency session on election integrity measures.",
  "Archbishop Martinez calls for interfaith dialogue following vandalism at three local mosques.",
  "Equal Pay Initiative gains momentum with endorsements from 47 major corporations.",
  "Mental Health First Aid programs receive $23 million federal expansion funding.",
  "International Folk Festival draws record 85,000 visitors celebrating 40 different cultures.",
  "Professional soccer star Marcus Rodriguez's arrest overshadows policy debate for third consecutive day.",
  "Grammy winner Luna Vasquez endorsement video reaches 12 million views in 48 hours.",
  
  // International Affairs
  "G7 Climate Summit concludes with heated exchanges over carbon credit trading mechanisms.",
  "Border patrol agents report 23% increase in smuggling attempts following neighboring country's economic collapse.",
  "Foreign aid allocation of $2.8 billion faces opposition from deficit hawks citing domestic priorities.",
  "International election observers from 12 countries praise new voter verification technology.",
  "State-sponsored cyber attacks target power grid infrastructure in three metropolitan areas.",
  "Global Climate Accord negotiations stall over developing nation compensation demands.",
  "Syrian refugee crisis intensifies as 50,000 displaced persons seek emergency humanitarian assistance.",
  "Pacific Trade Partnership negotiations face setbacks over intellectual property protections.",
  "NATO joint exercises involve 15,000 troops demonstrating regional defense capabilities.",
  "Student exchange programs with European Union expand to include 50 additional universities.",
  
  // Environmental Issues
  "Category 4 Hurricane Miranda highlights coastal infrastructure vulnerabilities and adaptation funding gaps.",
  "Riverside County residents protest planned 400-megawatt solar installation over habitat concerns.",
  "Metropolitan water authority implements Stage 3 restrictions following reservoir levels dropping to 31%.",
  "Spotted owl protection laws trigger heated debate between conservationists and timber industry representatives.",
  "Offshore wind energy costs drop to $0.07 per kilowatt-hour, reaching grid parity milestone.",
  "Air quality alerts issued for sixth consecutive day as particulate matter exceeds federal standards.",
  "Yellowstone National Park funding faces $127 million shortfall threatening visitor services.",
  "Electric vehicle charging network expands by 340 stations following federal infrastructure investment.",
  "Municipal recycling programs achieve 73% diversion rate, surpassing state mandates two years early.",
  "International Ocean Cleanup Project removes 12 tons of plastic from Pacific garbage patch.",
  
  // Technology & Innovation
  "Federal AI Ethics Commission proposes mandatory algorithm audits for platforms with over 10 million users.",
  "Data breach at MegaCorp exposes personal information of 2.3 million citizens, triggering privacy law debate.",
  "5G network rollout reaches 67% coverage but faces resistance in 23 rural counties.",
  "Online voting pilot program in Jefferson County reports 94% satisfaction rate but faces security scrutiny.",
  "Venture capital funding for local startups reaches $340 million, highest quarterly total in state history.",
  "Digital homework gap affects 1.2 million students lacking reliable broadband access.",
  "Federal Reserve explores digital dollar proposal while crypto regulation remains in legislative limbo.",
  "SocialPlatform faces congressional hearing over political content moderation algorithms.",
  "Innovation District attracts $890 million international investment in biotechnology research facilities.",
  "Electronic health records upgrade affects 340 hospitals, improving patient data sharing capabilities.",
  
  // Local/Regional Events
  "Regional Development Authority approves $150 million fund allocation sparking fierce inter-city competition.",
  "Metro Rail expansion adds 23 miles of track, promising 18-minute downtown commute reduction.",
  "Chronicle Media Group files bankruptcy, threatening closure of 14 local newspapers.",
  "Riverside Community Center faces closure as city budget cuts eliminate $2.3 million social services funding.",
  "Historic Cathedral District receives $8.7 million federal preservation grant for 19th-century restoration.",
  "Public transportation fares increase 12% to $3.25, prompting commuter advocacy group protests.",
  "State University expansion plans include 4,500 additional students but face $67 million budget shortfall.",
  "Harvest Festival generates $12.4 million tourism revenue, boosting regional economic indicators.",
  "Municipal elections see 23% turnout, lowest in 16 years despite competitive mayoral race.",
  "Neighborhood watch programs report 31% crime reduction following community policing initiative.",
  
  // Campaign-Specific Events
  "Senator Patricia Williams withdraws candidacy citing family health concerns, reshuffling party primary.",
  "Grassroots volunteer network reaches 45,000 registered members, exceeding organizational targets by 280%.",
  "Campaign merchandise sales generate $1.8 million, with 'Unity Forward' slogan leading popularity polls.",
  "Candidate James Morrison's college scholarship controversy resurfaces through opposition research leak.",
  "Former Environmental Secretary Lisa Chang accused of policy reversal on mining regulations.",
  "Citizens for Democracy rally draws 23,000 supporters to State Capitol demanding election reform.",
  "Polling methodology faces criticism after three major surveys show 8-point variance in results.",
  "Campaign bus tour through Midwest generates unexpected enthusiasm in traditionally safe districts.",
  "Attack advertisements reach saturation point with voters reporting 'ad fatigue' in focus groups.",
  "Independent candidate Maria Santos gains 15% support following viral debate performance clip.",
  
  // Media & Information
  "FactCheck Alliance expands election coverage team by 40%, hiring specialists in economic policy analysis.",
  "Public Broadcasting funding becomes political flashpoint with $89 million budget under review.",
  "KWXR Radio implements equal airtime policy, providing 30-minute blocks to all qualified candidates.",
  "Investigative journalism uncovers $2.1 million unreported campaign expenditure through shell companies.",
  "Algorithm changes on social platforms affect political content reach for 12 million users.",
  "Regional newspaper circulation drops 34% as readership shifts to digital-only subscriptions.",
  "Political podcast 'Democracy Now' reaches 2.8 million weekly downloads, influencing mainstream discourse.",
  "Press freedom advocates rally against proposed journalist shield law restrictions affecting 230 reporters.",
  "Civic education initiative targets 180,000 first-time voters with nonpartisan information campaigns.",
  "Media bias study reveals 67% of voters consume news primarily from ideologically aligned sources."
];

const ECONOMIC_CRISIS_EVENTS = [
  "GlobalManufacturing announces closure of three plants affecting 12,000 workers across industrial corridor.",
  "First National Bank restricts commercial lending as credit default rates climb to 8.3%.",
  "Semiconductor shortage forces automotive assembly lines to reduce production by 40% through Q4.",
  "National currency weakens 12% against international basket, driving import costs up $2,400 per household.",
  "Commercial real estate values drop 18% as downtown occupancy rates fall to 52% post-pandemic levels.",
  "Main Street businesses report 34% revenue decline following supply chain disruptions and energy costs.",
  "Federal debt-to-GDP ratio reaches 127%, triggering automatic spending review mechanisms.",
  "Economic growth projections revised from 2.4% to -0.8% following three consecutive months of contraction."
];

const ECONOMIC_OPTIMISM_EVENTS = [
  "international automotive giant announces $2.3 billion electric vehicle plant creating 8,500 manufacturing jobs.",
  "Unemployment plummets to 3.1%, lowest rate since 1969, as job openings exceed available workers.",
  "Manufacturing export orders surge 28% following successful trade mission to Southeast Asian markets.",
  "AI productivity revolution boosts worker output 15% while reducing operational costs across service sectors.",
  "Consumer confidence reaches 142-point high as household savings rates stabilize at healthy 8.2%.",
  "Community bank lending increases 23% supporting 2,400 small business expansion projects.",
  "Infrastructure investment program creates 45,000 construction jobs rebuilding bridges, roads, and broadband networks.",
  "Economic indicators signal sustained 3.2% annual growth driven by innovation and international competitiveness."
];

const POLARIZATION_EVENTS = [
  "Supreme Court's 6-3 decision on reproductive rights triggers massive demonstrations in 47 state capitals.",
  "Religious Freedom Protection Act sparks interfaith tensions as religious leaders issue competing statements.",
  "Immigration enforcement raids in five cities create community standoffs between federal agents and local officials.",
  "Professor Jonathan Mitchell's free speech lecture at State University cancelled following 2,000-person protest.",
  "Traditional Marriage Coalition clashes with LGBTQ+ advocacy groups over adoption agency policies.",
  "Constitutional Convention debate intensifies as 28 states consider Article V amendment process.",
  "Columbus Day vs. Indigenous Peoples' Day controversy splits City Council in heated 6-5 vote.",
  "Confederate monument removal in downtown square prompts counter-protests and 47 arrests."
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
        if (Math.abs(change) >= 4) {
          if (alignmentChange > 0) { // Moving closer to voter preference
            const nameChoice = Math.random() > 0.5 ? playerCandidate.party : playerCandidate.name;
            
            switch (valueKey) {
              case "soc_cap":
                if (voterPosition > playerOldPosition) {
                  voterPreferenceAnalysis.push(`Voters favor more business-friendly economic policies following ${nameChoice}'s recent stance`);
                } else {
                  voterPreferenceAnalysis.push(`Public supports increased worker protections and social spending after ${nameChoice}'s position`);
                }
                break;
              case "prog_cons":
                if (voterPosition > playerOldPosition) {
                  voterPreferenceAnalysis.push(`Traditional values resonate strongly with the electorate as ${nameChoice} connects with conservative voters`);
                } else {
                  voterPreferenceAnalysis.push(`Progressive social reforms gain popular support following ${nameChoice}'s advocacy`);
                }
                break;
              case "env_eco":
                if (voterPosition < playerOldPosition) {
                  voterPreferenceAnalysis.push(`Environmental protection emerges as key voter priority after ${nameChoice}'s green stance`);
                } else {
                  voterPreferenceAnalysis.push(`Economic development concerns outweigh environmental issues as voters support ${nameChoice}'s approach`);
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
      newsEvents.push(`${playerCandidate.party} surges as their stance connects with key voter concerns.`);
    } else {
      newsEvents.push(`${playerCandidate.party} loses ground following controversial policy position.`);
    }
  } else if (Math.abs(pollingChange) > 0.5) {
    if (voterAlignment > 0) {
      newsEvents.push(`${playerCandidate.party} adjusts strategy to better align with public opinion.`);
    } else {
      newsEvents.push(`Mixed voter reaction to ${playerCandidate.party}'s latest policy stance.`);
    }
  }
  
  if (DEBUG) {
    console.log(`DEBUG: Voter alignment: ${voterAlignment.toFixed(2)}, Boost: ${boost}`);
    console.log(`DEBUG: Final polling change: ${pollingChange.toFixed(2)}`);
    console.log(`DEBUG: Party popularity changed from ${oldPopularity.toFixed(2)} to ${playerCandidate.party_pop.toFixed(2)}`);
  }
  
  return { pollingChange, newsEvents };
}
