import { useState, useEffect, useRef } from 'react';
import { supabase, Profile } from '../lib/supabase';
import { LogOut, User, Calendar, Newspaper, ArrowLeft, Users2, FileText, Building2, Trash2, ExternalLink, Download } from 'lucide-react';
import { ResidentCalendar } from './ResidentCalendar';
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
interface Official { id: string; name: string; position: string; image_url?: string | null; }
interface PaperRequest {
  id: string;
  resident_id: string;
  paper_type: 'barangay_clearance' | 'certificate_of_indigency' | 'proof_of_residency';
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  payment_status: 'pending' | 'paid' | 'cash_pending';
  payment_code?: string | null;
  receipt_url?: string | null;
  document_url?: string | null;
  created_at: string;
  updated_at?: string | null;
}
interface Facility { id: string; name: string; description?: string; capacity?: number; created_at: string; }
interface FacilityBooking { id: string; facility_id: string; resident_id: string; booking_date: string; duration_hours?: number; duration_minutes?: number; status: 'pending' | 'approved' | 'rejected' | 'cancelled'; created_at: string; }
interface TransparencyItem {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  file_url?: string | null;
  published: boolean;
  pinned?: boolean;
  pinned_at?: string | null;
  created_at: string;
}

interface ResidentDashboardProps { currentUser: Profile; onLogout: () => void; onProfileUpdate: (profile: Profile) => void; onBackToLanding?: () => void; }

const NEWS_VISIBLE_DAYS = 7;

