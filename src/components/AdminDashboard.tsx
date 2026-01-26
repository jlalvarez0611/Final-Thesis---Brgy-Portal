import { useState, useEffect } from 'react';
import { supabase, Profile } from '../lib/supabase';
import { LogOut, Users, CheckCircle, XCircle, Trash2, Calendar, Newspaper, Plus, Edit2, Save, X, UserCheck, Building2, Clock, FileText, DollarSign } from 'lucide-react';

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
  created_at: string;
}

interface Facility {
  id: string;
  name: string;
  description?: string;
  capacity?: number;
  created_at: string;
}

interface FacilityBooking {
  id: string;
  facility_id: string;
  resident_id: string;
  booking_date: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  created_at: string;
  facilities?: { name: string };
  profiles?: { full_name: string; email: string; contact_number: string };
}

interface PaperRequest {
  id: string;
  resident_id: string | null;
  paper_type: 'barangay_clearance' | 'certificate_of_indigency' | 'proof_of_residency';
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  payment_status: 'pending' | 'paid' | 'cash_pending';
  payment_code?: string;
  receipt_url?: string;
  document_url?: string;
  requester_name?: string | null;
  requester_email?: string | null;
  requester_phone?: string | null;
  requester_address?: string | null;
  created_at: string;
  updated_at: string;
  profiles?: { full_name: string; email: string; contact_number: string };
}

interface AdminDashboardProps {
  currentUser: Profile;
  onLogout: () => void;
}

