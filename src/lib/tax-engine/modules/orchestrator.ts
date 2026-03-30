/**
 * Tax Calculation Orchestrator
 *
 * Coordinates the execution of all tax calculation modules in dependency order.
 * Ensures modules run only after their dependencies are satisfied.
 *
 * Execution flow:
 * 1. Initialize CalculationContext with snapshot and rules
 * 2. Build dependency graph from all modules
 * 3. Execute modules in topological order
 * 4. Return final context with all intermediates and trace steps
 */

import type { TaxInputSnapshot, TaxRulesPackage } from '@/types/tax-engine';
import type { TaxCalculationModule, CalculationContext } from './module-interface';
import { isModuleExecuted, areDependenciesSatisfied } from './module-interface';

// Import all modules
import { FilingStatusResolverModule } from './filing-status-resolver';
import { IncomeAggregationModule } from './income-aggregation';
import { SocialSecurityTaxabilityModule } from './social-security-taxability';
import { AdjustmentsToIncomeModule } from './adjustments-to-income';
import { AGIComposerModule } from './agi-composer';
import { ItemizedDeductionsModule } from './itemized-deductions';
import { DeductionChooserModule } from './deduction-chooser';
import { QBIDeductionModule } from './qbi-deduction';
import { TaxableIncomeComposerModule } from './taxable-income-composer';
import { OrdinaryIncomeTaxModule } from './ordinary-income-tax';
import { CapitalGainsTaxModule } from './capital-gains-tax';
import { NIITModule } from './niit';
import { TotalTaxComposerModule } from './total-tax-composer';
import { TaxCreditsModule } from './tax-credits';
import { FinalTaxModule } from './final-tax';

/**
 * Registry of all available calculation modules
 */
const ALL_MODULES: TaxCalculationModule[] = [
  FilingStatusResolverModule,
  IncomeAggregationModule,
  SocialSecurityTaxabilityModule,
  AdjustmentsToIncomeModule,
  AGIComposerModule,
  ItemizedDeductionsModule,
  DeductionChooserModule,
  QBIDeductionModule,
  TaxableIncomeComposerModule,
  OrdinaryIncomeTaxModule,
  CapitalGainsTaxModule,
  NIITModule,
  TotalTaxComposerModule,
  TaxCreditsModule,
  FinalTaxModule,
];

/**
 * Result of running the tax calculation orchestrator
 */
export interface OrchestrationResult {
  context: CalculationContext;
  executionOrder: string[];
  totalComputeTimeMs: number;
}

/**
 * Run all tax calculation modules in dependency order
 *
 * @param snapshot Tax input snapshot with all taxpayer inputs
 * @param rules Tax rules package for the applicable year
 * @param modulesToRun Optional subset of modules to run (defaults to all)
 * @returns Final calculation context with all intermediates and trace steps
 */
export async function runTaxCalculation(
  snapshot: TaxInputSnapshot,
  rules: TaxRulesPackage,
  modulesToRun?: string[]
): Promise<OrchestrationResult> {
  const startTime = Date.now();

  // Initialize context
  let context: CalculationContext = {
    snapshot,
    rules,
    intermediates: {},
    warnings: snapshot.warnings || [],
    unsupportedItems: [],
    traceSteps: [],
    executedModules: [],
  };

  // Determine which modules to execute
  const modulesToExecute = modulesToRun
    ? ALL_MODULES.filter((m) => modulesToRun.includes(m.moduleName))
    : ALL_MODULES;

  if (modulesToExecute.length === 0) {
    throw new Error('No modules to execute');
  }

  // Track execution order
  const executionOrder: string[] = [];

  // Build dependency graph and execute modules in topological order
  const remainingModules = [...modulesToExecute];
  let previousRemainingCount = remainingModules.length;

  while (remainingModules.length > 0) {
    let executedThisIteration = false;

    for (let i = remainingModules.length - 1; i >= 0; i--) {
      const module = remainingModules[i];

      // Check if module has already been executed
      if (isModuleExecuted(context, module.moduleName)) {
        remainingModules.splice(i, 1);
        continue;
      }

      // Check if all dependencies are satisfied
      if (areDependenciesSatisfied(context, module.dependencies)) {
        // Execute module
        try {
          context = module.run(context);
          executionOrder.push(module.moduleName);
          executedThisIteration = true;
          remainingModules.splice(i, 1);
        } catch (error) {
          throw new Error(
            `Error executing module "${module.moduleName}": ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
    }

    // Detect circular dependencies or missing dependencies
    if (!executedThisIteration) {
      if (remainingModules.length === previousRemainingCount) {
        const unexecutedModuleNames = remainingModules.map((m) => m.moduleName);
        const missingDeps = remainingModules
          .map((m) => {
            const unsatisfied = m.dependencies.filter((dep) => !isModuleExecuted(context, dep));
            return unsatisfied.length > 0 ? `${m.moduleName}: ${unsatisfied.join(', ')}` : null;
          })
          .filter(Boolean);

        throw new Error(
          `Circular dependency or missing modules detected.\n` +
            `Unexecuted modules: ${unexecutedModuleNames.join(', ')}\n` +
            `Unsatisfied dependencies:\n${missingDeps.join('\n')}`
        );
      }
    }

    previousRemainingCount = remainingModules.length;
  }

  const totalComputeTimeMs = Date.now() - startTime;

  return {
    context,
    executionOrder,
    totalComputeTimeMs,
  };
}

/**
 * Get all available module names
 */
export function getAvailableModules(): string[] {
  return ALL_MODULES.map((m) => m.moduleName);
}

/**
 * Get module by name
 */
export function getModuleByName(moduleName: string): TaxCalculationModule | null {
  return ALL_MODULES.find((m) => m.moduleName === moduleName) || null;
}

/**
 * Get module dependencies (recursive)
 */
export function getModuleDependencies(moduleName: string, recursive = false): string[] {
  const module = getModuleByName(moduleName);
  if (!module) {
    return [];
  }

  if (!recursive) {
    return module.dependencies;
  }

  // Recursive dependency collection
  const allDeps = new Set<string>();
  const queue = [...module.dependencies];

  while (queue.length > 0) {
    const dep = queue.shift()!;
    if (!allDeps.has(dep)) {
      allDeps.add(dep);
      const depModule = getModuleByName(dep);
      if (depModule) {
        queue.push(...depModule.dependencies);
      }
    }
  }

  return Array.from(allDeps);
}

/**
 * Validate module dependencies (check for circular dependencies)
 */
export function validateModuleDependencies(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const module of ALL_MODULES) {
    const visited = new Set<string>();
    const stack = new Set<string>();

    function detectCycle(moduleName: string): boolean {
      if (stack.has(moduleName)) {
        errors.push(`Circular dependency detected involving module: ${moduleName}`);
        return true;
      }

      if (visited.has(moduleName)) {
        return false;
      }

      visited.add(moduleName);
      stack.add(moduleName);

      const mod = getModuleByName(moduleName);
      if (mod) {
        for (const dep of mod.dependencies) {
          if (detectCycle(dep)) {
            return true;
          }
        }
      }

      stack.delete(moduleName);
      return false;
    }

    detectCycle(module.moduleName);
  }

  // Check for missing dependencies
  for (const module of ALL_MODULES) {
    for (const dep of module.dependencies) {
      const depModule = getModuleByName(dep);
      if (!depModule) {
        errors.push(`Module "${module.moduleName}" depends on unknown module: "${dep}"`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
