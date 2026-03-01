/**
 * Farther Portfolio Proposal Engine -- UI Components
 *
 * Barrel export for all proposal engine components.
 *
 * @module proposal-engine/components
 */

// Utility / shared components
export { AllocationBar } from './AllocationBar';
export type { AllocationBarProps } from './AllocationBar';

export { RiskScoreGauge } from './RiskScoreGauge';
export type { RiskScoreGaugeProps } from './RiskScoreGauge';

export { ProposalStatusBadge } from './ProposalStatusBadge';
export type { ProposalStatusBadgeProps } from './ProposalStatusBadge';

export { QualityFlagsList } from './QualityFlagsList';
export type { QualityFlagsListProps } from './QualityFlagsList';

export { ConversionFunnel } from './ConversionFunnel';
export type { ConversionFunnelProps } from './ConversionFunnel';

// Wizard / navigation
export { WizardProgress } from './WizardProgress';
export type { WizardProgressProps } from './WizardProgress';

// Step 1: Client & Context
export { ContextForm } from './ContextForm';
export type { ContextFormProps } from './ContextForm';

// Step 2: Portfolio Capture
export { StatementUploader } from './StatementUploader';
export type { StatementUploaderProps } from './StatementUploader';

export { HoldingsReviewTable } from './HoldingsReviewTable';
export type { HoldingsReviewTableProps } from './HoldingsReviewTable';

export { PortfolioSummary } from './PortfolioSummary';
export type { PortfolioSummaryProps } from './PortfolioSummary';

// Step 3: Risk Assessment
export { RiskQuestionnaire } from './RiskQuestionnaire';
export type { RiskQuestionnaireProps } from './RiskQuestionnaire';

export { RiskProfileDisplay } from './RiskProfileDisplay';
export type { RiskProfileDisplayProps } from './RiskProfileDisplay';

// Step 4: Proposed Portfolio
export { ModelCard } from './ModelCard';
export type { ModelCardProps } from './ModelCard';

export { ModelLibrary } from './ModelLibrary';
export type { ModelLibraryProps } from './ModelLibrary';

// Step 5: Analysis
export { SideBySideComparison } from './SideBySideComparison';
export type { SideBySideComparisonProps } from './SideBySideComparison';

export { StressTestPanel } from './StressTestPanel';
export type { StressTestPanelProps } from './StressTestPanel';

export { FeeComparisonChart } from './FeeComparisonChart';
export type { FeeComparisonChartProps } from './FeeComparisonChart';

export { TaxTransitionPanel } from './TaxTransitionPanel';
export type { TaxTransitionPanelProps } from './TaxTransitionPanel';

// Step 6: Generate
export { SectionBuilder } from './SectionBuilder';
export type { SectionBuilderProps } from './SectionBuilder';

// Dashboard
export { ProposalDashboard } from './ProposalDashboard';
export type { ProposalDashboardProps } from './ProposalDashboard';
