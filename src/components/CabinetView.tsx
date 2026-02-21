import React from 'react';
import { Candidate, CABINET_POSITIONS } from '@/types/game';

interface CabinetViewProps {
  cabinetAllocations: Record<string, string[]>;
  winningParty: Candidate;
  candidates: Candidate[];
}

const CabinetView: React.FC<CabinetViewProps> = ({ cabinetAllocations, winningParty, candidates }) => {
  if (!cabinetAllocations || Object.keys(cabinetAllocations).length === 0) return null;

  const getCandidateByParty = (party: string) => candidates.find(c => c.party === party);

  const orderedPositions = Object.keys(cabinetAllocations)
    .filter(pos => CABINET_POSITIONS[pos]) // ensure it exists
    .sort((a, b) => CABINET_POSITIONS[b].importance - CABINET_POSITIONS[a].importance);

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-md">
      <div className="flex items-center justify-between mb-3 border-b border-slate-700 pb-2">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide">
          Coalition Cabinet
        </h3>
        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider bg-slate-800 px-2 py-0.5 rounded">
          {Object.keys(cabinetAllocations).length} Portfolios
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {/* Prime Minister Card (Full Width) */}
        <div className="col-span-2 md:col-span-4 border rounded p-2 flex items-center gap-3"
          style={{ backgroundColor: `${winningParty.colour}30`, borderColor: winningParty.colour }}>
          <div className="flex items-center gap-3 w-full">
            <div className="w-2 h-full absolute left-0 top-0 bottom-0" style={{ backgroundColor: winningParty.colour }}></div>
            <div className="flex-1 pl-2">
              <div className="text-[10px] sm:text-xs font-bold text-slate-300 uppercase tracking-wider">Prime Minister</div>
              <div className="text-sm sm:text-base font-black text-white leading-tight" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}>
                {winningParty.name}
              </div>
              <div className="text-[10px] text-slate-200 font-medium">{winningParty.party}</div>
            </div>
            <div className="hidden sm:block text-right pr-2">
              <div className="text-[10px] uppercase tracking-widest text-slate-200 font-bold opacity-80">Head of Government</div>
            </div>
          </div>
        </div>

        {/* Dynamic Cabinet Position Cards */}
        {orderedPositions.map(pos => {
          const details = CABINET_POSITIONS[pos];
          const parties = cabinetAllocations[pos];

          // Determine if it's a single party holding all slots for this position
          const allSameParty = parties.every(p => p === parties[0]);
          const mainCandidate = getCandidateByParty(parties[0]);

          // Size weight: >= 25 importance is full width, >= 15 is half width, else quarter width
          let colSpan = 'col-span-1 md:col-span-1';
          if (details.importance >= 25) colSpan = 'col-span-2 md:col-span-4';
          else if (details.importance >= 15) colSpan = 'col-span-2 md:col-span-2';

          return (
            <div
              key={pos}
              className={`rounded border p-2 relative overflow-hidden flex flex-col justify-between ${colSpan}`}
              style={{
                backgroundColor: allSameParty ? `${mainCandidate?.colour}40` : 'rgba(30, 41, 59, 0.8)',
                borderColor: allSameParty ? mainCandidate?.colour : 'rgba(71, 85, 105, 0.8)'
              }}
            >
              {allSameParty && (
                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: mainCandidate?.colour }}></div>
              )}

              <div className="relative z-10 mb-1.5 pl-1.5">
                <div className="flex items-start justify-between gap-1">
                  <h4 className="font-bold text-white text-xs sm:text-sm leading-tight drop-shadow-md">
                    {pos}
                  </h4>
                  {details.importance >= 20 && (
                    <span className="flex-shrink-0 px-1 py-0.5 rounded text-[8px] font-bold bg-slate-900 border border-slate-600 text-slate-300">
                      KEY
                    </span>
                  )}
                </div>
                {details.max_slots > 1 && (
                  <div className="text-[9px] text-slate-300 mt-0.5 uppercase tracking-wide font-semibold opacity-80">
                    {parties.length} / {details.max_slots} Seats
                  </div>
                )}
              </div>

              <div className="relative z-10 flex flex-wrap gap-1 mt-auto pl-1.5">
                {parties.map((partyName, i) => {
                  const cand = getCandidateByParty(partyName);
                  return (
                    <div
                      key={`${partyName}-${i}`}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded border"
                      style={{
                        backgroundColor: `${cand?.colour || '#475569'}80`,
                        borderColor: cand?.colour || '#475569'
                      }}
                      title={cand?.name || partyName}
                    >
                      <span className="text-[10px] font-bold text-white truncate max-w-[120px] drop-shadow-md">
                        {partyName}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CabinetView;
