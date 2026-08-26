import { useThemeStore, type ThemeMode } from '@/store/useThemeStore';
import { cn } from '@/lib/cn';

const OPTIONS: { mode: ThemeMode; label: string; icon: React.ReactNode }[] = [
  {
    mode: 'light',
    label: 'Hell',
    icon: (
      <>
        <circle cx="8" cy="8" r="3.2" />
        <path d="M8 1v1.6M8 13.4V15M15 8h-1.6M2.6 8H1M12.9 3.1l-1.1 1.1M4.2 11.8l-1.1 1.1M12.9 12.9l-1.1-1.1M4.2 4.2L3.1 3.1" />
      </>
    ),
  },
  {
    mode: 'system',
    label: 'System',
    icon: (
      <>
        <rect x="1.8" y="2.5" width="12.4" height="8.5" rx="1.2" />
        <path d="M5.5 13.5h5" />
      </>
    ),
  },
  {
    mode: 'dark',
    label: 'Dunkel',
    icon: <path d="M13.2 9.6A5.8 5.8 0 016.4 2.8a5.8 5.8 0 106.8 6.8z" />,
  },
];

/** Drei Zustände statt zwei: „System" ist eine eigene Wahl, kein Startwert. */
export default function ThemeToggle() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  return (
    <div
      role="radiogroup"
      aria-label="Farbschema"
      className="flex rounded-lg border border-line bg-surface p-0.5"
    >
      {OPTIONS.map((option) => (
        <button
          key={option.mode}
          type="button"
          role="radio"
          aria-checked={mode === option.mode}
          title={option.label}
          onClick={() => setMode(option.mode)}
          className={cn(
            'grid size-6 place-items-center rounded-md transition-colors',
            mode === option.mode
              ? 'bg-surface-3 text-ink'
              : 'text-ink-subtle hover:text-ink-muted',
          )}
        >
          <svg
            viewBox="0 0 16 16"
            className="size-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {option.icon}
          </svg>
          <span className="sr-only">{option.label}</span>
        </button>
      ))}
    </div>
  );
}
