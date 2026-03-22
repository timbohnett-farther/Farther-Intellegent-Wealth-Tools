'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import type {
  RiskQuestion,
  RiskProfile,
  ClientIntake,
  QuestionResponse,
} from '@/lib/risk-profile/types';
import { generateQuestionnaire } from '@/lib/risk-profile/generator';
import { calculateRiskProfile } from '@/lib/risk-profile/scoring';
import IntakeForm from '@/components/risk-profile/IntakeForm';
import QuestionCard from '@/components/risk-profile/QuestionCard';
import ProgressBar from '@/components/risk-profile/ProgressBar';
import ResultsDashboard from '@/components/risk-profile/ResultsDashboard';

type Phase = 'intro' | 'intake' | 'questionnaire' | 'results';

const TOTAL_QUESTIONS = 15;

function IntroScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="max-w-xl mx-auto">
      <div className="card p-8 text-center">
        {/* Icon */}
        <div className="w-16 h-16 mx-auto rounded-2xl bg-linear-to-br from-teal-500 to-teal-800 flex items-center justify-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a10 10 0 1 0 10 10" />
            <path d="M12 12 12 2" />
            <path d="M12 12l7.07-7.07" />
          </svg>
        </div>

        <h2 className="font-serif text-2xl font-bold text-white mb-3">
          Farther Focus
        </h2>
        <p className="text-base text-white/50 mb-6 leading-relaxed max-w-md mx-auto">
          This is not a test. It&apos;s a conversation to understand how you think and feel about risk, and what your finances can realistically support.
        </p>

        <div className="space-y-3 text-left max-w-sm mx-auto mb-8">
          {[
            { step: '1', label: 'Quick Profile', desc: 'Basic financial picture and goals' },
            { step: '2', label: 'Risk Assessment', desc: '15 AI-adaptive questions tailored to you' },
            { step: '3', label: 'Your Risk Blueprint', desc: 'AI-powered profile, portfolio options, and backtests' },
          ].map(({ step, label, desc }) => (
            <div key={step} className="flex items-start gap-3">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-teal-500/15 text-teal-300 flex items-center justify-center text-xs font-bold">
                {step}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{label}</p>
                <p className="text-xs text-white/50">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onContinue}
          className="w-full py-3 bg-teal-500 text-white font-semibold rounded-lg hover:bg-teal-400 transition-all shadow-sm"
        >
          Get Started
        </button>

        <p className="text-[10px] text-white/30 mt-4 leading-relaxed">
          FINRA 2111 / Reg BI / CFA Institute compliant. AI-powered adaptive questioning with multi-axis scoring across risk tolerance, capacity, behavioral biases, and complexity preference. Results include 7-band portfolio mapping with 32-year backtesting.
        </p>
      </div>
    </div>
  );
}

function LoadingSpinner({ message }: { message: string }) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="card p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-teal-500/10 mb-4">
          <svg className="animate-spin h-6 w-6 text-teal-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
        <p className="text-sm text-white/50">{message}</p>
      </div>
    </div>
  );
}

