import { useState } from 'react';
import { 
  Settings, 
  User, 
  Shield, 
  Wrench, 
  Home, 
  Database, 
  RefreshCw,
  ChevronRight,
  X,
  Play
} from 'lucide-react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, signInAnonymously } from 'firebase/auth';
import { seedDemoData } from '../services/demoDataService';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { collection, addDoc, doc, updateDoc, setDoc } from 'firebase/firestore';
import { UserProfile, UserRole } from '../types';

export default function DevTools() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  const demoUsers = [
    { name: 'Admin', role: 'Admin' as UserRole, icon: Shield, mobile: '9820012345' },
    { name: 'Supervisor', role: 'Supervisor' as UserRole, icon: User, mobile: '9820054321' },
    { name: 'Technician', role: 'Technician' as UserRole, icon: Wrench, mobile: '9820099887' },
    { name: 'Resident', role: 'Resident' as UserRole, icon: Home, mobile: '9820011223' },
  ];

  const handleDemoLogin = async (demoRole: UserRole, mobile: string) => {
    try {
      await signOut(auth);
      const email = `${mobile}@mbpa-resolve.app`;
      const password = 'password123';
      
      let fUser;
      try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        fUser = result.user;
      } catch (signInErr: any) {
        if (signInErr.code === 'auth/operation-not-allowed' || signInErr.code === 'auth/admin-restricted-operation') {
          console.warn(`Auth operation restricted (${signInErr.code}). Falling back to Anonymous Auth for demo.`);
          const result = await signInAnonymously(auth);
          fUser = result.user;
        } else if (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential') {
          // Create the user if they don't exist
          try {
            const result = await createUserWithEmailAndPassword(auth, email, password);
            fUser = result.user;
          } catch (createErr: any) {
            if (createErr.code === 'auth/operation-not-allowed' || createErr.code === 'auth/admin-restricted-operation') {
              console.warn(`User creation restricted (${createErr.code}). Falling back to Anonymous Auth for demo.`);
              const result = await signInAnonymously(auth);
              fUser = result.user;
            } else {
              throw createErr;
            }
          }
        } else {
          throw signInErr;
        }
      }

      const demoProfiles: Record<UserRole, Partial<UserProfile>> = {
        'Admin': { name: 'Amit Sharma', role: 'Admin', mobile: '9820012345', flat: 'A-101', society: 'Colaba' },
        'Supervisor': { name: 'Rajesh Patil', role: 'Supervisor', mobile: '9820054321', society: 'Colaba' },
        'Technician': { name: 'Suresh Kumar', role: 'Technician', mobile: '9820099887', society: 'Colaba' },
        'Resident': { name: 'Priya Verma', role: 'Resident', mobile: '9820011223', flat: 'C-505', society: 'Colaba' },
        'Maid': { name: 'Laxmi Bai', role: 'Maid', mobile: '9820033445', flat: 'C-505', society: 'Colaba' }
      };

      const profile = demoProfiles[demoRole];
      const isResidentRole = demoRole === 'Resident' || demoRole === 'Maid' || demoRole === 'Admin';
      
      // Always ensure the profile document exists for the demo user
      await setDoc(doc(db, 'users', fUser.uid), {
        uid: fUser.uid,
        email: fUser.email,
        status: 'approved',
        isApproved: true,
        createdAt: Date.now(),
        ...(isResidentRole ? { floor: '1', building: 'Tower A' } : {}),
        ...profile
      }, { merge: true });
      
      setIsOpen(false);
      // Small delay to ensure Firestore write is acknowledged before reload
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('Demo login failed:', error);
      alert('Demo login failed. Check console.');
    }
  };

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      await seedDemoData();
      alert('Demo data seeded successfully!');
    } catch (error) {
      console.error('Seeding failed:', error);
      alert('Seeding failed. Check console.');
    } finally {
      setIsSeeding(false);
    }
  };

  const simulateFullFlow = async () => {
    if (!auth.currentUser) {
      alert('Please login first.');
      return;
    }
    
    setIsSimulating(true);
    try {
      // 1. Create a complaint
      const complaintId = `TEST-${Math.floor(1000 + Math.random() * 9000)}`;
      const complaintRef = await addDoc(collection(db, 'complaints'), {
        complaintId,
        title: 'Simulation: Leaking Pipe',
        description: 'This is an automated test complaint to verify the full resolution flow.',
        locationType: 'flat',
        category: 'Plumbing',
        issue: 'Pipe Leakage',
        flat: 'A-101',
        building: 'Tower A',
        priority: 'Medium',
        status: 'pending',
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'Test Resident',
        userMobile: '9820011223',
        society: 'Colaba',
        authorUid: auth.currentUser.uid,
        authorName: auth.currentUser.displayName || 'Test Resident',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        timeline: [
          {
            id: '1',
            title: 'Complaint Filed',
            timestamp: Date.now(),
            description: 'Complaint registered successfully.',
            status: 'submitted',
            user: auth.currentUser.displayName || 'Resident'
          }
        ]
      });

      // 2. Assign to technician (Simulated by Admin/Supervisor)
      // Note: This will fail if the current user is not Admin/Supervisor due to firestore.rules
      await updateDoc(complaintRef, {
        status: 'in-progress',
        assignedToUid: 'demo-tech-id',
        assignedToName: 'Suresh Kumar',
        assignedTo: 'Suresh Kumar',
        updatedAt: Date.now(),
        timeline: [
          {
            id: '1',
            title: 'Complaint Filed',
            timestamp: Date.now() - 1000,
            status: 'submitted',
            user: 'Resident'
          },
          {
            id: '2',
            title: 'Technician Assigned',
            timestamp: Date.now(),
            description: 'Assigned to Suresh Kumar (Technician).',
            status: 'in-progress',
            user: 'Admin'
          }
        ]
      });

      // 3. Resolve (Simulated by Technician)
      await updateDoc(complaintRef, {
        status: 'resolved',
        updatedAt: Date.now(),
        timeline: [
          { id: '1', title: 'Complaint Filed', timestamp: Date.now() - 2000, status: 'submitted', user: 'Resident' },
          { id: '2', title: 'Technician Assigned', timestamp: Date.now() - 1000, status: 'in-progress', user: 'Admin' },
          {
            id: '3',
            title: 'Issue Resolved',
            timestamp: Date.now(),
            description: 'The pipe has been fixed and tested.',
            status: 'resolved',
            user: 'Suresh Kumar'
          }
        ]
      });

      // 4. Add Feedback (Simulated by Resident)
      await updateDoc(complaintRef, {
        feedback: {
          rating: 5,
          comment: 'Excellent and quick service! The technician was very professional.',
          createdAt: Date.now()
        }
      });

      alert(`Full flow simulation complete for ${complaintId}! Check "All Complaints" to see the result.`);
      setIsOpen(false);
    } catch (error: any) {
      console.error('Simulation failed:', error);
      if (error.code === 'permission-denied') {
        alert('Simulation failed: Permission Denied. Please login as "Admin" to run the full flow simulation, as it involves assigning and resolving complaints.');
      } else {
        alert('Simulation failed. Check console.');
      }
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300",
          isOpen ? "bg-ink text-white rotate-90" : "bg-brand text-white hover:scale-110"
        )}
      >
        {isOpen ? <X size={24} /> : <Settings size={24} />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="absolute bottom-16 right-0 w-72 bg-white rounded-2xl shadow-2xl border border-border overflow-hidden"
          >
            <div className="p-4 bg-surface2 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database size={16} className="text-brand" />
                <span className="text-xs font-bold text-ink uppercase tracking-wider">Developer Tools</span>
              </div>
            </div>

            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-ink3 uppercase tracking-wider px-1">Quick Login (Demo Accounts)</div>
                <div className="grid grid-cols-1 gap-1">
                  {demoUsers.map((user) => (
                    <button
                      key={user.role}
                      onClick={() => handleDemoLogin(user.role, user.mobile)}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-surface2 border border-transparent hover:border-border transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
                          <user.icon size={16} />
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-bold text-ink">{user.name}</div>
                          <div className="text-[10px] text-ink3">{user.role}</div>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-ink3 group-hover:text-brand transition-colors" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-border space-y-2">
                <button
                  onClick={handleSeed}
                  disabled={isSeeding || isSimulating}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-ink text-white text-xs font-bold hover:bg-ink/90 transition-all disabled:opacity-50"
                >
                  {isSeeding ? <RefreshCw size={14} className="animate-spin" /> : <Database size={14} />}
                  Seed Demo Data
                </button>
                
                <button
                  onClick={simulateFullFlow}
                  disabled={isSeeding || isSimulating}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-brand text-white text-xs font-bold hover:bg-brand-mid transition-all disabled:opacity-50"
                >
                  {isSimulating ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                  Simulate Full Flow
                </button>

                <p className="mt-2 text-[9px] text-ink3 text-center italic">
                  "Simulate Full Flow" creates, assigns, resolves, and adds feedback to a test complaint in one click.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

