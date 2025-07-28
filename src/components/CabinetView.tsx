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
        {/* Other Cabinet Positions */}
        {orderedPositions.map(position => (
          // Only skip Deputy PM if it's being shown specially above
          (!(
            position === 'Deputy Prime Minister' &&
            cabinetAllocations['Deputy Prime Minister'] &&
            cabinetAllocations['Deputy Prime Minister'][0] &&
            cabinetAllocations['Deputy Prime Minister'][0] !== winningParty.party
          )) && (
            <div key={position} className="flex items-center p-3 bg-slate-100 border border-slate-300 rounded-lg">
              <span className="font-bold mr-2">{position}:</span>
              {cabinetAllocations[position].map((party, idx) => {
                const cand = getCandidateByParty(party);
                return (
                  <span key={party+idx} className="flex items-center mr-4">
                    <span
                      className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border border-slate-600 mr-1"
                      style={{ backgroundColor: cand?.colour || '#ccc' }}
                    ></span>
                    <span className="font-semibold">{party}</span>
                    {idx < cabinetAllocations[position].length - 1 && <span className="mx-1">,</span>}
                  </span>
                );
              })}
            </div>
          )
        ))}
      </div>
    </div>
  );
};

export default CabinetView;
