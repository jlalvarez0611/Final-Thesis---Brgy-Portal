import { useState, useEffect } from 'react';
import { supabase, Profile } from '../lib/supabase';
import { LogOut, Calendar, Newspaper, Users, Clock, Mail, MapPin, CheckCircle, XCircle } from 'lucide-react';
import { EventsNewsHeading } from './EventsNewsHeading';
import { LucideIconByName, NEWS_EVENTS_LIST_STYLES } from '../lib/newsEventIcons';

interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  location: string;
  created_at: string;
  icon_name?: string | null;
  audience?: 'residents' | 'officials' | null;
  pinned?: boolean;
  pinned_at?: string | null;
}

interface News {
  id: string;
  title: string;
  content: string;
  image_url?: string | null;
  icon_name?: string | null;
  published: boolean;
  pinned?: boolean;
  pinned_at?: string | null;
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

const NEWS_VISIBLE_DAYS = 7;

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
  const [registrationStatus, setRegistrationStatus] = useState<'pending' | 'rejected'>(() =>
    currentUser.registration_status === 'rejected' ? 'rejected' : 'pending',
  );
  const [eventsAudienceTab, setEventsAudienceTab] = useState<'residents' | 'officials'>('residents');

  const eventAudience = (e: Event) => (e.audience === 'officials' ? 'officials' : 'residents');

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
      const base = supabase.from('events').select('*').gte('event_date', new Date().toISOString());

      let res = await base
        .order('pinned', { ascending: false })
        .order('pinned_at', { ascending: false })
        .order('event_date', { ascending: true })
        .limit(25);

      if (res.error && (res.error as { code?: string }).code === '42703') {
        res = await base.order('event_date', { ascending: true }).limit(25);
      }

