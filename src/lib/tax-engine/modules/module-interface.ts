/**
 * Tax Calculation Module Interface
 *
 * All calculation modules implement this interface.
 * Modules are pure functions that take context and return updated context.
 */

import type {
  TaxInputSnapshot,
  TaxRulesPackage,
  TraceStep,
} from '@/types';

// Local types for module system (not in @/types)
export interface ValidationMessage {
  code: string;
  severity: 'info' | 'warning' | 'error' | 'soft_fail' | 'hard_fail';
  field?: string;
  message: string;
  details?: any;
}

export interface UnsupportedItem {
  code: string;
  message: string;
  impact: 'none' | 'low' | 'medium' | 'high';
  relatedFields?: string[];
}

/**
 * Calculation context passed through all modules
 */
export interface CalculationContext {
  // Input
  snapshot: TaxInputSnapshot;
  rules: TaxRulesPackage;

  // Intermediate values (accumulated by modules)
  intermediates: Record<string, any>;

  // Warnings and unsupported items
  warnings: ValidationMessage[];
  unsupportedItems: UnsupportedItem[];

  // Trace steps (one per module)
  traceSteps: TraceStep[];

  // Module execution order tracking
  executedModules: string[];
}

/**
 * Module execution result
 */
export interface ModuleResult {
  context: CalculationContext;
  stepNumber: number;
}

/**
 * Tax calculation module interface
 */
export interface TaxCalculationModule {
  /** Module name (unique identifier) */
  moduleName: string;

  /** Human-readable description */
  description: string;

  /** Dependencies (must run before this module) */
  dependencies: string[];

  /** Main execution function */
  run(context: CalculationContext): CalculationContext;
}

/**
 * Helper to create trace step
 */
export function createTraceStep(
  moduleName: string,
  stepNumber: number,
  ruleReference: string,
  inputs: Array<{ field: string; value: any; sourceFactId?: string }>,
  outputs: Record<string, any>,
  warnings: ValidationMessage[] = [],
  dependencies: string[] = [],
  notes: string[] = []
): TraceStep {
  // Convert warnings to string array
  const warningStrings = warnings.map(w => w.message);

  // Convert string dependencies to numbers if possible, otherwise empty
  const dependencyNumbers = dependencies
    .map(d => parseInt(d.replace(/^\D+/, ''), 10))
    .filter(n => !isNaN(n));

  return {
    stepNumber,
    moduleName,
    operation: ruleReference,
    inputs: inputs.reduce((acc, input) => {
      acc[input.field] = input.value;
      return acc;
    }, {} as Record<string, any>),
    formula: notes.join('; ') || ruleReference,
    result: outputs,
    warnings: warningStrings,
    dependencies: dependencyNumbers,
  };
}

/**
 * Helper to add intermediate value to context
 */
export function setIntermediate(
  context: CalculationContext,
  key: string,
  value: any
): CalculationContext {
  return {
    ...context,
    intermediates: {
      ...context.intermediates,
      [key]: value,
    },
  };
}

/**
 * Helper to get intermediate value from context
 */
export function getIntermediate<T = any>(
  context: CalculationContext,
  key: string,
  defaultValue?: T
): T {
  const value = context.intermediates[key];
  return value !== undefined ? value : (defaultValue as T);
}

/**
 * Helper to add warning to context
 */
export function addWarning(
  context: CalculationContext,
  code: string,
  severity: 'info' | 'warning' | 'soft_fail' | 'hard_fail',
  message: string,
  field?: string,
  details?: Record<string, unknown>
): CalculationContext {
  return {
    ...context,
    warnings: [
      ...context.warnings,
      {
        code,
        severity,
        field,
        message,
        details,
      },
    ],
  };
}

/**
 * Helper to add unsupported item to context
 */
export function addUnsupportedItem(
  context: CalculationContext,
  code: string,
  message: string,
  impact: 'none' | 'low' | 'medium' | 'high',
  relatedFields?: string[]
): CalculationContext {
  return {
    ...context,
    unsupportedItems: [
      ...context.unsupportedItems,
      {
        code,
        message,
        impact,
        relatedFields,
      },
    ],
  };
}

/**
 * Helper to mark module as executed
 */
export function markModuleExecuted(
  context: CalculationContext,
  moduleName: string
): CalculationContext {
  return {
    ...context,
    executedModules: [...context.executedModules, moduleName],
  };
}

/**
 * Check if module has already been executed
 */
export function isModuleExecuted(context: CalculationContext, moduleName: string): boolean {
  return context.executedModules.includes(moduleName);
}

/**
 * Check if dependencies are satisfied
 */
export function areDependenciesSatisfied(
  context: CalculationContext,
  dependencies: string[]
): boolean {
  return dependencies.every((dep) => context.executedModules.includes(dep));
}
