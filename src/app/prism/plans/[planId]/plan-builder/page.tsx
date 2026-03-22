'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  MessageSquare, Send, CheckCircle2, Circle, Loader2,
  User, Bot, FileText, Upload, Pause, Play, RotateCcw,
  DollarSign, Home, Briefcase, Shield, Heart, Target,
  ChevronRight, X, AlertCircle,
} from 'lucide-react';

// ==================== TYPES ====================
interface ChatMessage {
  id: string;
  role: 'ai' | 'advisor';
  content: string;
  timestamp: Date;
  extractedData?: ExtractedField[];
}

interface ExtractedField {
  field: string;
  value: string;
  confirmed: boolean;
}

interface DataSection {
  id: string;
  label: string;
  icon: React.ReactNode;
  fields: string[];
  completedFields: number;
  totalFields: number;
}

// ==================== CONSTANTS ====================
const INITIAL_SECTIONS: DataSection[] = [
  { id: 'client_info', label: 'Client Info', icon: <User size={16} />, fields: ['name', 'dob', 'marital_status', 'filing_status', 'state', 'employment'], completedFields: 0, totalFields: 6 },
  { id: 'co_client', label: 'Co-Client', icon: <User size={16} />, fields: ['name', 'dob', 'employment'], completedFields: 0, totalFields: 3 },
  { id: 'income', label: 'Income', icon: <DollarSign size={16} />, fields: ['salary', 'bonus', 'se_income', 'pension', 'ss_benefits', 'rental', 'other'], completedFields: 0, totalFields: 7 },
  { id: 'expenses', label: 'Expenses', icon: <Home size={16} />, fields: ['housing', 'transportation', 'food', 'healthcare', 'insurance', 'discretionary', 'debt_payments'], completedFields: 0, totalFields: 7 },
  { id: 'accounts', label: 'Accounts', icon: <Briefcase size={16} />, fields: ['brokerage', 'ira', 'roth', '401k', 'real_estate', 'savings', 'business'], completedFields: 0, totalFields: 7 },
  { id: 'insurance', label: 'Insurance', icon: <Shield size={16} />, fields: ['life', 'disability', 'ltc', 'health'], completedFields: 0, totalFields: 4 },
  { id: 'goals', label: 'Goals', icon: <Target size={16} />, fields: ['retirement_age', 'income_need', 'education', 'legacy', 'major_purchase'], completedFields: 0, totalFields: 5 },
  { id: 'estate', label: 'Estate', icon: <Heart size={16} />, fields: ['will', 'trust', 'poa', 'beneficiaries'], completedFields: 0, totalFields: 4 },
];

const OPENING_QUESTIONS: Record<string, string> = {
  client_info: "Let's start with the basics. What is the client's full name, date of birth, and where do they live?",
  co_client: "Is the client married or have a partner? If so, what is their name, date of birth, and employment status?",
  income: "Let's talk about income. What does the client earn? Include salary, bonuses, self-employment, and any other income sources.",
  expenses: "Now let's cover expenses. What are the major monthly or annual expenses? Start with housing, then we'll cover everything else.",
  accounts: "Let's document the investment and savings accounts. Walk me through each account — type, institution, approximate balance, and whether it's tax-deferred, Roth, or taxable.",
  insurance: "What insurance policies are in place? Life insurance, disability, long-term care, and health coverage.",
  goals: "What are the client's financial goals? When do they want to retire? What income do they need? Any education funding, legacy goals, or major purchases planned?",
  estate: "Finally, let's cover the estate plan. Is there a will, trust, power of attorney, and healthcare proxy in place? Who are the beneficiaries?",
};

