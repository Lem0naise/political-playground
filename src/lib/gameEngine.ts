import { Candidate, Country, VALUES, EVENT_EFFECT_MULTIPLIER, PoliticalValues, DEBUG, TOO_FAR_DISTANCE, VOTE_MANDATE, ActiveTrend, TrendDefinition, PoliticalValueKey, PROBABILISTIC_VOTING, SOFTMAX_BETA, LOYALTY_UTILITY, VoterBloc, IdeologyDrift, EVENT_DRIFT_WEEKS, Event } from '@/types/game';

import { RANDOM_NEWS_EVENTS, ECONOMIC_CRISIS_EVENTS, ECONOMIC_OPTIMISM_EVENTS, POLARIZATION_EVENTS, BLOC_REACTION_TEMPLATES } from '@/lib/newsTemplates';

import countriesDataRaw from '../../public/data/countries.json';
const countriesData = countriesDataRaw as Record<string, any>;
// Generate random normal distribution using Box-Muller transform
function randomNormal(mean: number = 0, std: number = 1): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random(); // Converting [0,1) to (0,1)
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * std + mean;
}

export function createCandidate(
  id: number,
  name: string,
  party: string,
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
    base_utility_modifier: 0,
    poll_percentage: 0,
    vals: [prog_cons, nat_glob, env_eco, soc_cap, pac_mil, auth_ana, rel_sec],
    colour: colour || 'gray',
    swing,
    is_player: false
  };
}

export function generateLeaderName(eventVariables: any, country: string): string {
  const countryInfo = countriesData[country] || {};
  const nameStyle = countryInfo.nameStyle || 'anglo';
  const nameStyles = eventVariables?.nameStyles || {};
  const styleData = nameStyles[nameStyle] || nameStyles['anglo'] || {};

  let firstNames = styleData.firstNames || [];
  let lastNames = styleData.lastNames || [];

  // Fallback if not populated
  if (firstNames.length === 0) firstNames = ["Chris", "Alex", "Sam", "Taylor", "Jordan", "Morgan", "Casey"];
  if (lastNames.length === 0) lastNames = ["Smith", "Jones", "Williams", "Taylor", "Brown", "Davies", "Evans"];

  const first = firstNames[Math.floor(Math.random() * firstNames.length)];
  const last = lastNames[Math.floor(Math.random() * lastNames.length)];

  return `${first} ${last}`;
}

export function checkForLeadershipChanges(
  candidates: Candidate[],
  initialPollResults: Record<string, number>,
  currentResults: Record<string, number>,
  eventVariables: any,
  country: string,
  incumbentGovernment?: string[],
): { candidates: Candidate[]; news: string[]; playerCrisisEvent?: Event | null } {
  const news: string[] = [];
  let playerCrisisEvent: Event | null = null;
  const updatedCandidates = candidates.map(candidate => {

    // Check if the party has recently replaced its leader
    let leaderCooldown = 0;
    if (candidate.leaderCooldown && candidate.leaderCooldown > 0) { leaderCooldown = candidate.leaderCooldown; }
    // instead of immediately returning, make it affect the leadership change probability

    // Must be tracking the party's initial polling
    const initialPolling = candidate.leadershipBaseline ?? initialPollResults[candidate.party];
    if (initialPolling === undefined) return candidate;

    const currentPolling = currentResults[candidate.party];
    if (currentPolling === undefined) return candidate;

    const titleCase = (str: string) => str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

    // Scaling threshold: chance increases as poll drop increases
    if (initialPolling >= 1 && currentPolling < initialPolling) {
      const dropPercentage = (initialPolling - currentPolling) / initialPolling;

      // Scaling probability every week:
      // Drop 30% -> ~1.539% chance
      // Drop 50% -> ~11.8% chance
      // Drop 70% -> ~45.6% chance
      let leadershipChangeProb = (Math.min(1, 1.9 * Math.pow(dropPercentage, 4)));

      if (leaderCooldown > 5) {
        // Absolute immunity when cooldown is high
        leadershipChangeProb = 0;
      } else if (leaderCooldown > 0) {
        // Tapers off as cooldown drops from 5 to 1
        leadershipChangeProb = leadershipChangeProb * (1 - (leaderCooldown / 5));
      }

      if (Math.random() < leadershipChangeProb) {
        const oldName = candidate.name;
        const newName = generateLeaderName(eventVariables, country);


        // Slightly reset base utility modifier to give the new leader a chance
        const baseModifierReset = Math.max(0, (candidate.base_utility_modifier || 0) + 1.5);

        const isGovLeader = incumbentGovernment && incumbentGovernment.length > 0 && incumbentGovernment[0] === candidate.party;


        if (candidate.is_player) {
          const titles = [
            "Leadership Crisis!",
            "Knives Out!",
            "Polling Collapse!",
            "Party Revolt!"
          ];
          const descriptions = [
            `The latest polls are a disaster, and factions within ${candidate.party} are demanding your resignation. ${newName} has emerged as the prospective new leader. Do you step down, or fight to keep your position?`,
            `Your polling performance has angered party insiders. A prominent backbencher, ${newName}, is aggressively courting officials to oust you from the leadership of ${candidate.party}. Do you bow out gracefully or dig in?`,
            `The campaign is in freefall, and the ratings are ugly. Key figures in ${candidate.party} are officially calling for your head, throwing their support behind ${newName}. How do you respond?`,
            `Sensing blood in the water after a bruising week in the polls, ${newName} has launched a formal leadership challenge against you. The mood in ${candidate.party} is mutinous. Will you surrender the reigns or wage a messy internal war?`
          ];

          const titleSelection = titles[Math.floor(Math.random() * titles.length)];
          const descSelection = descriptions[Math.floor(Math.random() * descriptions.length)];

          // Generate event for player
          playerCrisisEvent = {
            title: titleSelection,
            description: descSelection,
            choices: [
              {
                text: `Step down and let ${newName} lead.`,
                effect: {},
                boost: -10,
                internalAction: {
                  type: 'CHANGE_LEADER',
                  newName: newName,
                  oldName: oldName
                }
              },
              {
                text: "Refuse to stand down.",
                effect: {},
                boost: -30,
                internalAction: {
                  type: 'STAY_LEADER'
                }
              }
            ]
          };
          return candidate; // Don't change name right now, player must choose
        }

        let newsOptions = [
          `Following nosedive in polls, ${oldName} resigns as leader of ${candidate.party}`,
          `${candidate.party} shakeup:  ${oldName} resigns, replaced by ${newName}`,
          `${candidate.party} revolt! ${oldName} out, ${newName} in`,
          `${newName} wins ${candidate.party} leadership election after ${oldName} resigns`,
          `${newName} wins leadership of ${candidate.party} after ${oldName} resigns`,
          `${candidate.party} elects ${newName} as new leader after ${oldName} resigns`,
          `${candidate.party} leadership race ends - ${newName} takes over after ${oldName} resigns`,
          `Leadership crisis in ${candidate.party} - ${newName} replaces ${oldName} after resignation`,
          `${oldName} resigns, ${newName} announced as new leader of ${candidate.party}`
        ];

        if (isGovLeader) {
          newsOptions = [
            `CRISIS: Prime Minister ${oldName} resigns following polling collapse`,
            `Prime Minister ${oldName} ousted in ${candidate.party} leadership coup; ${newName} to take over`,
            `BREAKING: ${oldName} steps down as Prime Minister of ${titleCase(country)}`,
            `${newName} replaces ${oldName} as Prime Minister of ${titleCase(country)} following internal revolt`,
            `${candidate.party} elects ${newName} to replace ${oldName} as Prime Minister`,
            `Prime Minister ${oldName} is OUT, ${newName} is the new Prime Minister`
          ];
        }

        news.push(newsOptions[Math.floor(Math.random() * newsOptions.length)]);
        news.push(newsOptions[Math.floor(Math.random() * newsOptions.length)]);


        return {
          ...candidate,
          name: newName,
          base_utility_modifier: baseModifierReset,
          leaderCooldown: 10,
          leadershipBaseline: currentPolling * 1.2
        };
      }
      else {

        if (!candidate.is_player && (dropPercentage > 0.25) && (Math.random() < 0.05)) { //  5% of the time when they roll to not resign, 'resists calls to stand down', etc etc
          const newsOptions = [
            `${candidate.name} retains leadership of ${candidate.party} despite election losses`,
            `${candidate.name} survives leadership challenge in ${candidate.party}`,
            `${candidate.party} leader ${candidate.name} resists calls to resign`,
            `${candidate.party} leader ${candidate.name} refuses to step down`,
            `${candidate.party} leader ${candidate.name} digs in as party turmoil continues`,
            `${candidate.name} not resigning`,
            `${candidate.name} refuses to resign`
          ];
          news.push(newsOptions[Math.floor(Math.random() * newsOptions.length)]);
        }

      }
    }
    return candidate;
  });

  return { candidates: updatedCandidates, news, playerCrisisEvent };
}

