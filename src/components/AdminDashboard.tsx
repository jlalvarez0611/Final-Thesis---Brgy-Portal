import { useState, useEffect, useRef } from 'react';
import { supabase, Profile } from '../lib/supabase';
import { LogOut, Users, CheckCircle, XCircle, Trash2, Calendar, Newspaper, Plus, Edit2, Save, X, UserCheck, Building2, Clock, FileText, DollarSign, Upload, FileUp } from 'lucide-react';
import {
  LucideIconByName,
  IconPickerGrid,
  DEFAULT_NEWS_ICON,
  DEFAULT_EVENT_ICON,
  NEWS_EVENTS_LIST_STYLES,
} from '../lib/newsEventIcons';
import { EventsNewsHeading } from './EventsNewsHeading';

interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  location: string;
  /** Lucide icon name for display */
  icon_name?: string | null;
  /** residents = community; officials = barangay officials */
  audience?: 'residents' | 'officials' | null;
  pinned?: boolean;
  pinned_at?: string | null;
  created_at: string;
}

interface News {
  id: string;
  title: string;
  content: string;
  /** Legacy; new posts use icon_name only */
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
  image_url?: string | null;
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

interface AdminDashboardProps {
  currentUser: Profile;
  onLogout: () => void;
}

export function AdminDashboard({ currentUser, onLogout }: AdminDashboardProps) {
  const [residents, setResidents] = useState<Profile[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [transparencyItems, setTransparencyItems] = useState<TransparencyItem[]>([]);
  const [officials, setOfficials] = useState<Official[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [facilityBookings, setFacilityBookings] = useState<FacilityBooking[]>([]);
  const [paperRequests, setPaperRequests] = useState<PaperRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [bookingFilter, setBookingFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [paperFilter, setPaperFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'completed'>('all');
  const [activeTab, setActiveTab] = useState<'residents' | 'events' | 'news' | 'officials' | 'facilities' | 'facilityApprovals' | 'paperApprovals' | 'transparency'>('residents');
  const [residentPage, setResidentPage] = useState(1);
  const [paperPage, setPaperPage] = useState(1);
  const [editingPaperRequest, setEditingPaperRequest] = useState<PaperRequest | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showNewsForm, setShowNewsForm] = useState(false);
  const [showTransparencyForm, setShowTransparencyForm] = useState(false);
  const [showOfficialForm, setShowOfficialForm] = useState(false);
  const [showFacilityForm, setShowFacilityForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editingNews, setEditingNews] = useState<News | null>(null);
  const [editingTransparencyItem, setEditingTransparencyItem] = useState<TransparencyItem | null>(null);
  const [editingOfficial, setEditingOfficial] = useState<Official | null>(null);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    event_date: '',
    location: '',
    audience: 'residents' as 'residents' | 'officials',
    icon_name: DEFAULT_EVENT_ICON,
  });
  const [newsForm, setNewsForm] = useState({
    title: '',
    content: '',
    published: true,
    icon_name: DEFAULT_NEWS_ICON,
  });
  const [transparencyForm, setTransparencyForm] = useState({
    title: '',
    description: '',
    category: 'general',
    file_url: '',
    published: true,
  });
  const [transparencyPdfFile, setTransparencyPdfFile] = useState<File | null>(null);
  const [transparencyUploading, setTransparencyUploading] = useState(false);
  const [officialForm, setOfficialForm] = useState({
    name: '',
    position: '',
    image_url: '',
  });
  const [officialImageFile, setOfficialImageFile] = useState<File | null>(null);
  const [facilityForm, setFacilityForm] = useState({
    name: '',
    description: '',
    capacity: '',
  });
  const historyInitialized = useRef(false);

  const VERIFICATION_BUCKET = 'resident-verification';
  const TRANSPARENCY_BUCKET = 'transparency';

  const uploadTransparencyPdf = async (file: File) => {
    const ext = (file.name.split('.').pop() || 'pdf').toLowerCase();
    if (ext !== 'pdf' && file.type !== 'application/pdf') {
      throw new Error('Please choose a PDF file.');
    }
    const maxBytes = 25 * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new Error('PDF must be 25 MB or smaller.');
    }
    const path = `reports/${Date.now()}-${Math.random().toString(16).slice(2)}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from(TRANSPARENCY_BUCKET)
      .upload(path, file, { upsert: false, contentType: 'application/pdf' });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from(TRANSPARENCY_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  };
  const [verificationPreviewUrl, setVerificationPreviewUrl] = useState<string | null>(null);
  const [verificationPreviewTitle, setVerificationPreviewTitle] = useState<string>('');

  const openVerificationImage = async (title: string, storagePath?: string | null) => {
    if (!storagePath) {
      alert('No verification image uploaded for this resident.');
      return;
    }
    const { data, error } = await supabase.storage
      .from(VERIFICATION_BUCKET)
      // Keep bucket private, but generate a long-lived signed URL for admin review.
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7);
    if (error) {
      console.error('Error creating signed URL:', error);
      alert('Unable to load image. Please check Storage policies for admins.');
      return;
    }
    setVerificationPreviewTitle(title);
    setVerificationPreviewUrl(data.signedUrl);
  };

  useEffect(() => {
    fetchResidents();
    fetchEvents();
    fetchNews();
    fetchTransparencyItems();
    fetchOfficials();
    fetchFacilities();
    fetchFacilityBookings();
    fetchPaperRequests();
  }, []);

  // Initialize browser history and handle back/forward buttons
  useEffect(() => {
    if (!historyInitialized.current) {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab') || 'residents';
      const validTabs = ['residents', 'events', 'news', 'officials', 'facilities', 'facilityApprovals', 'paperApprovals', 'transparency'];
      const initialTab = validTabs.includes(tabParam) ? (tabParam as any) : 'residents';

      const currentState = window.history.state;
      if (!currentState || !currentState.admin) {
        setActiveTab(initialTab);
        window.history.replaceState({ tab: initialTab, admin: true }, '', `/dashboard?tab=${initialTab}`);
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
      
      if (state && state.admin) {
        if (state.tab && ['residents', 'events', 'news', 'officials', 'facilities', 'facilityApprovals', 'paperApprovals', 'transparency'].includes(state.tab)) {
          setActiveTab(state.tab as any);
        }
      } else {
        // Restore from URL if no state
        const urlParams = new URLSearchParams(window.location.search);
        const tabParam = urlParams.get('tab') || 'residents';
        if (tabParam && ['residents', 'events', 'news', 'officials', 'facilities', 'facilityApprovals', 'paperApprovals', 'transparency'].includes(tabParam)) {
          setActiveTab(tabParam as any);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const handleTabChange = (tab: 'residents' | 'events' | 'news' | 'officials' | 'facilities' | 'facilityApprovals' | 'paperApprovals' | 'transparency') => {
    setActiveTab(tab);
    window.history.pushState({ tab, admin: true }, '', `/dashboard?tab=${tab}`);
  };

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
        .order('pinned', { ascending: false })
        .order('pinned_at', { ascending: false })
        .order('event_date', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const handleTogglePinEvent = async (eventId: string, nextPinned: boolean) => {
    try {
      const { error } = await supabase
        .from('events')
        .update({
          pinned: nextPinned,
          pinned_at: nextPinned ? new Date().toISOString() : null,
        })
        .eq('id', eventId);
      if (error) throw error;
      await fetchEvents();
    } catch (error) {
      console.error('Error pinning event:', error);
      alert('Failed to update pin status. Please check RLS policies for the events table.');
    }
  };

  const fetchNews = async () => {
    try {
      const base = supabase.from('news').select('*');

      let res = await base
        .order('pinned', { ascending: false })
        .order('pinned_at', { ascending: false })
        .order('created_at', { ascending: false });

      if (res.error && (res.error as any).code === '42703') {
        res = await base.order('created_at', { ascending: false });
      }

      if (res.error) throw res.error;
      setNews(res.data || []);
    } catch (error) {
      console.error('Error fetching news:', error);
    }
  };

  const fetchTransparencyItems = async () => {
    try {
      const { data, error } = await supabase
        .from('transparency_items')
        .select('*')
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

  const handleTogglePinTransparency = async (id: string, nextPinned: boolean) => {
    try {
      const { error } = await supabase
        .from('transparency_items')
        .update({ pinned: nextPinned, pinned_at: nextPinned ? new Date().toISOString() : null })
        .eq('id', id);
      if (error) throw error;
      await fetchTransparencyItems();
    } catch (error) {
      console.error('Error pinning transparency item:', error);
      alert('Failed to update pin status.');
    }
  };

  const handleSaveTransparencyItem = async () => {
    if (!transparencyForm.title.trim()) {
      alert('Please enter a title.');
      return;
    }
    setTransparencyUploading(true);
    try {
      let fileUrl: string | null = transparencyForm.file_url.trim() || null;
      if (transparencyPdfFile) {
        fileUrl = await uploadTransparencyPdf(transparencyPdfFile);
      }

      const payload: Record<string, unknown> = {
        title: transparencyForm.title.trim(),
        description: transparencyForm.description,
        category: transparencyForm.category,
        file_url: fileUrl,
        published: transparencyForm.published,
      };

      let error;
      if (editingTransparencyItem) {
        ({ error } = await supabase.from('transparency_items').update(payload).eq('id', editingTransparencyItem.id));
      } else {
        ({ error } = await supabase.from('transparency_items').insert([{ ...payload, created_by: currentUser.id }]));
      }
      if (error) throw error;
      setShowTransparencyForm(false);
      setEditingTransparencyItem(null);
      setTransparencyPdfFile(null);
      setTransparencyForm({ title: '', description: '', category: 'general', file_url: '', published: true });
      await fetchTransparencyItems();
    } catch (error: unknown) {
      console.error('Error saving transparency item:', error);
      const msg = error instanceof Error ? error.message : 'Please check RLS policies and that the Storage bucket "transparency" exists.';
      alert(`Failed to save transparency item. ${msg}`);
    } finally {
      setTransparencyUploading(false);
    }
  };

  const startEditTransparencyItem = (item: TransparencyItem) => {
    setEditingTransparencyItem(item);
    setTransparencyPdfFile(null);
    setTransparencyForm({
      title: item.title,
      description: item.description || '',
      category: item.category || 'general',
      file_url: item.file_url || '',
      published: item.published,
    });
    setShowTransparencyForm(true);
  };

  const handleDeleteTransparencyItem = async (id: string) => {
    if (!confirm('Delete this transparency item?')) return;
    try {
      const { error } = await supabase.from('transparency_items').delete().eq('id', id);
      if (error) throw error;
      await fetchTransparencyItems();
    } catch (error) {
      console.error('Error deleting transparency item:', error);
      alert('Failed to delete transparency item.');
    }
  };
  const handleTogglePinNews = async (newsId: string, nextPinned: boolean) => {
    try {
      const { error } = await supabase
        .from('news')
        .update({
          pinned: nextPinned,
          pinned_at: nextPinned ? new Date().toISOString() : null,
        })
        .eq('id', newsId);
      if (error) throw error;
      await fetchNews();
    } catch (error) {
      console.error('Error pinning news:', error);
      alert('Failed to update pin status. Please check RLS policies for the news table.');
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

  const handleRevokeApprovedBooking = async (bookingId: string) => {
    if (!confirm('Revoke this approved facility booking and set it back to pending?')) return;
    try {
      const { error } = await supabase
        .from('facility_bookings')
        .update({ status: 'pending' })
        .eq('id', bookingId);

      if (error) throw error;
      await fetchFacilityBookings();
      alert('Facility booking approval revoked. Booking is pending again.');
    } catch (error) {
      console.error('Error revoking approved booking:', error);
      alert('Failed to revoke approval. Please try again.');
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
        console.warn('Document requests table not found:', error);
        setPaperRequests([]);
        return;
      }
      setPaperRequests(data || []);
    } catch (error) {
      console.error('Error fetching document requests:', error);
      setPaperRequests([]);
    }
  };

  // mark payment as paid quickly from list
  const handleMarkPaymentPaid = async (requestId: string) => {
    if (!confirm('Mark transaction as DONE for this request?')) return;
    try {
      const { error } = await supabase
        .from('paper_requests')
        .update({
          payment_status: 'paid',
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);
      if (error) throw error;
      await fetchPaperRequests();
      alert('Transaction marked as done.');
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

  // undo "done" and return request to approved state
  const handleUndoDonePaperRequest = async (requestId: string) => {
    if (!confirm('Undo DONE for this request? It will return to APPROVED status.')) return;
    try {
      const { error } = await supabase
        .from('paper_requests')
        .update({
          status: 'approved',
          payment_status: 'cash_pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;
      await fetchPaperRequests();
      alert('Done status undone. Request is approved again.');
    } catch (err) {
      console.error('Error undoing done status:', err);
      alert('Failed to undo done status. Please try again.');
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

  // approve request immediately
  const handleApprovePaperRequest = async (requestId: string) => {
    if (!confirm('Are you sure you want to approve this request in Documents Approval?')) return;
    try {
      const payload: any = {
        status: 'approved',
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('paper_requests')
        .update(payload)
        .eq('id', requestId);
      if (error) throw error;
      await fetchPaperRequests();
      setEditingPaperRequest(null);
      alert('Documents Approval: request approved successfully!');
    } catch (error) {
      console.error('Supabase error details:', error);
      alert('Documents Approval: failed to approve. Please try again.');
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
    if (!confirm('Are you sure you want to reject this request in Documents Approval?')) return;
    try {
      const { error } = await supabase
        .from('paper_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (error) throw error;
      await fetchPaperRequests();
      alert('Documents Approval: request rejected.');
    } catch (error) {
      console.error('Error rejecting document request:', error);
      alert('Documents Approval: failed to reject. Please try again.');
    }
  };

  const normalizeEventDateForDb = (local: string) => {
    if (!local?.trim()) return '';
    const d = new Date(local);
    return Number.isNaN(d.getTime()) ? local.trim() : d.toISOString();
  };

  const isMissingColumnError = (err: { message?: string; code?: string } | null) => {
    if (!err) return false;
    const msg = (err.message || '').toLowerCase();
    return (
      err.code === '42703' ||
      (msg.includes('column') && msg.includes('does not exist')) ||
      msg.includes('schema cache')
    );
  };

  const handleSaveEvent = async () => {
    const title = eventForm.title.trim();
    const description = eventForm.description.trim();
    const event_date = normalizeEventDateForDb(eventForm.event_date);
    const location = eventForm.location.trim();
    const icon_name = (eventForm.icon_name || DEFAULT_EVENT_ICON).trim() || DEFAULT_EVENT_ICON;

    if (!title || !description || !event_date) {
      alert('Please fill in title, description, and event date & time.');
      return;
    }

    const locValue = location.length > 0 ? location : '';
    const base = { title, description, event_date, location: locValue };

    try {
      if (editingEvent) {
        const payloads: Record<string, unknown>[] = [
          { ...base, audience: eventForm.audience, icon_name },
          { ...base, audience: eventForm.audience },
          { ...base, icon_name },
          { ...base },
        ];
        let lastError: { message?: string; code?: string } | null = null;
        for (const payload of payloads) {
          const { error } = await supabase.from('events').update(payload).eq('id', editingEvent.id);
          if (!error) {
            lastError = null;
            break;
          }
          lastError = error;
          if (!isMissingColumnError(error)) break;
        }
        if (lastError) throw lastError;
      } else {
        const uid = currentUser.id;
        const attempts: Record<string, unknown>[] = [
          { ...base, audience: eventForm.audience, icon_name, created_by: uid },
          { ...base, audience: eventForm.audience, created_by: uid },
          { ...base, icon_name, created_by: uid },
          { ...base, created_by: uid },
          { ...base, audience: eventForm.audience, icon_name },
          { ...base, audience: eventForm.audience },
          { ...base, icon_name },
          { ...base },
        ];
        let lastError: { message?: string; code?: string } | null = null;
        for (const row of attempts) {
          const { error } = await supabase.from('events').insert([row]);
          if (!error) {
            lastError = null;
            break;
          }
          lastError = error;
          if (!isMissingColumnError(error)) break;
        }
        if (lastError) throw lastError;
      }

      await fetchEvents();
      setShowEventForm(false);
      setEditingEvent(null);
      setEventForm({
        title: '',
        description: '',
        event_date: '',
        location: '',
        audience: 'residents',
        icon_name: DEFAULT_EVENT_ICON,
      });
    } catch (error: unknown) {
      const err = error as { message?: string; code?: string };
      console.error('Error saving event:', err);
      alert(
        err?.message
          ? `Failed to save event: ${err.message}`
          : 'Failed to save event. Check the browser console and Supabase logs.',
      );
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
    const title = newsForm.title.trim();
    const content = newsForm.content.trim();
    if (!title || !content) {
      alert('Please enter a title and content.');
      return;
    }
    const icon_name = (newsForm.icon_name || DEFAULT_NEWS_ICON).trim() || DEFAULT_NEWS_ICON;
    const published = true;

    const updatePayloads: Record<string, unknown>[] = [
      { title, content, published, icon_name, image_url: null },
      { title, content, published, icon_name },
      { title, content, published, image_url: null },
      { title, content, published },
    ];

    try {
      if (editingNews) {
        let lastError: { message?: string; code?: string } | null = null;
        for (const payload of updatePayloads) {
          const { error } = await supabase.from('news').update(payload).eq('id', editingNews.id);
          if (!error) {
            lastError = null;
            break;
          }
          lastError = error;
          if (!isMissingColumnError(error)) break;
        }
        if (lastError) throw lastError;
      } else {
        const uid = currentUser.id;
        const insertPayloads = updatePayloads.map((p) => ({ ...p, created_by: uid }));
        let lastError: { message?: string; code?: string } | null = null;
        for (const row of insertPayloads) {
          const { error } = await supabase.from('news').insert([row]);
          if (!error) {
            lastError = null;
            break;
          }
          lastError = error;
          if (!isMissingColumnError(error)) break;
        }
        if (lastError) throw lastError;
      }
      await fetchNews();
      setShowNewsForm(false);
      setEditingNews(null);
      setNewsForm({ title: '', content: '', published: true, icon_name: DEFAULT_NEWS_ICON });
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error('Error saving news:', error);
      alert(`Failed to post news: ${err?.message ?? 'Unknown error'}`);
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
    const raw = event.event_date;
    let localDt = raw;
    if (raw && raw.includes('T')) {
      const d = new Date(raw);
      if (!Number.isNaN(d.getTime())) {
        const pad = (n: number) => String(n).padStart(2, '0');
        localDt = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      }
    }
    setEventForm({
      title: event.title,
      description: event.description,
      event_date: localDt,
      location: event.location,
      audience: event.audience === 'officials' ? 'officials' : 'residents',
      icon_name: event.icon_name || DEFAULT_EVENT_ICON,
    });
    setShowEventForm(true);
  };

  const startEditNews = (item: News) => {
    setEditingNews(item);
    setNewsForm({
      title: item.title,
      content: item.content,
      published: item.published,
      icon_name: item.icon_name || DEFAULT_NEWS_ICON,
    });
    setShowNewsForm(true);
  };

  const handleSaveOfficial = async () => {
    try {
      const OFFICIALS_BUCKET = 'officials';
      const uploadOfficialImage = async (file: File) => {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
        const path = `officials/${Date.now()}-${Math.random().toString(16).slice(2)}.${safeExt}`;
        const { error: uploadError } = await supabase.storage
          .from(OFFICIALS_BUCKET)
          .upload(path, file, { upsert: false, contentType: file.type });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from(OFFICIALS_BUCKET).getPublicUrl(path);
        return data.publicUrl;
      };

      let imageUrlToSave = officialForm.image_url || '';
      if (officialImageFile) {
        imageUrlToSave = await uploadOfficialImage(officialImageFile);
      }

      const payload: { name: string; position: string; image_url?: string | null } = {
        name: officialForm.name,
        position: officialForm.position,
      };
      if (imageUrlToSave) payload.image_url = imageUrlToSave;

      let lastError: any;
      if (editingOfficial) {
        const { error } = await supabase
          .from('officials')
          .update(payload)
          .eq('id', editingOfficial.id);
        lastError = error;
      } else {
        const { error } = await supabase.from('officials').insert([payload]);
        lastError = error;
      }

      if (lastError && /image_url|schema cache/i.test(lastError.message)) {
        const fallback = { name: officialForm.name, position: officialForm.position };
        if (editingOfficial) {
          const { error: retryErr } = await supabase.from('officials').update(fallback).eq('id', editingOfficial.id);
          if (retryErr) throw retryErr;
        } else {
          const { error: retryErr } = await supabase.from('officials').insert([fallback]);
          if (retryErr) throw retryErr;
        }
        alert('Official saved without photo. Run add_officials_image.sql in Supabase SQL Editor to enable photo uploads.');
      } else if (lastError) {
        throw lastError;
      }

      await fetchOfficials();
      setShowOfficialForm(false);
      setEditingOfficial(null);
      setOfficialForm({ name: '', position: '', image_url: '' });
      setOfficialImageFile(null);
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
      image_url: official.image_url || '',
    });
    setOfficialImageFile(null);
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

  /** Resolved row status for residents (admins ignored in filters). */
  const residentRowStatus = (r: Profile): 'pending' | 'approved' | 'rejected' => {
    if (r.role !== 'resident') return 'approved';
    if (r.is_approved) return 'approved';
    if (r.registration_status === 'rejected') return 'rejected';
    return 'pending';
  };

  const sendAccountStatusEmail = async (targetUserId: string, status: 'approved' | 'rejected') => {
    try {
      const { data, error } = await supabase.functions.invoke('send-account-status-email', {
        body: { target_user_id: targetUserId, status },
      });

      if (error) {
        let detail = error.message;
        const res = (error as { context?: Response }).context;
        if (res && typeof res.json === 'function') {
          try {
            const j = (await res.json()) as { error?: string; hint?: string; details?: unknown; detail?: string };
            if (j?.error) detail += `\n${j.error}`;
            if (j?.hint) detail += `\n${j.hint}`;
            if (j?.detail) detail += `\n${j.detail}`;
            if (j?.details != null) detail += `\n${JSON.stringify(j.details)}`;
          } catch {
            /* ignore */
          }
        }
        console.error('send-account-status-email:', detail, error);
        alert(
          `Account was updated, but the notification email failed.\n\n${detail}\n\n` +
            'Redeploy send-account-status-email, set RESEND_API_KEY, and ensure the resident has an email in Auth or profiles.',
        );
        return;
      }

      if (data && typeof data === 'object' && data !== null && 'error' in data) {
        console.error('send-account-status-email response:', data);
        const d = data as { error?: string; hint?: string; details?: unknown };
        let msg = d.error || 'Unknown error';
        if (d.hint) msg += `\n\n${d.hint}`;
        else if (d.details != null) msg += `\n\n${JSON.stringify(d.details)}`;
        alert(`Email failed: ${msg}`);
      }
    } catch (err) {
      console.error('sendAccountStatusEmail:', err);
      alert(`Email request failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleApprove = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_approved: true, registration_status: 'approved' })
        .eq('id', userId);

