/**
 * Rule Evaluation Engine
 *
 * Evaluates opportunity detection rules against tax calculation outputs
 * and household context. Implements condition evaluation, scoring, and
 * opportunity generation.
 */

import type {
  OpportunityRule,
  RuleCondition,
  EvaluationContext,
  Opportunity,
  Evidence,
  CompositeScore,
  ScoringFormula,
  ComparisonOperator,
} from '@/types/opportunity-engine';

// ============================================================================
// RULE EVALUATOR
// ============================================================================

export class RuleEvaluator {
  /**
   * Evaluate a single rule against the evaluation context
   *
   * @param rule The opportunity rule to evaluate
   * @param context The evaluation context (tax output + signals + metadata)
   * @returns Opportunity if rule passes, null otherwise
   */
  evaluate(rule: OpportunityRule, context: EvaluationContext): Opportunity | null {
    // Step 1: Check eligibility conditions
    if (!this.evaluateConditions(rule.eligibility, context)) {
      return null;
    }

    // Step 2: Check trigger conditions
    if (!this.evaluateConditions(rule.triggers, context)) {
      return null;
    }

    // Step 3: Check blocking conditions (if any)
    if (rule.blocking && rule.blocking.length > 0 && this.evaluateConditions(rule.blocking, context)) {
      return null;
    }

    // Step 4: Extract evidence
    const evidence = this.extractEvidence(rule, context);

    // Step 5: Calculate composite score
    const score = this.calculateScore(rule.scoringFormula, context, evidence);

    // Step 6: Generate opportunity
    const opportunity = this.generateOpportunity(rule, context, evidence, score);

    return opportunity;
  }

