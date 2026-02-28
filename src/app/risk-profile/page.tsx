'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { RiskQuestion, RiskProfile, Difficulty } from '@/lib/risk-profile/types';
import { generateQuestionnaire } from '@/lib/risk-profile/generator';
import { calculateRiskProfile } from '@/lib/risk-profile/scoring';
import QuestionCard from '@/components/risk-profile/QuestionCard';
import ProgressBar from '@/components/risk-profile/ProgressBar';
import ResultsDashboard from '@/components/risk-profile/ResultsDashboard';

type Phase = 'setup' | 'questionnaire' | 'results';

interface SetupConfig {
  questionCount: number;
  difficulty: Difficulty | 'mixed';
}

function SetupScreen({ onStart }: { onStart: (config: SetupConfig) => void }) {
  const [questionCount, setQuestionCount] = useState(25);
  const [difficulty, setDifficulty] = useState<Difficulty | 'mixed'>('mixed');

  return (
    <div className="max-w-xl mx-auto">
      <div className="card p-8">
        {/* Icon */}
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a10 10 0 1 0 10 10" />
            <path d="M12 12 12 2" />
            <path d="M12 12l7.07-7.07" />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
          Risk Profile Assessment
        </h2>
        <p className="text-sm text-gray-500 text-center mb-8 max-w-md mx-auto leading-relaxed">
          This FINRA and CFP Board compliant assessment evaluates your risk tolerance across 7 dimensions: time horizon, loss tolerance, volatility comfort, investment knowledge, financial goals, behavioral biases, and liquidity needs.
        </p>

        {/* Config */}
        <div className="space-y-5">
          {/* Question count */}
          <div>
            <label className="label">Number of Questions</label>
            <div className="grid grid-cols-3 gap-2">
              {[15, 25, 40].map((count) => (
                <button
                  key={count}
                  onClick={() => setQuestionCount(count)}
                  className={`py-2.5 text-sm font-medium rounded-lg border-2 transition-all ${
                    questionCount === count
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {count} questions
                  <span className="block text-[10px] font-normal text-gray-400 mt-0.5">
                    {count === 15 ? '~5 min' : count === 25 ? '~8 min' : '~15 min'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label className="label">Difficulty Level</label>
            <div className="grid grid-cols-4 gap-2">
              {(['mixed', 'easy', 'medium', 'hard'] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`py-2 text-sm font-medium rounded-lg border-2 transition-all capitalize ${
                    difficulty === d
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Start button */}
        <button
          onClick={() => onStart({ questionCount, difficulty })}
          className="mt-8 w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold rounded-lg hover:from-teal-600 hover:to-emerald-700 transition-all shadow-sm"
        >
          Begin Assessment
        </button>

        {/* Compliance note */}
        <p className="text-[10px] text-gray-400 text-center mt-4">
          Questions sourced from a {395}-question FINRA/CFP compliant question bank.
          Scoring uses weighted averages across 7 risk dimensions with contradiction detection.
        </p>
      </div>
    </div>
  );
}

export default function RiskProfilePage() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [questions, setQuestions] = useState<RiskQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Map<number, number>>(new Map());
  const [riskProfile, setRiskProfile] = useState<RiskProfile | null>(null);

  const answeredCount = useMemo(() => responses.size, [responses]);

  const handleStart = useCallback((config: SetupConfig) => {
    const qs = generateQuestionnaire(config.questionCount, config.difficulty);
    setQuestions(qs);
    setCurrentIndex(0);
    setResponses(new Map());
    setRiskProfile(null);
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
    const responseArray = Array.from(responses.entries()).map(([questionId, answerValue]) => ({
      questionId,
      answerValue,
    }));
    const result = calculateRiskProfile(responseArray);
    setRiskProfile(result);
    setPhase('results');
  }, [responses]);

  const handleRestart = useCallback(() => {
    setPhase('setup');
    setQuestions([]);
    setCurrentIndex(0);
    setResponses(new Map());
    setRiskProfile(null);
  }, []);

  const currentQuestion = questions[currentIndex] ?? null;
  const currentAnswer = currentQuestion ? (responses.get(currentQuestion.id) ?? null) : null;
  const allAnswered = answeredCount === questions.length && questions.length > 0;

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
              <p className="text-xs text-gray-500">Risk Profile Assessment</p>
            </div>
          </div>
          {phase === 'questionnaire' && (
            <div className="text-xs text-gray-400">
              {answeredCount}/{questions.length} answered
            </div>
          )}
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto px-4 py-8">
        {/* Setup Phase */}
        {phase === 'setup' && <SetupScreen onStart={handleStart} />}

        {/* Questionnaire Phase */}
        {phase === 'questionnaire' && currentQuestion && (
          <div className="space-y-6">
            {/* Progress */}
            <div className="max-w-2xl mx-auto">
              <ProgressBar current={answeredCount} total={questions.length} />
            </div>

            {/* Question */}
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
                {/* Question dots (show max 15 dots with overflow indicator) */}
                {questions.length <= 30 ? (
                  questions.map((q, i) => (
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
                  ))
                ) : (
                  <span className="text-xs text-gray-400">
                    Question {currentIndex + 1} of {questions.length}
                  </span>
                )}
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

            {/* Skip / jump to unanswered */}
            {currentAnswer !== null && currentIndex < questions.length - 1 && (
              <div className="text-center">
                <button
                  onClick={() => {
                    // Find next unanswered question
                    for (let i = currentIndex + 1; i < questions.length; i++) {
                      if (!responses.has(questions[i].id)) {
                        setCurrentIndex(i);
                        return;
                      }
                    }
                    // All remaining answered, go to last
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
