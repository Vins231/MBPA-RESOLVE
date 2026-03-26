/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  FileText, 
  PlusCircle, 
  Search, 
  CheckCircle, 
  Users, 
  LogOut, 
  Bell, 
  Menu,
  X,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { ViewId, UserProfile, UserRole } from './types';
import { cn } from './lib/utils';
import { auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, doc, getDoc } from './firebase';

// Views
import AuthView from './views/AuthView';
import HomeView from './views/HomeView';
import SubmitView from './views/SubmitView';
import TrackView from './views/TrackView';
import ComplaintsView from './views/ComplaintsView';
import ApprovalsView from './views/ApprovalsView';
import ResidentsView from './views/ResidentsView';
import AdminDashboardView from './views/AdminDashboardView';

// Components
import DevTools from './components/DevTools';

// Error Boundary
class ErrorBoundary extends React.Component<{ children: ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse(this.state.error.message);
        if (parsed.error) errorMessage = `Firestore Error: ${parsed.error}`;
      } catch (e) {
        errorMessage = this.state.error.message || errorMessage;
      }

      const renderMessage = (msg: string) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const parts = msg.split(urlRegex);
        return parts.map((part, i) => {
          if (part.match(urlRegex)) {
            return (
              <a 
                key={i} 
                href={part} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-brand hover:underline break-all block mt-2 font-bold"
              >
                {part}
              </a>
            );
          }
          return <span key={i}>{part}</span>;
        });
      };

      return (
        <div className="min-h-screen bg-bg flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-r-lg shadow-lg max-w-md w-full text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-xl font-display font-bold text-ink">Application Error</h2>
            <div className="text-sm text-ink3 leading-relaxed">{renderMessage(errorMessage)}</div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-brand text-white py-3 rounded-r-sm font-bold text-sm hover:bg-brand-mid transition-all"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewId>('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const fetchUser = async (uid: string) => {
    try {
      setIsProfileLoading(true);
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        setUser(userDoc.data() as UserProfile);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
      setUser(null);
    } finally {
      setIsAuthReady(true);
      setIsProfileLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        fetchUser(firebaseUser.uid);
      } else {
        setUser(null);
        setIsAuthReady(true);
        setIsProfileLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (!isAuthReady || isProfileLoading) {
      timeoutId = setTimeout(() => {
        setLoadError("The application is taking longer than expected to load. This might be due to a slow connection or a temporary server issue.");
      }, 10000);
    } else {
      setLoadError(null);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isAuthReady, isProfileLoading]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setCurrentView('home');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (!isAuthReady || isProfileLoading) {
    return (
      <div className="min-h-screen bg-brand flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-6 text-center max-w-xs">
          {!loadError ? (
            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-8 rounded-r-lg shadow-2xl space-y-6"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-ink font-display font-bold text-lg">Loading Timeout</h3>
                <p className="text-ink3 text-sm leading-relaxed">{loadError}</p>
              </div>
              <button 
                onClick={() => {
                  setLoadError(null);
                  setIsAuthReady(false);
                  if (auth.currentUser) {
                    fetchUser(auth.currentUser.uid);
                  } else {
                    setIsAuthReady(true);
                  }
                }}
                className="w-full bg-brand text-white py-3 rounded-r-sm font-bold text-sm hover:bg-brand-mid transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Clock size={16} />
                Retry Loading
              </button>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <ErrorBoundary>
        <AuthView onLogin={handleLogin} firebaseUser={auth.currentUser} />
      </ErrorBoundary>
    );
  }

  const isHardcodedAdmin = user.email === 'v.suvania@gmail.com';

  if ((user.status === 'pending' || !user.isApproved) && !isHardcodedAdmin) {
    return (
      <div className="min-h-screen bg-brand flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-r-lg shadow-2xl max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-brand-light text-brand rounded-full flex items-center justify-center mx-auto">
            {user.status === 'pending' ? <Clock size={40} className="animate-pulse" /> : <AlertTriangle size={40} />}
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-display font-bold text-ink">
              {user.status === 'pending' ? 'Registration Pending' : 'Account Restricted'}
            </h2>
            <p className="text-ink3 text-sm leading-relaxed">
              {user.status === 'pending' 
                ? 'Your application has been submitted successfully. Please wait for the administrator to approve your account.'
                : 'Your account is currently restricted. Please contact the administrator for more information.'}
            </p>
          </div>
          {user.referenceCode && (
            <div className="bg-surface2 p-4 rounded-r-sm space-y-1">
              <div className="text-[10px] uppercase tracking-wider font-bold text-ink3">Reference Code</div>
              <div className="text-xl font-mono font-bold text-brand">{user.referenceCode}</div>
            </div>
          )}
          <button 
            onClick={handleLogout}
            className="w-full bg-brand text-white py-4 rounded-r-sm font-bold text-sm hover:bg-brand-mid transition-all"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: 'home', label: 'Dashboard', icon: LayoutDashboard, section: 'Overview' },
    { 
      id: 'complaints', 
      label: (user.role === 'Admin' || user.role === 'Supervisor') ? 'All Complaints' : 
             user.role === 'Technician' ? 'My Tasks' : 'My Complaints', 
      icon: FileText, 
      section: 'Overview' 
    },
    { id: 'submit', label: 'Submit Complaint', icon: PlusCircle, section: 'Overview', roles: ['Resident', 'Maid', 'Admin', 'Supervisor'] },
    { id: 'track', label: 'Track Status', icon: Search, section: 'Overview', roles: ['Resident', 'Maid'] },
    { id: 'approvals', label: 'Approvals', icon: CheckCircle, section: 'Admin', roles: ['Admin', 'Supervisor'] },
    { id: 'residents', label: 'Residents', icon: Users, section: 'Admin', roles: ['Admin', 'Supervisor'] },
  ];

  const filteredNavItems = navItems.filter(item => !item.roles || item.roles.includes(user.role));

  const renderView = () => {
    switch (currentView) {
      case 'home': 
        return user.role === 'Admin' 
          ? <AdminDashboardView user={user} onNavigate={setCurrentView} /> 
          : <HomeView user={user} onNavigate={setCurrentView} />;
      case 'submit': return <SubmitView user={user} onNavigate={setCurrentView} />;
      case 'track': return <TrackView user={user} onNavigate={setCurrentView} />;
      case 'complaints': return <ComplaintsView user={user} onNavigate={setCurrentView} />;
      case 'approvals': return <ApprovalsView user={user} />;
      case 'residents': return <ResidentsView user={user} />;
      default: return <HomeView user={user} onNavigate={setCurrentView} />;
    }
  };

  return (
    <ErrorBoundary>
      <div className="flex min-h-screen bg-bg">
        {/* Sidebar Overlay for Mobile */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-ink/60 backdrop-blur-sm z-50 md:hidden"
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <aside 
          className={cn(
            "bg-brand text-white w-64 flex-shrink-0 flex flex-col transition-all duration-300 fixed md:sticky top-0 h-screen z-[60]",
            !isSidebarOpen && "md:w-20",
            isMobileMenuOpen ? "left-0" : "-left-64 md:left-0"
          )}
        >
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <div className={cn("flex items-center gap-3", !isSidebarOpen && "md:hidden")}>
              <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                <img src="https://www.mumbaiport.gov.in/images/logo.png" className="w-7 h-7 object-contain" alt="MbPA Logo" referrerPolicy="no-referrer" />
              </div>
              <span className="font-display font-extrabold text-lg tracking-tight">
                MbPA <span className="text-brand-light">Resolve</span>
              </span>
            </div>
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden text-white/60 hover:text-white"
            >
              <X size={24} />
            </button>
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="hidden md:flex text-white/40 hover:text-white"
            >
              <Menu size={20} />
            </button>
          </div>

          <div className="p-4 border-b border-white/10 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-brand-light flex items-center justify-center font-bold text-brand text-xs flex-shrink-0">
              {user.name?.split(' ').map(n => n[0]).join('') || '?'}
            </div>
            <div className={cn("overflow-hidden transition-all", !isSidebarOpen && "md:hidden")}>
              <div className="text-sm font-semibold truncate">{user.name}</div>
              <div className="text-[10px] text-white/40 uppercase tracking-wider">{user.role}</div>
            </div>
          </div>

          <nav className="flex-1 py-4 overflow-y-auto">
            {['Overview', 'Admin'].map(section => {
              const items = filteredNavItems.filter(item => item.section === section);
              if (items.length === 0) return null;
              return (
                <div key={section} className="mb-4">
                  <div className={cn("px-6 text-[9px] font-bold text-white/30 uppercase tracking-[1.2px] mb-2", !isSidebarOpen && "md:hidden")}>
                    {section}
                  </div>
                  {items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setCurrentView(item.id as ViewId);
                        setIsMobileMenuOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-6 py-2.5 text-sm font-medium transition-all border-l-4",
                        currentView === item.id 
                          ? "bg-white/10 text-white border-brand-light" 
                          : "text-white/60 border-transparent hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <item.icon size={18} className="flex-shrink-0" />
                      <span className={cn("transition-all truncate", !isSidebarOpen && "md:hidden")}>{item.label}</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </nav>

          <div className="p-4 border-t border-white/10">
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 text-white/40 hover:text-white text-xs transition-colors w-full"
            >
              <LogOut size={14} className="flex-shrink-0" />
              <span className={cn(!isSidebarOpen && "md:hidden")}>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Topbar */}
          <header className="bg-white border-b border-border h-16 flex items-center justify-between px-6 sticky top-0 z-40">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2 text-ink2 hover:bg-surface2 rounded-md"
              >
                <Menu size={20} />
              </button>
              <h2 className="font-display font-bold text-lg text-ink">
                {navItems.find(i => i.id === currentView)?.label}
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <button className="relative p-2 text-ink2 hover:bg-surface2 rounded-md transition-colors">
                <Bell size={18} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
              </button>
              <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center font-bold text-white text-[10px]">
                {user.name?.split(' ').map(n => n[0]).join('') || '?'}
              </div>
            </div>
          </header>

          {/* View Container */}
          <div className="p-6 md:p-8 flex-1 overflow-y-auto pb-24 md:pb-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentView}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {renderView()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom Navigation for Mobile */}
          <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border px-4 py-2 flex items-center justify-around z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
            {filteredNavItems.slice(0, 5).map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id as ViewId)}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 transition-colors relative min-w-[64px]",
                  currentView === item.id ? "text-brand" : "text-ink3"
                )}
              >
                <item.icon size={20} />
                <span className="text-[10px] font-medium">{item.label}</span>
                {currentView === item.id && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute -top-[1px] w-8 h-1 bg-brand rounded-full"
                  />
                )}
              </button>
            ))}
          </nav>
        </main>
        <DevTools />
      </div>
    </ErrorBoundary>
  );
}
