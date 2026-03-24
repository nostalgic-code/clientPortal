'use client';

import { useEffect } from 'react';
import { initAuthSync } from '@/lib/supabase';

export function AuthSync() {
  useEffect(() => {
    const { data: { subscription } } = initAuthSync();
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
