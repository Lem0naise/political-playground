import { useState, useEffect, useRef } from 'react';
import { useGame } from '@/contexts/GameContext';
import {
  calculatePartyCompatibility,
  calculateCoalitionWillingness,
  getAvailableCabinetPositions,
  getPartyPriorityPositions,
  generateCoalitionPolicyQuestion,
  simulateCoalitionNegotiation,
  findBestCoalitionPartners,
  simulateAICoalitionNegotiation,
  generatePlayerApproachOffer,
  evaluatePlayerResponse,
  shouldAIApproachPlayer,
  generateCounterDemands,
  evaluateCounterResponse,
  findOptimalCoalitions,
  type CounterDemand,
} from '@/lib/coalitionEngine';
import { Candidate } from '@/types/game';
import CabinetView from './CabinetView';
import { getIdeologyProfile } from '@/lib/ideologyProfiler';

// ─── NegotiationModal (player-led negotiation with counter-offers) ─────────────

interface NegotiationModalProps {
  leadParty: Candidate;
  partnerParty: Candidate;
  leadPercentage: number;
  partnerPercentage: number;
  onComplete: (success: boolean, positions: string[]) => void;
  onCancel: () => void;
  cabinetAllocations: Record<string, string[]>;
}

function NegotiationModal({
  leadParty, partnerParty, leadPercentage, partnerPercentage,
  onComplete, onCancel, cabinetAllocations,
}: NegotiationModalProps) {
  const [round, setRound] = useState(1);
  const [currentStep, setCurrentStep] = useState<'policy' | 'cabinet' | 'reviewing' | 'result' | 'counter'>('policy');
  const [policyResponses, setPolicyResponses] = useState<number[]>([]);
  const [offeredPositions, setOfferedPositions] = useState<string[]>([]);
  const [negotiationResult, setNegotiationResult] = useState<any>(null);
  const [counterDemands, setCounterDemands] = useState<CounterDemand[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const policyQuestions: any[] = [];
  const q1 = generateCoalitionPolicyQuestion(leadParty, partnerParty);
  if (q1) policyQuestions.push(q1);
  const q2 = generateCoalitionPolicyQuestion(partnerParty, leadParty);
  if (q2 && q2.topic !== q1?.topic) policyQuestions.push(q2);

  const availablePositions = getAvailableCabinetPositions(cabinetAllocations);
  const priorityPositions = getPartyPriorityPositions(partnerParty);

  const handlePolicyResponse = (appeal: number) => {
    const newResponses = [...policyResponses, appeal];
    setPolicyResponses(newResponses);
    if (currentQuestionIndex + 1 < policyQuestions.length) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setCurrentStep('cabinet');
    }
  };

  const makeOffer = () => {
    setCurrentStep('reviewing');
    setTimeout(() => {
      const totalImportance = offeredPositions.reduce((sum, pos) => {
        const p = availablePositions.find(p => p.name === pos);
        return sum + (p?.importance || 0);
      }, 0);
      const result = simulateCoalitionNegotiation(
        leadParty, partnerParty, leadPercentage, partnerPercentage, totalImportance, policyResponses
      );
      setNegotiationResult(result);
      if (result.success || result.finalAppeal < 40) {
        setCurrentStep('result');
      } else {
        const demands = generateCounterDemands(leadParty, partnerParty, offeredPositions, cabinetAllocations, result.finalAppeal);
        setCounterDemands(demands);
        setCurrentStep('counter');
      }
    }, 800 + Math.random() * 1200);
  };

  const handleCounterResponse = (accept: boolean) => {
    setCurrentStep('reviewing');
    setTimeout(() => {
      const selectedDemands = accept ? counterDemands : [];
      const result = evaluateCounterResponse(
        leadParty, partnerParty, leadPercentage, partnerPercentage,
        selectedDemands, counterDemands, negotiationResult.finalAppeal, policyResponses
      );
      setNegotiationResult(result);
      if (result.success) {
        if (accept) {
          const newPositions = [...new Set([...offeredPositions, ...counterDemands.filter(d => d.type === 'position_add').map(d => d.detail)])];
          setOfferedPositions(newPositions);
        }
        setCurrentStep('result');
      } else if (result.finalAppeal >= 60 && round < 3) {
        setRound(round + 1);
        const newDemands = generateCounterDemands(leadParty, partnerParty, offeredPositions, cabinetAllocations, result.finalAppeal);
        setCounterDemands(newDemands);
        setCurrentStep('counter');
      } else {
        setCurrentStep('result');
      }
    }, 800 + Math.random() * 1200);
  };

  const mb = 'fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50';
  const cb = 'bg-slate-800 border border-slate-700 rounded-xl p-5 sm:p-7 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl';

  const PartyBar = () => (
    <div className="flex items-center justify-center gap-4 mb-5 pb-4 border-b border-slate-700">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full border-2 border-white/30 flex-shrink-0" style={{ backgroundColor: leadParty.colour }} />
        <div>
          <div className="font-bold text-white text-sm">{leadParty.party}</div>
          <div className="text-xs text-slate-400">{leadPercentage.toFixed(1)}%</div>
        </div>
      </div>
      <div className="text-slate-500 text-xl font-bold">↔</div>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full border-2 border-white/30 flex-shrink-0" style={{ backgroundColor: partnerParty.colour }} />
        <div>
          <div className="font-bold text-white text-sm">{partnerParty.party}</div>
          <div className="text-xs text-slate-400">{partnerPercentage.toFixed(1)}%</div>
        </div>
      </div>
    </div>
  );

  if (currentStep === 'policy' && policyQuestions.length > 0) {
    const cq = policyQuestions[currentQuestionIndex];
    return (
      <div className={mb}><div className={cb}>
        <PartyBar />
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider bg-slate-700 px-2 py-0.5 rounded">Round {round}/3</span>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">Policy Discussion</span>
        </div>
        <h3 className="text-sm font-bold text-yellow-400 mb-1">Question {currentQuestionIndex + 1} of {policyQuestions.length}</h3>
        <h4 className="text-sm font-semibold text-blue-400 mb-2">{cq.topic}</h4>
        <p className="text-slate-300 mb-4 text-sm italic">"{cq.question}"</p>
        <div className="space-y-2">
          {cq.options.map((option: any, idx: number) => (
            <button key={idx} onClick={() => handlePolicyResponse(option.appeal)} className="w-full text-left p-3 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg transition-colors">
              <div className="font-semibold text-white text-sm">{option.text}</div>
            </button>
          ))}
        </div>
        <button onClick={onCancel} className="mt-4 text-xs text-slate-500 hover:text-slate-300">Cancel negotiation</button>
      </div></div>
    );
  }

  if (currentStep === 'policy' && policyQuestions.length === 0) {
    setTimeout(() => setCurrentStep('cabinet'), 0);
    return null;
  }

  if (currentStep === 'cabinet') {
    return (
      <div className={mb}><div className={cb}>
        <PartyBar />
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider bg-slate-700 px-2 py-0.5 rounded">Round {round}/3</span>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">Cabinet Positions</span>
        </div>
        <h3 className="text-sm font-bold text-yellow-400 mb-1">Offer Positions to {partnerParty.party}</h3>
        <p className="text-xs text-slate-400 mb-3"><span className="text-blue-400">Blue</span> = their priority positions.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5">
          {availablePositions.map(position => {
            const isOffered = offeredPositions.includes(position.name);
            const isPriority = priorityPositions.includes(position.name);
            const isTopTier = position.importance >= 28;
            return (
              <div key={position.name} onClick={() => setOfferedPositions(isOffered ? offeredPositions.filter(p => p !== position.name) : [...offeredPositions, position.name])}
                className={`${isTopTier ? 'col-span-2' : 'col-span-1'} p-2.5 sm:p-3 flex flex-col justify-between border rounded-lg cursor-pointer transition-all ${
                  isOffered ? 'border-green-500 bg-green-900/30 ring-1 ring-green-500/50'
                  : isPriority ? 'border-blue-500 bg-blue-900/20'
                  : 'border-slate-600 bg-slate-700 hover:bg-slate-600'}`}>
                <div className={`text-white leading-tight ${isTopTier ? 'text-sm font-bold' : 'text-xs font-semibold'}`}>{position.name}</div>
                {isTopTier && <div className="text-[10px] text-slate-400 mt-0.5">{position.description}</div>}
              </div>
            );
          })}
        </div>
        <div className="flex justify-between gap-3">
          <button onClick={() => { setOfferedPositions([]); makeOffer(); }} className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white text-sm rounded-lg border border-slate-500">Offer nothing</button>
          <button onClick={makeOffer} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg">Make offer ({offeredPositions.length})</button>
        </div>
        <button onClick={onCancel} className="block mx-auto mt-3 text-xs text-slate-500 hover:text-slate-300">Cancel</button>
      </div></div>
    );
  }

  if (currentStep === 'reviewing') {
    return (
      <div className={mb}><div className={cb}>
        <PartyBar />
        <div className="flex flex-col items-center justify-center py-10">
          <div className="w-12 h-12 border-4 border-slate-600 border-t-yellow-400 rounded-full animate-spin mb-4"></div>
          <h3 className="text-xl font-bold text-white mb-2">{round > 1 ? 'Evaluating Counter-Offer...' : 'Reviewing Demands...'}</h3>
          <p className="text-sm text-slate-400 text-center">{partnerParty.party} leadership is considering your {round > 1 ? 'response' : 'offer'}.</p>
        </div>
      </div></div>
    );
  }

  if (currentStep === 'counter' && counterDemands.length > 0) {
    return (
      <div className={mb}><div className={cb}>
        <PartyBar />
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] text-red-400 uppercase tracking-wider bg-red-900/40 px-2 py-0.5 rounded border border-red-500/40">Round {round}/3</span>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">Counter-Offer</span>
        </div>
        <div className="bg-orange-900/20 border border-orange-600/40 rounded-lg p-3 mb-4">
          <p className="text-sm text-orange-200 font-semibold">{partnerParty.party} rejected your offer but is willing to negotiate.</p>
          <p className="text-xs text-orange-400/80 mt-1">They've made the following demands:</p>
        </div>
        <div className="space-y-2 mb-5">
          {counterDemands.map((demand, i) => (
            <div key={i} className={`p-3 border rounded-lg flex items-start gap-3 ${demand.importance === 'must' ? 'border-red-500/60 bg-red-900/20' : 'border-yellow-500/40 bg-yellow-900/10'}`}>
              <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${demand.importance === 'must' ? 'bg-red-400' : 'bg-yellow-400'}`} />
              <div className="flex-1">
                <div className="text-sm font-semibold text-white">{demand.type === 'position_add' ? 'Give us ' + demand.detail : demand.detail}</div>
                <div className="text-[10px] text-slate-400 mt-0.5 uppercase">{demand.importance === 'must' ? 'Non-negotiable' : 'Would help seal the deal'}</div>
              </div>
              <div className={`text-[10px] font-bold px-2 py-0.5 rounded ${demand.importance === 'must' ? 'bg-red-600/40 text-red-200' : 'bg-yellow-600/30 text-yellow-200'}`}>
                {demand.importance === 'must' ? 'MUST' : 'WANT'}
              </div>
            </div>
          ))}
        </div>
        {round >= 3 && (
          <div className="bg-red-900/30 border border-red-600/40 rounded-lg p-3 mb-4 text-center">
            <p className="text-xs text-red-300 font-semibold">This is the final round. If no agreement, {partnerParty.party} will walk away permanently.</p>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={() => handleCounterResponse(false)} className="flex-1 py-2.5 bg-red-600/80 hover:bg-red-700 border border-red-500 text-white font-bold text-sm rounded-lg">Reject Demands</button>
          <button onClick={() => handleCounterResponse(true)} className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-lg">Accept All Demands</button>
        </div>
        <button onClick={onCancel} className="block mx-auto mt-3 text-xs text-slate-500 hover:text-slate-300">Cancel negotiation</button>
      </div></div>
    );
  }

  if (currentStep === 'result' && negotiationResult) {
    return (
      <div className={mb}><div className={cb}>
        <PartyBar />
        <div className={`p-4 rounded-lg border mb-5 ${negotiationResult.success ? 'bg-green-900/30 border-green-600' : 'bg-red-900/30 border-red-600'}`}>
          <p className={`font-bold text-base ${negotiationResult.success ? 'text-green-400' : 'text-red-400'}`}>{negotiationResult.success ? '✓ Coalition agreement reached' : '✗ Negotiations failed'}</p>
          <p className="text-sm text-slate-300 mt-1">{negotiationResult.message}</p>
          <p className="text-xs text-slate-400 mt-1">Appeal: {negotiationResult.finalAppeal?.toFixed(0) ?? '?'}%</p>
        </div>
        {negotiationResult.success && offeredPositions.length > 0 && (
          <div className="mb-5">
            <h4 className="text-xs font-semibold text-blue-400 mb-1.5">Agreed cabinet positions:</h4>
            <div className="flex flex-wrap gap-1.5">{offeredPositions.map(pos => (<span key={pos} className="text-xs px-2 py-1 bg-blue-900/40 border border-blue-700 rounded text-blue-300">{pos}</span>))}</div>
          </div>
        )}
        <button onClick={() => onComplete(negotiationResult.success, offeredPositions)} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg">Continue</button>
      </div></div>
    );
  }

  return null;
}

// ─── PlayerApproachModal (AI approaches the player) ─────────────────────────

function PlayerApproachModal({
  leadParty,
  playerParty,
  leadPercentage,
  playerPercentage,
  offer,
  onComplete,
  onReject,
}: {
  leadParty: Candidate;
  playerParty: Candidate;
  leadPercentage: number;
  playerPercentage: number;
  offer: any;
  onComplete: (success: boolean, positions: string[], responses: number[]) => void;
  onReject: () => void;
}) {
  const [currentStep, setCurrentStep] = useState<'offer' | 'policy' | 'cabinet' | 'reviewing'>('offer');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [policyResponses, setPolicyResponses] = useState<number[]>([]);
  const [acceptedPositions, setAcceptedPositions] = useState<string[]>([]);

  const modalBase = 'fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50';
  const cardBase = 'bg-slate-800 border border-slate-700 rounded-xl p-5 sm:p-7 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl';

  const PartyBar = () => (
    <div className="flex items-center gap-4 mb-5 pb-4 border-b border-slate-700">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full border-2 border-white/30" style={{ backgroundColor: leadParty.colour }} />
        <div>
          <div className="text-xs text-slate-400">Approaching you</div>
          <div className="font-bold text-white text-sm">{leadParty.party}</div>
          <div className="text-xs text-slate-400">{leadPercentage.toFixed(1)}% seats</div>
        </div>
      </div>
      <div className="text-slate-500 text-xl">→</div>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full border-2 border-yellow-400/60" style={{ backgroundColor: playerParty.colour }} />
        <div>
          <div className="text-xs text-yellow-400">You</div>
          <div className="font-bold text-white text-sm">{playerParty.party}</div>
          <div className="text-xs text-slate-400">{playerPercentage.toFixed(1)}% seats</div>
        </div>
      </div>
    </div>
  );

  if (currentStep === 'offer') {
    return (
      <div className={modalBase}>
        <div className={cardBase}>
          <PartyBar />
          <h3 className="campaign-status text-base font-bold text-yellow-400 mb-2">
            Coalition Invitation
          </h3>
          <p className="text-slate-300 text-sm mb-4">{offer.message}</p>
          {offer.offeredPositions.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-blue-400 mb-2">Offered cabinet positions:</h4>
              <div className="flex flex-wrap gap-1.5">
                {offer.offeredPositions.map((pos: string) => (
                  <span key={pos} className="text-xs px-2 py-1 bg-blue-900/40 border border-blue-700 rounded text-blue-300">{pos}</span>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-3 mt-5">
            <button
              onClick={onReject}
              className="flex-1 py-2.5 bg-red-600/80 hover:bg-red-700 border border-red-500 text-white font-bold text-sm rounded-lg"
            >
              Decline
            </button>
            <button
              onClick={() => offer.questions.length > 0 ? setCurrentStep('policy') : setCurrentStep('cabinet')}
              className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-lg"
            >
              Consider offer →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'policy' && offer.questions.length > 0) {
    const currentQuestion = offer.questions[currentQuestionIndex];
    return (
      <div className={modalBase}>
        <div className={cardBase}>
          <PartyBar />
          <h3 className="campaign-status text-base font-bold text-yellow-400 mb-1">
            Policy Discussion — Question {currentQuestionIndex + 1} of {offer.questions.length}
          </h3>
          <h4 className="text-sm font-semibold text-blue-400 mb-2">{currentQuestion.topic}</h4>
          <p className="text-slate-300 mb-4 text-sm italic">"{currentQuestion.question}"</p>
          <div className="space-y-2">
            {currentQuestion.options.map((option: any, index: number) => (
              <button
                key={index}
                onClick={() => {
                  const newResponses = [...policyResponses, option.appeal];
                  setPolicyResponses(newResponses);
                  if (currentQuestionIndex + 1 < offer.questions.length) {
                    setCurrentQuestionIndex(currentQuestionIndex + 1);
                  } else {
                    setCurrentStep('cabinet');
                  }
                }}
                className="w-full text-left p-3 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg"
              >
                <div className="font-semibold text-white text-sm">{option.text}</div>

              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'cabinet') {
    return (
      <div className={modalBase}>
        <div className={cardBase}>
          <PartyBar />
          <h3 className="campaign-status text-base font-bold text-yellow-400 mb-3">
            {leadParty.party} offers these cabinet positions:
          </h3>
          {offer.offeredPositions.length === 0 ? (
            <p className="text-slate-400 text-sm mb-4">No cabinet positions were offered.</p>
          ) : (
            <div className="space-y-2 mb-4">
              {offer.offeredPositions.map((position: string) => (
                <div
                  key={position}
                  onClick={() => {
                    if (acceptedPositions.includes(position)) {
                      setAcceptedPositions(acceptedPositions.filter(p => p !== position));
                    } else {
                      setAcceptedPositions([...acceptedPositions, position]);
                    }
                  }}
                  className={`p-2.5 border rounded-lg cursor-pointer transition-all text-sm ${acceptedPositions.includes(position)
                    ? 'border-green-500 bg-green-900/30 text-green-300'
                    : 'border-slate-600 bg-slate-700 hover:bg-slate-600 text-white'
                    }`}
                >
                  {position} {acceptedPositions.includes(position) ? '✓' : ''}
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={onReject}
              className="flex-1 py-2.5 bg-red-600/80 hover:bg-red-700 border border-red-500 text-white font-bold text-sm rounded-lg"
            >
              Reject offer
            </button>
            <button
              onClick={() => {
                setCurrentStep('reviewing');
                setTimeout(() => {
                  onComplete(true, acceptedPositions, policyResponses);
                }, Math.floor(Math.random() * 1500) + 1500);
              }}
              className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-lg"
            >
              Accept ({acceptedPositions.length} positions)
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'reviewing') {
    return (
      <div className={modalBase}>
        <div className={cardBase}>
          <PartyBar />
          <div className="flex flex-col items-center justify-center py-10">
            <div className="w-12 h-12 border-4 border-slate-600 border-t-yellow-400 rounded-full animate-spin mb-4"></div>
            <h3 className="text-xl font-bold text-white mb-2">Awaiting Response...</h3>
            <p className="text-sm text-slate-400 text-center">
              {leadParty.party} is evaluating your response.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ─── Seat Progress Bar ───────────────────────────────────────────────────────

function SeatTracker({
  coalitionPartners,
  sortedResults,
  currentPct,
}: {
  coalitionPartners: Candidate[];
  sortedResults: { candidate: Candidate; percentage: number }[];
  currentPct: number;
}) {
  const needed = 50;
  const segments = coalitionPartners.map(p => {
    const r = sortedResults.find(r => r.candidate.id === p.id);
    return { party: p, pct: r?.percentage ?? 0 };
  });

  return (
    <div>
      {/* Stacked bar — scaled to 0-60% for visual clarity */}
      <div className="relative h-6 w-full rounded-full overflow-hidden bg-slate-700">
        {segments.map((seg, i) => {
          const left = segments.slice(0, i).reduce((s, x) => s + x.pct, 0);
          return (
            <div
              key={seg.party.id}
              className="absolute h-full transition-all duration-500"
              style={{
                backgroundColor: seg.party.colour,
                left: `${(left / 60) * 100}%`,
                width: `${(seg.pct / 60) * 100}%`,
                opacity: 0.9,
              }}
            />
          );
        })}
        {/* 50% marker */}
        <div className="absolute top-0 bottom-0 w-0.5 bg-white/80 z-10" style={{ left: `${(50 / 60) * 100}%` }} />
      </div>

      {/* Labels */}
      <div className="flex justify-between mt-1 text-xs text-slate-400">
        <span>
          {currentPct.toFixed(1)}%
          <span className={`ml-1 font-bold ${currentPct >= needed ? 'text-green-400' : 'text-slate-500'}`}>
            {currentPct >= needed ? '✓ Majority' : `(${(needed - currentPct).toFixed(1)}% needed)`}
          </span>
        </span>
        <span>50%</span>
      </div>

      {/* Partner chips */}
      <div className="flex flex-wrap gap-1.5 mt-2">
        {segments.map((seg) => (
          <div key={seg.party.id} className="flex items-center gap-1 text-xs bg-slate-700 border border-slate-600 rounded px-2 py-0.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: seg.party.colour }} />
            <span className="text-white">{seg.party.party}</span>
            <span className="text-slate-400">{seg.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Coalition Log ───────────────────────────────────────────────────────────

function CoalitionLog({ entries }: { entries: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [entries.length]);

  if (entries.length === 0) {
    return (
      <div className="text-xs text-slate-500 italic px-1">Negotiations beginning…</div>
    );
  }

  return (
    <div ref={ref} className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
      {entries.map((entry, i) => {
        const isMandate = entry.includes('mandate now passes') || entry.includes('minority government');
        const isSuccess = /accepts|agrees to join|welcomed|enter|agreement reached|joined|agreed|enthusiastically/i.test(entry);
        const isReject = /rejected|declined|declines|better|failed|refuses|disapproves|demands|walks away|refused|sabotage|more|refused|broke down|gives up/i.test(entry);
        return (
          <div
            key={i}
            className={`text-xs px-2.5 py-1.5 rounded border-l-2 ${isMandate
              ? 'border-orange-400 bg-orange-900/20 text-orange-200'
              : isSuccess
                ? 'border-green-500 bg-green-900/20 text-green-200'
                : isReject
                  ? 'border-red-500 bg-red-900/20 text-red-200'
                  : 'border-slate-600 bg-slate-700/30 text-slate-300'
              }`}
          >
            {entry}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function CoalitionFormation() {
  const { state, actions } = useGame();
  const [selectedPartner, setSelectedPartner] = useState<Candidate | null>(null);
  const [showNegotiationDetails, setShowNegotiationDetails] = useState(false);
  const [playerApproachOffer, setPlayerApproachOffer] = useState<any>(null);
  const [showPlayerApproach, setShowPlayerApproach] = useState(false);
  // Track which partner was last processed by AI so we don't re-process
  const lastProcessedPartner = useRef<number | null>(null);
  const activeNegotiationTimeout = useRef<NodeJS.Timeout | null>(null);

  const coalitionState = state.coalitionState;
  const sortedResults = [...state.pollResults].sort((a, b) => b.percentage - a.percentage);

  // The party currently leading coalition formation
  const attemptingParty = coalitionState?.coalitionPartners[0] ?? sortedResults[0]?.candidate;
  const attemptingPercentage = sortedResults.find(r => r.candidate.id === attemptingParty?.id)?.percentage ?? 0;
  const playerResult = sortedResults.find(r => r.candidate.is_player);

  // Auto-start coalition formation when component mounts
  useEffect(() => {
    if (!coalitionState && sortedResults[0]?.percentage <= 50) {
      actions.startCoalitionFormation();
    }
  }, [coalitionState, sortedResults, actions]);

  // Clear any pending timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (activeNegotiationTimeout.current) {
        clearTimeout(activeNegotiationTimeout.current);
      }
    };
  }, []);

  // ── AI coalition logic — fires synchronously, no setTimeout ──
  useEffect(() => {
    if (
      !coalitionState ||
      coalitionState.negotiationPhase !== 'partner-selection' ||
      coalitionState.isPlayerLead ||
      coalitionState.currentCoalitionPercentage >= 50 ||
      showPlayerApproach
    ) return;

    if (coalitionState.availablePartners.length === 0) {
      // No partners left — if first to third party, pass mandate; if failed, minority gov
      if ((coalitionState.attemptingPartyIndex ?? 0) < 3) {
        actions.nextCoalitionAttempt();
      } else {
        actions.completeCoalitionFormation();
      }
      return;
    }

    const bestPartners = findBestCoalitionPartners(
      attemptingParty,
      coalitionState.availablePartners,
      sortedResults
    );

    if (bestPartners.length === 0) {
      if ((coalitionState.attemptingPartyIndex ?? 0) < 3) {
        actions.nextCoalitionAttempt();
      } else {
        actions.completeCoalitionFormation();
      }
      return;
    }

    const nextPartner = bestPartners[0];

    // Avoid re-processing same partner in this render cycle
    if (lastProcessedPartner.current === nextPartner.candidate.id) return;

    if (nextPartner.candidate.is_player) {
      lastProcessedPartner.current = nextPartner.candidate.id;

      // Gate check: would the AI actually want to join a coalition with the player,
      // even if the player offered them every available cabinet position?
      // (Uses a desperation boost so the AI is slightly more willing than a cold calc.)
      const wouldApproach = shouldAIApproachPlayer(
        attemptingParty,
        nextPartner.candidate,
        attemptingPercentage,
        nextPartner.percentage,
        coalitionState.cabinetAllocations
      );

      if (!wouldApproach) {
        // AI ideologically unwilling — skip the player silently
        const skipMsg = `${attemptingParty.party} has decided not to approach ${nextPartner.candidate.party} due to fundamental differences.`;
        actions.logCoalitionEvent(skipMsg);
        actions.removePotentialPartner(nextPartner.candidate);
        lastProcessedPartner.current = null;
        return;
      }

      const offer = generatePlayerApproachOffer(
        attemptingParty,
        nextPartner.candidate,
        attemptingPercentage,
        nextPartner.percentage,
        coalitionState.cabinetAllocations
      );
      setPlayerApproachOffer(offer);
      setShowPlayerApproach(true);
    } else {
      // It's AI. We manage the timeout inside this specific effect execution.
      lastProcessedPartner.current = nextPartner.candidate.id;

      // Calculate the result first so we know how long it takes and what the vibe is
      const result = simulateAICoalitionNegotiation(
        attemptingParty,
        nextPartner.candidate,
        attemptingPercentage,
        nextPartner.percentage,
        coalitionState.cabinetAllocations
      );

      let delayTime = 0;
      let intermediateLog = '';

      const isHighlyIncompatible = result.compatibility < 35 || result.baseWillingness < 30;
      const isBorderline = !result.success && result.baseWillingness >= 40 && result.baseWillingness <= 60;
      const isEasy = result.success && result.compatibility > 70;

      if (isHighlyIncompatible) {
        delayTime = Math.floor(Math.random() * 1000) + 500; // 0.5s - 1.5s
      } else if (isBorderline) {
        delayTime = Math.floor(Math.random() * 2000) + 4000; // 4s - 6s
        const options = [
          `Sources report heated internal debates within ${nextPartner.candidate.party}...`,
          `${nextPartner.candidate.party} is weighing the political cost of this alliance...`,
          `Backbenchers in ${nextPartner.candidate.party} are expressing concerns...`,
          `Negotiations with ${nextPartner.candidate.party} have hit a temporary stalemate...`,
          `${nextPartner.candidate.party} leadership is split on the proposed terms...`
        ];
        intermediateLog = options[Math.floor(Math.random() * options.length)];
      } else if (isEasy) {
        delayTime = Math.floor(Math.random() * 1000) + 1500; // 1.5s - 2.5s
      } else {
        delayTime = Math.floor(Math.random() * 2000) + 2000; // 2s - 4s
        intermediateLog = `${nextPartner.candidate.party} leadership is holding an emergency meeting...`;
      }

      const logStartMsg = `${attemptingParty.party} is negotiating with ${nextPartner.candidate.party}...`;
      actions.logCoalitionEvent(logStartMsg);

      let intermediateTimeoutId: NodeJS.Timeout | null = null;
      if (intermediateLog) {
        intermediateTimeoutId = setTimeout(() => {
          actions.logCoalitionEvent(intermediateLog);
        }, delayTime / 2);
      }

      const timeoutId = setTimeout(() => {
        const logResultMsg = `${attemptingParty.party} → ${nextPartner.candidate.party}: ${result.message}`;
        actions.logCoalitionEvent(logResultMsg);

        if (result.success) {
          actions.addCoalitionPartner(nextPartner.candidate, result.cabinetPositions);
        } else {
          actions.removePotentialPartner(nextPartner.candidate);
        }

        // Clear processed partner lock so the next negotiation can begin on subsequent render
        lastProcessedPartner.current = null;
      }, delayTime);

      // Return a cleanup function for THIS specific negotiation
      // If the component unmounts (e.g. Strict Mode), clear the lock and timeout
      return () => {
        clearTimeout(timeoutId);
        if (intermediateTimeoutId) clearTimeout(intermediateTimeoutId);
        lastProcessedPartner.current = null;
      };
    }
  }, [
    coalitionState?.availablePartners.length,
    coalitionState?.coalitionPartners.length,
    coalitionState?.currentCoalitionPercentage,
    coalitionState?.negotiationPhase,
    showPlayerApproach,
    coalitionState?.attemptingPartyIndex,
  ]);

  // Reset lastProcessedPartner when the leading party changes
  useEffect(() => {
    lastProcessedPartner.current = null;
    if (activeNegotiationTimeout.current) {
      clearTimeout(activeNegotiationTimeout.current);
      activeNegotiationTimeout.current = null;
    }
  }, [coalitionState?.attemptingPartyIndex]);

  const handlePlayerApproachResponse = (success: boolean, positions: string[], responses: number[]) => {
    if (success && playerResult && coalitionState) {
      const evaluation = evaluatePlayerResponse(
        attemptingParty,
        playerResult.candidate,
        attemptingPercentage,
        playerResult.percentage,
        responses,
        positions,
        coalitionState.cabinetAllocations,
        playerApproachOffer?.totalImportance
      );
      const logMsg = evaluation.message;
      actions.logCoalitionEvent(logMsg);
      if (evaluation.success) {
        actions.addCoalitionPartner(playerResult.candidate, positions);
      } else {
        actions.removePotentialPartner(playerResult.candidate);
      }
    } else {
      const logMsg = `${attemptingParty.party} → ${playerResult?.candidate.party}: Offer declined.`;
      actions.logCoalitionEvent(logMsg);
      if (playerResult) actions.removePotentialPartner(playerResult.candidate);
    }
    setShowPlayerApproach(false);
    setPlayerApproachOffer(null);
    lastProcessedPartner.current = null;
  };

  // ── Loading state ──
  if (!coalitionState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-2xl font-bold mb-2">Initiating coalition talks…</div>
          <div className="text-slate-400 text-sm">Calculating party compatibilities</div>
        </div>
      </div>
    );
  }

  // ── Complete state ──
  if (coalitionState.negotiationPhase === 'complete') {
    const totalPct = coalitionState.currentCoalitionPercentage;
    const isMajority = totalPct >= 50;
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-4 sm:p-6">
        <div className="max-w-5xl mx-auto space-y-5">

          <div className="text-center">
            <h1 className="campaign-status text-2xl sm:text-4xl font-black text-white mb-1">
              {isMajority ? 'COALITION GOVERNMENT FORMED' : 'MINORITY GOVERNMENT'}
            </h1>
            <div className={`border-t-2 border-b-2 py-3 mt-3 ${isMajority ? 'border-green-500' : 'border-orange-500'}`}>
              <p className={`text-base font-bold ${isMajority ? 'text-green-400' : 'text-orange-400'}`}>
                {coalitionState.coalitionPartners[0]?.party} leads •{' '}
                {totalPct.toFixed(1)}% combined support
                {!isMajority && ' (minority)'}
              </p>
            </div>
          </div>

          {/* Seat tracker */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <h2 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wide">Final Seat Share</h2>
            <SeatTracker
              coalitionPartners={coalitionState.coalitionPartners}
              sortedResults={sortedResults}
              currentPct={totalPct}
            />
          </div>

          {/* Coalition partners */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <h2 className="text-base font-bold text-yellow-400 mb-3">Coalition Partners</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {coalitionState.coalitionPartners.map((partner, i) => {
                const result = sortedResults.find(r => r.candidate.id === partner.id);
                return (
                  <div key={partner.id} className="flex items-center gap-3 p-3 bg-slate-700/50 border border-slate-600 rounded-lg">
                    <div className="w-8 h-8 rounded-full border-2 border-white/20 flex-shrink-0" style={{ backgroundColor: partner.colour }} />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-white text-sm truncate">{partner.party}</div>
                      <div className="text-xs text-slate-400">{partner.name}</div>
                      <div className="text-xs text-slate-400">
                        {result?.percentage.toFixed(1)}% seats
                        {i === 0 && ' · Lead party'}
                        {partner.is_player && ' · You'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Negotiation log */}
          {coalitionState.coalitionLog.length > 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <h2 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wide">Negotiation Summary</h2>
              <CoalitionLog entries={coalitionState.coalitionLog} />
            </div>
          )}

          {/* Cabinet */}
          <CabinetView
            cabinetAllocations={coalitionState.cabinetAllocations}
            winningParty={coalitionState.coalitionPartners[0]}
            candidates={state.candidates}
          />

          <div className="text-center pt-2">
            {state.currentPoll < state.totalPolls ? (
              <button
                onClick={() => actions.resumeCampaign()}
                className="px-10 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 border border-blue-500 text-white font-bold rounded-xl transition-all hover:scale-105"
              >
                Return to Campaign
              </button>
            ) : (
              <button
                onClick={() => actions.setGamePhase('results')}
                className="px-10 py-3 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 border border-green-500 text-white font-bold rounded-xl transition-all hover:scale-105"
              >
                View Final Results
              </button>
            )}
            <p className="text-slate-500 text-xs mt-3">
              Created by{' '}
              <a href="https://indigo.spot" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">
                Indigo Nolan
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Active partner-selection phase ──

  if (coalitionState.negotiationPhase === 'partner-selection') {
    const isPlayerLead = coalitionState.isPlayerLead;
    const attemptIndex = coalitionState.attemptingPartyIndex ?? 0;
    const isSecondAttempt = attemptIndex === 1;
    const isThirdAttempt = attemptIndex === 2;
    const isFourthAttempt = attemptIndex === 3;
    const currentPct = coalitionState.currentCoalitionPercentage;
    const hasMajority = currentPct >= 50;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-4 sm:p-6">
        <div className="max-w-6xl mx-auto space-y-4">

          {/* Header */}
          <div className="text-center">
            <h1 className="campaign-status text-2xl sm:text-3xl font-black text-white">COALITION FORMATION</h1>
            <p className="text-slate-400 text-sm mt-1">
              {isPlayerLead ? 'You are leading negotiations' : `${attemptingParty?.party} is leading negotiations`}
            </p>
          </div>

          {/* Mandate banner */}
          {(isSecondAttempt || isThirdAttempt || isFourthAttempt) && (
            <div className={`border rounded-xl p-3 text-center ${isFourthAttempt ? 'bg-red-900/40 border-red-500' : 'bg-orange-900/40 border-orange-500'}`}>
              <p className={`text-sm font-semibold ${isFourthAttempt ? 'text-red-200' : 'text-orange-200'}`}>
                {isFourthAttempt ? (
                  <>All other parties failed to form a coalition. The mandate returns to <strong>{attemptingParty?.party}</strong> for a final attempt.</>
                ) : isThirdAttempt ? (
                  <>{sortedResults[0]?.candidate.party} and {sortedResults[1]?.candidate.party} failed to form a coalition — mandate passed to <strong>{attemptingParty?.party}</strong></>
                ) : (
                  <>{sortedResults[0]?.candidate.party} failed to form a coalition — mandate passed to <strong>{attemptingParty?.party}</strong></>
                )}
              </p>
            </div>
          )}

          {/* Seat tracker */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <h2 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wide">
              Current Coalition Strength
            </h2>
            <SeatTracker
              coalitionPartners={coalitionState.coalitionPartners}
              sortedResults={sortedResults}
              currentPct={currentPct}
            />
            {hasMajority && (
              <div className="mt-3 p-2 bg-green-900/30 border border-green-600 rounded-lg text-center">
                <p className="text-green-400 font-bold text-sm">Majority achieved! Finalising coalition…</p>
              </div>
            )}
          </div>

          {/* Two-column: log + partners */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Negotiation log */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <h2 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wide">Negotiation Log</h2>
              <CoalitionLog entries={coalitionState.coalitionLog} />
              {!isPlayerLead && coalitionState.availablePartners.length > 0 && !hasMajority && (
                <div className="mt-3 text-xs text-slate-500 italic">
                  {attemptingParty?.party} is approaching {coalitionState.availablePartners[0]?.party}…
                </div>
              )}
            </div>

            {/* Available partners */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <h2 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wide">
                {isPlayerLead ? 'Choose Coalition Partners' : 'Remaining Parties'}
              </h2>

              {isPlayerLead && coalitionState.availablePartners.length >= 1 && (() => {
                const optimals = findOptimalCoalitions(attemptingParty, coalitionState.availablePartners, sortedResults, 3);
                if (optimals.length === 0) return null;
                return (
                  <div className="mb-4 bg-slate-900/60 border border-slate-600 rounded-lg p-3">
                    <div className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider mb-2">
                      Recommended Coalitions
                    </div>
                    <div className="space-y-1.5">
                      {optimals.slice(0, 3).map((coal, ci) => (
                        <div key={ci} className="flex items-center gap-2 text-xs">
                          <span className="text-[10px] font-mono text-slate-500 w-4">{ci + 1}</span>
                          <div className="flex flex-wrap gap-1 flex-1">
                            <span className="text-yellow-300 font-semibold">{attemptingParty.party}</span>
                            {coal.partners.map(p => (
                              <span key={p.id} className="text-slate-300">+ {p.party}</span>
                            ))}
                          </div>
                          <span className="text-[10px] font-mono text-green-400">{coal.totalPercentage.toFixed(1)}%</span>
                          <span className="text-[10px] font-mono text-slate-500">{coal.avgWillingness.toFixed(0)} will</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {coalitionState.availablePartners.length === 0 ? (
                <p className="text-slate-500 text-sm italic">No more available partners.</p>
              ) : (
                <div className="space-y-2">
                  {coalitionState.availablePartners.map((partner) => {
                    const result = sortedResults.find(r => r.candidate.id === partner.id);
                    const compatibility = calculatePartyCompatibility(attemptingParty, partner);
                    const willingness = calculateCoalitionWillingness(
                      attemptingParty, partner, attemptingPercentage, result?.percentage || 0
                    );
                    const compatColor =
                      compatibility > 65 ? 'text-green-400' :
                        compatibility > 35 ? 'text-yellow-400' : 'text-red-400';

                    return (
                      <div
                        key={partner.id}
                        onClick={() => {
                          if (isPlayerLead) {
                            setSelectedPartner(partner);
                            setShowNegotiationDetails(true);
                          }
                        }}
                        className={`flex items-center gap-3 p-3 border rounded-lg transition-all ${isPlayerLead
                          ? 'border-slate-600 bg-slate-700 hover:border-blue-500 hover:bg-slate-600 cursor-pointer'
                          : 'border-slate-700 bg-slate-700/40'
                          }`}
                      >
                        <div
                          className="w-8 h-8 rounded-full border border-white/20 flex-shrink-0"
                          style={{ backgroundColor: partner.colour }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-4 mb-0.5">
                            <span className={`text-[10px] font-mono font-bold ${compatColor}`}>
                              {compatibility.toFixed(0)}% <span className="text-slate-500 font-sans uppercase text-[9px] ml-0.5">Compatability</span>
                            </span>
                            <span className="text-[10px] font-mono font-bold text-slate-400">
                              {willingness.toFixed(0)}% <span className="text-slate-500 font-sans uppercase text-[9px] ml-0.5">Willingness</span>
                            </span>
                          </div>
                          <div className="font-bold text-white text-md truncate">
                            {partner.party}
                            {partner.is_player && <span className="ml-1 text-yellow-400 text-xs">◄ You</span>}
                          </div>
                          <div className="text-xs text-slate-400">{result?.percentage.toFixed(1)}% seats</div>
                          <div className="text-[9px] text-slate-500 mt-0.5 truncate">
                            Wants: {getPartyPriorityPositions(partner).slice(0, 3).join(', ') || 'Junior Ministries'}
                          </div>
                          {getIdeologyProfile(partner.vals)}

                        </div>

                      </div>
                    );
                  })}
                </div>
              )}

              {/* Player-lead controls */}
              {isPlayerLead && (
                <div className="mt-4 pt-3 border-t border-slate-700">
                  <button
                    onClick={() => {
                      if (attemptIndex < 3) {
                        actions.logCoalitionEvent(`${attemptingParty?.party} gives up on forming a coalition.`);
                        actions.nextCoalitionAttempt();
                      } else {
                        actions.completeCoalitionFormation();
                      }
                    }}
                    className="w-full py-2 bg-red-600/70 hover:bg-red-700 border border-red-500/70 text-white text-sm font-bold rounded-lg transition-colors"
                  >
                    {attemptIndex < 3 ? 'Give Up & Pass Mandate' : 'Form Minority Government'}
                  </button>
                  <p className="text-xs text-slate-500 mt-1 text-center">
                    {attemptIndex < 3
                      ? 'Admit defeat and pass the mandate to the next largest party'
                      : `Give up on coalition and govern alone (${currentPct.toFixed(1)}% seats)`}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modals */}
        {showNegotiationDetails && selectedPartner && (
          <NegotiationModal
            cabinetAllocations={coalitionState.cabinetAllocations}
            leadParty={attemptingParty}
            partnerParty={selectedPartner}
            leadPercentage={attemptingPercentage}
            partnerPercentage={sortedResults.find(r => r.candidate.id === selectedPartner.id)?.percentage || 0}
            onComplete={(success, positions) => {
              const logMsg = success
                ? `${attemptingParty.party} → ${selectedPartner.party}: Coalition agreement reached.`
                : `${attemptingParty.party} → ${selectedPartner.party}: Negotiations failed.`;
              actions.logCoalitionEvent(logMsg);
              if (success) {
                actions.addCoalitionPartner(selectedPartner, positions);
              } else {
                actions.removePotentialPartner(selectedPartner);
              }
              setShowNegotiationDetails(false);
              setSelectedPartner(null);
            }}
            onCancel={() => {
              setShowNegotiationDetails(false);
              setSelectedPartner(null);
            }}
          />
        )}

        {showPlayerApproach && playerApproachOffer && playerResult && (
          <PlayerApproachModal
            leadParty={attemptingParty}
            playerParty={playerResult.candidate}
            leadPercentage={attemptingPercentage}
            playerPercentage={playerResult.percentage}
            offer={playerApproachOffer}
            onComplete={handlePlayerApproachResponse}
            onReject={() => handlePlayerApproachResponse(false, [], [])}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 flex items-center justify-center">
      <div className="text-white text-center">
        <h1 className="text-2xl font-bold mb-2">Coalition Formation</h1>
        <p className="text-slate-400 text-sm">Phase: {coalitionState.negotiationPhase}</p>
      </div>
    </div>
  );
}