      if (error) throw error;

      await sendAccountStatusEmail(userId, 'approved');

      await fetchResidents();
    } catch (error) {
      console.error('Error approving user:', error);
      alert('Failed to approve resident. Please try again.');
    }
  };

  /** Deny registration (distinct from revoking approval). Sends rejection email. */
  const handleRejectRegistration = async (userId: string) => {
    if (!confirm('Reject this registration? The resident will be notified by email.')) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_approved: false, registration_status: 'rejected' })
        .eq('id', userId);

      if (error) throw error;

      await sendAccountStatusEmail(userId, 'rejected');

      await fetchResidents();
    } catch (error) {
      console.error('Error rejecting registration:', error);
      alert('Failed to reject registration. Please try again.');
    }
  };

  /** Return an approved resident to the pending queue (no email). */
  const handleRevokeApproval = async (userId: string) => {
    if (!confirm('Revoke approval for this resident? They will need to be approved again.')) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_approved: false, registration_status: 'pending' })
        .eq('id', userId);

      if (error) throw error;
      await fetchResidents();
    } catch (error) {
      console.error('Error revoking approval:', error);
      alert('Failed to revoke approval. Please try again.');
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

  const filteredResidents = residents
    .filter((resident) => {
      if (resident.role !== 'resident' && filter !== 'all') return false;
      if (filter === 'pending')
        return resident.role === 'resident' && residentRowStatus(resident) === 'pending';
      if (filter === 'approved')
        return resident.role === 'resident' && residentRowStatus(resident) === 'approved';
      if (filter === 'rejected')
        return resident.role === 'resident' && residentRowStatus(resident) === 'rejected';
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA; // Newest first
    });

  const residentsPerPage = 10;
  const totalPages = Math.ceil(filteredResidents.length / residentsPerPage);
  const startIndex = (residentPage - 1) * residentsPerPage;
  const paginatedResidents = filteredResidents.slice(startIndex, startIndex + residentsPerPage);
  const filteredPaperRequests = paperRequests.filter(
    (request) => paperFilter === 'all' || request.status === paperFilter,
  );
  const paperRequestsPerPage = 10;
  const totalPaperPages = Math.ceil(filteredPaperRequests.length / paperRequestsPerPage);
  const paperStartIndex = (paperPage - 1) * paperRequestsPerPage;
  const paginatedPaperRequests = filteredPaperRequests.slice(
    paperStartIndex,
    paperStartIndex + paperRequestsPerPage,
  );

  const pendingCount = residents.filter(
    (r) => r.role === 'resident' && residentRowStatus(r) === 'pending',
  ).length;

  const rejectedCount = residents.filter(
    (r) => r.role === 'resident' && residentRowStatus(r) === 'rejected',
  ).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-3">
            <div className="min-w-0">
              <h1 className="text-base sm:text-2xl font-bold text-gray-800 truncate">Barangay Admin Portal</h1>
              <p className="hidden sm:block text-sm text-gray-600 truncate">Welcome, {currentUser.full_name}</p>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm sm:text-base shrink-0"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 border-b border-gray-200 bg-white rounded-lg shadow-sm">
          <nav className="flex gap-2.5 px-4 py-3 overflow-x-auto sm:flex-wrap">
            <button
              onClick={() => handleTabChange('residents')}
              className={`px-3 sm:px-5 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-semibold transition-all whitespace-nowrap ${
                activeTab === 'residents'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className={`w-5 h-5 shrink-0 ${activeTab === 'residents' ? 'text-white' : 'text-blue-600'}`} />
                Resident Management
              </div>
            </button>
            <button
              onClick={() => handleTabChange('events')}
              className={`px-3 sm:px-5 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-semibold transition-all whitespace-nowrap ${
                activeTab === 'events'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <Calendar className={`w-5 h-5 shrink-0 ${activeTab === 'events' ? 'text-white' : 'text-green-600'}`} />
                Events Management
              </div>
            </button>
            <button
              onClick={() => handleTabChange('news')}
              className={`px-3 sm:px-5 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-semibold transition-all whitespace-nowrap ${
                activeTab === 'news'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <Newspaper className={`w-5 h-5 shrink-0 ${activeTab === 'news' ? 'text-white' : 'text-purple-600'}`} />
                News Management
              </div>
            </button>
            <button
              onClick={() => handleTabChange('officials')}
              className={`px-3 sm:px-5 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-semibold transition-all whitespace-nowrap ${
                activeTab === 'officials'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <UserCheck className={`w-5 h-5 shrink-0 ${activeTab === 'officials' ? 'text-white' : 'text-indigo-600'}`} />
                Officials Management
              </div>
            </button>
            <button
              onClick={() => handleTabChange('facilities')}
              className={`px-3 sm:px-5 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-semibold transition-all whitespace-nowrap ${
                activeTab === 'facilities'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <Building2 className={`w-5 h-5 shrink-0 ${activeTab === 'facilities' ? 'text-white' : 'text-orange-600'}`} />
                Facilities Management
              </div>
            </button>
            <button
              onClick={() => handleTabChange('facilityApprovals')}
              className={`px-3 sm:px-5 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-semibold transition-all whitespace-nowrap ${
                activeTab === 'facilityApprovals'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock className={`w-5 h-5 shrink-0 ${activeTab === 'facilityApprovals' ? 'text-white' : 'text-yellow-600'}`} />
                Facility Approvals
              </div>
            </button>
            <button
              onClick={() => handleTabChange('paperApprovals')}
              className={`px-3 sm:px-5 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-semibold transition-all whitespace-nowrap ${
                activeTab === 'paperApprovals'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className={`w-5 h-5 shrink-0 ${activeTab === 'paperApprovals' ? 'text-white' : 'text-orange-600'}`} />
                Documents Approval
              </div>
            </button>
            <button
              onClick={() => handleTabChange('transparency')}
              className={`px-5 py-3 rounded-xl text-base font-semibold transition-all ${
                activeTab === 'transparency'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className={`w-5 h-5 shrink-0 ${activeTab === 'transparency' ? 'text-white' : 'text-slate-700'}`} />
                Transparency
              </div>
            </button>
          </nav>
        </div>
        {activeTab === 'residents' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-8 rounded-2xl shadow-lg border border-blue-200 hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-600 text-sm font-semibold uppercase tracking-wide">Total Residents</p>
                    <p className="text-4xl font-bold text-blue-900 mt-2">
                      {residents.filter((r) => r.role === 'resident').length}
                    </p>
                  </div>
                  <Users className="w-16 h-16 text-blue-400 opacity-80" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-8 rounded-2xl shadow-lg border border-orange-200 hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-600 text-sm font-semibold uppercase tracking-wide">Pending Approval</p>
                    <p className="text-4xl font-bold text-orange-900 mt-2">{pendingCount}</p>
                  </div>
                  <CheckCircle className="w-16 h-16 text-orange-400 opacity-80" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 p-8 rounded-2xl shadow-lg border border-green-200 hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-600 text-sm font-semibold uppercase tracking-wide">Approved Residents</p>
                    <p className="text-4xl font-bold text-green-900 mt-2">
                      {residents.filter((r) => r.role === 'resident' && residentRowStatus(r) === 'approved').length}
                    </p>
                  </div>
                  <CheckCircle className="w-16 h-16 text-green-400 opacity-80" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-red-100 p-8 rounded-2xl shadow-lg border border-red-200 hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-600 text-sm font-semibold uppercase tracking-wide">Rejected</p>
                    <p className="text-4xl font-bold text-red-900 mt-2">{rejectedCount}</p>
                  </div>
                  <XCircle className="w-16 h-16 text-red-400 opacity-80" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 via-blue-50 to-gray-50 p-8 border-b-2 border-blue-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">Resident Management</h2>
                    <p className="text-sm text-gray-600 mt-1">Manage and approve resident registrations</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setFilter('all');
                        setResidentPage(1);
                      }}
                      className={`px-5 py-2 rounded-lg font-semibold transition-all ${
                        filter === 'all'
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                          : 'bg-white text-gray-700 border border-gray-300 hover:shadow-md hover:border-gray-400'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => {
                        setFilter('pending');
                        setResidentPage(1);
                      }}
                      className={`px-5 py-2 rounded-lg font-semibold transition-all ${
                        filter === 'pending'
                          ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg'
                          : 'bg-white text-gray-700 border border-gray-300 hover:shadow-md hover:border-gray-400'
                      }`}
                    >
                      Pending ({pendingCount})
                    </button>
                    <button
                      onClick={() => {
                        setFilter('approved');
                        setResidentPage(1);
                      }}
                      className={`px-5 py-2 rounded-lg font-semibold transition-all ${
                        filter === 'approved'
                          ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg'
                          : 'bg-white text-gray-700 border border-gray-300 hover:shadow-md hover:border-gray-400'
                      }`}
                    >
                      Approved
                    </button>
                    <button
                      onClick={() => {
                        setFilter('rejected');
                        setResidentPage(1);
                      }}
                      className={`px-5 py-2 rounded-lg font-semibold transition-all ${
                        filter === 'rejected'
                          ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg'
                          : 'bg-white text-gray-700 border border-gray-300 hover:shadow-md hover:border-gray-400'
                      }`}
                    >
                      Rejected ({rejectedCount})
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gradient-to-r from-blue-50 to-gray-50 border-b border-gray-200 flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  <span className="font-semibold text-gray-700">Page {residentPage} of {totalPages}</span>
                </div>
              </div>

              <div className="overflow-x-auto bg-white border-t-2 border-gray-200">
                {loading ? (
                  <div className="p-12 text-center text-gray-500 text-lg">Loading...</div>
                ) : filteredResidents.length === 0 ? (
                  <div className="p-12 text-center text-gray-500 text-lg">No residents found</div>
                ) : (
                  <table className="w-full border-collapse">
                    <thead className="bg-gradient-to-r from-gray-100 to-gray-50 border-b-2 border-gray-300 sticky top-0">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">First Name</th>
                    <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Last Name</th>
                    <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Middle Name</th>
                    <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Suffix</th>
                    <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Email</th>
                    <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Mobile</th>
                    <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Sex</th>
                    <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Civil Status</th>
                    <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">DOB</th>
                    <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">POB</th>
                    <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Nationality</th>
                    <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Address</th>
                    <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Contact</th>
                    <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Role</th>
                    <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Status</th>
                    <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">ID</th>
                    <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Selfie</th>
                    <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedResidents.map((resident) => (
                    <tr key={resident.id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 border-l-4 border-l-transparent hover:border-l-blue-500">
                      <td className="px-5 py-4 whitespace-nowrap border-r border-gray-200 text-sm text-gray-900 font-semibold">{resident.first_name || 'N/A'}</td>
                      <td className="px-5 py-4 whitespace-nowrap border-r border-gray-200 text-sm text-gray-800">{resident.last_name || 'N/A'}</td>
                      <td className="px-5 py-4 whitespace-nowrap border-r border-gray-200 text-sm text-gray-700">{resident.middle_name || 'N/A'}</td>
                      <td className="px-5 py-4 whitespace-nowrap border-r border-gray-200 text-sm text-gray-700">{resident.suffix || 'N/A'}</td>
                      <td className="px-5 py-4 whitespace-nowrap border-r border-gray-200 text-sm text-blue-600 font-medium">{resident.email || 'N/A'}</td>
                      <td className="px-5 py-4 whitespace-nowrap border-r border-gray-200 text-sm text-gray-700">{resident.mobile_number || 'N/A'}</td>
                      <td className="px-5 py-4 whitespace-nowrap border-r border-gray-200 text-sm text-gray-700">{resident.sex || 'N/A'}</td>
                      <td className="px-5 py-4 whitespace-nowrap border-r border-gray-200 text-sm text-gray-700">{resident.civil_status || 'N/A'}</td>
                      <td className="px-5 py-4 whitespace-nowrap border-r border-gray-200 text-sm text-gray-700">{resident.date_of_birth || 'N/A'}</td>
                      <td className="px-5 py-4 whitespace-nowrap border-r border-gray-200 text-sm text-gray-700">{resident.place_of_birth || 'N/A'}</td>
                      <td className="px-5 py-4 whitespace-nowrap border-r border-gray-200 text-sm text-gray-700">{resident.nationality || 'N/A'}</td>
                      <td className="px-5 py-4 border-r border-gray-200 text-sm text-gray-700">{resident.address || 'N/A'}</td>
                      <td className="px-5 py-4 whitespace-nowrap border-r border-gray-200 text-sm text-gray-700">{resident.contact_number || 'N/A'}</td>
                      <td className="px-5 py-4 whitespace-nowrap border-r border-gray-200 text-sm">
                        <span className={`px-3 py-2 text-xs font-bold rounded-lg transition-all shadow-sm ${
                          resident.role === 'admin'
                            ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-900'
                            : 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-900'
                        }`}>
                          {resident.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap border-r border-gray-200 text-sm">
                        <span className={`px-3 py-2 text-xs font-bold rounded-lg transition-all shadow-sm ${
                          resident.role === 'resident' && residentRowStatus(resident) === 'approved'
                            ? 'bg-gradient-to-r from-green-100 to-emerald-200 text-green-900'
                            : resident.role === 'resident' && residentRowStatus(resident) === 'rejected'
                              ? 'bg-gradient-to-r from-red-100 to-rose-200 text-red-900'
                              : resident.role === 'resident'
                                ? 'bg-gradient-to-r from-orange-100 to-amber-200 text-orange-900'
                                : 'bg-gradient-to-r from-gray-100 to-slate-200 text-gray-800'
                        }`}>
                          {resident.role !== 'resident'
                            ? '—'
                            : residentRowStatus(resident) === 'approved'
                              ? '✓ APPROVED'
                              : residentRowStatus(resident) === 'rejected'
                                ? '✕ REJECTED'
                                : '⏳ PENDING'}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap border-r border-gray-200 text-sm">
                        <button
                          onClick={() => openVerificationImage('Valid ID', resident.id_image_path)}
                          className="px-3 py-2 text-xs font-bold rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition-all shadow-sm"
                          title="View uploaded ID"
                        >
                          View ID
                        </button>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap border-r border-gray-200 text-sm">
                        <button
                          onClick={() => openVerificationImage('Selfie', resident.selfie_image_path)}
                          className="px-3 py-2 text-xs font-bold rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 transition-all shadow-sm"
                          title="View uploaded selfie"
                        >
                          View Selfie
                        </button>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          {resident.role !== 'admin' && (
                            <>
                              {resident.role === 'resident' && residentRowStatus(resident) === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleApprove(resident.id)}
                                    className="p-2.5 text-green-600 bg-green-100 hover:bg-green-200 rounded-lg transition-all shadow-sm hover:shadow-md hover:scale-110"
                                    title="Approve"
                                  >
                                    <CheckCircle className="w-5 h-5" />
                                  </button>
                                  <button
                                    onClick={() => handleRejectRegistration(resident.id)}
                                    className="p-2.5 text-red-600 bg-red-100 hover:bg-red-200 rounded-lg transition-all shadow-sm hover:shadow-md hover:scale-110"
                                    title="Reject registration"
                                  >
                                    <XCircle className="w-5 h-5" />
                                  </button>
                                </>
                              )}
                              {resident.role === 'resident' && residentRowStatus(resident) === 'approved' && (
                                <button
                                  onClick={() => handleRevokeApproval(resident.id)}
                                  className="p-2.5 text-orange-600 bg-orange-100 hover:bg-orange-200 rounded-lg transition-all shadow-sm hover:shadow-md hover:scale-110"
                                  title="Revoke approval"
                                >
                                  <XCircle className="w-5 h-5" />
                                </button>
                              )}
                              {resident.role === 'resident' && residentRowStatus(resident) === 'rejected' && (
                                <button
                                  onClick={() => handleApprove(resident.id)}
                                  className="p-2.5 text-green-600 bg-green-100 hover:bg-green-200 rounded-lg transition-all shadow-sm hover:shadow-md hover:scale-110"
                                  title="Approve (override rejection)"
                                >
                                  <CheckCircle className="w-5 h-5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(resident.id)}
                                className="p-2.5 text-red-600 bg-red-100 hover:bg-red-200 rounded-lg transition-all shadow-sm hover:shadow-md hover:scale-110"
                                title="Delete"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
              </div>

              <div className="border-t-2 border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 p-6">
                {!loading && filteredResidents.length > 0 && (
                  <div className="flex flex-col items-center gap-6">
                    <div className="w-full flex justify-center">
                      <div className="flex justify-center items-center gap-3 flex-wrap">
                        <button
                          onClick={() => setResidentPage(prev => Math.max(prev - 1, 1))}
                          disabled={residentPage === 1}
                          className={`px-4 py-2 rounded-lg font-medium transition-all ${
                            residentPage === 1
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg hover:scale-105'
                          }`}
                        >
                          ← Previous
                        </button>
                        
                        <div className="flex gap-2 flex-wrap justify-center">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <button
                              key={page}
                              onClick={() => setResidentPage(page)}
                              className={`px-3 py-2 rounded-lg font-medium transition-all ${
                                residentPage === page
                                  ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md scale-110'
                                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100 hover:border-gray-400'
                              }`}
                            >
                              {page}
                            </button>
                          ))}
                        </div>

                        <button
                          onClick={() => setResidentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={residentPage === totalPages}
                          className={`px-4 py-2 rounded-lg font-medium transition-all ${
                            residentPage === totalPages
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg hover:scale-105'
                          }`}
                        >
                          Next →
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
        </>
        )}

        {activeTab === 'transparency' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
              <EventsNewsHeading
                variant="transparency"
                title="Transparency Management"
                subtitle="Publish reports, PDFs, and disclosures for residents to view on the Transparency tab"
                centered
              />
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => {
                    setShowTransparencyForm(true);
                    setEditingTransparencyItem(null);
                    setTransparencyPdfFile(null);
                    setTransparencyForm({ title: '', description: '', category: 'general', file_url: '', published: true });
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              </div>
            </div>

            {showTransparencyForm && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  {editingTransparencyItem ? 'Edit Item' : 'Add New Item'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={transparencyForm.title}
                      onChange={(e) => setTransparencyForm({ ...transparencyForm, title: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={transparencyForm.description}
                      onChange={(e) => setTransparencyForm({ ...transparencyForm, description: e.target.value })}
                      rows={5}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <input
                        type="text"
                        value={transparencyForm.category}
                        onChange={(e) => setTransparencyForm({ ...transparencyForm, category: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="general, budget, procurement, ordinance, minutes..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">External file URL (optional)</label>
                      <input
                        type="url"
                        value={transparencyForm.file_url}
                        onChange={(e) => setTransparencyForm({ ...transparencyForm, file_url: e.target.value })}
                        disabled={!!transparencyPdfFile}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:bg-gray-100 disabled:text-gray-500"
                        placeholder="https://... (only if not uploading a PDF below)"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                      <FileUp className="w-4 h-4 text-red-600" />
                      Upload transparency report (PDF)
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Upload a PDF (max 25 MB). Residents can open it from their Transparency tab. Choosing a file here overrides the URL field on save.
                    </p>
                    <label className="flex flex-col sm:flex-row sm:items-center gap-3 cursor-pointer">
                      <span className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 border border-slate-300 rounded-lg text-sm font-medium text-slate-800 hover:bg-slate-200 transition-colors">
                        <Upload className="w-4 h-4" />
                        Choose PDF
                      </span>
                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0] ?? null;
                          setTransparencyPdfFile(f);
                          e.target.value = '';
                        }}
                      />
                      <span className="text-sm text-gray-600 truncate">
                        {transparencyPdfFile ? transparencyPdfFile.name : editingTransparencyItem?.file_url ? 'Keep current file, or choose a new PDF to replace it' : 'No file selected'}
                      </span>
                    </label>
                    {transparencyPdfFile && (
                      <button
                        type="button"
                        onClick={() => setTransparencyPdfFile(null)}
                        className="mt-2 text-sm text-red-600 hover:underline"
                      >
                        Clear selected PDF
                      </button>
                    )}
                    {editingTransparencyItem?.file_url && !transparencyPdfFile && (
                      <p className="mt-2 text-sm">
                        <span className="text-gray-600">Current file: </span>
                        <a
                          href={editingTransparencyItem.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline font-medium"
                        >
                          Open current PDF
                        </a>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={transparencyForm.published}
                      onChange={(e) => setTransparencyForm({ ...transparencyForm, published: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Published</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveTransparencyItem}
                      disabled={transparencyUploading}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <Save className="w-4 h-4" />
                      {transparencyUploading ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={() => {
                        setShowTransparencyForm(false);
                        setEditingTransparencyItem(null);
                        setTransparencyPdfFile(null);
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
              {transparencyItems.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No transparency items yet.</p>
                </div>
              ) : (
                transparencyItems.map((item) => (
                  <div key={item.id} className="bg-white rounded-xl shadow-sm border p-6">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-bold text-gray-800">{item.title}</h3>
                          {item.pinned && <span className="px-2 py-1 text-xs font-bold rounded-full bg-yellow-100 text-yellow-800">Pinned</span>}
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${item.published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {item.published ? 'Published' : 'Draft'}
                          </span>
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700">
                            {item.category || 'general'}
                          </span>
                        </div>
                        {item.description && <p className="text-gray-600 whitespace-pre-wrap">{item.description}</p>}
                        {item.file_url && (
                          <a className="text-sm text-blue-600 hover:underline mt-2 inline-block" href={item.file_url} target="_blank" rel="noreferrer">
                            Open file
                          </a>
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
                          onClick={() => handleTogglePinTransparency(item.id, !item.pinned)}
                          className={`p-2 rounded-lg transition-colors ${item.pinned ? 'text-yellow-700 hover:bg-yellow-50' : 'text-yellow-600 hover:bg-yellow-50'}`}
                          title={item.pinned ? 'Unpin' : 'Pin'}
                        >
                          ★
                        </button>
                        <button onClick={() => startEditTransparencyItem(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleDeleteTransparencyItem(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
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

        {verificationPreviewUrl && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setVerificationPreviewUrl(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-bold text-gray-800">{verificationPreviewTitle}</h3>
                <button
                  onClick={() => setVerificationPreviewUrl(null)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 bg-gray-50">
                <img src={verificationPreviewUrl} alt={verificationPreviewTitle} className="max-h-[70vh] w-full object-contain rounded-lg bg-white" />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'events' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
              <EventsNewsHeading
                variant="events"
                title="Events Management"
                subtitle="Create and organize barangay events for residents and officials"
                centered
              />
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => {
                    setShowEventForm(true);
                    setEditingEvent(null);
                    setEventForm({
                      title: '',
                      description: '',
                      event_date: '',
                      location: '',
                      audience: 'residents',
                      icon_name: DEFAULT_EVENT_ICON,
                    });
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Event
                </button>
              </div>
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
                      rows={10}
                      className="w-full min-h-[200px] px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm leading-relaxed"
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
                  <IconPickerGrid
                    value={eventForm.icon_name}
                    onChange={(icon_name) => setEventForm({ ...eventForm, icon_name })}
                    label="Event icon"
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Event Presenter</label>
                    <p className="text-xs text-gray-500 mb-2">Please specify who presented this event.</p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="event_audience"
                          checked={eventForm.audience === 'residents'}
                          onChange={() => setEventForm({ ...eventForm, audience: 'residents' })}
                        />
                        <span className="text-sm text-gray-800">Community (non-officials)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="event_audience"
                          checked={eventForm.audience === 'officials'}
                          onChange={() => setEventForm({ ...eventForm, audience: 'officials' })}
                        />
                        <span className="text-sm text-gray-800">Barangay officials</span>
                      </label>
                    </div>
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

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {events.length === 0 ? (
                <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                  <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No events yet. Create one to get started.</p>
                </div>
              ) : (
                events.map((event) => (
                  <div
                    key={event.id}
                    className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 min-h-[180px] flex flex-col hover:border-slate-300 transition-colors"
                  >
                    <div className="flex justify-between items-start gap-3 flex-1">
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
                                event.audience === 'officials'
                                  ? 'bg-violet-100 text-violet-800'
                                  : 'bg-sky-100 text-sky-800'
                              }`}
                            >
                              {event.audience === 'officials' ? 'Officials' : 'Community'}
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
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleTogglePinEvent(event.id, !event.pinned)}
                          className={`p-2 rounded-lg transition-colors ${
                            event.pinned ? 'text-yellow-700 hover:bg-yellow-50' : 'text-yellow-600 hover:bg-yellow-50'
                          }`}
                          title={event.pinned ? 'Unpin' : 'Pin'}
                        >
                          ★
                        </button>
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
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
              <EventsNewsHeading
                variant="news"
                title="News Management"
                subtitle="Publish announcements and updates for the community portal"
                centered
              />
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => {
                    setShowNewsForm(true);
                    setEditingNews(null);
                    setNewsForm({ title: '', content: '', published: true, icon_name: DEFAULT_NEWS_ICON });
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add News
                </button>
              </div>
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
                      rows={12}
                      className="w-full min-h-[240px] px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm leading-relaxed"
                    />
                  </div>
                  <IconPickerGrid
                    value={newsForm.icon_name}
                    onChange={(icon_name) => setNewsForm({ ...newsForm, icon_name })}
                    label="News icon"
                  />
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {news.length === 0 ? (
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                  <Newspaper className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No news yet. Create one to get started.</p>
                </div>
              ) : (
                news.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 min-h-[180px] flex flex-col hover:border-slate-300 transition-colors"
                  >
                    <div className="flex justify-between items-start gap-3 flex-1">
                      <div className="flex-1 min-w-0 flex flex-col">
                        <div className="flex justify-center mb-3">
                          <div className={NEWS_EVENTS_LIST_STYLES.newsIconBox}>
                            <LucideIconByName
                              name={item.icon_name}
                              kind="news"
                              className={NEWS_EVENTS_LIST_STYLES.newsIconGlyph}
                            />
                          </div>
                        </div>
                        <div className="text-center">
                          <h3 className="text-xl font-bold text-gray-800 leading-snug">{item.title}</h3>
                          <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                            {item.pinned && (
                              <span className="px-2 py-1 text-xs font-bold rounded-full bg-yellow-100 text-yellow-800">
                                Pinned
                              </span>
                            )}
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
                        </div>
                        <p className="text-gray-900 mt-3 text-base leading-relaxed whitespace-pre-wrap line-clamp-[12] text-left font-medium">
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
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleTogglePinNews(item.id, !item.pinned)}
                          className={`p-2 rounded-lg transition-colors ${
                            item.pinned ? 'text-yellow-700 hover:bg-yellow-50' : 'text-yellow-600 hover:bg-yellow-50'
                          }`}
                          title={item.pinned ? 'Unpin' : 'Pin'}
                        >
                          ★
                        </button>
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
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
              <EventsNewsHeading
                variant="officials"
                title="Officials Management"
                subtitle="Maintain barangay officials, positions, and photos shown to residents in the portal"
                centered
              />
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => {
                    setShowOfficialForm(true);
                    setEditingOfficial(null);
                    setOfficialForm({ name: '', position: '', image_url: '' });
                    setOfficialImageFile(null);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Official
                </button>
              </div>
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Upload Photo</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setOfficialImageFile(e.target.files?.[0] || null)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
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
                        setOfficialForm({ name: '', position: '', image_url: '' });
                        setOfficialImageFile(null);
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {officials.map((official) => (
                    <div key={official.id} className="bg-white rounded-2xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
                      <div className="h-40 bg-gray-100">
                        {official.image_url ? (
                          <img src={official.image_url} alt={official.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-gray-400 text-sm">
                            No photo
                          </div>
                        )}
                      </div>
                      <div className="p-5">
                        <h3 className="text-base font-bold text-gray-900">{official.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{official.position}</p>
                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={() => startEditOfficial(official)}
                            className="flex-1 px-3 py-2 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-sm font-semibold"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteOfficial(official.id)}
                            className="px-3 py-2 text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors text-sm font-semibold"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'facilities' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
              <EventsNewsHeading
                variant="facilities"
                title="Facilities Management"
                subtitle="Add and edit facilities that residents can browse and book through the resident portal"
                centered
              />
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => {
                    setShowFacilityForm(true);
                    setEditingFacility(null);
                    setFacilityForm({ name: '', description: '', capacity: '' });
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Facility
                </button>
              </div>
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
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
              <EventsNewsHeading
                variant="facilityApprovals"
                title="Facility Booking Approvals"
                subtitle="Review, approve, or reject resident requests to use barangay facilities"
                centered
              />
              <div className="flex flex-wrap justify-center gap-2 mt-4">
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
                              {booking.status === 'approved' && (
                                <button
                                  onClick={() => handleRevokeApprovedBooking(booking.id)}
                                  className="text-amber-600 hover:text-amber-900 flex items-center gap-1"
                                >
                                  <XCircle className="w-4 h-4" />
                                  Revoke
                                </button>
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
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
              <EventsNewsHeading
                variant="documents"
                title="Documents Approval"
                subtitle="Review and approve barangay clearance, certificate of indigency, and proof of residency requests"
                centered
              />
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                <button
                  onClick={() => {
                    setPaperFilter('all');
                    setPaperPage(1);
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    paperFilter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => {
                    setPaperFilter('pending');
                    setPaperPage(1);
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    paperFilter === 'pending'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Pending ({paperRequests.filter(r => r.status === 'pending').length})
                </button>
                <button
                  onClick={() => {
                    setPaperFilter('approved');
                    setPaperPage(1);
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    paperFilter === 'approved'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Approved
                </button>
                <button
                  onClick={() => {
                    setPaperFilter('rejected');
                    setPaperPage(1);
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    paperFilter === 'rejected'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Rejected
                </button>
                <button
                  onClick={() => {
                    setPaperFilter('completed');
                    setPaperPage(1);
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    paperFilter === 'completed'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Done ({paperRequests.filter(r => r.status === 'completed').length})
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border">
              {filteredPaperRequests.length === 0 ? (
                <div className="p-12 text-center">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">No requests in Documents Approval</h3>
                  <p className="text-gray-500">
                    {paperFilter === 'pending' 
                      ? 'No pending items in Documents Approval.'
                      : `No ${paperFilter} items in Documents Approval.`}
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
                          Document Type
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
                      {paginatedPaperRequests.map((request) => (
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
                                {request.status === 'completed'
                                  ? 'Done'
                                  : request.status.charAt(0).toUpperCase() + request.status.slice(1)}
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
                                        }}
                                        className="px-3 py-1.5 text-green-600 hover:text-green-900 hover:bg-green-50 flex items-center gap-1.5 rounded border border-green-200 transition-colors"
                                        title="Approve request"
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
                                          title="Mark transaction as done"
                                        >
                                          <DollarSign className="w-4 h-4" />
                                          Done
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => handleMarkPaymentUnpaid(request.id)}
                                          className="px-3 py-1.5 text-orange-600 hover:text-orange-900 hover:bg-orange-50 flex items-center gap-1.5 rounded border border-orange-200 transition-colors"
                                          title="Mark transaction as pending"
                                        >
                                          <DollarSign className="w-4 h-4" />
                                          Pending
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
                                          title="Mark transaction as done"
                                        >
                                          <DollarSign className="w-4 h-4" />
                                          Done
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => handleMarkPaymentUnpaid(request.id)}
                                          className="px-3 py-1.5 text-orange-600 hover:text-orange-900 hover:bg-orange-50 flex items-center gap-1.5 rounded border border-orange-200 transition-colors"
                                          title="Mark transaction as pending"
                                        >
                                          <DollarSign className="w-4 h-4" />
                                          Pending
                                        </button>
                                      )}
                                    </div>
                                  </>
                                ) : request.status === 'completed' ? (
                                  <div className="flex gap-2 items-center">
                                    <button
                                      onClick={() => handleUndoDonePaperRequest(request.id)}
                                      className="px-3 py-1.5 text-orange-600 hover:text-orange-900 hover:bg-orange-50 flex items-center gap-1.5 rounded border border-orange-200 transition-colors"
                                      title="Undo done and return to approved"
                                    >
                                      <XCircle className="w-4 h-4" />
                                      Undo Done
                                    </button>
                                  </div>
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
            {!loading && filteredPaperRequests.length > 0 && (
              <div className="border-t-2 border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 p-6">
                <div className="flex flex-col items-center gap-6">
                  <div className="w-full flex justify-center">
                    <div className="flex justify-center items-center gap-3 flex-wrap">
                      <button
                        onClick={() => setPaperPage((prev) => Math.max(prev - 1, 1))}
                        disabled={paperPage === 1}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                          paperPage === 1
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg hover:scale-105'
                        }`}
                      >
                        ← Previous
                      </button>

                      <div className="flex gap-2 flex-wrap justify-center">
                        {Array.from({ length: totalPaperPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => setPaperPage(page)}
                            className={`px-3 py-2 rounded-lg font-medium transition-all ${
                              paperPage === page
                                ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md scale-110'
                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100 hover:border-gray-400'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={() => setPaperPage((prev) => Math.min(prev + 1, totalPaperPages))}
                        disabled={paperPage === totalPaperPages}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                          paperPage === totalPaperPages
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg hover:scale-105'
                        }`}
                      >
                        Next →
                      </button>
                    </div>
                  </div>

                  <div className="text-center">
                    <span className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-lg font-medium text-sm">
                      Page {paperPage} of {totalPaperPages}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Approval Modal */}
            {editingPaperRequest && (
              <div
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                onClick={() => {
                  setEditingPaperRequest(null);
                }}
              >
                <div
                  className="bg-white rounded-xl max-w-2xl w-full p-6"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800">Confirm Documents Approval</h2>
                    <button
                      onClick={() => {
                        setEditingPaperRequest(null);
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
                      <p className="text-sm font-medium text-gray-700 mb-1">Document type:</p>
                      <p className="text-gray-900 capitalize">
                        {editingPaperRequest.paper_type.replace(/_/g, ' ')}
                      </p>
                    </div>

                    <div>
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

                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setEditingPaperRequest(null);
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
                      Approve
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