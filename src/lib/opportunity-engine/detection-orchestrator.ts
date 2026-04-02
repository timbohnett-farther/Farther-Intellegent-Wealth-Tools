/**
 * Opportunity Detection Orchestrator
 *
 * Main entry point for running opportunity detection. Orchestrates the complete
 * pipeline: load tax calculation → build context → evaluate rules → rank →
 * deduplicate → save results.
 */

import { prisma } from '@/lib/prisma';
import type {
  DetectOpportunitiesRequest,
  DetectOpportunitiesResponse,
  EvaluationContext,
  Opportunity,
  RecommendationSignals,
  RankingCriteria,
} from '@/types/opportunity-engine';
import type { TaxOutput } from '@/types/tax-engine';
import { ruleEvaluator } from './rule-evaluator';
import { OPPORTUNITY_RULE_PACKAGE_2025_V1 } from './rules';

// ============================================================================
// ORCHESTRATOR
// ============================================================================

export class OpportunityDetectionOrchestrator {
  /**
   * Run opportunity detection for a calculation run
   *
   * @param request Detection request
   * @returns Detection response with opportunities
   */
  async detectOpportunities(
    request: DetectOpportunitiesRequest
  ): Promise<DetectOpportunitiesResponse> {
    const startTime = Date.now();

    // Step 1: Load calculation run and validate
    const calculationRun = await this.loadCalculationRun(request.calculationRunId);

    // Step 2: Load tax output snapshot
    const taxOutput = await this.loadTaxOutput(calculationRun.outputSnapshotId);

    // Step 3: Load recommendation signals
    const signals = await this.loadRecommendationSignals(calculationRun.id);

    // Step 4: Load household metadata
    const householdMetadata = await this.loadHouseholdMetadata(calculationRun.householdId);

    // Step 5: Build evaluation context
    const context: EvaluationContext = {
      taxOutput,
      householdId: calculationRun.householdId,
      taxYear: calculationRun.taxYear,
      currentDate: new Date(),
      signals,
      householdMetadata,
    };

    // Step 6: Load rule package
    const rulesVersion = request.rulesVersion ?? OPPORTUNITY_RULE_PACKAGE_2025_V1.packageVersion;
    const rulePackage =
      rulesVersion === OPPORTUNITY_RULE_PACKAGE_2025_V1.packageVersion
        ? OPPORTUNITY_RULE_PACKAGE_2025_V1
        : await this.loadRulePackage(rulesVersion);

    // Step 7: Evaluate all active rules
    const opportunities: Opportunity[] = [];
    let totalRulesEvaluated = 0;
    let totalRulesPassed = 0;

    for (const rule of rulePackage.rules.filter((r: any) => r.isActive)) {
      totalRulesEvaluated++;

      try {
        const opportunity = ruleEvaluator.evaluate(rule, context);

        if (opportunity) {
          opportunities.push(opportunity);
          totalRulesPassed++;
        }
      } catch (error) {
        console.error(`Error evaluating rule ${rule.ruleName}:`, error);
        // Continue with other rules
      }
    }

    // Step 8: Rank opportunities
    const rankedOpportunities = this.rankOpportunities(opportunities, {
      sortBy: [
        { field: 'finalScore', direction: 'desc' },
        { field: 'estimatedValue', direction: 'desc' },
      ],
    });

    // Step 9: Deduplicate
    const deduplicatedOpportunities = this.deduplicateOpportunities(rankedOpportunities);

    // Step 10: Apply filters from request
    let filteredOpportunities = deduplicatedOpportunities;
    if (request.options?.minPriority) {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const minLevel = priorityOrder[request.options.minPriority];
      filteredOpportunities = filteredOpportunities.filter(
        (opp) => priorityOrder[opp.priority] >= minLevel
      );
    }
    if (request.options?.maxOpportunities) {
      filteredOpportunities = filteredOpportunities.slice(0, request.options.maxOpportunities);
    }

    // Step 11: Save detection run to database
    const detectionRun = await this.saveDetectionRun({
      calculationRunId: request.calculationRunId,
      householdId: calculationRun.householdId,
      taxYear: calculationRun.taxYear,
      rulesVersion,
      totalRulesEvaluated,
      totalRulesPassed,
      opportunities: filteredOpportunities,
      computeTimeMs: Date.now() - startTime,
    });

    // Step 12: Optionally generate AI summaries
    if (request.options?.includeAiEnhancement) {
      // TODO: Implement AI summary generation
      // This would call Claude API to generate enhanced summaries
    }

    // Step 13: Build response
    const highPriorityCount = filteredOpportunities.filter((opp) => opp.priority === 'high')
      .length;
    const estimatedValueTotal = filteredOpportunities.reduce(
      (sum, opp) => sum + (opp.estimatedValue ?? 0),
      0
    );

    return {
      detectionRunId: detectionRun.id,
      opportunitiesDetected: filteredOpportunities.length,
      highPriorityCount,
      estimatedValueTotal: estimatedValueTotal > 0 ? estimatedValueTotal : undefined,
      computeTimeMs: Date.now() - startTime,
      opportunities: filteredOpportunities,
    };
  }

