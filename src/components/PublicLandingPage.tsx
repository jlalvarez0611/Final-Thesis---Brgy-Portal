import { useState, useEffect } from 'react';
import { Profile } from '../lib/supabase';
import { LogIn, UserPlus, ArrowRight, Heart, MapPin, Award, Sparkles, Users, LogOut } from 'lucide-react';

interface PublicLandingPageProps {
  onShowLogin: () => void;
  onShowRegister: () => void;
  currentUser?: Profile;
  onEnterDashboard?: () => void;
  onLogout?: () => void;
}

export function PublicLandingPage({
  onShowLogin,
  onShowRegister,
  currentUser,
  onEnterDashboard,
  onLogout,
}: PublicLandingPageProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // Community images - Replace these with your actual image paths or URLs
  const communityImages = [
    { url: '/images/community-gathering-red-tent.jpg', alt: 'Community gathering with red tent' },
    { url: '/images/community-drummers-umbrellas.jpg', alt: 'Large gathering with drummers' },
    { url: '/images/community-distribution-bags.jpg', alt: 'Community distribution event' },
    { url: '/images/community-event-speaker.jpg', alt: 'Community event with speaker' },
    { url: '/images/community-children-adults.jpg', alt: 'Community interaction' },
  ];

  // Fallback gradient backgrounds if images are not found
  const gradientBackgrounds = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  ];

  // Auto-rotate slides
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % communityImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [communityImages.length]);

  // Fade in animation
  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-bold text-gray-800 truncate">Barangay Tubigan Florinda</h1>
                <p className="text-[11px] sm:text-xs text-gray-600 truncate">Community Information & Services Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              {currentUser ? (
                <>
                  <span className="hidden sm:inline text-gray-700 font-medium">Welcome, {currentUser.first_name}!</span>
                  <button
                    onClick={onEnterDashboard}
                    className="flex items-center gap-2 px-3 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg text-sm sm:text-base"
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span className="hidden sm:inline">Dashboard</span>
                    <span className="sm:hidden">Go</span>
                  </button>
                  <button
                    onClick={onLogout}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 text-gray-700 hover:text-red-600 transition-colors font-medium text-sm sm:text-base"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={onShowLogin}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 text-gray-700 hover:text-blue-600 transition-colors font-medium text-sm sm:text-base"
                  >
                    <LogIn className="w-4 h-4" />
                    <span className="hidden sm:inline">Login</span>
                  </button>
                  <button
                    onClick={onShowRegister}
                    className="flex items-center gap-2 px-3 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg text-sm sm:text-base"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span className="hidden sm:inline">Register</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section with Image Carousel */}
      <section className="relative h-[520px] sm:h-[600px] overflow-hidden">
        {/* Slideshow Container */}
        <div className="absolute inset-0">
          {communityImages.map((img, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === currentSlide ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <div
                className="w-full h-full bg-cover bg-center bg-no-repeat relative"
                style={{
                  backgroundImage: `url(${img.url})`,
                  background: `url(${img.url}), ${gradientBackgrounds[index]}`,
                  filter: 'brightness(0.6)',
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 via-blue-800/60 to-transparent" />
              </div>
            </div>
          ))}
        </div>

        {/* Hero Content */}
        <div className={`relative z-10 h-full flex items-center transition-all duration-1000 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-8 h-8 text-blue-300 animate-pulse" />
                <span className="px-3 py-1 bg-blue-600/80 backdrop-blur-sm text-white rounded-full text-sm font-semibold shadow-md">
                  #BIÑANENSE MAHAL KO KAYO!
                </span>
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4 leading-tight">
                Welcome to Our
                <span className="block text-blue-200"> Community</span>
              </h1>
              <p className="text-xl text-white/90 mb-8 leading-relaxed">
                Join us in building a stronger, more connected Barangay Tubigan Florinda. 
                Stay informed, participate in events, and be part of our growing community.
              </p>
              {!currentUser && (
                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={onShowRegister}
                    className="px-8 py-4 bg-white text-blue-600 font-bold rounded-lg transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                  >
                    Get Started
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  <button
                    onClick={onShowLogin}
                    className="px-8 py-4 bg-white/20 backdrop-blur-md hover:bg-white/30 text-white font-semibold rounded-lg transition-all border-2 border-white/30"
                  >
                    Login
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Slide Indicators */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
          {communityImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all shadow-sm ${
                index === currentSlide
                  ? 'w-8 bg-white'
                  : 'w-2 bg-white/40 hover:bg-white/70'
              }`}
            />
          ))}
        </div>

        {/* Floating Elements */}
        <div className="absolute top-20 right-10 z-10 animate-bounce hidden lg:block">
          <div className="bg-white/20 backdrop-blur-sm p-4 rounded-lg border border-white/30 shadow-lg">
            <Heart className="w-6 h-6 text-red-300" />
          </div>
        </div>
      </section>

      {/* Community Highlights */}
      <section className="py-20 bg-gradient-to-br from-slate-50 via-blue-50/40 to-purple-50/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">Community Highlights</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Discover what makes Barangay Tubigan Florinda a special place to live
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Community Gathering */}
            <div className="group relative overflow-hidden rounded-lg shadow-md hover:shadow-lg transition-all border-t-4 border-blue-500">
              <div className="h-56 bg-cover bg-center bg-no-repeat relative"
                   style={{ 
                     backgroundImage: 'url(/images/community-gathering-red-tent.jpg)',
                     background: 'url(/images/community-gathering-red-tent.jpg), linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)'
                   }}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-blue-300" />
                  <span className="text-sm font-semibold text-blue-200">Community Events</span>
                </div>
                <h3 className="text-xl font-bold mb-2">Active Community Participation</h3>
                <p className="text-sm text-white/90">Join our regular community gatherings and stay connected with your neighbors.</p>
              </div>
            </div>

            {/* Drummers and Activities */}
            <div className="group relative overflow-hidden rounded-lg shadow-md hover:shadow-lg transition-all border-t-4 border-purple-500">
              <div className="h-64 bg-cover bg-center bg-no-repeat relative"
                   style={{ 
                     backgroundImage: 'url(/images/community-drummers-umbrellas.jpg)',
                     background: 'url(/images/community-drummers-umbrellas.jpg), linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)'
                   }}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-5 h-5 text-purple-300" />
                  <span className="text-sm font-semibold text-purple-200">Cultural Activities</span>
                </div>
                <h3 className="text-xl font-bold mb-2">TUBIGAN SKEPTRON</h3>
                <p className="text-sm text-white/90">Celebrate our rich culture through music, dance, and community performances.</p>
              </div>
            </div>

            {/* Distribution & Services */}
            <div className="group relative overflow-hidden rounded-lg shadow-md hover:shadow-lg transition-all border-t-4 border-emerald-500">
              <div className="h-64 bg-cover bg-center bg-no-repeat relative"
                   style={{ 
                     backgroundImage: 'url(/images/community-distribution-bags.jpg)',
                     background: 'url(/images/community-distribution-bags.jpg), linear-gradient(135deg, #059669 0%, #10b981 100%)'
                   }}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="w-5 h-5 text-red-300" />
                  <span className="text-sm font-semibold text-emerald-200">Community Service</span>
                </div>
                <h3 className="text-xl font-bold mb-2">BRGY. TUBIGAN</h3>
                <p className="text-sm text-white/90">Access essential services and participate in community distribution programs.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-blue-600 relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-blue-100 mb-8 leading-relaxed">
            Join our community portal today! Register to access events, announcements, 
            and connect with your fellow residents. Your journey starts here!
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={onShowRegister}
              className="px-8 py-3 bg-white text-blue-600 font-semibold rounded shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              Register Now
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={onShowLogin}
              className="px-8 py-3 bg-white/20 text-white font-semibold rounded shadow-md hover:shadow-lg transition-all border border-white/30"
            >
              Login to Portal
            </button>
            {currentUser && (
              <button
                onClick={onEnterDashboard}
                className="px-8 py-3 bg-emerald-500 text-white font-semibold rounded shadow-md hover:shadow-lg hover:bg-emerald-600 transition-all border border-emerald-400"
              >
                Go to Dashboard
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-100 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-bold mb-4 text-white">Barangay Tubigan Florinda</h3>
              <p className="text-slate-400 text-sm">
                Your trusted community information and services portal. 
                Building stronger connections, one resident at a time.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-4 text-white">Stay Connected</h3>
              <p className="text-slate-400 text-sm mb-4">
                Follow us for the latest updates and community news.
              </p>
              <div className="flex items-center gap-2">
                <span className="text-yellow-400 text-sm font-semibold">#BIÑANENSE MAHAL KO KAYO!</span>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

