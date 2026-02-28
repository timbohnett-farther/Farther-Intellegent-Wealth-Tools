'use client';

import React from 'react';
import { RiskQuestion, CATEGORY_LABELS, Category } from '@/lib/risk-profile/types';

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

  return (
    <div className="card p-6 sm:p-8 max-w-2xl mx-auto">
      {/* Question header */}
      <div className="flex items-center justify-between mb-1">
        <span className="inline-block px-2 py-0.5 rounded-md bg-blue-50 text-[11px] font-semibold text-blue-600 uppercase tracking-wide">
          {categoryLabel}
        </span>
        <span className="text-xs text-gray-400">
          {questionNumber} of {totalQuestions}
        </span>
      </div>

      {/* Question text */}
      <h3 className="text-lg font-semibold text-gray-900 mt-3 mb-6 leading-relaxed">
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
                  ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                  }`}
                >
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
                <span
                  className={`text-sm ${
                    isSelected ? 'text-blue-900 font-medium' : 'text-gray-700'
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
