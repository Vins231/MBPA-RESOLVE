export type ViewId = 'home' | 'submit' | 'track' | 'complaints' | 'approvals' | 'residents';

export type UserRole = 'Admin' | 'Supervisor' | 'Technician' | 'Resident' | 'Maid';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  mobile: string;
  flat?: string;
  floor?: string;
  building?: string;
  society: string;
  status: 'pending' | 'approved' | 'rejected';
  isApproved: boolean;
  approvedAt?: number;
  approvedBy?: string;
  referenceCode?: string;
  ownerName?: string;
  ownerFlat?: string;
  refCode?: string;
  createdAt: number;
}

export type ComplaintStatus = 'pending' | 'in-progress' | 'resolved';
export type ComplaintPriority = 'High' | 'Medium' | 'Low';
export type ComplaintLocationType = 'flat' | 'common';

export interface Complaint {
  id: string;
  complaintId: string;
  title: string;
  description: string;
  locationType: ComplaintLocationType;
  category: string;
  issue: string;
  locationDetail: string;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  userId: string;
  userName: string;
  userMobile: string;
  flat: string;
  building: string;
  society: string;
  authorUid: string;
  authorName: string;
  assignedToUid?: string;
  assignedToName?: string;
  assignedTo?: string;
  estimatedResolution?: number;
  createdAt: number;
  updatedAt: number;
  timeline?: TimelineEvent[];
  updates?: { id: string; message: string; timestamp: number; user: string }[];
  officerNote?: string;
  feedback?: {
    rating: number;
    comment?: string;
    createdAt: number;
  };
}

export interface TimelineEvent {
  id: string;
  title: string;
  timestamp: number;
  description?: string;
  status: ComplaintStatus | 'submitted' | 'assigned';
}

export interface Resident {
  id: string;
  name: string;
  flat: string;
  floor: string;
  building: string;
  society: string;
  mobile: string;
  createdAt: number;
}