export function checkPostElectionLeadershipChanges(
  candidates: Candidate[],
  initialPollResults: Record<string, number>,
  currentResults: Record<string, number>,
  outgoingGov: string[] | undefined,
  newGov: string[],
  eventVariables: any,
  country: string,
  hosTitle: string = 'Prime Minister'
): { candidates: Candidate[]; news: string[]; playerCrisisEvent?: Event | null } {
  const news: string[] = [];
  let playerCrisisEvent: Event | null = null;

  const updatedCandidates = candidates.map(candidate => {
    const initialPolling = candidate.leadershipBaseline ?? initialPollResults[candidate.party];
    const currentPolling = currentResults[candidate.party];

    if (initialPolling === undefined || currentPolling === undefined) return candidate;

    // Only consider large parties
    if (initialPolling < 1) return candidate;

    const dropPercentage = (initialPolling - currentPolling) / initialPolling;

    // Base chance up to 90% from vote drop
    // Drop 30% -> 27% chance
    // Drop 50% -> 75% chance
    // Drop 60% -> 100% chance
    let resignationProb = Math.min(1, 4.0 * Math.pow(dropPercentage, 2));
    if (dropPercentage < 0) { resignationProb = -resignationProb } // if its an increase in polling, it decreases the chance of a leadership challenge, even if party lost government position, but it doesn't completely eliminate it

    // Penalty for losing government
    const wasInGov = outgoingGov?.includes(candidate.party);
    const isInGov = newGov.includes(candidate.party);
    if (wasInGov && !isInGov) {
      resignationProb += 0.50; // Massive +50% chance
    }
    if (candidate.is_player) {
      resignationProb += 0.25; // player is more likely to face leadership challenges (more fun)
    }

    if (Math.random() < resignationProb) {
      // Failed the leadership survival roll
      const oldName = candidate.name;
      const newName = generateLeaderName(eventVariables, country);

      if (candidate.is_player) {
        const titles = [
          "Leadership Crisis!",
          "Knives Out!",
          "A Challenge to your Leadership",
          "Party Revolt!"
        ];
        const descriptions = [
          `Following a disappointing election result, factions within ${candidate.party} are demanding your resignation as party leader. ${newName} has emerged as the primary challenger. Do you step down, or fight to keep your position?`,
          `Your recent electoral performance has angered party insiders. A prominent backbencher, ${newName}, is aggressively courting officials to oust you from the leadership of ${candidate.party}. Do you bow out gracefully or dig in?`,
          `The polls have closed, and the results are ugly. Key figures in ${candidate.party} are officially calling for your head, throwing their support behind ${newName}. How do you respond?`,
          `Sensing blood in the water after a bruising election, ${newName} has launched a formal leadership challenge against you. The mood in ${candidate.party} is mutinous. Will you surrender the reigns or wage a messy internal war?`
        ];

        const titleSelection = titles[Math.floor(Math.random() * titles.length)];
        const descSelection = descriptions[Math.floor(Math.random() * descriptions.length)];

        // Generate event for player
        playerCrisisEvent = {
          title: titleSelection,
          description: descSelection,
          choices: [
            {
              text: `Step down and let ${newName} lead.`,
              effect: {},
              boost: -10,
              internalAction: {
                type: 'CHANGE_LEADER',
                newName: newName,
                oldName: oldName
              }
            },
            {
              text: "Refuse to stand down.",
              effect: {},
              boost: -30
            }
          ]
        };
        return candidate; // Don't change name right now, player must choose
      } else {
        const isGovLeader = outgoingGov && outgoingGov.length > 0 && outgoingGov[0] === candidate.party;

        // AI actually resigns
        const baseModifierReset = Math.max(0, (candidate.base_utility_modifier || 0) + 1.5);

        let newsOptions = [
          `Following election losses, ${oldName} resigns as leader of ${candidate.party}`,
          `ELECTION: ${candidate.party} shakeup:  ${oldName} replaced by ${newName}`,
          `${candidate.party} revolt! ${oldName} out, ${newName} in`,
          `${newName} wins ${candidate.party} leadership election after ${oldName} resigns`,
          `LOSS: ${newName} ousts ${oldName} as leader of ${candidate.party}`,
          `${candidate.party} elects ${newName} as new leader after ${oldName} resigns due to election loss`,
          `${candidate.party} leadership race ends - ${newName} takes over after ${oldName} resigns due to election loss`,
          `Leadership crisis in ${candidate.party} - ${newName} replaces ${oldName}`,
          `${newName} announced as new leader of ${candidate.party} after ${oldName} resigns due to election loss`
        ];

        if (isGovLeader) {
          newsOptions = [
            `ELECTION SHOCK: Prime Minister ${oldName} resigns following defeat`,
            `Prime Minister ${oldName} steps down; ${newName} to lead ${candidate.party} in opposition`,
            `END OF AN ERA: ${oldName} resigns as Prime Minister following bruising election`,
            `${candidate.party} selects ${newName} as new leader to replace outgoing Prime Minister ${oldName}`,
            `REVOLT: ${candidate.party} ousts Prime Minister ${oldName} after election disaster; ${newName} in`
          ];
        }

        news.push(newsOptions[Math.floor(Math.random() * newsOptions.length)]);
        news.push(newsOptions[Math.floor(Math.random() * newsOptions.length)]);

        return {
          ...candidate,
          name: newName,
          base_utility_modifier: baseModifierReset,
          leaderCooldown: 10,
          leadershipBaseline: currentPolling
        };
      }
    } else {
      // Passed the survival roll, or chance was too low.
      // If the drop was big or they lost gov, it's newsworthy that they survived.
      if (!candidate.is_player && (dropPercentage > 0.3 || (wasInGov && !isInGov))) {
        const newsOptions = [
          `${candidate.name} retains leadership of ${candidate.party} despite election losses`,
          `${candidate.name} survives leadership challenge in ${candidate.party}`,
          `${candidate.party} leader ${candidate.name} resists calls to resign after election loss`,
          `${candidate.party} leader ${candidate.name} refuses to step down, party base angered`,
          `${candidate.party} leader ${candidate.name} digs in as party turmoil continues`,
          `${candidate.name} not resigning after election loss`,
          `${candidate.name} refuses to resign despite election losses`
        ];
        news.push(newsOptions[Math.floor(Math.random() * newsOptions.length)]);
      }

      // Preserve the effective baseline explicitly. Without this, after the election
      // initialPollResults is reset to the election result, so a survivor with no
      // leadershipBaseline would have their baseline silently changed to the election
      // result rather than keeping the original pre-election polling.
      return {
        ...candidate,
        leadershipBaseline: initialPolling
      };
    }

    return candidate;
  });

  return { candidates: updatedCandidates, news, playerCrisisEvent };
}

const TREND_INTERVAL_MIN = 2;
const TREND_INTERVAL_MAX = 4;
const TREND_VOTER_NOISE = 0.35;
export const MAX_ACTIVE_TRENDS = 2;

