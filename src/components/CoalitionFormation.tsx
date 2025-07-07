'use client';

import { useState, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import { 
  calculatePartyCompatibility, 
  calculateCoalitionWillingness,
  getAvailableCabinetPositions,
  getPartyPriorityPositions,
  generateCoalitionPolicyQuestion,
  simulateCoalitionNegotiation
} from '@/lib/coalitionEngine';
import { Candidate } from '@/types/game';

interface NegotiationModalProps {
  leadParty: Candidate;
  partnerParty: Candidate;
  leadPercentage: number;
  partnerPercentage: number;
  onComplete: (success: boolean, positions: string[]) => void;
  onCancel: () => void;
}

function NegotiationModal({ leadParty, partnerParty, leadPercentage, partnerPercentage, onComplete, onCancel }: NegotiationModalProps) {
  const [currentStep, setCurrentStep] = useState<'policy' | 'cabinet' | 'result'>('policy');
  const [policyResponses, setPolicyResponses] = useState<number[]>([]);
  const [offeredPositions, setOfferedPositions] = useState<string[]>([]);
  const [negotiationResult, setNegotiationResult] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Generate policy questions
  const policyQuestions = [];
  const question1 = generateCoalitionPolicyQuestion(leadParty, partnerParty);
  if (question1) policyQuestions.push(question1);
  
  // Generate second question with different focus
  const question2 = generateCoalitionPolicyQuestion(partnerParty, leadParty);
  if (question2 && question2.topic !== question1?.topic) policyQuestions.push(question2);

  const availablePositions = getAvailableCabinetPositions({});
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

  const handleCabinetOffer = () => {
    const totalImportance = offeredPositions.reduce((sum, pos) => {
      const position = availablePositions.find(p => p.name === pos);
      return sum + (position?.importance || 0);
    }, 0);

    const result = simulateCoalitionNegotiation(
      leadParty,
      partnerParty,
      leadPercentage,
      partnerPercentage,
      totalImportance,
      policyResponses
    );

    setNegotiationResult(result);
    setCurrentStep('result');
  };

  if (currentStep === 'policy' && policyQuestions.length > 0) {
    const currentQuestion = policyQuestions[currentQuestionIndex];
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <h3 className="text-2xl font-bold text-slate-900 mb-4">
            Policy Discussion with {partnerParty.party}
          </h3>
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-slate-800 mb-2">{currentQuestion.topic}</h4>
            <p className="text-slate-700 mb-4">"{currentQuestion.question}"</p>
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handlePolicyResponse(option.appeal)}
                  className="w-full p-4 text-left border-2 border-slate-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
                >
                  <div className="font-medium text-slate-900">{option.text}</div>
                  <div className="text-sm text-slate-600 mt-1">
                    Appeal: {option.appeal > 0 ? '+' : ''}{option.appeal}
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="text-sm text-slate-600">
            Question {currentQuestionIndex + 1} of {policyQuestions.length}
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'cabinet') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <h3 className="text-2xl font-bold text-slate-900 mb-4">
            Cabinet Position Offers for {partnerParty.party}
          </h3>
          
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-slate-800 mb-3">
              {partnerParty.party} Priority Positions:
            </h4>
            <div className="flex flex-wrap gap-2 mb-4">
              {priorityPositions.map(pos => (
                <span key={pos} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {pos}
                </span>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h4 className="text-lg font-semibold text-slate-800 mb-3">Available Positions:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availablePositions.slice(0, 8).map(position => (
                <div
                  key={position.name}
                  onClick={() => {
                    if (offeredPositions.includes(position.name)) {
                      setOfferedPositions(offeredPositions.filter(p => p !== position.name));
                    } else {
                      setOfferedPositions([...offeredPositions, position.name]);
                    }
                  }}
                  className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    offeredPositions.includes(position.name)
                      ? 'border-green-500 bg-green-50'
                      : 'border-slate-300 hover:border-slate-400'
                  }`}
                >
                  <div className="font-medium text-slate-900">{position.name}</div>
                  <div className="text-sm text-slate-600">Importance: {position.importance}</div>
                  <div className="text-xs text-slate-500">{position.description}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => {
                setOfferedPositions([]);
                handleCabinetOffer();
              }}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg"
            >
              Offer No Positions
            </button>
            <button
              onClick={handleCabinetOffer}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg"
            >
              Make Offer ({offeredPositions.length} positions)
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'result' && negotiationResult) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-lg w-full">
          <h3 className="text-2xl font-bold text-slate-900 mb-4">Negotiation Result</h3>
          <div className={`p-4 rounded-lg mb-6 ${
            negotiationResult.success ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'
          }`}>
            <p className={`font-semibold ${
              negotiationResult.success ? 'text-green-800' : 'text-red-800'
            }`}>
              {negotiationResult.message}
            </p>
            <p className="text-sm text-slate-600 mt-2">
              Final Appeal: {negotiationResult.finalAppeal.toFixed(0)}%
            </p>
          </div>
          
          {negotiationResult.success && offeredPositions.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-slate-800 mb-2">Positions Agreed:</h4>
              <ul className="list-disc list-inside text-slate-700">
                {offeredPositions.map(pos => (
                  <li key={pos}>{pos}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-center">
            <button
              onClick={() => onComplete(negotiationResult.success, offeredPositions)}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Skip policy questions if none available
  if (policyQuestions.length === 0 && currentStep === 'policy') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-lg w-full">
          <h3 className="text-2xl font-bold text-slate-900 mb-4">
            Direct Negotiation with {partnerParty.party}
          </h3>
          <p className="text-slate-700 mb-6">
            Your parties have similar enough policies. Moving directly to cabinet negotiations.
          </p>
          <button
            onClick={() => setCurrentStep('cabinet')}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg"
          >
            Discuss Cabinet Positions
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default function CoalitionFormation() {
  const { state, actions } = useGame();
  const [selectedPartner, setSelectedPartner] = useState<Candidate | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [policyResponses, setPolicyResponses] = useState<number[]>([]);
  const [offeredPositions, setOfferedPositions] = useState<string[]>([]);
  const [negotiationResult, setNegotiationResult] = useState<any>(null);
  const [showNegotiationDetails, setShowNegotiationDetails] = useState(false);

  const coalitionState = state.coalitionState;
  const sortedResults = [...state.pollResults].sort((a, b) => b.percentage - a.percentage);
  const winningParty = sortedResults[0].candidate;
  const winningPercentage = sortedResults[0].percentage;

  useEffect(() => {
    if (!coalitionState && winningPercentage <= 50) {
      actions.startCoalitionFormation();
    }
  }, [coalitionState, winningPercentage, actions]);

  // Auto-complete coalition when majority is reached
  useEffect(() => {
    if (coalitionState && 
        coalitionState.negotiationPhase === 'partner-selection' && 
        coalitionState.currentCoalitionPercentage >= 50) {
      // Small delay to show the updated percentage before completing
      const timer = setTimeout(() => {
        actions.completeCoalitionFormation();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [coalitionState, actions]);

  if (!coalitionState) {
    return (
      <div className="min-h-screen p-6" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)' }}>
        <div className="max-w-4xl mx-auto text-center text-white">
          <h1 className="text-4xl font-bold mb-4">Loading Coalition Formation...</h1>
        </div>
      </div>
    );
  }

  if (coalitionState.negotiationPhase === 'complete') {
    return (
      <div className="min-h-screen p-6" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="newspaper-header text-4xl font-black text-white mb-4">
              COALITION GOVERNMENT FORMED
            </h1>
            <div className="border-t-2 border-b-2 border-green-500 py-3 my-4">
              <p className="campaign-status text-lg text-green-200">
                STABLE MAJORITY ACHIEVED • {coalitionState.currentCoalitionPercentage.toFixed(1)}% SUPPORT
              </p>
            </div>
          </div>

          {/* Coalition Partners */}
          <div className="vintage-border p-6 mb-8" style={{ background: 'var(--newspaper-bg)' }}>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Coalition Partners</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {coalitionState.coalitionPartners.map((partner, index) => {
                const result = sortedResults.find(r => r.candidate.id === partner.id);
                return (
                  <div key={partner.id} className="flex items-center space-x-3 p-3 bg-slate-100 border border-slate-300 rounded-lg">
                    <div 
                      className="w-8 h-8 rounded-full border-2 border-slate-600"
                      style={{ backgroundColor: partner.colour }}
                    ></div>
                    <div className="flex-1">
                      <div className="font-bold text-slate-900">{partner.party}</div>
                      <div className="text-sm text-slate-700">{partner.name}</div>
                      <div className="text-xs text-slate-600">
                        {result?.percentage.toFixed(1)}% of vote
                        {index === 0 && ' (Lead Party)'}
                        {partner.is_player && ' (You)'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cabinet Allocation */}
          {Object.keys(coalitionState.cabinetAllocations).length > 0 && (
            <div className="vintage-border p-6 mb-8" style={{ background: 'var(--newspaper-bg)' }}>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Cabinet Positions</h2>
              <div className="space-y-2">
                <div className="p-3 bg-green-100 border border-green-300 rounded-lg">
                  <span className="font-bold">Prime Minister:</span> {winningParty.name} ({winningParty.party})
                </div>
                {Object.entries(coalitionState.cabinetAllocations).map(([position, parties]) => (
                  <div key={position} className="p-3 bg-slate-100 border border-slate-300 rounded-lg">
                    <span className="font-bold">{position}:</span> {parties.join(', ')}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-center">
            <button
              onClick={() => actions.setGamePhase('results')}
              className="px-12 py-4 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-bold rounded-lg transition-all duration-200 transform hover:scale-105"
            >
              🏛️ VIEW FINAL RESULTS
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (coalitionState.negotiationPhase === 'partner-selection') {
    return (
      <div className="min-h-screen p-6" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="newspaper-header text-4xl font-black text-white mb-4">
              COALITION FORMATION
            </h1>
            <div className="border-t-2 border-b-2 border-yellow-500 py-3 my-4">
              <p className="campaign-status text-lg text-yellow-200">
                {coalitionState.isPlayerLead ? 'BUILD YOUR COALITION' : 'WATCHING COALITION TALKS'} • 
                CURRENT SUPPORT: {coalitionState.currentCoalitionPercentage.toFixed(1)}% • 
                NEED: {coalitionState.currentCoalitionPercentage >= 50 ? 'MAJORITY ACHIEVED!' : `${(50 - coalitionState.currentCoalitionPercentage).toFixed(1)}% MORE`}
              </p>
            </div>
          </div>

          {/* Current Coalition */}
          <div className="vintage-border p-6 mb-8" style={{ background: 'var(--newspaper-bg)' }}>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              Current Coalition
              {coalitionState.currentCoalitionPercentage >= 50 && (
                <span className="ml-3 px-3 py-1 bg-green-500 text-white text-sm rounded-full">
                  MAJORITY ACHIEVED!
                </span>
              )}
            </h2>
            <div className="space-y-3">
              {coalitionState.coalitionPartners.map((partner, index) => {
                const result = sortedResults.find(r => r.candidate.id === partner.id);
                return (
                  <div key={partner.id} className="flex items-center space-x-3 p-3 bg-slate-100 border border-slate-300 rounded-lg">
                    <div 
                      className="w-6 h-6 rounded-full border-2 border-slate-600"
                      style={{ backgroundColor: partner.colour }}
                    ></div>
                    <div className="flex-1">
                      <div className="font-bold text-slate-900">{partner.party}</div>
                      <div className="text-sm text-slate-700">{partner.name}</div>
                      <div className="text-xs text-slate-600">
                        {result?.percentage.toFixed(1)}% of vote
                        {index === 0 && ' (Lead Party)'}
                        {partner.is_player && ' (You)'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {coalitionState.currentCoalitionPercentage >= 50 && (
              <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded-lg">
                <p className="text-green-800 font-semibold">
                  🎉 Coalition has achieved a stable majority! Finalizing government formation...
                </p>
              </div>
            )}
          </div>

          {/* Available Partners */}
          <div className="vintage-border p-6 mb-8" style={{ background: 'var(--newspaper-bg)' }}>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              {coalitionState.isPlayerLead ? 'Choose Coalition Partners' : 'Potential Partners'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {coalitionState.availablePartners.slice(0, 6).map((partner) => {
                const result = sortedResults.find(r => r.candidate.id === partner.id);
                const compatibility = calculatePartyCompatibility(winningParty, partner);
                const willingness = calculateCoalitionWillingness(winningParty, partner, winningPercentage, result?.percentage || 0);
                
                return (
                  <div
                    key={partner.id}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      coalitionState.isPlayerLead 
                        ? 'hover:border-blue-500 hover:bg-blue-50' 
                        : 'border-slate-300'
                    }`}
                    onClick={() => coalitionState.isPlayerLead && setSelectedPartner(partner)}
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <div 
                        className="w-8 h-8 rounded-full border-2 border-slate-600"
                        style={{ backgroundColor: partner.colour }}
                      ></div>
                      <div className="flex-1">
                        <div className="font-bold text-slate-900">{partner.party}</div>
                        <div className="text-sm text-slate-700">{partner.name}</div>
                        <div className="text-xs text-slate-600">
                          {result?.percentage.toFixed(1)}% of vote
                          {partner.is_player && ' (You)'}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm space-y-1">
                      <div>Compatibility: <span className={compatibility > 60 ? 'text-green-600' : compatibility > 40 ? 'text-yellow-600' : 'text-red-600'}>{compatibility.toFixed(0)}%</span></div>
                      <div>Willingness: <span className={willingness > 60 ? 'text-green-600' : willingness > 40 ? 'text-yellow-600' : 'text-red-600'}>{willingness.toFixed(0)}%</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Partner Selection */}
          {coalitionState.isPlayerLead && selectedPartner && !showNegotiationDetails && (
            <div className="vintage-border p-6 mb-8" style={{ background: 'var(--newspaper-bg)' }}>
              <h3 className="text-xl font-bold text-slate-900 mb-4">
                Negotiate with {selectedPartner.party}
              </h3>
              <div className="flex justify-between">
                <button
                  onClick={() => setShowNegotiationDetails(true)}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg"
                >
                  Start Negotiations
                </button>
                <button
                  onClick={() => setSelectedPartner(null)}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Detailed Negotiations */}
          {showNegotiationDetails && selectedPartner && (
            <NegotiationModal
              leadParty={winningParty}
              partnerParty={selectedPartner}
              leadPercentage={winningPercentage}
              partnerPercentage={sortedResults.find(r => r.candidate.id === selectedPartner.id)?.percentage || 0}
              onComplete={(success, positions) => {
                if (success) {
                  actions.addCoalitionPartner(selectedPartner);
                  positions.forEach(position => {
                    actions.allocateCabinetPosition(position, selectedPartner.party);
                  });
                }
                setShowNegotiationDetails(false);
                setSelectedPartner(null);
                setOfferedPositions([]);
                setPolicyResponses([]);
              }}
              onCancel={() => {
                setShowNegotiationDetails(false);
                setSelectedPartner(null);
              }}
            />
          )}

          {/* Skip Coalition for Player */}
          {coalitionState.isPlayerLead && (
            <div className="text-center">
              <button
                onClick={() => actions.completeCoalitionFormation()}
                className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg"
              >
                Form Minority Government
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)' }}>
      <div className="max-w-4xl mx-auto text-center text-white">
        <h1 className="text-4xl font-bold mb-4">Coalition Formation Phase</h1>
        <p>Phase: {coalitionState.negotiationPhase}</p>
      </div>
    </div>
  );
}