export default function RiskProfilePage() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [intake, setIntake] = useState<ClientIntake | null>(null);
  const [questions, setQuestions] = useState<RiskQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Map<number, number>>(new Map());
  const [riskProfile, setRiskProfile] = useState<RiskProfile | null>(null);

  // AI state
  const [useAI, setUseAI] = useState<boolean | null>(null); // null = not checked yet
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [aiMode, setAiMode] = useState<'ai' | 'static'>('static');

  // Static fallback questions (pre-generated when AI fails)
  const staticQuestionsRef = useRef<RiskQuestion[]>([]);

  const answeredCount = useMemo(() => responses.size, [responses]);

  // Check if AI is available on mount
  useEffect(() => {
    fetch('/api/risk-profile/status')
      .then(res => res.json())
      .then(data => setUseAI(data.aiEnabled ?? false))
      .catch(() => setUseAI(false));
  }, []);

  // Build response array helper
  const buildResponseArray = useCallback((): QuestionResponse[] => {
    return Array.from(responses.entries()).map(([questionId, answerValue]) => ({
      questionId,
      answerValue,
    }));
  }, [responses]);

  // Fetch the next AI question
  const fetchAIQuestion = useCallback(async (
    clientIntake: ClientIntake,
    prevQuestions: RiskQuestion[],
    prevResponses: QuestionResponse[],
    questionNum: number,
  ): Promise<RiskQuestion | null> => {
    try {
      const res = await fetch('/api/risk-profile/next-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intake: clientIntake,
          previousQuestions: prevQuestions,
          previousResponses: prevResponses,
          questionNumber: questionNum,
          totalQuestions: TOTAL_QUESTIONS,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.fallback) return null;
        return null;
      }

      const data = await res.json();
      return data.question ?? null;
    } catch {
      return null;
    }
  }, []);

  // Generate the AI profile
  const fetchAIProfile = useCallback(async (
    clientIntake: ClientIntake,
    qs: RiskQuestion[],
    resps: QuestionResponse[],
  ): Promise<RiskProfile | null> => {
    try {
      const res = await fetch('/api/risk-profile/generate-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intake: clientIntake,
          questions: qs,
          responses: resps,
        }),
      });

      if (!res.ok) return null;

      const data = await res.json();
      return data.profile ?? null;
    } catch {
      return null;
    }
  }, []);

  // Fall back to static: generate all remaining questions from the bank
  const fallbackToStatic = useCallback((clientIntake: ClientIntake, existingQuestions: RiskQuestion[]) => {
    setAiMode('static');
    if (staticQuestionsRef.current.length === 0) {
      staticQuestionsRef.current = generateQuestionnaire(clientIntake.wealthTier);
    }

    const remaining = TOTAL_QUESTIONS - existingQuestions.length;
    if (remaining > 0) {
      // Pick static questions that haven't been used (by ID)
      const usedIds = new Set(existingQuestions.map(q => q.id));
      const available = staticQuestionsRef.current.filter(q => !usedIds.has(q.id));
      const fill = available.slice(0, remaining);
      return [...existingQuestions, ...fill];
    }
    return existingQuestions;
  }, []);

  // Handle intake complete → start questioning
  const handleIntakeComplete = useCallback(async (clientIntake: ClientIntake) => {
    setIntake(clientIntake);
    setCurrentIndex(0);
    setResponses(new Map());
    setPhase('questionnaire');

    // Pre-generate static questions as fallback
    staticQuestionsRef.current = generateQuestionnaire(clientIntake.wealthTier);

    if (useAI) {
      // Try AI for the first question
      setIsLoadingQuestion(true);
      setAiMode('ai');

      const aiQuestion = await fetchAIQuestion(clientIntake, [], [], 1);

      if (aiQuestion) {
        setQuestions([aiQuestion]);
      } else {
        // AI failed — fall back to full static set
        setQuestions(staticQuestionsRef.current);
        setAiMode('static');
      }

      setIsLoadingQuestion(false);
    } else {
      // No AI — use static questions
      setQuestions(staticQuestionsRef.current);
      setAiMode('static');
    }
  }, [useAI, fetchAIQuestion]);

  const handleSelect = useCallback((value: number) => {
    setResponses(prev => {
      const next = new Map(prev);
      next.set(questions[currentIndex].id, value);
      return next;
    });
  }, [questions, currentIndex]);

  // Handle next: in AI mode, fetch the next adaptive question
  const handleNext = useCallback(async () => {
    if (currentIndex >= questions.length - 1 && aiMode === 'static') return;

    const nextIdx = currentIndex + 1;

    if (aiMode === 'ai' && nextIdx >= questions.length && nextIdx < TOTAL_QUESTIONS && intake) {
      // Need to fetch the next AI question
      setIsLoadingQuestion(true);

      const responseArray = buildResponseArray();
      const aiQuestion = await fetchAIQuestion(intake, questions, responseArray, nextIdx + 1);

      if (aiQuestion) {
        setQuestions(prev => [...prev, aiQuestion]);
      } else {
        // AI failed mid-flow — fill remaining with static
        const filled = fallbackToStatic(intake, questions);
        setQuestions(filled);
      }

      setIsLoadingQuestion(false);
      setCurrentIndex(nextIdx);
    } else {
      setCurrentIndex(nextIdx);
    }
  }, [currentIndex, questions, aiMode, intake, buildResponseArray, fetchAIQuestion, fallbackToStatic]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
    }
  }, [currentIndex]);

  const handleSubmit = useCallback(async () => {
    if (!intake) return;

    const responseArray = buildResponseArray();

    if (aiMode === 'ai') {
      // Try AI profile generation
      setIsLoadingProfile(true);
      const aiProfile = await fetchAIProfile(intake, questions, responseArray);

      if (aiProfile) {
        setRiskProfile(aiProfile);
        setPhase('results');
        setIsLoadingProfile(false);
        return;
      }

      // AI failed — fall back to static scoring
      setIsLoadingProfile(false);
    }

    // Static fallback scoring
    const result = calculateRiskProfile(responseArray, intake);
    setRiskProfile(result);
    setPhase('results');
  }, [responses, intake, aiMode, questions, buildResponseArray, fetchAIProfile]);

  const handleRestart = useCallback(() => {
    setPhase('intro');
    setIntake(null);
    setQuestions([]);
    setCurrentIndex(0);
    setResponses(new Map());
    setRiskProfile(null);
    setAiMode('static');
    staticQuestionsRef.current = [];
  }, []);

  const currentQuestion = questions[currentIndex] ?? null;
  const currentAnswer = currentQuestion ? (responses.get(currentQuestion.id) ?? null) : null;
  const effectiveTotal = aiMode === 'ai' ? TOTAL_QUESTIONS : questions.length;
  const allAnswered = answeredCount >= effectiveTotal && effectiveTotal > 0;
  const isLastQuestion = aiMode === 'ai'
    ? (currentIndex === TOTAL_QUESTIONS - 1)
    : (currentIndex === questions.length - 1);

  // Phase label for header
  const phaseLabel = phase === 'intro' ? '' : phase === 'intake' ? 'Client Profile' : phase === 'questionnaire' ? 'Risk Assessment' : 'Results';

  return (
    <div className="min-h-screen bg-transparent">
      {/* Header */}
      <header className="bg-white/[0.07]/[0.03] border-b border-white/[0.06] backdrop-blur-xl sticky top-0 z-50 no-print">
        <div className="max-w-panel-dashboard mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-white/30 hover:text-white/50 transition-colors"
              aria-label="Back to tools"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </Link>
            <div>
              <h1 className="font-serif text-lg font-bold text-white">Farther Focus</h1>
              <p className="text-xs text-white/50">
                {phaseLabel || 'Intelligent Risk Profile Assessment'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-white/30">
            {phase === 'questionnaire' && (
              <>
                <span>{answeredCount}/{effectiveTotal} answered</span>
                {aiMode === 'ai' && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-300 text-[10px] font-medium">
                    AI
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-panel-dashboard mx-auto px-4 py-8">
        {/* Intro Phase */}
        {phase === 'intro' && (
          <IntroScreen onContinue={() => setPhase('intake')} />
        )}

        {/* Intake Phase */}
        {phase === 'intake' && (
          <IntakeForm onComplete={handleIntakeComplete} />
        )}

        {/* Questionnaire Phase */}
        {phase === 'questionnaire' && (
          <>
            {/* Loading state for AI question generation */}
            {isLoadingQuestion && !currentQuestion && (
              <LoadingSpinner message="Generating your first adaptive question..." />
            )}

            {/* Loading state for AI profile generation */}
            {isLoadingProfile && (
              <LoadingSpinner message="AI is analyzing your responses and generating your risk profile..." />
            )}

            {/* Question display */}
            {!isLoadingProfile && currentQuestion && (
              <div className="space-y-6">
                <div className="max-w-2xl mx-auto">
                  <ProgressBar current={answeredCount} total={effectiveTotal} />
                </div>

                <QuestionCard
                  question={currentQuestion}
                  selectedValue={currentAnswer}
                  onSelect={handleSelect}
                  questionNumber={currentIndex + 1}
                  totalQuestions={effectiveTotal}
                />

                {/* Navigation */}
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                  <button
                    onClick={handlePrev}
                    disabled={currentIndex === 0 || isLoadingQuestion}
                    className="px-4 py-2 text-sm font-medium text-white/50 rounded-lg hover:bg-white/[0.06] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                    Previous
                  </button>

                  <div className="flex items-center gap-2">
                    {Array.from({ length: effectiveTotal }, (_, i) => {
                      const q = questions[i];
                      return (
                        <button
                          key={i}
                          onClick={() => i < questions.length && setCurrentIndex(i)}
                          disabled={i >= questions.length}
                          className={`w-2 h-2 rounded-full transition-all ${
                            i === currentIndex
                              ? 'bg-teal-500 w-3 h-3'
                              : q && responses.has(q.id)
                                ? 'bg-teal-300'
                                : i < questions.length
                                  ? 'bg-white/[0.10]'
                                  : 'bg-white/[0.06]'
                          }`}
                          aria-label={`Go to question ${i + 1}`}
                        />
                      );
                    })}
                  </div>

                  {!isLastQuestion ? (
                    <button
                      onClick={handleNext}
                      disabled={currentAnswer === null || isLoadingQuestion}
                      className="px-4 py-2 text-sm font-medium text-white bg-teal-500 rounded-lg hover:bg-teal-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      {isLoadingQuestion ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Thinking...
                        </>
                      ) : (
                        <>
                          Next
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmit}
                      disabled={!allAnswered || isLoadingProfile}
                      className="px-5 py-2 text-sm font-semibold text-white bg-teal-500 rounded-lg hover:bg-teal-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isLoadingProfile ? 'Analyzing...' : 'Submit Assessment'}
                    </button>
                  )}
                </div>

                {/* Jump to next unanswered (static mode only) */}
                {aiMode === 'static' && currentAnswer !== null && !isLastQuestion && (
                  <div className="text-center">
                    <button
                      onClick={() => {
                        for (let i = currentIndex + 1; i < questions.length; i++) {
                          if (!responses.has(questions[i].id)) {
                            setCurrentIndex(i);
                            return;
                          }
                        }
                        setCurrentIndex(questions.length - 1);
                      }}
                      className="text-xs text-white/30 hover:text-white/50 transition-colors"
                    >
                      Jump to next unanswered
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Results Phase */}
        {phase === 'results' && riskProfile && (
          <ResultsDashboard profile={riskProfile} onRestart={handleRestart} />
        )}
      </div>
    </div>
  );
}