const TREND_DEFINITIONS: TrendDefinition[] = [
  {
    id: 'border_backlash',
    titles: [
      'Record Border Crossings Spark National Emergency Debate',
      'New Immigration Quotas Trigger Nationwide Protests',
      'Leaked Border Agency Report Reveals Security Failures',
      'Surge in Undocumented Arrivals Strains Frontier Towns',
      'Politicians Clash Over Deportation Policy After High-Profile Case',
    ],
    shortTitles: ['Border Crisis', 'Immigration Debate', 'Border Security', 'Asylum Surge', 'Migration Politics'],
    descriptions: [
      'A wave of incidents along the border has pushed immigration back to the top of the national agenda, with polls showing record concern.',
      'Leaked internal documents reveal the government has lost track of thousands of visa overstayers, reigniting the border debate.',
      'A viral video of overcrowded processing centres has galvanised voters on both sides of the immigration divide.',
      'A high-profile crime linked to an asylum seeker dominates the news cycle, fuelling demands for tougher controls.',
      'Border towns report infrastructure at breaking point, prompting an emergency parliamentary committee inquiry.',
    ],
    valueKey: 'nat_glob',
    direction: -1,
    directionLabel: 'toward stricter borders',
    axisLabel: 'national identity',
    shiftRange: [7, 20],
    durationRange: [3, 15],
    startTemplates: [
      'Breaking: {title} — {description}',
      'National Debate: {title} dominates headlines; analysts expect {duration}-week turbulence.'
    ],
    ongoingTemplates: [
      'The {shortTitle} continues to dominate the headlines.',
      'Voters remain focused on {shortTitle} this week.',
      'Public debate over {shortTitle} is pushing opinion {directionLabel}.',
      'Media coverage of the {shortTitle} stays intense, nudging voters {directionLabel}.',
      'The fallout from the {shortTitle} continues to ripple through the electorate.'
    ],
    completionTemplates: [
      'Analysis: After {duration} weeks, {title} leaves a lasting shift {directionLabel}.',
      'The storm around {title} finally eases, but the electorate has moved decisively {directionLabel}.',
      'As the {shortTitle} fades, it leaves a clear imprint on the national mood.'
    ]
  },
  {
    id: 'global_outreach',
    titles: [
      'Historic Trade Summit Opens New Era of International Partnership',
      'Landmark Free-Trade Agreement Signed With Major Economic Bloc',
      'Cultural Exchange Programme Reaches Record Participation Levels',
      'Government Unveils Ambitious Global Engagement Strategy',
      'Foreign Investment Surge Credited to Open-Border Policies',
    ],
    shortTitles: ['Trade Summit', 'Free-Trade Deal', 'Global outreach', 'Engagement Strategy', 'Foreign Investment'],
    descriptions: [
      'A sweeping new trade deal promises thousands of jobs and lower prices, boosting public appetite for deeper global integration.',
      'A diplomatic charm offensive—including high-profile cultural festivals and student exchanges—has shifted public opinion toward openness.',
      'Record tourism numbers and a booming export sector have voters crediting globalisation with tangible economic benefits.',
      'A series of high-profile international partnerships has reinvigorated optimism about the country\'s place in the world.',
      'Business leaders report a surge in foreign contracts, reinforcing the case for liberal immigration and trade policies.',
    ],
    valueKey: 'nat_glob',
    direction: 1,
    directionLabel: 'toward open borders',
    axisLabel: 'national identity',
    shiftRange: [6, 11],
    durationRange: [3, 15],
    startTemplates: [
      'Breaking: {title} — {description}',
      'Economic Shift: {title} lifts optimism {directionLabel} for the next {duration} weeks.'
    ],
    ongoingTemplates: [
      'Momentum builds for the {shortTitle}, lifting optimism {directionLabel}.',
      'Voters are responding positively to the {shortTitle}.',
      'The {shortTitle} continues to drive sentiment {directionLabel}.',
      'Public support for {directionLabel} grows as {shortTitle} stays in focus.',
      'Economic data tied to the {shortTitle} keeps voters moving {directionLabel}.'
    ],
    completionTemplates: [
      'Analysis: {title} wraps after {duration} weeks, anchoring a significant shift {directionLabel}.',
      'The momentum from {title} subsides, but a clear realignment {directionLabel} remains.',
      'The {shortTitle} concludes, having successfully pivoted the country {directionLabel}.'
    ]
  },
  {
    id: 'climate_alarm',
    titles: [
      'Record-Breaking Wildfires Devastate National Parklands',
      'UN Scientists Issue Dire Warning: Country Must Halve Emissions by 2030',
      'Catastrophic Flooding Displaces Thousands in Coastal Regions',
      'Landmark IPCC Report Triggers Emergency Climate Summit',
      'Heatwave Kills Hundreds, Breaking All Historical Temperature Records',
    ],
    shortTitles: ['Climate Crisis', 'Global Warming', 'Wildfire Disaster', 'Flood Crisis', 'Climate Emergency'],
    descriptions: [
      'Footage of charred national parks and flooded towns has triggered a surge in public demand for urgent climate action.',
      'A new UN assessment warning of irreversible tipping points has turned climate policy from a fringe issue into the defining question of the campaign.',
      'After weeks of extreme weather, a majority of voters now say climate change is the most important issue facing the country.',
      'Emergency hearings in parliament have exposed the government\'s inadequate climate preparedness, sending shockwaves through the electorate.',
      'Scientists warn that this summer\'s disasters are a preview of the new normal without radical policy changes.',
    ],
    valueKey: 'env_eco',
    direction: -1,
    directionLabel: 'toward environmental action',
    axisLabel: 'climate-policy',
    shiftRange: [8, 18],
    durationRange: [3, 15],
    startTemplates: [
      'Breaking: {title} — {description}',
      'National Crisis: {title} shifts public focus {directionLabel} for at least {duration} weeks.'
    ],
    ongoingTemplates: [
      'The urgency of the {shortTitle} continues to dominate the debate.',
      'Voters are increasingly concerned about {shortTitle}.',
      'Opinion continues to move {directionLabel} amid the {shortTitle}.',
      'Emergency measures for the {shortTitle} keep {directionLabel} in the headlines.',
      'Public pressure for green reform grows as {shortTitle} remains unresolved.'
    ],
    completionTemplates: [
      'Analysis: {title} ends after {duration} weeks having driven a lasting realignment {directionLabel}.',
      'The crisis triggered by {title} slowly fades, but public opinion is now firmly {directionLabel}.',
      'The legacy of the {shortTitle} is a decisive public shift {directionLabel}.'
    ]
  },
  {
    id: 'industrial_push',
    titles: [
      'Major Manufacturers Announce 50,000 New Jobs in Industrial Revival Plan',
      'Government Deregulation Package Sparks Factory Construction Boom',
      'Energy Sector Expansion Promises Economic Lifeline for Working Towns',
      'Mining Giant Unveils Largest Domestic Investment in a Generation',
      'New Industrial Strategy Prioritises Growth Over Environmental Regulation',
    ],
    shortTitles: ['Industrial Boom', 'Revival Plan', 'Manufacturing Surge', 'Factory Boom', 'Mining Investment'],
    descriptions: [
      'A surge in factory openings and manufacturing orders has shifted the national conversation from climate targets to economic output.',
      'A high-profile government deregulation drive has business leaders predicting the fastest industrial growth in decades.',
      'Unemployment figures in manufacturing hubs have dropped sharply, giving economic-growth arguments new political traction.',
      'A multi-billion-dollar investment announcement in heavy industry has reframed the environment-versus-economy debate.',
      'Soaring energy costs have made voters more sympathetic to arguments for expanding domestic fossil fuel production.',
    ],
    valueKey: 'env_eco',
    direction: 1,
    directionLabel: 'toward industrial growth',
    axisLabel: 'climate-policy',
    shiftRange: [6, 10],
    durationRange: [3, 15],
    startTemplates: [
      'Breaking: {title} — {description}',
      'Economic Shift: {title} pulls the debate {directionLabel} through the next {duration} weeks.'
    ],
    ongoingTemplates: [
      'The {shortTitle} keeps economic growth front-of-mind.',
      'Industrial optimism from the {shortTitle} nudges voters {directionLabel}.',
      'Business confidence remains high as the {shortTitle} continues.',
      'The debate remains tilted {directionLabel} amid talk of {shortTitle}.',
      'Voters are increasingly focused on jobs from the {shortTitle}.'
    ],
    completionTemplates: [
      'Analysis: {title} completes its run, leaving a footprint {directionLabel}.',
      'As {title} fades from the headlines, the electorate has shifted measurably {directionLabel}.',
      'The era of the {shortTitle} leaves the country focused more on {directionLabel}.'
    ]
  },
  {
    id: 'workers_wave',
    titles: [
      'Nationwide Strike Wave Halts Key Industries as Workers Demand Living Wages',
      'Wage Gap Report: CEO Pay 400 Times Median Worker — Public Outrage Grows',
      'Landmark Union Victory Forces Minimum Wage Overhaul',
      'Gig Economy Scandal: Millions of Workers Denied Basic Labour Rights',
      'Mass Layoffs at Major Corporation Spark Workers\' Rights Movement',
    ],
    shortTitles: ['Strike Wave', 'Union Victory', 'Labour Scandal', 'Workers\' Rights', 'Wage Stagnation'],
    descriptions: [
      'A series of high-profile strikes across transport, healthcare and education has put workers\' rights at the centre of the political debate.',
      'A damning report on income inequality, widely shared on social media, has fuelled grassroots pressure for redistribution and stronger unions.',
      'Video footage of workers being dismissed for union activity went viral, galvanising public support for labour protections.',
      'A court ruling exposing the exploitation of gig economy workers has made precarious employment a defining issue of the campaign.',
      'After mass redundancies at a household-name employer, polls show a dramatic shift in voter sympathy {directionLabel}.',
    ],
    valueKey: 'soc_cap',
    direction: -1,
    directionLabel: 'toward worker protections',
    axisLabel: 'economic model',
    shiftRange: [7, 13],
    durationRange: [3, 15],
    startTemplates: [
      'Breaking: {title} — {description}',
      'Labour Shift: {title} nudges public debate {directionLabel} for roughly {duration} weeks.'
    ],
    ongoingTemplates: [
      'The {shortTitle} continues to fuel the debate on fairness.',
      'Voters are increasingly sympathetic to {directionLabel} amid the {shortTitle}.',
      'Union leaders cite the {shortTitle} as a turning point for {axisLabel}.',
      'The momentum from the {shortTitle} shows no sign of slowing.',
      'Public discourse remains focused on {shortTitle} and {directionLabel}.'
    ],
    completionTemplates: [
      'Analysis: {title} winds down, but a significant shift {directionLabel} has been locked in.',
      'Workers\' movement sparked by {title} settles after {duration} weeks, leaving lasting change {directionLabel}.',
      'The impact of the {shortTitle} has permanently baseline shifted the {axisLabel}.'
    ]
  },
  {
    id: 'market_mania',
    titles: [
      'Stock Market Hits All-Time High as Tech Sector Leads Economic Boom',
      'Startup Unicorn Boom Creates Wave of New Millionaires',
      'Record Low Unemployment Vindicates Free-Market Reforms',
      'Deregulation Drive Unleashes Private Investment Surge',
      'Central Bank Reports Strongest Growth in Two Decades',
    ],
    shortTitles: ['Market Boom', 'Economic Boom', 'Deregulation Surge', 'Investment Surge', 'Tech Boom'],
    descriptions: [
      'A booming stock market and record corporate earnings have strengthened the hand of free-market advocates across the political spectrum.',
      'Headline figures showing falling unemployment and rising wages are credited to recent deregulation, boosting faith in market-led solutions.',
      'A new generation of entrepreneurs, prominently featured in the media, has shifted public aspirations toward private sector dynamism.',
      'A flood of foreign investment, attracted by the country\'s low-tax environment, has given economic liberals a potent electoral argument.',
      'Business confidence surveys show the highest readings in a generation, reinforcing support for capitalist economic models.',
    ],
    valueKey: 'soc_cap',
    direction: 1,
    directionLabel: 'toward free-market reforms',
    axisLabel: 'economic model',
    shiftRange: [6, 11],
    durationRange: [3, 15],
    startTemplates: [
      'Breaking: {title} — {description}',
      'Market Shift: {title} drifts sentiment {directionLabel} for the next {duration} weeks.'
    ],
    ongoingTemplates: [
      'The {shortTitle} continues to lift business confidence.',
      'Free-market optimism grows amid the ongoing {shortTitle}.',
      'Voters are responding to the economic gains of the {shortTitle}.',
      'The {shortTitle} keeps the country focused on {directionLabel}.',
      'Corporate leaders hail the {shortTitle} as a victory for the {axisLabel}.'
    ],
    completionTemplates: [
      'Analysis: The boom sparked by {title} settles after {duration} weeks, banking a shift {directionLabel}.',
      '{title} fades from the front pages, but voters have moved measurably {directionLabel}.',
      'The {shortTitle} concludes, having firmly anchored the country {directionLabel}.'
    ]
  },
  {
    id: 'security_alert',
    titles: [
      'Cross-Border Incursion Triggers Defence Emergency Review',
      'Major Terror Plot Foiled: Intelligence Chiefs Demand More Powers',
      'Cyberattack Cripples National Infrastructure, Attributed to Foreign State',
      'Leaked Military Report Warns of Critical Security Vulnerabilities',
      'Ambassador Recalled as Neighbour Conducts Provocative Military Exercises',
    ],
    shortTitles: ['Security Crisis', 'Terrror Plot', 'Cyberattack', 'Defence Review', 'Border Tensions'],
    descriptions: [
      'A foreign military incursion, even if brief, has sent shockwaves through the public and hardened attitudes toward national defence.',
      'The foiling of a large-scale terror plot has intensified calls for expanded surveillance powers and higher defence spending.',
      'A devastating state-sponsored cyberattack on power grids and hospitals has made security a paramount election issue.',
      'A leaked defence assessment warning of a dangerously underfunded military has dominated front pages for days.',
      'Escalating aggression from a neighbouring state has driven a sharp rise in public support for rearmament.',
    ],
    valueKey: 'pac_mil',
    direction: 1,
    directionLabel: 'toward hawkish security',
    axisLabel: 'security posture',
    shiftRange: [7, 13],
    durationRange: [3, 15],
    startTemplates: [
      'Breaking: {title} — {description}',
      'Security Crisis: {title} drives discourse {directionLabel} for the next {duration} weeks.'
    ],
    ongoingTemplates: [
      'Voters remain rattled by the {shortTitle}.',
      'National security focus deepens as the {shortTitle} continues.',
      'Calls for {directionLabel} grow louder in response to the {shortTitle}.',
      'The {shortTitle} keeps defence spending at the top of the agenda.',
      'Intelligence briefings on the {shortTitle} nudge opinion {directionLabel}.'
    ],
    completionTemplates: [
      'Analysis: {title} concludes with a significant and lasting tilt {directionLabel}.',
      'The threat environment described in {title} fades, but voters have shifted {directionLabel}.',
      'The {shortTitle} has left the electorate permanently more {directionLabel}.'
    ]
  },
  {
    id: 'peace_push',
    titles: [
      'Whistleblower Exposes Billion-Dollar Defence Procurement Fraud',
      'War Memorial Protests Draw Largest Crowds in a Generation',
      'Secret Military Casualty Figures Leaked to Press',
      'Veterans\' Group Condemns Government\'s "Endless War" Posture',
      'Defence Budget Scandal: Overruns Cost Taxpayers Twice the Estimate',
    ],
    shortTitles: ['Defence Scandal', 'Peace Protests', 'Casualty Leak', 'War Backlash', 'Procurement Fraud'],
    descriptions: [
      'A major defence procurement fraud scandal has eroded public trust in military spending and boosted support for demilitarisation.',
      'Mass anti-war protests, timed to a controversial overseas deployment, have put the peace movement back at the centre of politics.',
      'Leaked documents showing far higher military casualties than officially admitted have triggered a public backlash against hawkish policies.',
      'A high-profile veterans\' advocacy group turning against government defence policy has dealt a significant blow to militarist arguments.',
      'Mounting evidence of cost overruns and contractor corruption has weakened public appetite for defence spending.',
    ],
    valueKey: 'pac_mil',
    direction: -1,
    directionLabel: 'toward demilitarisation',
    axisLabel: 'security posture',
    shiftRange: [6, 16],
    durationRange: [3, 15],
    startTemplates: [
      'Breaking: {title} — {description}',
      'Peace Shift: {title} reorients the security debate {directionLabel} for {duration} weeks.'
    ],
    ongoingTemplates: [
      'The {shortTitle} continues to embolden the peace movement.',
      'Public anger over the {shortTitle} is pushing opinion {directionLabel}.',
      'The fallout from the {shortTitle} stays in the headlines.',
      'Voters are increasingly skeptical of military spending amid the {shortTitle}.',
      'Pressure for {directionLabel} builds as the {shortTitle} remains unresolved.'
    ],
    completionTemplates: [
      'Analysis: The movement sparked by {title} leaves a significant imprint {directionLabel}.',
      '{title} fades after {duration} weeks, but the electorate has moved {directionLabel}.',
      'The {shortTitle} concludes, having left the public decidedly {directionLabel}.'
    ]
  },
  {
    id: 'order_drive',
    titles: [
      'Violent Crime Rate Hits 20-Year High, Sparking Law-and-Order Crisis',
      'Organised Crime Network Exposed in Major Cities',
      'Shocking CCTV Footage of Unprovoked Attack Goes Viral',
      'Police Report Surge in Gang Activity as Resources Stretched',
      'High-Profile Murder Spree Dominates Weeks of News Coverage',
    ],
    shortTitles: ['Crime Crisis', 'Gang Exposure', 'Attack Viral', 'Gang Activity', 'Safety Alert'],
    descriptions: [
      'A spate of violent crimes in major cities, widely covered in the media, has hardened public attitudes in favour of stronger law enforcement.',
      'An exposé of a sophisticated organised crime network with apparent links to officials has driven demands for a crackdown.',
      'Viral footage of violent street crime, watched tens of millions of times, has electrified the law-and-order debate.',
      'A police union report warning of a crime surge linked to understaffing has given authority advocates a compelling electoral argument.',
      'A series of high-profile murders, extensively covered on television, has pushed safety to the top of the political agenda.',
    ],
    valueKey: 'auth_ana',
    direction: -1,
    directionLabel: 'toward law-and-order authority',
    axisLabel: 'civil liberty',
    shiftRange: [6, 14],
    durationRange: [3, 15],
    startTemplates: [
      'Breaking: {title} — {description}',
      'Public Safety Crisis: {title} drags sentiment {directionLabel} for the next {duration} weeks.'
    ],
    ongoingTemplates: [
      'The {shortTitle} continues to tighten public attitudes.',
      'Security remains a top voter concern as the {shortTitle} develops.',
      'Public pressure for {directionLabel} builds amid {shortTitle}.',
      'The {shortTitle} keeps the country focused on safety and order.',
      'Voters are increasingly responding to {directionLabel} from {shortTitle}.'
    ],
    completionTemplates: [
      'Analysis: {title} settles after {duration} weeks with a significant move {directionLabel}.',
      'The public safety panic from {title} eases, but voters are now markedly {directionLabel}.',
      'The {shortTitle} concludes, having left the public decidedly more {directionLabel}.'
    ]
  },
  {
    id: 'liberty_swell',
    titles: [
      'Supreme Court Rules Mass Surveillance Programme Unconstitutional',
      'Wrongful Imprisonment Scandal Exposes Deep Flaws in Justice System',
      'Police Brutality Video Sparks Nationwide Civil Rights Protests',
      'Landmark Report: One in Four Citizens Surveilled Without Warrant',
      'Prison Overcrowding Crisis Triggers Emergency Rights Review',
    ],
    shortTitles: ['Rights Ruling', 'Justice Scandal', 'Rights Protests', 'Surveillance Report', 'Rights Review'],
    descriptions: [
      'A landmark court ruling striking down mass surveillance has reignited the civil liberties debate and energised rights advocates.',
      'A major wrongful conviction scandal, involving fabricated police evidence, has shaken public confidence in state authority.',
      'Viral footage of police misconduct has drawn hundreds of thousands onto the streets, placing civil rights at the centre of the election.',
      'A damning official report on warrantless surveillance of citizens has provoked outrage and shifted opinion {directionLabel}.',
      'Harrowing testimonies from prison reform campaigners have reframed the law-and-order debate around rights rather than punishment.',
    ],
    valueKey: 'auth_ana',
    direction: 1,
    directionLabel: 'toward civil liberties',
    axisLabel: 'civil liberty',
    shiftRange: [6, 15],
    durationRange: [3, 15],
    startTemplates: [
      'Breaking: {title} — {description}',
      'Rights Shift: {title} turns the spotlight {directionLabel} for {duration} weeks.'
    ],
    ongoingTemplates: [
      'The {shortTitle} continues to inspire rights advocates.',
      'Public distrust of state power grows as the {shortTitle} continues.',
      'Conversation remains focused on liberty and the {shortTitle}.',
      'The {shortTitle} keeps the country focused on {directionLabel}.',
      'Voters are increasingly drawn to {directionLabel} amid {shortTitle}.'
    ],
    completionTemplates: [
      'Analysis: {title} leaves the electorate significantly {directionLabel} after {duration} weeks.',
      'The rights wave from {title} subsides, with a clear and lasting shift {directionLabel}.',
      'The legacy of the {shortTitle} is a decisive move {directionLabel}.'
    ]
  },
  {
    id: 'faith_revival',
    titles: [
      'Megachurch Movement Draws Millions, Reshaping Cultural Conversation',
      'National Moral Panic Over Social Decay Drives Religious Revival',
      'Influential Religious Coalition Launches Major Election Mobilisation',
      'Viral Sermon Condemning Moral Decline Watched 50 Million Times',
      'Growing Church Attendance Signals Shift in National Cultural Identity',
    ],
    shortTitles: ['Faith Revival', 'Moral Debate', 'Faith Mobilisation', 'Faith Viral', 'Church Surge'],
    descriptions: [
      'A sweeping religious revival movement, culminating in mass gatherings broadcast nationally, has moved faith values to the political forefront.',
      'A series of high-profile endorsements from religious leaders for conservative social policies has galvanised faith-based voters.',
      'A viral sermon addressing moral decline, shared widely on social media, has sparked a national conversation about values and tradition.',
      'A well-funded religious coalition has launched a sophisticated voter mobilisation drive targeting churchgoing communities.',
      'Record church attendance figures, combined with prominent religious voices in the media, have bolstered socially conservative sentiment.',
    ],
    valueKey: 'rel_sec',
    direction: -1,
    directionLabel: 'toward religious values',
    axisLabel: 'cultural identity',
    shiftRange: [7, 13],
    durationRange: [3, 15],
    startTemplates: [
      'Breaking: {title} — {description}',
      'Cultural Shift: {title} swings public discourse {directionLabel} for {duration} weeks.'
    ],
    ongoingTemplates: [
      'The {shortTitle} continues to inspire faith communities.',
      'Traditional values focus remains intense as the {shortTitle} develops.',
      'Voters are increasingly drawn to {directionLabel} amid {shortTitle}.',
      'The {shortTitle} keeps faith and tradition in the headlines.',
      'Public discourse is shaped by the {shortTitle} and {directionLabel}.'
    ],
    completionTemplates: [
      'Analysis: {title} settles with a significant and lasting imprint {directionLabel}.',
      'The revival sparked by {title} fades after {duration} weeks, leaving the electorate {directionLabel}.',
      'The legacy of the {shortTitle} is a decisive tilt {directionLabel}.'
    ]
  },
  {
    id: 'secular_surge',
    titles: [
      'Landmark Separation of Church and State Bill Passes Parliament',
      'Major Scandal Rocks Largest Religious Institution in the Country',
      'Science Funding Boom Triggers National Conversation on Evidence-Based Policy',
      'Abuse Inquiry Delivers Damning Verdict Against Religious Establishment',
      'Youth Survey: Record Numbers Identify as Non-Religious',
    ],
    shortTitles: ['Secular Reform', 'Clerical Scandal', 'Science Boom', 'Inquiry Verdict', 'Secular Surge'],
    descriptions: [
      'A sweeping legislative push to remove religious influence from state institutions has galvanised secular voters and shifted the cultural debate.',
      'A devastating abuse inquiry involving a major religious institution has dramatically eroded public trust in faith-based authority.',
      'A record government investment in scientific research has sparked a national conversation about evidence-based versus faith-based governance.',
      'A viral survey showing the sharpest generational decline in religious identification ever recorded has energised the secular movement.',
      'Prominent intellectuals and scientists have launched a high-profile campaign for secular values, winning significant media traction.',
    ],
    valueKey: 'rel_sec',
    direction: 1,
    directionLabel: 'toward secular values',
    axisLabel: 'cultural identity',
    shiftRange: [6, 12],
    durationRange: [3, 15],
    startTemplates: [
      'Breaking: {title} — {description}',
      'Cultural Shift: {title} edges public sentiment {directionLabel} for {duration} weeks.'
    ],
    ongoingTemplates: [
      'The {shortTitle} continues to drive secularisation.',
      'Rationalist themes remain dominant as the {shortTitle} continues.',
      'Opinion continues to move {directionLabel} amid the {shortTitle}.',
      'The {shortTitle} keeps the country focused on secular progress.',
      'Public discourse is increasingly shaped by {directionLabel} from {shortTitle}.'
    ],
    completionTemplates: [
      'Analysis: {title} winds down after {duration} weeks, cementing a move {directionLabel}.',
      'The secular wave from {title} recedes, but the electorate has shifted measurably {directionLabel}.',
      'The {shortTitle} has anchored a new consensus around {directionLabel}.'
    ]
  },
  {
    id: 'progressive_wave',
    titles: [
      'Landmark Equality Legislation Triggers National Debate on Social Progress',
      'Mass Youth Protests Demand Bold Action on Social Justice',
      'Viral Documentary on Systemic Inequality Breaks Streaming Records',
      'Grassroots Coalition Launches Largest Progressive Policy Push in Decades',
      'Historic Rights Ruling Galvanises Progressive Movement Nationwide',
    ],
    shortTitles: ['Equality Reform', 'Justice Protests', 'Inequality Viral', 'Policy Push', 'Rights Ruling'],
    descriptions: [
      'A wave of grassroots activism, culminating in major street protests, has put progressive social reform back at the top of the political agenda.',
      'A viral documentary exposing deep-seated systemic inequalities has galvanised a new generation of progressive voters.',
      'A landmark court ruling on social rights has energised the left and prompted a nationwide rethink of social policy.',
      'A sweeping new equality bill, drawing massive public support, has shifted the terms of the cultural debate toward progressive ideals.',
      'A generational shift in attitudes, documented in a major polling survey, has given progressive candidates a powerful electoral tailwind.',
    ],
    valueKey: 'prog_cons',
    direction: -1,
    directionLabel: 'toward progressive ideals',
    axisLabel: 'cultural values',
    shiftRange: [7, 13],
    durationRange: [3, 15],
    startTemplates: [
      'Breaking: {title} — {description}',
      'Cultural Shift: {title} steers debate {directionLabel} through {duration} weeks.'
    ],
    ongoingTemplates: [
      'The {shortTitle} continues to inspire progressive enthusiasm.',
      'Voters are increasingly supportive of {directionLabel} amid {shortTitle}.',
      'The {shortTitle} keeps social justice at the top of the agenda.',
      'Opinion continues to move {directionLabel} as {shortTitle} develops.',
      'Public discourse is shaped by the {shortTitle} and {directionLabel}.'
    ],
    completionTemplates: [
      'Analysis: {title} caps a significant pivot {directionLabel} after {duration} weeks.',
      'The progressive wave from {title} subsides, leaving the electorate shifted {directionLabel}.',
      'The legacy of the {shortTitle} is a decisive move {directionLabel}.'
    ]
  },
  {
    id: 'heritage_moment',
    titles: [
      'National Identity Crisis: Immigration Backlash Fuels Traditionalist Revival',
      'Controversial Curriculum Overhaul Sparks "History Wars" Debate',
      'Heritage Festivals Draw Record Attendance Amid Cultural Nostalgia Surge',
      'Bestselling Book on National Decline Tops Charts for Twelve Weeks',
      'Constitutional Amendment Proposal to Enshrine Traditional Values Gains Support',
    ],
    shortTitles: ['Heritage Surge', 'History Wars', 'Cultural nostalgia', 'Decline Debate', 'Values Campaign'],
    descriptions: [
      'A fierce backlash against recent social changes has fuelled a powerful traditionalist revival, drawing millions into a debate about national identity.',
      'A controversial school curriculum reform, seen by many as erasing national heritage, has ignited a culture war with electoral consequences.',
      'Record attendance at national heritage events, combined with a nostalgia wave in popular culture, has shifted the mood toward conservative values.',
      'A widely-read book arguing that rapid social change is destroying national cohesion has sparked months of public debate.',
      'A grassroots campaign to enshrine traditional values in the constitution has won surprisingly broad public support.',
    ],
    valueKey: 'prog_cons',
    direction: 1,
    directionLabel: 'toward conservative nostalgia',
    axisLabel: 'cultural values',
    shiftRange: [6, 12],
    durationRange: [3, 15],
    startTemplates: [
      'Breaking: {title} — {description}',
      'Cultural Shift: {title} nudges public conversation {directionLabel} for {duration} weeks.'
    ],
    ongoingTemplates: [
      'The {shortTitle} continues to fuel traditionalist sentiment.',
      'Nostalgia remains a powerful force as the {shortTitle} develops.',
      'Opinion continues to move {directionLabel} amid the {shortTitle}.',
      'The {shortTitle} keeps national heritage in the headlines.',
      'Voters are responding to the {directionLabel} themes of {shortTitle}.'
    ],
    completionTemplates: [
      'Analysis: {title} concludes after {duration} weeks, preserving a shift {directionLabel}.',
      'The nostalgia wave from {title} fades, but the electorate has moved measurably {directionLabel}.',
      'The {shortTitle} has anchored a more {directionLabel} outlook in the public.'
    ]
  }
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function pickTemplate(templates: string[], fallback: string): string {
  if (!templates || templates.length === 0) {
    return fallback;
  }
  return templates[Math.floor(Math.random() * templates.length)];
}

function buildTrendContext(
  trend: ActiveTrend,
  currentValue: number,
  shift: number,
  remainingWeeks: number
): Record<string, string> {
  return {
    title: trend.title,
    shortTitle: trend.shortTitle,
    description: trend.description,
    directionLabel: trend.directionLabel,
    axisLabel: trend.axisLabel,
    duration: String(trend.duration),
    totalShift: trend.totalShift.toFixed(1),
    totalShiftAbs: Math.abs(trend.totalShift).toFixed(1),
    shift: shift.toFixed(1),
    shiftAbs: Math.abs(shift).toFixed(1),
    currentValue: Math.round(currentValue).toString(),
    weeksRemaining: Math.max(0, remainingWeeks).toString(),
    startWeek: trend.startWeek.toString(),
    endWeek: trend.endWeek.toString()
  };
}

function formatTrendTemplate(template: string, context: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_match, key) => context[key] ?? '');
}

