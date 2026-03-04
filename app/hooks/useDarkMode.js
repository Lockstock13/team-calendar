import { useState, useEffect } from "react";

/**
 * Dark mode hook with localStorage persistence.
 * Toggles the `dark` class on <html> so Tailwind's `dark:` variants work.
 *
 * @returns {[boolean, () => void]} [isDark, toggleDark]
 */
export function useDarkMode() {
  const [isDark, setIsDark] = useState(false);

  // On mount: read preference from localStorage (or system preference)
  useEffect(() => {
    const stored = localStorage.getItem("theme");

    if (stored === "dark") {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    } else if (stored === "light") {
      setIsDark(false);
      document.documentElement.classList.remove("dark");
    } else {
      // No preference stored — follow system
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      setIsDark(prefersDark);
      if (prefersDark) {
        document.documentElement.classList.add("dark");
      }
    }
  }, []);

  const toggleDark = () => {
    setIsDark((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");
      }
      return next;
    });
  };

  return [isDark, toggleDark];
}
