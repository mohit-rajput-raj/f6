"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@repo/ui/components/ui/button";

export { useTheme };

export function ThemeToggleButton({ className }: { className?: string } = {}) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={`size-8 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100/50 dark:bg-neutral-800/50 flex items-center justify-center opacity-70 ${className || ""}`}
        aria-hidden="true"
      >
        <span className="size-4" />
      </div>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="outline"
      size="icon"
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`size-8 rounded-lg border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 transition-colors cursor-pointer relative shadow-2xs ${className || ""}`}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-neutral-300" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

export const ModeToggle = ThemeToggleButton;


