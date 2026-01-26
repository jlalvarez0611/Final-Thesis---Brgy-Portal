import { useState, useEffect, useRef } from 'react';
import { supabase, Profile } from '../lib/supabase';
import { LogOut, User, Calendar, Newspaper, ArrowLeft, Users2, FileText, Building2, Trash2 } from 'lucide-react';

interface Event { id: string; title: string; description: string; event_date: string; location: string; created_at: string; }
interface News { id: string; title: string; content: string; image_url: string; published: boolean; created_at: string; }
interface Official { id: string; name: string; position: string; }
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

interface ResidentDashboardProps { currentUser: Profile; onLogout: () => void; onProfileUpdate: (profile: Profile) => void; }

export function ResidentDashboard({ currentUser, onLogout, onProfileUpdate }: ResidentDashboardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [officials, setOfficials] = useState<Official[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [paperRequests, setPaperRequests] = useState<PaperRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'profile' | 'events' | 'news' | 'officials' | 'papers' | 'facilities'>('events');
  const [canGoBack, setCanGoBack] = useState(false);
  const historyInitialized = useRef(false);
  const [selectedNews, setSelectedNews] = useState<News | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [facilityBookings, setFacilityBookings] = useState<FacilityBooking[]>([]);
  const [myFacilityBookings, setMyFacilityBookings] = useState<(FacilityBooking & { facility_name?: string })[]>([]);
  const [formData, setFormData] = useState({
    full_name: currentUser.full_name,
    address: currentUser.address,
    contact_number: currentUser.contact_number,
  });
  const [selectedRequest, setSelectedRequest] = useState<PaperRequest | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'gcash' | 'paymaya' | 'cash' | ''>('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingHour, setBookingHour] = useState('12');
  const [bookingMinute, setBookingMinute] = useState('0');
  const [bookingAMPM, setBookingAMPM] = useState<'AM' | 'PM'>('AM');
  const [bookingDurationHours, setBookingDurationHours] = useState('0'); // Default 0 hours
  const [bookingDurationMinutes, setBookingDurationMinutes] = useState('0'); // Default 0 minutes
  const [bookingCalendarMonth, setBookingCalendarMonth] = useState(new Date());
  const [timeOverlap, setTimeOverlap] = useState<string | null>(null);

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
    fetchOfficials();
    fetchFacilities();
    fetchPaperRequests();
    fetchMyFacilityBookings();

    if (!historyInitialized.current) {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab') || 'events';
      const validTabs = ['events', 'news', 'profile', 'officials', 'papers', 'facilities'];
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
        if (state.tab && ['events', 'news', 'profile', 'officials', 'papers', 'facilities'].includes(state.tab)) {
          setActiveTab(state.tab as any);
        }
        updateBackButtonState();
      } else {
        // If no state or not dashboard state, restore dashboard state
        window.history.pushState({ tab: activeTab, dashboard: true, initial: false }, '', `/dashboard?tab=${activeTab}`);
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
    const state = window.history.state;
    const canBack = state && state.dashboard && (!state.initial && state.tab !== 'events');
    setCanGoBack(!!canBack);
  };

  const handleTabChange = (tab: 'profile' | 'events' | 'news' | 'officials' | 'papers' | 'facilities') => {
    setActiveTab(tab);
    window.history.pushState({ tab, dashboard: true, initial: false }, '', `/dashboard?tab=${tab}`);
    updateBackButtonState();
  };

  const fetchOfficials = async () => {
    try {
      const { data, error } = await supabase.from('officials').select('id, name, position').order('position', { ascending: true });
      if (error) { setOfficials([]); return; }
      setOfficials(data || []);
    } catch (error) { setOfficials([]); }
  };

  const handleBrowserBack = () => { if (canGoBack) window.history.back(); };

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase.from('events').select('*').gte('event_date', new Date().toISOString()).order('event_date', { ascending: true });
      if (error) throw error;
      setEvents(data || []);
    } catch (error) { console.error('Error fetching events:', error); }
  };

  const fetchNews = async () => {
    try {
      const { data, error } = await supabase.from('news').select('*').eq('published', true).order('created_at', { ascending: false }).limit(10);
      if (error) throw error;
      setNews(data || []);
    } catch (error) { console.error('Error fetching news:', error); }
  };

  const fetchFacilities = async () => {
    try {
      const { data, error } = await supabase.from('facilities').select('*').order('name', { ascending: true });
      if (error) { setFacilities([]); return; }
      setFacilities(data || []);
    } catch (error) { setFacilities([]); }
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
      const { data, error } = await supabase.from('profiles').update({
        full_name: formData.full_name,
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
    setFormData({ full_name: currentUser.full_name, address: currentUser.address, contact_number: currentUser.contact_number });
    setIsEditing(false);
  };

  const handlePaperRequest = async (paperType: 'barangay_clearance' | 'certificate_of_indigency' | 'proof_of_residency', paymentMethod: 'online' | 'cash') => {
    try {
      setLoading(true);
      const paymentCode = paymentMethod === 'online' ? `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}` : null;
      const { data, error } = await supabase.from('paper_requests').insert({
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
      
      const { data, error } = await supabase.from('facility_bookings').insert(insertData).select().single();
      
      if (error) {
        console.error('Booking error details:', error);
        // If error is about missing column, try without duration_minutes
        if (error.message?.includes('duration_minutes') || error.message?.includes('column') || error.code === '42703') {
          // Retry without duration_minutes (using whole hours only since duration_hours is INTEGER)
          const { data: retryData, error: retryError } = await supabase.from('facility_bookings').insert({
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

  // Helper function to normalize date to YYYY-MM-DD format (local timezone)
  const getLocalDateString = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper function to check if there's a time overlap
  const checkTimeOverlap = (date: string, time: string, hours: string, minutes: string): string | null => {
    if (!date || !time || !selectedFacility) return null;
    
    const [year, month, day] = date.split('-').map(Number);
    const [hoursNum, minutesNum] = time.split(':').map(Number);
    const durationHours = parseInt(hours) || 0;
    const durationMinutes = parseInt(minutes) || 0;
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
      return `Time conflict detected! The facility is already booked during: ${conflicts}. Please choose a different time.`;
    }
    
    return null;
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

  // open payment modal for a specific request
  const handleOpenPaymentModal = (request: PaperRequest) => {
    setSelectedRequest(request);
    setPaymentMethod('');
    setShowPaymentModal(true);
  };

  // confirm payment selection and update DB
  const handleConfirmPayment = async () => {
    if (!selectedRequest) return;
    if (!paymentMethod) { alert('Please select a payment method.'); return; }
    setLoading(true);
    try {
      const paymentCode = paymentMethod === 'cash' ? null : `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      const payment_status = paymentMethod === 'cash' ? 'cash_pending' : 'pending';
      const { data, error } = await supabase.from('paper_requests').update({
        payment_status,
        payment_code: paymentCode,
        updated_at: new Date().toISOString(),
      }).eq('id', selectedRequest.id).select().single();
      if (error) {
        alert('Failed to update payment. Please try again.');
      } else {
        await fetchPaperRequests();
        setShowPaymentModal(false);
        setSelectedRequest(null);
        setPaymentMethod('');
      }
    } catch (err) {
      alert('An error occurred. Please try again.');
    } finally { setLoading(false); }
  };

  const handleClosePaymentModal = () => { setShowPaymentModal(false); setSelectedRequest(null); setPaymentMethod(''); };

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
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button onClick={handleBrowserBack} disabled={!canGoBack} className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${canGoBack ? 'text-gray-700 hover:bg-gray-100 hover:text-gray-900' : 'text-gray-400 cursor-not-allowed opacity-50'}`} title={canGoBack ? 'Go back' : 'Cannot go back - would log you out'}>
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Barangay Resident Portal</h1>
                <p className="text-sm text-gray-600">Welcome, {currentUser.full_name}</p>
              </div>
            </div>
            <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            <button onClick={() => handleTabChange('events')} className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'events' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}><div className="flex items-center gap-2"><Calendar className="w-4 h-4" />Upcoming Events</div></button>
            <button onClick={() => handleTabChange('news')} className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'news' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}><div className="flex items-center gap-2"><Newspaper className="w-4 h-4" />News & Announcements</div></button>
            <button onClick={() => handleTabChange('profile')} className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'profile' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}><div className="flex items-center gap-2"><User className="w-4 h-4" />My Profile</div></button>
            <button onClick={() => handleTabChange('officials')} className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'officials' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}><div className="flex items-center gap-2"><Users2 className="w-4 h-4" />Officials</div></button>
            <button onClick={() => handleTabChange('papers')} className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'papers' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}><div className="flex items-center gap-2"><FileText className="w-4 h-4" />Paper Requests</div></button>
            <button onClick={() => handleTabChange('facilities')} className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'facilities' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}><div className="flex items-center gap-2"><Building2 className="w-4 h-4" />Facilities</div></button>
          </nav>
        </div>

        {activeTab === 'events' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="p-6 border-b">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-blue-600" />
                  Upcoming Events
                </h2>
                <p className="text-sm text-gray-600 mt-1">View all upcoming barangay events</p>
              </div>
              <div className="p-6">
                {events.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No upcoming events scheduled</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {events.map((event) => (
                      <div
                        key={event.id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => setSelectedEvent(event)}
                      >
                        <h3 className="text-lg font-semibold text-gray-800">{event.title}</h3>
                        <p className="text-gray-600 mt-2">{event.description}</p>
                        <div className="flex gap-4 mt-4 text-sm text-gray-500">
                          <span>📅 {new Date(event.event_date).toLocaleString()}</span>
                          {event.location && <span>📍 {event.location}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'news' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="p-6 border-b">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Newspaper className="w-6 h-6 text-blue-600" />
                  News & Announcements
                </h2>
                <p className="text-sm text-gray-600 mt-1">Stay updated with barangay news</p>
              </div>
              <div className="p-6">
                {news.length === 0 ? (
                  <div className="text-center py-12">
                    <Newspaper className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No news available</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {news.map((item) => (
                      <div
                        key={item.id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => setSelectedNews(item)}
                      >
                        <h3 className="text-lg font-semibold text-gray-800">{item.title}</h3>
                        <p className="text-gray-600 mt-2 line-clamp-3">{item.content}</p>
                        {item.image_url && (
                          <div className="mt-3">
                            <img src={item.image_url} alt={item.title} className="w-full h-48 object-cover rounded-lg" />
                          </div>
                        )}
                        <p className="text-sm text-gray-500 mt-3">
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
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="p-6 border-b">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <User className="w-6 h-6 text-blue-600" />
                  My Profile
                </h2>
                <p className="text-sm text-gray-600 mt-1">Manage your personal information</p>
              </div>
              <div className="p-6">
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                      <input
                        type="text"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                      <input
                        type="text"
                        value={formData.contact_number}
                        onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSave}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {loading ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={handleCancel}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                      <p className="text-gray-900">{currentUser.full_name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <p className="text-gray-900">{currentUser.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      <p className="text-gray-900">{currentUser.address}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                      <p className="text-gray-900">{currentUser.contact_number}</p>
                    </div>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Edit Profile
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'officials' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="p-6 border-b">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Users2 className="w-6 h-6 text-blue-600" />
                  Barangay Officials
                </h2>
                <p className="text-sm text-gray-600 mt-1">Meet your barangay officials</p>
              </div>
              <div className="p-6">
                {officials.length === 0 ? (
                  <div className="text-center py-12">
                    <Users2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No officials information available</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {officials.map((official) => (
                      <div key={official.id} className="border border-gray-200 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-800">{official.name}</h3>
                        <p className="text-gray-600 mt-1">{official.position}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'facilities' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="p-6 border-b">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Building2 className="w-6 h-6 text-blue-600" />
                  Barangay Facilities
                </h2>
                <p className="text-sm text-gray-600 mt-1">Book facilities for your events</p>
              </div>
              <div className="p-6">
                {facilities.length === 0 ? (
                  <div className="text-center py-12">
                    <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No facilities available</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {facilities.map((facility) => (
                      <div key={facility.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-800">{facility.name}</h3>
                            {facility.description && (
                              <p className="text-gray-600 mt-2">{facility.description}</p>
                            )}
                            {facility.capacity && (
                              <p className="text-sm text-gray-500 mt-2">Capacity: {facility.capacity} people</p>
                            )}
                          </div>
                          <button
                            onClick={() => setSelectedFacility(facility)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ml-4"
                          >
                            Book Facility
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {myFacilityBookings.length > 0 && (
                  <div className="mt-8 border-t pt-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">My Bookings</h3>
                    <div className="space-y-3">
                      {myFacilityBookings.map((booking) => {
                        const bookingDate = new Date(booking.booking_date);
                        const endTime = new Date(bookingDate);
                        // Use duration_minutes if available, otherwise calculate from duration_hours, or default to 120 minutes
                        const durationMinutes = booking.duration_minutes || (booking.duration_hours ? booking.duration_hours * 60 : 120);
                        endTime.setMinutes(endTime.getMinutes() + durationMinutes);
                        return (
                          <div key={booking.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex justify-between items-center">
                              <div className="flex-1">
                                <p className="font-semibold text-gray-800">{booking.facility_name || 'Unknown Facility'}</p>
                                <p className="text-sm text-gray-600">
                                  Date: {bookingDate.toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                  })}
                                </p>
                                <p className="text-sm text-gray-600">
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
                                    booking.status === 'approved' ? 'bg-green-100 text-green-800' :
                                    booking.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                    booking.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                                    'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {booking.status}
                                  </span>
                                  {(booking.status === 'pending' || booking.status === 'approved') && (
                                    <button
                                      onClick={() => handleDeleteBooking(booking.id)}
                                      disabled={loading}
                                      className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="p-6 border-b">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><FileText className="w-6 h-6 text-blue-600" />Paper Requests</h2>
                <p className="text-sm text-gray-600 mt-1">Request barangay documents and certificates</p>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Request New Document</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      onClick={() => {
                        handlePaperRequest('barangay_clearance', 'cash');
                      }}
                      disabled={loading}
                      className="p-4 border-2 border-blue-500 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
                    >
                      <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                      <p className="font-semibold text-gray-800">Barangay Clearance</p>
                    </button>
                    <button
                      onClick={() => {
                        handlePaperRequest('certificate_of_indigency', 'cash');
                      }}
                      disabled={loading}
                      className="p-4 border-2 border-blue-500 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
                    >
                      <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                      <p className="font-semibold text-gray-800">Certificate of Indigency</p>
                    </button>
                    <button
                      onClick={() => {
                        handlePaperRequest('proof_of_residency', 'cash');
                      }}
                      disabled={loading}
                      className="p-4 border-2 border-blue-500 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
                    >
                      <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                      <p className="font-semibold text-gray-800">Proof of Residency</p>
                    </button>
                  </div>
                </div>
                <div className="mt-8 border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">My Requests</h3>
                  {paperRequests.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No requests yet</p>
                  ) : (
                    <div className="space-y-3">
                      {paperRequests.map((request) => (
                        <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-gray-800 capitalize">{request.paper_type.replace(/_/g, ' ')}</p>
                              <p className="text-sm text-gray-600">Status: <span className={`font-medium ${request.status === 'approved' ? 'text-green-600' : request.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'}`}>{request.status}</span></p>
                              {request.payment_code && (<p className="text-xs text-gray-500 mt-1">Payment Code: <span className="font-mono font-semibold">{request.payment_code}</span></p>)}
                              {request.receipt_url && (<a href={request.receipt_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm hover:underline mt-1 block">View Receipt →</a>)}
                              {request.status === 'approved' && request.payment_status === 'paid' && request.document_url && (<a href={request.document_url} target="_blank" rel="noopener noreferrer" className="text-green-600 text-sm hover:underline mt-1 block font-semibold">Download Document →</a>)}
                              {request.status === 'approved' && request.payment_status !== 'paid' && request.document_url && (<p className="text-xs text-orange-600 mt-1">⚠️ Complete payment to access document</p>)}
                            </div>

                            <div className="text-right flex flex-col items-end gap-2">
                              <p className="text-sm text-gray-600">{new Date(request.created_at).toLocaleString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true,
                              })}</p>
                              <span className={`inline-block px-2 py-1 rounded text-xs ${request.payment_status === 'paid' ? 'bg-green-100 text-green-800' : request.payment_status === 'cash_pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>{request.payment_status === 'paid' ? 'Paid' : request.payment_status === 'cash_pending' ? 'Payment Pending' : 'Payment Pending'}</span>

                              <div className="flex gap-2 items-center">
                                {request.payment_status !== 'paid' && (
                                  <button onClick={() => handleOpenPaymentModal(request)} className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Pay Now</button>
                                )}
                                {request.status === 'pending' && (
                                  <button
                                    onClick={() => handleDeletePaperRequest(request.id)}
                                    disabled={loading}
                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
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

            {showPaymentModal && selectedRequest && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                <div className="bg-white rounded-lg w-full max-w-md p-6">
                  <h3 className="text-lg font-semibold mb-3">Pay for Request</h3>
                  <div className="mb-3 text-sm text-gray-700">
                    <div className="font-medium">{selectedRequest.paper_type === 'barangay_clearance' && 'Barangay Clearance'}{selectedRequest.paper_type === 'certificate_of_indigency' && 'Certificate of Indigency'}{selectedRequest.paper_type === 'proof_of_residency' && 'Proof of Residency'}</div>
                    <div className="text-xs text-gray-500">Requested: {new Date(selectedRequest.created_at).toLocaleString()}</div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Choose payment method</label>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2"><input type="radio" name="paymethod" checked={paymentMethod === 'gcash'} onChange={() => setPaymentMethod('gcash')} /><span>GCash</span></label>
                      <label className="flex items-center space-x-2"><input type="radio" name="paymethod" checked={paymentMethod === 'paymaya'} onChange={() => setPaymentMethod('paymaya')} /><span>PayMaya</span></label>
                      <label className="flex items-center space-x-2"><input type="radio" name="paymethod" checked={paymentMethod === 'cash'} onChange={() => setPaymentMethod('cash')} /><span>Cash (Pay at office)</span></label>
                    </div>
                  </div>

                  {selectedRequest.payment_code && (<div className="mb-3 text-sm text-gray-700">Existing payment code: <strong>{selectedRequest.payment_code}</strong></div>)}

                  <div className="flex justify-end space-x-2">
                    <button className="px-3 py-1 rounded border" onClick={handleClosePaymentModal} disabled={loading}>Cancel</button>
                    <button className="px-4 py-1 bg-blue-600 text-white rounded" onClick={handleConfirmPayment} disabled={loading}>{loading ? 'Processing...' : 'Confirm Payment'}</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* News Detail Modal */}
        {selectedNews && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={() => setSelectedNews(null)}>
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b">
                <div className="flex justify-between items-start">
                  <h2 className="text-2xl font-bold text-gray-800">{selectedNews.title}</h2>
                  <button onClick={() => setSelectedNews(null)} className="text-gray-500 hover:text-gray-700">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-2">{new Date(selectedNews.created_at).toLocaleString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}</p>
              </div>
              <div className="p-6">
                {selectedNews.image_url && (
                  <img src={selectedNews.image_url} alt={selectedNews.title} className="w-full h-64 object-cover rounded-lg mb-4" />
                )}
                <p className="text-gray-700 whitespace-pre-wrap">{selectedNews.content}</p>
              </div>
            </div>
          </div>
        )}

        {/* Event Detail Modal */}
        {selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={() => setSelectedEvent(null)}>
            <div className="bg-white rounded-xl max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b">
                <div className="flex justify-between items-start">
                  <h2 className="text-2xl font-bold text-gray-800">{selectedEvent.title}</h2>
                  <button onClick={() => setSelectedEvent(null)} className="text-gray-500 hover:text-gray-700">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Date & Time</p>
                  <p className="text-gray-900">{new Date(selectedEvent.event_date).toLocaleString()}</p>
                </div>
                {selectedEvent.location && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Location</p>
                    <p className="text-gray-900">{selectedEvent.location}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-700">Description</p>
                  <p className="text-gray-900 mt-1">{selectedEvent.description}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Facility Booking Modal */}
        {selectedFacility && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={() => setSelectedFacility(null)}>
            <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b flex-shrink-0">
                <div className="flex justify-between items-start">
                  <h2 className="text-xl font-bold text-gray-800">Book {selectedFacility.name}</h2>
                  <button onClick={() => setSelectedFacility(null)} className="text-gray-500 hover:text-gray-700">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                {selectedFacility.description && (
                  <p className="text-gray-600 mb-4">{selectedFacility.description}</p>
                )}
                {selectedFacility.capacity && (
                  <p className="text-sm text-gray-500 mb-4">Capacity: {selectedFacility.capacity} people</p>
                )}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Select Booking Date</label>
                    
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
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <h3 className="text-lg font-semibold text-gray-800">
                        {bookingCalendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </h3>
                      <button
                        onClick={() => navigateCalendarMonth('next')}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>

                    {/* Calendar */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      {/* Day headers */}
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                          <div key={day} className="text-center text-xs font-medium text-gray-600 py-2">
                            {day}
                          </div>
                        ))}
                      </div>
                      
                      {/* Calendar days */}
                      <div className="grid grid-cols-7 gap-1">
                        {getCalendarDays().map((date, index) => {
                          if (!date) {
                            return <div key={`empty-${index}`} className="aspect-square" />;
                          }
                          
                          const isPast = isDatePast(date);
                          const isSelected = bookingDate === date.toISOString().split('T')[0];
                          const isToday = date.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
                          
                          return (
                            <button
                              key={date.toISOString()}
                              onClick={() => handleDateClick(date)}
                              disabled={isPast}
                              className={`
                                aspect-square rounded-lg text-sm font-medium transition-colors
                                ${isPast 
                                  ? 'text-gray-300 bg-gray-50 cursor-not-allowed' 
                                  : isSelected
                                  ? 'text-white bg-blue-600 hover:bg-blue-700'
                                  : 'text-gray-700 bg-gray-50 hover:bg-gray-200'
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
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm font-medium text-blue-800">
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                        <div className="grid grid-cols-4 gap-1 items-end">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Hour</label>
                            <select
                              value={bookingHour}
                              onChange={(e) => setBookingHour(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-center text-lg font-semibold"
                            >
                              {Array.from({ length: 12 }, (_, i) => (
                                <option key={i + 1} value={i + 1}>{i + 1}</option>
                              ))}
                            </select>
                          </div>
                          <div className="text-center pb-2">
                            <span className="text-xl font-bold text-gray-400">:</span>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Minute</label>
                            <select
                              value={bookingMinute}
                              onChange={(e) => setBookingMinute(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-center text-lg font-semibold"
                            >
                              <option value="0">00</option>
                              <option value="15">15</option>
                              <option value="30">30</option>
                              <option value="45">45</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Period</label>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => setBookingAMPM('AM')}
                                className={`flex-1 px-3 py-2 rounded-lg font-semibold text-sm transition-colors ${
                                  bookingAMPM === 'AM'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                AM
                              </button>
                              <button
                                type="button"
                                onClick={() => setBookingAMPM('PM')}
                                className={`flex-1 px-3 py-2 rounded-lg font-semibold text-sm transition-colors ${
                                  bookingAMPM === 'PM'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                PM
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-500 text-center">
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
                          <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Hours)</label>
                          <select
                            value={bookingDurationHours}
                            onChange={(e) => setBookingDurationHours(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
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
                          <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Minutes)</label>
                          <select
                            value={bookingDurationMinutes}
                            onChange={(e) => setBookingDurationMinutes(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
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
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm font-medium text-red-800">⚠️ {timeOverlap}</p>
                        </div>
                      )}
                      
                      {/* Validation: Ensure at least 15 minutes */}
                      {bookingDate && bookingTime && (() => {
                        const hours = parseInt(bookingDurationHours) || 0;
                        const mins = parseInt(bookingDurationMinutes) || 0;
                        const totalMins = hours * 60 + mins;
                        return totalMins < 15;
                      })() && (
                        <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-800">Please select a duration of at least 15 minutes.</p>
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
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
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
