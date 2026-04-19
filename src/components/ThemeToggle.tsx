'use client';

import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('mrpres.theme.v1', next ? 'dark' : 'light');
    } catch { /* storage unavailable */ }
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm px-2 py-1 rounded transition-colors"
    >
      {dark ? '☀' : '☽'}
    </button>
  );
}