  /**
   * Evaluate a set of conditions (all must pass)
   *
   * @param conditions Conditions to evaluate
   * @param context Evaluation context
   * @returns true if all conditions pass, false otherwise
   */
  private evaluateConditions(conditions: RuleCondition[], context: EvaluationContext): boolean {
    for (const condition of conditions) {
      if (!this.evaluateCondition(condition, context)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Evaluate a single condition
   *
   * @param condition Condition to evaluate
   * @param context Evaluation context
   * @returns true if condition passes, false otherwise
   */
  private evaluateCondition(condition: RuleCondition, context: EvaluationContext): boolean {
    // Resolve field value from context
    const fieldValue = this.resolveFieldValue(condition.field, context);

    // Apply operator
    return this.applyOperator(fieldValue, condition.operator, condition.value);
  }

  /**
   * Resolve a field value from the evaluation context
   *
   * Supports dot notation for nested fields:
   * - "taxOutput.summary.agi"
   * - "signals.niit.applies"
   * - "householdMetadata.clientAge"
   *
   * @param field Field path
   * @param context Evaluation context
   * @returns Resolved value
   */
  private resolveFieldValue(field: string, context: EvaluationContext): any {
    const parts = field.split('.');
    let value: any = context;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Apply comparison operator
   *
   * @param fieldValue Value from context
   * @param operator Comparison operator
   * @param conditionValue Expected value
   * @returns true if comparison passes, false otherwise
   */
  private applyOperator(
    fieldValue: any,
    operator: ComparisonOperator,
    conditionValue: any
  ): boolean {
    switch (operator) {
      case 'eq':
        return fieldValue === conditionValue;

      case 'ne':
        return fieldValue !== conditionValue;

      case 'gt':
        return typeof fieldValue === 'number' && fieldValue > conditionValue;

      case 'gte':
        return typeof fieldValue === 'number' && fieldValue >= conditionValue;

      case 'lt':
        return typeof fieldValue === 'number' && fieldValue < conditionValue;

      case 'lte':
        return typeof fieldValue === 'number' && fieldValue <= conditionValue;

      case 'between':
        if (typeof fieldValue !== 'number' || !Array.isArray(conditionValue)) {
          return false;
        }
        const [min, max] = conditionValue;
        return fieldValue >= min && fieldValue <= max;

      case 'in':
        if (!Array.isArray(conditionValue)) {
          return false;
        }
        return conditionValue.includes(fieldValue);

      case 'contains':
        if (typeof fieldValue === 'string' && typeof conditionValue === 'string') {
          return fieldValue.includes(conditionValue);
        }
        if (Array.isArray(fieldValue)) {
          return fieldValue.includes(conditionValue);
        }
        return false;

      default:
        return false;
    }
  }

  /**
   * Extract evidence for the opportunity
   *
   * Evidence comes from the rule's output template evidenceFields
   *
   * @param rule The rule
   * @param context Evaluation context
   * @returns Evidence array
   */
  private extractEvidence(rule: OpportunityRule, context: EvaluationContext): Evidence[] {
    const evidence: Evidence[] = [];

    for (const field of rule.outputTemplate.evidenceFields) {
      const value = this.resolveFieldValue(field, context);

      if (value !== undefined && value !== null) {
        evidence.push({
          type: this.inferEvidenceType(field),
          label: this.fieldToLabel(field),
          value,
          displayValue: this.formatValue(value),
          weight: 1.0, // Default weight, can be customized
          sourceField: field,
        });
      }
    }

    return evidence;
  }

  /**
   * Infer evidence type from field name
   */
  private inferEvidenceType(field: string): Evidence['type'] {
    if (field.includes('threshold') || field.includes('limit')) {
      return 'threshold';
    }
    if (field.includes('vs') || field.includes('compare')) {
      return 'comparison';
    }
    if (field.includes('trend') || field.includes('change')) {
      return 'trend';
    }
    if (field.includes('flag') || field.includes('applies')) {
      return 'flag';
    }
    return 'calculation';
  }

  /**
   * Convert field path to human-readable label
   */
  private fieldToLabel(field: string): string {
    return field
      .split('.')
      .pop()!
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }

  /**
   * Format value for display
   */
  private formatValue(value: any): string {
    if (typeof value === 'number') {
      if (value > 1000 || value < -1000) {
        // Don't add $ prefix - templates handle currency symbols
        return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
      }
      return value.toFixed(2);
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    return String(value);
  }

  /**
   * Calculate composite score
   *
   * @param formula Scoring formula from rule
   * @param context Evaluation context
   * @param evidence Extracted evidence
   * @returns Composite score
   */
  private calculateScore(
    formula: ScoringFormula,
    context: EvaluationContext,
    evidence: Evidence[]
  ): CompositeScore {
    const impactScore = this.calculateImpactScore(formula.impact, context);
    const urgencyScore = this.calculateUrgencyScore(formula.urgency, context);
    const confidenceScore = this.calculateConfidenceScore(formula.confidence, context, evidence);
    const complexityScore = this.calculateComplexityScore(formula.complexity, context);

    // Weighted composite
    const finalScore =
      impactScore * formula.weights.impact +
      urgencyScore * formula.weights.urgency +
      confidenceScore * formula.weights.confidence +
      complexityScore * formula.weights.complexity;

    return {
      impactScore,
      urgencyScore,
      confidenceScore,
      complexityScore,
      weights: formula.weights,
      finalScore: Math.round(finalScore * 100) / 100,
    };
  }

  /**
   * Calculate impact score (0-100)
   */
  private calculateImpactScore(
    formula: ScoringFormula['impact'],
    context: EvaluationContext
  ): number {
    switch (formula.type) {
      case 'direct':
        if (!formula.field) return 0;
        const directValue = this.resolveFieldValue(formula.field, context);
        return typeof directValue === 'number' ? Math.min(100, Math.max(0, directValue)) : 0;

      case 'scaled':
        if (!formula.field || !formula.scale) return 0;
        const scaledValue = this.resolveFieldValue(formula.field, context);
        if (typeof scaledValue !== 'number') return 0;
        const { min, max } = formula.scale;
        const normalized = (scaledValue - min) / (max - min);
        return Math.min(100, Math.max(0, normalized * 100));

      case 'tiered':
        if (!formula.field || !formula.tiers) return 0;
        const tieredValue = this.resolveFieldValue(formula.field, context);
        if (typeof tieredValue !== 'number') return 0;
        // Find matching tier
        for (const tier of formula.tiers.sort((a, b) => b.threshold - a.threshold)) {
          if (tieredValue >= tier.threshold) {
            return tier.score;
          }
        }
        return 0;

      case 'calculated':
        if (!formula.formula) return 0;
        try {
          // Evaluate formula (simple expression evaluation)
          // In production, use a safe expression evaluator
          return this.evaluateFormula(formula.formula, context);
        } catch {
          return 0;
        }

      default:
        return 0;
    }
  }

  /**
   * Calculate urgency score (0-100)
   */
  private calculateUrgencyScore(
    formula: ScoringFormula['urgency'],
    context: EvaluationContext
  ): number {
    switch (formula.type) {
      case 'deadline':
        if (!formula.deadline) return 50;
        const daysUntilDeadline = Math.floor(
          (formula.deadline.getTime() - context.currentDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntilDeadline < 0) return 0; // Passed
        if (daysUntilDeadline < 30) return 100; // < 1 month
        if (daysUntilDeadline < 90) return 75; // < 3 months
        if (daysUntilDeadline < 180) return 50; // < 6 months
        return 25;

      case 'seasonal':
        if (!formula.seasonalWindow) return 50;
        const currentMonth = context.currentDate.getMonth() + 1;
        const currentDay = context.currentDate.getDate();
        const [startMonth, startDay] = formula.seasonalWindow.start.split('-').map(Number);
        const [endMonth, endDay] = formula.seasonalWindow.end.split('-').map(Number);

        // Simple check if we're in the window
        const isInWindow =
          (currentMonth > startMonth ||
            (currentMonth === startMonth && currentDay >= startDay)) &&
          (currentMonth < endMonth || (currentMonth === endMonth && currentDay <= endDay));

        return isInWindow ? 100 : 25;

      case 'fixed':
        return formula.fixedScore ?? 50;

      default:
        return 50;
    }
  }

  /**
   * Calculate confidence score (0-100)
   */
  private calculateConfidenceScore(
    formula: ScoringFormula['confidence'],
    context: EvaluationContext,
    evidence: Evidence[]
  ): number {
    switch (formula.type) {
      case 'field_based':
        if (!formula.fields) return 50;
        let weightedSum = 0;
        let totalWeight = 0;
        for (const { field, weight } of formula.fields) {
          const value = this.resolveFieldValue(field, context);
          if (typeof value === 'number') {
            weightedSum += value * weight;
            totalWeight += weight;
          }
        }
        return totalWeight > 0 ? Math.min(100, (weightedSum / totalWeight) * 100) : 50;

      case 'composite':
        // Average evidence weights
        if (evidence.length === 0) return 50;
        const avgWeight = evidence.reduce((sum, e) => sum + e.weight, 0) / evidence.length;
        return avgWeight * 100;

      case 'fixed':
        return formula.fixedScore ?? 50;

      default:
        return 50;
    }
  }

  /**
   * Calculate complexity score (0-100)
   * Higher = less complex (easier to implement)
   */
  private calculateComplexityScore(
    formula: ScoringFormula['complexity'],
    context: EvaluationContext
  ): number {
    switch (formula.type) {
      case 'fixed':
        return formula.fixedScore ?? 50;

      case 'field_count':
        // Fewer fields = less complex = higher score
        const fieldCount = formula.fieldCount ?? 1;
        if (fieldCount <= 2) return 100;
        if (fieldCount <= 4) return 75;
        if (fieldCount <= 6) return 50;
        return 25;

      case 'custom':
        if (!formula.customFormula) return 50;
        try {
          return this.evaluateFormula(formula.customFormula, context);
        } catch {
          return 50;
        }

      default:
        return 50;
    }
  }

  /**
   * Evaluate a simple formula string
   * IMPORTANT: In production, use a safe expression evaluator
   */
  private evaluateFormula(formula: string, context: EvaluationContext): number {
    // Placeholder: Replace placeholders like ${field} with values
    let evaluated = formula;

    // Find all ${field} placeholders
    const matches = formula.match(/\$\{([^}]+)\}/g);
    if (matches) {
      for (const match of matches) {
        const field = match.slice(2, -1); // Remove ${ and }
        const value = this.resolveFieldValue(field, context);
        evaluated = evaluated.replace(match, String(value ?? 0));
      }
    }

    // Simple eval (UNSAFE - use safe evaluator in production)
    try {
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${evaluated})`)();
      return typeof result === 'number' ? Math.min(100, Math.max(0, result)) : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Generate opportunity from rule and evaluation results
   */
  private generateOpportunity(
    rule: OpportunityRule,
    context: EvaluationContext,
    evidence: Evidence[],
    score: CompositeScore
  ): Opportunity {
    // Interpolate title and summary templates
    const title = this.interpolateTemplate(rule.outputTemplate.titleTemplate, context);
    const summary = this.interpolateTemplate(rule.outputTemplate.summaryTemplate, context);

    // Extract estimated value
    const estimatedValue = rule.outputTemplate.estimatedValueField
      ? this.resolveFieldValue(rule.outputTemplate.estimatedValueField, context)
      : undefined;

    // Extract context fields
    const opportunityContext: Record<string, any> = {};
    for (const field of rule.outputTemplate.contextFields) {
      opportunityContext[field] = this.resolveFieldValue(field, context);
    }

    // Determine priority based on final score
    let priority: 'high' | 'medium' | 'low';
    if (score.finalScore >= 75) {
      priority = 'high';
    } else if (score.finalScore >= 50) {
      priority = 'medium';
    } else {
      priority = 'low';
    }

    // Determine confidence
    let confidence: 'high' | 'medium' | 'low';
    if (score.confidenceScore >= 80) {
      confidence = 'high';
    } else if (score.confidenceScore >= 60) {
      confidence = 'medium';
    } else {
      confidence = 'low';
    }

    return {
      id: '', // Generated by database
      detectionRunId: '', // Set by caller
      householdId: context.householdId,
      taxYear: context.taxYear,
      ruleName: rule.ruleName,
      ruleVersion: rule.ruleVersion,
      category: rule.category,
      subcategory: rule.subcategory,
      priority,
      rank: 0, // Set during ranking
      title,
      summary,
      estimatedValue: typeof estimatedValue === 'number' ? estimatedValue : undefined,
      confidence,
      evidence,
      score,
      finalScore: score.finalScore,
      context: opportunityContext,
      isDuplicate: false,
      status: 'detected',
      detectedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Interpolate template string with values from context
   * Supports ${field.path} syntax
   */
  private interpolateTemplate(template: string, context: EvaluationContext): string {
    return template.replace(/\$\{([^}]+)\}/g, (match, field) => {
      const value = this.resolveFieldValue(field, context);
      return this.formatValue(value);
    });
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const ruleEvaluator = new RuleEvaluator();
