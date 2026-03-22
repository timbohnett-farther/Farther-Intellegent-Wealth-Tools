'use client';

import React from 'react';
import { RiskQuestion, CATEGORY_LABELS, Category, AXIS_LABELS, QuestionAxis, CATEGORY_TO_AXIS } from '@/lib/risk-profile/types';

interface QuestionCardProps {
  question: RiskQuestion;
  selectedValue: number | null;
  onSelect: (value: number) => void;
  questionNumber: number;
  totalQuestions: number;
}

export default function QuestionCard({
  question,
  selectedValue,
  onSelect,
  questionNumber,
  totalQuestions,
}: QuestionCardProps) {
  const categoryLabel = CATEGORY_LABELS[question.category as Category] ?? question.category;
  const resolvedAxis = question.axis ?? CATEGORY_TO_AXIS[question.category as Category];
  const axisLabel = resolvedAxis ? (AXIS_LABELS[resolvedAxis] ?? resolvedAxis) : '';

  return (
    <div className="card p-6 sm:p-8 max-w-2xl mx-auto">
      {/* Question header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="inline-block px-2 py-0.5 rounded-md bg-teal-500/10 text-[11px] font-semibold text-teal-300 uppercase tracking-wide">
            {categoryLabel}
          </span>
          {axisLabel && (
            <span className="inline-block px-2 py-0.5 rounded-md bg-white/[0.06] text-[10px] font-medium text-white/50">
              {axisLabel}
            </span>
          )}
        </div>
        <span className="text-xs text-white/30">
          {questionNumber} of {totalQuestions}
        </span>
      </div>

      {/* Question text */}
      <h3 className="text-lg font-semibold text-white mt-3 mb-6 leading-relaxed">
        {question.questionText}
      </h3>

      {/* Options */}
      <div className="space-y-3">
        {question.options.map((option) => {
          const isSelected = selectedValue === option.value;

          return (
            <button
              key={option.value}
              onClick={() => onSelect(option.value)}
              className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all duration-150 ${
                isSelected
                  ? 'border-teal-500 bg-teal-500/10 ring-1 shadow-focus'
                  : 'border-white/[0.06] bg-white/[0.07] hover:border-white/[0.10] hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'border-teal-500 bg-teal-500'
                      : 'border-white/[0.10]'
                  }`}
                >
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
                <span
                  className={`text-sm ${
                    isSelected ? 'text-white font-medium' : 'text-white/60'
                  }`}
                >
                  {option.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