export function AdminDashboard({ currentUser, onLogout }: AdminDashboardProps) {
  const [residents, setResidents] = useState<Profile[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [officials, setOfficials] = useState<Official[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [facilityBookings, setFacilityBookings] = useState<FacilityBooking[]>([]);
  const [paperRequests, setPaperRequests] = useState<PaperRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [bookingFilter, setBookingFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [paperFilter, setPaperFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [activeTab, setActiveTab] = useState<'residents' | 'events' | 'news' | 'officials' | 'facilities' | 'facilityApprovals' | 'paperApprovals'>('residents');
  const [editingPaperRequest, setEditingPaperRequest] = useState<PaperRequest | null>(null);
  const [paperApprovalForm, setPaperApprovalForm] = useState({
    document_url: '',
  });
  const [paperApprovalPaymentReceived, setPaperApprovalPaymentReceived] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showNewsForm, setShowNewsForm] = useState(false);
  const [showOfficialForm, setShowOfficialForm] = useState(false);
  const [showFacilityForm, setShowFacilityForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editingNews, setEditingNews] = useState<News | null>(null);
  const [editingOfficial, setEditingOfficial] = useState<Official | null>(null);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    event_date: '',
    location: '',
  });
  const [newsForm, setNewsForm] = useState({
    title: '',
    content: '',
    image_url: '',
    published: true,
  });
  const [officialForm, setOfficialForm] = useState({
    name: '',
    position: '',
  });
  const [facilityForm, setFacilityForm] = useState({
    name: '',
    description: '',
    capacity: '',
  });

  useEffect(() => {
    fetchResidents();
    fetchEvents();
    fetchNews();
    fetchOfficials();
    fetchFacilities();
    fetchFacilityBookings();
    fetchPaperRequests();
  }, []);

  const fetchResidents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResidents(data || []);
    } catch (error) {
      console.error('Error fetching residents:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true });

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
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNews(data || []);
    } catch (error) {
      console.error('Error fetching news:', error);
    }
  };

  const fetchOfficials = async () => {
    try {
      const { data, error } = await supabase
        .from('officials')
        .select('*')
        .order('position', { ascending: true });

      if (error) throw error;
      setOfficials(data || []);
    } catch (error) {
      console.error('Error fetching officials:', error);
      setOfficials([]);
    }
  };

  const fetchFacilities = async () => {
    try {
      const { data, error } = await supabase
        .from('facilities')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setFacilities(data || []);
    } catch (error) {
      console.error('Error fetching facilities:', error);
      setFacilities([]);
    }
  };

  const fetchFacilityBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('facility_bookings')
        .select(`
          *,
          facilities:facility_id (
            name,
            description,
            capacity
          ),
          profiles:resident_id (
            full_name,
            email,
            contact_number
          )
        `)
        .neq('status', 'cancelled') // Exclude cancelled bookings
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Facility bookings table not found:', error);
        setFacilityBookings([]);
        return;
      }
      setFacilityBookings(data || []);
    } catch (error) {
      console.error('Error fetching facility bookings:', error);
      setFacilityBookings([]);
    }
  };

  const handleApproveBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to approve this facility booking?')) return;
    try {
      const { error } = await supabase
        .from('facility_bookings')
        .update({ status: 'approved' })
        .eq('id', bookingId);

      if (error) throw error;
      await fetchFacilityBookings();
      alert('Facility booking approved successfully!');
    } catch (error) {
      console.error('Error approving booking:', error);
      alert('Failed to approve booking. Please try again.');
    }
  };

  const handleRejectBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to reject this facility booking?')) return;
    try {
      const { error } = await supabase
        .from('facility_bookings')
        .update({ status: 'rejected' })
        .eq('id', bookingId);

      if (error) throw error;
      await fetchFacilityBookings();
      alert('Facility booking rejected.');
    } catch (error) {
      console.error('Error rejecting booking:', error);
      alert('Failed to reject booking. Please try again.');
    }
  };

  const fetchPaperRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('paper_requests')
        .select(`
          *,
          profiles:resident_id (
            full_name,
            email,
            contact_number
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Paper requests table not found:', error);
        setPaperRequests([]);
        return;
      }
      setPaperRequests(data || []);
    } catch (error) {
      console.error('Error fetching paper requests:', error);
      setPaperRequests([]);
    }
  };

  // mark payment as paid quickly from list
  const handleMarkPaymentPaid = async (requestId: string) => {
    if (!confirm('Mark payment as PAID for this request?')) return;
    try {
      const { error } = await supabase
        .from('paper_requests')
        .update({ payment_status: 'paid', updated_at: new Date().toISOString() })
        .eq('id', requestId);
      if (error) throw error;
      await fetchPaperRequests();
      alert('Payment marked as paid.');
    } catch (err) {
      console.error('Error marking payment paid:', err);
      alert('Failed to update payment status. Please try again.');
    }
  };

  // mark payment as unpaid
  const handleMarkPaymentUnpaid = async (requestId: string) => {
    if (!confirm('Mark payment as UNPAID (Payment Pending) for this request?')) return;
    try {
      const { error } = await supabase
        .from('paper_requests')
        .update({ payment_status: 'cash_pending', updated_at: new Date().toISOString() })
        .eq('id', requestId);
      if (error) throw error;
      await fetchPaperRequests();
      alert('Payment marked as unpaid.');
    } catch (err) {
      console.error('Error marking payment unpaid:', err);
      alert('Failed to update payment status. Please try again.');
    }
  };

  // unapprove request (change status back to pending)
  const handleUnapprovePaperRequest = async (requestId: string) => {
    if (!confirm('Change status from APPROVED back to PENDING?')) return;
    try {
      const { error } = await supabase
        .from('paper_requests')
        .update({ status: 'pending', updated_at: new Date().toISOString() })
        .eq('id', requestId);
      if (error) throw error;
      await fetchPaperRequests();
      alert('Request status changed to pending.');
    } catch (err) {
      console.error('Error unapproving request:', err);
      alert('Failed to change request status. Please try again.');
    }
  };

  // approve (with optional mark-as-paid)
  const handleApprovePaperRequest = async (requestId: string) => {
    if (!paperApprovalForm.document_url?.trim()) {
      alert('Please provide a document URL before approving.');
      return;
    }
    if (!confirm('Are you sure you want to approve this paper request?')) return;
    try {
      const payload: any = {
        status: 'approved',
        document_url: paperApprovalForm.document_url,
        updated_at: new Date().toISOString(),
      };
      if (paperApprovalPaymentReceived) payload.payment_status = 'paid';

      const { error } = await supabase
        .from('paper_requests')
        .update(payload)
        .eq('id', requestId);
      if (error) throw error;
      await fetchPaperRequests();
      setEditingPaperRequest(null);
      setPaperApprovalForm({ document_url: '' });
      setPaperApprovalPaymentReceived(false);
      alert('Paper request approved successfully!');
    } catch (error) {
      console.error('Supabase error details:', error);
      alert('Failed to approve paper request. Please try again.');
    }
  };

  // approve and mark as paid in one action (quick action)
  const handleApproveAndMarkPaid = async (requestId: string) => {
    const documentUrl = prompt('Enter document URL (optional, press Cancel to skip):');
    if (documentUrl === null) {
      // User cancelled, but they might want to proceed without URL
      if (!confirm('Approve and mark as paid without document URL? You can add it later by editing.')) {
        return;
      }
    }
    
    if (!confirm('Approve this request and mark payment as PAID?')) return;
    
    try {
      const payload: any = {
        status: 'approved',
        payment_status: 'paid',
        updated_at: new Date().toISOString(),
      };
      if (documentUrl?.trim()) {
        payload.document_url = documentUrl.trim();
      }

      const { error } = await supabase
        .from('paper_requests')
        .update(payload)
        .eq('id', requestId);
      if (error) throw error;
      await fetchPaperRequests();
      alert('Request approved and marked as paid successfully!');
    } catch (error) {
      console.error('Error approving and marking paid:', error);
      alert('Failed to approve and mark as paid. Please try again.');
    }
  };

  const handleRejectPaperRequest = async (requestId: string) => {
    if (!confirm('Are you sure you want to reject this paper request?')) return;
    try {
      const { error } = await supabase
        .from('paper_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (error) throw error;
      await fetchPaperRequests();
      alert('Paper request rejected.');
    } catch (error) {
      console.error('Error rejecting paper request:', error);
      alert('Failed to reject paper request. Please try again.');
    }
  };

  const handleSaveEvent = async () => {
    try {
      if (editingEvent) {
        const { error } = await supabase
          .from('events')
          .update(eventForm)
          .eq('id', editingEvent.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('events')
          .insert([{ ...eventForm, created_by: currentUser.id }]);
        if (error) throw error;
      }
      await fetchEvents();
      setShowEventForm(false);
      setEditingEvent(null);
      setEventForm({ title: '', description: '', event_date: '', location: '' });

    } catch (error) {
      console.error('Error saving event:', error.message || error);
      alert('Failed to save event, make sure all fields are filled correctly.');
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;
      await fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const handleSaveNews = async () => {
    try {
      if (editingNews) {
        const { error } = await supabase
          .from('news')
          .update(newsForm)
          .eq('id', editingNews.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('news')
          .insert([{ ...newsForm, created_by: currentUser.id }]);
        if (error) throw error;
      }
      await fetchNews();
      setShowNewsForm(false);
      setEditingNews(null);
      setNewsForm({ title: '', content: '', image_url: '', published: true });
    } catch (error: any) {
      console.error('Error saving news:', error);
      alert(`Failed to post news: ${error.message}`);
    }
  };

  const handleDeleteNews = async (id: string) => {
    if (!confirm('Are you sure you want to delete this news?')) return;
    try {
      const { error } = await supabase.from('news').delete().eq('id', id);
      if (error) throw error;
      await fetchNews();
    } catch (error) {
      console.error('Error deleting news:', error);
    }
  };

  const startEditEvent = (event: Event) => {
    setEditingEvent(event);
    setEventForm({
      title: event.title,
      description: event.description,
      event_date: event.event_date,
      location: event.location,
    });
    setShowEventForm(true);
  };

  const startEditNews = (item: News) => {
    setEditingNews(item);
    setNewsForm({
      title: item.title,
      content: item.content,
      image_url: item.image_url,
      published: item.published,
    });
    setShowNewsForm(true);
  };

  const handleSaveOfficial = async () => {
    try {
      if (editingOfficial) {
        const { error } = await supabase
          .from('officials')
          .update(officialForm)
          .eq('id', editingOfficial.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('officials')
          .insert([officialForm]);
        if (error) throw error;
      }
      await fetchOfficials();
      setShowOfficialForm(false);
      setEditingOfficial(null);
      setOfficialForm({ name: '', position: '' });
    } catch (error: any) {
      console.error('Error saving official:', error);
      alert(`Failed to save official: ${error.message}`);
    }
  };

  const handleDeleteOfficial = async (id: string) => {
    if (!confirm('Are you sure you want to delete this official?')) return;
    try {
      const { error } = await supabase.from('officials').delete().eq('id', id);
      if (error) throw error;
      await fetchOfficials();
    } catch (error) {
      console.error('Error deleting official:', error);
      alert('Failed to delete official. Please try again.');
    }
  };

  const startEditOfficial = (official: Official) => {
    setEditingOfficial(official);
    setOfficialForm({
      name: official.name,
      position: official.position,
    });
    setShowOfficialForm(true);
  };

  const handleSaveFacility = async () => {
    try {
      const facilityData: any = {
        name: facilityForm.name,
        description: facilityForm.description || null,
        capacity: facilityForm.capacity ? parseInt(facilityForm.capacity) : null,
      };

      if (editingFacility) {
        const { error } = await supabase
          .from('facilities')
          .update(facilityData)
          .eq('id', editingFacility.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('facilities')
          .insert([facilityData]);
        if (error) throw error;
      }
      await fetchFacilities();
      setShowFacilityForm(false);
      setEditingFacility(null);
      setFacilityForm({ name: '', description: '', capacity: '' });
    } catch (error: any) {
      console.error('Error saving facility:', error);
      alert(`Failed to save facility: ${error.message}`);
    }
  };

  const handleDeleteFacility = async (id: string) => {
    if (!confirm('Are you sure you want to delete this facility?')) return;
    try {
      const { error } = await supabase.from('facilities').delete().eq('id', id);
      if (error) throw error;
      await fetchFacilities();
    } catch (error) {
      console.error('Error deleting facility:', error);
      alert('Failed to delete facility. Please try again.');
    }
  };

  const startEditFacility = (facility: Facility) => {
    setEditingFacility(facility);
    setFacilityForm({
      name: facility.name,
      description: facility.description || '',
      capacity: facility.capacity?.toString() || '',
    });
    setShowFacilityForm(true);
  };

  const sendApprovalEmail = async (email: string, fullName: string) => {
    try {
      // TODO: Implement email sending via Supabase Edge Function or email service
      // Example: Call a Supabase Edge Function
      // const { error } = await supabase.functions.invoke('send-approval-email', {
      //   body: { email, fullName }
      // });
      
      // For now, this is a placeholder. You can implement email sending by:
      // 1. Creating a Supabase Edge Function that sends emails using Resend, SendGrid, etc.
      // 2. Or using a third-party email service directly
      
      console.log(`Approval email should be sent to: ${email} for ${fullName}`);
      // This will send an email notification when the resident is approved
    } catch (error) {
      console.error('Error sending approval email:', error);
      // Don't throw - email failure shouldn't prevent approval
    }
  };

  const handleApprove = async (userId: string) => {
    try {
      // Get user info before approving
      const { data: resident } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', userId)
        .single();

      const { error } = await supabase
        .from('profiles')
        .update({ is_approved: true })
        .eq('id', userId);

      if (error) throw error;
      
      // Send email notification if resident data was found
      if (resident) {
        await sendApprovalEmail(resident.email, resident.full_name);
      }
      
      await fetchResidents();
    } catch (error) {
      console.error('Error approving user:', error);
      alert('Failed to approve resident. Please try again.');
    }
  };

  const handleReject = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_approved: false })
        .eq('id', userId);

      if (error) throw error;
      await fetchResidents();
    } catch (error) {
      console.error('Error rejecting user:', error);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this resident?')) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      await fetchResidents();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const filteredResidents = residents.filter((resident) => {
    if (filter === 'pending') return !resident.is_approved && resident.role === 'resident';
    if (filter === 'approved') return resident.is_approved;
    return true;
  });

  const pendingCount = residents.filter(
    (r) => !r.is_approved && r.role === 'resident'
  ).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Barangay Admin Portal</h1>
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
        <div className="mb-6 border-b border-gray-200 bg-white rounded-lg shadow-sm">
          <nav className="flex flex-wrap gap-2 px-4 py-2">
            <button
              onClick={() => setActiveTab('residents')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                activeTab === 'residents'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className={`w-4 h-4 ${activeTab === 'residents' ? 'text-white' : 'text-blue-600'}`} />
                Resident Management
              </div>
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                activeTab === 'events'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <Calendar className={`w-4 h-4 ${activeTab === 'events' ? 'text-white' : 'text-green-600'}`} />
                Events Management
              </div>
            </button>
            <button
              onClick={() => setActiveTab('news')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                activeTab === 'news'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <Newspaper className={`w-4 h-4 ${activeTab === 'news' ? 'text-white' : 'text-purple-600'}`} />
                News Management
              </div>
            </button>
            <button
              onClick={() => setActiveTab('officials')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                activeTab === 'officials'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <UserCheck className={`w-4 h-4 ${activeTab === 'officials' ? 'text-white' : 'text-indigo-600'}`} />
                Officials Management
              </div>
            </button>
            <button
              onClick={() => setActiveTab('facilities')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                activeTab === 'facilities'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <Building2 className={`w-4 h-4 ${activeTab === 'facilities' ? 'text-white' : 'text-orange-600'}`} />
                Facilities Management
              </div>
            </button>
            <button
              onClick={() => setActiveTab('facilityApprovals')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                activeTab === 'facilityApprovals'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock className={`w-4 h-4 ${activeTab === 'facilityApprovals' ? 'text-white' : 'text-yellow-600'}`} />
                Facility Approvals
              </div>
            </button>
            <button
              onClick={() => setActiveTab('paperApprovals')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                activeTab === 'paperApprovals'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className={`w-4 h-4 ${activeTab === 'paperApprovals' ? 'text-white' : 'text-red-600'}`} />
                Paper Approvals
              </div>
            </button>
          </nav>
        </div>
        {activeTab === 'residents' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Residents</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">
                  {residents.filter((r) => r.role === 'resident').length}
                </p>
              </div>
              <Users className="w-12 h-12 text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Pending Approval</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">{pendingCount}</p>
              </div>
              <CheckCircle className="w-12 h-12 text-orange-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Approved Residents</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {residents.filter((r) => r.is_approved && r.role === 'resident').length}
                </p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
          </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">Resident Management</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('pending')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filter === 'pending'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Pending ({pendingCount})
                </button>
                <button
                  onClick={() => setFilter('approved')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filter === 'approved'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Approved
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : filteredResidents.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No residents found</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredResidents.map((resident) => (
                    <tr key={resident.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {resident.full_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{resident.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600">{resident.address}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{resident.contact_number}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            resident.role === 'admin'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {resident.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            resident.is_approved
                              ? 'bg-green-100 text-green-800'
                              : 'bg-orange-100 text-orange-800'
                          }`}
                        >
                          {resident.is_approved ? 'Approved' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {resident.role !== 'admin' && (
                          <div className="flex gap-2">
                            {!resident.is_approved ? (
                              <button
                                onClick={() => handleApprove(resident.id)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Approve"
                              >
                                <CheckCircle className="w-5 h-5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleReject(resident.id)}
                                className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                title="Revoke Approval"
                              >
                                <XCircle className="w-5 h-5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(resident.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
          </>
        )}

        {activeTab === 'events' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">Events Management</h2>
              <button
                onClick={() => {
                  setShowEventForm(true);
                  setEditingEvent(null);
                  setEventForm({ title: '', description: '', event_date: '', location: '' });
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Event
              </button>
            </div>

            {showEventForm && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  {editingEvent ? 'Edit Event' : 'Add New Event'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={eventForm.title}
                      onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={eventForm.description}
                      onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Event Date & Time</label>
                    <input
                      type="datetime-local"
                      value={eventForm.event_date}
                      onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <input
                      type="text"
                      value={eventForm.location}
                      onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEvent}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setShowEventForm(false);
                        setEditingEvent(null);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {events.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                  <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No events yet. Create one to get started.</p>
                </div>
              ) : (
                events.map((event) => (
                  <div key={event.id} className="bg-white rounded-xl shadow-sm border p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-800">{event.title}</h3>
                        <p className="text-gray-600 mt-2">{event.description}</p>
                        <div className="flex gap-4 mt-4 text-sm text-gray-600">
                          <span>{new Date(event.event_date).toLocaleString()}</span>
                          {event.location && <span>📍 {event.location}</span>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEditEvent(event)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(event.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'news' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">News Management</h2>
              <button
                onClick={() => {
                  setShowNewsForm(true);
                  setEditingNews(null);
                  setNewsForm({ title: '', content: '', image_url: '', published: true });
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add News
              </button>
            </div>

            {showNewsForm && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  {editingNews ? 'Edit News' : 'Add New News'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={newsForm.title}
                      onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                    <textarea
                      value={newsForm.content}
                      onChange={(e) => setNewsForm({ ...newsForm, content: e.target.value })}
                      rows={6}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Image URL (optional)</label>
                    <input
                      type="url"
                      value={newsForm.image_url}
                      onChange={(e) => setNewsForm({ ...newsForm, image_url: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="published"
                      checked={newsForm.published}
                      onChange={(e) => setNewsForm({ ...newsForm, published: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="published" className="text-sm font-medium text-gray-700">
                      Publish immediately
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveNews}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setShowNewsForm(false);
                        setEditingNews(null);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {news.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                  <Newspaper className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No news yet. Create one to get started.</p>
                </div>
              ) : (
                news.map((item) => (
                  <div key={item.id} className="bg-white rounded-xl shadow-sm border p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-bold text-gray-800">{item.title}</h3>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              item.published
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {item.published ? 'Published' : 'Draft'}
                          </span>
                        </div>
                        <p className="text-gray-600 whitespace-pre-wrap">{item.content}</p>
                        {item.image_url && (
                          <p className="text-sm text-gray-500 mt-2">Image: {item.image_url}</p>
                        )}
                        <p className="text-sm text-gray-500 mt-4">
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
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEditNews(item)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteNews(item.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'officials' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">Officials Management</h2>
              <button
                onClick={() => {
                  setShowOfficialForm(true);
                  setEditingOfficial(null);
                  setOfficialForm({ name: '', position: '' });
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Official
              </button>
            </div>

            {showOfficialForm && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  {editingOfficial ? 'Edit Official' : 'Add New Official'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={officialForm.name}
                      onChange={(e) => setOfficialForm({ ...officialForm, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="Enter official's full name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                    <input
                      type="text"
                      value={officialForm.position}
                      onChange={(e) => setOfficialForm({ ...officialForm, position: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="e.g., Barangay Captain, Barangay Secretary"
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveOfficial}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setShowOfficialForm(false);
                        setEditingOfficial(null);
                        setOfficialForm({ name: '', position: '' });
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {officials.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                  <UserCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No officials yet. Add one to get started.</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Position
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {officials.map((official) => (
                          <tr key={official.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{official.name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-600">{official.position}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => startEditOfficial(official)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Edit"
                                >
                                  <Edit2 className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteOfficial(official.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'facilities' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">Facilities Management</h2>
              <button
                onClick={() => {
                  setShowFacilityForm(true);
                  setEditingFacility(null);
                  setFacilityForm({ name: '', description: '', capacity: '' });
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Facility
              </button>
            </div>

            {showFacilityForm && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  {editingFacility ? 'Edit Facility' : 'Add New Facility'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Facility Name</label>
                    <input
                      type="text"
                      value={facilityForm.name}
                      onChange={(e) => setFacilityForm({ ...facilityForm, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="e.g., Multi-Purpose Hall, Basketball Court"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={facilityForm.description}
                      onChange={(e) => setFacilityForm({ ...facilityForm, description: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="Describe the facility..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Capacity (optional)</label>
                    <input
                      type="number"
                      value={facilityForm.capacity}
                      onChange={(e) => setFacilityForm({ ...facilityForm, capacity: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="Maximum number of people"
                      min="1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveFacility}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      {editingFacility ? 'Update' : 'Save'} Facility
                    </button>
                    <button
                      onClick={() => {
                        setShowFacilityForm(false);
                        setEditingFacility(null);
                        setFacilityForm({ name: '', description: '', capacity: '' });
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border">
              {facilities.length === 0 ? (
                <div className="p-12 text-center">
                  <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">No Facilities Added</h3>
                  <p className="text-gray-500">Add facilities that residents can book for events.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Capacity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {facilities.map((facility) => (
                        <tr key={facility.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{facility.name}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-600">{facility.description || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-600">{facility.capacity || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex gap-2">
                              <button
                                onClick={() => startEditFacility(facility)}
                                className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                              >
                                <Edit2 className="w-4 h-4" />
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteFacility(facility.id)}
                                className="text-red-600 hover:text-red-900 flex items-center gap-1"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'facilityApprovals' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">Facility Booking Approvals</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setBookingFilter('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    bookingFilter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setBookingFilter('pending')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    bookingFilter === 'pending'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Pending ({facilityBookings.filter(b => b.status === 'pending').length})
                </button>
                <button
                  onClick={() => setBookingFilter('approved')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    bookingFilter === 'approved'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Approved
                </button>
                <button
                  onClick={() => setBookingFilter('rejected')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    bookingFilter === 'rejected'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Rejected
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border">
              {facilityBookings.filter(booking => 
                bookingFilter === 'all' || booking.status === bookingFilter
              ).length === 0 ? (
                <div className="p-12 text-center">
                  <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">No Bookings Found</h3>
                  <p className="text-gray-500">
                    {bookingFilter === 'pending' 
                      ? 'No pending facility booking requests.'
                      : `No ${bookingFilter} facility bookings.`}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Resident
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Facility
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Booking Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Request Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {facilityBookings
                        .filter(booking => 
                          bookingFilter === 'all' || booking.status === bookingFilter
                        )
                        .map((booking) => (
                          <tr key={booking.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {(booking.profiles as any)?.full_name || 'Unknown'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {(booking.profiles as any)?.email || ''}
                              </div>
                              <div className="text-xs text-gray-500">
                                {(booking.profiles as any)?.contact_number || ''}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900">
                                {(booking.facilities as any)?.name || 'Unknown Facility'}
                              </div>
                              {(booking.facilities as any)?.capacity && (
                                <div className="text-xs text-gray-500">
                                  Capacity: {(booking.facilities as any).capacity} people
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {new Date(booking.booking_date).toLocaleString('en-US', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true,
                                })}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-600">
                                {new Date(booking.created_at).toLocaleString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true,
                                })}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                booking.status === 'approved'
                                  ? 'bg-green-100 text-green-800'
                                  : booking.status === 'rejected'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              {booking.status === 'pending' && (
                                <div className="flex gap-2 items-center">
                                  <button
                                    onClick={() => handleApproveBooking(booking.id)}
                                    className="text-green-600 hover:text-green-900 flex items-center gap-1"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleRejectBooking(booking.id)}
                                    className="text-red-600 hover:text-red-900 flex items-center gap-1"
                                  >
                                    <XCircle className="w-4 h-4" />
                                    Reject
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'paperApprovals' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">Paper Request Approvals</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setPaperFilter('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    paperFilter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setPaperFilter('pending')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    paperFilter === 'pending'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Pending ({paperRequests.filter(r => r.status === 'pending').length})
                </button>
                <button
                  onClick={() => setPaperFilter('approved')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    paperFilter === 'approved'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Approved
                </button>
                <button
                  onClick={() => setPaperFilter('rejected')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    paperFilter === 'rejected'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Rejected
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border">
              {paperRequests.filter(request => 
                paperFilter === 'all' || request.status === paperFilter
              ).length === 0 ? (
                <div className="p-12 text-center">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">No Paper Requests Found</h3>
                  <p className="text-gray-500">
                    {paperFilter === 'pending' 
                      ? 'No pending paper requests.'
                      : `No ${paperFilter} paper requests.`}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Resident
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Paper Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Payment Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Request Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paperRequests
                        .filter(request => 
                          paperFilter === 'all' || request.status === paperFilter
                        )
                        .map((request) => (
                          <tr key={request.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {request.resident_id 
                                  ? ((request.profiles as any)?.full_name || 'Unknown')
                                  : (request.requester_name || 'Unknown')
                                }
                              </div>
                              <div className="text-xs text-gray-500">
                                {request.resident_id 
                                  ? ((request.profiles as any)?.email || '')
                                  : (request.requester_email || '')
                                }
                              </div>
                              <div className="text-xs text-gray-500">
                                {request.resident_id 
                                  ? ((request.profiles as any)?.contact_number || '')
                                  : (request.requester_phone || '')
                                }
                              </div>
                              {!request.resident_id && (
                                <div className="text-xs text-gray-500 mt-1">
                                  📍 {request.requester_address || ''}
                                </div>
                              )}
                              {!request.resident_id && (
                                <div className="text-xs text-orange-600 mt-1 font-medium">
                                  ⚠️ Public Request (Not Registered)
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 capitalize">
                                {request.paper_type.replace(/_/g, ' ')}
                              </div>
                              {request.payment_code && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Code: <span className="font-mono">{request.payment_code}</span>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                request.payment_status === 'paid'
                                  ? 'bg-green-100 text-green-800'
                                  : request.payment_status === 'cash_pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {request.payment_status === 'paid' ? 'Paid' :
                                 request.payment_status === 'cash_pending' ? 'Payment Pending' :
                                 'Payment Pending'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-600">
                                {new Date(request.created_at).toLocaleString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true,
                                })}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                request.status === 'approved'
                                  ? 'bg-green-100 text-green-800'
                                  : request.status === 'rejected'
                                  ? 'bg-red-100 text-red-800'
                                  : request.status === 'completed'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex flex-col gap-2 items-start">
                                {request.status === 'pending' ? (
                                  <>
                                    <div className="flex gap-2 items-center">
                                      <button
                                        onClick={() => {
                                          setEditingPaperRequest(request);
                                          setPaperApprovalForm({ document_url: request.document_url || '' });
                                          setPaperApprovalPaymentReceived(request.payment_status === 'paid');
                                        }}
                                        className="px-3 py-1.5 text-green-600 hover:text-green-900 hover:bg-green-50 flex items-center gap-1.5 rounded border border-green-200 transition-colors"
                                        title="Approve (with document URL)"
                                      >
                                        <CheckCircle className="w-4 h-4" />
                                        Approve
                                      </button>
                                      <button
                                        onClick={() => handleRejectPaperRequest(request.id)}
                                        className="px-3 py-1.5 text-red-600 hover:text-red-900 hover:bg-red-50 flex items-center gap-1.5 rounded border border-red-200 transition-colors"
                                      >
                                        <XCircle className="w-4 h-4" />
                                        Reject
                                      </button>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                      {request.payment_status !== 'paid' ? (
                                        <button
                                          onClick={() => handleMarkPaymentPaid(request.id)}
                                          className="px-3 py-1.5 text-blue-600 hover:text-blue-900 hover:bg-blue-50 flex items-center gap-1.5 rounded border border-blue-200 transition-colors"
                                          title="Mark payment received (paid)"
                                        >
                                          <DollarSign className="w-4 h-4" />
                                          Paid
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => handleMarkPaymentUnpaid(request.id)}
                                          className="px-3 py-1.5 text-orange-600 hover:text-orange-900 hover:bg-orange-50 flex items-center gap-1.5 rounded border border-orange-200 transition-colors"
                                          title="Mark payment as unpaid"
                                        >
                                          <DollarSign className="w-4 h-4" />
                                          Unpaid
                                        </button>
                                      )}
                                    </div>
                                  </>
                                ) : request.status === 'approved' ? (
                                  <>
                                    <div className="flex gap-2 items-center">
                                      <button
                                        onClick={() => handleUnapprovePaperRequest(request.id)}
                                        className="px-3 py-1.5 text-orange-600 hover:text-orange-900 hover:bg-orange-50 flex items-center gap-1.5 rounded border border-orange-200 transition-colors"
                                        title="Change status back to pending"
                                      >
                                        <XCircle className="w-4 h-4" />
                                        Unapprove
                                      </button>
                                      <button
                                        onClick={() => handleRejectPaperRequest(request.id)}
                                        className="px-3 py-1.5 text-red-600 hover:text-red-900 hover:bg-red-50 flex items-center gap-1.5 rounded border border-red-200 transition-colors"
                                      >
                                        <XCircle className="w-4 h-4" />
                                        Reject
                                      </button>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                      {request.payment_status !== 'paid' ? (
                                        <button
                                          onClick={() => handleMarkPaymentPaid(request.id)}
                                          className="px-3 py-1.5 text-blue-600 hover:text-blue-900 hover:bg-blue-50 flex items-center gap-1.5 rounded border border-blue-200 transition-colors"
                                          title="Mark payment received (paid)"
                                        >
                                          <DollarSign className="w-4 h-4" />
                                          Paid
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => handleMarkPaymentUnpaid(request.id)}
                                          className="px-3 py-1.5 text-orange-600 hover:text-orange-900 hover:bg-orange-50 flex items-center gap-1.5 rounded border border-orange-200 transition-colors"
                                          title="Mark payment as unpaid"
                                        >
                                          <DollarSign className="w-4 h-4" />
                                          Unpaid
                                        </button>
                                      )}
                                    </div>
                                  </>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Approval Modal */}
            {editingPaperRequest && (
              <div
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                onClick={() => {
                  setEditingPaperRequest(null);
                  setPaperApprovalForm({ document_url: '' });
                  setPaperApprovalPaymentReceived(false);
                }}
              >
                <div
                  className="bg-white rounded-xl max-w-2xl w-full p-6"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800">Approve Paper Request</h2>
                    <button
                      onClick={() => {
                        setEditingPaperRequest(null);
                        setPaperApprovalForm({ document_url: '' });
                        setPaperApprovalPaymentReceived(false);
                      }}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Requester:</p>
                      <p className="text-gray-900">
                        {editingPaperRequest.resident_id 
                          ? ((editingPaperRequest.profiles as any)?.full_name || 'Unknown')
                          : (editingPaperRequest.requester_name || 'Unknown')
                        }
                      </p>
                      {!editingPaperRequest.resident_id && (
                        <div className="mt-2 space-y-1">
                          <p className="text-xs text-gray-600">
                            Email: {editingPaperRequest.requester_email || 'N/A'}
                          </p>
                          <p className="text-xs text-gray-600">
                            Phone: {editingPaperRequest.requester_phone || 'N/A'}
                          </p>
                          <p className="text-xs text-gray-600">
                            Address: {editingPaperRequest.requester_address || 'N/A'}
                          </p>
                          <p className="text-xs text-orange-600 mt-2 font-medium">
                            ⚠️ This is a public request from an unregistered user
                          </p>
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Paper Type:</p>
                      <p className="text-gray-900 capitalize">
                        {editingPaperRequest.paper_type.replace(/_/g, ' ')}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Payment Status:</p>
                      <p className="text-gray-900">
                        {editingPaperRequest.payment_status === 'paid'
                          ? 'Paid'
                          : editingPaperRequest.payment_status === 'cash_pending'
                          ? 'Payment Pending'
                          : 'Payment Pending'}
                      </p>

                      {editingPaperRequest.payment_code && (
                        <p className="text-xs text-gray-500 mt-1">
                          Payment Code: <span className="font-mono">{editingPaperRequest.payment_code}</span>
                        </p>
                      )}

                      {editingPaperRequest.receipt_url && (
                        <p className="text-xs mt-2">
                          <a
                            href={editingPaperRequest.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            View Receipt
                          </a>
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Document URL <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="url"
                        value={paperApprovalForm.document_url}
                        onChange={(e) => setPaperApprovalForm({ document_url: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="https://example.com/document.pdf"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Enter the URL where the approved document can be accessed/downloaded
                      </p>
                    </div>

                    <div>
                      <label className="inline-flex items-center mt-2">
                        <input
                          type="checkbox"
                          checked={paperApprovalPaymentReceived}
                          onChange={(e) => setPaperApprovalPaymentReceived(e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Payment received (mark as Paid)</span>
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        If checked, payment_status will be set to "paid" when approving.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setEditingPaperRequest(null);
                        setPaperApprovalForm({ document_url: '' });
                        setPaperApprovalPaymentReceived(false);
                      }}
                      className="px-4 py-2 rounded border"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleApprovePaperRequest(editingPaperRequest.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve & Add Link
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}