import React from 'react';
import { Candidate, CABINET_POSITIONS } from '../types/game';

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
    "text-sm sm:text-xl",
    "text-sm sm:text-lg",
    "text-xs sm:text-base",
    "text-xs sm:text-base",
    "text-xs sm:text-xs"
  ];

  const squishedGroups = getSquishedCabinetGroups();

  return (
    <div className="rounded-lg p-4 sm:p-6 mb-6 sm:mb-8 bg-[var(--newspaper-bg)] border border-[var(--ink-black)] shadow newspaper-header max-w-2xl mx-auto font-oswald">
      <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-[var(--ink-black)]">
        Coalition Cabinet
      </h2>
      <div className="space-y-2">
        {/* Prime Minister */}
        <div className={`flex items-center p-3 bg-green-100 border border-green-300 rounded-lg mb-2 font-extrabold text-sm sm:text-xl text-left`}>
          <div
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-green-700 mr-3"
            style={{ backgroundColor: winningParty.colour }}
          ></div>
          <span className="font-bold mr-2 text-green-900 uppercase">Prime Minister:</span>
          <span className="font-medium">{winningParty.name} ({winningParty.party})</span>
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
              <div className={`flex items-center p-3 bg-blue-100 border border-blue-300 rounded-lg mb-2 font-bold text-sm sm:text-lg text-left`}>
                <div
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-blue-700 mr-3"
                  style={{ backgroundColor: deputy.colour }}
                ></div>
                <span className="font-bold mr-2 text-blue-900 uppercase ">Deputy Prime Minister:</span>
                <span className="font-medium">{deputy.name} ({deputy.party})</span>
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
            // Find the index of this importance in the sorted list of unique importances
            // so that the largest importance gets the largest font
            const uniqueImportances = squishedGroups.map(g => g.importance);
            const importanceIdx = uniqueImportances.indexOf(importance);
            const fontSizeClass = fontSizes[importanceIdx] || fontSizes[fontSizes.length - 1];
            
            console.log(positions);
            console.log(uniqueImportances);
            console.log(importanceIdx)
            console.log(fontSizes);
            console.log(fontSizeClass);

            return (
              <div
                key={positions.join(',') + parties.join(',') + idx}
                className={`flex items-center p-3 bg-slate-100 border border-slate-300 rounded-lg font-bold ${fontSizeClass}`}
              >
                {party && (<span
                    className="w-4 h-4 sm:w-5 sm:h-6 rounded-full border border-slate-600 mr-1 flex-shrink-0 flex-none"
                    style={{ backgroundColor: cand?.colour || '#ccc' }}
                ></span>)}
                {!party && (
                  <>
                  {parties.map((p, i) => {
                    const c = getCandidateByParty(p);
                    return (
                      <span
                        key={p}
                        className="w-3 h-4 sm:w-4 sm:h-5 rounded-full border border-slate-600 mr-1"
                        style={{ backgroundColor: c?.colour || '#ccc' }}
                     ></span>
                    )
                  })}
                  </>
                )}
                <span className="font-bold mr-2 text-left ml-1 uppercase">
                  {positions.join(', ')}:
                </span>
                <span className="font-normal">
                  {party && (
                    <>
                      <span className="font-normal">{party}</span>
                    </>
                  )}
                  {!party && (
                    <>
                      {parties.map((p, i) => {
                        const c = getCandidateByParty(p);
                        return (
                          <span key={p}>
                            <span className="font-normal">{p}</span>
                            {i < parties.length - 1 && <span>{`, `}</span>}
                          </span>
                        );
                      })}
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
