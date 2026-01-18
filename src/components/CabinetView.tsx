import React from 'react';
import { Candidate, CABINET_POSITIONS } from '@/types/game';

interface CabinetViewProps {
  cabinetAllocations: Record<string, string[]>;
  winningParty: Candidate;
  candidates: Candidate[];
}

const CabinetView: React.FC<CabinetViewProps> = ({ cabinetAllocations, winningParty, candidates }) => {
  if (!cabinetAllocations || Object.keys(cabinetAllocations).length === 0) return null;

  // Helper to get candidate by party name
  const getCandidateByParty = (party: string) =>
    candidates.find(c => c.party === party);

  // Order positions by importance (descending)
  const orderedPositions = Object.keys(cabinetAllocations)
    .filter(pos => CABINET_POSITIONS[pos])
    .sort((a, b) => CABINET_POSITIONS[b].importance - CABINET_POSITIONS[a].importance);

  // Group positions by importance, then by party
  function getSquishedCabinetGroups() {
    // Map: importance -> [{ position, parties }]
    const importanceMap: Record<number, { position: string, parties: string[] }[]> = {};
    orderedPositions.forEach(position => {
      const importance = CABINET_POSITIONS[position].importance;
      if (!importanceMap[importance]) importanceMap[importance] = [];
      importanceMap[importance].push({ position, parties: cabinetAllocations[position] });
    });

    // For each importance, group positions by party array stringified
    const squished: {
      importance: number,
      partyGroups: { parties: string[], positions: string[] }[]
    }[] = [];

    Object.entries(importanceMap).forEach(([importance, posArr]) => {
      const partyMap: Record<string, { parties: string[], positions: string[] }> = {};
      posArr.forEach(({ position, parties }) => {
        // Only squish if single party per position
        if (parties.length === 1) {
          const key = parties[0];
          if (!partyMap[key]) partyMap[key] = { parties, positions: [] };
          partyMap[key].positions.push(position);
        } else {
          // For multi-party allocations, treat as unique
          const key = JSON.stringify(parties);
          if (!partyMap[key]) partyMap[key] = { parties, positions: [] };
          partyMap[key].positions.push(position);
        }
      });
      squished.push({
        importance: Number(importance),
        partyGroups: Object.values(partyMap)
      });
    });

    // Sort by importance descending
    squished.sort((a, b) => b.importance - a.importance);

    return squished;
  }

  // Font sizes for descending importance (largest for most important)
  const fontSizes = [
    "text-sm sm:text-base",
    "text-xs sm:text-sm",
    "text-xs",
    "text-xs",
    "text-xs"
  ];

  const squishedGroups = getSquishedCabinetGroups();

  return (
    <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-3 sm:p-4">
      <h3 className="campaign-status text-sm sm:text-base font-bold text-blue-400 mb-3">
        COALITION CABINET
      </h3>
      <div className="space-y-1.5">
        {/* Prime Minister */}
        <div className="flex items-center p-2 bg-green-900/30 border border-green-600 rounded font-bold text-xs sm:text-sm">
          <div
            className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-white mr-2 flex-shrink-0"
            style={{ backgroundColor: winningParty.colour }}
          ></div>
          <span className="text-green-400 uppercase mr-2">Prime Minister:</span>
          <span className="text-white">{winningParty.name} ({winningParty.party})</span>
        </div>
        {/* Deputy Prime Minister (special display only if different party) */}
        {cabinetAllocations['Deputy Prime Minister'] &&
          cabinetAllocations['Deputy Prime Minister'][0] &&
          cabinetAllocations['Deputy Prime Minister'][0] !== winningParty.party &&
          (() => {
            const deputyParty = cabinetAllocations['Deputy Prime Minister'][0];
            const deputy = getCandidateByParty(deputyParty);
            if (!deputy) return null;
            return (
              <div className="flex items-center p-2 bg-blue-900/30 border border-blue-600 rounded font-bold text-xs sm:text-sm">
                <div
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-white mr-2 flex-shrink-0"
                  style={{ backgroundColor: deputy.colour }}
                ></div>
                <span className="text-blue-400 uppercase mr-2">Deputy Prime Minister:</span>
                <span className="text-white">{deputy.name} ({deputy.party})</span>
              </div>
            );
          })()}
        {/* Squished Cabinet Positions */}
        {squishedGroups.map(({ importance, partyGroups }, groupIdx) =>
          partyGroups.map(({ parties, positions }, idx) => {
            // Skip Deputy PM if shown above
            if (
              positions.length === 1 &&
              positions[0] === 'Deputy Prime Minister' &&
              cabinetAllocations['Deputy Prime Minister'] &&
              cabinetAllocations['Deputy Prime Minister'][0] &&
              cabinetAllocations['Deputy Prime Minister'][0] !== winningParty.party
            ) {
              return null;
            }
            // Get candidate for color (if single party)
            const party = parties.length === 1 ? parties[0] : null;
            const cand = party ? getCandidateByParty(party) : null;

            // Pick font size based on importance order
            const uniqueImportances = squishedGroups.map(g => g.importance);
            const importanceIdx = uniqueImportances.indexOf(importance);
            const fontSizeClass = fontSizes[importanceIdx] || fontSizes[fontSizes.length - 1];

            return (
              <div
                key={positions.join(',') + parties.join(',') + idx}
                className={`flex items-center p-2 bg-slate-700/50 border border-slate-600 rounded ${fontSizeClass}`}
              >
                {party && (
                  <span
                    className="w-3 h-3 sm:w-4 sm:h-4 rounded-full border border-white mr-1.5 flex-shrink-0"
                    style={{ backgroundColor: cand?.colour || '#888' }}
                  ></span>
                )}
                {!party && (
                  <>
                  {parties.map((p, i) => {
                    const c = getCandidateByParty(p);
                    return (
                      <span
                        key={p}
                        className="w-3 h-3 sm:w-4 sm:h-4 rounded-full border border-white mr-1 flex-shrink-0"
                        style={{ backgroundColor: c?.colour || '#888' }}
                      ></span>
                    )
                  })}
                  </>
                )}
                <span className="font-bold mr-2 text-slate-300 uppercase text-xs sm:text-sm">
                  {positions.join(', ')}:
                </span>
                <span className="text-white text-xs sm:text-sm">
                  {party && (
                    <span>{party}</span>
                  )}
                  {!party && (
                    <>
                      {parties.map((p, i) => (
                        <span key={p}>
                          {p}
                          {i < parties.length - 1 && ', '}
                        </span>
                      ))}
                    </>
                  )}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CabinetView;
