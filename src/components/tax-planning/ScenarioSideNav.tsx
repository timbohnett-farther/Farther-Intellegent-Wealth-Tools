'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';
import { Star, Plus } from 'lucide-react';

export interface ScenarioSideNavProps {
  /** List of scenarios to display */
  scenarios: Array<{
    scenarioId: string;
    name: string;
    isBaseline: boolean;
  }>;
  /** ID of the currently active scenario */
  activeScenarioId: string;
  /** Callback when a scenario is selected */
  onSelect: (scenarioId: string) => void;
  /** Callback to create a new scenario */
  onCreateNew: () => void;
}

export const ScenarioSideNav: React.FC<ScenarioSideNavProps> = ({
  scenarios,
  activeScenarioId,
  onSelect,
  onCreateNew,
}) => {
  return (
    <nav className="flex flex-col w-full" aria-label="Scenario navigation">
      <div className="mb-2 px-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-white/50">
          Scenarios
        </h3>
      </div>

      {/* Scenario list */}
      <ul className="flex-1 space-y-0.5">
        {scenarios.map((scenario) => {
          const isActive = scenario.scenarioId === activeScenarioId;

          return (
            <li key={scenario.scenarioId}>
              <button
                type="button"
                onClick={() => onSelect(scenario.scenarioId)}
                className={cn(
                  'flex items-center gap-2 w-full px-3 py-2.5 text-sm rounded-r-lg transition-colors text-left',
                  isActive
                    ? 'border-l-[3px] border-teal-500 bg-teal-500/10 text-teal-300 font-semibold pl-[9px]'
                    : 'border-l-[3px] border-transparent text-white/60 hover:bg-white/[0.04] hover:text-white pl-[9px]'
                )}
              >
                {scenario.isBaseline && (
                  <Star
                    className={cn(
                      'h-4 w-4 flex-shrink-0',
                      isActive ? 'text-teal-300 fill-brand-700' : 'text-warning-500 fill-warning-500'
                    )}
                  />
                )}
                <span className="truncate">{scenario.name}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* New Scenario button */}
      <div className="mt-3 px-3 pt-3 border-t border-white/[0.06]">
        <button
          type="button"
          onClick={onCreateNew}
          className="inline-flex items-center gap-2 w-full h-9 px-3 rounded-lg border-[1.5px] border-dashed border-white/[0.10] text-sm font-medium text-white/60 hover:border-brand-500 hover:text-teal-300 hover:bg-teal-500/10/30 transition-colors justify-center"
        >
          <Plus className="h-4 w-4" />
          New Scenario
        </button>
      </div>
    </nav>
  );
};

ScenarioSideNav.displayName = 'ScenarioSideNav';
