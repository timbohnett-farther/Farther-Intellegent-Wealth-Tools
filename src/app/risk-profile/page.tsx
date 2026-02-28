'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import type {
  RiskQuestion,
  RiskProfile,
  ClientIntake,
} from '@/lib/risk-profile/types';
import { generateQuestionnaire } from '@/lib/risk-profile/generator';
import { calculateRiskProfile } from '@/lib/risk-profile/scoring';
import IntakeForm from '@/components/risk-profile/IntakeForm';
import QuestionCard from '@/components/risk-profile/QuestionCard';
import ProgressBar from '@/components/risk-profile/ProgressBar';
import ResultsDashboard from '@/components/risk-profile/ResultsDashboard';

type Phase = 'intro' | 'intake' | 'questionnaire' | 'results';

function IntroScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="max-w-xl mx-auto">
      <div className="card p-8 text-center">
        {/* Icon */}
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a10 10 0 1 0 10 10" />
            <path d="M12 12 12 2" />
            <path d="M12 12l7.07-7.07" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          Farther Focus
        </h2>
        <p className="text-base text-gray-600 mb-6 leading-relaxed max-w-md mx-auto">
          This is not a test. It&apos;s a conversation to understand how you think and feel about risk, and what your finances can realistically support.
        </p>

        <div className="space-y-3 text-left max-w-sm mx-auto mb-8">
          {[
            { step: '1', label: 'Quick Profile', desc: 'Basic financial picture and goals' },
            { step: '2', label: 'Risk Assessment', desc: '15 adaptive questions tailored to your wealth tier' },
            { step: '3', label: 'Your Risk Blueprint', desc: 'Multi-axis profile, portfolio options, and backtests' },
          ].map(({ step, label, desc }) => (
            <div key={step} className="flex items-start gap-3">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">
                {step}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{label}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onContinue}
          className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold rounded-lg hover:from-teal-600 hover:to-emerald-700 transition-all shadow-sm"
        >
          Get Started
        </button>

        <p className="text-[10px] text-gray-400 mt-4 leading-relaxed">
          FINRA 2111 / Reg BI / CFA Institute compliant. Multi-axis scoring across risk tolerance, capacity, behavioral biases, and complexity preference. Results include 7-band portfolio mapping with 32-year backtesting.
        </p>
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

  const answeredCount = useMemo(() => responses.size, [responses]);

  const handleIntakeComplete = useCallback((clientIntake: ClientIntake) => {
    setIntake(clientIntake);
    const qs = generateQuestionnaire(clientIntake.wealthTier);
    setQuestions(qs);
    setCurrentIndex(0);
    setResponses(new Map());
    setPhase('questionnaire');
  }, []);

  const handleSelect = useCallback((value: number) => {
    setResponses(prev => {
      const next = new Map(prev);
      next.set(questions[currentIndex].id, value);
      return next;
    });
  }, [questions, currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
    }
  }, [currentIndex, questions.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
    }
  }, [currentIndex]);

  const handleSubmit = useCallback(() => {
    if (!intake) return;
    const responseArray = Array.from(responses.entries()).map(([questionId, answerValue]) => ({
      questionId,
      answerValue,
    }));
    const result = calculateRiskProfile(responseArray, intake);
    setRiskProfile(result);
    setPhase('results');
  }, [responses, intake]);

  const handleRestart = useCallback(() => {
    setPhase('intro');
    setIntake(null);
    setQuestions([]);
    setCurrentIndex(0);
    setResponses(new Map());
    setRiskProfile(null);
  }, []);

  const currentQuestion = questions[currentIndex] ?? null;
  const currentAnswer = currentQuestion ? (responses.get(currentQuestion.id) ?? null) : null;
  const allAnswered = answeredCount === questions.length && questions.length > 0;

  // Phase label for header
  const phaseLabel = phase === 'intro' ? '' : phase === 'intake' ? 'Client Profile' : phase === 'questionnaire' ? 'Risk Assessment' : 'Results';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 no-print">
        <div className="max-w-[1200px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Back to tools"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Farther Focus</h1>
              <p className="text-xs text-gray-500">
                {phaseLabel || 'Intelligent Risk Profile Assessment'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            {phase === 'questionnaire' && (
              <span>{answeredCount}/{questions.length} answered</span>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto px-4 py-8">
        {/* Intro Phase */}
        {phase === 'intro' && (
          <IntroScreen onContinue={() => setPhase('intake')} />
        )}

        {/* Intake Phase */}
        {phase === 'intake' && (
          <IntakeForm onComplete={handleIntakeComplete} />
        )}

        {/* Questionnaire Phase */}
        {phase === 'questionnaire' && currentQuestion && (
          <div className="space-y-6">
            <div className="max-w-2xl mx-auto">
              <ProgressBar current={answeredCount} total={questions.length} />
            </div>

            <QuestionCard
              question={currentQuestion}
              selectedValue={currentAnswer}
              onSelect={handleSelect}
              questionNumber={currentIndex + 1}
              totalQuestions={questions.length}
            />

            {/* Navigation */}
            <div className="max-w-2xl mx-auto flex items-center justify-between">
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="px-4 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                Previous
              </button>

              <div className="flex items-center gap-2">
                {questions.map((q, i) => (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(i)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === currentIndex
                        ? 'bg-blue-500 w-3 h-3'
                        : responses.has(q.id)
                          ? 'bg-blue-300'
                          : 'bg-gray-300'
                    }`}
                    aria-label={`Go to question ${i + 1}`}
                  />
                ))}
              </div>

              {currentIndex < questions.length - 1 ? (
                <button
                  onClick={handleNext}
                  disabled={currentAnswer === null}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  Next
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!allAnswered}
                  className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-teal-500 to-emerald-600 rounded-lg hover:from-teal-600 hover:to-emerald-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Submit Assessment
                </button>
              )}
            </div>

            {currentAnswer !== null && currentIndex < questions.length - 1 && (
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
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Jump to next unanswered
                </button>
              </div>
            )}
          </div>
        )}

        {/* Results Phase */}
        {phase === 'results' && riskProfile && (
          <ResultsDashboard profile={riskProfile} onRestart={handleRestart} />
        )}
      </div>
    </div>
  );
}
