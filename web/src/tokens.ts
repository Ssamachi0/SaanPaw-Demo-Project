import { colors, radius } from '@saanpaw/shared';

/**
 * Copies the shared tokens onto :root as CSS variables, so `@saanpaw/shared`
 * stays the one place colours are decided. styles.css repeats them as literals
 * only so the page is never unstyled before this runs.
 */
export function applyTokens(): void {
  const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
  const root = document.documentElement;

  for (const [name, value] of Object.entries(colors)) {
    root.style.setProperty(`--${kebab(name)}`, value);
  }
  for (const [name, value] of Object.entries(radius)) {
    if (typeof value === 'number') root.style.setProperty(`--radius-${name}`, `${value}px`);
  }
}
