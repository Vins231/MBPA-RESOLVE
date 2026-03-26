import { useState, useEffect } from 'react';
import { UserProfile, Complaint, ViewId } from '../types';
import { motion } from 'motion/react';
import { 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  Activity,
  Plus,
  Search,
  ClipboardList,
  CheckSquare
} from 'lucide-react';
import { cn } from '../lib/utils';
import { db, collection, query, where, onSnapshot, orderBy, limit } from '../firebase';

interface HomeViewProps {
  user: UserProfile;
  onNavigate: (view: ViewId) => void;
}

export default function HomeView({ user, onNavigate }: HomeViewProps) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let q;
    if (user.role === 'Admin' || user.role === 'Supervisor') {
      q = query(
        collection(db, 'complaints'),
        where('society', '==', user.society),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
    } else if (user.role === 'Technician') {
      q = query(
        collection(db, 'complaints'),
        where('assignedToUid', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
    } else {
      q = query(
        collection(db, 'complaints'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const complaintsData: Complaint[] = [];
      snapshot.forEach((doc) => {
        complaintsData.push({ id: doc.id, ...doc.data() } as Complaint);
      });
      setComplaints(complaintsData);
      setLoading(false);
    }, (error) => {
      console.error("Failed to fetch complaints:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const isAdmin = user.role === 'Admin' || user.role === 'Supervisor';
  const isTechnician = user.role === 'Technician';
  const isResident = user.role === 'Resident' || user.role === 'Maid';

  const stats = [
    { 
      label: isAdmin ? 'Society Complaints' : isTechnician ? 'Assigned Tasks' : 'My Complaints', 
      value: complaints.length.toString(), 
      sub: `↑ ${complaints.filter(c => new Date(c.createdAt).toDateString() === new Date().toDateString()).length} today`, 
      color: 'brand-light' 
    },
    { 
      label: 'Pending', 
      value: complaints.filter(c => c.status === 'pending').length.toString(), 
      sub: isAdmin ? 'Needs assignment' : 'Awaiting action', 
      color: 'accent' 
    },
    { 
      label: 'In Progress', 
      value: complaints.filter(c => c.status === 'in-progress').length.toString(), 
      sub: 'Active cases', 
      color: 'blue-500' 
    },
    { 
      label: 'Resolved', 
      value: complaints.filter(c => c.status === 'resolved').length.toString(), 
      sub: `↑ ${complaints.filter(c => c.status === 'resolved' && new Date(c.updatedAt || 0).toDateString() === new Date().toDateString()).length} today`, 
      color: 'brand' 
    },
  ];

  const quickActions = [
    { id: 'submit', label: 'New Complaint', desc: 'Submit a new issue', icon: Plus, bgColor: 'bg-brand-light/10', iconColor: 'text-brand-light', roles: ['Resident', 'Maid', 'Admin', 'Supervisor'] },
    { id: 'track', label: 'Track Status', desc: 'Check progress', icon: Search, bgColor: 'bg-blue-500/10', iconColor: 'text-blue-500', roles: ['Resident', 'Maid'] },
    { id: 'approvals', label: 'Approvals', desc: 'Review users', icon: CheckSquare, bgColor: 'bg-purple-500/10', iconColor: 'text-purple-500', roles: ['Admin', 'Supervisor'] },
    { id: 'complaints', label: 'All Complaints', desc: 'View full list', icon: ClipboardList, bgColor: 'bg-accent/10', iconColor: 'text-accent', roles: ['Admin', 'Supervisor', 'Technician'] },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-accent';
      case 'in-progress': return 'bg-blue-500';
      case 'resolved': return 'bg-brand-light';
      default: return 'bg-ink3';
    }
  };

  const getStatusLabelColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-accent-light text-[#7a5400]';
      case 'in-progress': return 'bg-blue-50 text-blue-600';
      case 'resolved': return 'bg-brand-light/10 text-brand';
      default: return 'bg-surface2 text-ink3';
    }
  };

  const getTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="space-y-8">
      {/* Greeting Banner */}
      <div className="bg-gradient-to-br from-brand to-brand-mid rounded-r-lg p-8 text-white relative overflow-hidden shadow-lg">
        <div className="relative z-10">
          <h2 className="text-2xl font-display font-bold mb-2">
            Good morning, {user.name.split(' ')[0]}! 👋
          </h2>
          <p className="text-white/70 text-sm">
            {isAdmin ? `Managing ${user.society} overview` : 
             isTechnician ? `Your assigned tasks for ${user.society}` : 
             `Your ${user.society} dashboard`}
          </p>
        </div>
        <div className="absolute top-4 right-8 bg-brand-light text-brand text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
          {user.role}
        </div>
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full" />
      </div>

      {/* Role-Specific Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-r-md border border-border relative overflow-hidden group hover:shadow-md transition-shadow"
          >
            <div className={cn("absolute top-0 left-0 right-0 h-1", `bg-${stat.color}`)} style={{ backgroundColor: stat.color.startsWith('brand') ? undefined : stat.color }} />
            <div className="text-[10px] font-bold text-ink3 uppercase tracking-wider mb-2">{stat.label}</div>
            <div className="text-3xl font-display font-bold text-ink">{stat.value}</div>
            <div className={cn("text-[10px] font-semibold mt-1", stat.sub.includes('↑') ? "text-brand-mid" : "text-ink3")}>
              {stat.sub}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Complaints / My Tasks */}
        <div className="bg-white rounded-r-md border border-border overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-display font-bold text-ink">
              {isTechnician ? 'My Assigned Tasks' : isResident ? 'My Recent Complaints' : 'Recent Society Issues'}
            </h3>
            <button 
              onClick={() => onNavigate('complaints')}
              className="text-xs font-semibold text-brand-mid hover:underline"
            >
              View all →
            </button>
          </div>
          <div className="p-4 space-y-1">
            {complaints.slice(0, 5).map((cmp) => (
              <div key={cmp.id} className="flex items-center gap-4 p-3 hover:bg-surface2 rounded-md transition-colors group cursor-pointer">
                <div className={cn(
                  "w-2 h-2 rounded-full flex-shrink-0",
                  getStatusColor(cmp.status)
                )} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink truncate group-hover:text-brand transition-colors">{cmp.title}</div>
                  <div className="text-[11px] text-ink3 mt-0.5">
                    {cmp.category} · {cmp.locationType} · {getTimeAgo(cmp.createdAt)}
                  </div>
                </div>
                <div className={cn(
                  "text-[10px] font-bold px-2 py-1 rounded-full capitalize",
                  getStatusLabelColor(cmp.status)
                )}>
                  {cmp.status.replace('-', ' ')}
                </div>
              </div>
            ))}
            {complaints.length === 0 && (
              <div className="py-12 text-center">
                <div className="text-ink3 text-sm">No {isTechnician ? 'tasks' : 'complaints'} found</div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-r-md border border-border overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="font-display font-bold text-ink">Quick Actions</h3>
          </div>
          <div className="p-6 grid grid-cols-2 gap-4">
            {quickActions.filter(a => !a.roles || a.roles.includes(user.role)).map((action) => (
              <button
                key={action.id}
                onClick={() => onNavigate(action.id as ViewId)}
                className="flex flex-col items-start p-4 bg-surface2 border border-border rounded-r-md hover:shadow-md hover:-translate-y-1 transition-all group"
              >
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform", action.bgColor, action.iconColor)}>
                  <action.icon size={20} />
                </div>
                <div className="text-sm font-bold text-ink mb-1">{action.label}</div>
                <div className="text-[11px] text-ink3 text-left">{action.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
