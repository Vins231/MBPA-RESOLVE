import { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  User, 
  Building, 
  Phone,
  Mail,
  MoreVertical,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  X,
  Edit,
  Trash2
} from 'lucide-react';
import { UserProfile, UserRole } from '../types';
import { cn } from '../lib/utils';
import ConfirmModal from '../components/ConfirmModal';
import { db, collection, query, where, onSnapshot, updateDoc, doc, deleteDoc } from '../firebase';

interface ResidentsViewProps {
  user: UserProfile;
}

export default function ResidentsView({ user }: ResidentsViewProps) {
  const [residents, setResidents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | 'all'>('all');
  const [selectedResident, setSelectedResident] = useState<UserProfile | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkRole, setBulkRole] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'users'),
      where('society', '==', user.society),
      where('isApproved', '==', true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const residentsData: UserProfile[] = [];
      snapshot.forEach((doc) => {
        residentsData.push({ uid: doc.id, ...doc.data() } as UserProfile);
      });
      setResidents(residentsData);
      setLoading(false);
    }, (error) => {
      console.error("Failed to fetch residents:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user.society]);

  const handleUpdateRole = async (targetUserId: string, newRole: string) => {
    setIsUpdating(true);
    try {
      const userRef = doc(db, 'users', targetUserId);
      await updateDoc(userRef, { role: newRole });
      setSelectedResident(null);
    } catch (error) {
      console.error("Update failed:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBulkUpdateRole = async () => {
    if (!bulkRole || selectedIds.length === 0) return;
    
    setIsUpdating(true);
    try {
      await Promise.all(selectedIds.map(id => 
        updateDoc(doc(db, 'users', id), { role: bulkRole })
      ));
      
      setSelectedIds([]);
      setBulkRole(null);
    } catch (error) {
      console.error("Bulk update failed:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredResidents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredResidents.map(r => r.uid));
    }
  };

  const handleDeleteResident = async () => {
    if (!deleteId) return;
    
    setIsUpdating(true);
    try {
      await deleteDoc(doc(db, 'users', deleteId));
      setSelectedResident(null);
      setDeleteId(null);
    } catch (error) {
      console.error("Delete failed:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredResidents = residents.filter(r => 
    (roleFilter === 'all' || r.role === roleFilter) &&
    (r.name.toLowerCase().includes(search.toLowerCase()) || 
     r.email.toLowerCase().includes(search.toLowerCase()) ||
     (r.flat?.toLowerCase().includes(search.toLowerCase()) ?? false))
  );

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Admin': return <ShieldCheck className="text-brand" size={14} />;
      case 'Supervisor': return <Shield className="text-blue-600" size={14} />;
      case 'Technician': return <ShieldAlert className="text-accent" size={14} />;
      default: return <User className="text-ink3" size={14} />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Admin': return 'bg-brand-light/10 text-brand';
      case 'Supervisor': return 'bg-blue-50 text-blue-600';
      case 'Technician': return 'bg-accent-light text-[#7a5400]';
      default: return 'bg-surface2 text-ink3';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-r-lg border border-border overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <h2 className="text-lg font-display font-bold text-ink whitespace-nowrap">Residents Directory</h2>
            <div className="relative flex-1 max-w-md group">
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
          <div className="flex items-center gap-3">
            <div className="flex bg-surface2 p-1 rounded-full border border-border overflow-x-auto no-scrollbar">
              {(['all', 'Resident', 'Technician', 'Supervisor', 'Admin', 'Maid'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setRoleFilter(r);
                    setSelectedIds([]);
                  }}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                    roleFilter === r ? "bg-brand text-white shadow-sm" : "text-ink3 hover:text-ink hover:bg-white/50"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {selectedIds.length > 0 && (
          <div className="bg-brand/5 border-b border-brand/10 p-4 flex items-center justify-between animate-in slide-in-from-top duration-200">
            <div className="flex items-center gap-3">
              <div className="bg-brand text-white text-[10px] font-bold px-2 py-1 rounded-full">
                {selectedIds.length} Selected
              </div>
              <div className="text-sm text-ink2">Apply bulk action to selected residents</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-[10px] font-bold text-ink3 uppercase tracking-wider mr-2">Assign Role:</div>
              {(['Resident', 'Technician', 'Supervisor', 'Admin', 'Maid'] as const).map((role) => (
                <button
                  key={role}
                  onClick={() => setBulkRole(role)}
                  className="px-3 py-1.5 bg-white border border-border rounded-r-sm text-[10px] font-bold text-ink2 hover:border-brand hover:text-brand transition-all"
                >
                  {role}
                </button>
              ))}
              <div className="w-px h-6 bg-border mx-2" />
              <button 
                onClick={() => setSelectedIds([])}
                className="p-2 text-ink3 hover:text-ink hover:bg-white rounded-md transition-all"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface2">
                <th className="px-6 py-4 w-10">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.length === filteredResidents.length && filteredResidents.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-border text-brand focus:ring-brand"
                  />
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-ink3 uppercase tracking-wider">Resident</th>
                <th className="px-6 py-4 text-[10px] font-bold text-ink3 uppercase tracking-wider">Location</th>
                <th className="px-6 py-4 text-[10px] font-bold text-ink3 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-[10px] font-bold text-ink3 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-[10px] font-bold text-ink3 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="animate-spin text-brand mx-auto" size={24} />
                  </td>
                </tr>
              ) : filteredResidents.map((r) => (
                <tr key={r.uid} className={cn(
                  "hover:bg-brand/5 transition-colors group",
                  selectedIds.includes(r.uid) && "bg-brand/5"
                )}>
                  <td className="px-6 py-4">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.includes(r.uid)}
                      onChange={() => toggleSelection(r.uid)}
                      className="w-4 h-4 rounded border-border text-brand focus:ring-brand"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-surface2 border border-border flex items-center justify-center text-xs font-bold text-brand">
                        {r.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="text-sm font-bold text-ink">{r.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs font-bold text-ink">{r.flat || 'N/A'}</div>
                    <div className="text-[10px] text-ink3">{r.building || 'Service Staff'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-ink2">
                        <Mail size={10} className="text-ink3" />
                        {r.email}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-ink2">
                        <Phone size={10} className="text-ink3" />
                        {r.mobile}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={cn(
                      "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      getRoleColor(r.role)
                    )}>
                      {getRoleIcon(r.role)}
                      {r.role}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => setSelectedResident(r)}
                        className="p-2 text-ink3 hover:text-brand hover:bg-brand/10 rounded-md transition-all"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => setDeleteId(r.uid)}
                        className="p-2 text-ink3 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filteredResidents.length === 0 && (
            <div className="p-12 text-center space-y-3">
              <div className="text-4xl">👥</div>
              <div className="text-sm font-bold text-ink">No residents found</div>
              <p className="text-xs text-ink3">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Resident Modal */}
      {selectedResident && (
        <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-r-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border flex items-center justify-between bg-surface2">
              <h3 className="font-display font-bold text-ink">Manage Resident</h3>
              <button 
                onClick={() => setSelectedResident(null)}
                className="p-2 text-ink3 hover:text-ink hover:bg-border rounded-md transition-all"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-xl font-bold text-brand">
                  {selectedResident.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div className="text-lg font-bold text-ink">{selectedResident.name}</div>
                  <div className="text-sm text-ink3">
                    {selectedResident.flat ? `${selectedResident.flat}, ${selectedResident.building}` : selectedResident.role}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Change Role</div>
                <div className="grid grid-cols-2 gap-2">
                  {(['Resident', 'Technician', 'Supervisor', 'Admin', 'Maid'] as const).map((role) => (
                    <button
                      key={role}
                      disabled={isUpdating}
                      onClick={() => handleUpdateRole(selectedResident.uid, role)}
                      className={cn(
                        "px-4 py-2 rounded-r-sm text-xs font-bold border transition-all flex items-center justify-center gap-2",
                        selectedResident.role === role 
                          ? "bg-brand text-white border-brand shadow-sm" 
                          : "bg-surface2 text-ink2 border-border hover:border-brand-light hover:bg-white"
                      )}
                    >
                      {isUpdating && selectedResident.role !== role && <Loader2 size={12} className="animate-spin" />}
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-border">
                <button 
                  disabled={isUpdating}
                  onClick={() => setDeleteId(selectedResident.uid)}
                  className="w-full px-4 py-2 bg-red-50 text-red-600 text-xs font-bold rounded-r-sm hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 size={14} />
                  Remove Resident
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteResident}
        title="Remove Resident"
        message="Are you sure you want to remove this resident? This action cannot be undone."
        confirmLabel="Remove Resident"
        isLoading={isUpdating}
      />

      <ConfirmModal
        isOpen={!!bulkRole}
        onClose={() => setBulkRole(null)}
        onConfirm={handleBulkUpdateRole}
        title="Bulk Role Update"
        message={`Are you sure you want to update the role of ${selectedIds.length} residents to ${bulkRole}?`}
        confirmLabel="Update Roles"
        isLoading={isUpdating}
      />
    </div>
  );
}