  /**
   * Load calculation run from database
   */
  private async loadCalculationRun(calculationRunId: string) {
    const run = await (prisma as any).calculationRun.findUnique({
      where: { id: calculationRunId },
      include: {
        outputSnapshot: true,
        recommendationSignals: true,
      },
    });

    if (!run) {
      throw new Error(`Calculation run not found: ${calculationRunId}`);
    }

    if (run.runType !== 'baseline') {
      throw new Error('Opportunity detection only runs on baseline calculations');
    }

    return run;
  }

  /**
   * Load tax output snapshot and parse to TaxOutput interface
   */
  private async loadTaxOutput(outputSnapshotId: string): Promise<TaxOutput> {
    const snapshot = await (prisma as any).taxOutputSnapshot.findUnique({
      where: { id: outputSnapshotId },
    });

    if (!snapshot) {
      throw new Error(`Tax output snapshot not found: ${outputSnapshotId}`);
    }

    // Parse JSON fields
    return {
      summary: JSON.parse(snapshot.summaryJson),
      incomeBreakdown: JSON.parse(snapshot.incomeBreakdownJson),
      deductionBreakdown: JSON.parse(snapshot.deductionBreakdownJson),
      taxCalculation: JSON.parse(snapshot.taxCalculationJson),
      credits: JSON.parse(snapshot.creditsJson),
      payments: JSON.parse(snapshot.paymentsJson),
      warnings: snapshot.warnings ? JSON.parse(snapshot.warnings) : [],
    } as TaxOutput;
  }

  /**
   * Load recommendation signals
   */
  private async loadRecommendationSignals(runId: string): Promise<RecommendationSignals> {
    const signals = await (prisma as any).recommendationSignals.findUnique({
      where: { runId },
    });

    if (!signals) {
      throw new Error(`Recommendation signals not found for run: ${runId}`);
    }

    return JSON.parse(signals.signalsJson);
  }

