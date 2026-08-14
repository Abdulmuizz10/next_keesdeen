"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { useAdminTheme } from "./AdminThemeProvider";

export function ThemeToggle() {
  const { theme, setTheme } = useAdminTheme();

  const cycle = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  return (
    <button
      onClick={cycle}
      className="p-2 rounded-lg hover:bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))] transition-colors"
      title={`Theme: ${theme}. Click to cycle.`}
      aria-label="Toggle theme"
    >
      {theme === "light" && <Sun size={18} />}
      {theme === "dark" && <Moon size={18} />}
      {theme === "system" && <Monitor size={18} />}
    </button>
  );
}