export function scheduleNextTrendPoll(currentWeek: number, minGap: number = TREND_INTERVAL_MIN, maxGap: number = TREND_INTERVAL_MAX): number {
  return currentWeek + randomInt(minGap, maxGap);
}

export function createTrend(currentWeek: number, excludeValueKeys?: PoliticalValueKey[]): ActiveTrend {
  let available: TrendDefinition[] = TREND_DEFINITIONS;
  if (excludeValueKeys && excludeValueKeys.length > 0) {
    const filtered = TREND_DEFINITIONS.filter(def => !excludeValueKeys.includes(def.valueKey));
    if (filtered.length > 0) {
      available = filtered;
    }
  }

  const definition = available[Math.floor(Math.random() * available.length)];
  const duration = randomInt(definition.durationRange[0], definition.durationRange[1]);
  const totalShiftMagnitude = randomInRange(definition.shiftRange[0], definition.shiftRange[1]);
  const totalShift = parseFloat((totalShiftMagnitude * definition.direction).toFixed(2));

  // Randomly resolve a title, shortTitle, and description from the arrays at spawn time
  const title = definition.titles[Math.floor(Math.random() * definition.titles.length)];
  const shortTitle = definition.shortTitles[Math.floor(Math.random() * definition.shortTitles.length)];
  const description = definition.descriptions[Math.floor(Math.random() * definition.descriptions.length)];

  // Spread the definition (omitting titles/shortTitles/descriptions arrays) then add resolved singular values
  const { titles: _t, shortTitles: _st, descriptions: _d, ...rest } = definition;

  return {
    ...rest,
    title,
    shortTitle,
    description,
    totalShift,
    weeklyShift: parseFloat((totalShift / duration).toFixed(2)),
    duration,
    remainingWeeks: duration,
    appliedShift: 0,
    startWeek: currentWeek,
    endWeek: currentWeek + duration - 1
  };
}

