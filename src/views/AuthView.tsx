import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  ShieldCheck, 
  Users, 
  Zap, 
  ArrowRight, 
  Mail, 
  Lock, 
  Phone,
  User,
  MapPin,
  Building,
  Key,
  Eye,
  EyeOff,
  Clock,
  PlusCircle,
  AlertTriangle
} from 'lucide-react';
import { UserRole, UserProfile } from '../types';
import { cn } from '../lib/utils';
import { auth, db, doc, setDoc, getDoc } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, signInAnonymously } from 'firebase/auth';

interface AuthViewProps {
  onLogin: () => void;
  firebaseUser: any;
}

export default function AuthView({ onLogin, firebaseUser }: AuthViewProps) {
  const [tab, setTab] = useState<'login' | 'signup'>(firebaseUser ? 'signup' : 'login');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [refCode, setRefCode] = useState('');
  const [loading, setLoading] = useState(false);

  const COLONIES = ['Colaba', 'Mazgaon', 'Wadala', 'Worli'];

  useEffect(() => {
    if (firebaseUser) {
      setTab('signup');
    }
  }, [firebaseUser]);

  // Form states
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [flat, setFlat] = useState('');
  const [floor, setFloor] = useState('');
  const [building, setBuilding] = useState('');
  const [society, setSociety] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerFlat, setOwnerFlat] = useState('');
  const [loginMobile, setLoginMobile] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (firebaseUser && !name) {
      setName(firebaseUser.displayName || '');
    }
  }, [firebaseUser]);

  const stats = [
    { label: 'Complaints Resolved', value: '12k+', icon: ShieldCheck },
    { label: 'Satisfaction Rate', value: '98%', icon: Users },
    { label: 'Societies Enrolled', value: '240+', icon: Building2 },
    { label: 'Avg. Response Time', value: '4.8h', icon: Zap },
  ];

  const roles: { id: UserRole; label: string; icon: string }[] = [
    { id: 'Admin', label: 'Admin', icon: '👑' },
    { id: 'Supervisor', label: 'Supervisor', icon: '🔵' },
    { id: 'Technician', label: 'Technician', icon: '🔧' },
    { id: 'Resident', label: 'Resident', icon: '🏠' },
    { id: 'Maid', label: 'Maid/Help', icon: '🧹' },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError(null);
    try {
      // Since we don't have a mobile login in Firebase Auth by default without extra setup,
      // we'll use mobile@example.com as a placeholder email for this demo.
      const email = `${loginMobile}@example.com`;
      await signInWithEmailAndPassword(auth, email, loginPassword);
    } catch (error: any) {
      console.error("Login failed:", error);
      if (error.code === 'auth/operation-not-allowed' || error.code === 'auth/admin-restricted-operation') {
        setAuthError(`Login failed: ${error.code === 'auth/admin-restricted-operation' ? 'User creation/login is restricted in Firebase Console' : 'Email/Password authentication is not enabled'}. Please check your Firebase Console settings.`);
      } else {
        setAuthError(error.message || "Login failed. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoRole: UserRole) => {
    setLoading(true);
    setAuthError(null);
    try {
      const email = `demo-${demoRole.toLowerCase()}@example.com`;
      const password = 'password123';
      
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (err: any) {
        if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/admin-restricted-operation') {
          // If Email/Password is disabled or restricted, use Anonymous Auth as a fallback for demo
          console.warn(`Auth operation restricted (${err.code}). Falling back to Anonymous Auth for demo.`);
          const userCredential = await signInAnonymously(auth);
          const uid = userCredential.user.uid;
          
          await setDoc(doc(db, 'users', uid), {
            uid,
            name: `Demo ${demoRole} (Guest)`,
            email: `guest-${uid.slice(0, 5)}@demo.local`,
            role: demoRole,
            mobile: '9999999999',
            society: 'Colaba',
            status: 'approved',
            isApproved: true,
            isDemo: true,
            createdAt: Date.now()
          });
        } else if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-login-credentials') {
          // Create demo user if it doesn't exist
          try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const uid = userCredential.user.uid;
            
            await setDoc(doc(db, 'users', uid), {
              uid,
              name: `Demo ${demoRole}`,
              email,
              role: demoRole,
              mobile: '9999999999',
              society: 'Colaba',
              status: 'approved',
              isApproved: true,
              createdAt: Date.now()
            });
          } catch (createErr: any) {
            if (createErr.code === 'auth/operation-not-allowed' || createErr.code === 'auth/admin-restricted-operation') {
              console.warn(`User creation restricted (${createErr.code}). Falling back to Anonymous Auth for demo.`);
              const userCredential = await signInAnonymously(auth);
              const uid = userCredential.user.uid;
              
              await setDoc(doc(db, 'users', uid), {
                uid,
                name: `Demo ${demoRole} (Guest)`,
                email: `guest-${uid.slice(0, 5)}@demo.local`,
                role: demoRole,
                mobile: '9999999999',
                society: 'Colaba',
                status: 'approved',
                isApproved: true,
                isDemo: true,
                createdAt: Date.now()
              });
            } else {
              throw createErr;
            }
          }
        } else {
          throw err;
        }
      }
    } catch (error: any) {
      console.error("Demo login failed:", error);
      if (error.code === 'auth/operation-not-allowed' || error.code === 'auth/admin-restricted-operation') {
        setAuthError(`Demo login failed: ${error.code === 'auth/admin-restricted-operation' ? 'User creation is restricted in Firebase Console' : 'Authentication provider is not enabled'}. Please enable 'Email/Password' or 'Anonymous' sign-in.`);
      } else {
        setAuthError("Demo login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;

    setLoading(true);
    setAuthError(null);
    try {
      const email = firebaseUser ? firebaseUser.email : `${mobile}@example.com`;
      let uid = firebaseUser?.uid;

      if (!firebaseUser) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, signupPassword);
        uid = userCredential.user.uid;
      }

      const newRefCode = 'REF-' + Math.random().toString(36).substr(2, 6).toUpperCase();
      setRefCode(newRefCode);

      const userProfile: UserProfile = {
        uid: uid!,
        name,
        email: email!,
        role,
        mobile,
        flat,
        floor,
        building,
        society,
        referenceCode: newRefCode,
        ownerName,
        ownerFlat,
        status: 'pending',
        isApproved: false,
        createdAt: Date.now()
      };

      await setDoc(doc(db, 'users', uid!), userProfile);
      setIsPending(true);
    } catch (error: any) {
      console.error("Registration failed:", error);
      if (error.code === 'auth/operation-not-allowed' || error.code === 'auth/admin-restricted-operation') {
        setAuthError(`Registration failed: ${error.code === 'auth/admin-restricted-operation' ? 'User creation is restricted in Firebase Console' : 'Email/Password authentication is not enabled'}. Please check your Firebase Console settings.`);
      } else {
        setAuthError(error.message || "Registration failed");
      }
    } finally {
      setLoading(false);
    }
  };

  if (isPending) {
    return (
      <div className="min-h-screen bg-brand flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-r-lg shadow-2xl max-w-md w-full text-center space-y-6"
        >
          <div className="w-20 h-20 bg-brand-light text-brand rounded-full flex items-center justify-center mx-auto">
            <Clock size={40} className="animate-pulse" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-display font-bold text-ink">Registration Pending</h2>
            <p className="text-ink3 text-sm leading-relaxed">
              Your application has been submitted successfully. Please wait for the administrator to approve your account.
            </p>
          </div>
          <div className="bg-surface2 p-4 rounded-r-sm space-y-1">
            <div className="text-[10px] uppercase tracking-wider font-bold text-ink3">Reference Code</div>
            <div className="text-xl font-mono font-bold text-brand">{refCode}</div>
          </div>
          <button 
            onClick={() => setIsPending(false)}
            className="w-full bg-brand text-white py-4 rounded-r-sm font-bold text-sm hover:bg-brand-mid transition-all"
          >
            Back to Login
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col md:flex-row">
      {/* Left Panel - Hero & Stats */}
      <div className="hidden md:flex md:w-1/2 bg-brand p-12 flex-col justify-between text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand-light/10 rounded-full -ml-48 -mb-48 blur-3xl" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center overflow-hidden">
              <img src="https://www.mumbaiport.gov.in/images/logo.png" className="w-10 h-10 object-contain" alt="MbPA Logo" referrerPolicy="no-referrer" />
            </div>
            <span className="font-display font-extrabold text-2xl tracking-tight">
              MbPA <span className="text-brand-light">Resolve</span>
            </span>
          </div>

          <div className="max-w-md">
            <h1 className="text-5xl font-display font-bold leading-tight mb-6">
              Empowering Societies, <span className="text-brand-light">Resolving Issues.</span>
            </h1>
            <p className="text-white/70 text-lg leading-relaxed mb-12">
              The unified platform for residents, management, and service providers to streamline maintenance and resolve complaints efficiently.
            </p>

            <div className="grid grid-cols-2 gap-6">
              {stats.map((stat, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white/5 backdrop-blur-sm p-4 rounded-r-sm border border-white/10"
                >
                  <stat.icon className="text-brand-light mb-3" size={20} />
                  <div className="text-2xl font-bold mb-1">{stat.value}</div>
                  <div className="text-xs text-white/50 uppercase tracking-wider">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-10 text-sm text-white/40">
          © 2024 Mumbai Port Authority Resolve. All rights reserved.
        </div>
      </div>

      {/* Right Panel - Auth Forms */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-bg">
        <div className="w-full max-w-md">
          <div className="md:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center overflow-hidden border border-border">
              <img src="https://www.mumbaiport.gov.in/images/logo.png" className="w-8 h-8 object-contain" alt="MbPA Logo" referrerPolicy="no-referrer" />
            </div>
            <span className="font-display font-extrabold text-xl tracking-tight text-brand">
              MbPA <span className="text-ink">Resolve</span>
            </span>
          </div>

          <div className="bg-white rounded-r-lg shadow-xl border border-border overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-border">
              <button 
                onClick={() => setTab('login')}
                className={cn(
                  "flex-1 py-4 text-sm font-bold transition-all",
                  tab === 'login' ? "text-brand border-b-2 border-brand" : "text-ink3 hover:text-ink hover:bg-surface2"
                )}
              >
                Login
              </button>
              <button 
                onClick={() => setTab('signup')}
                className={cn(
                  "flex-1 py-4 text-sm font-bold transition-all",
                  tab === 'signup' ? "text-brand border-b-2 border-brand" : "text-ink3 hover:text-ink hover:bg-surface2"
                )}
              >
                Sign Up
              </button>
            </div>

            <div className="p-8">
              <AnimatePresence mode="wait">
                {tab === 'login' ? (
                  <motion.div
                    key="login"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Mobile Number</label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3" size={16} />
                          <input 
                            required
                            type="tel"
                            value={loginMobile}
                            onChange={(e) => setLoginMobile(e.target.value)}
                            placeholder="Enter mobile number"
                            className="w-full bg-surface2 border border-border rounded-r-sm py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-brand transition-all"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Password</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3" size={16} />
                          <input 
                            required
                            type={showPassword ? "text" : "password"}
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-surface2 border border-border rounded-r-sm py-3 pl-10 pr-12 text-sm focus:outline-none focus:border-brand transition-all"
                          />
                          <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink3 hover:text-brand transition-all"
                          >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      {authError && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-r-sm flex items-center gap-2 text-red-600 text-[10px] font-bold uppercase tracking-wider">
                          <AlertTriangle size={14} />
                          {authError}
                        </div>
                      )}

                      <button 
                        type="submit"
                        disabled={loading}
                        className="w-full bg-brand text-white py-4 rounded-r-sm font-bold text-sm hover:bg-brand-mid transition-all disabled:opacity-50"
                      >
                        {loading ? "Logging in..." : "Login to Account"}
                      </button>
                    </form>

                    <div className="relative flex items-center justify-center">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border"></div>
                      </div>
                      <span className="relative px-4 bg-white text-[10px] font-bold text-ink3 uppercase tracking-widest">or continue with</span>
                    </div>

                    <div className="space-y-4">
                      <button 
                        onClick={onLogin}
                        className="w-full flex items-center justify-center gap-3 bg-white border border-border py-3 rounded-r-sm font-bold text-sm text-ink hover:bg-surface2 transition-all"
                      >
                        <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
                        Continue with Google
                      </button>
                      <div className="relative flex items-center justify-center">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-border"></div>
                        </div>
                        <span className="relative px-4 bg-white text-[10px] font-bold text-ink3 uppercase tracking-widest">or demo access</span>
                      </div>
                      
                      {firebaseUser && (
                        <div className="p-4 bg-surface2 rounded-r-sm border border-border space-y-3">
                          <div className="flex items-center gap-3">
                            <img src={firebaseUser.photoURL || undefined} className="w-8 h-8 rounded-full border border-border" alt="Profile" />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-ink truncate">{firebaseUser.displayName}</div>
                              <div className="text-[10px] text-ink3 truncate">{firebaseUser.email}</div>
                            </div>
                          </div>
                          <button 
                            onClick={async () => {
                              await signOut(auth);
                            }}
                            className="w-full py-2 text-[10px] font-bold text-brand uppercase tracking-widest hover:bg-brand/5 transition-all"
                          >
                            Sign Out / Switch Account
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {roles.map(r => (
                        <button
                          key={r.id}
                          onClick={() => handleDemoLogin(r.id)}
                          className="flex items-center gap-2 p-3 rounded-r-sm border border-border hover:border-brand hover:bg-brand/5 transition-all text-left group"
                        >
                          <span className="text-lg">{r.icon}</span>
                          <span className="text-xs font-bold text-ink group-hover:text-brand">{r.label}</span>
                        </button>
                      ))}
                    </div>

                    <div className="text-center">
                      <p className="text-xs text-ink3">
                        By continuing, you agree to our <a href="#" className="text-brand hover:underline">Terms of Service</a> and <a href="#" className="text-brand hover:underline">Privacy Policy</a>.
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="signup"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    {!role ? (
                      <div className="space-y-6">
                        <div className="text-center space-y-2">
                          <h3 className="text-lg font-bold text-ink">Select Your Role</h3>
                          <p className="text-xs text-ink3">Choose how you'll be using MbPA Resolve</p>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          {roles.map(r => (
                            <button
                              key={r.id}
                              onClick={() => setRole(r.id)}
                              className="flex items-center justify-between p-5 rounded-xl border-2 border-border hover:border-brand hover:bg-brand/5 transition-all group active:scale-[0.98]"
                            >
                              <div className="flex items-center gap-4">
                                <span className="text-2xl">{r.icon}</span>
                                <div className="text-left">
                                  <div className="text-sm font-bold text-ink group-hover:text-brand">{r.label}</div>
                                  <div className="text-[10px] text-ink3">Access {r.label.toLowerCase()} features</div>
                                </div>
                              </div>
                              <ArrowRight size={16} className="text-ink3 group-hover:text-brand" />
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handleSignup} className="space-y-4">
                        <div className="flex items-center justify-between mb-4">
                          <button 
                            type="button"
                            onClick={() => setRole(null)}
                            className="text-[10px] font-bold text-brand uppercase tracking-wider flex items-center gap-1"
                          >
                            <ArrowRight size={12} className="rotate-180" /> Change Role
                          </button>
                          <span className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Role: <span className="text-brand">{role}</span></span>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Full Name</label>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3" size={16} />
                              <input 
                                required
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter your name"
                                className="w-full bg-surface2 border border-border rounded-r-sm py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-brand transition-all"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Mobile Number</label>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3" size={16} />
                              <input 
                                required
                                type="tel"
                                value={mobile}
                                onChange={(e) => setMobile(e.target.value)}
                                placeholder="Enter mobile number"
                                className="w-full bg-surface2 border border-border rounded-r-sm py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-brand transition-all"
                              />
                            </div>
                          </div>

                          {!firebaseUser && (
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Create Password</label>
                              <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3" size={16} />
                                <input 
                                  required
                                  type={showPassword ? "text" : "password"}
                                  value={signupPassword}
                                  onChange={(e) => setSignupPassword(e.target.value)}
                                  placeholder="Min 6 characters"
                                  className="w-full bg-surface2 border border-border rounded-r-sm py-3 pl-10 pr-12 text-sm focus:outline-none focus:border-brand transition-all"
                                />
                                <button 
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink3 hover:text-brand transition-all"
                                >
                                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                              </div>
                            </div>
                          )}

                          {role === 'Maid' && (
                            <>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Owner Name</label>
                                <div className="relative">
                                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3" size={16} />
                                  <input 
                                    required
                                    type="text"
                                    value={ownerName}
                                    onChange={(e) => setOwnerName(e.target.value)}
                                    placeholder="Enter flat owner name"
                                    className="w-full bg-surface2 border border-border rounded-r-sm py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-brand transition-all"
                                  />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Owner Flat No.</label>
                                <div className="relative">
                                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3" size={16} />
                                  <input 
                                    required
                                    type="text"
                                    value={ownerFlat}
                                    onChange={(e) => setOwnerFlat(e.target.value)}
                                    placeholder="Enter owner's flat number"
                                    className="w-full bg-surface2 border border-border rounded-r-sm py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-brand transition-all"
                                  />
                                </div>
                              </div>
                            </>
                          )}

                          {role !== 'Supervisor' && role !== 'Technician' && (
                            <>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Flat No.</label>
                                  <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3" size={16} />
                                    <input 
                                      required
                                      type="text"
                                      value={flat}
                                      onChange={(e) => setFlat(e.target.value)}
                                      placeholder="e.g. 101"
                                      className="w-full bg-surface2 border border-border rounded-r-sm py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-brand transition-all"
                                    />
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Floor</label>
                                  <div className="relative">
                                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3" size={16} />
                                    <input 
                                      required
                                      type="text"
                                      value={floor}
                                      onChange={(e) => setFloor(e.target.value)}
                                      placeholder="e.g. 1"
                                      className="w-full bg-surface2 border border-border rounded-r-sm py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-brand transition-all"
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Building Name</label>
                                <div className="relative">
                                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3" size={16} />
                                  <input 
                                    required
                                    type="text"
                                    value={building}
                                    onChange={(e) => setBuilding(e.target.value)}
                                    placeholder="Enter building name"
                                    className="w-full bg-surface2 border border-border rounded-r-sm py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-brand transition-all"
                                  />
                                </div>
                              </div>
                            </>
                          )}

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Colony / Society Name</label>
                            <div className="relative">
                              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3" size={16} />
                              <select 
                                required
                                value={society}
                                onChange={(e) => setSociety(e.target.value)}
                                className="w-full bg-surface2 border border-border rounded-r-sm py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-brand transition-all appearance-none"
                              >
                                <option value="">Select Colony</option>
                                {COLONIES.map(c => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                                <option value="Other">Other</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {authError && (
                          <div className="p-3 bg-red-50 border border-red-100 rounded-r-sm flex items-center gap-2 text-red-600 text-[10px] font-bold uppercase tracking-wider">
                            <AlertTriangle size={14} />
                            {authError}
                          </div>
                        )}

                        <button 
                          type="submit"
                          disabled={loading}
                          className="w-full bg-brand text-white py-4 rounded-r-sm font-bold text-sm hover:bg-brand-mid transition-all mt-4 disabled:opacity-50"
                        >
                          {loading ? "Registering..." : "Register Account"}
                        </button>
                      </form>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
