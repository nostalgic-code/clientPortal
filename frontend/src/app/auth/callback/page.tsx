'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

/**
 * Auth callback page - handles Supabase email confirmation redirects.
 * Supabase redirects here with tokens in the URL hash fragment.
 * This page extracts them, establishes the session, and redirects cleanly.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Verifying your account...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Supabase JS client automatically picks up hash fragments
        // and exchanges them for a session when getSession is called
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('[Auth Callback] Error:', error.message);
          setStatus('Verification failed. Redirecting to login...');
          setTimeout(() => router.replace('/login'), 2000);
          return;
        }

        if (session?.access_token) {
          // Store token for the Flask backend API calls
          localStorage.setItem('token', session.access_token);
          
          setStatus('Account verified! Redirecting...');
          
          // Clean redirect to dashboard - no tokens in URL
          router.replace('/dashboard');
        } else {
          setStatus('No session found. Redirecting to login...');
          setTimeout(() => router.replace('/login'), 2000);
        }
      } catch (err) {
        console.error('[Auth Callback] Exception:', err);
        setStatus('Something went wrong. Redirecting to login...');
        setTimeout(() => router.replace('/login'), 2000);
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto" />
        <p className="text-slate-600">{status}</p>
      </div>
    </div>
  );
}
