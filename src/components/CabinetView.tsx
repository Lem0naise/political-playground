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

  const squishedGroups = getSquishedCabinetGroups();

  return (
    <div className="rounded-lg p-4 sm:p-6 mb-6 sm:mb-8 bg-[var(--newspaper-bg)] border border-[var(--ink-black)] shadow newspaper-header max-w-2xl mx-auto font-oswald">
      <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-[var(--ink-black)]">
        Coalition Cabinet
      </h2>
      <div className="space-y-2">
        {/* Prime Minister */}
        <div className="flex items-center p-3 bg-green-100 border border-green-300 rounded-lg mb-2">
          <div
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-green-700 mr-3"
            style={{ backgroundColor: winningParty.colour }}
          ></div>
          <span className="font-bold mr-2 text-green-900">Prime Minister:</span>
          <span className="font-semibold">{winningParty.name} ({winningParty.party})</span>
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
              <div className="flex items-center p-3 bg-blue-100 border border-blue-300 rounded-lg mb-2">
                <div
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-blue-700 mr-3"
                  style={{ backgroundColor: deputy.colour }}
                ></div>
                <span className="font-bold mr-2 text-blue-900">Deputy Prime Minister:</span>
                <span className="font-semibold">{deputy.name} ({deputy.party})</span>
              </div>
            );
          })()}
        {/* Squished Cabinet Positions */}
        {squishedGroups.map(({ importance, partyGroups }) =>
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
            return (
              <div key={positions.join(',') + parties.join(',') + idx} className="flex items-center p-3 bg-slate-100 border border-slate-300 rounded-lg">
                <span className="font-bold mr-2">
                  {positions.join(', ')}:
                </span>
                <span className="flex items-center">
                  {party && (
                    <>
                      <span
                        className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border border-slate-600 mr-1"
                        style={{ backgroundColor: cand?.colour || '#ccc' }}
                      ></span>
                      <span className="font-semibold">{party}</span>
                    </>
                  )}
                  {!party && (
                    <>
                      {parties.map((p, i) => {
                        const c = getCandidateByParty(p);
                        return (
                          <span key={p} className="flex items-center mr-2">
                            <span
                              className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border border-slate-600 mr-1"
                              style={{ backgroundColor: c?.colour || '#ccc' }}
                            ></span>
                            <span className="font-semibold">{p}</span>
                            {i < parties.length - 1 && <span className="mx-1">,</span>}
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
