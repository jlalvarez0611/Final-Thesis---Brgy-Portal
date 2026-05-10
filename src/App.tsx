import { useEffect, useLayoutEffect, useState, useRef } from 'react';
import { supabase, Profile, isPasswordRecoverySession } from './lib/supabase';
import { AuthForm } from './components/AuthForm';
import { AdminDashboard } from './components/AdminDashboard';
import { ResidentDashboard } from './components/ResidentDashboard';
import { UnapprovedResidentDashboard } from './components/UnapprovedResidentDashboard';
import { PublicLandingPage } from './components/PublicLandingPage';

function App() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showLandingPage, setShowLandingPage] = useState(true);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [_currentRoute, setCurrentRoute] = useState<'landing' | 'auth' | 'dashboard'>('landing');
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /** PKCE email links used to land on `/` — normalize to `/auth` before route logic runs. */
  const [authUrlReady, setAuthUrlReady] = useState(() => {
    if (typeof window === 'undefined') return true;
    const path = window.location.pathname;
    const q = new URLSearchParams(window.location.search);
    return !(q.has('code') && (path === '/' || path === '/landing'));
  });

  /** Wait for Supabase to exchange ?code= so PASSWORD_RECOVERY / session is settled. */
  const [pkceExchangePending, setPkceExchangePending] = useState(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).has('code');
  });

  useLayoutEffect(() => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    if (params.has('code') && (path === '/' || path === '/landing')) {
      const next = new URLSearchParams(params);
      next.set('mode', 'login');
      window.history.replaceState({ route: 'auth', mode: 'login' }, '', `/auth?${next.toString()}`);
    }
    setAuthUrlReady(true);
  }, []);

  // 30 minutes in milliseconds
  const INACTIVITY_TIME = 30 * 60 * 1000;

  // Handle user inactivity logout
  const resetInactivityTimer = () => {
    // Clear existing timeout
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }

    // Only set timeout if user is logged in
    if (profile) {
      const newTimeout = setTimeout(async () => {
        console.log('User inactive for 30 minutes. Logging out...');
        await supabase.auth.signOut();
        setProfile(null);
        alert('Your session has expired due to inactivity. Please log in again.');
        window.location.href = '/';
      }, INACTIVITY_TIME);

      inactivityTimeoutRef.current = newTimeout;
    }
  };

  useEffect(() => {
    // Set up auth listener first to catch recovery events
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Show auth form for password recovery
        setIsRecoveryMode(true);
        setShowAuthForm(true);
        setShowLandingPage(false);
        setCurrentRoute('auth');
        setPkceExchangePending(false);
      } else {
        // PKCE + email link often skips PASSWORD_RECOVERY; JWT amr still marks recovery sessions.
        if (session && isPasswordRecoverySession(session)) {
          setIsRecoveryMode(true);
          setShowAuthForm(true);
          setShowLandingPage(false);
          setCurrentRoute('auth');
        }
        // Do not clear on INITIAL_SESSION with null — PKCE exchange may still be running.
        if (session && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')) {
          setPkceExchangePending(false);
        }
        checkUser();
      }
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && isPasswordRecoverySession(session)) {
        setIsRecoveryMode(true);
        setShowAuthForm(true);
        setShowLandingPage(false);
        setCurrentRoute('auth');
        setPkceExchangePending(false);
      }
    });

    // Check URL on load to restore state after refresh
    const urlParams = new URLSearchParams(window.location.search);
    const hashRaw = window.location.hash.replace(/^#/, '');
    const hashParams = new URLSearchParams(hashRaw);
    const recoveryFromUrl =
      urlParams.get('type') === 'recovery' ||
      hashParams.get('type') === 'recovery' ||
      hashRaw.includes('type=recovery');
    const path = window.location.pathname;

    // Check for password recovery (query, hash, or redirect_to we set with type=recovery)
    if (recoveryFromUrl) {
      setIsRecoveryMode(true);
      setShowAuthForm(true);
      setShowLandingPage(false);
      setCurrentRoute('auth');
      setPkceExchangePending(false);
    } else if (path === '/auth' || path.includes('auth')) {
      const mode = urlParams.get('mode') || 'login';
      setAuthMode(mode as 'login' | 'register');
      setShowAuthForm(true);
      setShowLandingPage(false);
      setCurrentRoute('auth');
    } else if (path === '/dashboard' || path.includes('dashboard')) {
      setShowLandingPage(false);
      setShowAuthForm(false);
      setCurrentRoute('dashboard');
    } else if (path === '/landing' || path === '/') {
      // Landing page route for residents or public
      setShowAuthForm(false);
      setShowLandingPage(true);
      setCurrentRoute('landing');
    } else {
      // Default to landing page for root path
      setShowAuthForm(false);
      setShowLandingPage(true);
      setCurrentRoute('landing');
    }

    checkUser().then((profile) => {
      // Restore state from URL after user is checked
      if (path === '/auth' || path.includes('auth')) {
        const mode = urlParams.get('mode') || 'login';
        if (!window.history.state) {
          const p = new URLSearchParams(urlParams);
          p.set('mode', mode);
          window.history.replaceState({ route: 'auth', mode }, '', `/auth?${p.toString()}`);
        }
      } else if (path === '/dashboard' || path.includes('dashboard')) {
        if (!window.history.state) {
          const tab = urlParams.get('tab') || 'events';
          window.history.replaceState({ route: 'dashboard', tab, dashboard: true }, '', `/dashboard?tab=${tab}`);
          // Only set showLandingPage to false if explicitly on dashboard route
          setShowLandingPage(false);
        }
      } else if (path === '/landing' || (path === '/' && profile && profile.role === 'resident' && profile.is_approved)) {
        // For residents, use /landing route
        if (!window.history.state) {
          const landingRoute = '/landing';
          window.history.replaceState({ route: 'landing' }, '', landingRoute);
        }
        // For residents, ensure landing page is shown
        if (profile && profile.role === 'resident' && profile.is_approved) {
          setShowLandingPage(true);
        }
      } else {
        // Public landing page
        if (!window.history.state) {
          window.history.replaceState({ route: 'landing' }, '', '/');
        }
      }
    });

    // Handle browser back/forward buttons
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
      const currentPath = window.location.pathname;
      
      // If state has 'dashboard' or 'admin' property, it's a tab change within dashboard
      // Let the dashboard component handle it
      if (state && (state.dashboard || state.admin)) {
        return;
      }
      
      if (state) {
        if (state.route === 'auth') {
          setShowAuthForm(true);
          setShowLandingPage(false);
          setCurrentRoute('auth');
          setAuthMode(state.mode || 'login');
        } else if (state.route === 'dashboard') {
          setShowLandingPage(false);
          setShowAuthForm(false);
          setCurrentRoute('dashboard');
        } else if (state.route === 'landing') {
          setShowAuthForm(false);
          setShowLandingPage(true);
          setCurrentRoute('landing');
        } else {
          setShowAuthForm(false);
          setShowLandingPage(true);
          setCurrentRoute('landing');
        }
      } else {
        // Check pathname if no state - likely coming back from dashboard
        if (currentPath === '/dashboard' || currentPath.includes('dashboard')) {
          setShowLandingPage(false);
          setShowAuthForm(false);
          setCurrentRoute('dashboard');
        } else {
          // If not on dashboard, must be landing page - update URL accordingly
          setShowAuthForm(false);
          setShowLandingPage(true);
          setCurrentRoute('landing');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      authListener.subscription.unsubscribe();
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    if (!pkceExchangePending) return;
    const id = window.setTimeout(() => setPkceExchangePending(false), 8000);
    return () => window.clearTimeout(id);
  }, [pkceExchangePending]);

  // Setup inactivity timeout on profile change
  useEffect(() => {
    if (profile) {
      // Reset timer on mount
      resetInactivityTimer();

      // Add event listeners for user activity
      const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

      const handleUserActivity = () => {
        resetInactivityTimer();
      };

      events.forEach((event) => {
        document.addEventListener(event, handleUserActivity);
      });

      return () => {
        events.forEach((event) => {
          document.removeEventListener(event, handleUserActivity);
        });
        if (inactivityTimeoutRef.current) {
          clearTimeout(inactivityTimeoutRef.current);
        }
      };
    }
  }, [profile]);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (error) throw error;
        setProfile(profileData);
        return profileData;
      } else {
        setProfile(null);
        return null;
      }
    } catch (error) {
      console.error('Error checking user:', error);
      setProfile(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setShowAuthForm(false);
    setShowLandingPage(true);
    setCurrentRoute('landing');
    // Force root URL after logout to avoid 404 on static hosting when users were on /dashboard.
    window.history.replaceState({ route: 'landing' }, '', '/');
    window.location.assign(window.location.origin);
  };

  const handleProfileUpdate = (updatedProfile: Profile) => {
    setProfile(updatedProfile);
  };

  if (!authUrlReady || loading || pkceExchangePending) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Password reset / recovery UI must win over landing and dashboards
  if (isRecoveryMode && showAuthForm) {
    return (
      <AuthForm
        onAuthSuccess={(profile) => {
          setProfile(profile);
          setShowAuthForm(false);
          setIsRecoveryMode(false);
          // For residents, show landing page first; for admins, go to dashboard
          if (profile.role === 'resident') {
            setShowLandingPage(true);
            setCurrentRoute('landing');
            window.history.pushState({ route: 'landing' }, '', '/landing');
          } else {
            setShowLandingPage(false);
            setCurrentRoute('dashboard');
            window.history.pushState({ route: 'dashboard' }, '', '/dashboard');
          }
        }}
        initialMode={authMode}
        forceRecoveryMode={true}
        onBack={() => {
          setShowAuthForm(false);
          setIsRecoveryMode(false);
          setShowLandingPage(true);
          setCurrentRoute('landing');
          window.history.replaceState({ route: 'landing' }, '', '/');
        }}
      />
    );
  }

  // Show landing page first when no user is logged in
  if (!profile && !showAuthForm) {
    return (
      <PublicLandingPage
        onShowLogin={() => {
          setAuthMode('login');
          setShowAuthForm(true);
          setCurrentRoute('auth');
          window.history.pushState({ route: 'auth', mode: 'login' }, '', '/auth?mode=login');
        }}
        onShowRegister={() => {
          setAuthMode('register');
          setShowAuthForm(true);
          setCurrentRoute('auth');
          window.history.pushState({ route: 'auth', mode: 'register' }, '', '/auth?mode=register');
        }}
      />
    );
  }

  // Show auth form when user clicks login/register
  if (!profile && showAuthForm) {
    return (
      <AuthForm
        onAuthSuccess={(profile) => {
          setProfile(profile);
          setShowAuthForm(false);
          // For residents, show landing page first; for admins, go to dashboard
          if (profile.role === 'resident') {
            setShowLandingPage(true);
            setCurrentRoute('landing');
            window.history.pushState({ route: 'landing' }, '', '/landing');
          } else {
            setShowLandingPage(false);
            setCurrentRoute('dashboard');
            window.history.pushState({ route: 'dashboard' }, '', '/dashboard');
          }
        }}
        initialMode={authMode}
        onBack={() => {
          setShowAuthForm(false);
          setShowLandingPage(true);
          setCurrentRoute('landing');
          // Don’t rely on history.back(): direct /auth loads or shallow stacks won’t emit popstate.
          window.history.replaceState({ route: 'landing' }, '', '/');
        }}
      />
    );
  }

  if (profile && profile.role === 'admin') {
    return <AdminDashboard currentUser={profile} onLogout={handleLogout} />;
  }

  // Show landing page for approved residents first
  if (profile && profile.role === 'resident' && profile.is_approved && showLandingPage) {
    // Ensure URL is /landing when showing landing page - use a separate effect
    // We'll handle this in the popstate handler and when                               the component renders
    const currentPath = window.location.pathname;
    if (currentPath !== '/landing' && currentPath !== '/auth') {
      // Update URL to /landing without adding to history (using replaceState)
      window.history.replaceState({ route: 'landing' }, '', '/landing');
    }
    
    return (
      <PublicLandingPage
        onShowLogin={() => {
          setAuthMode('login');
          setShowAuthForm(true);
          setCurrentRoute('auth');
          window.history.pushState({ route: 'auth', mode: 'login' }, '', '/auth?mode=login');
        }}
        onShowRegister={() => {
          setShowLandingPage(false);
          setCurrentRoute('dashboard');
          const tabParam = '';
          window.history.pushState({ route: 'dashboard', tab: undefined }, '', `/dashboard${tabParam}`);
        }}
        currentUser={profile}
        onEnterDashboard={() => {
          setShowLandingPage(false);
          setCurrentRoute('dashboard');
          window.history.pushState({ route: 'dashboard', tab: undefined }, '', `/dashboard`);
        }}
        onLogout={handleLogout}
      />
    );
  }

  // Show unapproved resident dashboard for pending users
  if (profile && !profile.is_approved && profile.role === 'resident') {
    return (
      <UnapprovedResidentDashboard
        currentUser={profile}
        onLogout={handleLogout}
        onApprovalStatusChange={checkUser}
      />
    );
  }

  // Show approved resident dashboard when they click "Enter Portal"
  if (profile && profile.role === 'resident' && profile.is_approved && !showLandingPage) {
    return (
      <ResidentDashboard
        currentUser={profile}
        onLogout={handleLogout}
        onProfileUpdate={handleProfileUpdate}
        onBackToLanding={() => {
          setShowLandingPage(true);
          setCurrentRoute('landing');
          window.history.pushState({ route: 'landing' }, '', '/landing');
        }}
      />
    );
  }

  return null;
}

export default App;
