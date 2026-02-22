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

  const pmCandidate = winningParty;

  const deputyPMparties = cabinetAllocations['Deputy Prime Minister'] || [];
  const deputyPMParty = deputyPMparties.length > 0 ? deputyPMparties[0] : null;
  const deputyCandidate = deputyPMParty ? getCandidateByParty(deputyPMParty) : null;

  let totalPortfolios = 0;
  const portfoliosByParty: Record<string, number> = {};

  Object.keys(cabinetAllocations).forEach(pos => {
    const parties = cabinetAllocations[pos];
    parties.forEach(party => {
      totalPortfolios++;
      portfoliosByParty[party] = (portfoliosByParty[party] || 0) + 1;
    });
  });

  const participantParties = Object.keys(portfoliosByParty)
    .sort((a, b) => portfoliosByParty[b] - portfoliosByParty[a])
    .map(party => {
      return {
        candidate: getCandidateByParty(party),
        count: portfoliosByParty[party],
        percentage: (portfoliosByParty[party] / totalPortfolios) * 100
      };
    })
    .filter(p => p.candidate);

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 sm:p-4 shadow-md mt-4">
      <div className="flex items-center justify-between mb-4 border-b border-slate-700 pb-2">
        <h3 className="text-sm sm:text-base font-bold text-slate-200 uppercase tracking-wide">
          Coalition Cabinet
        </h3>
        <span className="text-[10px] sm:text-xs font-medium text-slate-400 uppercase tracking-wider bg-slate-800 px-2 py-0.5 rounded">
          {totalPortfolios} Portfolios
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {/* Prime Minister Card */}
        <div className="border rounded p-3 flex items-center gap-3"
          style={{ backgroundColor: `${pmCandidate.colour}30`, borderColor: pmCandidate.colour }}>
          <div className="flex items-center gap-3 w-full relative">
            <div className="w-2 h-full absolute left-[-12px] top-[-12px] bottom-[-12px] rounded-l" style={{ backgroundColor: pmCandidate.colour }}></div>
            <div className="flex-1 pl-1">
              <div className="text-[10px] sm:text-xs font-bold text-slate-300 uppercase tracking-wider">Prime Minister</div>
              <div className="text-sm sm:text-lg font-black text-white leading-tight mt-0.5" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}>
                {pmCandidate.name}
              </div>
              <div className="text-xs text-slate-200 font-medium mt-0.5">{pmCandidate.party}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-widest text-slate-300 font-bold opacity-80 bg-slate-900/50 px-2 py-1 rounded">Head of Govt</div>
            </div>
          </div>
        </div>

        {/* Deputy Prime Minister Card (if exists) */}
        {deputyCandidate && (
          <div className="border rounded p-3 flex items-center gap-3"
            style={{ backgroundColor: `${deputyCandidate.colour}30`, borderColor: deputyCandidate.colour }}>
            <div className="flex items-center gap-3 w-full relative">
              <div className="w-2 h-full absolute left-[-12px] top-[-12px] bottom-[-12px] rounded-l" style={{ backgroundColor: deputyCandidate.colour }}></div>
              <div className="flex-1 pl-1">
                <div className="text-[10px] sm:text-xs font-bold text-slate-300 uppercase tracking-wider">Deputy Prime Minister</div>
                <div className="text-sm sm:text-lg font-black text-white leading-tight mt-0.5" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}>
                  {deputyCandidate.name}
                </div>
                <div className="text-xs text-slate-200 font-medium mt-0.5">{deputyCandidate.party}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
        <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Cabinet Makeup</div>
        <div className="relative h-6 sm:h-8 w-full rounded-full overflow-hidden bg-slate-700 flex shadow-inner">
          {participantParties.map((p, i) => (
            <div
              key={p.candidate!.id}
              className="h-full transition-all duration-500 border-r border-slate-900/30 last:border-r-0 flex items-center justify-center relative group"
              style={{
                backgroundColor: p.candidate!.colour,
                width: `${p.percentage}%`,
                opacity: 0.9,
              }}
            >
              {p.percentage >= 15 && (
                <span className="text-[10px] sm:text-xs font-bold text-white drop-shadow-md truncate px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {p.candidate!.party}
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 sm:gap-3 mt-3">
          {participantParties.map((p) => (
            <div key={p.candidate!.id} className="flex items-center gap-1.5 sm:gap-2 text-xs bg-slate-800 border border-slate-600 shadow-sm rounded-md px-2 py-1">
              <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: p.candidate!.colour }} />
              <span className="text-white font-medium">{p.candidate!.party}</span>
              <span className="text-slate-400 bg-slate-900/50 px-1.5 py-0.5 rounded text-[10px] font-bold">{p.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CabinetView;
