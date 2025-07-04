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
    
    // Ensure it doesn't go below minimum threshold
    if (candidate.party_pop < -50) {
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

export function applyVoterDynamics(data: number[][], pollIteration: number): string[] {
  const newsEvents: string[] = [];
  
  if (pollIteration === 1) {
    return newsEvents; // No changes for baseline poll
  }
  
  // Economic anxiety factor - affects economic issues more
  let economicAnxiety = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
  let economicCrisis = false;
  if (Math.random() < 0.1) { // 10% chance of significant economic uncertainty
    economicAnxiety = 0.5 + Math.random() * 1.3; // 0.5 to 1.8
    economicCrisis = true;
    if (economicAnxiety > 1.4) {
      newsEvents.push("Economic turmoil creates uncertainty as markets decline and unemployment rises.");
    } else if (economicAnxiety < 0.7) {
      newsEvents.push("Economic optimism grows as positive indicators emerge across key sectors.");
    }
  }
  
  // Social polarization events
  const polarizationEvent = Math.random() < 0.08; // 8% chance
  const polarizationStrength = polarizationEvent ? 1.2 + Math.random() * 0.8 : 1.0; // 1.2 to 2.0
  
  if (polarizationEvent) {
    if (polarizationStrength > 1.5) {
      newsEvents.push("Social tensions rise as polarizing issues dominate public discourse.");
    } else {
      newsEvents.push("Ideological divides become more pronounced in political discussions.");
    }
  }
  
  // Apply small random changes to voter opinions
  for (let voterIndex = 0; voterIndex < data[0].length; voterIndex++) {
    for (let i = 0; i < VALUES.length; i++) {
      if (Math.random() < 0.02) { // 2% chance per voter per issue
        const change = (Math.random() - 0.5) * 4; // Small change
        data[i][voterIndex] = Math.max(-100, Math.min(100, data[i][voterIndex] + change));
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
  
  // Add minimal polling noise to simulate margin of error
  const pollingNoise = 0.998 + Math.random() * 0.004; // 0.998 to 1.002
  
  // Poll the entire electorate
  for (let voterIndex = 0; voterIndex < data[0].length; voterIndex++) {
    const choice = voteForCandidate(voterIndex, candidates, data);
    if (choice !== null) {
      pollResults[choice]++;
    } else {
      notVoted++;
    }
  }
  
  // Apply minimal polling noise to results
  for (let i = 0; i < pollResults.length; i++) {
    pollResults[i] *= pollingNoise;
  }
  
  // Calculate total votes and percentages
  const totalVotes = pollResults.reduce((sum, votes) => sum + votes, 0);
  
  // Return results as array of objects with percentages
  const results = candidates.map((candidate, index) => ({
    candidate,
    votes: pollResults[index],
    percentage: totalVotes > 0 ? (pollResults[index] / totalVotes) * 100 : 0
  }));
  
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
  
  // Apply polling change
  const oldPopularity = playerCandidate.party_pop;
  playerCandidate.party_pop += pollingChange;
  
  // Ensure party popularity doesn't go below minimum threshold
  if (playerCandidate.party_pop < -50) {
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
