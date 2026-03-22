"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

function Tabs({ tabs, activeTab, onTabChange, className }: TabsProps) {
  return (
    <div
      className={cn(
        "flex gap-0 overflow-x-auto border-b-2 border-limestone-200",
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "px-5 py-3.5 text-sm font-medium whitespace-nowrap cursor-pointer",
              "flex items-center gap-1.5 transition-all duration-150",
              "border-b-2 -mb-[2px]",
              isActive
                ? "text-brand-700 font-bold border-b-brand-700"
                : "text-charcoal-500 border-b-transparent hover:text-charcoal-900 hover:border-b-limestone-300"
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  "ml-1 text-[11px] rounded-full px-1.5 py-0.5",
                  isActive
                    ? "bg-brand-100 text-brand-700"
                    : "bg-charcoal-50 text-charcoal-500"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export { Tabs, type TabsProps, type Tab };
