import { GameState, NewsItem } from '@/types/game';
import { getEngineState, setEngineState, resetEngineState, EngineState } from '@/lib/gameEngine';
import { track } from '@/lib/analytics';

export const SAVE_VERSION = '2.0';

export interface SaveGame {
    version: string;
    gameState: GameState;
    engineState: EngineState;
}

const VALID_PHASES: GameState['phase'][] = [
    'setup', 'party-selection', 'partyMerging', 'player-selection', 'campaign', 'results', 'coalition'
];

const PRIORITIES: NewsItem['priority'][] = ['critical', 'high', 'medium', 'low'];

function isPriority(value: unknown): value is NewsItem['priority'] {
    return typeof value === 'string' && (PRIORITIES as string[]).includes(value);
}

function normalizeNews(raw: unknown): NewsItem[] {
    if (!Array.isArray(raw)) return [];
    const items: NewsItem[] = [];
    for (const entry of raw) {
        // v3.x saves stored plain strings; v4 stores NewsItem objects.
        if (typeof entry === 'string') {
            items.push({ text: entry, priority: 'medium' });
        } else if (entry && typeof entry === 'object' && typeof (entry as { text?: unknown }).text === 'string') {
            const item = entry as Partial<NewsItem>;
            items.push({
                text: item.text as string,
                priority: isPriority(item.priority) ? item.priority : 'medium',
                category: item.category
            });
        }
    }
    return items;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** Accept v1 (raw GameState / v3.17 string news) and v2 saves, filling fields
 *  added since the save was written. Returns null for unusable input. */
export function normalizeGameState(raw: unknown): GameState | null {
    if (!isRecord(raw) || typeof raw.country !== 'string' || !raw.country) return null;

    const countryData = raw.countryData;
    if (!isRecord(countryData) || !isRecord(countryData.vals)) return null;

    const candidatesRaw = raw.candidates;
    if (!Array.isArray(candidatesRaw) || candidatesRaw.length === 0) return null;

    const candidates = candidatesRaw.filter((candidate): candidate is Record<string, unknown> => {
        return isRecord(candidate)
            && typeof candidate.id === 'number'
            && typeof candidate.party === 'string'
            && Array.isArray(candidate.vals)
            && candidate.vals.length === 7;
    }) as unknown as GameState['candidates'];
    if (candidates.length !== candidatesRaw.length) return null;

    const playerCandidate = (raw.playerCandidate as GameState['playerCandidate'])
        ?? candidates.find(candidate => candidate.is_player)
        ?? null;

    const totalPolls = Number.isFinite(raw.totalPolls) && (raw.totalPolls as number) > 0
        ? Math.floor(raw.totalPolls as number)
        : 52;
    const currentPoll = Number.isFinite(raw.currentPoll) ? Math.max(0, Math.floor(raw.currentPoll as number)) : 0;
    const phase = VALID_PHASES.includes(raw.phase as GameState['phase'])
        ? raw.phase as GameState['phase']
        : 'setup';

    const base = raw as Record<string, unknown>;
    return {
        country: raw.country,
        countryData: countryData as unknown as GameState['countryData'],
        partyList: typeof base.partyList === 'string' ? base.partyList : '',
        candidates,
        playerCandidate,
        actionsRemaining: typeof base.actionsRemaining === 'number' ? base.actionsRemaining : undefined,
        currentPoll,
        totalPolls,
        pollResults: Array.isArray(base.pollResults) ? base.pollResults as GameState['pollResults'] : [],
        previousPollResults: isRecord(base.previousPollResults) ? base.previousPollResults as GameState['previousPollResults'] : {},
        initialPollResults: isRecord(base.initialPollResults) ? base.initialPollResults as GameState['initialPollResults'] : {},
        politicalNews: normalizeNews(base.politicalNews),
        playerEventNews: Array.isArray(base.playerEventNews)
            ? (base.playerEventNews as unknown[]).filter((item): item is string => typeof item === 'string')
            : [],
        votingData: Array.isArray(base.votingData) ? base.votingData as number[][] : [],
        pendingParties: Array.isArray(base.pendingParties) ? base.pendingParties : undefined,
        coalitionState: base.coalitionState as GameState['coalitionState'],
        testingData: base.testingData,
        incumbentGovernment: Array.isArray(base.incumbentGovernment)
            ? (base.incumbentGovernment as unknown[]).filter((party): party is string => typeof party === 'string')
            : undefined,
        phase,
        pollingHistory: Array.isArray(base.pollingHistory) ? base.pollingHistory as GameState['pollingHistory'] : [],
        activeTrend: Array.isArray(base.activeTrend) ? base.activeTrend as GameState['activeTrend'] : [],
        trendHistory: Array.isArray(base.trendHistory) ? base.trendHistory as GameState['trendHistory'] : [],
        nextTrendPoll: typeof base.nextTrendPoll === 'number' ? base.nextTrendPoll : null,
        blocStats: Array.isArray(base.blocStats) ? base.blocStats as GameState['blocStats'] : undefined,
        previousBlocStats: Array.isArray(base.previousBlocStats) ? base.previousBlocStats as GameState['previousBlocStats'] : undefined,
        initialBlocStats: Array.isArray(base.initialBlocStats) ? base.initialBlocStats as GameState['initialBlocStats'] : undefined,
        blocStatsHistory: Array.isArray(base.blocStatsHistory) ? base.blocStatsHistory as GameState['blocStatsHistory'] : [],
        postElectionStats: base.postElectionStats as GameState['postElectionStats'],
        eventVariables: base.eventVariables ?? null,
        targetedBlocId: typeof base.targetedBlocId === 'string' ? base.targetedBlocId : null,
        targetingStartWeek: typeof base.targetingStartWeek === 'number' ? base.targetingStartWeek : null,
        targetingWeeksActive: typeof base.targetingWeeksActive === 'number' ? base.targetingWeeksActive : 0,
        targetedAxis: typeof base.targetedAxis === 'string' ? base.targetedAxis as GameState['targetedAxis'] : null,
        targetingCooldown: typeof base.targetingCooldown === 'number' ? base.targetingCooldown : 0,
        pendingPlayerEvent: base.pendingPlayerEvent as GameState['pendingPlayerEvent'] ?? null
    };
}

function isEngineState(value: unknown): value is EngineState {
    if (!isRecord(value)) return false;
    const ok = (v: unknown) => v === null || Array.isArray(v);
    return ok(value.lastChoices) && ok(value.initialChoices) && ok(value.voterBlocIds);
}

export function exportSaveGame(gameState: GameState) {
    const save: SaveGame = {
        version: SAVE_VERSION,
        gameState,
        engineState: getEngineState()
    };

    track('save', {
        country: gameState.country,
        party: gameState.playerCandidate?.party,
        partyList: gameState.partyList,
        week: gameState.currentPoll,
        totalPolls: gameState.totalPolls
    });

    const blob = new Blob([JSON.stringify(save)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const clean = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    const countryName = clean(gameState.country) || 'unknown';
    const partyName = clean(gameState.playerCandidate?.party || 'none') || 'none';
    const date = new Date().toISOString().split('T')[0];
    const fileName = `${countryName}-${partyName}-polplayground-${date}.json`;

    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", url);
    dlAnchorElem.setAttribute("download", fileName);
    document.body.appendChild(dlAnchorElem);
    dlAnchorElem.click();
    document.body.removeChild(dlAnchorElem);
    URL.revokeObjectURL(url);
}

export function importSaveGame(jsonString: string): GameState | null {
    try {
        const data = JSON.parse(jsonString);

        // New format: { version, gameState, engineState } (v1.0 / v2.0).
        if (isRecord(data) && isRecord(data.gameState)) {
            const gameState = normalizeGameState(data.gameState);
            if (!gameState) return null;
            if (isEngineState(data.engineState)) {
                setEngineState(data.engineState);
            } else {
                // No usable voter memory: start clean rather than inherit another game's.
                resetEngineState();
            }
            trackSaveLoad(gameState);
            return gameState;
        }

        // Legacy fallback: a raw GameState was saved directly.
        const gameState = normalizeGameState(data);
        if (gameState) {
            resetEngineState();
            trackSaveLoad(gameState);
            return gameState;
        }
    } catch (e) {
        console.error("Failed to parse save file", e);
    }
    return null;
}

function trackSaveLoad(gameState: GameState) {
    track('save_load', {
        country: gameState.country,
        party: gameState.playerCandidate?.party,
        partyList: gameState.partyList,
        week: gameState.currentPoll,
        totalPolls: gameState.totalPolls,
        phase: gameState.phase
    });
}
