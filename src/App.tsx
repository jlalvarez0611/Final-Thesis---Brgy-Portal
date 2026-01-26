import { useEffect, useState } from 'react';
import { supabase, Profile } from './lib/supabase';
import { AuthForm } from './components/AuthForm';
import { AdminDashboard } from './components/AdminDashboard';
import { ResidentDashboard } from './components/ResidentDashboard';
import { UnapprovedResidentDashboard } from './components/UnapprovedResidentDashboard';
import { ResidentLandingPage } from './components/ResidentLandingPage';
import { PublicLandingPage } from './components/PublicLandingPage';

function App() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showLandingPage, setShowLandingPage] = useState(true);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [currentRoute, setCurrentRoute] = useState<'landing' | 'auth' | 'dashboard'>('landing');

  useEffect(() => {
    // Check URL on load to restore state after refresh
    const urlParams = new URLSearchParams(window.location.search);
    const path = window.location.pathname;

    // Initialize based on URL before checking user
    if (path === '/auth' || path.includes('auth')) {
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
          window.history.replaceState({ route: 'auth', mode }, '', `/auth?mode=${mode}`);
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

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      checkUser();
    });

    // Handle browser back/forward buttons
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
      const currentPath = window.location.pathname;
      
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
          // Always ensure URL matches landing page when navigating to landing
          window.history.replaceState({ route: 'landing' }, '', '/landing');
        } else {
          setShowAuthForm(false);
          setShowLandingPage(true);
          setCurrentRoute('landing');
          // Always update URL to landing if not already there
          window.history.replaceState({ route: 'landing' }, '', '/landing');
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
          // Always ensure URL is /landing for residents
          if (profile && profile.role === 'resident' && profile.is_approved) {
            window.history.replaceState({ route: 'landing' }, '', '/landing');
          }
        }
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      authListener.subscription.unsubscribe();
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

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
  };

  const handleProfileUpdate = (updatedProfile: Profile) => {
    setProfile(updatedProfile);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
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
          window.history.back();
        }}
      />
    );
  }

  if (profile.role === 'admin') {
    return <AdminDashboard currentUser={profile} onLogout={handleLogout} />;
  }

  // Show landing page for approved residents first
  if (profile.role === 'resident' && profile.is_approved && showLandingPage) {
    // Ensure URL is /landing when showing landing page - use a separate effect
    // We'll handle this in the popstate handler and when the component renders
    const currentPath = window.location.pathname;
    if (currentPath !== '/landing' && currentPath !== '/auth') {
      // Update URL to /landing without adding to history (using replaceState)
      window.history.replaceState({ route: 'landing' }, '', '/landing');
    }
    
    return (
      <ResidentLandingPage
        currentUser={profile}
        onLogout={handleLogout}
        onEnterDashboard={(tab) => {
          setShowLandingPage(false);
          setCurrentRoute('dashboard');
          const tabParam = tab ? `?tab=${tab}` : '';
          window.history.pushState({ route: 'dashboard', tab }, '', `/dashboard${tabParam}`);
        }}
      />
    );
  }

  // Show unapproved resident dashboard for pending users
  if (!profile.is_approved && profile.role !== 'admin') {
    return (
      <UnapprovedResidentDashboard
        currentUser={profile}
        onLogout={handleLogout}
        onApprovalStatusChange={checkUser}
      />
    );
  }

  // Show approved resident dashboard when they click "Enter Portal"
  if (profile.role === 'resident' && profile.is_approved && !showLandingPage) {
    return (
      <ResidentDashboard
        currentUser={profile}
        onLogout={handleLogout}
        onProfileUpdate={handleProfileUpdate}
      />
    );
  }

  return null;
}

export default App;
