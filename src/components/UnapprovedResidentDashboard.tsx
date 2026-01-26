import { useState, useEffect } from 'react';
import { supabase, Profile } from '../lib/supabase';
import { LogOut, Calendar, Newspaper, Users, Clock, Mail, MapPin, CheckCircle } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  location: string;
  created_at: string;
}

interface News {
  id: string;
  title: string;
  content: string;
  image_url: string;
  published: boolean;
  created_at: string;
}

interface Official {
  id: string;
  name: string;
  position: string;
}

interface UnapprovedResidentDashboardProps {
  currentUser: Profile;
  onLogout: () => void;
  onApprovalStatusChange: () => void;
}

export function UnapprovedResidentDashboard({
  currentUser,
  onLogout,
  onApprovalStatusChange,
}: UnapprovedResidentDashboardProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [officials, setOfficials] = useState<Official[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'status' | 'events' | 'news' | 'officials'>('status');
  const [checkingApproval, setCheckingApproval] = useState(false);

  useEffect(() => {
    fetchEvents();
    fetchNews();
    fetchOfficials();
    checkApprovalStatus();
    
    // Check approval status every 30 seconds
    const interval = setInterval(() => {
      checkApprovalStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true })
        .limit(10);

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const fetchNews = async () => {
    try {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setNews(data || []);
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOfficials = async () => {
    try {
      const { data, error } = await supabase
        .from('officials')
        .select('name, position')
        .order('position', { ascending: true });

      if (error) {
        // If officials table doesn't exist, use empty array
        console.warn('Officials table not found or error:', error);
        setOfficials([]);
        return;
      }
      setOfficials(data || []);
    } catch (error) {
      console.error('Error fetching officials:', error);
      setOfficials([]);
    }
  };

  const checkApprovalStatus = async () => {
    setCheckingApproval(true);
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('is_approved')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (error) throw error;
      
      if (profileData?.is_approved) {
        // User has been approved, trigger refresh
        onApprovalStatusChange();
      }
    } catch (error) {
      console.error('Error checking approval status:', error);
    } finally {
      setCheckingApproval(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Barangay Community Portal</h1>
              <p className="text-sm text-gray-600">Welcome, {currentUser.full_name}</p>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('status')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'status'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Status
              </div>
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'events'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Upcoming Events
              </div>
            </button>
            <button
              onClick={() => setActiveTab('news')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'news'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Newspaper className="w-4 h-4" />
                News & Announcements
              </div>
            </button>
            <button
              onClick={() => setActiveTab('officials')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'officials'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Officials
              </div>
            </button>
          </nav>
        </div>

        {activeTab === 'status' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl shadow-sm border border-orange-200 p-8">
              <div className="flex items-start gap-4">
                <div className="p-4 bg-orange-100 rounded-lg">
                  <Clock className="w-8 h-8 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Account Status</h2>
                  <div className="mb-4">
                    <span className="inline-block px-4 py-2 bg-orange-100 text-orange-800 rounded-full font-semibold text-lg">
                      Pending Approval
                    </span>
                  </div>
                  <p className="text-gray-700 mb-4">
                    Your registration is currently pending approval by an administrator. 
                    You can view upcoming events, news, and announcements while you wait.
                  </p>
                  <div className="bg-white rounded-lg p-4 mb-4 border border-orange-200">
                    <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <Mail className="w-5 h-5 text-blue-600" />
                      Email Notification
                    </h3>
                    <p className="text-sm text-gray-600">
                      You will receive an email notification at <strong>{currentUser.email}</strong> once your account has been approved.
                      Once approved, you'll have full access to the community portal features.
                    </p>
                  </div>
                  <button
                    onClick={checkApprovalStatus}
                    disabled={checkingApproval}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {checkingApproval ? 'Checking...' : 'Check Approval Status'}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">Registration Date</h3>
                    <p className="text-sm text-gray-600">
                      {new Date(currentUser.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <MapPin className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">Your Address</h3>
                    <p className="text-sm text-gray-600">{currentUser.address}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'events' && (
          <div className="space-y-6">
            {loading ? (
              <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading events...</p>
              </div>
            ) : events.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">No Upcoming Events</h3>
                <p className="text-gray-500">Check back later for upcoming barangay events.</p>
              </div>
            ) : (
              events.map((event) => (
                <div key={event.id} className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <Calendar className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-800 mb-2">{event.title}</h3>
                        <p className="text-gray-600 mb-4">{event.description}</p>
                        <div className="flex flex-wrap gap-4 text-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {new Date(event.event_date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <MapPin className="w-4 h-4" />
                              <span>{event.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'news' && (
          <div className="space-y-6">
            {loading ? (
              <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading news...</p>
              </div>
            ) : news.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                <Newspaper className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">No News Available</h3>
                <p className="text-gray-500">Check back later for barangay news and announcements.</p>
              </div>
            ) : (
              news.map((item) => (
                <div key={item.id} className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-64 object-cover"
                    />
                  )}
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-green-100 rounded-lg">
                        <Newspaper className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-800 mb-2">{item.title}</h3>
                        <p className="text-sm text-gray-500 mb-4">
                          {new Date(item.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                        <p className="text-gray-600 whitespace-pre-wrap">{item.content}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'officials' && (
          <div className="space-y-6">
            {officials.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">No Officials Listed</h3>
                <p className="text-gray-500">Officials information will be displayed here once available.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border">
                <div className="p-6 border-b">
                  <h2 className="text-xl font-bold text-gray-800">Barangay Officials</h2>
                </div>
                <div className="divide-y divide-gray-200">
                  {officials.map((official) => (
                    <div key={official.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 rounded-lg">
                          <Users className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-800">{official.name}</h3>
                          <p className="text-sm text-gray-600">{official.position}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

