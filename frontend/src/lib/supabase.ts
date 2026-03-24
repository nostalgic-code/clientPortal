import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://twvxwkltimyifwmxiago.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3dnh3a2x0aW15aWZ3bXhpYWdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNjYyMDQsImV4cCI6MjA4NTk0MjIwNH0.Ec3nd8FzVsBeQFvKfEQDfEt2sHSh98uZXV0TzDp5R44'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Auth helper functions
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  if (error) throw error
  return data
}

export async function signUp(email: string, password: string, name: string, role: string = 'client') {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        role,
      },
    },
  })
  
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) throw error
  return session
}

export async function getUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  return user
}

// Get access token for API calls (forces session refresh if expired)
export async function getAccessToken(): Promise<string | null> {
  try {
    // First try getSession (cached, fast)
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) return session.access_token

    // If no session, try refreshing
    const { data: { session: refreshed } } = await supabase.auth.refreshSession()
    return refreshed?.access_token || null
  } catch {
    return null
  }
}

// Get token from localStorage with Supabase session fallback
// This is the recommended way to get a token in dashboard pages
export async function getToken(): Promise<string | null> {
  // Always prefer fresh Supabase session token (auto-refreshes expired tokens)
  const token = await getAccessToken();
  if (token) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
    return token;
  }

  // Fall back to localStorage (e.g. if Supabase session not yet initialized)
  const stored = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return stored;
}

// Listen for auth state changes
export function onAuthStateChange(callback: (event: string, session: any) => void) {
  return supabase.auth.onAuthStateChange(callback)
}

// Keep localStorage token in sync with Supabase auth state
export function initAuthSync() {
  return supabase.auth.onAuthStateChange((event, session) => {
    if (session?.access_token) {
      localStorage.setItem('token', session.access_token);
    } else if (event === 'SIGNED_OUT') {
      localStorage.removeItem('token');
    }
  });
}
