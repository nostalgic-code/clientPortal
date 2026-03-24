'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

/**
 * Invisible component that intercepts Supabase auth hash fragments (#access_token=...)
 * on ANY page. Strips tokens from URL immediately and establishes the session.
 * 
 * This prevents tokens from being visible in the address bar, browser history,
 * or shared URLs — which would be a security risk.
 */
export function AuthHashHandler() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check if URL has auth hash fragment
    const hash = window.location.hash;
    if (!hash || !hash.includes('access_token=')) return;

    const handleHash = async () => {
      try {
        // Immediately clean the URL (remove hash) to prevent exposure
        // Use replaceState so it doesn't appear in browser history
        window.history.replaceState(null, '', pathname);

        // Supabase client detects hash fragments automatically
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('[AuthHash] Session error:', error.message);
          return;
        }

        if (session?.access_token) {
          localStorage.setItem('token', session.access_token);
          
          // If on the home page or login page, redirect to dashboard
          if (pathname === '/' || pathname === '/login' || pathname === '/register') {
            router.replace('/dashboard');
          }
        }
      } catch (err) {
        console.error('[AuthHash] Exception:', err);
      }
    };

    handleHash();
  }, [pathname, router]);

  // This component renders nothing - it just handles the side effect
  return null;
}