// ==================== COMPONENT ====================
export default function PlanBuilderPage() {
  const { planId } = useParams<{ planId: string }>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [sections, setSections] = useState<DataSection[]>(INITIAL_SECTIONS);
  const [activeSection, setActiveSection] = useState<string>('client_info');
  const [sessionStarted, setSessionStarted] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<ExtractedField[] | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const completionScore = Math.round(
    (sections.reduce((sum, s) => sum + s.completedFields, 0) /
      sections.reduce((sum, s) => sum + s.totalFields, 0)) * 100
  );

  function startSession() {
    setSessionStarted(true);
    const firstQuestion = OPENING_QUESTIONS[activeSection];
    setMessages([
      {
        id: '1',
        role: 'ai',
        content: `Welcome to the Plan Builder! I'll help you collect all the data needed for a comprehensive financial plan. Let's work through each section together.\n\n${firstQuestion}`,
        timestamp: new Date(),
      },
    ]);
  }

  function simulateAIResponse(userMessage: string) {
    setIsProcessing(true);

    // Simulate data extraction from user input
    const extracted: ExtractedField[] = [];
    const lower = userMessage.toLowerCase();

    // Simple pattern matching for demo
    const ageMatch = userMessage.match(/(\d{1,2})\s*(years?\s*old|yo)/i);
    if (ageMatch) {
      const age = parseInt(ageMatch[1]);
      const birthYear = new Date().getFullYear() - age;
      extracted.push({ field: 'date_of_birth', value: `~${birthYear}`, confirmed: false });
    }

    const salaryMatch = userMessage.match(/\$?([\d,]+)k?\s*(salary|base|making|earns|income)/i);
    if (salaryMatch) {
      let amount = parseInt(salaryMatch[1].replace(/,/g, ''));
      if (userMessage.toLowerCase().includes('k')) amount *= 1000;
      if (amount < 1000) amount *= 1000; // assume "320" means 320k
      extracted.push({ field: 'salary', value: `$${amount.toLocaleString()}`, confirmed: false });
    }

    const bonusMatch = userMessage.match(/\$?([\d,]+)k?\s*(bonus)/i);
    if (bonusMatch) {
      let amount = parseInt(bonusMatch[1].replace(/,/g, ''));
      if (amount < 1000) amount *= 1000;
      extracted.push({ field: 'bonus', value: `$${amount.toLocaleString()}`, confirmed: false });
    }

    const marriedMatch = lower.match(/married|spouse|wife|husband|partner/);
    if (marriedMatch) {
      extracted.push({ field: 'marital_status', value: 'Married', confirmed: false });
      extracted.push({ field: 'filing_status', value: 'Married Filing Jointly', confirmed: false });
    }

    const retireMatch = userMessage.match(/retire\s*(at|by)?\s*(\d{2})/i);
    if (retireMatch) {
      extracted.push({ field: 'retirement_age', value: retireMatch[2], confirmed: false });
    }

    setTimeout(() => {
      let response = '';

      if (extracted.length > 0) {
        response = "Here's what I captured:\n\n";
        extracted.forEach((e) => {
          response += `• **${formatFieldName(e.field)}**: ${e.value}\n`;
        });
        response += '\nDoes this look correct? If so, I\'ll save it and move on. Otherwise, let me know what to change.';
        setPendingConfirmation(extracted);
      } else {
        response = getFollowUpQuestion(activeSection, sections);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          role: 'ai',
          content: response,
          timestamp: new Date(),
          extractedData: extracted.length > 0 ? extracted : undefined,
        },
      ]);
      setIsProcessing(false);
    }, 800);
  }

  function confirmData() {
    if (!pendingConfirmation) return;

    // Update section completion
    setSections((prev) =>
      prev.map((s) => {
        if (s.id === activeSection) {
          const newCompleted = Math.min(
            s.completedFields + pendingConfirmation!.length,
            s.totalFields
          );
          return { ...s, completedFields: newCompleted };
        }
        return s;
      })
    );

    setPendingConfirmation(null);

    // Move to next question or section
    const currentSection = sections.find((s) => s.id === activeSection);
    if (currentSection && currentSection.completedFields + (pendingConfirmation?.length ?? 0) >= currentSection.totalFields) {
      // Move to next section
      const idx = sections.findIndex((s) => s.id === activeSection);
      if (idx < sections.length - 1) {
        const nextSection = sections[idx + 1];
        setActiveSection(nextSection.id);
        setMessages((prev) => [
          ...prev,
          {
            id: String(Date.now()),
            role: 'ai',
            content: `Great, ${currentSection.label} section is complete! Let's move on to **${nextSection.label}**.\n\n${OPENING_QUESTIONS[nextSection.id]}`,
            timestamp: new Date(),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: String(Date.now()),
            role: 'ai',
            content: "Excellent! We've covered all the major sections. The plan data is ready for review. You can go back to any section to add more detail, or save and calculate the plan.",
            timestamp: new Date(),
          },
        ]);
      }
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          role: 'ai',
          content: `Saved! ${getFollowUpQuestion(activeSection, sections)}`,
          timestamp: new Date(),
        },
      ]);
    }
  }

  function handleSend() {
    if (!inputValue.trim() || isProcessing) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      role: 'advisor',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    simulateAIResponse(inputValue.trim());
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (pendingConfirmation) {
        confirmData();
      } else {
        handleSend();
      }
    }
  }

  return (
    <div className="flex h-[calc(100vh-120px)] bg-limestone-50">
      {/* Left Panel - Chat (70%) */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="bg-white border-b px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
              <MessageSquare size={18} className="text-brand-700" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-charcoal-900">AI Plan Builder</h2>
              <p className="text-xs text-charcoal-500">Conversational data intake</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-charcoal-500">Plan: {planId?.slice(0, 8)}...</span>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {!sessionStarted ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-brand-100 flex items-center justify-center mb-4">
                <Bot size={32} className="text-brand-700" />
              </div>
              <h3 className="text-lg font-semibold text-charcoal-900 mb-2">Plan Builder AI Assistant</h3>
              <p className="text-sm text-charcoal-500 max-w-md mb-6">
                Start a conversational intake session to collect client data naturally.
                The AI will guide you through each section and extract structured data
                from your responses.
              </p>
              <button
                onClick={startSession}
                className="px-6 py-2.5 bg-brand-700 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors flex items-center gap-2"
              >
                <Play size={16} />
                Start Data Collection
              </button>
              <div className="mt-6 grid grid-cols-2 gap-3 max-w-md">
                {[
                  { icon: <FileText size={14} />, text: 'Upload a document for AI parsing' },
                  { icon: <RotateCcw size={14} />, text: 'Resume a previous session' },
                ].map((item, i) => (
                  <button
                    key={i}
                    className="flex items-center gap-2 px-3 py-2 bg-white border border-limestone-200 rounded-lg text-xs text-charcoal-500 hover:bg-limestone-50 transition-colors"
                  >
                    {item.icon}
                    {item.text}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === 'advisor' ? 'flex-row-reverse' : ''}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      msg.role === 'ai' ? 'bg-brand-100' : 'bg-limestone-200'
                    }`}
                  >
                    {msg.role === 'ai' ? (
                      <Bot size={16} className="text-brand-700" />
                    ) : (
                      <User size={16} className="text-charcoal-500" />
                    )}
                  </div>
                  <div
                    className={`max-w-[70%] rounded-xl px-4 py-3 text-sm ${
                      msg.role === 'ai'
                        ? 'bg-white border border-limestone-200 text-charcoal-900'
                        : 'bg-brand-700 text-white'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">
                      {msg.content.split(/(\*\*.*?\*\*)/g).map((part, i) =>
                        part.startsWith('**') && part.endsWith('**') ? (
                          <strong key={i}>{part.slice(2, -2)}</strong>
                        ) : (
                          <span key={i}>{part}</span>
                        )
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Confirmation Buttons */}
              {pendingConfirmation && (
                <div className="flex gap-2 ml-11">
                  <button
                    onClick={confirmData}
                    className="px-4 py-2 bg-success-500 text-white rounded-lg text-sm font-medium hover:bg-success-700 transition-colors flex items-center gap-1.5"
                  >
                    <CheckCircle2 size={14} />
                    Confirm & Save
                  </button>
                  <button
                    onClick={() => setPendingConfirmation(null)}
                    className="px-4 py-2 bg-white border border-limestone-200 text-charcoal-700 rounded-lg text-sm hover:bg-limestone-50 transition-colors flex items-center gap-1.5"
                  >
                    <X size={14} />
                    Edit
                  </button>
                </div>
              )}

              {isProcessing && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
                    <Bot size={16} className="text-brand-700" />
                  </div>
                  <div className="bg-white border border-limestone-200 rounded-xl px-4 py-3">
                    <Loader2 size={16} className="animate-spin text-charcoal-300" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        {sessionStarted && (
          <div className="bg-white border-t px-6 py-4">
            <div className="flex gap-3">
              <button className="p-2.5 text-charcoal-300 hover:text-charcoal-500 border border-limestone-200 rounded-lg hover:bg-limestone-50 transition-colors">
                <Upload size={18} />
              </button>
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    pendingConfirmation
                      ? 'Press Enter to confirm, or type corrections...'
                      : 'Type your response...'
                  }
                  className="w-full px-4 py-2.5 border border-limestone-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-700 focus:border-transparent"
                  disabled={isProcessing}
                />
              </div>
              <button
                onClick={pendingConfirmation ? confirmData : handleSend}
                disabled={isProcessing || (!inputValue.trim() && !pendingConfirmation)}
                className="p-2.5 bg-brand-700 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel - Completion Tracker (30%) */}
      <div className="w-80 bg-white border-l flex flex-col">
        <div className="px-5 py-4 border-b">
          <h3 className="text-sm font-semibold text-charcoal-900">Plan Completion</h3>
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-charcoal-500 mb-1">
              <span>Overall Progress</span>
              <span className="font-medium text-charcoal-900">{completionScore}%</span>
            </div>
            <div className="w-full h-2.5 bg-limestone-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-700 rounded-full transition-all duration-500"
                style={{ width: `${completionScore}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {sections.map((section) => {
            const pct = section.totalFields > 0
              ? Math.round((section.completedFields / section.totalFields) * 100)
              : 0;
            const isActive = section.id === activeSection;
            const isComplete = pct === 100;

            return (
              <button
                key={section.id}
                onClick={() => {
                  setActiveSection(section.id);
                  if (sessionStarted && !isProcessing) {
                    setMessages((prev) => [
                      ...prev,
                      {
                        id: String(Date.now()),
                        role: 'ai',
                        content: `Switching to **${section.label}**.\n\n${OPENING_QUESTIONS[section.id]}`,
                        timestamp: new Date(),
                      },
                    ]);
                  }
                }}
                className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors ${
                  isActive ? 'bg-brand-50 border-r-2 border-brand-700' : 'hover:bg-limestone-50'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isComplete
                      ? 'bg-success-100 text-success-500'
                      : isActive
                      ? 'bg-brand-100 text-brand-700'
                      : 'bg-limestone-100 text-charcoal-300'
                  }`}
                >
                  {isComplete ? <CheckCircle2 size={14} /> : section.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-medium ${
                        isActive ? 'text-brand-700' : 'text-charcoal-700'
                      }`}
                    >
                      {section.label}
                    </span>
                    <span className="text-[10px] text-charcoal-300">
                      {section.completedFields}/{section.totalFields}
                    </span>
                  </div>
                  <div className="w-full h-1 bg-limestone-100 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isComplete ? 'bg-success-500' : 'bg-brand-700'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <ChevronRight size={14} className="text-charcoal-300 flex-shrink-0" />
              </button>
            );
          })}
        </div>

        {/* Document Upload Section */}
        <div className="border-t px-5 py-4">
          <h4 className="text-xs font-semibold text-charcoal-700 mb-2">Quick Upload</h4>
          <div className="border-2 border-dashed border-limestone-200 rounded-lg p-4 text-center hover:border-brand-300 transition-colors cursor-pointer">
            <Upload size={20} className="mx-auto text-charcoal-300 mb-1" />
            <p className="text-xs text-charcoal-500">
              Drop SSA statement, tax return, or investment statement
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== HELPERS ====================

function formatFieldName(field: string): string {
  return field
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getFollowUpQuestion(sectionId: string, sections: DataSection[]): string {
  const section = sections.find((s) => s.id === sectionId);
  if (!section) return "What else can you tell me?";

  const remaining = section.totalFields - section.completedFields;
  if (remaining <= 0) return "That section looks complete. Shall we move to the next topic?";

  const followUps: Record<string, string[]> = {
    client_info: [
      "What is their current employment status and employer?",
      "What state do they live in? What's their filing status?",
      "Any other details about the client?",
    ],
    co_client: [
      "What does the co-client do for work? What's their income?",
      "Any other details about the spouse/partner?",
    ],
    income: [
      "Are there any other income sources? Rental income, business distributions, investment income?",
      "Do they have any Social Security benefits or pension?",
      "Any self-employment or side income?",
    ],
    expenses: [
      "What about transportation, food, and healthcare costs?",
      "Any insurance premiums, childcare, or education expenses?",
      "Any debt payments — student loans, credit cards, auto loans?",
    ],
    accounts: [
      "Any other investment accounts? Roth IRAs, 529 plans, HSAs?",
      "Do they own real estate beyond primary residence? Any business interests?",
      "Any liabilities we haven't covered — mortgages, HELOCs, margin loans?",
    ],
    insurance: [
      "What about disability coverage? Long-term care insurance?",
      "Is the life insurance through the employer or individual?",
    ],
    goals: [
      "Any education funding goals? Legacy or charitable goals?",
      "Any major purchases or life events planned in the next few years?",
    ],
    estate: [
      "Are beneficiary designations up to date on all accounts?",
      "Is there a trust in place? Any power of attorney or healthcare proxy?",
    ],
  };

  const questions = followUps[sectionId] || ["Tell me more about this area."];
  const idx = Math.min(section.completedFields, questions.length - 1);
  return questions[idx];
}
