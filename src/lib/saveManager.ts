import { GameState } from '@/types/game';
import { getEngineState, setEngineState, EngineState } from '@/lib/gameEngine';

export interface SaveGame {
    version: string;
    gameState: GameState;
    engineState: EngineState;
}

export function exportSaveGame(gameState: GameState) {
    const save: SaveGame = {
        version: '1.0',
        gameState,
        engineState: getEngineState()
    };

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

        // Check if it's a new format save
        if (data.version && data.gameState && data.engineState !== undefined) {
            setEngineState(data.engineState);
            return data.gameState;
        }

        // Check if it's an old legacy GameState directly (fallback)
        if (data.country && data.phase) {
            // It's a raw GameState. We can't restore engine state, so it will be null.
            return data as GameState;
        }
    } catch (e) {
        console.error("Failed to parse save file", e);
    }
    return null;
}
