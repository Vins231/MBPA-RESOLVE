import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  writeBatch,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Complaint, TimelineEvent } from '../types';

const DEMO_SOCIETY = 'Colaba';

export async function seedDemoData() {
  console.log('Seeding demo data...');
  
  // Check if already seeded
  const q = query(collection(db, 'users'), where('society', '==', DEMO_SOCIETY));
  const snapshot = await getDocs(q);
  if (snapshot.size > 5) {
    console.log('Demo data already exists.');
    return;
  }

  const batch = writeBatch(db);

  // 1. Create Demo Users
  const demoUsers: UserProfile[] = [
    {
      uid: 'demo-admin-id',
      name: 'Amit Sharma',
      email: 'amit.admin@demo.app',
      role: 'Admin',
      mobile: '9820012345',
      flat: 'A-101',
      floor: '1',
      building: 'Tower A',
      society: DEMO_SOCIETY,
      status: 'approved',
      isApproved: true,
      createdAt: Date.now()
    },
    {
      uid: 'demo-supervisor-id',
      name: 'Rajesh Patil',
      email: 'rajesh.super@demo.app',
      role: 'Supervisor',
      mobile: '9820054321',
      society: DEMO_SOCIETY,
      status: 'approved',
      isApproved: true,
      createdAt: Date.now()
    },
    {
      uid: 'demo-tech-id',
      name: 'Suresh Kumar',
      email: 'suresh.tech@demo.app',
      role: 'Technician',
      mobile: '9820099887',
      society: DEMO_SOCIETY,
      status: 'approved',
      isApproved: true,
      createdAt: Date.now()
    },
    {
      uid: 'demo-resident-id',
      name: 'Priya Verma',
      email: 'priya.res@demo.app',
      role: 'Resident',
      mobile: '9820011223',
      flat: 'C-505',
      floor: '5',
      building: 'Tower C',
      society: DEMO_SOCIETY,
      status: 'approved',
      isApproved: true,
      createdAt: Date.now()
    },
    {
      uid: 'demo-maid-id',
      name: 'Laxmi Bai',
      email: 'laxmi.maid@demo.app',
      role: 'Maid',
      mobile: '9820033445',
      flat: 'C-505',
      floor: '5',
      building: 'Tower C',
      society: DEMO_SOCIETY,
      status: 'approved',
      isApproved: true,
      ownerName: 'Priya Verma',
      ownerFlat: 'C-505',
      createdAt: Date.now()
    }
  ];

  demoUsers.forEach(user => {
    batch.set(doc(db, 'users', user.uid), user);
  });

  // 2. Create Sample Complaints
  const sampleComplaints: Omit<Complaint, 'id'>[] = [
    {
      complaintId: 'CMP-A123',
      title: 'Water Leakage in Bathroom',
      description: 'The ceiling is dripping water from the flat above.',
      locationType: 'flat',
      category: 'Plumbing',
      issue: 'Leakage',
      locationDetail: 'Master Bathroom',
      priority: 'High',
      status: 'in-progress',
      userId: 'demo-resident-id',
      userName: 'Priya Verma',
      userMobile: '9820011223',
      flat: 'C-505',
      building: 'Tower C',
      society: DEMO_SOCIETY,
      authorUid: 'demo-resident-id',
      authorName: 'Priya Verma',
      assignedToUid: 'demo-tech-id',
      assignedToName: 'Suresh Kumar',
      createdAt: Date.now() - 86400000, // 1 day ago
      updatedAt: Date.now() - 3600000, // 1 hour ago
      timeline: [
        { id: '1', title: 'Submitted', timestamp: Date.now() - 86400000, status: 'submitted' },
        { id: '2', title: 'Assigned to Suresh', timestamp: Date.now() - 80000000, status: 'assigned' }
      ]
    },
    {
      complaintId: 'CMP-B456',
      title: 'Elevator Not Working',
      description: 'Lift No. 2 is stuck on the 4th floor.',
      locationType: 'common',
      category: 'Electrical',
      issue: 'Lift Failure',
      locationDetail: 'Tower B Lobby',
      priority: 'High',
      status: 'pending',
      userId: 'demo-supervisor-id',
      userName: 'Rajesh Patil',
      userMobile: '9820054321',
      flat: 'B-202',
      building: 'Tower B',
      society: DEMO_SOCIETY,
      authorUid: 'demo-supervisor-id',
      authorName: 'Rajesh Patil',
      createdAt: Date.now() - 7200000, // 2 hours ago
      updatedAt: Date.now() - 7200000,
      timeline: [
        { id: '1', title: 'Submitted', timestamp: Date.now() - 7200000, status: 'submitted' }
      ]
    },
    {
      complaintId: 'CMP-C789',
      title: 'Garbage Not Collected',
      description: 'The trash bin outside the flat hasn\'t been cleared for 2 days.',
      locationType: 'flat',
      category: 'Cleaning',
      issue: 'Waste Management',
      locationDetail: 'Main Door',
      priority: 'Medium',
      status: 'resolved',
      userId: 'demo-maid-id',
      userName: 'Laxmi Bai',
      userMobile: '9820033445',
      flat: 'C-505',
      building: 'Tower C',
      society: DEMO_SOCIETY,
      authorUid: 'demo-maid-id',
      authorName: 'Laxmi Bai',
      createdAt: Date.now() - 172800000, // 2 days ago
      updatedAt: Date.now() - 43200000, // 12 hours ago
      timeline: [
        { id: '1', title: 'Submitted', timestamp: Date.now() - 172800000, status: 'submitted' },
        { id: '2', title: 'Resolved', timestamp: Date.now() - 43200000, status: 'resolved' }
      ]
    }
  ];

  sampleComplaints.forEach(complaint => {
    const newDoc = doc(collection(db, 'complaints'));
    batch.set(newDoc, complaint);
  });

  await batch.commit();
  console.log('Demo data seeded successfully.');
}
