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
        "flex gap-0 overflow-x-auto border-b-2 border-border-subtle",
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
                ? "text-accent-primarySoft font-bold border-b-brand-500"
                : "text-text-muted border-b-transparent hover:text-text hover:border-b-white/20"
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  "ml-1 text-[11px] rounded-full px-1.5 py-0.5",
                  isActive
                    ? "bg-accent-primary/20 text-accent-primarySoft"
                    : "bg-surface-soft text-text-muted"
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