      if (res.error) throw res.error;
      setEvents(res.data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const fetchNews = async () => {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - NEWS_VISIBLE_DAYS);
      const base = supabase
        .from('news')
        .select('*')
        .eq('published', true)
        .gte('created_at', cutoff.toISOString());

      let res = await base
        .order('pinned', { ascending: false })
        .order('pinned_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(25);

      if (res.error && (res.error as any).code === '42703') {
        res = await base.order('created_at', { ascending: false }).limit(25);
      }

      if (res.error) throw res.error;
      setNews(res.data || []);
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
        .select('id, name, position')
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
        .select('is_approved, registration_status')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (error) throw error;

      if (profileData?.registration_status === 'rejected') {
        setRegistrationStatus('rejected');
      } else {
        setRegistrationStatus('pending');
      }

      if (profileData?.is_approved) {
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

      <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-8 py-6">
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
            {registrationStatus === 'rejected' ? (
              <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-xl shadow-sm border border-red-200 p-8">
                <div className="flex items-start gap-4">
                  <div className="p-4 bg-red-100 rounded-lg">
                    <XCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Registration not approved</h2>
                    <div className="mb-4">
                      <span className="inline-block px-4 py-2 bg-red-100 text-red-800 rounded-full font-semibold text-lg">
                        Rejected
                      </span>
                    </div>
                    <p className="text-gray-700 mb-4">
                      Your registration was not approved. A message was sent to <strong>{currentUser.email}</strong> with this update.
                      If you believe this is a mistake, please contact the barangay office.
                    </p>
                    <button
                      onClick={checkApprovalStatus}
                      disabled={checkingApproval}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:bg-gray-400"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {checkingApproval ? 'Checking...' : 'Refresh status'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
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
                        Email notification
                      </h3>
                      <p className="text-sm text-gray-600">
                        You will receive an email at <strong>{currentUser.email}</strong> when your account is approved or if your registration is not approved.
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
            )}

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
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 bg-white rounded-xl shadow-sm border p-4 sm:p-5">
              <EventsNewsHeading
                variant="events"
                title="Upcoming Events"
                subtitle="Community and officials-only schedules"
              />
              <div className="flex justify-end shrink-0">
                <div className="flex rounded-lg border border-gray-200 p-0.5 w-fit">
                <button
                  type="button"
                  onClick={() => setEventsAudienceTab('residents')}
                  className={`px-4 py-2 text-sm font-medium rounded-md ${
                    eventsAudienceTab === 'residents' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Community
                </button>
                <button
                  type="button"
                  onClick={() => setEventsAudienceTab('officials')}
                  className={`px-4 py-2 text-sm font-medium rounded-md ${
                    eventsAudienceTab === 'officials' ? 'bg-violet-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Officials
                </button>
                </div>
              </div>
            </div>
            {loading ? (
              <div className="bg-white rounded-xl shadow-sm border p-12 text-center min-h-[280px] flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading events...</p>
              </div>
            ) : (() => {
                const list = events.filter((e) => eventAudience(e) === eventsAudienceTab);
                if (list.length === 0) {
                  return (
                    <div className="bg-white rounded-xl shadow-sm border p-12 text-center min-h-[280px] flex flex-col items-center justify-center">
                      <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-600 mb-2">No upcoming events</h3>
                      <p className="text-gray-500">
                        {events.length === 0
                          ? 'Check back later for barangay events.'
                          : eventsAudienceTab === 'officials'
                            ? 'No officials-only events scheduled.'
                            : 'No community events scheduled.'}
                      </p>
                    </div>
                  );
                }
                return (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {list.map((event) => (
                      <div
                        key={event.id}
                        className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 min-h-[180px] flex flex-col hover:border-slate-300 transition-colors"
                      >
                        <div className="flex-1 min-w-0 flex flex-col">
                          <div className="flex justify-center mb-3">
                            <div className={NEWS_EVENTS_LIST_STYLES.eventIconBox}>
                              <LucideIconByName
                                name={event.icon_name}
                                kind="event"
                                className={NEWS_EVENTS_LIST_STYLES.eventIconGlyph}
                              />
                            </div>
                          </div>
                          <div className="text-center">
                            <h3 className="text-xl font-bold text-gray-800 leading-snug">{event.title}</h3>
                            <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                              <span
                                className={`px-2 py-1 text-xs font-bold rounded-full ${
                                  eventAudience(event) === 'officials'
                                    ? 'bg-violet-100 text-violet-800'
                                    : 'bg-sky-100 text-sky-800'
                                }`}
                              >
                                {eventAudience(event) === 'officials' ? 'Officials' : 'Community'}
                              </span>
                              {event.pinned && (
                                <span className="px-2 py-1 text-xs font-bold rounded-full bg-yellow-100 text-yellow-800">
                                  Pinned
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-gray-900 mt-3 text-base leading-relaxed whitespace-pre-wrap line-clamp-[12] flex-1 text-left font-medium">
                            {event.description}
                          </p>
                          <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-600 justify-center">
                            <span>{new Date(event.event_date).toLocaleString()}</span>
                            {event.location && <span>📍 {event.location}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
          </div>
        )}

        {activeTab === 'news' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-5">
              <EventsNewsHeading
                variant="news"
                title="News & Announcements"
                subtitle="Latest barangay news and announcements"
              />
            </div>
            {loading ? (
              <div className="bg-white rounded-xl shadow-sm border p-12 text-center min-h-[280px] flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading news...</p>
              </div>
            ) : news.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border p-12 text-center min-h-[280px] flex flex-col items-center justify-center">
                <Newspaper className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">No News Available</h3>
                <p className="text-gray-500">Check back later for barangay news and announcements.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {news.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 min-h-[180px] flex flex-col hover:border-slate-300 transition-colors"
                  >
                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="flex justify-center mb-3">
                        {!item.icon_name && item.image_url ? (
                          <div className="w-12 h-12 rounded-lg overflow-hidden border border-violet-200/90 shadow-sm ring-1 ring-violet-100">
                            <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className={NEWS_EVENTS_LIST_STYLES.newsIconBox}>
                            <LucideIconByName
                              name={item.icon_name}
                              kind="news"
                              className={NEWS_EVENTS_LIST_STYLES.newsIconGlyph}
                            />
                          </div>
                        )}
                      </div>
                      <div className="text-center">
                        <h3 className="text-xl font-bold text-gray-800 leading-snug">{item.title}</h3>
                        <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                          {item.pinned && (
                            <span className="px-2 py-1 text-xs font-bold rounded-full bg-yellow-100 text-yellow-800">
                              Pinned
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-900 mt-3 text-base leading-relaxed whitespace-pre-wrap line-clamp-[12] flex-1 text-left font-medium">
                        {item.content}
                      </p>
                      <p className="text-xs text-gray-500 mt-3 text-center">
                        {new Date(item.created_at).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
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