export function formatTrendStartHeadline(trend: ActiveTrend): string {
  const context = buildTrendContext(trend, 0, 0, trend.remainingWeeks);
  const template = pickTemplate(
    trend.startTemplates,
    `TREND ALERT: ${trend.title} shifts sentiment ${trend.directionLabel}.`
  );
  return formatTrendTemplate(template, context);
}

export interface TrendStepResult {
  trend: ActiveTrend | null;
  values: PoliticalValues;
  blocs?: VoterBloc[];
  ongoingNews?: string;
  completionNews?: string;
  completedTrend?: ActiveTrend;
}

export function applyTrendStep(
  trend: ActiveTrend,
  countryValues: PoliticalValues,
  votingData: number[][],
  blocs?: VoterBloc[]
): TrendStepResult {
  const axisIndex = VALUES.indexOf(trend.valueKey as typeof VALUES[number]);
  const expectedShift = trend.remainingWeeks <= 1
    ? trend.totalShift - trend.appliedShift
    : trend.weeklyShift;
  const currentValue = countryValues[trend.valueKey];
  const nextValueRaw = currentValue + expectedShift;
  const clampedValue = Math.max(-100, Math.min(100, nextValueRaw));
  const actualShift = clampedValue - currentValue;

  const newValues: PoliticalValues = {
    ...countryValues,
    [trend.valueKey]: clampedValue
  };

  let newBlocs = blocs;
  if (blocs && actualShift !== 0) {
    newBlocs = blocs.map(bloc => {
      const newCenterValue = Math.max(-100, Math.min(100, bloc.center[trend.valueKey] + actualShift));
      return {
        ...bloc,
        center: {
          ...bloc.center,
          [trend.valueKey]: newCenterValue
        }
      };
    });
  }

  if (axisIndex !== -1 && votingData[axisIndex]) {
    const axisData = votingData[axisIndex];
    for (let i = 0; i < axisData.length; i++) {
      const noise = actualShift === 0 ? 0 : (Math.random() - 0.5) * Math.abs(actualShift) * TREND_VOTER_NOISE;
      const newVal = axisData[i] + actualShift + noise;
      axisData[i] = Math.max(-100, Math.min(100, newVal));
    }
  }

  const appliedShift = trend.appliedShift + actualShift;
  const remainingWeeks = trend.remainingWeeks - 1;

  const context = buildTrendContext(trend, clampedValue, actualShift, remainingWeeks);
  const ongoingTemplate = pickTemplate(
    trend.ongoingTemplates,
    `Trend Watch: ${trend.title} moves sentiment ${trend.directionLabel}.`
  );
  const ongoingNews = formatTrendTemplate(ongoingTemplate, context);

  if (remainingWeeks > 0) {
    const updatedTrend: ActiveTrend = {
      ...trend,
      remainingWeeks,
      appliedShift
    };
    return {
      trend: updatedTrend,
      values: newValues,
      blocs: newBlocs,
      ongoingNews
    };
  }

  const completionTemplate = pickTemplate(
    trend.completionTemplates,
    `Trend Cools: ${trend.title} leaves a ${Math.abs(appliedShift).toFixed(1)}-point mark ${trend.directionLabel}.`
  );
  const completionNews = formatTrendTemplate(completionTemplate, context);
  const completedTrend: ActiveTrend = {
    ...trend,
    remainingWeeks: 0,
    appliedShift
  };

  return {
    trend: null,
    values: newValues,
    blocs: newBlocs,
    ongoingNews,
    completionNews,
    completedTrend
  };
}

