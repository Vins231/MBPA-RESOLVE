import { useState, useEffect } from 'react';
import { UserProfile, Complaint } from '../types';
import { ViewId } from '../types';
import { motion } from 'motion/react';
import { 
  Users, 
  UserCheck, 
  FileText, 
  CheckCircle, 
  Activity,
  ArrowRight,
  PlusCircle,
  Settings,
  ShieldCheck,
  Clock,
  AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { db, collection, query, where, onSnapshot, orderBy, limit } from '../firebase';

interface AdminDashboardViewProps {
  user: UserProfile;
  onNavigate: (view: ViewId) => void;
}

export default function AdminDashboardView({ user, onNavigate }: AdminDashboardViewProps) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const [totalResidents, setTotalResidents] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch complaints
    const complaintsQ = query(
      collection(db, 'complaints'),
      where('society', '==', user.society),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const unsubscribeComplaints = onSnapshot(complaintsQ, (snapshot) => {
      const complaintsData: Complaint[] = [];
      snapshot.forEach((doc) => {
        complaintsData.push({ id: doc.id, ...doc.data() } as Complaint);
      });
      setComplaints(complaintsData);
      setLoading(false);
    }, (error) => {
      console.error("Failed to fetch complaints:", error);
    });

    // Fetch users
    const usersQ = query(
      collection(db, 'users'),
      where('society', '==', user.society)
    );

    const unsubscribeUsers = onSnapshot(usersQ, (snapshot) => {
      const societyUsers: UserProfile[] = [];
      snapshot.forEach((doc) => {
        societyUsers.push({ uid: doc.id, ...doc.data() } as UserProfile);
      });
      setPendingUsers(societyUsers.filter((u: UserProfile) => !u.isApproved));
      setTotalResidents(societyUsers.filter((u: UserProfile) => u.isApproved).length);
    }, (error) => {
      console.error("Failed to fetch users:", error);
    });

    return () => {
      unsubscribeComplaints();
      unsubscribeUsers();
    };
  }, [user.society]);

  const stats = [
    { label: 'Total Residents', value: totalResidents, icon: Users, color: 'text-blue-600', bgColor: 'bg-blue-50', trend: '+2 this week' },
    { label: 'Pending Approvals', value: pendingUsers.length, icon: UserCheck, color: 'text-purple-600', bgColor: 'bg-purple-50', trend: 'Needs action' },
    { label: 'Active Complaints', value: complaints.filter(c => c.status !== 'resolved').length, icon: FileText, color: 'text-accent', bgColor: 'bg-accent-light', trend: `${complaints.filter(c => c.status === 'pending').length} new` },
    { label: 'Resolved (Total)', value: complaints.filter(c => c.status === 'resolved').length, icon: CheckCircle, color: 'text-brand', bgColor: 'bg-brand-light/10', trend: 'Society efficiency' },
  ];

  const getTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="space-y-8">
      {/* Admin Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-ink flex items-center gap-2">
            <ShieldCheck className="text-brand" />
            Admin Command Center
          </h2>
          <p className="text-ink3 text-sm">Managing {user.society} · {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onNavigate('submit')}
            className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-r-sm text-sm font-bold hover:bg-brand-mid transition-all shadow-sm"
          >
            <PlusCircle size={16} />
            Post Announcement
          </button>
          <button className="p-2 bg-white border border-border rounded-r-sm text-ink3 hover:text-brand transition-all">
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-r-md border border-border shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-2 rounded-lg", stat.bgColor, stat.color)}>
                <stat.icon size={20} />
              </div>
              <span className="text-[10px] font-bold text-ink3 uppercase tracking-wider">{stat.trend}</span>
            </div>
            <div className="text-3xl font-display font-bold text-ink">{stat.value}</div>
            <div className="text-xs font-medium text-ink3 mt-1">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity Feed */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-r-md border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-display font-bold text-ink flex items-center gap-2">
                <Activity size={18} className="text-brand" />
                Recent System Activity
              </h3>
              <button 
                onClick={() => onNavigate('complaints')}
                className="text-xs font-bold text-brand-mid hover:underline"
              >
                View Logs
              </button>
            </div>
            <div className="divide-y divide-border">
              {complaints.slice(0, 6).map((cmp) => (
                <div key={cmp.id} className="p-4 hover:bg-surface2 transition-colors flex items-start gap-4 group">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                    cmp.status === 'pending' ? 'bg-accent-light text-accent' : 
                    cmp.status === 'in-progress' ? 'bg-blue-50 text-blue-600' : 
                    'bg-brand-light/10 text-brand'
                  )}>
                    {cmp.status === 'pending' ? <AlertCircle size={18} /> : 
                     cmp.status === 'in-progress' ? <Clock size={18} /> : 
                     <CheckCircle size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-ink truncate group-hover:text-brand transition-colors">{cmp.title}</span>
                      <span className="text-[10px] font-medium text-ink3 whitespace-nowrap">{getTimeAgo(cmp.createdAt)}</span>
                    </div>
                    <p className="text-xs text-ink3 mt-0.5 line-clamp-1">
                      Submitted by <span className="font-semibold text-ink">{cmp.userName}</span> ({cmp.flat}) · {cmp.category}
                    </p>
                  </div>
                  <button 
                    onClick={() => onNavigate('complaints')}
                    className="p-2 text-ink3 hover:text-brand transition-all opacity-0 group-hover:opacity-100"
                  >
                    <ArrowRight size={16} />
                  </button>
                </div>
              ))}
              {complaints.length === 0 && (
                <div className="p-12 text-center text-ink3 text-sm italic">No recent activity detected.</div>
              )}
            </div>
          </div>
        </div>

        {/* Admin Sidebar Widgets */}
        <div className="space-y-6">
          {/* Pending Approvals Widget */}
          <div className="bg-white rounded-r-md border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface2">
              <h3 className="text-sm font-bold text-ink">Pending Approvals</h3>
              <span className="bg-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{pendingUsers.length}</span>
            </div>
            <div className="p-4 space-y-3">
              {pendingUsers.slice(0, 3).map((u) => (
                <div key={u.uid} className="flex items-center gap-3 p-2 rounded-md hover:bg-surface2 transition-all">
                  <div className="w-8 h-8 bg-surface3 rounded-full flex items-center justify-center text-ink3 font-bold text-xs uppercase">
                    {u.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-ink truncate">{u.name}</div>
                    <div className="text-[10px] text-ink3">{u.role} · {u.flat}</div>
                  </div>
                  <button 
                    onClick={() => onNavigate('approvals')}
                    className="text-[10px] font-bold text-brand-mid hover:underline"
                  >
                    Review
                  </button>
                </div>
              ))}
              {pendingUsers.length > 3 && (
                <button 
                  onClick={() => onNavigate('approvals')}
                  className="w-full text-center py-2 text-[10px] font-bold text-ink3 hover:text-brand transition-all border-t border-border mt-2"
                >
                  View all {pendingUsers.length} pending →
                </button>
              )}
              {pendingUsers.length === 0 && (
                <div className="py-4 text-center text-xs text-ink3 italic">All caught up!</div>
              )}
            </div>
          </div>

          {/* Quick Management Links */}
          <div className="bg-gradient-to-br from-ink to-ink2 rounded-r-md p-6 text-white shadow-lg">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
              <Settings size={16} className="text-brand-light" />
              Management
            </h3>
            <div className="space-y-2">
              <button 
                onClick={() => onNavigate('residents')}
                className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-md transition-all group"
              >
                <span className="text-xs font-medium">Resident Directory</span>
                <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </button>
              <button className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-md transition-all group">
                <span className="text-xs font-medium">Society Settings</span>
                <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </button>
              <button className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-md transition-all group">
                <span className="text-xs font-medium">System Reports</span>
                <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
