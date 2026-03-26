import { useState, useEffect } from 'react';
import { 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  Calendar, 
  MapPin, 
  Loader2,
  Check,
  Send,
  History,
  Star
} from 'lucide-react';
import { Complaint, UserProfile, ComplaintStatus, TimelineEvent, ViewId } from '../types';
import { cn } from '../lib/utils';
import { db, collection, query, where, getDocs, updateDoc, doc, addDoc, onSnapshot, orderBy } from '../firebase';

interface TrackViewProps {
  user: UserProfile;
  onNavigate: (view: ViewId) => void;
}

export default function TrackView({ user, onNavigate }: TrackViewProps) {
  const [searchId, setSearchId] = useState('');
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [currentComplaintDocId, setCurrentComplaintDocId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updateMessage, setUpdateMessage] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Feedback state
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchId.trim()) return;

    setLoading(true);
    setError(null);
    setComplaint(null);
    setShowFeedbackForm(false);

    try {
      const q = query(
        collection(db, 'complaints'),
        where('complaintId', '==', searchId.trim().toUpperCase())
      );
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setError('No complaint found with this ID.');
        setCurrentComplaintDocId(null);
      } else {
        const docSnap = querySnapshot.docs[0];
        const foundComplaint = { id: docSnap.id, ...docSnap.data() } as Complaint;
        
        // Check if user has permission to view this complaint
        if (user.role === 'Admin' || user.role === 'Supervisor' || user.role === 'Technician' || foundComplaint.userId === user.uid) {
          setCurrentComplaintDocId(docSnap.id);
        } else {
          setError('You do not have permission to view this complaint.');
          setCurrentComplaintDocId(null);
        }
      }
    } catch (err) {
      console.error("Search error:", err);
      setError('An error occurred while searching.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentComplaintDocId) {
      setComplaint(null);
      return;
    }

    // Listen to complaint document
    const unsubComplaint = onSnapshot(doc(db, 'complaints', currentComplaintDocId), (docSnap) => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as Complaint;
        setComplaint(prev => prev ? { ...data, timeline: prev.timeline } : data);
      }
    });

    // Listen to timeline subcollection
    const timelineQ = query(
      collection(db, `complaints/${currentComplaintDocId}/timeline`),
      orderBy('timestamp', 'desc')
    );

    const unsubTimeline = onSnapshot(timelineQ, (snapshot) => {
      const timeline: TimelineEvent[] = [];
      snapshot.forEach((tDoc) => {
        timeline.push({ id: tDoc.id, ...tDoc.data() } as TimelineEvent);
      });
      setComplaint(prev => prev ? { ...prev, timeline } : null);
    });

    return () => {
      unsubComplaint();
      unsubTimeline();
    };
  }, [currentComplaintDocId]);

  const handleUpdateStatus = async (newStatus: ComplaintStatus, message: string) => {
    if (!complaint) return;
    setIsUpdating(true);
    try {
      const complaintRef = doc(db, 'complaints', complaint.id);
      await updateDoc(complaintRef, { 
        status: newStatus,
        updatedAt: Date.now()
      });

      // Add timeline event
      await addDoc(collection(db, `complaints/${complaint.id}/timeline`), {
        status: newStatus,
        title: getStatusLabel(newStatus),
        description: message,
        timestamp: Date.now()
      });
      
      // Refresh complaint data
      setUpdateMessage('');
    } catch (err) {
      console.error("Update failed:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint || !updateMessage.trim()) return;
    
    setIsUpdating(true);
    try {
      await addDoc(collection(db, `complaints/${complaint.id}/timeline`), {
        status: complaint.status,
        title: 'Update',
        description: updateMessage.trim(),
        timestamp: Date.now()
      });

      // Refresh complaint data
      setUpdateMessage('');
    } catch (err) {
      console.error("Update failed:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!complaint || feedbackRating === 0) return;
    
    setIsSubmittingFeedback(true);
    try {
      const complaintRef = doc(db, 'complaints', complaint.id);
      await updateDoc(complaintRef, { 
        feedback: {
          rating: feedbackRating,
          comment: feedbackComment.trim(),
          createdAt: Date.now()
        },
        updatedAt: Date.now()
      });

      // Refresh complaint data
      setShowFeedbackForm(false);
    } catch (err) {
      console.error("Feedback failed:", err);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'in-progress': return 'In Progress';
      case 'resolved': return 'Resolved';
      default: return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-500';
      case 'Medium': return 'bg-accent';
      case 'Low': return 'bg-blue-500';
      default: return 'bg-ink3';
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <form onSubmit={handleSearch} className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink3 group-focus-within:text-brand transition-colors" size={20} />
        <input 
          type="text" 
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
          placeholder="Enter complaint ID e.g. CMP-XXXXXX"
          className="w-full bg-white border-2 border-border rounded-r-sm py-4 pl-12 pr-4 text-lg font-medium text-ink focus:border-brand-light outline-none transition-all shadow-sm focus:shadow-md"
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <Loader2 className="animate-spin text-brand" size={20} />
          </div>
        )}
      </form>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-r-sm text-sm font-medium flex items-center gap-2 border border-red-100">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {complaint && (
        <div className="bg-white rounded-r-lg border border-border overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-gradient-to-br from-brand to-brand-mid p-8 text-white">
            <div className="text-2xl font-display font-bold mb-1">#{complaint.complaintId}</div>
            <div className="text-sm text-white/70 mb-6">{complaint.title}</div>
            <div className="flex flex-wrap gap-2">
              <span className="bg-white/15 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">{complaint.category}</span>
              <span className="bg-white/15 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">{complaint.locationType}</span>
              <span className={cn("text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider", getPriorityColor(complaint.priority))}>
                {complaint.priority} Priority
              </span>
              <span className="bg-white/25 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                {getStatusLabel(complaint.status)}
              </span>
            </div>
          </div>

          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-surface2 rounded-r-md p-4 border border-border">
              <div className="flex items-center gap-3">
                <User className="text-brand w-4 h-4" />
                <div className="text-xs text-ink2"><strong>Assigned to:</strong> {complaint.assignedTo || 'Not yet assigned'}</div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="text-brand w-4 h-4" />
                <div className="text-xs text-ink2"><strong>Est. Resolution:</strong> {complaint.estimatedResolution ? formatDate(complaint.estimatedResolution) : 'TBD'}</div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="text-brand w-4 h-4" />
                <div className="text-xs text-ink2"><strong>Filed by:</strong> {complaint.userName}, {complaint.flat}</div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="text-brand w-4 h-4" />
                <div className="text-xs text-ink2"><strong>Filed on:</strong> {formatDate(complaint.createdAt)}</div>
              </div>
            </div>

            {/* Status Tracker */}
            <div className="space-y-6">
              <div className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Status Tracker</div>
              <div className="relative flex justify-between items-start pt-2">
                {/* Progress Line */}
                <div className="absolute top-4 left-0 right-0 h-0.5 bg-border -z-0" />
                <div 
                  className="absolute top-4 left-0 h-0.5 bg-brand transition-all duration-500 -z-0" 
                  style={{ 
                    width: complaint.status === 'pending' ? '0%' : 
                           complaint.status === 'in-progress' ? '66%' : 
                           complaint.status === 'resolved' ? '100%' : '0%' 
                  }} 
                />

                {[
                  { id: 'pending', label: 'Submitted', icon: Send },
                  { id: 'assigned', label: 'Assigned', icon: User },
                  { id: 'in-progress', label: 'In Progress', icon: Clock },
                  { id: 'resolved', label: 'Resolved', icon: CheckCircle2 }
                ].map((step, idx) => {
                  const isCompleted = 
                    (complaint.status === 'pending' && step.id === 'pending') ||
                    (complaint.status === 'in-progress' && (step.id === 'pending' || step.id === 'assigned' || step.id === 'in-progress')) ||
                    (complaint.status === 'resolved');
                  
                  const isCurrent = 
                    (complaint.status === 'pending' && step.id === 'pending') ||
                    (complaint.status === 'in-progress' && step.id === 'in-progress') ||
                    (complaint.status === 'resolved' && step.id === 'resolved');

                  // Special case for 'assigned' - it's completed if assignedTo exists
                  const isAssigned = step.id === 'assigned' && !!complaint.assignedTo;
                  const stepCompleted = step.id === 'assigned' ? isAssigned : isCompleted;

                  return (
                    <div key={step.id} className="relative flex flex-col items-center gap-3 z-10">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                        stepCompleted ? "bg-brand border-brand text-white" : "bg-white border-border text-ink3",
                        isCurrent && "ring-4 ring-brand/20 scale-110"
                      )}>
                        <step.icon size={14} />
                      </div>
                      <div className="flex flex-col items-center">
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-tighter text-center",
                          stepCompleted ? "text-brand" : "text-ink3"
                        )}>
                          {step.label}
                        </span>
                        {step.id === 'assigned' && complaint.assignedTo && (
                          <span className="text-[8px] text-ink2 font-medium">{complaint.assignedTo}</span>
                        )}
                        {step.id === 'pending' && (
                          <span className="text-[8px] text-ink3">{formatDate(complaint.createdAt).split(',')[0]}</span>
                        )}
                        {step.id === 'resolved' && complaint.status === 'resolved' && (
                          <span className="text-[8px] text-ink3">{formatDate(complaint.updatedAt).split(',')[0]}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Description</div>
              <p className="text-sm text-ink2 leading-relaxed bg-surface2 p-4 rounded-r-sm border border-border italic">
                "{complaint.description}"
              </p>
            </div>

            {/* Timeline */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-[10px] font-bold text-ink3 uppercase tracking-wider">
                <History size={14} />
                Timeline
              </div>
              <div className="relative pl-4 space-y-8 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                {complaint.timeline?.map((event, idx) => (
                  <div key={event.id} className="relative">
                    <div className="absolute -left-5 top-1.5 w-2.5 h-2.5 rounded-full bg-brand border-2 border-white" />
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-ink">{event.title}</span>
                        <span className="text-[10px] text-ink3">{formatDate(event.timestamp)}</span>
                      </div>
                      <p className="text-sm text-ink2">{event.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Admin/Technician Actions */}
            {(user.role === 'Admin' || user.role === 'Supervisor' || user.role === 'Technician') && (
              <div className="pt-8 border-t border-border space-y-6">
                <div className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Update Complaint</div>
                
                <div className="flex flex-wrap gap-2">
                  {complaint.status === 'pending' && (
                    <button 
                      disabled={isUpdating}
                      onClick={() => handleUpdateStatus('in-progress', 'Complaint accepted and work started.')}
                      className="px-4 py-2 bg-blue-500 text-white text-xs font-bold rounded-r-sm hover:bg-blue-600 transition-all flex items-center gap-2"
                    >
                      {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <Clock size={14} />}
                      Start Work
                    </button>
                  )}
                  {complaint.status === 'in-progress' && (
                    <button 
                      disabled={isUpdating}
                      onClick={() => handleUpdateStatus('resolved', 'Issue has been successfully resolved.')}
                      className="px-4 py-2 bg-brand text-white text-xs font-bold rounded-r-sm hover:bg-brand-mid transition-all flex items-center gap-2"
                    >
                      {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      Mark Resolved
                    </button>
                  )}
                  {complaint.status === 'resolved' && (
                    <button 
                      disabled={isUpdating}
                      onClick={() => handleUpdateStatus('in-progress', 'Complaint reopened for further inspection.')}
                      className="px-4 py-2 bg-accent text-white text-xs font-bold rounded-r-sm hover:bg-accent-mid transition-all flex items-center gap-2"
                    >
                      {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <AlertCircle size={14} />}
                      Reopen
                    </button>
                  )}
                </div>

                <form onSubmit={handleAddUpdate} className="space-y-3">
                  <textarea 
                    value={updateMessage}
                    onChange={(e) => setUpdateMessage(e.target.value)}
                    placeholder="Add a progress update..."
                    className="w-full bg-surface2 border border-border rounded-r-sm p-3 text-sm focus:border-brand-light outline-none transition-all resize-none h-24"
                  />
                  <div className="flex justify-end">
                    <button 
                      type="submit"
                      disabled={isUpdating || !updateMessage.trim()}
                      className="px-4 py-2 bg-ink text-white text-xs font-bold rounded-r-sm hover:bg-ink2 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      Post Update
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Resident Feedback Section */}
            {complaint.status === 'resolved' && (
              <div className="pt-8 border-t border-border space-y-6">
                <div className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Resolution Feedback</div>
                
                {complaint.feedback ? (
                  <div className="bg-surface2 p-6 rounded-r-md border border-border space-y-4">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={18}
                          className={cn(
                            "transition-colors",
                            star <= complaint.feedback!.rating ? "fill-accent text-accent" : "text-ink3"
                          )}
                        />
                      ))}
                      <span className="ml-2 text-sm font-bold text-ink">{complaint.feedback.rating}/5</span>
                    </div>
                    {complaint.feedback.comment && (
                      <p className="text-sm text-ink2 italic">"{complaint.feedback.comment}"</p>
                    )}
                    <div className="text-[10px] text-ink3">Submitted on {formatDate(complaint.feedback.createdAt)}</div>
                  </div>
                ) : (
                  <>
                    {!showFeedbackForm ? (
                      <button 
                        onClick={() => setShowFeedbackForm(true)}
                        className="w-full py-4 border-2 border-dashed border-border rounded-r-md text-sm font-bold text-ink3 hover:border-brand-light hover:text-brand transition-all flex flex-col items-center gap-2"
                      >
                        <Star size={24} />
                        How was your experience? Rate our service
                      </button>
                    ) : (
                      <div className="bg-surface2 p-6 rounded-r-md border border-brand-light space-y-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="space-y-3">
                          <div className="text-sm font-bold text-ink">Rate the resolution</div>
                          <div className="flex items-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                onClick={() => setFeedbackRating(star)}
                                className="group transition-transform active:scale-90"
                              >
                                <Star
                                  size={32}
                                  className={cn(
                                    "transition-colors",
                                    star <= feedbackRating ? "fill-accent text-accent" : "text-ink3 group-hover:text-accent/50"
                                  )}
                                />
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="text-sm font-bold text-ink">Any comments? (Optional)</div>
                          <textarea 
                            value={feedbackComment}
                            onChange={(e) => setFeedbackComment(e.target.value)}
                            placeholder="Tell us what you think about the service..."
                            className="w-full bg-white border border-border rounded-r-sm p-3 text-sm focus:border-brand-light outline-none transition-all resize-none h-24 shadow-inner"
                          />
                        </div>

                        <div className="flex gap-3">
                          <button 
                            onClick={() => setShowFeedbackForm(false)}
                            className="flex-1 py-3 border border-border rounded-r-sm text-sm font-bold text-ink3 hover:bg-white transition-all"
                          >
                            Cancel
                          </button>
                          <button 
                            disabled={feedbackRating === 0 || isSubmittingFeedback}
                            onClick={handleSubmitFeedback}
                            className="flex-[2] py-3 bg-brand text-white rounded-r-sm text-sm font-bold hover:bg-brand-mid transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {isSubmittingFeedback ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            Submit Feedback
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button 
                onClick={() => onNavigate('submit')}
                className="flex-1 px-6 py-3 bg-brand text-white rounded-r-sm text-sm font-bold hover:bg-brand-mid transition-all shadow-lg shadow-brand/20"
              >
                New Complaint
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