// Track last choices across polls to provide loyalty inertia
let LAST_CHOICES: number[] | null = null;
// Snapshot of voter choices at poll 1 (for transfer flow analysis)
let INITIAL_CHOICES: number[] | null = null;
// Track each voter's bloc assignment (index into country.blocs), -1 for independents
let VOTER_BLOC_IDS: number[] | null = null;

export interface EngineState {
  lastChoices: number[] | null;
  initialChoices: number[] | null;
  voterBlocIds: number[] | null;
}

export function getEngineState(): EngineState {
  return {
    lastChoices: LAST_CHOICES,
    initialChoices: INITIAL_CHOICES,
    voterBlocIds: VOTER_BLOC_IDS
  };
}

export function setEngineState(state: EngineState): void {
  LAST_CHOICES = state.lastChoices;
  INITIAL_CHOICES = state.initialChoices;
  VOTER_BLOC_IDS = state.voterBlocIds;
}

function ensureLastChoices(length: number): void {
  if (!LAST_CHOICES || LAST_CHOICES.length !== length) {
    LAST_CHOICES = new Array(length).fill(-1);
    INITIAL_CHOICES = null; // Reset initial snapshot when electorate changes
  }
}

/** Call once after the first poll to lock in the baseline voter preferences. */
export function snapshotInitialChoices(): void {
  if (LAST_CHOICES) {
    INITIAL_CHOICES = [...LAST_CHOICES];
  }
}

/** Build a voter-transfer matrix comparing poll-1 choices to final choices.
 *  Returns a list of {from, to, count, fromTotal, percentage} entries, sorted by count desc.
 *  `percentage` = share of the FROM-party's original voters who moved to that destination.
 *  Only caller-supplied candidateNames are used; abstainers (index -1) are labelled "Abstain".
 */
export function getVoterTransferMatrix(
  candidateNames: string[]
): Array<{ from: string; to: string; count: number; fromTotal: number; percentage: number }> {
  if (!INITIAL_CHOICES || !LAST_CHOICES || INITIAL_CHOICES.length === 0) return [];

  const total = INITIAL_CHOICES.length;

  // Count every from→to pair
  const counts: Record<string, number> = {};
  // Count totals per from-party
  const fromTotals: Record<string, number> = {};

  for (let i = 0; i < total; i++) {
    const fromIdx = INITIAL_CHOICES[i];
    const toIdx = LAST_CHOICES[i];
    const fromName = fromIdx >= 0 ? (candidateNames[fromIdx] ?? 'Unknown') : 'Abstain';
    const toName = toIdx >= 0 ? (candidateNames[toIdx] ?? 'Unknown') : 'Abstain';
    const key = `${fromName}|||${toName}`;
    counts[key] = (counts[key] ?? 0) + 1;
    fromTotals[fromName] = (fromTotals[fromName] ?? 0) + 1;
  }

  return Object.entries(counts)
    .map(([key, count]) => {
      const [from, to] = key.split('|||');
      const fromTotal = fromTotals[from] ?? 1;
      return { from, to, count, fromTotal, percentage: (count / fromTotal) * 100 };
    })
    .sort((a, b) => b.count - a.count);
}

function softmaxPick(utilities: number[], beta: number): number {
  let maxU = -Infinity;
  for (let i = 0; i < utilities.length; i++) {
    if (utilities[i] > maxU) maxU = utilities[i];
  }

  const exps = new Array(utilities.length);
  let sum = 0;
  for (let i = 0; i < utilities.length; i++) {
    const value = Math.exp(beta * (utilities[i] - maxU));
    exps[i] = value;
    sum += value;
  }

  let r = Math.random() * sum;
  for (let i = 0; i < exps.length; i++) {
    r -= exps[i];
    if (r <= 0) return i;
  }
  return exps.length - 1;
}

// Build normalized salience weights for a voter (sum to number of axes)
function salienceWeightsForVoter(voterIndex: number, country?: Country): number[] {
  const n = VALUES.length;
  const w = new Array(n).fill(1);

  if (!country?.blocs || !VOTER_BLOC_IDS) return w;
  const bi = VOTER_BLOC_IDS[voterIndex] ?? -1;
  if (bi < 0) return w;

  const bloc = country.blocs[bi];
  const s = bloc?.salience as Partial<PoliticalValues> | undefined;
  if (!s) return w;

  for (let i = 0; i < n; i++) {
    const key = VALUES[i];
    const sv = (s as any)[key];
    if (typeof sv === 'number' && Number.isFinite(sv)) {
      w[i] = Math.max(0, sv);
    } else {
      w[i] = 1;
    }
  }

  const sum = w.reduce((a, b) => a + b, 0);
  if (sum <= 0) return new Array(n).fill(1);
  const scale = n / sum; // normalize so average weight is 1
  for (let i = 0; i < n; i++) w[i] *= scale;
  return w;
}

export function generateVotingData(country: Country): number[][] {
  const stdDefault = 45;
  const blocs = country.blocs || [];
  const axes = VALUES; // e.g., ['prog_cons','nat_glob',...]
  const axisCount = axes.length;
  const pop = Math.max(0, country.pop | 0);

  // Prepare arrays per axis
  const data: number[][] = Array.from({ length: axisCount }, () => new Array<number>(pop));
  // Prepare bloc assignment memory
  VOTER_BLOC_IDS = new Array(pop).fill(-1);

  const countryMeans = new Array(axisCount);
  for (let a = 0; a < axisCount; a++) {
    const key = axes[a];
    countryMeans[a] = country.vals[key] ?? 0;
  }

  if (!blocs.length) {
    // Unimodal fallback
    for (let i = 0; i < pop; i++) {
      for (let a = 0; a < axisCount; a++) {
        const v = randomNormal(countryMeans[a], stdDefault);
        data[a][i] = Math.max(-100, Math.min(100, v));
      }
    }
    return data;
  }

  const blocWeights = blocs.map(b => Math.max(0, Math.min(1, b.weight ?? 0)));
  const weightSum = blocWeights.reduce((s, w) => s + w, 0);

  const blocMeans: number[][] = [];
  const blocStds: number[][] = [];
  for (let i = 0; i < blocs.length; i++) {
    const bloc = blocs[i];
    const means = new Array(axisCount);
    const stds = new Array(axisCount);
    const center = bloc.center ?? ({} as PoliticalValues);
    const variance = bloc.variance;
    const varianceByAxis = variance && typeof variance === 'object' ? (variance as any) : null;
    const varianceScalar = typeof variance === 'number' ? variance : undefined;

    for (let a = 0; a < axisCount; a++) {
      const key = axes[a];
      const meanValue = (center as any)[key];
      const rawStd = varianceByAxis && varianceByAxis[key] !== undefined ? varianceByAxis[key] : varianceScalar ?? stdDefault;
      means[a] = meanValue !== undefined ? meanValue : countryMeans[a];
      stds[a] = Math.max(5, Math.min(100, Number(rawStd)));
    }

    blocMeans.push(means);
    blocStds.push(stds);
  }

  function pickBloc(): number | null {
    const r = Math.random();
    if (r > weightSum) return null; // independents
    let acc = 0;
    for (let i = 0; i < blocWeights.length; i++) {
      acc += blocWeights[i];
      if (r <= acc) return i;
    }
    return null;
  }

  // Sample full vectors per voter from one bloc
  for (let i = 0; i < pop; i++) {
    const bi = pickBloc();
    const means = bi !== null ? blocMeans[bi] : countryMeans;
    const stds = bi !== null ? blocStds[bi] : null;
    if (bi !== null) VOTER_BLOC_IDS[i] = bi;
    for (let a = 0; a < axisCount; a++) {
      const v = randomNormal(means[a], stds ? stds[a] : stdDefault);
      data[a][i] = Math.max(-100, Math.min(100, v));
    }
  }

  return data;
}

