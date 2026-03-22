'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { PlanNav } from '@/components/prism/layouts/PlanNav';
import {
  FileBarChart, FileText, Download, Mail, Upload, Loader2,
  CheckCircle2, Clock, Eye, Trash2, Settings, Plus,
  DollarSign, TrendingUp, Shield, Heart, BarChart3,
  AlertCircle, ChevronDown, ChevronRight, Printer,
} from 'lucide-react';

// ==================== TYPES ====================
interface ReportType {
  id: string;
  name: string;
  description: string;
  pageCount: string;
  icon: React.ReactNode;
  sections: ReportSection[];
}

interface ReportSection {
  id: string;
  label: string;
  required: boolean;
}

interface GeneratedReport {
  id: string;
  type: string;
  title: string;
  generatedAt: string;
  pages: number;
  fileSize: string;
  deliveredTo?: string;
}

// ==================== CONSTANTS ====================
const REPORT_TYPES: ReportType[] = [
  {
    id: 'comprehensive',
    name: 'Comprehensive Financial Plan',
    description: 'Full plan document with all sections, charts, and recommendations. Typically 30-60 pages.',
    pageCount: '30-60 pages',
    icon: <FileText size={24} className="text-brand-700" />,
    sections: [
      { id: 'cover', label: 'Cover Page', required: true },
      { id: 'toc', label: 'Table of Contents', required: true },
      { id: 'executive', label: 'Executive Summary', required: true },
      { id: 'net_worth', label: 'Net Worth Statement', required: false },
      { id: 'cash_flow', label: 'Income & Cash Flow Analysis', required: false },
      { id: 'retirement', label: 'Retirement Projection', required: false },
      { id: 'tax', label: 'Tax Analysis', required: false },
      { id: 'ss', label: 'Social Security Analysis', required: false },
      { id: 'goals', label: 'Goal Funding Status', required: false },
      { id: 'insurance', label: 'Insurance Analysis', required: false },
      { id: 'estate', label: 'Estate Planning Summary', required: false },
      { id: 'investment', label: 'Investment Summary', required: false },
      { id: 'appendix', label: 'Appendix: Assumptions & Methodology', required: true },
      { id: 'disclosures', label: 'Disclosures', required: true },
    ],
  },
  {
    id: 'annual_review',
    name: 'Annual Review Summary',
    description: 'Year-over-year comparison with updated action items. Best for annual meetings.',
    pageCount: '5-10 pages',
    icon: <BarChart3 size={24} className="text-brand-700" />,
    sections: [
      { id: 'cover', label: 'Cover Page', required: true },
      { id: 'changes', label: 'What Changed Since Last Review', required: true },
      { id: 'success', label: 'Plan Success Rate Update', required: true },
      { id: 'accomplishments', label: 'Key Accomplishments', required: false },
      { id: 'actions', label: 'Updated Action Items', required: true },
      { id: 'disclosures', label: 'Disclosures', required: true },
    ],
  },
  {
    id: 'tax_strategy',
    name: 'Tax Strategy Report',
    description: 'Current year tax estimate with bracket visualization and Roth conversion analysis.',
    pageCount: '5 pages',
    icon: <DollarSign size={24} className="text-success-500" />,
    sections: [
      { id: 'cover', label: 'Cover Page', required: true },
      { id: 'current_year', label: 'Current Year Tax Estimate', required: true },
      { id: 'brackets', label: 'Bracket Visualization', required: true },
      { id: 'roth', label: 'Roth Conversion Recommendations', required: false },
      { id: 'irmaa', label: 'IRMAA Warnings', required: false },
      { id: 'multi_year', label: 'Multi-Year Tax Projection', required: false },
      { id: 'disclosures', label: 'Disclosures', required: true },
    ],
  },
  {
    id: 'ss_analysis',
    name: 'Social Security Analysis',
    description: 'Claiming options with break-even analysis and spousal coordination strategy.',
    pageCount: '3-5 pages',
    icon: <Shield size={24} className="text-cyan-600" />,
    sections: [
      { id: 'cover', label: 'Cover Page', required: true },
      { id: 'claiming', label: 'Claiming Options', required: true },
      { id: 'breakeven', label: 'Break-Even Analysis', required: true },
      { id: 'spousal', label: 'Spousal Coordination', required: false },
      { id: 'taxation', label: 'SS Taxation & IRMAA Impact', required: false },
      { id: 'recommendation', label: 'Recommendation', required: true },
      { id: 'disclosures', label: 'Disclosures', required: true },
    ],
  },
  {
    id: 'estate_summary',
    name: 'Estate Planning Summary',
    description: 'Estate value projection, document checklist, beneficiary review, and gifting opportunities.',
    pageCount: '5-10 pages',
    icon: <Heart size={24} className="text-brand-700" />,
    sections: [
      { id: 'cover', label: 'Cover Page', required: true },
      { id: 'value', label: 'Estate Value Estimate', required: true },
      { id: 'tax', label: 'Estate Tax Projection', required: true },
      { id: 'documents', label: 'Document Checklist', required: true },
      { id: 'beneficiaries', label: 'Beneficiary Review', required: false },
      { id: 'diagram', label: 'Estate Flow Diagram', required: false },
      { id: 'gifting', label: 'Gifting Opportunities', required: false },
      { id: 'disclosures', label: 'Disclosures', required: true },
    ],
  },
  {
    id: 'ips',
    name: 'Investment Policy Statement',
    description: 'Risk profile, objectives, allocation targets, rebalancing guidelines.',
    pageCount: '3-5 pages',
    icon: <TrendingUp size={24} className="text-warning-500" />,
    sections: [
      { id: 'cover', label: 'Cover Page', required: true },
      { id: 'risk', label: 'Risk Profile Summary', required: true },
      { id: 'objectives', label: 'Investment Objectives', required: true },
      { id: 'allocation', label: 'Asset Allocation Targets', required: true },
      { id: 'rebalancing', label: 'Rebalancing Guidelines', required: false },
      { id: 'restrictions', label: 'Restrictions & Preferences', required: false },
      { id: 'disclosures', label: 'Disclosures', required: true },
    ],
  },
];

