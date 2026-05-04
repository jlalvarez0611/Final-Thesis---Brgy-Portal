import { useEffect, useState } from 'react';
import { Profile } from '../lib/supabase';
import { ArrowRight, Building2, Calendar, FileText, LogOut, MapPin, Newspaper, Users2 } from 'lucide-react';

interface ResidentLandingPageProps {
  currentUser: Profile;
  onLogout: () => void;
  onEnterDashboard: (tab?: 'events' | 'news' | 'officials' | 'papers' | 'facilities') => void;
}

export function ResidentLandingPage({
  currentUser,
  onLogout,
  onEnterDashboard,
}: ResidentLandingPageProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const communityImages = [
    '/images/community-gathering-red-tent.jpg',
    '/images/community-drummers-umbrellas.jpg',
    '/images/community-distribution-bags.jpg',
    '/images/community-event-speaker.jpg',
    '/images/community-children-adults.jpg',
  ];

  const gradientFallbacks = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % communityImages.length);
    }, 4500);

    return () => clearInterval(interval);
  }, [communityImages.length]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="h-16 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-blue-600 rounded-lg">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">Barangay Tubigan Florinda</p>
                <p className="text-xs text-slate-500 truncate">Resident Portal</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={onEnterDashboard}
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                Enter
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={onLogout}
                className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-red-600 hover:border-red-200 transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">
        <section className="relative h-[280px] sm:h-[360px] overflow-hidden rounded-2xl border border-slate-200">
          {communityImages.map((image, index) => (
            <div
              key={image}
              className={`absolute inset-0 transition-opacity duration-700 ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}
            >
              <div
                className="w-full h-full bg-cover bg-center"
                style={{
                  backgroundImage: `url(${image})`,
                  background: `url(${image}), ${gradientFallbacks[index]}`,
                }}
              />
              <div className="absolute inset-0 bg-black/35" />
            </div>
          ))}

          <div className="relative z-10 h-full flex items-end">
            <div className="p-4 sm:p-6">
              <h1 className="text-xl sm:text-3xl font-bold text-white">
                Hi, {currentUser.first_name || currentUser.full_name}
              </h1>
              <p className="text-white/90 text-sm mt-1">Welcome back.</p>
            </div>
          </div>

          <div className="absolute bottom-3 right-3 z-20 flex gap-1.5">
            {communityImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-2 rounded-full transition-all ${index === currentSlide ? 'w-6 bg-white' : 'w-2 bg-white/60'}`}
                aria-label={`Slide ${index + 1}`}
              />
            ))}
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-base sm:text-lg font-semibold text-slate-900">Quick Access</h2>
            <button
              onClick={onEnterDashboard}
              className="inline-flex items-center gap-2 px-3 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors"
            >
              Dashboard
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <button onClick={() => onEnterDashboard('events')} className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-4 py-3 text-left transition-colors">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-green-700" />
                <span className="font-semibold text-slate-900">Events</span>
              </div>
            </button>
            <button onClick={() => onEnterDashboard('news')} className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-4 py-3 text-left transition-colors">
              <div className="flex items-center gap-2">
                <Newspaper className="w-5 h-5 text-purple-700" />
                <span className="font-semibold text-slate-900">News</span>
              </div>
            </button>
            <button onClick={() => onEnterDashboard('officials')} className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-4 py-3 text-left transition-colors">
              <div className="flex items-center gap-2">
                <Users2 className="w-5 h-5 text-indigo-700" />
                <span className="font-semibold text-slate-900">Officials</span>
              </div>
            </button>
            <button onClick={() => onEnterDashboard('papers')} className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-4 py-3 text-left transition-colors">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-700" />
                <span className="font-semibold text-slate-900">Documents</span>
              </div>
            </button>
            <button onClick={() => onEnterDashboard('facilities')} className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-4 py-3 text-left transition-colors">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-slate-700" />
                <span className="font-semibold text-slate-900">Facilities</span>
              </div>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

