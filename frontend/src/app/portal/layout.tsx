'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, FileText, Receipt, Upload, LogOut, User, Loader2, FolderKanban, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { NotificationBell } from '@/components/notification-bell';
import { authApi } from '@/lib/api';

const navigation = [
  { name: 'Dashboard', href: '/portal', icon: LayoutDashboard, exact: true },
  { name: 'Proposals', href: '/portal/proposals', icon: ClipboardList },
  { name: 'My Project', href: '/portal/project', icon: FolderKanban },
  { name: 'Documents', href: '/portal/documents', icon: FileText },
  { name: 'Invoices', href: '/portal/invoices', icon: Receipt },
  { name: 'Upload Files', href: '/portal/uploads', icon: Upload },
];

export default function PortalLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const data = await authApi.me();
        if (!data?.user || data.user.role !== 'client') {
          if (data?.user?.role === 'admin') {
            router.replace('/dashboard');
          } else {
            router.replace('/login');
          }
          return;
        }
        setUserName(data.user.name || data.user.email || '');
        setOrgName(data.organization?.name || 'Client Portal');
        setIsAuthed(true);
      } catch {
        router.replace('/login');
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-black mx-auto" />
          <p className="text-sm text-slate-500">Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (!isAuthed) return null;

  const handleLogout = async () => {
    const { supabase } = await import('@/lib/supabase');
    await supabase.auth.signOut();
    localStorage.removeItem('token');
    router.push('/login');
  };

  const isActive = (item: typeof navigation[0]) => {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + '/');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/portal" className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-black rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-sm">{orgName.slice(0, 2).toUpperCase()}</span>
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-slate-900">{orgName}</p>
                <p className="text-xs text-slate-500">Client Portal</p>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center space-x-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive(item)
                      ? 'bg-black text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )}
                >
                  <item.icon className="w-4 h-4 mr-2" />
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* User */}
            <div className="flex items-center space-x-3">
              <NotificationBell />
              <div className="flex items-center space-x-2">
                <Avatar className="h-8 w-8 border border-slate-200">
                  <AvatarFallback className="bg-black text-white text-xs font-medium">
                    {userName ? userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : <User className="w-4 h-4" />}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-slate-700 hidden sm:inline">{userName}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-500 hover:text-slate-900">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <nav className="md:hidden bg-white border-b border-slate-200">
        <div className="flex overflow-x-auto px-4 py-2 space-x-2 scrollbar-hide">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
                isActive(item)
                  ? 'bg-black text-white'
                  : 'bg-slate-100 text-slate-600'
              )}
            >
              <item.icon className="w-3.5 h-3.5 mr-1.5" />
              {item.name}
            </Link>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
