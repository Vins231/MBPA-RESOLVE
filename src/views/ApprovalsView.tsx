import { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Search, 
  Filter, 
  Clock, 
  User, 
  Building, 
  Phone,
  Check,
  X,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { UserProfile } from '../types';
import { cn } from '../lib/utils';
import ConfirmModal from '../components/ConfirmModal';
import { db, collection, query, where, onSnapshot, updateDoc, doc, deleteDoc } from '../firebase';

interface ApprovalsViewProps {
  user: UserProfile;
}

export default function ApprovalsView({ user }: ApprovalsViewProps) {
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'users'),
      where('society', '==', user.society),
      where('isApproved', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users: UserProfile[] = [];
      snapshot.forEach((doc) => {
        users.push(doc.data() as UserProfile);
      });
      setPendingUsers(users);
      setLoading(false);
    }, (error) => {
      console.error("Failed to fetch pending users:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user.society]);

  const handleApprove = async (targetUserId: string) => {
    setIsProcessing(targetUserId);
    try {
      const userRef = doc(db, 'users', targetUserId);
      await updateDoc(userRef, { 
        isApproved: true,
        status: 'approved',
        approvedAt: Date.now(),
        approvedBy: user.name
      });
    } catch (error) {
      console.error("Approval failed:", error);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!rejectId) return;
    
    setIsProcessing(rejectId);
    try {
      const userRef = doc(db, 'users', rejectId);
      await deleteDoc(userRef);
      setRejectId(null);
    } catch (error) {
      console.error("Rejection failed:", error);
    } finally {
      setIsProcessing(null);
    }
  };

  const filteredUsers = pendingUsers.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.flat?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-r-lg border border-border overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-display font-bold text-ink">Registration Approvals</h2>
            <p className="text-xs text-ink3">Review and approve new resident registrations for {user.society}</p>
          </div>
          <div className="relative max-w-md group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3 group-focus-within:text-brand transition-colors" size={16} />
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email or flat..."
              className="w-full bg-surface2 border border-border rounded-r-md py-2 pl-10 pr-4 text-sm focus:border-brand-light outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface2">
                <th className="px-6 py-4 text-[10px] font-bold text-ink3 uppercase tracking-wider">Resident</th>
                <th className="px-6 py-4 text-[10px] font-bold text-ink3 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-[10px] font-bold text-ink3 uppercase tracking-wider">Location</th>
                <th className="px-6 py-4 text-[10px] font-bold text-ink3 uppercase tracking-wider">Ref Code</th>
                <th className="px-6 py-4 text-[10px] font-bold text-ink3 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="animate-spin text-brand mx-auto" size={24} />
                  </td>
                </tr>
              ) : filteredUsers.map((u) => (
                <tr key={u.uid} className="hover:bg-brand/5 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-surface2 border border-border flex items-center justify-center text-xs font-bold text-brand">
                        {u.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-ink">{u.name}</div>
                        <div className="text-[10px] text-ink3">{u.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-ink2">{u.email}</div>
                    <div className="text-[10px] text-ink3">{u.mobile}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs font-bold text-ink">{u.flat || 'N/A'}</div>
                    <div className="text-[10px] text-ink3">{u.building || 'Service Staff'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-mono font-bold bg-surface2 px-2 py-1 rounded border border-border">
                      {u.referenceCode || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button 
                        disabled={isProcessing !== null}
                        onClick={() => handleApprove(u.uid)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-brand text-white text-[10px] font-bold rounded-r-sm hover:bg-brand-mid transition-all disabled:opacity-50"
                      >
                        {isProcessing === u.uid ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                        Approve
                      </button>
                      <button 
                        disabled={isProcessing !== null}
                        onClick={() => setRejectId(u.uid)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 text-[10px] font-bold rounded-r-sm hover:bg-red-100 transition-all disabled:opacity-50"
                      >
                        {isProcessing === u.uid ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filteredUsers.length === 0 && (
            <div className="p-12 text-center space-y-3">
              <div className="text-4xl">✨</div>
              <div className="text-sm font-bold text-ink">No pending approvals</div>
              <p className="text-xs text-ink3">All registration requests have been processed</p>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={!!rejectId}
        onClose={() => setRejectId(null)}
        onConfirm={handleReject}
        title="Reject Registration"
        message="Are you sure you want to reject and delete this registration request? This action cannot be undone."
        confirmLabel="Reject & Delete"
        isLoading={isProcessing !== null}
      />
    </div>
  );
}
