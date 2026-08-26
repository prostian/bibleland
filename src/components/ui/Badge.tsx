import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

interface BadgeProps {
  children: ReactNode;
  /** CSS-Farbe für den Punkt links — üblicherweise eine `--bl-*`-Variable. */
  color?: string;
  variant?: 'plain' | 'outline' | 'soft';
  title?: string;
  className?: string;
}

export default function Badge({
  children,
  color,
  variant = 'outline',
  title,
  className,
}: BadgeProps) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap',
        variant === 'outline' && 'border border-line text-ink-muted',
        variant === 'soft' && 'bg-surface-2 text-ink-muted',
        variant === 'plain' && 'text-ink-subtle',
        className,
      )}
    >
      {color ? (
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
      ) : null}
      {children}
    </span>
  );
}
