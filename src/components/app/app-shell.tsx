import type { ReactNode } from 'react';
import { BottomNav, MobileTopBar, SideNav } from './nav';

export function AppShell({ children, signedIn }: { children: ReactNode; signedIn: boolean }) {
  return (
    <div className="flex min-h-dvh">
      <SideNav signedIn={signedIn} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar signedIn={signedIn} />
        <main id="content" className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-32 sm:px-6 lg:px-10 lg:pt-10 lg:pb-16">
          {children}
        </main>
      </div>
      {signedIn && <BottomNav />}
    </div>
  );
}
