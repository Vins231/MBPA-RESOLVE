import { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  MoreVertical, 
  Eye, 
  UserPlus, 
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronDown,
  X,
  Check,
  Loader2,
  ArrowRight,
  Star
} from 'lucide-react';
import { Complaint, UserProfile, ComplaintStatus, TimelineEvent, ViewId } from '../types';
import { cn } from '../lib/utils';
import { db, collection, query, where, getDocs, updateDoc, doc, addDoc, onSnapshot, orderBy } from '../firebase';

interface ComplaintsViewProps {
  user: UserProfile;
  onNavigate: (view: ViewId) => void;
}

export default function ComplaintsView({ user, onNavigate }: ComplaintsViewProps) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [technicians, setTechnicians] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ComplaintStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [selectedTimeline, setSelectedTimeline] = useState<TimelineEvent[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState<string | null>(null);

  useEffect(() => {
    const fetchTechnicians = async () => {
      if (user.role === 'Admin' || user.role === 'Supervisor') {
        try {
          const q = query(
            collection(db, 'users'),
            where('society', '==', user.society),
            where('role', '==', 'Technician'),
            where('isApproved', '==', true)
          );
          const querySnapshot = await getDocs(q);
          const techs: UserProfile[] = [];
          querySnapshot.forEach((doc) => {
            techs.push(doc.data() as UserProfile);
          });
          setTechnicians(techs);
        } catch (error) {
          console.error("Failed to fetch technicians:", error);
        }
      }
    };
    fetchTechnicians();
  }, [user.society, user.role]);

  useEffect(() => {
    let q;
    if (user.role === 'Admin' || user.role === 'Supervisor') {
      q = query(
        collection(db, 'complaints'),
        where('society', '==', user.society),
        orderBy('createdAt', 'desc')
      );
    } else if (user.role === 'Technician') {
      q = query(
        collection(db, 'complaints'),
        where('assignedToUid', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        collection(db, 'complaints'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
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

  useEffect(() => {
    if (!selectedComplaint) {
      setSelectedTimeline([]);
      return;
    }

    const q = query(
      collection(db, `complaints/${selectedComplaint.id}/timeline`),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const timelineData: TimelineEvent[] = [];
      snapshot.forEach((doc) => {
        timelineData.push({ id: doc.id, ...doc.data() } as TimelineEvent);
      });
      setSelectedTimeline(timelineData);
    }, (error) => {
      console.error("Failed to fetch timeline:", error);
    });

    return () => unsubscribe();
  }, [selectedComplaint]);

  const filteredComplaints = complaints.filter(c => 
    (filter === 'all' || c.status === filter) &&
    (c.title.toLowerCase().includes(search.toLowerCase()) || c.complaintId.toLowerCase().includes(search.toLowerCase()))
  );

  const handleUpdateStatus = async (complaintId: string, newStatus: ComplaintStatus, message: string) => {
    setIsUpdating(true);
    try {
      const complaintRef = doc(db, 'complaints', complaintId);
      await updateDoc(complaintRef, { status: newStatus });

      await addDoc(collection(db, `complaints/${complaintId}/timeline`), {
        title: message,
        status: newStatus,
        timestamp: Date.now()
      });

      setSelectedComplaint(null);
    } catch (error) {
      console.error("Update failed:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAssignTechnician = async (complaintId: string, tech: UserProfile) => {
    setIsUpdating(true);
    try {
      const complaintRef = doc(db, 'complaints', complaintId);
      await updateDoc(complaintRef, { 
        assignedToUid: tech.uid,
        assignedToName: tech.name,
        assignedTo: tech.name,
        status: 'in-progress'
      });

      await addDoc(collection(db, `complaints/${complaintId}/timeline`), {
        title: `Assigned to ${tech.name}`,
        status: 'assigned',
        timestamp: Date.now()
      });

      setShowAssignModal(null);
      setSelectedComplaint(null);
    } catch (error) {
      console.error("Assignment failed:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-50 text-red-600';
      case 'Medium': return 'bg-accent-light text-[#7a5400]';
      case 'Low': return 'bg-brand-light/10 text-brand';
      default: return 'bg-surface2 text-ink3';
    }
  };

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
      case 'pending': return 'text-[#7a5400]';
      case 'in-progress': return 'text-blue-600';
      case 'resolved': return 'text-brand';
      default: return 'text-ink3';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-r-lg border border-border overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <h2 className="text-lg font-display font-bold text-ink whitespace-nowrap">Complaints</h2>
            <div className="relative flex-1 max-w-md group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3 group-focus-within:text-brand transition-colors" size={16} />
              <input 
                type="text" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by ID or title..."
                className="w-full bg-surface2 border border-border rounded-r-md py-2 pl-10 pr-4 text-sm focus:border-brand-light outline-none transition-all"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-surface2 p-1 rounded-full border border-border overflow-x-auto no-scrollbar">
              {(['all', 'pending', 'in-progress', 'resolved'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                    filter === f ? "bg-brand text-white shadow-sm" : "text-ink3 hover:text-ink hover:bg-white/50"
                  )}
                >
                  {f === 'in-progress' ? 'In Progress' : f}
                </button>
              ))}
            </div>
            <button 
              onClick={() => onNavigate('submit')}
              className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-r-sm text-sm font-bold hover:bg-brand-mid transition-all shadow-md shadow-brand/10"
            >
              <Plus size={16} />
              New
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface2">
                <th className="px-6 py-4 text-[10px] font-bold text-ink3 uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 text-[10px] font-bold text-ink3 uppercase tracking-wider">Complaint</th>
                <th className="px-6 py-4 text-[10px] font-bold text-ink3 uppercase tracking-wider">Location</th>
                <th className="px-6 py-4 text-[10px] font-bold text-ink3 uppercase tracking-wider">Resident</th>
                <th className="px-6 py-4 text-[10px] font-bold text-ink3 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-4 text-[10px] font-bold text-ink3 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-ink3 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Loader2 className="animate-spin text-brand mx-auto" size={24} />
                  </td>
                </tr>
              ) : filteredComplaints.map((cmp) => (
                <tr key={cmp.id} className="hover:bg-brand/5 transition-colors group">
                  <td className="px-6 py-4 text-xs font-bold text-ink3 group-hover:text-brand transition-colors">#{cmp.complaintId}</td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-ink truncate max-w-[200px]">{cmp.title}</div>
                    <div className="text-[10px] text-ink3">{cmp.category}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider",
                      cmp.locationType === 'flat' ? "bg-brand-light/10 text-brand" : "bg-blue-50 text-blue-600"
                    )}>
                      {cmp.locationType}
                    </span>
                    <div className="text-[10px] text-ink3 mt-0.5">{cmp.flat}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-surface2 border border-border flex items-center justify-center text-[9px] font-bold text-brand">
                        {cmp.userName.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="text-xs font-medium text-ink2">{cmp.userName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-1 rounded-full",
                      getPriorityColor(cmp.priority)
                    )}>
                      {cmp.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        getStatusColor(cmp.status)
                      )} />
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wider",
                        getStatusLabelColor(cmp.status)
                      )}>
                        {cmp.status.replace('-', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => setSelectedComplaint(cmp)}
                        className="p-2 text-ink3 hover:text-brand hover:bg-brand/10 rounded-md transition-all" 
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      {(user.role === 'Admin' || user.role === 'Supervisor') && cmp.status === 'pending' && (
                        <button 
                          onClick={() => setShowAssignModal(cmp.id)}
                          className="p-2 text-ink3 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all" 
                          title="Assign Technician"
                        >
                          <UserPlus size={16} />
                        </button>
                      )}
                      {user.role === 'Technician' && cmp.status === 'in-progress' && (
                        <button 
                          onClick={() => handleUpdateStatus(cmp.id, 'resolved', 'Task completed by technician.')}
                          className="p-2 text-brand hover:bg-brand/10 rounded-md transition-all" 
                          title="Mark Resolved"
                        >
                          <Check size={16} />
                        </button>
                      )}
                      <button className="p-2 text-ink3 hover:text-ink hover:bg-surface2 rounded-md transition-all">
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filteredComplaints.length === 0 && (
            <div className="p-12 text-center space-y-3">
              <div className="text-4xl">📭</div>
              <div className="text-sm font-bold text-ink">No complaints found</div>
              <p className="text-xs text-ink3">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-r-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border flex items-center justify-between bg-surface2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand text-white rounded-lg flex items-center justify-center font-bold">
                  #{selectedComplaint.complaintId.slice(-4)}
                </div>
                <div>
                  <h3 className="font-display font-bold text-ink">{selectedComplaint.title}</h3>
                  <p className="text-[10px] text-ink3 uppercase tracking-wider">#{selectedComplaint.complaintId}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedComplaint(null)}
                className="p-2 text-ink3 hover:text-ink hover:bg-border rounded-md transition-all"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-surface2 p-3 rounded-r-sm border border-border">
                  <div className="text-[9px] font-bold text-ink3 uppercase tracking-wider mb-1">Status</div>
                  <div className={cn("text-xs font-bold uppercase", getStatusLabelColor(selectedComplaint.status))}>
                    {selectedComplaint.status.replace('-', ' ')}
                  </div>
                </div>
                <div className="bg-surface2 p-3 rounded-r-sm border border-border">
                  <div className="text-[9px] font-bold text-ink3 uppercase tracking-wider mb-1">Priority</div>
                  <div className={cn("text-xs font-bold uppercase", getPriorityColor(selectedComplaint.priority))}>
                    {selectedComplaint.priority}
                  </div>
                </div>
                <div className="bg-surface2 p-3 rounded-r-sm border border-border">
                  <div className="text-[9px] font-bold text-ink3 uppercase tracking-wider mb-1">Category</div>
                  <div className="text-xs font-bold text-ink">{selectedComplaint.category}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Description</div>
                <p className="text-sm text-ink2 leading-relaxed bg-surface2 p-4 rounded-r-sm border border-border">
                  {selectedComplaint.description}
                </p>
              </div>

              {selectedComplaint.feedback && (
                <div className="space-y-3 bg-brand-light/10 p-4 rounded-r-sm border border-brand-light/20">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-bold text-brand uppercase tracking-wider">Resident Feedback</div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          size={14} 
                          className={cn(
                            star <= selectedComplaint.feedback!.rating ? "fill-brand text-brand" : "text-ink3"
                          )} 
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-ink italic">"{selectedComplaint.feedback.comment || 'No comment provided.'}"</p>
                  <div className="text-[9px] text-ink3 text-right">Submitted on {new Date(selectedComplaint.feedback.createdAt).toLocaleDateString()}</div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Resident Details</div>
                  <div className="text-sm text-ink font-medium">{selectedComplaint.userName}</div>
                  <div className="text-xs text-ink3">{selectedComplaint.flat}, {selectedComplaint.building}</div>
                  <div className="text-xs text-ink3">{selectedComplaint.userMobile}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Assignment</div>
                  <div className="text-sm text-ink font-medium">{selectedComplaint.assignedTo || 'Unassigned'}</div>
                  <div className="text-xs text-ink3">Estimated: {selectedComplaint.estimatedResolution ? new Date(selectedComplaint.estimatedResolution).toLocaleDateString() : 'TBD'}</div>
                </div>
              </div>

              {/* Real-time Timeline Tracker */}
              <div className="space-y-4 pt-4 border-t border-border">
                <div className="text-[10px] font-bold text-ink3 uppercase tracking-wider flex items-center gap-2">
                  <Clock size={14} className="text-brand" />
                  Status Timeline
                </div>
                <div className="relative pl-4 space-y-6 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                  {selectedTimeline.length === 0 ? (
                    <div className="text-xs text-ink3 italic">No events recorded yet.</div>
                  ) : (
                    selectedTimeline.map((event) => (
                      <div key={event.id} className="relative">
                        <div className={cn(
                          "absolute -left-5 top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white",
                          event.status === 'resolved' ? "bg-brand" : 
                          event.status === 'in-progress' ? "bg-blue-500" : 
                          "bg-accent"
                        )} />
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-ink">{event.title}</span>
                            <span className="text-[10px] text-ink3">
                              {new Date(event.timestamp).toLocaleString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          {event.description && (
                            <p className="text-xs text-ink2">{event.description}</p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Admin Actions */}
              {(user.role === 'Admin' || user.role === 'Supervisor' || user.role === 'Technician') && (
                <div className="pt-6 border-t border-border space-y-4">
                  <div className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Update Status</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedComplaint.status === 'pending' && (
                      <button 
                        disabled={isUpdating}
                        onClick={() => handleUpdateStatus(selectedComplaint.id, 'in-progress', 'Complaint accepted and work started.')}
                        className="px-4 py-2 bg-blue-500 text-white text-xs font-bold rounded-r-sm hover:bg-blue-600 transition-all flex items-center gap-2"
                      >
                        {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <Clock size={14} />}
                        Start Work
                      </button>
                    )}
                    {selectedComplaint.status === 'in-progress' && (
                      <button 
                        disabled={isUpdating}
                        onClick={() => handleUpdateStatus(selectedComplaint.id, 'resolved', 'Issue has been successfully resolved.')}
                        className="px-4 py-2 bg-brand text-white text-xs font-bold rounded-r-sm hover:bg-brand-mid transition-all flex items-center gap-2"
                      >
                        {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        Mark Resolved
                      </button>
                    )}
                    {selectedComplaint.status === 'resolved' && (
                      <button 
                        disabled={isUpdating}
                        onClick={() => handleUpdateStatus(selectedComplaint.id, 'in-progress', 'Complaint reopened for further inspection.')}
                        className="px-4 py-2 bg-accent text-white text-xs font-bold rounded-r-sm hover:bg-accent-mid transition-all flex items-center gap-2"
                      >
                        {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <AlertCircle size={14} />}
                        Reopen
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Assign Technician Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-r-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-border flex items-center justify-between bg-surface2">
              <h3 className="font-display font-bold text-ink">Assign Technician</h3>
              <button onClick={() => setShowAssignModal(null)} className="p-1 text-ink3 hover:text-ink"><X size={18} /></button>
            </div>
            <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
              {technicians.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <div className="text-2xl">🔧</div>
                  <p className="text-xs text-ink3">No approved technicians found in your society.</p>
                </div>
              ) : (
                technicians.map((tech) => (
                  <button
                    key={tech.uid}
                    onClick={() => handleAssignTechnician(showAssignModal, tech)}
                    disabled={isUpdating}
                    className="w-full flex items-center gap-3 p-3 rounded-r-sm border border-border hover:border-brand hover:bg-brand/5 transition-all text-left group"
                  >
                    <div className="w-8 h-8 bg-surface3 rounded-full flex items-center justify-center text-ink3 font-bold text-xs">
                      {tech.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-ink group-hover:text-brand transition-colors">{tech.name}</div>
                      <div className="text-[10px] text-ink3">{tech.mobile}</div>
                    </div>
                    {isUpdating ? <Loader2 size={14} className="animate-spin text-brand" /> : <ArrowRight size={14} className="text-ink3 group-hover:text-brand" />}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
