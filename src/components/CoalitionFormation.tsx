'use client';

import { useState, useEffect } from 'react';
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
  autoAllocateUnfilledCabinetPositions
} from '@/lib/coalitionEngine';
import { Candidate } from '@/types/game';
import CabinetView from './CabinetView';
import { getIdeologyProfile } from '@/lib/ideologyProfiler';

interface NegotiationModalProps {
  leadParty: Candidate;
  partnerParty: Candidate;
  leadPercentage: number;
  partnerPercentage: number;
  onComplete: (success: boolean, positions: string[]) => void;
  onCancel: () => void;
  cabinetAllocations: Record<string, string[]>;
}

function NegotiationModal({ leadParty, partnerParty, leadPercentage, partnerPercentage, onComplete, onCancel , cabinetAllocations}: NegotiationModalProps) {
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
            <h4 className="text-base font-normal text-slate-800 mb-3">
              {partnerParty.party}: {Math.round(partnerPercentage*100)/100}%
            </h4>
          </div>

          <div className="mb-6">
            <h4 className="text-lg font-semibold text-slate-800 mb-3">Available Positions with Priorities Highlighted:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availablePositions.map(position => (
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
                      : priorityPositions.includes(position.name) ? 
                      'border-blue-500 bg-blue-50'
                      : 'border-slate-300 hover:border-slate-400'
                  }
                  `}
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

function PlayerApproachModal({ 
  leadParty, 
  playerParty, 
  leadPercentage, 
  playerPercentage, 
  offer,
  onComplete, 
  onReject 
}: {
  leadParty: Candidate;
  playerParty: Candidate;
  leadPercentage: number;
  playerPercentage: number;
  offer: any;
  onComplete: (success: boolean, positions: string[], responses: number[]) => void;
  onReject: () => void;
}) {
  const [currentStep, setCurrentStep] = useState<'offer' | 'policy' | 'cabinet'>('offer');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [policyResponses, setPolicyResponses] = useState<number[]>([]);
  const [acceptedPositions, setAcceptedPositions] = useState<string[]>([]);

  const handleAcceptOffer = () => {
    if (offer.questions.length > 0) {
      setCurrentStep('policy');
    } else {
      setCurrentStep('cabinet');
    }
  };

  const handlePolicyResponse = (appeal: number) => {
    const newResponses = [...policyResponses, appeal];
    setPolicyResponses(newResponses);
    
    if (currentQuestionIndex + 1 < offer.questions.length) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setCurrentStep('cabinet');
    }
  };

  const handleCabinetResponse = () => {
    onComplete(true, acceptedPositions, policyResponses);
  };

  if (currentStep === 'offer') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
          <h3 className="text-2xl font-bold text-slate-900 mb-4">
            Coalition Invitation from {leadParty.party}
          </h3>
          <div className="mb-6">
            <p className="text-slate-700 mb-4">{offer.message}</p>
            
            {offer.offeredPositions.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-slate-800 mb-2">Offered Cabinet Positions:</h4>
                <ul className="list-disc list-inside text-slate-700 space-y-1">
                  {offer.offeredPositions.map((pos: string) => (
                    <li key={pos}>{pos}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="flex items-center space-x-3 p-3 bg-slate-100 rounded-lg">
              <div 
                className="w-8 h-8 rounded-full border-2 border-slate-600"
                style={{ backgroundColor: leadParty.colour }}
              ></div>
              <div>
                <div className="font-bold text-slate-900">{leadParty.party}</div>
                <div className="text-sm text-slate-600">{leadParty.name} - {leadPercentage.toFixed(1)}% support</div>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={onReject}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg"
            >
              Decline Invitation
            </button>
            <button
              onClick={handleAcceptOffer}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg"
            >
              Consider Offer
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'policy' && offer.questions.length > 0) {
    const currentQuestion = offer.questions[currentQuestionIndex];
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
          <h3 className="text-2xl font-bold text-slate-900 mb-4">
            Policy Discussion with {leadParty.party}
          </h3>
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-slate-800 mb-2">{currentQuestion.topic}</h4>
            <p className="text-slate-700 mb-4">"{currentQuestion.question}"</p>
            <div className="space-y-3">
              {currentQuestion.options.map((option: any, index: number) => (
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
            Question {currentQuestionIndex + 1} of {offer.questions.length}
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'cabinet') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
          <h3 className="text-2xl font-bold text-slate-900 mb-4">
            Cabinet Position Negotiation
          </h3>
          
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-slate-800 mb-3">
              {leadParty.party} offers these positions:
            </h4>
            <div className="space-y-2">
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
                  className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    acceptedPositions.includes(position)
                      ? 'border-green-500 bg-green-50'
                      : 'border-slate-300 hover:border-slate-400'
                  }`}
                >
                  <div className="font-medium text-slate-900">{position}</div>
                  <div className="text-sm text-slate-600">
                    {acceptedPositions.includes(position) ? 'Accepted' : 'Click to accept'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={onReject}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg"
            >
              Reject Offer
            </button>
            <button
              onClick={handleCabinetResponse}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg"
            >
              Accept ({acceptedPositions.length} positions)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default function CoalitionFormation() {
  const { state, actions } = useGame();
  const [selectedPartner, setSelectedPartner] = useState<Candidate | null>(null);
  const [showNegotiationDetails, setShowNegotiationDetails] = useState(false);
  const [aiNegotiationLog, setAiNegotiationLog] = useState<string[]>([]);
  const [playerApproachOffer, setPlayerApproachOffer] = useState<any>(null);
  const [showPlayerApproach, setShowPlayerApproach] = useState(false);

  const coalitionState = state.coalitionState;
  const sortedResults = [...state.pollResults].sort((a, b) => b.percentage - a.percentage);
  const winningParty = sortedResults[0].candidate;
  const winningPercentage = sortedResults[0].percentage;
  const playerResult = sortedResults.find(r => r.candidate.is_player);
  const isPlayerWinner = winningParty.is_player;

  useEffect(() => {
    if (!coalitionState && winningPercentage <= 50) {
      console.log('DEBUG: Starting coalition formation');
      actions.startCoalitionFormation();
    }
  }, [coalitionState, winningPercentage, actions]);

  // AI Coalition Formation Logic
  useEffect(() => {
    if (coalitionState && 
        coalitionState.negotiationPhase === 'partner-selection' && 
        !coalitionState.isPlayerLead && 
        coalitionState.currentCoalitionPercentage < 50 &&
        !showPlayerApproach) {
      
      const timer = setTimeout(() => {
        console.log('DEBUG: AI coalition formation, available partners:', coalitionState.availablePartners);
        let bestPartners = findBestCoalitionPartners(
          winningParty,
          coalitionState.availablePartners,
          sortedResults
        );
        console.log('DEBUG: Best partners:', bestPartners);
        
        if (bestPartners.length > 0) {
          const nextPartner = bestPartners[0];
          console.log('DEBUG: Next partner:', nextPartner);
          
          // Check if approaching the player
          if (nextPartner.candidate.is_player) {
            const offer = generatePlayerApproachOffer(
              winningParty,
              nextPartner.candidate,
              winningPercentage,
              nextPartner.percentage,
              coalitionState.cabinetAllocations // pass allocations
            );
            console.log('DEBUG: AI approaching player with offer:', offer);
            setPlayerApproachOffer(offer);
            setShowPlayerApproach(true);
          } else {
            // AI-to-AI negotiation
            const result = simulateAICoalitionNegotiation(
              winningParty,
              nextPartner.candidate,
              winningPercentage,
              nextPartner.percentage,
              coalitionState.cabinetAllocations // pass allocations
            );
            console.log('DEBUG: AI-to-AI negotiation result:', result);
            
            const logMessage = `${winningParty.party} approached ${nextPartner.candidate.party}: ${result.message}`;
            setAiNegotiationLog(prev => [...prev, logMessage]);
            
            if (result.success) {
              actions.addCoalitionPartner(nextPartner.candidate);
              result.cabinetPositions.forEach(position => {
                actions.allocateCabinetPosition(position, nextPartner.candidate.party);
                console.log('DEBUG: Allocating cabinet position', position, 'to', nextPartner.candidate.party);
              });
            } else {
              // Remove from available partners if negotiation failed
              console.log('DEBUG: Removing failed partner from availablePartners:', nextPartner.candidate);
              actions.removePotentialPartner(nextPartner.candidate);
              // add action to remove
            }
          }
        } else {
          // No more partners available - form minority government
          console.log('DEBUG: No more available partners, AI forming minority government');
          const logMessage = `${winningParty.party} has exhausted all coalition options and will form a minority government.`;
          setAiNegotiationLog(prev => [...prev, logMessage]);
          
          // Add a short delay before completing to show the message
          setTimeout(() => {
            actions.completeCoalitionFormation();
          }, 3000);
        }
      }, 2000); // 2 second delay for dramatic effect
      
      return () => clearTimeout(timer);
    }
  }, [coalitionState, winningParty, sortedResults, actions, showPlayerApproach]);

  // Auto-complete coalition when majority is reached
  useEffect(() => {
    if (coalitionState && 
        coalitionState.negotiationPhase === 'partner-selection' && 
        coalitionState.currentCoalitionPercentage >= 50) {
      console.log('DEBUG: Coalition majority reached, completing formation');
      const timer = setTimeout(() => {
        actions.completeCoalitionFormation();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [coalitionState, actions]);

  const handlePlayerApproachResponse = (success: boolean, positions: string[], responses: number[]) => {
    console.log('DEBUG: Player approach response', { success, positions, responses });
    if (success && playerResult && coalitionState) {
      const evaluation = evaluatePlayerResponse(
        winningParty,
        playerResult.candidate,
        winningPercentage,
        playerResult.percentage,
        responses,
        positions,
        coalitionState.cabinetAllocations // pass allocations
      );
      console.log('DEBUG: Player evaluation result:', evaluation);
      
      const logMessage = `${evaluation.message}`;
      setAiNegotiationLog(prev => [logMessage, ...prev]);
      
      if (evaluation.success) {
        actions.addCoalitionPartner(playerResult.candidate);
        positions.forEach(position => {
          actions.allocateCabinetPosition(position, playerResult.candidate.party);
          console.log('DEBUG: Allocating cabinet position', position, 'to', playerResult.candidate.party);
        });
      }
    } else {
      const logMessage = `${winningParty.party} approached ${playerResult?.candidate.party}: Offer declined.`;
      if (playerResult) actions.removePotentialPartner(playerResult.candidate);
      setAiNegotiationLog(prev => [...prev, logMessage]);
    }
    setShowPlayerApproach(false);
    setPlayerApproachOffer(null);
  };

  
  if (!coalitionState) {
    return (
      <div className="min-h-screen p-6" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)' }}>
        <div className="max-w-4xl mx-auto text-center text-white">
          <h1 className="text-4xl font-bold mb-4">Loading Coalition Formation...</h1>
        </div>
      </div>
    );
  }

  // Ensure all unallocated positions are assigned to the lead party when coalition is complete
  useEffect(() => {
    if (
      coalitionState &&
      coalitionState.negotiationPhase === 'complete' &&
      Object.keys(coalitionState.cabinetAllocations).length > 0
    ) {
      // Defensive: only run once per completion
      // Use a ref or a state if you want to avoid double-calling in strict mode
      autoAllocateUnfilledCabinetPositions(
        coalitionState.cabinetAllocations,
        sortedResults[0].candidate.party // or .id if you use id for allocations
      );
    }
  }, [coalitionState, sortedResults]);

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

          <div className="text-center">
            <button
              onClick={() => actions.setGamePhase('results')}
              className="px-12 py-4 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-bold rounded-lg transition-all duration-200 transform hover:scale-105"
            >
              🏛️ VIEW FINAL RESULTS
            </button>
            <p className="text-slate-300 text-xs mt-4">
              Created by <a href="https://indigonolan.com" target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-blue-200 underline transition-colors">Indigo Nolan</a>
            </p>
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
                {coalitionState.isPlayerLead ? 'BUILD YOUR COALITION' : 
                 coalitionState.availablePartners.length === 0 && coalitionState.currentCoalitionPercentage < 50 ? 
                 `${winningParty.party} FORMING MINORITY GOVERNMENT` : 
                 `${winningParty.party} FORMING COALITION`} • 
                CURRENT SUPPORT: {coalitionState.currentCoalitionPercentage.toFixed(1)}% • 
                NEED: {coalitionState.currentCoalitionPercentage >= 50 ? 'MAJORITY ACHIEVED!' : 
                       coalitionState.availablePartners.length === 0 && !coalitionState.isPlayerLead ? 'MINORITY GOVERNMENT' :
                       `${(50 - coalitionState.currentCoalitionPercentage).toFixed(1)}% MORE`}
              </p>
            </div>
          </div>

          {/* AI Negotiation Log */}
          {!coalitionState.isPlayerLead && aiNegotiationLog.length > 0 && (
            <div className="vintage-border p-6 mb-8" style={{ background: 'var(--newspaper-bg)' }}>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Coalition Negotiations</h2>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {aiNegotiationLog.map((log, index) => (
                  <div key={index} className="text-base font-mono text-slate-700 p-2 bg-slate-100 rounded">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Current Coalition */}
          <div className="vintage-border p-6 mb-8" style={{ background: 'var(--newspaper-bg)' }}>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              Current Coalition
              {coalitionState.currentCoalitionPercentage >= 50 && (
                <span className="ml-3 px-3 py-1 bg-green-500 text-white text-sm rounded-full">
                  MAJORITY ACHIEVED!
                </span>
              )}
              {coalitionState.availablePartners.length === 0 && coalitionState.currentCoalitionPercentage < 50 && !coalitionState.isPlayerLead && (
                <span className="ml-3 px-3 py-1 bg-orange-500 text-white text-sm rounded-full">
                  FORMING MINORITY GOVERNMENT
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
                      <div className="font-bold text-slate-900 font-mono">{partner.party}</div>
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
            
            {coalitionState.availablePartners.length === 0 && coalitionState.currentCoalitionPercentage < 50 && !coalitionState.isPlayerLead && (
              <div className="mt-4 p-3 bg-orange-100 border border-orange-300 rounded-lg">
                <p className="text-orange-800 font-semibold">
                  No more viable coalition partners available. {winningParty.party} will form a minority government with {coalitionState.currentCoalitionPercentage.toFixed(1)}% support.
                </p>
              </div>
            )}
          </div>

          {/* Available Partners */}
          <div className="vintage-border p-6 mb-8" style={{ background: 'var(--newspaper-bg)' }}>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              {coalitionState.isPlayerLead ? 'Choose Your Coalition Partners' : 'Potential Other Partners'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {coalitionState.availablePartners.map((partner) => {
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
                    onClick={() => {
                      if (coalitionState.isPlayerLead)  setSelectedPartner(partner);
                      setShowNegotiationDetails(true);
                    }}
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <div 
                        className="w-8 h-8 rounded-full border-2 border-slate-600"
                        style={{ backgroundColor: partner.colour }}
                      ></div>
                      <div className="flex-1">
                        <div className="font-bold font-mono text-slate-900">{partner.party}</div>
                        <div className="text-sm text-slate-700">{partner.name}</div>
                        <div className="text-xs text-slate-600">
                          {result?.percentage.toFixed(1)}% of vote
                          {partner.is_player && ' (You)'}
                        </div>
                      </div>
                    </div>
                    <div className="text-base space-y-1 font-mono uppercase mb-3">
                      <div>Willingness: <span className={willingness > 60 ? 'text-green-600' : willingness > 40 ? 'text-yellow-600' : 'text-red-600'}>{willingness.toFixed(0)}%</span></div>
                    </div>
                    {getIdeologyProfile(partner.vals)}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed Negotiations */}
          {showNegotiationDetails && selectedPartner && (
            <NegotiationModal
              cabinetAllocations = {coalitionState.cabinetAllocations}
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
              }}
              onCancel={() => {
                setShowNegotiationDetails(false);
                setSelectedPartner(null);
              }}
            />
          )}

          {/* Player Approach Modal */}
          {showPlayerApproach && playerApproachOffer && playerResult && (
            <PlayerApproachModal
              leadParty={winningParty}
              playerParty={playerResult.candidate}
              leadPercentage={winningPercentage}
              playerPercentage={playerResult.percentage}
              offer={playerApproachOffer}
              onComplete={handlePlayerApproachResponse}
              onReject={() => handlePlayerApproachResponse(false, [], [])}
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
