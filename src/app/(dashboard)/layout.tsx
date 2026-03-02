'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Overview', exact: true },
  { href: '/dashboard/usage', label: 'Usage', exact: false },
  { href: '/dashboard/api-keys', label: 'API Keys', exact: false },
  { href: '/dashboard/billing', label: 'Billing', exact: false },
  { href: '/dashboard/settings', label: 'Settings', exact: false },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [profileOpen, setProfileOpen] = useState(false);

  const userInitial = session?.user?.name?.[0] ?? session?.user?.email?.[0] ?? 'U';
  const userName = session?.user?.name ?? session?.user?.email ?? 'User';

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa]">
      {/* Topbar */}
      <header className="sticky top-0 z-40 border-b border-[#2d2d35] bg-[#09090b]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 h-[52px]">
          <Link href="/dashboard" className="font-['Syne',sans-serif] text-base font-bold">
            Ship<span className="text-[#22d3ee]">Kit</span>
          </Link>
          <div className="flex items-center gap-4">
            <a href="/docs" className="text-xs text-[#71717a] hover:text-[#a1a1aa] transition-colors">
              Docs
            </a>
            {/* Profile button */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 rounded-md border border-[#2d2d35] bg-[#111114] px-3 py-1.5 text-xs text-[#a1a1aa] hover:border-[#52525b] hover:text-[#fafafa] transition-colors"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#22d3ee] text-[10px] font-bold text-[#09090b] uppercase">
                  {userInitial}
                </span>
                <span className="max-w-[120px] truncate">{userName}</span>
                <svg className={`h-3 w-3 transition-transform ${profileOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 rounded-md border border-[#2d2d35] bg-[#111114] py-1 shadow-xl z-50">
                  <div className="px-3 py-2 border-b border-[#2d2d35]">
                    <p className="text-xs font-medium text-[#fafafa] truncate">{userName}</p>
                    <p className="text-[11px] text-[#71717a] truncate">{session?.user?.email}</p>
                  </div>
                  <Link
                    href="/dashboard/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center px-3 py-2 text-xs text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#1e1e24] transition-colors"
                  >
                    Settings
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="flex w-full items-center px-3 py-2 text-xs text-[#ef4444] hover:bg-[#1e1e24] transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1400px]">
        {/* Sidebar */}
        <aside className="sticky top-[52px] h-[calc(100vh-52px)] w-48 shrink-0 border-r border-[#2d2d35] bg-[#09090b] py-4 px-3">
          <nav className="space-y-0.5">
            {navItems.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                    active
                      ? 'text-[#fafafa] bg-[#1e1e24]'
                      : 'text-[#71717a] hover:text-[#a1a1aa] hover:bg-[#111114]'
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full bg-[#22d3ee]" />
                  )}
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main */}
        <main className="flex-1 min-h-[calc(100vh-52px)] p-6">{children}</main>
      </div>
    </div>
  );
}