export function voteForCandidate(voterIndex: number, candidates: Candidate[], data: number[][], country?: Country): number | null {
  // Compute raw squared distances for turnout gating and utilities for choice
  const utilities: number[] = new Array(candidates.length).fill(0);

  // Normalized salience weights for this voter; sum equals number of axes
  const weights = salienceWeightsForVoter(voterIndex, country);

  let minRawSq = Infinity;
  let minWeightedSq = Infinity; // salience-weighted best distance, for turnout gating
  let maxUtility = -Infinity;
  let maxIndex = 0;

  for (let i = 0; i < candidates.length; i++) {
    const cand = candidates[i];
    let sumSq = 0; // raw L2 (kept for reference but not used for gating)
    let weightedLoss = 0; // salience-weighted squared loss for utility and turnout
    for (let o = 0; o < VALUES.length; o++) {
      const d = data[o][voterIndex] - cand.vals[o];
      sumSq += d * d;
      weightedLoss += weights[o] * d * d;
    }
    if (sumSq < minRawSq) minRawSq = sumSq;
    if (weightedLoss < minWeightedSq) minWeightedSq = weightedLoss;

    // Utility: proximity (negative weighted loss) + gentle popularity + optional swing + loyalty
    let u = -weightedLoss + (cand.base_utility_modifier || 0);
    if (cand.swing) {
      u += (cand.swing * 5) * Math.abs(cand.swing * 5);
    }
    // Loyalty inertia: bonus if voter sticks with previous choice
    const last = LAST_CHOICES?.[voterIndex];
    if (last !== undefined && last === i) {
      u += LOYALTY_UTILITY;
    }
    utilities[i] = u;
    if (u > maxUtility) {
      maxUtility = u;
      maxIndex = i;
    }
  }

  // Turnout gating: use salience-weighted distance so voters only abstain based on axes they care about.
  // e.g. a bloc with low env_eco salience won't stay home just because a party drifted on climate.
  if (!VOTE_MANDATE) {
    if (minWeightedSq > Math.pow(TOO_FAR_DISTANCE, 2)) {
      return null;
    }
    // Gradient apathy: if the best candidate is still fairly far away, chance to stay home increases
    const apathyStartDistance = TOO_FAR_DISTANCE * 0.5;
    const apathyStartSq = Math.pow(apathyStartDistance, 2);
    if (minWeightedSq > apathyStartSq) {
      const apathyRangeSq = Math.pow(TOO_FAR_DISTANCE, 2) - apathyStartSq;
      const apathyChance = ((minWeightedSq - apathyStartSq) / apathyRangeSq) * 0.6; // Max 60% chance to abstain
      if (Math.random() < apathyChance) {
        return null; // Voter stays home out of apathy
      }
    }
  }

  // Choice: probabilistic softmax or deterministic max-utility
  if (PROBABILISTIC_VOTING) {
    return softmaxPick(utilities, SOFTMAX_BETA);
  }
  return maxIndex;
}