export function ResidentDashboard({ currentUser, onLogout, onProfileUpdate, onBackToLanding }: ResidentDashboardProps) {
  const buildFormDataFromProfile = (profile: Profile) => ({
    full_name: profile.full_name || '',
    first_name: profile.first_name || '',
    middle_name: profile.middle_name || '',
    last_name: profile.last_name || '',
    suffix: profile.suffix || '',
    sex: profile.sex || '',
    date_of_birth: profile.date_of_birth || '',
    place_of_birth: profile.place_of_birth || '',
    civil_status: profile.civil_status || '',
    nationality: profile.nationality || '',
    mobile_number: profile.mobile_number || '',
    username: profile.username || '',
    email: profile.email || '',
    address: profile.address || '',
    contact_number: profile.contact_number || '',
  });

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [transparencyItems, setTransparencyItems] = useState<TransparencyItem[]>([]);
  const [officials, setOfficials] = useState<Official[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [paperRequests, setPaperRequests] = useState<PaperRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'profile' | 'events' | 'news' | 'officials' | 'papers' | 'facilities' | 'calendar' | 'transparency'>('events');
  const [canGoBack, setCanGoBack] = useState(false);
  const historyInitialized = useRef(false);
  const [selectedNews, setSelectedNews] = useState<News | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [selectedOfficial, setSelectedOfficial] = useState<Official | null>(null);
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<string | undefined>(undefined);
  const [eventsAudienceTab, setEventsAudienceTab] = useState<'residents' | 'officials'>('residents');
  const [facilityBookings, setFacilityBookings] = useState<FacilityBooking[]>([]);
  const [myFacilityBookings, setMyFacilityBookings] = useState<(FacilityBooking & { facility_name?: string })[]>([]);
  const [formData, setFormData] = useState(buildFormDataFromProfile(currentUser));
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingHour, setBookingHour] = useState('12');
  const [bookingMinute, setBookingMinute] = useState('0');
  const [bookingAMPM, setBookingAMPM] = useState<'AM' | 'PM'>('AM');
  const [bookingDurationHours, setBookingDurationHours] = useState('0'); // Default 0 hours
  const [bookingDurationMinutes, setBookingDurationMinutes] = useState('0'); // Default 0 minutes
  const [bookingCalendarMonth, setBookingCalendarMonth] = useState(new Date());
  const [timeOverlap, setTimeOverlap] = useState<string | null>(null);
  const [transparencyPdfViewer, setTransparencyPdfViewer] = useState<{ url: string; title: string } | null>(null);

  // Fetch bookings when facility is selected
  useEffect(() => {
    if (selectedFacility) {
      fetchFacilityBookings(selectedFacility.id);
      setBookingCalendarMonth(new Date());
      setBookingDate('');
      setBookingTime('');
      setBookingHour('12');
      setBookingMinute('0');
      setBookingAMPM('AM');
      setBookingDurationHours('0');
      setBookingDurationMinutes('0');
      setTimeOverlap(null);
    }
  }, [selectedFacility]);

  useEffect(() => {
    setFormData(buildFormDataFromProfile(currentUser));
  }, [currentUser]);

  // Update bookingTime when hour, minute, or AM/PM changes (convert 12-hour to 24-hour)
  useEffect(() => {
    let hour24 = parseInt(bookingHour) || 12;
    const minute = parseInt(bookingMinute) || 0;
    
    // Convert 12-hour to 24-hour format
    if (bookingAMPM === 'AM' && hour24 === 12) {
      hour24 = 0; // 12 AM = 00:00
    } else if (bookingAMPM === 'PM' && hour24 !== 12) {
      hour24 = hour24 + 12; // 1 PM = 13:00, etc.
    }
    
    const hourStr = String(hour24).padStart(2, '0');
    const minuteStr = String(minute).padStart(2, '0');
    setBookingTime(`${hourStr}:${minuteStr}`);
  }, [bookingHour, bookingMinute, bookingAMPM]);

  // Check for time overlap when date, time, or duration changes
  useEffect(() => {
    if (bookingDate && bookingTime && selectedFacility) {
      // Calculate overlap
      if (!selectedFacility) {
        setTimeOverlap(null);
        return;
      }
      
      const [year, month, day] = bookingDate.split('-').map(Number);
      const [hoursNum, minutesNum] = bookingTime.split(':').map(Number);
      const durationHours = parseInt(bookingDurationHours) || 0;
      const durationMinutes = parseInt(bookingDurationMinutes) || 0;
      const totalMinutes = durationHours * 60 + durationMinutes;
      
      const bookingStart = new Date(year, month - 1, day, hoursNum, minutesNum, 0, 0);
      const bookingEnd = new Date(bookingStart);
      bookingEnd.setMinutes(bookingEnd.getMinutes() + totalMinutes);
      
      // Check against existing bookings for the same facility
      const overlappingBookings = facilityBookings
        .filter(booking => {
          if (booking.facility_id !== selectedFacility.id) return false;
          
          const existingStart = new Date(booking.booking_date);
          const existingDuration = booking.duration_minutes || (booking.duration_hours ? booking.duration_hours * 60 : 120);
          const existingEnd = new Date(existingStart);
          existingEnd.setMinutes(existingEnd.getMinutes() + existingDuration);
          
          // Check if there's overlap
          return (bookingStart < existingEnd && bookingEnd > existingStart);
        })
        .map(booking => {
          const existingStart = new Date(booking.booking_date);
          const existingDuration = booking.duration_minutes || (booking.duration_hours ? booking.duration_hours * 60 : 120);
          const existingEnd = new Date(existingStart);
          existingEnd.setMinutes(existingEnd.getMinutes() + existingDuration);
          return {
            start: existingStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
            end: existingEnd.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
            status: booking.status
          };
        });
      
      if (overlappingBookings.length > 0) {
        const conflicts = overlappingBookings.map(b => `${b.start} - ${b.end} (${b.status})`).join(', ');
        setTimeOverlap(`Time conflict detected! The facility is already booked during: ${conflicts}. Please choose a different time.`);
      } else {
        setTimeOverlap(null);
      }
    } else {
      setTimeOverlap(null);
    }
  }, [bookingDate, bookingTime, bookingDurationHours, bookingDurationMinutes, facilityBookings, selectedFacility]);

  useEffect(() => {
    fetchEvents();
    fetchNews();
    fetchTransparencyItems();
    fetchOfficials();
    fetchFacilities();
    fetchPaperRequests();
    fetchMyFacilityBookings();

    if (!historyInitialized.current) {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab') || 'events';
      const validTabs = ['events', 'news', 'profile', 'officials', 'papers', 'facilities', 'calendar', 'transparency'];
      const initialTab = validTabs.includes(tabParam) ? (tabParam as any) : 'events';

      const currentState = window.history.state;
      if (!currentState || !currentState.dashboard) {
        setActiveTab(initialTab);
        window.history.replaceState({ tab: initialTab, dashboard: true, initial: initialTab === 'events' }, '', `/dashboard?tab=${initialTab}`);
      } else {
        if (currentState.tab && validTabs.includes(currentState.tab)) {
          setActiveTab(currentState.tab as any);
        } else {
          setActiveTab(initialTab);
        }
      }
      historyInitialized.current = true;
    }

    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
      const currentPath = window.location.pathname;
      
      // If navigating away from dashboard (e.g., to /landing), let App.tsx handle it
      // Don't interfere with navigation to landing page
      if (currentPath === '/landing' || currentPath === '/') {
        // Navigating to landing page, let App.tsx handle it - don't prevent default
        return;
      }
      
      if (currentPath !== '/dashboard' && !currentPath.includes('dashboard')) {
        // User is navigating away from dashboard to another route, let the browser navigate
        return;
      }
      
      if (state && state.dashboard) {
        if (state.tab && ['events', 'news', 'profile', 'officials', 'papers', 'facilities', 'calendar', 'transparency'].includes(state.tab)) {
          setActiveTab(state.tab as any);
        }
        updateBackButtonState();
      } else {
        // No dashboard state (likely external/back navigation). Restore tab from URL only.
        const urlParams = new URLSearchParams(window.location.search);
        const tabParam = urlParams.get('tab') || 'events';
        if (['events', 'news', 'profile', 'officials', 'papers', 'facilities', 'calendar', 'transparency'].includes(tabParam)) {
          setActiveTab(tabParam as any);
        }
        updateBackButtonState();
      }
    };

    window.addEventListener('popstate', handlePopState);
    updateBackButtonState();

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateBackButtonState = () => {
    setCanGoBack(true);
  };

  const handleTabChange = (tab: 'profile' | 'events' | 'news' | 'officials' | 'papers' | 'facilities' | 'calendar' | 'transparency') => {
    setActiveTab(tab);
    window.history.pushState({ tab, dashboard: true, initial: false }, '', `/dashboard?tab=${tab}`);
    updateBackButtonState();
  };

  const fetchOfficials = async () => {
    try {
      // Use * so we get image_url when column exists, without failing when it doesn't
      const { data, error } = await supabase.from('officials').select('*').order('position', { ascending: true });
      if (error) {
        console.error('Error fetching officials:', error);
        setOfficials([]);
        return;
      }
      setOfficials(data || []);
    } catch (error) {
      console.error('Error fetching officials:', error);
      setOfficials([]);
    }
  };

  const handleBrowserBack = () => { window.history.back(); };

  const eventAudience = (e: Event) => (e.audience === 'officials' ? 'officials' : 'residents');

  const fetchEvents = async () => {
    try {
      const base = supabase
        .from('events')
        .select('*')
        .gte('event_date', new Date().toISOString());

      // Prefer pinned ordering if columns exist; fallback automatically if not migrated yet.
      let res = await base
        .order('pinned', { ascending: false })
        .order('pinned_at', { ascending: false })
        .order('event_date', { ascending: true });

      if (res.error && (res.error as any).code === '42703') {
        res = await base.order('event_date', { ascending: true });
      }

      if (res.error) throw res.error;
      setEvents(res.data || []);
    } catch (error) { console.error('Error fetching events:', error); }
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

      // Prefer pinned ordering if columns exist; fallback automatically if not migrated yet.
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
    } catch (error) { console.error('Error fetching news:', error); }
  };

  const fetchFacilities = async () => {
    try {
      const { data, error } = await supabase.from('facilities').select('*').order('name', { ascending: true });
      if (error) { setFacilities([]); return; }
      setFacilities(data || []);
    } catch (error) { setFacilities([]); }
  };

  const fetchTransparencyItems = async () => {
    try {
      const { data, error } = await supabase
        .from('transparency_items')
        .select('*')
        .eq('published', true)
        .order('pinned', { ascending: false })
        .order('pinned_at', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) {
        console.warn('Transparency items table not found:', error);
        setTransparencyItems([]);
        return;
      }
      setTransparencyItems(data || []);
    } catch (error) {
      console.error('Error fetching transparency items:', error);
      setTransparencyItems([]);
    }
  };

  const fetchFacilityBookings = async (facilityId?: string) => {
    try {
      // Fetch both approved and pending bookings to check for overlaps
      let query = supabase.from('facility_bookings').select('*').in('status', ['approved', 'pending']);
      if (facilityId) query = query.eq('facility_id', facilityId);
      const { data, error } = await query.order('booking_date', { ascending: true });
      if (error) { setFacilityBookings([]); return; }
      setFacilityBookings(data || []);
    } catch (error) { setFacilityBookings([]); }
  };

  const fetchPaperRequests = async () => {
    try {
      const { data, error } = await supabase.from('paper_requests').select('*').eq('resident_id', currentUser.id).order('created_at', { ascending: false });
      if (error) { setPaperRequests([]); return; }
      setPaperRequests(data || []);
    } catch (error) { setPaperRequests([]); }
  };

  const fetchMyFacilityBookings = async () => {
    try {
      const { data, error } = await supabase.from('facility_bookings').select(`
          *,
          facilities:facility_id ( name )
        `).eq('resident_id', currentUser.id).neq('status', 'cancelled').order('booking_date', { ascending: false });
      if (error) { setMyFacilityBookings([]); return; }
      const bookingsWithNames = (data || []).map((booking: any) => ({ ...booking, facility_name: booking.facilities?.name || 'Unknown Facility' }));
      setMyFacilityBookings(bookingsWithNames);
    } catch (error) { setMyFacilityBookings([]); }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const computedFullName = `${formData.first_name} ${formData.middle_name ? `${formData.middle_name} ` : ''}${formData.last_name}${formData.suffix ? ` ${formData.suffix}` : ''}`.trim();
      const finalFullName = computedFullName || formData.full_name;

      const { data, error } = await supabase.from('profiles').update({
        full_name: finalFullName,
        first_name: formData.first_name,
        middle_name: formData.middle_name,
        last_name: formData.last_name,
        suffix: formData.suffix,
        sex: formData.sex,
        date_of_birth: formData.date_of_birth || null,
        place_of_birth: formData.place_of_birth,
        civil_status: formData.civil_status,
        nationality: formData.nationality,
        mobile_number: formData.mobile_number,
        username: formData.username,
        email: formData.email,
        address: formData.address,
        contact_number: formData.contact_number,
      }).eq('id', currentUser.id).select().single();
      if (error) throw error;
      onProfileUpdate(data);
      setIsEditing(false);
    } catch (error) {
      alert('Failed to update profile');
    } finally { setLoading(false); }
  };

  const handleCancel = () => {
    setFormData(buildFormDataFromProfile(currentUser));
    setIsEditing(false);
  };

  const handlePaperRequest = async (paperType: 'barangay_clearance' | 'certificate_of_indigency' | 'proof_of_residency', paymentMethod: 'online' | 'cash') => {
    try {
      setLoading(true);
      const paymentCode = paymentMethod === 'online' ? `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}` : null;
      const { error } = await supabase.from('paper_requests').insert({
        resident_id: currentUser.id, // Will be null if not authenticated, but currentUser should always exist in ResidentDashboard
        paper_type: paperType,
        status: 'pending',
        payment_status: paymentMethod === 'online' ? 'pending' : 'cash_pending',
        payment_code: paymentCode,
      }).select().single();
      if (error) throw error;
      await fetchPaperRequests();
      alert(paymentMethod === 'online' ? `Request submitted! Your payment code is: ${paymentCode}` : 'Request submitted!');
    } catch (error) {
      alert('Failed to submit request. Please try again.');
    } finally { setLoading(false); }
  };

  const handleFacilityBooking = async (facilityId: string, bookingDate: string, bookingTime: string, hours: string, minutes: string) => {
    try {
      setLoading(true);
      
      // Check for overlap before submitting (double-check in case button was clicked before state updated)
      if (timeOverlap) {
        alert(timeOverlap);
        setLoading(false);
        return;
      }
      
      // Validate inputs
      if (!bookingDate || !bookingTime) {
        alert('Please select a booking date and time.');
        setLoading(false);
        return;
      }
      
      // Parse date and time components
      const [year, month, day] = bookingDate.split('-').map(Number);
      const [hoursNum, minutesNum] = bookingTime.split(':').map(Number);
      
      // Validate parsed values
      if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hoursNum) || isNaN(minutesNum)) {
        alert('Invalid date or time format. Please try again.');
        setLoading(false);
        return;
      }
      
      // Create date object in local timezone, then convert to ISO string
      // This preserves the user's intended time
      const localDate = new Date(year, month - 1, day, hoursNum, minutesNum, 0, 0);
      const bookingDateTime = localDate.toISOString();
      
      // Calculate total duration in minutes
      const durationHoursNum = parseInt(hours) || 0;
      const durationMinutesNum = parseInt(minutes) || 0;
      const totalMinutes = durationHoursNum * 60 + durationMinutesNum;
      
      // Validate duration
      if (totalMinutes <= 0) {
        alert('Please select a duration of at least 15 minutes.');
        setLoading(false);
        return;
      }
      
      // Store only whole hours (as INTEGER) since we have duration_minutes for the remainder
      const durationHours = durationHoursNum; // Store as integer, not decimal
      
      // Try inserting with duration_minutes first, fallback to duration_hours only if column doesn't exist
      let insertData: any = {
        facility_id: facilityId,
        resident_id: currentUser.id,
        booking_date: bookingDateTime,
        status: 'pending',
      };
      
      // Try to include duration fields
      insertData.duration_hours = durationHours;
      insertData.duration_minutes = totalMinutes;
      
      const { error } = await supabase.from('facility_bookings').insert(insertData).select().single();
      
      if (error) {
        console.error('Booking error details:', error);
        // If error is about missing column, try without duration_minutes
        if (error.message?.includes('duration_minutes') || error.message?.includes('column') || error.code === '42703') {
          // Retry without duration_minutes (using whole hours only since duration_hours is INTEGER)
          const { error: retryError } = await supabase.from('facility_bookings').insert({
            facility_id: facilityId,
            resident_id: currentUser.id,
            booking_date: bookingDateTime,
            duration_hours: durationHours, // Already an integer
            status: 'pending',
          }).select().single();
          
          if (retryError) {
            console.error('Retry error:', retryError);
            throw retryError;
          }
          
          // Success on retry
          await fetchFacilityBookings(facilityId);
          await fetchMyFacilityBookings();
      setSelectedFacility(null);
      setBookingDate('');
      setBookingTime('');
      setBookingHour('12');
      setBookingMinute('0');
      setBookingAMPM('AM');
      setBookingDurationHours('0');
      setBookingDurationMinutes('0');
      setTimeOverlap(null);
      alert('Booking request submitted! Please wait for approval.\nNote: Please run the SQL migration to add duration_minutes column for full functionality.');
      return;
        }
        throw error;
      }
      
      await fetchFacilityBookings(facilityId);
      await fetchMyFacilityBookings();
      setSelectedFacility(null);
      setBookingDate('');
      setBookingTime('');
      setBookingHour('12');
      setBookingMinute('0');
      setBookingAMPM('AM');
      setBookingDurationHours('0');
      setBookingDurationMinutes('0');
      setTimeOverlap(null);
      alert('Booking request submitted! Please wait for approval.');
    } catch (error: any) {
      console.error('Booking submission error:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      const errorCode = error?.code || 'Unknown code';
      
      // Provide more specific error messages
      if (errorMessage.includes('permission') || errorMessage.includes('policy') || errorCode === '42501') {
        alert('Permission denied. Please make sure you are logged in and have permission to create bookings.');
      } else if (errorMessage.includes('duration_minutes') || errorMessage.includes('column')) {
        alert(`Database error: The duration_minutes column may not exist yet.\n\nPlease run the SQL migration file: supabase_fix_booking_cancel_policy.sql\n\nError: ${errorMessage}`);
      } else if (errorMessage.includes('foreign key') || errorMessage.includes('facility_id')) {
        alert('Invalid facility selected. Please try again.');
      } else {
        alert(`Failed to submit booking.\n\nError: ${errorMessage}\nCode: ${errorCode}\n\nPlease check the console for more details.`);
      }
    } finally { setLoading(false); }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) return;
    try {
      setLoading(true);
      console.log('Deleting booking:', bookingId);
      console.log('Current user ID:', currentUser.id);
      
      // Delete the booking directly - RLS policy should handle authorization
      const { data, error } = await supabase
        .from('facility_bookings')
        .delete()
        .eq('id', bookingId)
        .select();
      
      if (error) {
        console.error('Delete booking error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        
        // If delete fails, check if it's a permission issue
        if (error.code === '42501' || error.message?.toLowerCase().includes('permission') || error.message?.toLowerCase().includes('policy') || error.message?.toLowerCase().includes('row-level security') || error.message?.toLowerCase().includes('new row violates')) {
          alert('Permission denied. The database delete policy may need to be set up. Please contact admin.\n\nError Code: ' + error.code + '\nError: ' + error.message);
        } else {
          alert('Failed to delete booking: ' + error.message + '\n\nError Code: ' + error.code);
        }
        setLoading(false);
        return;
      }
      
      console.log('Delete successful, data:', data);
      
      // Refresh the bookings list immediately
      await fetchMyFacilityBookings();
      
      // Refresh facility bookings if a facility is selected
      if (selectedFacility) {
        await fetchFacilityBookings(selectedFacility.id);
      }
      
      // Force a state update by checking if booking was actually deleted
      setTimeout(async () => {
        const { data: checkData } = await supabase
          .from('facility_bookings')
          .select('id')
          .eq('id', bookingId)
          .single();
        
        if (checkData) {
          console.warn('Booking still exists after delete attempt');
        } else {
          console.log('Booking successfully deleted from database');
        }
      }, 500);
      
      alert('Booking cancelled and deleted successfully.');
    } catch (error: any) {
      console.error('Error cancelling booking:', error);
      alert(`Failed to cancel booking: ${error?.message || 'Please try again.'}\n\nPlease make sure the delete policy is set up in the database.`);
    } finally { 
      setLoading(false);
    }
  };

  // Helper function to check if a date is in the past
  const isDatePast = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  };

  // Get calendar days for the month
  const getCalendarDays = () => {
    const year = bookingCalendarMonth.getFullYear();
    const month = bookingCalendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    return days;
  };

  // Handle date click
  const handleDateClick = (date: Date | null) => {
    if (!date || isDatePast(date)) return;
    setBookingDate(date.toISOString().split('T')[0]);
    // Reset time to 12:00 AM when date is selected
    setBookingHour('12');
    setBookingMinute('0');
    setBookingAMPM('AM');
    setBookingTime('00:00');
  };

  // Navigate calendar months
  const navigateCalendarMonth = (direction: 'prev' | 'next') => {
    setBookingCalendarMonth(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
        // Don't allow navigating to months entirely in the past
        const today = new Date();
        today.setDate(1);
        today.setHours(0, 0, 0, 0);
        const firstOfNewMonth = new Date(newDate);
        firstOfNewMonth.setDate(1);
        firstOfNewMonth.setHours(0, 0, 0, 0);
        if (firstOfNewMonth < today) {
          return prev; // Don't navigate to past months
        }
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const handleDeletePaperRequest = async (requestId: string) => {
    try {
      setLoading(true);
      // Find the request first to verify it belongs to the user
      const { data: request, error: fetchError } = await supabase
        .from('paper_requests')
        .select('id, resident_id, status')
        .eq('id', requestId)
        .single();
      
      if (fetchError) {
        console.error('Error fetching request:', fetchError);
        throw new Error('Request not found');
      }

      if (!request) {
        throw new Error('Request not found');
      }

      // Verify it belongs to the current user
      if (request.resident_id !== currentUser.id) {
        alert('You can only delete your own requests.');
        return;
      }

      // Verify it's still pending
      if (request.status !== 'pending') {
        alert('You can only delete pending requests.');
        return;
      }

      // Now delete it
      const { error } = await supabase
        .from('paper_requests')
        .delete()
        .eq('id', requestId);
      
      if (error) {
        console.error('Delete error:', error);
        // Check if it's a permission error
        if (error.message?.includes('permission') || error.message?.includes('policy') || error.code === '42501') {
          alert('Delete permission denied. Please contact admin to set up delete permissions in the database.');
        } else {
          throw error;
        }
        return;
      }
      
      await fetchPaperRequests();
    } catch (error: any) {
      console.error('Error deleting request:', error);
      if (error.message === 'Request not found') {
        alert('Request not found.');
      } else {
        alert(`Failed to delete request: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {onBackToLanding && (
                <button onClick={onBackToLanding} className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all bg-blue-600 text-white hover:bg-blue-500 hover:shadow-lg" title="Back to home">
                  <ArrowLeft className="w-5 h-5" />
                  Back
                </button>
              )}
              {!onBackToLanding && (
                <button onClick={handleBrowserBack} disabled={!canGoBack} className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${canGoBack ? 'text-white hover:bg-blue-500 hover:shadow-lg' : 'text-blue-300 cursor-not-allowed opacity-50'}`} title={canGoBack ? 'Go back' : 'Cannot go back - would log you out'}>
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <div className="min-w-0">
                <h1 className="text-base sm:text-2xl font-bold text-gray-800 truncate">Barangay Resident Portal</h1>
                <p className="hidden sm:block text-sm text-gray-600 truncate">Welcome, {currentUser.full_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onLogout}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm sm:text-base"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('profile')}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg transition-colors font-medium text-sm sm:text-base ${
                  activeTab === 'profile'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-200'
                }`}
              >
                <User className={`w-4 h-4 shrink-0 ${activeTab === 'profile' ? 'text-white' : 'text-rose-600'}`} />
                <span className="hidden sm:inline">Profile</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-8 py-6">
        <div className="mb-10 border-b border-gray-200 bg-white rounded-lg shadow-sm">
          <nav className="flex items-center justify-start gap-y-2.5 gap-x-2 px-4 py-3 overflow-x-auto">
            <div className="flex gap-2.5 w-max min-w-full">
              <button
                type="button"
                onClick={() => handleTabChange('events')}
                className={`px-3 sm:px-5 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-semibold transition-all whitespace-nowrap ${activeTab === 'events' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
              >
                <span className="flex items-center gap-2.5">
                  <Calendar className={`w-5 h-5 shrink-0 ${activeTab === 'events' ? 'text-white' : 'text-green-600'}`} />
                  Events
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('news')}
                className={`px-3 sm:px-5 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-semibold transition-all whitespace-nowrap ${activeTab === 'news' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
              >
                <span className="flex items-center gap-2.5">
                  <Newspaper className={`w-5 h-5 shrink-0 ${activeTab === 'news' ? 'text-white' : 'text-purple-600'}`} />
                  News
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('officials')}
                className={`px-3 sm:px-5 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-semibold transition-all whitespace-nowrap ${activeTab === 'officials' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
              >
                <span className="flex items-center gap-2.5">
                  <Users2 className={`w-5 h-5 shrink-0 ${activeTab === 'officials' ? 'text-white' : 'text-indigo-600'}`} />
                  Officials
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('papers')}
                className={`px-3 sm:px-5 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-semibold transition-all whitespace-nowrap ${activeTab === 'papers' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
              >
                <span className="flex items-center gap-2.5">
                  <FileText className={`w-5 h-5 shrink-0 ${activeTab === 'papers' ? 'text-white' : 'text-orange-600'}`} />
                  Documents
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('facilities')}
                className={`px-3 sm:px-5 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-semibold transition-all whitespace-nowrap ${activeTab === 'facilities' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
              >
                <span className="flex items-center gap-2.5">
                  <Building2 className={`w-5 h-5 shrink-0 ${activeTab === 'facilities' ? 'text-white' : 'text-orange-600'}`} />
                  Facilities
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('transparency')}
                className={`px-3 sm:px-5 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-semibold transition-all whitespace-nowrap ${activeTab === 'transparency' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
              >
                <span className="flex items-center gap-2.5">
                  <FileText className={`w-5 h-5 shrink-0 ${activeTab === 'transparency' ? 'text-white' : 'text-slate-700'}`} />
                  Transparency
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('calendar')}
                className={`px-3 sm:px-5 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-semibold transition-all whitespace-nowrap ${
                  activeTab === 'calendar'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Calendar className={`w-5 h-5 shrink-0 ${activeTab === 'calendar' ? 'text-white' : 'text-blue-600'}`} />
                  Calendar
                </span>
              </button>
            </div>
          </nav>
        </div>

        {activeTab === 'events' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm min-h-[min(70vh,720px)] flex flex-col">
              <div className="px-4 sm:px-5 py-3 border-b border-slate-200 bg-slate-50 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <EventsNewsHeading
                  variant="events"
                  title="Upcoming Events"
                  subtitle="Community and officials-only schedules"
                />
                <div className="flex justify-end shrink-0">
                  <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setEventsAudienceTab('residents')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      eventsAudienceTab === 'residents'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Community
                  </button>
                  <button
                    type="button"
                    onClick={() => setEventsAudienceTab('officials')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      eventsAudienceTab === 'officials'
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Officials
                  </button>
                  </div>
                </div>
              </div>
              <div className="p-4 sm:p-5 flex-1 flex flex-col">
                {(() => {
                  const list = events.filter((e) => eventAudience(e) === eventsAudienceTab);
                  if (list.length === 0) {
                    return (
                      <div className="text-center py-16 flex-1 flex flex-col items-center justify-center">
                        <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-600 font-medium">
                          {events.length === 0
                            ? 'No upcoming events scheduled'
                            : eventsAudienceTab === 'officials'
                              ? 'No upcoming officials-only events'
                              : 'No upcoming community events'}
                        </p>
                      </div>
                    );
                  }
                  return (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 auto-rows-fr">
                      {list.map((event) => (
                        <div
                          key={event.id}
                          className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 min-h-[180px] flex flex-col hover:border-slate-300 transition-colors cursor-pointer"
                          onClick={() => setSelectedEvent(event)}
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
            </div>
          </div>
        )}

        {activeTab === 'news' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm min-h-[min(70vh,720px)] flex flex-col">
              <div className="px-4 sm:px-5 py-3 border-b border-slate-200 bg-slate-50">
                <EventsNewsHeading
                  variant="news"
                  title="News & Announcements"
                  subtitle="Latest barangay news and announcements"
                />
              </div>
              <div className="p-4 sm:p-5 flex-1">
                {news.length === 0 ? (
                  <div className="text-center py-16">
                    <Newspaper className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-600 font-medium">No news available</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {news.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 min-h-[180px] flex flex-col hover:border-slate-300 transition-colors cursor-pointer"
                        onClick={() => setSelectedNews(item)}
                      >
                        <div className="flex-1 min-w-0 flex flex-col">
                          <div className="flex justify-center mb-3">
                            {!item.icon_name && item.image_url ? (
                              <div className="w-12 h-12 rounded-lg overflow-hidden border border-violet-200/90 shadow-sm ring-1 ring-violet-100">
                                <img
                                  src={item.image_url}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
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
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm min-h-[min(70vh,720px)] flex flex-col">
              <div className="px-4 sm:px-5 py-3 border-b border-slate-200 bg-slate-50">
                <EventsNewsHeading
                  variant="profile"
                  title="My Profile"
                  subtitle="Manage your personal information and contact details"
                />
              </div>
              <div className="p-4 sm:p-5 flex-1">
                {isEditing ? (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">First Name</label>
                        <input
                          type="text"
                          value={formData.first_name}
                          onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Last Name</label>
                        <input
                          type="text"
                          value={formData.last_name}
                          onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Middle Name</label>
                        <input
                          type="text"
                          value={formData.middle_name}
                          onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Suffix</label>
                        <input
                          type="text"
                          value={formData.suffix}
                          onChange={(e) => setFormData({ ...formData, suffix: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Sex</label>
                        <select
                          value={formData.sex}
                          onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
                        >
                          <option value="">Select Sex</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Date of Birth</label>
                        <input
                          type="date"
                          value={formData.date_of_birth}
                          onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Place of Birth</label>
                      <input
                        type="text"
                        value={formData.place_of_birth}
                        onChange={(e) => setFormData({ ...formData, place_of_birth: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Civil Status</label>
                        <select
                          value={formData.civil_status}
                          onChange={(e) => setFormData({ ...formData, civil_status: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
                        >
                          <option value="">Select Civil Status</option>
                          <option value="Single">Single</option>
                          <option value="Married">Married</option>
                          <option value="Divorced">Divorced</option>
                          <option value="Widowed">Widowed</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Nationality</label>
                        <input
                          type="text"
                          value={formData.nationality}
                          onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Mobile Number</label>
                        <input
                          type="text"
                          value={formData.mobile_number}
                          onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Contact Number</label>
                        <input
                          type="text"
                          value={formData.contact_number}
                          onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Address</label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Username</label>
                        <input
                          type="text"
                          value={formData.username}
                          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 pt-3">
                      <button
                        onClick={handleSave}
                        disabled={loading}
                        className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm font-medium"
                      >
                        {loading ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={handleCancel}
                        className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-5 rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">First Name</p>
                        <p className="text-sm font-semibold text-gray-900 mt-2">{currentUser.first_name || '—'}</p>
                      </div>
                      <div className="p-5 rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Name</p>
                        <p className="text-sm font-semibold text-gray-900 mt-2">{currentUser.last_name || '—'}</p>
                      </div>
                      <div className="p-5 rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Middle Name</p>
                        <p className="text-sm font-semibold text-gray-900 mt-2">{currentUser.middle_name || '—'}</p>
                      </div>
                      <div className="p-5 rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Suffix</p>
                        <p className="text-sm font-semibold text-gray-900 mt-2">{currentUser.suffix || '—'}</p>
                      </div>
                      <div className="p-5 rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Full Name</p>
                        <p className="text-sm font-semibold text-gray-900 mt-2">{currentUser.full_name || '—'}</p>
                      </div>
                      <div className="p-5 rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</p>
                        <p className="text-sm font-semibold text-gray-900 mt-2">{currentUser.email || '—'}</p>
                      </div>
                      <div className="p-5 rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Username</p>
                        <p className="text-sm font-semibold text-gray-900 mt-2">{currentUser.username || '—'}</p>
                      </div>
                      <div className="p-5 rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sex</p>
                        <p className="text-sm font-semibold text-gray-900 mt-2">{currentUser.sex || '—'}</p>
                      </div>
                      <div className="p-5 rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date of Birth</p>
                        <p className="text-sm font-semibold text-gray-900 mt-2">{currentUser.date_of_birth || '—'}</p>
                      </div>
                      <div className="p-5 rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Place of Birth</p>
                        <p className="text-sm font-semibold text-gray-900 mt-2">{currentUser.place_of_birth || '—'}</p>
                      </div>
                      <div className="p-5 rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Civil Status</p>
                        <p className="text-sm font-semibold text-gray-900 mt-2">{currentUser.civil_status || '—'}</p>
                      </div>
                      <div className="p-5 rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nationality</p>
                        <p className="text-sm font-semibold text-gray-900 mt-2">{currentUser.nationality || '—'}</p>
                      </div>
                      <div className="p-5 rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mobile Number</p>
                        <p className="text-sm font-semibold text-gray-900 mt-2">{currentUser.mobile_number || '—'}</p>
                      </div>
                      <div className="p-5 rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Address</p>
                        <p className="text-sm font-semibold text-gray-900 mt-2">{currentUser.address || '—'}</p>
                      </div>
                      <div className="p-5 rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact Number</p>
                        <p className="text-sm font-semibold text-gray-900 mt-2">{currentUser.contact_number || '—'}</p>
                      </div>
                    </div>
                    <div>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold"
                      >
                        Edit Profile
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'officials' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm min-h-[min(70vh,720px)] flex flex-col">
              <div className="px-4 sm:px-5 py-3 border-b border-slate-200 bg-slate-50">
                <EventsNewsHeading
                  variant="officials"
                  title="Barangay Officials"
                  subtitle="Meet your barangay officials and leadership team"
                />
              </div>
              <div className="p-4 sm:p-5 flex-1">
                {officials.length === 0 ? (
                  <div className="text-center py-12">
                    <Users2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-600 font-medium">No officials information available</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {officials.map((official) => (
                      <div key={official.id} className="bg-white rounded-2xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
                        <div
                          className={`h-52 bg-gray-100 ${official.image_url ? 'cursor-pointer' : ''}`}
                          onClick={() => official.image_url && setSelectedOfficial(official)}
                        >
                          {official.image_url ? (
                            <img src={official.image_url} alt={official.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-gray-400 text-sm">
                              No photo
                            </div>
                          )}
                        </div>
                        <div className="px-3 py-2">
                          <h3 className="text-sm font-bold text-gray-900">{official.name}</h3>
                          <p className="text-xs text-gray-600 mt-0.5">{official.position}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'facilities' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm min-h-[min(70vh,720px)] flex flex-col">
              <div className="px-4 sm:px-5 py-3 border-b border-slate-200 bg-slate-50">
                <EventsNewsHeading
                  variant="facilities"
                  title="Barangay Facilities"
                  subtitle="Browse available spaces and book facilities for your events"
                />
              </div>
              <div className="p-4 sm:p-5 flex-1">
                {facilities.length === 0 ? (
                  <div className="text-center py-12">
                    <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-600 font-medium">No facilities available</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {facilities.map((facility) => (
                      <div key={facility.id} className="border border-slate-300 rounded-lg p-5 bg-white hover:shadow-md hover:border-slate-400 transition-all">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="text-sm font-semibold text-slate-900">{facility.name}</h3>
                            {facility.description && (
                              <p className="text-slate-600 text-sm mt-2">{facility.description}</p>
                            )}
                            {facility.capacity && (
                              <p className="text-xs text-slate-600 mt-2">Capacity: {facility.capacity} people</p>
                            )}
                          </div>
                          <button
                            onClick={() => setSelectedFacility(facility)}
                            className="px-4 py-2 bg-slate-700 text-white rounded text-sm hover:shadow transition-shadow ml-4"
                          >
                            Book Facility
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {myFacilityBookings.length > 0 && (
                  <div className="mt-8 border-t border-slate-300 pt-6">
                    <h3 className="text-sm font-semibold text-slate-900 mb-4">My Bookings</h3>
                    <div className="space-y-4">
                      {myFacilityBookings.map((booking) => {
                        const bookingDate = new Date(booking.booking_date);
                        const endTime = new Date(bookingDate);
                        // Use duration_minutes if available, otherwise calculate from duration_hours, or default to 120 minutes
                        const durationMinutes = booking.duration_minutes || (booking.duration_hours ? booking.duration_hours * 60 : 120);
                        endTime.setMinutes(endTime.getMinutes() + durationMinutes);
                        return (
                          <div key={booking.id} className="border border-slate-300 rounded-lg p-5 bg-slate-50 hover:shadow-md hover:border-slate-400 transition-all">
                            <div className="flex justify-between items-center">
                              <div className="flex-1">
                                <p className="font-semibold text-slate-900 text-sm">{booking.facility_name || 'Unknown Facility'}</p>
                                <p className="text-xs text-slate-600 mt-2">
                                  Date: {bookingDate.toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                  })}
                                </p>
                                <p className="text-xs text-slate-600">
                                  Time: {bookingDate.toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true,
                                  })} - {endTime.toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true,
                                  })}
                                  {(() => {
                                    const mins = booking.duration_minutes || (booking.duration_hours ? booking.duration_hours * 60 : 120);
                                    if (mins >= 60) {
                                      const hours = Math.floor(mins / 60);
                                      const remainingMins = mins % 60;
                                      if (remainingMins === 0) {
                                        return ` (${hours} ${hours === 1 ? 'hour' : 'hours'})`;
                                      } else {
                                        return ` (${hours} ${hours === 1 ? 'hour' : 'hours'} ${remainingMins} ${remainingMins === 1 ? 'minute' : 'minutes'})`;
                                      }
                                    } else {
                                      return ` (${mins} ${mins === 1 ? 'minute' : 'minutes'})`;
                                    }
                                  })()}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  <span className={`inline-block px-2 py-1 rounded text-xs ${
                                    booking.status === 'approved' ? 'bg-slate-200 text-slate-800' :
                                    booking.status === 'rejected' ? 'bg-slate-200 text-slate-800' :
                                    booking.status === 'cancelled' ? 'bg-slate-200 text-slate-800' :
                                    'bg-slate-200 text-slate-800'
                                  }`}>
                                    {booking.status}
                                  </span>
                                  {(booking.status === 'pending' || booking.status === 'approved') && (
                                    <button
                                      onClick={() => handleDeleteBooking(booking.id)}
                                      disabled={loading}
                                      className="px-3 py-1 bg-slate-700 text-white rounded text-xs hover:shadow transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      Cancel Booking
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'papers' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm min-h-[min(70vh,720px)] flex flex-col">
              <div className="px-4 sm:px-5 py-3 border-b border-slate-200 bg-slate-50">
                <EventsNewsHeading
                  variant="documents"
                  title="Document Requests"
                  subtitle="Request barangay documents and certificates online"
                />
              </div>
              <div className="p-4 sm:p-5 flex-1 space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-4">Request New Document</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <button
                      onClick={() => {
                        const shouldRequest = window.confirm('Do you want to request a Barangay Clearance?');
                        if (!shouldRequest) return;
                        handlePaperRequest('barangay_clearance', 'cash');
                      }}
                      disabled={loading}
                      className="p-5 border border-slate-300 rounded-lg hover:shadow-md hover:border-slate-400 transition-all disabled:opacity-50 bg-slate-50"
                    >
                      <FileText className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                      <p className="font-medium text-slate-900 text-sm">Barangay Clearance</p>
                    </button>
                    <button
                      onClick={() => {
                        handlePaperRequest('certificate_of_indigency', 'cash');
                      }}
                      disabled={loading}
                      className="p-5 border border-slate-300 rounded-lg hover:shadow-md hover:border-slate-400 transition-all disabled:opacity-50 bg-slate-50"
                    >
                      <FileText className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                      <p className="font-medium text-slate-900 text-sm">Certificate of Indigency</p>
                    </button>
                    <button
                      onClick={() => {
                        handlePaperRequest('proof_of_residency', 'cash');
                      }}
                      disabled={loading}
                      className="p-5 border border-slate-300 rounded-lg hover:shadow-md hover:border-slate-400 transition-all disabled:opacity-50 bg-slate-50"
                    >
                      <FileText className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                      <p className="font-medium text-slate-900 text-sm">Proof of Residency</p>
                    </button>
                  </div>
                </div>
                <div className="border-t border-slate-300 pt-6">
                  <h3 className="text-sm font-semibold text-slate-900 mb-4">My Requests</h3>
                  {paperRequests.length === 0 ? (
                    <p className="text-slate-600 text-center py-8 text-sm">No requests yet</p>
                  ) : (
                    <div className="space-y-4">
                      {paperRequests.map((request) => (
                        <div key={request.id} className="border border-slate-300 rounded-lg p-5 bg-slate-50 hover:shadow-md hover:border-slate-400 transition-all">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-slate-900 capitalize text-sm">{request.paper_type.replace(/_/g, ' ')}</p>
                              <p className="text-xs text-slate-600 mt-1">
                                Status:{' '}
                                <span
                                  className={`font-medium ${
                                    request.status === 'approved'
                                      ? 'text-green-700'
                                      : request.status === 'rejected'
                                      ? 'text-red-700'
                                      : request.status === 'completed'
                                      ? 'text-blue-700'
                                      : 'text-slate-700'
                                  }`}
                                >
                                  {request.status === 'completed' ? 'done' : request.status}
                                </span>
                              </p>
                              <p className="text-xs text-slate-600 mt-1">
                                Payment:{' '}
                                <span className={`font-medium ${request.payment_status === 'paid' ? 'text-blue-700' : 'text-slate-700'}`}>
                                  {request.payment_status === 'paid' ? 'done' : 'pending'}
                                </span>
                              </p>
                              {request.status === 'approved' && (
                                <p className="text-xs text-green-700 mt-1">Note: Admin accepted your request. You may now pick up the paper at the barangay office and pay there.</p>
                              )}
                              {request.status === 'completed' && (
                                <p className="text-xs text-blue-700 mt-1">Note: Your request is marked done by the admin.</p>
                              )}
                              {request.payment_code && (<p className="text-xs text-slate-600 mt-1">Payment Code: <span className="font-mono font-semibold">{request.payment_code}</span></p>)}
                              {request.receipt_url && (<a href={request.receipt_url} target="_blank" rel="noopener noreferrer" className="text-slate-700 text-xs hover:underline mt-1 block">View Receipt →</a>)}
                            </div>

                            <div className="text-right flex flex-col items-end gap-2">
                              <p className="text-xs text-slate-600">{new Date(request.created_at).toLocaleString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true,
                              })}</p>
                              <div className="flex gap-2 items-center">
                                {request.status === 'pending' && (
                                  <button
                                    onClick={() => handleDeletePaperRequest(request.id)}
                                    disabled={loading}
                                    className="p-1.5 text-slate-600 hover:shadow rounded transition-shadow disabled:opacity-50"
                                    title="Delete Request"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm min-h-[min(70vh,720px)] flex flex-col">
              <div className="px-4 sm:px-5 py-3 border-b border-slate-200 bg-slate-50">
                <EventsNewsHeading
                  variant="calendar"
                  title="Calendar"
                  subtitle="See when events and news fall on the calendar and tap a date for details"
                />
              </div>
              <div className="p-4 sm:p-5 flex-1">
                <ResidentCalendar
                  events={events}
                  news={news}
                  onDateSelected={setCalendarSelectedDate}
                  selectedDate={calendarSelectedDate}
                  compactChrome
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'transparency' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm min-h-[min(70vh,720px)] flex flex-col">
              <div className="px-4 sm:px-5 py-3 border-b border-slate-200 bg-slate-50">
                <EventsNewsHeading
                  variant="transparency"
                  title="Transparency"
                  subtitle="Budgets, reports, and public disclosures—open PDF reports below or view them in the portal"
                />
              </div>
              <div className="p-4 sm:p-5 flex-1">
                {transparencyItems.length === 0 ? (
                  <div className="text-center py-16">
                    <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-600 font-medium">No transparency items available</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {transparencyItems.map((item) => (
                      <div
                        key={item.id}
                        className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm hover:border-slate-300 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                          <div
                            className={`shrink-0 flex items-center justify-center w-12 h-12 rounded-lg shadow-sm ring-1 ring-black/[0.06] ${
                              item.file_url
                                ? 'bg-gradient-to-br from-red-500 via-rose-500 to-orange-400 text-white'
                                : 'bg-gradient-to-br from-slate-200 to-slate-300 text-slate-600'
                            }`}
                          >
                            <FileText className="w-6 h-6" strokeWidth={2} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <h3 className="text-xl font-bold text-gray-800 leading-snug">{item.title}</h3>
                              {item.pinned && (
                                <span className="px-2 py-1 text-xs font-bold rounded-full bg-yellow-100 text-yellow-800">
                                  Pinned
                                </span>
                              )}
                              <span className="px-2 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-700">
                                {item.category || 'general'}
                              </span>
                            </div>
                            {item.description && (
                              <p className="text-gray-900 text-base leading-relaxed whitespace-pre-wrap line-clamp-[12] font-medium">
                                {item.description}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 mt-3">
                              Posted{' '}
                              {new Date(item.created_at).toLocaleString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true,
                              })}
                            </p>
                            {item.file_url && (
                              <div className="flex flex-wrap gap-2 mt-4">
                                <button
                                  type="button"
                                  onClick={() => setTransparencyPdfViewer({ url: item.file_url!, title: item.title })}
                                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors"
                                >
                                  <FileText className="w-4 h-4" />
                                  View report
                                </button>
                                <a
                                  href={item.file_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 text-sm font-semibold hover:bg-slate-50 transition-colors"
                                >
                                  <ExternalLink className="w-4 h-4 text-blue-600" />
                                  Open in new tab
                                </a>
                                <a
                                  href={item.file_url}
                                  download
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 text-sm font-semibold hover:bg-slate-50 transition-colors"
                                >
                                  <Download className="w-4 h-4 text-emerald-600" />
                                  Download
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {transparencyPdfViewer && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setTransparencyPdfViewer(null)}
          >
            <div
              className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate pr-2">{transparencyPdfViewer.title}</h3>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={transparencyPdfViewer.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-blue-600 hover:underline hidden sm:inline"
                  >
                    New tab
                  </a>
                  <button
                    type="button"
                    onClick={() => setTransparencyPdfViewer(null)}
                    className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-800 text-sm font-medium hover:bg-slate-300"
                  >
                    Close
                  </button>
                </div>
              </div>
              <iframe
                title={transparencyPdfViewer.title}
                src={transparencyPdfViewer.url}
                className="w-full flex-1 min-h-[70vh] border-0 bg-slate-100"
              />
              <p className="text-xs text-slate-500 px-4 py-2 border-t border-slate-100 bg-white">
                If the document does not load in this window, use &quot;Open in new tab&quot; on the card or the link above.
              </p>
            </div>
          </div>
        )}

        {/* News Detail Modal */}
        {selectedNews && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={() => setSelectedNews(null)}>
            <div className="bg-white rounded max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-300" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-slate-300 bg-slate-50">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    {!selectedNews.icon_name && selectedNews.image_url ? (
                      <div className="shrink-0 w-12 h-12 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                        <img
                          src={selectedNews.image_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className={`shrink-0 ${NEWS_EVENTS_LIST_STYLES.newsIconBox}`}>
                        <LucideIconByName
                          name={selectedNews.icon_name}
                          kind="news"
                          className={NEWS_EVENTS_LIST_STYLES.newsIconGlyph}
                        />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h2 className="text-xl sm:text-2xl font-extrabold leading-snug bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                        {selectedNews.title}
                      </h2>
                      <p className="text-xs text-slate-600 mt-2">
                        {new Date(selectedNews.created_at).toLocaleString('en-US', {
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
                  <button
                    onClick={() => setSelectedNews(null)}
                    className="text-slate-500 hover:text-slate-700 shrink-0"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-6">
                <p className="text-gray-900 text-base leading-relaxed whitespace-pre-wrap font-medium">{selectedNews.content}</p>
              </div>
            </div>
          </div>
        )}

        {/* Official Image Modal - full image view */}
        {selectedOfficial && selectedOfficial.image_url && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setSelectedOfficial(null)}>
            <div className="max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-end mb-2">
                <button onClick={() => setSelectedOfficial(null)} className="p-2 rounded-full bg-white/90 text-slate-700 hover:bg-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <img src={selectedOfficial.image_url} alt={selectedOfficial.name} className="w-full max-h-[80vh] object-contain rounded-lg shadow-2xl" />
              <div className="mt-3 px-2 py-2 bg-white/90 rounded-lg text-center">
                <h3 className="text-base font-bold text-gray-900">{selectedOfficial.name}</h3>
                <p className="text-sm text-gray-600">{selectedOfficial.position}</p>
              </div>
            </div>
          </div>
        )}

        {/* Event Detail Modal */}
        {selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={() => setSelectedEvent(null)}>
            <div className="bg-white rounded max-w-2xl w-full border border-slate-300" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-slate-300 bg-slate-50">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`shrink-0 ${NEWS_EVENTS_LIST_STYLES.eventIconBox}`}>
                      <LucideIconByName
                        name={selectedEvent.icon_name}
                        kind="event"
                        className={NEWS_EVENTS_LIST_STYLES.eventIconGlyph}
                      />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-extrabold leading-snug bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                      {selectedEvent.title}
                    </h2>
                  </div>
                  <button onClick={() => setSelectedEvent(null)} className="text-slate-500 hover:text-slate-700 shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <p className="text-xs font-medium text-slate-700">Audience</p>
                  <p className="text-slate-900 text-sm mt-1">
                    {eventAudience(selectedEvent) === 'officials' ? 'Barangay officials' : 'Community'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-700">Date & Time</p>
                  <p className="text-slate-900 text-sm mt-1">{new Date(selectedEvent.event_date).toLocaleString()}</p>
                </div>
                {selectedEvent.location && (
                  <div>
                    <p className="text-xs font-medium text-slate-700">Location</p>
                    <p className="text-slate-900 text-sm mt-1">{selectedEvent.location}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-slate-700">Description</p>
                  <p className="text-gray-900 text-base mt-1 leading-relaxed font-medium whitespace-pre-wrap">
                    {selectedEvent.description}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Facility Booking Modal */}
        {selectedFacility && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={() => setSelectedFacility(null)}>
            <div className="bg-white rounded max-w-lg w-full max-h-[90vh] flex flex-col border border-slate-300" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-slate-300 bg-slate-50 flex-shrink-0">
                <div className="flex justify-between items-start">
                  <h2 className="text-lg font-semibold text-slate-900">Book {selectedFacility.name}</h2>
                  <button onClick={() => setSelectedFacility(null)} className="text-slate-500 hover:text-slate-700">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                {selectedFacility.description && (
                  <p className="text-slate-600 text-sm mb-4">{selectedFacility.description}</p>
                )}
                {selectedFacility.capacity && (
                  <p className="text-xs text-slate-600 mb-4">Capacity: {selectedFacility.capacity} people</p>
                )}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">Select Booking Date</label>
                    
                    {/* Calendar Navigation */}
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={() => navigateCalendarMonth('prev')}
                        disabled={(() => {
                          const today = new Date();
                          today.setDate(1);
                          today.setHours(0, 0, 0, 0);
                          const firstOfCurrentMonth = new Date(bookingCalendarMonth);
                          firstOfCurrentMonth.setDate(1);
                          firstOfCurrentMonth.setHours(0, 0, 0, 0);
                          return firstOfCurrentMonth <= today;
                        })()}
                        className="p-2 hover:shadow rounded transition-shadow disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <h3 className="text-base font-semibold text-slate-900">
                        {bookingCalendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </h3>
                      <button
                        onClick={() => navigateCalendarMonth('next')}
                        className="p-2 hover:shadow rounded transition-shadow"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>

                    {/* Calendar */}
                    <div className="border border-slate-300 rounded p-3 sm:p-4 bg-slate-50 touch-pan-y overscroll-contain">
                      {/* Day headers */}
                      <div className="grid grid-cols-7 gap-1 mb-2 touch-pan-y select-none">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                          <div key={day} className="text-center text-xs font-medium text-slate-600 py-2">
                            {day}
                          </div>
                        ))}
                      </div>
                      
                      {/* Calendar days */}
                      <div className="grid grid-cols-7 gap-1 touch-pan-y">
                        {getCalendarDays().map((date, index) => {
                          if (!date) {
                            return <div key={`empty-${index}`} className="aspect-square" />;
                          }
                          
                          const isPast = isDatePast(date);
                          const isSelected = bookingDate === date.toISOString().split('T')[0];
                          
                          return (
                            <button
                              key={date.toISOString()}
                              onClick={() => handleDateClick(date)}
                              disabled={isPast}
                              className={`
                                aspect-square rounded text-[13px] sm:text-sm font-medium transition-colors select-none touch-manipulation
                                ${isPast 
                                  ? 'text-slate-300 bg-slate-100 cursor-not-allowed' 
                                  : isSelected
                                  ? 'text-white bg-slate-700 hover:shadow'
                                  : 'text-slate-700 bg-white border border-slate-300 hover:shadow'
                                }
                              `}
                              title={
                                isPast 
                                  ? 'Past dates cannot be selected'
                                  : `Select ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                              }
                            >
                              {date.getDate()}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {bookingDate && (
                      <div className="mt-4 p-3 bg-slate-100 rounded border border-slate-300">
                        <p className="text-xs font-medium text-slate-800">
                          Selected: {new Date(bookingDate).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Time and Duration Selection */}
                  {bookingDate && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Start Time</label>
                        <div className="grid grid-cols-4 gap-1 items-end">
                          <div>
                            <label className="block text-xs text-slate-600 mb-1">Hour</label>
                            <select
                              value={bookingHour}
                              onChange={(e) => setBookingHour(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none text-center text-lg font-semibold"
                            >
                              {Array.from({ length: 12 }, (_, i) => (
                                <option key={i + 1} value={i + 1}>{i + 1}</option>
                              ))}
                            </select>
                          </div>
                          <div className="text-center pb-2">
                            <span className="text-xl font-bold text-slate-400">:</span>
                          </div>
                          <div>
                            <label className="block text-xs text-slate-600 mb-1">Minute</label>
                            <select
                              value={bookingMinute}
                              onChange={(e) => setBookingMinute(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none text-center text-lg font-semibold"
                            >
                              <option value="0">00</option>
                              <option value="15">15</option>
                              <option value="30">30</option>
                              <option value="45">45</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-slate-600 mb-1">Period</label>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => setBookingAMPM('AM')}
                                className={`flex-1 px-3 py-2 rounded font-semibold text-sm transition-colors ${
                                  bookingAMPM === 'AM'
                                    ? 'bg-slate-700 text-white'
                                    : 'bg-slate-100 text-slate-700 hover:shadow'
                                }`}
                              >
                                AM
                              </button>
                              <button
                                type="button"
                                onClick={() => setBookingAMPM('PM')}
                                className={`flex-1 px-3 py-2 rounded font-semibold text-sm transition-colors ${
                                  bookingAMPM === 'PM'
                                    ? 'bg-slate-700 text-white'
                                    : 'bg-slate-100 text-slate-700 hover:shadow'
                                }`}
                              >
                                PM
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-slate-600 text-center">
                          Selected: {(() => {
                            const hour = parseInt(bookingHour) || 12;
                            const minute = parseInt(bookingMinute) || 0;
                            const hour24 = bookingAMPM === 'PM' && hour !== 12 ? hour + 12 : (bookingAMPM === 'AM' && hour === 12 ? 0 : hour);
                            const time = new Date(2000, 0, 1, hour24, minute);
                            return time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                          })()}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Duration (Hours)</label>
                          <select
                            value={bookingDurationHours}
                            onChange={(e) => setBookingDurationHours(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
                          >
                            <option value="0">0 hours</option>
                            <option value="1">1 hour</option>
                            <option value="2">2 hours</option>
                            <option value="3">3 hours</option>
                            <option value="4">4 hours</option>
                            <option value="5">5 hours</option>
                            <option value="6">6 hours</option>
                            <option value="8">8 hours</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Duration (Minutes)</label>
                          <select
                            value={bookingDurationMinutes}
                            onChange={(e) => setBookingDurationMinutes(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
                          >
                            <option value="0">0 minutes</option>
                            <option value="15">15 minutes</option>
                            <option value="30">30 minutes</option>
                            <option value="45">45 minutes</option>
                          </select>
                        </div>
                      </div>
                      
                      {/* Overlap Warning */}
                      {timeOverlap && (
                        <div className="mt-4 p-3 bg-slate-100 border border-slate-300 rounded">
                          <p className="text-xs font-medium text-slate-800">⚠️ {timeOverlap}</p>
                        </div>
                      )}
                      
                      {/* Validation: Ensure at least 15 minutes */}
                      {bookingDate && bookingTime && (() => {
                        const hours = parseInt(bookingDurationHours) || 0;
                        const mins = parseInt(bookingDurationMinutes) || 0;
                        const totalMins = hours * 60 + mins;
                        return totalMins < 15;
                      })() && (
                        <div className="mt-2 p-3 bg-slate-100 border border-slate-300 rounded">
                          <p className="text-xs text-slate-800">Please select a duration of at least 15 minutes.</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (bookingDate && bookingTime) {
                          handleFacilityBooking(selectedFacility.id, bookingDate, bookingTime, bookingDurationHours, bookingDurationMinutes);
                        } else {
                          alert('Please select a booking date and time');
                        }
                      }}
                      disabled={loading || !bookingDate || !bookingTime || !!timeOverlap || (() => {
                        const hours = parseInt(bookingDurationHours) || 0;
                        const mins = parseInt(bookingDurationMinutes) || 0;
                        return hours * 60 + mins < 15;
                      })()}
                      className="flex-1 px-4 py-2 bg-slate-700 text-white rounded hover:shadow transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Submitting...' : 'Submit Booking'}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedFacility(null);
                        setBookingDate('');
                        setBookingTime('');
                        setBookingHour('12');
                        setBookingMinute('0');
                        setBookingAMPM('AM');
                        setBookingDurationHours('0');
                        setBookingDurationMinutes('0');
                        setTimeOverlap(null);
                      }}
                      className="px-4 py-2 bg-slate-200 text-slate-700 rounded hover:shadow transition-shadow"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
