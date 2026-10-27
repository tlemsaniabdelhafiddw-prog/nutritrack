import Image from 'next/image';
import { cn } from '@/lib/cn';

/** Wordmark from the brand file, trimmed. */
export function Logo({ className, priority }: { className?: string; priority?: boolean }) {
  return <Image src="/brand/logo.png" alt="NutriTrack" width={894} height={211} priority={priority} className={cn('h-7 w-auto', className)} />;
}

/** Square mark for the favicon and compact spots: leaf over a rose disc. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn('h-8 w-8', className)} aria-hidden>
      <circle cx="20" cy="22" r="16" fill="#E16D83" />
      <path d="M13 26c5-6 10-8 15-9-3 4-8 7-15 9z" fill="#F7A3A6" />
      <path d="M21 13c0-5 3-8 9-8 0 5-3 8-9 8z" fill="#88AF79" />
    </svg>
  );
}