const DEMO_REPORTS: GeneratedReport[] = [
  { id: '1', type: 'comprehensive', title: 'Comprehensive Financial Plan — Q4 2025', generatedAt: '2025-12-15T10:30:00Z', pages: 42, fileSize: '2.8 MB', deliveredTo: 'john.smith@email.com' },
  { id: '2', type: 'tax_strategy', title: '2025 Tax Strategy Report', generatedAt: '2025-10-01T14:00:00Z', pages: 6, fileSize: '1.2 MB' },
  { id: '3', type: 'annual_review', title: 'Annual Review — January 2025', generatedAt: '2025-01-15T09:00:00Z', pages: 8, fileSize: '1.5 MB', deliveredTo: 'Portal' },
];

// ==================== COMPONENT ====================
export default function ReportsPage() {
  const params = useParams();
  const planId = params.planId as string;

  const [activeTab, setActiveTab] = useState<'generate' | 'history'>('generate');
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [selectedSections, setSelectedSections] = useState<Record<string, boolean>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<'download' | 'email' | 'portal'>('download');
  const [expandedType, setExpandedType] = useState<string | null>(null);

  // Branding
  const [brandColor, setBrandColor] = useState('#3B5A69');
  const [includeDisclosures, setIncludeDisclosures] = useState(true);

  function selectReportType(typeId: string) {
    setSelectedReport(typeId);
    const reportType = REPORT_TYPES.find((r) => r.id === typeId);
    if (reportType) {
      const initial: Record<string, boolean> = {};
      reportType.sections.forEach((s) => {
        initial[s.id] = true; // Select all sections by default
      });
      setSelectedSections(initial);
    }
  }

  function toggleSection(sectionId: string, required: boolean) {
    if (required) return; // Can't deselect required sections
    setSelectedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  }

  async function generateReport() {
    setIsGenerating(true);
    // Simulate generation
    await new Promise((r) => setTimeout(r, 3000));
    setIsGenerating(false);
    setActiveTab('history');
  }

  const selectedReportType = REPORT_TYPES.find((r) => r.id === selectedReport);

  return (
    <div>
      <PlanNav planId={planId} clientName="John & Sarah Smith" planName="Comprehensive Financial Plan" />

      <div className="max-w-content mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileBarChart size={20} className="text-brand-500" />
              <h1 className="text-xl font-bold text-charcoal-900">Reports</h1>
            </div>
            <p className="text-sm text-charcoal-500">Generate branded PDF reports for client delivery.</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-limestone-100 rounded-lg p-1 w-fit">
          {(['generate', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab ? 'bg-white text-charcoal-900 shadow-sm' : 'text-charcoal-500 hover:text-charcoal-700'
              }`}
            >
              {tab === 'generate' ? 'Generate Report' : 'Report History'}
            </button>
          ))}
        </div>

        {/* Generate Report Tab */}
        {activeTab === 'generate' && !selectedReport && (
          <div className="grid grid-cols-3 gap-4">
            {REPORT_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => selectReportType(type.id)}
                className="bg-white rounded-xl border border-limestone-200 p-6 text-left hover:shadow-md hover:border-brand-200 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-limestone-50 flex items-center justify-center group-hover:bg-brand-50 transition-colors">
                    {type.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-charcoal-900">{type.name}</h3>
                    <p className="text-xs text-charcoal-300 mt-0.5">{type.pageCount}</p>
                    <p className="text-xs text-charcoal-500 mt-2 line-clamp-2">{type.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Report Configuration */}
        {activeTab === 'generate' && selectedReport && selectedReportType && (
          <div className="grid grid-cols-12 gap-6">
            {/* Left: Section Selection */}
            <div className="col-span-8">
              <div className="bg-white rounded-xl border border-limestone-200 shadow-sm">
                <div className="px-6 py-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {selectedReportType.icon}
                    <div>
                      <h2 className="text-sm font-semibold text-charcoal-900">{selectedReportType.name}</h2>
                      <p className="text-xs text-charcoal-500">{selectedReportType.pageCount}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedReport(null)}
                    className="text-xs text-charcoal-300 hover:text-charcoal-500"
                  >
                    Change Report Type
                  </button>
                </div>

                <div className="p-6">
                  <h3 className="text-xs font-semibold text-charcoal-700 uppercase tracking-wider mb-3">
                    Sections to Include
                  </h3>
                  <div className="space-y-2">
                    {selectedReportType.sections.map((section) => (
                      <label
                        key={section.id}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors cursor-pointer ${
                          selectedSections[section.id]
                            ? 'border-brand-200 bg-brand-50/50'
                            : 'border-limestone-100 bg-limestone-50'
                        } ${section.required ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedSections[section.id] || false}
                          onChange={() => toggleSection(section.id, section.required)}
                          disabled={section.required}
                          className="w-4 h-4 rounded border-limestone-300 text-brand-700 focus:ring-brand-700"
                        />
                        <span className="text-sm text-charcoal-700">{section.label}</span>
                        {section.required && (
                          <span className="text-[10px] text-charcoal-300 bg-limestone-200 px-1.5 py-0.5 rounded">Required</span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Options + Generate */}
            <div className="col-span-4 space-y-4">
              {/* Branding */}
              <div className="bg-white rounded-xl border border-limestone-200 shadow-sm p-5">
                <h3 className="text-xs font-semibold text-charcoal-700 uppercase tracking-wider mb-3">Branding</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-charcoal-500 block mb-1">Primary Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={brandColor}
                        onChange={(e) => setBrandColor(e.target.value)}
                        className="w-8 h-8 rounded border border-limestone-200 cursor-pointer"
                      />
                      <span className="text-xs text-charcoal-500 font-mono">{brandColor}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-charcoal-500 block mb-1">Firm Logo</label>
                    <div className="border-2 border-dashed border-limestone-200 rounded-lg p-3 text-center text-xs text-charcoal-300 cursor-pointer hover:border-limestone-300">
                      <Upload size={14} className="mx-auto mb-1" />
                      Upload logo
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeDisclosures}
                      onChange={(e) => setIncludeDisclosures(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-limestone-300 text-brand-700"
                    />
                    <span className="text-xs text-charcoal-500">Include compliance disclosures</span>
                  </label>
                </div>
              </div>

              {/* Delivery */}
              <div className="bg-white rounded-xl border border-limestone-200 shadow-sm p-5">
                <h3 className="text-xs font-semibold text-charcoal-700 uppercase tracking-wider mb-3">Delivery</h3>
                <div className="space-y-2">
                  {[
                    { id: 'download' as const, icon: <Download size={14} />, label: 'Download PDF' },
                    { id: 'email' as const, icon: <Mail size={14} />, label: 'Email to Client' },
                    { id: 'portal' as const, icon: <Upload size={14} />, label: 'Upload to Client Portal' },
                  ].map((method) => (
                    <label
                      key={method.id}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                        deliveryMethod === method.id
                          ? 'border-brand-300 bg-brand-50'
                          : 'border-limestone-100 hover:bg-limestone-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="delivery"
                        checked={deliveryMethod === method.id}
                        onChange={() => setDeliveryMethod(method.id)}
                        className="w-3.5 h-3.5 text-brand-700"
                      />
                      <span className="text-charcoal-500">{method.icon}</span>
                      <span className="text-xs text-charcoal-700">{method.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={generateReport}
                disabled={isGenerating}
                className="w-full px-4 py-3 bg-brand-700 text-white rounded-xl text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Generating Report...
                  </>
                ) : (
                  <>
                    <Printer size={16} />
                    Generate Report
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Report History Tab */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-xl border border-limestone-200 shadow-sm">
            <div className="px-6 py-4 border-b">
              <h2 className="text-sm font-semibold text-charcoal-900">Generated Reports</h2>
            </div>
            <div className="divide-y divide-limestone-100">
              {DEMO_REPORTS.map((report) => {
                const type = REPORT_TYPES.find((t) => t.id === report.type);
                return (
                  <div key={report.id} className="px-6 py-4 flex items-center gap-4 hover:bg-limestone-50 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-limestone-50 flex items-center justify-center">
                      {type?.icon || <FileText size={20} className="text-charcoal-300" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-charcoal-900">{report.title}</h4>
                      <p className="text-xs text-charcoal-500">
                        {new Date(report.generatedAt).toLocaleDateString()} · {report.pages} pages · {report.fileSize}
                        {report.deliveredTo && ` · Sent to ${report.deliveredTo}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-charcoal-300 hover:text-charcoal-500 rounded-lg hover:bg-limestone-100 transition-colors" title="Preview">
                        <Eye size={16} />
                      </button>
                      <button className="p-2 text-charcoal-300 hover:text-charcoal-500 rounded-lg hover:bg-limestone-100 transition-colors" title="Download">
                        <Download size={16} />
                      </button>
                      <button className="p-2 text-charcoal-300 hover:text-charcoal-500 rounded-lg hover:bg-limestone-100 transition-colors" title="Email">
                        <Mail size={16} />
                      </button>
                      <button className="p-2 text-charcoal-300 hover:text-critical-500 rounded-lg hover:bg-critical-50 transition-colors" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {DEMO_REPORTS.length === 0 && (
                <div className="px-6 py-16 text-center">
                  <FileText size={32} className="mx-auto text-charcoal-300 mb-3" />
                  <p className="text-sm text-charcoal-500">No reports generated yet.</p>
                  <button
                    onClick={() => setActiveTab('generate')}
                    className="mt-3 text-sm text-brand-700 hover:text-brand-700 font-medium"
                  >
                    Generate your first report
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