  /**
   * Load household metadata
   */
  private async loadHouseholdMetadata(householdId: string) {
    const household = await (prisma as any).household.findUnique({
      where: { id: householdId },
      include: {
        clients: true,
        plans: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            retirementAccounts: true,
            taxableAccounts: true,
          },
        },
      },
    });

    if (!household) {
      throw new Error(`Household not found: ${householdId}`);
    }

    // Extract metadata
    const primaryClient = household.clients.find((c: any) => c.role === 'primary');
    const spouse = household.clients.find((c: any) => c.role === 'spouse');
    const latestPlan = household.plans[0];

    return {
      clientAge: primaryClient?.dateOfBirth
        ? this.calculateAge(primaryClient.dateOfBirth)
        : undefined,
      spouseAge: spouse?.dateOfBirth ? this.calculateAge(spouse.dateOfBirth) : undefined,
      hasRetirementAccounts: latestPlan ? latestPlan.retirementAccounts.length > 0 : undefined,
      hasTaxableAccounts: latestPlan ? latestPlan.taxableAccounts.length > 0 : undefined,
      stateOfResidence: primaryClient?.state ?? undefined,
    };
  }

  /**
   * Calculate age from date of birth
   */
  private calculateAge(dob: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  }

  /**
   * Load rule package from database
   */
  private async loadRulePackage(rulesVersion: string) {
    const rulePackage = await (prisma as any).opportunityRule.findMany({
      where: {
        ruleVersion: rulesVersion,
        isActive: true,
      },
      orderBy: { priority: 'desc' },
    });

    if (rulePackage.length === 0) {
      throw new Error(`No active rules found for version: ${rulesVersion}`);
    }

    // Parse rule definitions
    return {
      packageVersion: rulesVersion,
      taxYear: 2025, // TODO: Extract from rules
      rules: rulePackage.map((r: any) => JSON.parse(r.ruleDefinitionJson)),
      publishedAt: rulePackage[0].publishedAt,
      publishedBy: rulePackage[0].createdBy,
    };
  }

  /**
   * Rank opportunities by composite score and other criteria
   */
  private rankOpportunities(
    opportunities: Opportunity[],
    criteria: RankingCriteria
  ): Opportunity[] {
    // Sort by criteria
    const sorted = [...opportunities].sort((a, b) => {
      for (const sort of criteria.sortBy) {
        const aValue = (a as any)[sort.field] ?? 0;
        const bValue = (b as any)[sort.field] ?? 0;

        if (aValue !== bValue) {
          return sort.direction === 'desc' ? (bValue as number) - (aValue as number) : (aValue as number) - (bValue as number);
        }
      }
      return 0;
    });

    // Assign rank
    return sorted.map((opp, index) => ({
      ...opp,
      rank: index + 1,
    }));
  }

  /**
   * Deduplicate opportunities
   *
   * If multiple opportunities of the same category are detected,
   * keep only the highest-ranked one and mark others as duplicates.
   */
  private deduplicateOpportunities(opportunities: Opportunity[]): Opportunity[] {
    const seen = new Map<string, Opportunity>();
    const result: Opportunity[] = [];

    for (const opp of opportunities) {
      const key = opp.category;

      if (!seen.has(key)) {
        // First occurrence - keep it
        seen.set(key, opp);
        result.push(opp);
      } else {
        // Duplicate - mark and link to original
        const original = seen.get(key)!;
        result.push({
          ...opp,
          isDuplicate: true,
          duplicateOfId: original.id,
          suppressionReason: `Duplicate of higher-ranked ${original.category} opportunity`,
        });
      }
    }

    return result;
  }

  /**
   * Save detection run and opportunities to database
   */
  private async saveDetectionRun(data: {
    calculationRunId: string;
    householdId: string;
    taxYear: number;
    rulesVersion: string;
    totalRulesEvaluated: number;
    totalRulesPassed: number;
    opportunities: Opportunity[];
    computeTimeMs: number;
  }) {
    // Create detection run
    const detectionRun = await (prisma as any).opportunityDetectionRun.create({
      data: {
        calculationRunId: data.calculationRunId,
        householdId: data.householdId,
        taxYear: data.taxYear,
        rulesVersion: data.rulesVersion,
        totalRulesEvaluated: data.totalRulesEvaluated,
        totalRulesPassed: data.totalRulesPassed,
        opportunitiesDetected: data.opportunities.length,
        highPriorityCount: data.opportunities.filter((o: any) => o.priority === 'high').length,
        estimatedValueTotal: data.opportunities.reduce(
          (sum: number, o: any) => sum + (o.estimatedValue ?? 0),
          0
        ),
        computeTimeMs: data.computeTimeMs,
        status: 'completed',
      },
    });

    // Create opportunities
    for (const opp of data.opportunities) {
      await (prisma as any).opportunity.create({
        data: {
          detectionRunId: detectionRun.id,
          householdId: data.householdId,
          taxYear: data.taxYear,
          ruleName: opp.ruleName,
          ruleVersion: opp.ruleVersion,
          category: opp.category,
          subcategory: opp.subcategory,
          priority: opp.priority,
          rank: opp.rank,
          title: opp.title,
          summary: opp.summary,
          estimatedValue: opp.estimatedValue,
          confidence: opp.confidence,
          evidenceJson: JSON.stringify(opp.evidence),
          scoreJson: JSON.stringify(opp.score),
          finalScore: opp.finalScore,
          contextJson: JSON.stringify(opp.context),
          isDuplicate: opp.isDuplicate,
          duplicateOfId: opp.duplicateOfId,
          suppressionReason: opp.suppressionReason,
          status: 'detected',
        },
      });
    }

    // Create audit event
    await (prisma as any).opportunityAuditEvent.create({
      data: {
        eventId: `detection_run_${detectionRun.id}_${Date.now()}`,
        eventType: 'detection_run.completed',
        detectionRunId: detectionRun.id,
        payloadJson: JSON.stringify({
          householdId: data.householdId,
          taxYear: data.taxYear,
          opportunitiesDetected: data.opportunities.length,
          highPriorityCount: data.opportunities.filter((o) => o.priority === 'high').length,
          computeTimeMs: data.computeTimeMs,
        }),
        source: 'opportunity-engine',
      },
    });

    return detectionRun;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const opportunityDetectionOrchestrator = new OpportunityDetectionOrchestrator();
