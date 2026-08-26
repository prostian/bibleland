import { clsx, type ClassValue } from 'clsx';

/**
 * Klassennamen zusammensetzen. Bewusst nur clsx ohne tailwind-merge: die
 * Komponenten hier setzen Konflikte nicht über Props, sondern über Varianten,
 * daher gibt es nichts zu deduplizieren.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
