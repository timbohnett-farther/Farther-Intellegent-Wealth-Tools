"use client";

import { RiSunLine, RiMoonLine } from "@remixicon/react";
import { useTheme } from "@/lib/theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-2 w-full px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white/90 hover:bg-gray-100 dark:hover:bg-white/5"
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? (
        <>
          <RiSunLine className="w-5 h-5" />
          <span>Light Mode</span>
        </>
      ) : (
        <>
          <RiMoonLine className="w-5 h-5" />
          <span>Dark Mode</span>
        </>
      )}
    </button>
  );
}
