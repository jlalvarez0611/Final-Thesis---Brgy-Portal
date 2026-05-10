import { useState, useEffect } from 'react';
import { supabase, SITE_URL, getSafeRedirectUrl } from '../lib/supabase';
import { LogIn, UserPlus, X, FileText } from 'lucide-react';

import { Profile } from '../lib/supabase';

interface AuthFormProps {
  onAuthSuccess: (profile: Profile) => void;
  initialMode?: 'login' | 'register';
  onBack?: () => void;
  forceRecoveryMode?: boolean;
}

export function AuthForm({ onAuthSuccess, initialMode = 'login', onBack, forceRecoveryMode = false }: AuthFormProps) {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  // Update isLogin when initialMode changes
  useEffect(() => {
    setIsLogin(initialMode === 'login');
  }, [initialMode]);

  useEffect(() => {
    const hash = window.location.hash || '';
    const urlParams = new URLSearchParams(window.location.search);
    if (forceRecoveryMode || hash.includes('type=recovery') || urlParams.get('type') === 'recovery') {
      setIsRecoveryMode(true);
      setIsLogin(true);
      setError('');
      setSuccess('Please set your new password below.');
    }
  }, [forceRecoveryMode]);

  // Registration form fields
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [suffix, setSuffix] = useState('');
  const [sex, setSex] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [placeOfBirth, setPlaceOfBirth] = useState('');
  const [civilStatus, setCivilStatus] = useState('');
  const [nationality, setNationality] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [homeNo, setHomeNo] = useState('');
  const [emailReg, setEmailReg] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [idImageFile, setIdImageFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);

  // Login form fields
  const [email, setEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const VERIFICATION_BUCKET = 'resident-verification';

  const uploadVerificationImage = async (userId: string, file: File, kind: 'id' | 'selfie') => {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
    const filePath = `${userId}/${kind}-${Date.now()}.${safeExt}`;
    const { error: uploadError } = await supabase.storage
      .from(VERIFICATION_BUCKET)
      // Use unique filenames; avoid upsert/update RLS requirements.
      .upload(filePath, file, { upsert: false, contentType: file.type });

    if (uploadError) throw uploadError;
    return filePath;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Use Supabase Auth to sign in
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: loginPassword,
      });

      if (signInError) throw signInError;

      if (data.user) {
        // Fetch profile from profiles table
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        if (!profile) {
          // If the user exists in Auth but not in `profiles`, create a minimal profile.
          // This typically happens if the profiles row was never inserted (or was deleted).
          const userEmail = data.user.email ?? email;
          const meta = (data.user.user_metadata ?? {}) as Record<string, any>;
          const usernameFromMeta = typeof meta.username === 'string' ? meta.username : '';
          const fullNameFromMeta = typeof meta.full_name === 'string' ? meta.full_name : '';

          const minimalProfile = {
            id: data.user.id,
            email: userEmail,
            username: usernameFromMeta || userEmail || '',
            full_name: fullNameFromMeta || '',
            last_name: '',
            first_name: '',
            middle_name: '',
            suffix: '',
            sex: '',
            date_of_birth: null as any,
            place_of_birth: '',
            civil_status: '',
            nationality: '',
            mobile_number: '',
            home_no: '',
            id_image_path: null,
            selfie_image_path: null,
            role: 'resident',
            is_approved: false,
            registration_status: 'pending',
          };

          const { data: createdProfile, error: createError } = await supabase
            .from('profiles')
            .upsert(minimalProfile, { onConflict: 'id' })
            .select('*')
            .maybeSingle();

          if (createError) {
            // Most common cause: RLS policy does not allow authenticated users to insert into profiles.
            throw new Error(
              `Profile not found and could not be created. Please ensure your Supabase RLS policies allow inserts into the profiles table for authenticated users. (${createError.message})`
            );
          }
          if (!createdProfile) throw new Error('Profile not found');

          onAuthSuccess(createdProfile);
          return;
        }

        // Allow unapproved residents to access their limited dashboard
        onAuthSuccess(profile);
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      
      // Check for API key related errors
      if (err.message?.includes('Invalid API key') || 
          err.message?.includes('invalid api key') ||
          err.message?.includes('JWT') ||
          err.message?.includes('Invalid JWT') ||
          err.status === 401 ||
          err.code === 'PGRST301') {
        setError('Invalid API key. Please check your .env file and ensure VITE_SUPABASE_ANON_KEY is set correctly. Make sure you are using the anon/public key from your Supabase project settings.');
      } else if (err.message?.includes('fetch') || err.message?.includes('Failed to fetch')) {
        setError('Network error: Unable to connect to the server. Please check your internet connection and ensure Supabase credentials are configured in .env file.');
      } else if (err.message?.includes('Missing Supabase')) {
        setError(err.message);
      } else if (err.message?.includes('Invalid login credentials') || err.message?.includes('Email not confirmed')) {
        setError('Invalid email or password. Please check your credentials and try again.');
      } else {
        setError(err.message || 'An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate password match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!termsAccepted) {
      setError('You must accept the terms of service to register');
      return;
    }

    if (!emailReg.trim()) {
      setError('Email address is required.');
      return;
    }

    if (!idImageFile || !selfieFile) {
      setError('Please attach a valid ID photo and a selfie for verification.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    let createdUserId: string | null = null;
    let uploadedPaths: string[] = [];

    try {
      // Use email and password for signup. If Auth already has this email (but profile row was deleted),
      // fall back to sign-in and continue profile creation for that existing Auth user.
      const normalizedEmail = emailReg.trim();
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            username: normalizedEmail,
          },
          emailRedirectTo: getSafeRedirectUrl('/auth?mode=login'),
        },
      });

      let data = signUpData;
      if (signUpError) {
        const signUpMsg = String(signUpError.message || '');
        if (signUpMsg.includes('User already registered') || signUpMsg.includes('already registered')) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          });
          if (signInError) {
            throw new Error(
              'This email is already registered in Authentication. Use your existing password (or reset it) and try again so we can recreate your resident profile.'
            );
          }
          data = { user: signInData.user, session: signInData.session };
        } else {
          throw signUpError;
        }
      }

      if (data.user) {
        createdUserId = data.user.id;

        // If Supabase email confirmation is enabled, signUp returns a user but no session.
        // Uploading to Storage and inserting into RLS-protected tables requires an authenticated session.
        if (!data.session) {
          throw new Error(
            'Registration created your account but did not sign you in (email confirmation is enabled). Please confirm your email first, then log in to complete verification upload.'
          );
        }

        const fullName = `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}${suffix ? ' ' + suffix : ''}`.trim();

        // Upload verification images to Supabase Storage (required)
        let idImagePath = '';
        let selfieImagePath = '';
        try {
          [idImagePath, selfieImagePath] = await Promise.all([
            uploadVerificationImage(data.user.id, idImageFile, 'id'),
            uploadVerificationImage(data.user.id, selfieFile, 'selfie'),
          ]);
          uploadedPaths = [idImagePath, selfieImagePath].filter(Boolean);
        } catch (uploadErr: any) {
          // Best-effort cleanup if one upload succeeded
          const toRemove = [idImagePath, selfieImagePath].filter(Boolean);
          if (toRemove.length) {
            await supabase.storage.from(VERIFICATION_BUCKET).remove(toRemove);
          }
          const msg = uploadErr?.message || 'Upload failed';
          throw new Error(
            `Failed to upload verification images. Check that the Storage bucket "${VERIFICATION_BUCKET}" exists and its RLS policies allow authenticated users to upload to their own folder. (${msg})`
          );
        }
        
        const profileData = {
          id: data.user.id,
          email: normalizedEmail,
          username: normalizedEmail,
          full_name: fullName,
          last_name: lastName,
          first_name: firstName,
          middle_name: middleName,
          suffix,
          sex,
          date_of_birth: dateOfBirth,
          place_of_birth: placeOfBirth,
          civil_status: civilStatus,
          nationality,
          mobile_number: mobileNumber,
          home_no: homeNo.trim(),
          id_image_path: idImagePath,
          selfie_image_path: selfieImagePath,
          role: 'resident',
          is_approved: false,
          registration_status: 'pending',
        };

        console.log('Inserting profile data:', profileData);
        
        const { error: profileError, data: insertedData } = await supabase.from('profiles').insert([profileData]);

        if (profileError) {
          console.error('Profile insert error:', profileError);
          // If profile insert fails, remove uploaded files so nothing is left behind.
          await supabase.storage.from(VERIFICATION_BUCKET).remove([idImagePath, selfieImagePath].filter(Boolean));
          throw profileError;
        }

        console.log('Profile inserted successfully:', insertedData);

        setSuccess('Registration successful! Please wait for admin approval before logging in.');
        // Clear form
        setLastName('');
        setFirstName('');
        setMiddleName('');
        setSuffix('');
        setSex('');
        setDateOfBirth('');
        setPlaceOfBirth('');
        setCivilStatus('');
        setNationality('');
        setMobileNumber('');
        setHomeNo('');
        setEmailReg('');
        setPassword('');
        setConfirmPassword('');
        setTermsAccepted(false);
        setIdImageFile(null);
        setSelfieFile(null);

        // IMPORTANT: sign out so the app doesn't auto-redirect to pending dashboards.
        // This keeps the user on the registration/login screen and prevents partial/auto-created profiles.
        await supabase.auth.signOut();
        setTimeout(() => setIsLogin(true), 1500);
      }
    } catch (err: any) {
      console.error('Registration error:', err);

      // If signUp created an Auth user but the flow failed after that, the email is now "registered"
      // in Supabase Auth. The browser cannot delete Auth users; do a best-effort cleanup via Edge Function.
      if (
        createdUserId &&
        !String(err?.message || '').includes('User already registered')
      ) {
        try {
          await supabase.functions.invoke('delete-unverified-user', {
            body: { user_id: createdUserId, storage_paths: uploadedPaths },
          });
        } catch (cleanupErr) {
          console.warn('Cleanup Edge Function failed:', cleanupErr);
          // If the function is not deployed/configured, the Auth user will remain and the next attempt
          // will show "email already registered".
          // Surface a clearer message to guide manual cleanup.
          if (!String(err?.message || '').includes('email is already registered')) {
            err = new Error(
              `${err?.message || 'Registration failed.'}\n\n` +
              `NOTE: Your email may now be registered in Supabase Auth because sign-up succeeded before the error. ` +
              `To retry with the same email, either deploy the Edge Function "delete-unverified-user" (recommended) ` +
              `or manually delete the user in Supabase Dashboard → Authentication → Users.`
            );
          }
        }
      }

      // If signUp succeeded but something else failed, signing out prevents the app
      // from navigating into "pending" due to an authenticated session.
      try {
        await supabase.auth.signOut();
      } catch {
        // ignore
      }
      
      // Check for specific error messages
      if (err.message?.includes('Anonymous sign-ins are disabled')) {
        setError('Account creation is currently being processed. Please try logging in if you already have an account, or contact the administrator.');
      } else if (err.message?.includes('Invalid API key') || 
          err.message?.includes('invalid api key') ||
          err.message?.includes('JWT') ||
          err.message?.includes('Invalid JWT') ||
          err.status === 401 ||
          err.code === 'PGRST301') {
        setError('Invalid API key. Please check your .env file and ensure VITE_SUPABASE_ANON_KEY is set correctly. Make sure you are using the anon/public key from your Supabase project settings.');
      } else if (err.message?.includes('fetch') || err.message?.includes('Failed to fetch')) {
        setError('Network error: Unable to connect to the server. Please check your internet connection and ensure Supabase credentials are configured in .env file.');
      } else if (err.message?.includes('Missing Supabase')) {
        setError(err.message);
      } else if (err.message?.includes('storage') || err.message?.includes('bucket') || err.message?.includes('verification images')) {
        setError(err.message);
      } else if (err.message?.includes('row-level security') || err.message?.includes('row level security')) {
        setError(`${err.message} (This is a Supabase RLS policy issue.)`);
      } else if (err.message?.includes('User already registered')) {
        setError('This email is already registered. Please log in instead.');
      } else {
        setError(err.message || 'An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: getSafeRedirectUrl('/auth?mode=login'),
      });
      if (error) throw error;
      setSuccess('Password reset link sent. Please check your email.');
      setResetEmail('');
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRecoveredPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setSuccess('Password updated successfully. You can now log in.');
      setIsRecoveryMode(false);
      setNewPassword('');
      setConfirmNewPassword('');
      window.history.replaceState({ route: 'auth', mode: 'login' }, '', '/auth?mode=login');
    } catch (err: any) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Terms Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 p-6 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6" />
                <h2 className="text-2xl font-bold">Terms of Service and Agreement</h2>
              </div>
              <button
                onClick={() => setShowTermsModal(false)}
                className="text-white hover:bg-blue-500 p-2 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-gray-700">
              <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
                <p className="text-sm font-semibold text-blue-900">
                  👋 Welcome to Barangay Tubigan Florinda Community Information and Services Portal
                </p>
                <p className="text-sm text-blue-800 mt-2">
                  By registering, you agree to these terms. Please take a moment to read them carefully.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
                    User Responsibilities
                  </h4>
                  <p className="text-sm text-gray-600 mt-2">
                    Keep your account secure and confidential. You're responsible for all activities under your account. Report any unauthorized access immediately.
                  </p>
                </div>

                <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
                    Accurate Information
                  </h4>
                  <p className="text-sm text-gray-600 mt-2">
                    Provide truthful and complete information during registration. Keep your profile updated to ensure accurate community records.
                  </p>
                </div>

                <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm">3</span>
                    Acceptable Use
                  </h4>
                  <p className="text-sm text-gray-600 mt-2">
                    Use the portal only for lawful purposes. Don't engage in activities that disrupt service or harm the community.
                  </p>
                </div>

                <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm">4</span>
                    Data Privacy & Security
                  </h4>
                  <p className="text-sm text-gray-600 mt-2">
                    Your information is used for community services and records. We protect your personal data and comply with privacy regulations.
                  </p>
                </div>

                <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm">5</span>
                    Service Availability
                  </h4>
                  <p className="text-sm text-gray-600 mt-2">
                    We maintain the portal as reliably as possible, but availability is not guaranteed. We may modify or discontinue features.
                  </p>
                </div>

                <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm">6</span>
                    Limitation of Liability
                  </h4>
                  <p className="text-sm text-gray-600 mt-2">
                    The Barangay is not liable for damages from using this portal. This applies to direct and indirect damages.
                  </p>
                </div>
              </div>

              <div className="border-t-2 pt-4 mt-6">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm">7</span>
                  Changes to Terms
                </h4>
                <p className="text-sm text-gray-600 mt-2">
                  We may update these terms at any time. Your continued use of the portal means you accept the updated terms.
                </p>
              </div>

              <div className="bg-green-50 border-l-4 border-green-600 p-4 rounded">
                <p className="text-sm font-semibold text-green-900">
                  ✓ Need more information?
                </p>
                <p className="text-sm text-green-800 mt-2">
                  Contact the Barangay Tubigan Florinda office if you have any questions about these terms.
                </p>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t-2 border-gray-200 p-6 space-y-4">
              <button
                onClick={() => setShowTermsModal(false)}
                className="w-full px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Form */}
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[95vh] overflow-y-auto p-8">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="mb-4 text-gray-600 hover:text-gray-800 transition-colors flex items-center gap-2 text-sm"
            >
              ← Back to Home
            </button>
          )}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Barangay Tubigan Florinda Community Information and Services Portal</h1>
            <p className="text-gray-600">Community Management System</p>
          </div>

          <div className="flex gap-2 mb-6">
            <button
              onClick={() => {
                setIsLogin(true);
                setError('');
                setSuccess('');
              }}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                isLogin
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <LogIn className="inline-block w-4 h-4 mr-2" />
              Login
            </button>
            <button
              onClick={() => {
                setIsLogin(false);
                setError('');
                setSuccess('');
              }}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                !isLogin
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <UserPlus className="inline-block w-4 h-4 mr-2" />
              Register
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
              {success}
            </div>
          )}

          {/* PASSWORD RECOVERY FORM */}
          {isRecoveryMode && (
            <form onSubmit={handleUpdateRecoveredPassword}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  required
                  minLength={6}
                />
              </div>
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  required
                  minLength={6}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Set New Password'}
              </button>
            </form>
          )}

          {/* LOGIN FORM */}
          {isLogin && !isRecoveryMode && (
            <form onSubmit={handleLogin}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  required
                  minLength={6}
                />
              </div>

              <div className="mb-6">
                <details className="text-sm">
                  <summary className="cursor-pointer text-blue-600 hover:underline">
                    Forgot password?
                  </summary>
                  <div className="mt-3 p-3 border rounded-lg bg-gray-50">
                    <label className="block text-gray-700 text-xs font-medium mb-2">
                      Enter your resident account email
                    </label>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition mb-2"
                    />
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={loading || !resetEmail}
                      className="w-full bg-gray-700 text-white py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                  </div>
                </details>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Login'}
              </button>
            </form>
          )}

          {/* REGISTRATION FORM */}
          {!isLogin && (
            <form onSubmit={handleRegister} className="max-h-[500px] overflow-y-auto pr-2">
              {/* Personal Information Section */}
              <h3 className="text-lg font-semibold text-gray-800 mb-4 mt-4">Personal Information</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Middle Name <span className="text-gray-500 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Suffix (if applicable)
                  </label>
                  <input
                    type="text"
                    value={suffix}
                    onChange={(e) => setSuffix(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Sex
                  </label>
                  <select
                    value={sex}
                    onChange={(e) => setSex(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    required
                  >
                    <option value="">Select Sex</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    required
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Place of Birth
                </label>
                <input
                  type="text"
                  value={placeOfBirth}
                  onChange={(e) => setPlaceOfBirth(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Civil Status
                  </label>
                  <select
                    value={civilStatus}
                    onChange={(e) => setCivilStatus(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    required
                  >
                    <option value="">Select Civil Status</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Nationality
                  </label>
                  <input
                    type="text"
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    required
                  />
                </div>
              </div>

              {/* Contact Information Section */}
              <h3 className="text-lg font-semibold text-gray-800 mb-4 mt-6">Contact Information</h3>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  required
                  placeholder="e.g. 09171234567"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Home No.
                </label>
                <input
                  type="text"
                  value={homeNo}
                  onChange={(e) => setHomeNo(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  placeholder="e.g. 123"
                />
              </div>

              {/* Portal Account Section */}
              <h3 className="text-lg font-semibold text-gray-800 mb-4 mt-6">Portal Account</h3>

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={emailReg}
                  onChange={(e) => setEmailReg(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  required
                  minLength={6}
                />
              </div>

              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  required
                  minLength={6}
                />
              </div>

              {/* Verification Section */}
              <h3 className="text-lg font-semibold text-gray-800 mb-4 mt-6">Resident Verification</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Valid ID Photo <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    required
                    onChange={(e) => setIdImageFile(e.target.files?.[0] || null)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  />
                  <p className="text-xs text-gray-500 mt-1">Upload a clear photo of your government/barangay ID.</p>
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Selfie Photo <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    required
                    onChange={(e) => setSelfieFile(e.target.files?.[0] || null)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  />
                  <p className="text-xs text-gray-500 mt-1">Upload a recent selfie for identity verification.</p>
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer p-4 bg-blue-50 rounded-lg border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-100 transition-all mb-4">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer flex-shrink-0"
                />
                <span className="text-gray-800 font-medium text-sm">
                  I have read and fully understand the{' '}
                  <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    className="text-blue-600 hover:text-blue-700 hover:underline font-semibold"
                  >
                    Terms of Service and Agreement
                  </button>
                  . I agree to comply with all terms.
                </span>
              </label>

              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={loading || !termsAccepted}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="animate-spin">⟳</span>
                      Processing...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Register
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {isLogin && !isRecoveryMode && (
            <p className="mt-4 text-center text-sm text-gray-600">
              Don't have an account?{' '}
              <button
                onClick={() => setIsLogin(false)}
                className="text-blue-600 hover:underline font-medium"
              >
                Register here
              </button>
            </p>
          )}

          {!isLogin && !isRecoveryMode && (
            <p className="mt-4 text-center text-sm text-gray-600">
              Already have an account?{' '}
              <button
                onClick={() => setIsLogin(true)}
                className="text-blue-600 hover:underline font-medium"
              >
                Log in
              </button>
            </p>
          )}
        </div>
      </div>
    </>
  );
}