export function applyPoliticalDynamics(candidates: Candidate[], pollIteration: number): string[] {
  const newsEvents: string[] = [];

  if (pollIteration === 1) {
    // First poll - minimal variation to establish baseline
    for (const candidate of candidates) {
      const baselineVariation = (Math.random() - 0.5) * 0.4; // -0.2 to 0.2
      candidate.base_utility_modifier = (candidate.base_utility_modifier || 0) + baselineVariation;

      // Initialize momentum tracking
      if (!candidate.momentum) candidate.momentum = 0;
      candidate.previous_popularity = candidate.poll_percentage || 0;
    }
    newsEvents.push("ELECTION SEASON OFFICIALLY BEGINS.");
    return newsEvents;
  }

  // Calculate current standings for bandwagon effects
  const currentStandings = [...candidates].sort((a, b) => (b.poll_percentage || 0) - (a.poll_percentage || 0));
  const leader = currentStandings[0];

  // Market volatility - occasional larger political shifts
  const isVolatileMarket = Math.random() < 0.15;
  if (isVolatileMarket && DEBUG) {
    console.log(`DEBUG: Market is experiencing high volatility.`);
  }

  // Track momentum and bandwagon effects for news
  const highMomentumParties: string[] = [];
  const decliningParties: string[] = [];

  for (const candidate of candidates) {
    const pop = candidate.poll_percentage || 0;
    const oldPop = candidate.previous_popularity || 0;

    // Decay base_utility_modifier towards 0 (approx 1-2 points per week as requested)
    // Only decay if it's large enough, but we want it to fade over time
    if (candidate.base_utility_modifier) {
      const decay = 1.0; // Decay rate
      if (candidate.base_utility_modifier > decay) {
        candidate.base_utility_modifier -= decay;
      } else if (candidate.base_utility_modifier < -decay) {
        candidate.base_utility_modifier += decay;
      } else {
        candidate.base_utility_modifier = 0;
      }
    } else {
      candidate.base_utility_modifier = 0;
    }

    // Calculate momentum from recent performance
    const momentumChange = pop - oldPop;
    candidate.momentum = (candidate.momentum || 0) * 0.7 + momentumChange * 0.3;

    // Scaled Incumbency effects - voter fatigue scales non-linearly with poll percentage
    let incumbencyEffect = 0;
    if (pop > 10) {
      // Larger penalty for very popular parties (e.g. 50 pop -> -0.1 * 6.25 = -0.625 penalty per week)
      incumbencyEffect = -0.1 * Math.pow(pop / 20, 2);
    } else if (pop < 2) { // Changed threshold since we are using actual percentages now
      // Stronger recovery for deeply struggling parties
      incumbencyEffect = 0.05 + Math.abs(pop - 2) * 0.01;
    }

    // Scaled Bandwagon effect - dominant leaders get a bigger boost, but clamped
    let bandwagonEffect = 0;
    if (candidate === leader && pop > 15) {
      bandwagonEffect = 0.1 + (pop / 100) * 0.3; // max ~0.4
    }

    // Apply momentum with decay
    const momentumEffect = (candidate.momentum || 0) * 0.3; // 30% of momentum carries forward
    if (candidate.momentum) candidate.momentum *= 0.85; // Momentum decays over time

    // Natural political variation (smaller than old random changes)
    const naturalVariation = (Math.random() - 0.5) * 0.6; // -0.3 to 0.3

    // Apply market volatility per party independently if the market is volatile
    let marketVolatility = 0.0;
    if (isVolatileMarket) {
      marketVolatility = (Math.random() - 0.5) * 3; // -1.5 to 1.5
    }

    // Combine all effects
    const totalChange = incumbencyEffect + bandwagonEffect + momentumEffect + naturalVariation + marketVolatility;

    candidate.base_utility_modifier += totalChange;

    // Store previous popularity for next iteration
    candidate.previous_popularity = pop;

    // Ensure base_utility_modifier doesn't go to extreme values
    if (candidate.base_utility_modifier > 50) {
      candidate.base_utility_modifier = 50;
    } else if (candidate.base_utility_modifier < -50) {
      candidate.base_utility_modifier = -50;
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
  if (Math.random() < 0.1) { // 10% chance of significant economic uncertainty
    economicAnxiety = 0.5 + Math.random() * 1.3; // 0.5 to 1.8
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

  if (polarizationEvent) {
    const polarizationNews = POLARIZATION_EVENTS[Math.floor(Math.random() * POLARIZATION_EVENTS.length)];
    newsEvents.push(polarizationNews);
  }

  // Apply small random changes to voter opinions
  const voterCount = data[0].length;
  const axisCount = VALUES.length;
  for (let voterIndex = 0; voterIndex < voterCount; voterIndex++) {
    for (let i = 0; i < axisCount; i++) {
      if (Math.random() < 0.010) { // 1.0% chance per voter per issue (reduced for stability)
        const change = (Math.random() - 0.5) * 3; // Smaller change range
        const newValue = data[i][voterIndex] + change;
        data[i][voterIndex] = Math.max(-100, Math.min(100, newValue));
      }
    }
  }

  return newsEvents;
}

export interface BlocStatistics {
  blocId: string;
  blocName: string;
  size: number;
  weight: number;
  percentages: Record<string, number>; // party name -> percentage
  leadingParty: string;
  leadingPercentage: number;
  turnout: number; // actual turnout rate for this bloc (0-1)
  expectedVoters: number; // expected voters based on weight
  actualVoters: number; // actual voters who participated
}

export function conductPoll(
  data: number[][],
  candidates: Candidate[],
  pollIteration: number = 0,
  country?: Country,
  isMock: boolean = false
): { results: Array<{ candidate: Candidate; votes: number; percentage: number }>, newsEvents: string[], blocStats?: BlocStatistics[] } {
  // Reset results for this poll
  const pollResults: number[] = new Array(candidates.length).fill(0);
  let notVoted = 0;
  const voterCount = data[0]?.length || 0;
  // Ensure loyalty memory exists for current electorate size
  ensureLastChoices(voterCount);

  // Apply political dynamics to parties
  const politicalNews = isMock ? [] : applyPoliticalDynamics(candidates, pollIteration);

  // Apply voter opinion evolution
  const voterNews = isMock ? [] : applyVoterDynamics(data, pollIteration);

  // Combine news events
  const allNewsEvents = [...politicalNews, ...voterNews];

  // Apply minimal polling noise to simulate margin of error
  const pollingNoise = 0.995 + Math.random() * 0.01; // 0.995 to 1.005

  // Bloc-level tallies (always calculate if blocs exist)
  const blocTallies: Record<string, number[]> = {};
  const blocSizes: Record<string, number> = {};
  const blocTotalVoters: Record<string, number> = {}; // Total voters in each bloc (voted + abstained)
  const blocs = country?.blocs ?? [];
  const hasBlocs = blocs.length > 0 && !!VOTER_BLOC_IDS;
  const blocIds = hasBlocs ? blocs.map(b => b.id) : [];
  if (hasBlocs) {
    blocs.forEach(b => {
      blocTallies[b.id] = new Array(candidates.length).fill(0);
      blocSizes[b.id] = 0;
      blocTotalVoters[b.id] = 0;
    });
  }

  // Poll the entire electorate
  for (let voterIndex = 0; voterIndex < voterCount; voterIndex++) {
    const choice = voteForCandidate(voterIndex, candidates, data, country);

    // Track bloc membership regardless of vote
    if (hasBlocs) {
      const blocId = VOTER_BLOC_IDS![voterIndex];
      if (blocId >= 0 && blocId < blocIds.length) {
        const blocKey = blocIds[blocId];
        blocTotalVoters[blocKey]++; // Count all voters in this bloc

        if (choice !== null) {
          blocTallies[blocKey][choice]++;
          blocSizes[blocKey]++; // Count only those who actually voted
        }
      }
    }

    if (choice !== null) {
      pollResults[choice]++;
      if (LAST_CHOICES && !isMock) LAST_CHOICES[voterIndex] = choice;
    } else {
      notVoted++;
      if (LAST_CHOICES && !isMock) LAST_CHOICES[voterIndex] = -1;
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
      let maxIndex = -1;
      let maxVotes = -Infinity;
      for (let i = 0; i < results.length; i++) {
        if (results[i].votes > maxVotes) {
          maxVotes = results[i].votes;
          maxIndex = i;
        }
      }
      if (maxIndex !== -1) {
        results[maxIndex].percentage += (100 - totalPercentage);
      }
    }
  }

  // Calculate bloc statistics
  const blocStats: BlocStatistics[] = [];
  if (country?.blocs) {
    for (const bloc of country.blocs) {
      const tallies = blocTallies[bloc.id] || [];
      const actualVoters = blocSizes[bloc.id] || 0; // Voters who actually voted
      const totalBlocVoters = blocTotalVoters[bloc.id] || 1; // Total voters in bloc (voted + abstained)
      const expectedVoters = Math.round(data[0].length * bloc.weight); // Expected based on weight
      const turnout = totalBlocVoters > 0 ? actualVoters / totalBlocVoters : 0;

      if (totalBlocVoters > 0) {
        const percentages: Record<string, number> = {};
        let maxPct = 0;
        let leadingParty = '';

        candidates.forEach((c, i) => {
          // Calculate percentage of entire bloc (including non-voters)
          const pct = totalBlocVoters > 0 ? (tallies[i] / totalBlocVoters) * 100 : 0;
          percentages[c.party] = pct;
          if (pct > maxPct) {
            maxPct = pct;
            leadingParty = c.party;
          }
        });

        // Convert bloc ID to display name (e.g., "urban_progressives" -> "Urban Progressives")
        const blocName = bloc.id
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        blocStats.push({
          blocId: bloc.id,
          blocName,
          size: actualVoters,
          weight: bloc.weight,
          percentages,
          leadingParty,
          leadingPercentage: maxPct,
          turnout,
          expectedVoters,
          actualVoters
        });
      }
    }
  }

  // DEBUG: bloc-level shares (only when DEBUG)
  if (DEBUG && country?.blocs) {
    console.log('Bloc shares:');
    for (const stats of blocStats) {
      console.log(stats.blocId, stats.percentages);
    }
  }

  return { results, newsEvents: allNewsEvents, blocStats };
}

// Helper to initialize electorate once at game start
export function initElectorate(country: Country): number[][] {
  const data = generateVotingData(country);
  ensureLastChoices(data[0]?.length || 0);
  return data;
}

const VOTE_FORMATTER = new Intl.NumberFormat();

export function formatVotes(votes: number, scaleFactor: number): string {
  const formattedVotes = Math.abs(votes * scaleFactor + (Math.random() * 1000));
  return VOTE_FORMATTER.format(Math.round(formattedVotes));
}

export function applyEventEffect(
  playerCandidate: Candidate,
  effect: Partial<PoliticalValues>,
  boost: number,
  countryData: Country
): { pollingChange: number; newsEvents: string[] } {
  const newsEvents: string[] = [];

  // Convert generic 'boost' value to an immediate base popularity change
  // A boost of 10-20 is decent coverage, up to 30.
  // We want small realistic bumps: boost 15 -> ~1.25% shift + RNG
  const baseChange = boost / 12.0;

  // Add moderate randomness for event uncertainty
  const randomFactor = (Math.random() - 0.5) * 1.5;
  let pollingChange = baseChange + randomFactor;

  // Minimum effect size ensure events always do *something* if they have a non-zero boost
  if (Math.abs(pollingChange) < 0.5 && boost !== 0) {
    const sign = boost > 0 ? 1 : -1;
    pollingChange = sign * Math.max(0.2, (Math.abs(boost) / 30.0));
  }

  // Cap maximum immediate polling change from a single event
  pollingChange = Math.max(-5.0, Math.min(5.0, pollingChange));

  // Apply polling change with proper bounds checking
  const oldPopularity = playerCandidate.base_utility_modifier || 0;
  playerCandidate.base_utility_modifier = (playerCandidate.base_utility_modifier || 0) + pollingChange;

  // Ensure base_utility_modifier stays within reasonable bounds
  if (playerCandidate.base_utility_modifier > 50) {
    playerCandidate.base_utility_modifier = 50;
  } else if (playerCandidate.base_utility_modifier < -50) {
    playerCandidate.base_utility_modifier = -50;
  }

  // Schedule gradual ideology drifts instead of applying changes instantly.
  // Each affected axis gets an IdeologyDrift spread over EVENT_DRIFT_WEEKS polls.
  const scheduledDrifts: IdeologyDrift[] = [];
  const blocReactions: { axis: string; text: string; impact: number }[] = [];

  for (let i = 0; i < VALUES.length; i++) {
    const valueKey = VALUES[i];
    if (valueKey in effect && effect[valueKey] !== undefined) {
      const effectValue = effect[valueKey]!;
      const totalShift = effectValue * EVENT_EFFECT_MULTIPLIER;
      if (Math.abs(totalShift) < 0.01) continue; // skip negligible shifts

      // --- Bloc Reaction News Generation ---
      // We want to find the bloc that loved this shift the most, and the one that hated it the most.
      if (countryData.blocs && countryData.blocs.length > 0) {
        let bestPositiveBloc: VoterBloc | null = null;
        let maxPositiveImpact = 0;
        let worstNegativeBloc: VoterBloc | null = null;
        let maxNegativeImpact = 0;

        const playerValueBefore = playerCandidate.vals[i];
        const playerValueAfter = playerValueBefore + totalShift;

        for (const bloc of countryData.blocs) {
          const blocValue = bloc.center[valueKey] as number;
          // Calculate if the shift brought the player closer to or further from the bloc
          const distanceBefore = Math.abs(playerValueBefore - blocValue);
          const distanceAfter = Math.abs(playerValueAfter - blocValue);
          const alignmentChange = distanceBefore - distanceAfter; // Positive means grew closer

          // Weight the impact by the bloc's size and salient importance
          const salience = (bloc.salience && (bloc.salience as Record<string, number>)[valueKey]) ? (bloc.salience as Record<string, number>)[valueKey]! : 1;
          const impact = alignmentChange * bloc.weight * salience;

          if (impact > maxPositiveImpact) {
            maxPositiveImpact = impact;
            bestPositiveBloc = bloc;
          } else if (impact < maxNegativeImpact) { // impact < 0
            maxNegativeImpact = impact;
            worstNegativeBloc = bloc;
          }
        }

        const addReactionNews = (bloc: VoterBloc, isPositive: boolean) => {
          const shiftRight = totalShift > 0;
          let category: 'rightShiftPositive' | 'leftShiftNegative' | 'leftShiftPositive' | 'rightShiftNegative';

          if (shiftRight) {
            category = isPositive ? 'rightShiftPositive' : 'rightShiftNegative';
          } else {
            category = isPositive ? 'leftShiftPositive' : 'leftShiftNegative';
          }

          const templates = BLOC_REACTION_TEMPLATES[valueKey]?.[category];
          if (templates && templates.length > 0) {
            const template = templates[Math.floor(Math.random() * templates.length)];
            const blocName = bloc.id
              .split('_')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');

            const text = template
              .replace(/{blocName}/g, blocName)
              .replace(/{nameChoice}/g, playerCandidate.name);

            blocReactions.push({ axis: valueKey, text, impact: Math.abs(isPositive ? maxPositiveImpact : maxNegativeImpact) });
          }
        };

        if (bestPositiveBloc && maxPositiveImpact > 0.05) { // Threshold so small shifts don't always trigger
          addReactionNews(bestPositiveBloc, true);
        }
        if (worstNegativeBloc && maxNegativeImpact < -0.05) {
          addReactionNews(worstNegativeBloc, false);
        }
      }
      // --- End Bloc Reaction News ---

      // Check if there's already an active event drift on this axis — if so, merge
      const existingDrift = playerCandidate.eventDrifts?.find(d => d.axisKey === valueKey);
      if (existingDrift && existingDrift.weeksRemaining > 0) {
        // Add the new total shift to the remaining drift by adjusting its weekly rate
        const remainingOldShift = existingDrift.weeklyShift * existingDrift.weeksRemaining;
        const combinedShift = remainingOldShift + totalShift;
        existingDrift.weeklyShift = combinedShift / EVENT_DRIFT_WEEKS;
        existingDrift.weeksRemaining = EVENT_DRIFT_WEEKS;
        existingDrift.totalWeeks = EVENT_DRIFT_WEEKS;
      } else {
        scheduledDrifts.push({
          axisKey: valueKey as PoliticalValueKey,
          axisIndex: i,
          weeklyShift: totalShift / EVENT_DRIFT_WEEKS,
          weeksRemaining: EVENT_DRIFT_WEEKS,
          totalWeeks: EVENT_DRIFT_WEEKS,
        });
      }

      if (DEBUG) {
        console.log(`DEBUG: Scheduled drift for ${valueKey}: total=${totalShift.toFixed(2)} over ${EVENT_DRIFT_WEEKS} weeks (${(totalShift / EVENT_DRIFT_WEEKS).toFixed(2)}/week)`);
      }
    }
  }

  // Append generated bloc reaction news (max 2 distinct events)
  if (blocReactions.length > 0) {
    blocReactions.sort((a, b) => b.impact - a.impact);
    newsEvents.push(...blocReactions.slice(0, 2).map(r => r.text));
  }

  // Append new drifts to the candidate's existing event drifts
  const existingDrifts = playerCandidate.eventDrifts || [];
  playerCandidate.eventDrifts = [...existingDrifts.filter(d => d.weeksRemaining > 0), ...scheduledDrifts];

  if (DEBUG) {
    console.log(`DEBUG: Boost: ${boost}`);
    console.log(`DEBUG: Final polling change: ${pollingChange.toFixed(2)}`);
    console.log(`DEBUG: Party popularity changed from ${oldPopularity.toFixed(2)} to ${(playerCandidate.base_utility_modifier || 0).toFixed(2)}`);
  }

  return { pollingChange, newsEvents };
}
