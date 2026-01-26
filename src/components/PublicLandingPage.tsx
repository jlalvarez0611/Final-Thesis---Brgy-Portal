import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, UserPlus, Calendar, Newspaper, Users, ArrowRight, Heart, Award, Users2, Sparkles, MapPin, FileText } from 'lucide-react';

interface PublicLandingPageProps {
  onShowLogin: () => void;
  onShowRegister: () => void;
}

export function PublicLandingPage({
  onShowLogin,
  onShowRegister,
}: PublicLandingPageProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [stats, setStats] = useState({
    residents: 0,
    events: 0,
    news: 0,
    officials: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showDocumentRequest, setShowDocumentRequest] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [documentRequestForm, setDocumentRequestForm] = useState({
    paper_type: '' as 'barangay_clearance' | 'certificate_of_indigency' | 'proof_of_residency' | '',
    requester_name: '',
    requester_email: '',
    requester_phone: '',
    requester_address: '',
    payment_method: 'cash' as 'online' | 'cash',
  });

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

  // Fetch counts from database
  useEffect(() => {
    fetchCounts();
  }, []);

  // Fade in animation
  useEffect(() => {
    setIsVisible(true);
  }, []);

  const fetchCounts = async () => {
    try {
      setLoading(true);

      // Fetch approved residents count
      const { count: residentsCount, error: residentsError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'resident')
        .eq('is_approved', true);

      if (residentsError) throw residentsError;

      // Fetch events count (all events or just upcoming)
      const { count: eventsCount, error: eventsError } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .gte('event_date', new Date().toISOString());

      if (eventsError) throw eventsError;

      // Fetch published news count
      const { count: newsCount, error: newsError } = await supabase
        .from('news')
        .select('*', { count: 'exact', head: true })
        .eq('published', true);

      if (newsError) throw newsError;

      // Fetch officials count
      const { count: officialsCount, error: officialsError } = await supabase
        .from('officials')
        .select('*', { count: 'exact', head: true });

      // Officials table might not exist, so don't throw error
      if (officialsError) {
        console.warn('Officials table not found:', officialsError);
      }

      setStats({
        residents: residentsCount || 0,
        events: eventsCount || 0,
        news: newsCount || 0,
        officials: officialsCount || 0,
      });
    } catch (error) {
      console.error('Error fetching counts:', error);
      // Set default values on error
      setStats({
        residents: 0,
        events: 0,
        news: 0,
        officials: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const statsData = [
    { 
      label: 'Active Residents', 
      value: loading ? '...' : stats.residents.toString(), 
      icon: Users, 
      iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
      textGradient: 'bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent'
    },
    { 
      label: 'Upcoming Events', 
      value: loading ? '...' : stats.events.toString(), 
      icon: Calendar, 
      iconBg: 'bg-gradient-to-br from-green-500 to-emerald-600',
      textGradient: 'bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent'
    },
    { 
      label: 'Announcements', 
      value: loading ? '...' : stats.news.toString(), 
      icon: Newspaper, 
      iconBg: 'bg-gradient-to-br from-purple-500 to-pink-600',
      textGradient: 'bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent'
    },
    { 
      label: 'Officials', 
      value: loading ? '...' : stats.officials.toString(), 
      icon: Users2, 
      iconBg: 'bg-gradient-to-br from-orange-500 to-red-600',
      textGradient: 'bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent'
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Barangay Tubigan Florinda</h1>
                <p className="text-xs text-gray-600">Community Information & Services Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={onShowLogin}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-blue-600 transition-colors font-medium"
              >
                <LogIn className="w-4 h-4" />
                Login
              </button>
              <button
                onClick={onShowRegister}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <UserPlus className="w-4 h-4" />
                Register
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section with Image Carousel */}
      <section className="relative h-[600px] overflow-hidden">
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
                <Sparkles className="w-8 h-8 text-yellow-300 animate-pulse" />
                <span className="px-3 py-1 bg-yellow-400/90 backdrop-blur-sm text-yellow-900 rounded-full text-sm font-semibold">
                  #BIÑANENSE MAHAL KO KAYO!
                </span>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 leading-tight">
                Welcome to Our
                <span className="block text-yellow-300"> Community</span>
              </h1>
              <p className="text-xl text-white/90 mb-8 leading-relaxed">
                Join us in building a stronger, more connected Barangay Tubigan Florinda. 
                Stay informed, participate in events, and be part of our growing community.
              </p>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={onShowRegister}
                  className="px-8 py-4 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold rounded-lg transition-all transform hover:scale-105 shadow-xl hover:shadow-2xl flex items-center gap-2"
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
            </div>
          </div>
        </div>

        {/* Slide Indicators */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
          {communityImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentSlide
                  ? 'w-8 bg-yellow-400'
                  : 'w-2 bg-white/50 hover:bg-white/75'
              }`}
            />
          ))}
        </div>

        {/* Floating Elements */}
        <div className="absolute top-20 right-10 z-10 animate-bounce hidden lg:block">
          <div className="bg-white/20 backdrop-blur-sm p-4 rounded-lg border border-white/30">
            <Heart className="w-6 h-6 text-red-400" />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gradient-to-b from-white via-blue-50/30 to-indigo-50/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {statsData.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div
                  key={index}
                  className={`bg-gradient-to-br from-white to-gray-50 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all transform hover:scale-105 border border-gray-200/50 ${
                    isVisible ? 'animate-fade-in' : 'opacity-0'
                  }`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${stat.iconBg} text-white shadow-lg`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className={`text-3xl font-bold ${stat.textGradient}`}>{stat.value}</p>
                      <p className="text-sm text-gray-600 mt-1">{stat.label}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Community Highlights */}
      <section className="py-20 bg-gradient-to-b from-white to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">Community Highlights</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Discover what makes Barangay Tubigan Florinda a special place to live
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Community Gathering */}
            <div className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all transform hover:scale-105">
              <div className="h-64 bg-cover bg-center bg-no-repeat relative"
                   style={{ 
                     backgroundImage: 'url(/images/community-gathering-red-tent.jpg)',
                     background: 'url(/images/community-gathering-red-tent.jpg), linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                   }}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5" />
                  <span className="text-sm font-semibold">Community Events</span>
                </div>
                <h3 className="text-xl font-bold mb-2">Active Community Participation</h3>
                <p className="text-sm text-white/90">Join our regular community gatherings and stay connected with your neighbors.</p>
              </div>
              <div className="absolute top-4 right-4">
                <div className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-400 text-gray-900 px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                  POPANG
                </div>
              </div>
            </div>

            {/* Drummers and Activities */}
            <div className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all transform hover:scale-105">
              <div className="h-64 bg-cover bg-center bg-no-repeat relative"
                   style={{ 
                     backgroundImage: 'url(/images/community-drummers-umbrellas.jpg)',
                     background: 'url(/images/community-drummers-umbrellas.jpg), linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
                   }}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-5 h-5" />
                  <span className="text-sm font-semibold">Cultural Activities</span>
                </div>
                <h3 className="text-xl font-bold mb-2">TUBIGAN SKEPTRON</h3>
                <p className="text-sm text-white/90">Celebrate our rich culture through music, dance, and community performances.</p>
              </div>
              <div className="absolute top-4 right-4">
                <div className="bg-gradient-to-r from-green-400 via-emerald-500 to-teal-400 text-gray-900 px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                  SUNDAY CLUB
                </div>
              </div>
            </div>

            {/* Distribution & Services */}
            <div className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all transform hover:scale-105">
              <div className="h-64 bg-cover bg-center bg-no-repeat relative"
                   style={{ 
                     backgroundImage: 'url(/images/community-distribution-bags.jpg)',
                     background: 'url(/images/community-distribution-bags.jpg), linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
                   }}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="w-5 h-5 text-red-400" />
                  <span className="text-sm font-semibold">Community Service</span>
                </div>
                <h3 className="text-xl font-bold mb-2">BRGY. TUBIGAN</h3>
                <p className="text-sm text-white/90">Access essential services and participate in community distribution programs.</p>
              </div>
              <div className="absolute top-4 left-4">
                <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse shadow-lg">
                  NEW
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-yellow-300 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-pink-300 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-white/90 mb-8 leading-relaxed">
            Join our community portal today! Register to access events, announcements, 
            and connect with your fellow residents. Your journey starts here!
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={onShowRegister}
              className="px-10 py-5 bg-white text-blue-600 font-bold text-lg rounded-xl hover:bg-gray-100 transition-all transform hover:scale-105 shadow-2xl hover:shadow-3xl flex items-center gap-3"
            >
              <Sparkles className="w-6 h-6" />
              Register Now
              <ArrowRight className="w-6 h-6" />
            </button>
            <button
              onClick={onShowLogin}
              className="px-10 py-5 bg-white/20 backdrop-blur-md hover:bg-white/30 text-white font-bold text-lg rounded-xl transition-all border-2 border-white/30"
            >
              Login to Portal
            </button>
          </div>
        </div>
      </section>

      {/* Document Request Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Request Documents</h2>
            <p className="text-xl text-gray-700">
              Need barangay documents? Request them online without creating an account!
            </p>
          </div>

          {!showDocumentRequest ? (
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              <p className="text-gray-600 mb-6">Select the document you need to request:</p>
              <div className="grid md:grid-cols-3 gap-4">
                <button
                  onClick={() => {
                    setShowDocumentRequest(true);
                    setDocumentRequestForm({ ...documentRequestForm, paper_type: 'barangay_clearance' });
                  }}
                  className="p-6 border-2 border-blue-500 rounded-xl hover:bg-blue-50 transition-colors text-left"
                >
                  <FileText className="w-8 h-8 text-blue-600 mb-3" />
                  <h3 className="font-bold text-gray-800 mb-2">Barangay Clearance</h3>
                  <p className="text-sm text-gray-600">Request a barangay clearance certificate</p>
                </button>
                <button
                  onClick={() => {
                    setShowDocumentRequest(true);
                    setDocumentRequestForm({ ...documentRequestForm, paper_type: 'certificate_of_indigency' });
                  }}
                  className="p-6 border-2 border-blue-500 rounded-xl hover:bg-blue-50 transition-colors text-left"
                >
                  <FileText className="w-8 h-8 text-blue-600 mb-3" />
                  <h3 className="font-bold text-gray-800 mb-2">Certificate of Indigency</h3>
                  <p className="text-sm text-gray-600">Request a certificate of indigency</p>
                </button>
                <button
                  onClick={() => {
                    setShowDocumentRequest(true);
                    setDocumentRequestForm({ ...documentRequestForm, paper_type: 'proof_of_residency' });
                  }}
                  className="p-6 border-2 border-blue-500 rounded-xl hover:bg-blue-50 transition-colors text-left"
                >
                  <FileText className="w-8 h-8 text-blue-600 mb-3" />
                  <h3 className="font-bold text-gray-800 mb-2">Proof of Residency</h3>
                  <p className="text-sm text-gray-600">Request a proof of residency document</p>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Document Request Form</h3>
                <button
                  onClick={() => {
                    setShowDocumentRequest(false);
                    setDocumentRequestForm({
                      paper_type: '',
                      requester_name: '',
                      requester_email: '',
                      requester_phone: '',
                      requester_address: '',
                      payment_method: 'cash',
                    });
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={documentRequestForm.requester_name}
                    onChange={(e) => setDocumentRequestForm({ ...documentRequestForm, requester_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={documentRequestForm.requester_email}
                    onChange={(e) => setDocumentRequestForm({ ...documentRequestForm, requester_email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    value={documentRequestForm.requester_phone}
                    onChange={(e) => setDocumentRequestForm({ ...documentRequestForm, requester_phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                  <textarea
                    value={documentRequestForm.requester_address}
                    onChange={(e) => setDocumentRequestForm({ ...documentRequestForm, requester_address: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="payment_method"
                        checked={documentRequestForm.payment_method === 'cash'}
                        onChange={() => setDocumentRequestForm({ ...documentRequestForm, payment_method: 'cash' })}
                      />
                      <span>Cash (Pay at barangay office)</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="payment_method"
                        checked={documentRequestForm.payment_method === 'online'}
                        onChange={() => setDocumentRequestForm({ ...documentRequestForm, payment_method: 'online' })}
                      />
                      <span>Online Payment</span>
                    </label>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    if (!documentRequestForm.requester_name || !documentRequestForm.requester_email || !documentRequestForm.requester_phone || !documentRequestForm.requester_address) {
                      alert('Please fill in all required fields.');
                      return;
                    }
                    setRequestLoading(true);
                    try {
                      const paymentCode = documentRequestForm.payment_method === 'online' 
                        ? `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}` 
                        : null;
                      const { error } = await supabase.from('paper_requests').insert({
                        resident_id: null,
                        paper_type: documentRequestForm.paper_type,
                        requester_name: documentRequestForm.requester_name,
                        requester_email: documentRequestForm.requester_email,
                        requester_phone: documentRequestForm.requester_phone,
                        requester_address: documentRequestForm.requester_address,
                        status: 'pending',
                        payment_status: documentRequestForm.payment_method === 'online' ? 'pending' : 'cash_pending',
                        payment_code: paymentCode,
                      });
                      if (error) throw error;
                      alert(
                        documentRequestForm.payment_method === 'online' 
                          ? `Request submitted successfully! Your payment code is: ${paymentCode}` 
                          : 'Request submitted successfully! Please pay at the barangay office.'
                      );
                      setShowDocumentRequest(false);
                      setDocumentRequestForm({
                        paper_type: '',
                        requester_name: '',
                        requester_email: '',
                        requester_phone: '',
                        requester_address: '',
                        payment_method: 'cash',
                      });
                    } catch (error) {
                      console.error('Error submitting request:', error);
                      alert('Failed to submit request. Please try again.');
                    } finally {
                      setRequestLoading(false);
                    }
                  }}
                  disabled={requestLoading}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {requestLoading ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-bold mb-4">Barangay Tubigan Florinda</h3>
              <p className="text-gray-400 text-sm">
                Your trusted community information and services portal. 
                Building stronger connections, one resident at a time.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li className="hover:text-white transition-colors cursor-pointer">Upcoming Events</li>
                <li className="hover:text-white transition-colors cursor-pointer">News & Announcements</li>
                <li className="hover:text-white transition-colors cursor-pointer">Officials Directory</li>
                <li className="hover:text-white transition-colors cursor-pointer">Community Services</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-4">Stay Connected</h3>
              <p className="text-gray-400 text-sm mb-4">
                Follow us for the latest updates and community news.
              </p>
              <div className="flex items-center gap-2">
                <span className="text-yellow-400 text-sm font-semibold">#BIÑANENSE MAHAL KO KAYO!</span>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400 text-sm">
            <p>&copy; 2024 Barangay Tubigan Florinda. All rights reserved.</p>
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

