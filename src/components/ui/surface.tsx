import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-[var(--radius-card)] border border-line bg-paper shadow-soft', className)} {...rest} />;
}

export function SectionTitle({ children, action, id, className }: { children: ReactNode; action?: ReactNode; id?: string; className?: string }) {
  return (
    <div className={cn('mb-3 flex items-end justify-between gap-3', className)}>
      <h2 id={id} className="font-display text-lg font-semibold tracking-tight text-ink">
        {children}
      </h2>
      {action}
    </div>
  );
}

export function PageHeader({ title, lead, action }: { title: ReactNode; lead?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <h1 className="font-display text-[1.85rem] leading-tight font-semibold tracking-tight text-ink sm:text-[2.15rem]">{title}</h1>
        {lead && <p className="mt-1.5 text-ink-soft">{lead}</p>}
      </div>
      {action}
    </header>
  );
}

export function Badge({ tone = 'neutral', children, className }: { tone?: 'neutral' | 'rose' | 'leaf' | 'wheat' | 'danger'; children: ReactNode; className?: string }) {
  const tones = {
    neutral: 'bg-blush-deep text-ink-soft',
    rose: 'bg-rose-soft text-rose-ink',
    leaf: 'bg-leaf-soft text-leaf-ink',
    wheat: 'bg-wheat-soft text-wheat-ink',
    danger: 'bg-danger-soft text-danger',
  };
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', tones[tone], className)}>{children}</span>;
}

export function EmptyState({ icon, title, body, action, className }: { icon?: ReactNode; title: ReactNode; body?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center gap-2 rounded-[var(--radius-card)] border border-dashed border-line-strong px-6 py-10 text-center', className)}>
      {icon && <div className="mb-1 text-rose">{icon}</div>}
      <p className="font-medium text-ink">{title}</p>
      {body && <p className="max-w-sm text-sm text-ink-soft">{body}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('skeleton rounded-xl', className)} />;
}

export function Notice({ tone = 'info', icon, children, className }: { tone?: 'info' | 'warn' | 'error' | 'success'; icon?: ReactNode; children: ReactNode; className?: string }) {
  const tones = {
    info: 'bg-blush-deep text-ink border-line',
    warn: 'bg-wheat-soft text-wheat-ink border-wheat/40',
    error: 'bg-danger-soft text-danger border-danger/30',
    success: 'bg-leaf-soft text-leaf-ink border-leaf/40',
  };
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cn('flex gap-2.5 rounded-2xl border px-4 py-3 text-sm', tones[tone], className)}>
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="min-w-0">{children}</div>
    </div>
  );
}
