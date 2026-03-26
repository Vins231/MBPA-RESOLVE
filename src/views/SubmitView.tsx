import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, 
  Building2, 
  ChevronRight, 
  ChevronLeft, 
  Check,
  Upload,
  Search
} from 'lucide-react';
import { cn } from '../lib/utils';
import { ComplaintLocationType, ComplaintPriority, UserProfile, Complaint, ViewId } from '../types';
import { db, collection, addDoc } from '../firebase';

const ISSUES = {
  flat: {
    electrical: { label: '⚡ Electrical', items: ['Power failure', 'Switch/socket issue', 'Meter problem', 'Wiring issue', 'MCB tripping', 'Earthing problem'] },
    civil: { label: '🧱 Civil', items: ['Wall cracks', 'Plaster damage', 'Seepage in flat', 'Door/window damage', 'Tile breakage', 'False ceiling'] },
    water: { label: '💧 Water', items: ['No water supply', 'Low pressure in tap', 'Pipeline leakage', 'Discoloured water', 'Water heater issue', 'Flush problem'] }
  },
  common: {
    electrical: { label: '⚡ Electrical', items: ['Corridor light out', 'Lift power failure', 'Parking light out', 'Common MCB trip', 'Wiring exposed', 'Pump room issue'] },
    civil: { label: '🧱 Civil', items: ['Staircase seepage', 'Compound wall crack', 'Terrace leakage', 'Parking damage', 'Flooring issue', 'Boundary wall'] },
    water: { label: '💧 Water', items: ['No building water', 'Overhead tank leak', 'Pump motor failure', 'Low building pressure', 'Dirty common pipes', 'Common tap leakage'] }
  }
};

interface SubmitViewProps {
  user: UserProfile;
  onNavigate: (view: ViewId) => void;
}

export default function SubmitView({ user, onNavigate }: SubmitViewProps) {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  
  const [locationType, setLocationType] = useState<ComplaintLocationType | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [issue, setIssue] = useState<string | null>(null);
  const [otherIssue, setOtherIssue] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationDetail, setLocationDetail] = useState('');
  const [priority, setPriority] = useState<ComplaintPriority>('Medium');

  const steps = [
    { label: 'Location Type' },
    { label: 'Category' },
    { label: 'Details' },
    { label: 'Submit' }
  ];

  const handleNext = () => {
    if (step === 0 && !locationType) return;
    if (step === 1 && !category) return;
    if (step === 2 && !title) return;
    setStep(s => s + 1);
  };

  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    if (!user || !locationType || !category || !title) return;
    
    setIsSubmitting(true);
    const complaintId = `CMP-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const complaintData: Omit<Complaint, 'id'> = {
      complaintId,
      title,
      description,
      locationType: locationType!,
      category: category!,
      issue: issue || otherIssue,
      locationDetail,
      priority,
      status: 'pending',
      userId: user.uid,
      userName: user.name,
      userMobile: user.mobile,
      flat: user.flat,
      building: user.building,
      society: user.society,
      authorUid: user.uid,
      authorName: user.name,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    try {
      const docRef = await addDoc(collection(db, 'complaints'), complaintData);
      
      // Add initial timeline event
      await addDoc(collection(db, `complaints/${docRef.id}/timeline`), {
        title: 'Complaint Submitted',
        description: 'Your complaint has been successfully registered.',
        status: 'submitted',
        timestamp: Date.now()
      });

      setSubmittedId(complaintId);
      setStep(4); // Success step
    } catch (error) {
      console.error("Submission failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 4) {
    return (
      <div className="max-w-md mx-auto py-12">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-r-lg shadow-2xl text-center space-y-6 border border-border"
        >
          <div className="w-20 h-20 bg-brand-light/10 text-brand rounded-full flex items-center justify-center mx-auto">
            <Check size={40} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-display font-bold text-ink">Complaint Submitted!</h2>
            <p className="text-ink3 text-sm leading-relaxed">
              Your complaint has been registered successfully. Our team will review it shortly.
            </p>
          </div>
          <div className="bg-surface2 p-4 rounded-r-sm space-y-1">
            <div className="text-[10px] uppercase tracking-wider font-bold text-ink3">Complaint ID</div>
            <div className="text-xl font-mono font-bold text-brand">{submittedId}</div>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <button 
              onClick={() => onNavigate('track')}
              className="w-full bg-brand text-white py-4 rounded-r-sm font-bold text-sm hover:bg-brand-mid transition-all flex items-center justify-center gap-2"
            >
              <Search size={18} />
              Track Status
            </button>
            <button 
              onClick={() => onNavigate('home')}
              className="w-full bg-surface2 text-ink py-4 rounded-r-sm font-bold text-sm hover:bg-border transition-all"
            >
              Back to Dashboard
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Step Progress */}
      <div className="flex items-center justify-between mb-12 relative">
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border -translate-y-1/2 z-0" />
        {steps.map((s, i) => (
          <div key={s.label} className="relative z-10 flex flex-col items-center group">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all border-2",
              i < step ? "bg-brand border-brand text-white" : 
              i === step ? "bg-brand-light border-brand-light text-brand" : 
              "bg-white border-border text-ink3"
            )}>
              {i < step ? <Check size={18} /> : i + 1}
            </div>
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-wider mt-2 transition-colors",
              i <= step ? "text-brand" : "text-ink3"
            )}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-r-lg border border-border p-8 shadow-sm"
        >
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-display font-bold text-ink mb-2">Where is the issue located?</h3>
                <p className="text-sm text-ink3">Select whether the problem is inside your flat or in a common area.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setLocationType('flat')}
                  className={cn(
                    "flex flex-col items-start p-6 rounded-r-md border-2 transition-all text-left group",
                    locationType === 'flat' ? "border-brand bg-brand/5" : "border-border hover:border-brand-mid bg-surface2"
                  )}
                >
                  <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
                    <Home className="text-brand w-6 h-6" />
                  </div>
                  <div className="font-display font-bold text-ink mb-1">Flat-Specific Issue</div>
                  <div className="text-xs text-ink3 leading-relaxed">Problem inside your own flat — electrical, plumbing, civil within your unit</div>
                </button>
                <button
                  onClick={() => setLocationType('common')}
                  className={cn(
                    "flex flex-col items-start p-6 rounded-r-md border-2 transition-all text-left group",
                    locationType === 'common' ? "border-brand bg-brand/5" : "border-border hover:border-brand-mid bg-surface2"
                  )}
                >
                  <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
                    <Building2 className="text-brand w-6 h-6" />
                  </div>
                  <div className="font-display font-bold text-ink mb-1">Common Area Issue</div>
                  <div className="text-xs text-ink3 leading-relaxed">Staircase, lift, lobby, parking, terrace, compound — outside your flat</div>
                </button>
              </div>
            </div>
          )}

          {step === 1 && locationType && (
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-display font-bold text-ink mb-2">Select Category & Issue</h3>
                <p className="text-sm text-ink3">Choose the category that best describes the problem.</p>
              </div>
              
              <div className="space-y-4">
                <div className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Category</div>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(ISSUES[locationType]).map(([key, cat]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setCategory(key);
                        setIssue(null);
                      }}
                      className={cn(
                        "px-6 py-2.5 rounded-full text-sm font-bold border-2 transition-all",
                        category === key ? "bg-brand border-brand text-white" : "bg-surface2 border-border text-ink2 hover:border-brand-mid"
                      )}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {category && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-4"
                >
                  <div className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Common Issues</div>
                  <div className="flex flex-wrap gap-2">
                    {(ISSUES[locationType] as any)[category].items.map((item: string) => (
                      <button
                        key={item}
                        onClick={() => setIssue(item)}
                        className={cn(
                          "px-4 py-2 rounded-full text-xs font-medium border transition-all",
                          issue === item ? "bg-brand-light/10 border-brand text-brand font-bold" : "bg-surface2 border-border text-ink2 hover:border-brand-light"
                        )}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Other / Specific Detail</label>
                <input 
                  type="text" 
                  value={otherIssue}
                  onChange={(e) => setOtherIssue(e.target.value)}
                  placeholder="Describe if not listed above..."
                  className="w-full bg-surface2 border border-border rounded-r-sm p-3 text-sm focus:border-brand-light outline-none transition-colors"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-display font-bold text-ink mb-2">Complaint Details</h3>
                <p className="text-sm text-ink3">Provide more information to help us resolve the issue faster.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Complaint Title *</label>
                  <input 
                    type="text" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Brief summary of the issue"
                    className="w-full bg-surface2 border border-border rounded-r-sm p-3 text-sm focus:border-brand-light outline-none transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Full Description *</label>
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="When did it start? What is the impact? Exact location in building..."
                    className="w-full bg-surface2 border border-border rounded-r-sm p-3 text-sm focus:border-brand-light outline-none transition-colors h-32 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Flat / Location</label>
                    <input 
                      type="text" 
                      value={locationDetail}
                      onChange={(e) => setLocationDetail(e.target.value)}
                      placeholder="e.g. Flat 302, 3rd Floor"
                      className="w-full bg-surface2 border border-border rounded-r-sm p-3 text-sm focus:border-brand-light outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Priority</label>
                    <select 
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as ComplaintPriority)}
                      className="w-full bg-surface2 border border-border rounded-r-sm p-3 text-sm focus:border-brand-light outline-none transition-colors"
                    >
                      <option value="High">🔴 High — Urgent</option>
                      <option value="Medium">🟡 Medium — Normal</option>
                      <option value="Low">🟢 Low — Minor</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Attach Photo / Video</label>
                  <div className="border-2 border-dashed border-border rounded-r-md p-8 text-center bg-surface2 hover:border-brand-light transition-colors cursor-pointer group">
                    <Upload className="mx-auto text-ink3 mb-2 group-hover:text-brand transition-colors" size={32} />
                    <p className="text-sm font-medium text-ink2">Click to upload or drag & drop</p>
                    <p className="text-[10px] text-ink3 mt-1">JPG, PNG, MP4 up to 20MB</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-display font-bold text-ink mb-2">Review & Submit</h3>
                <p className="text-sm text-ink3">Please review your complaint before submitting.</p>
              </div>

              <div className="bg-surface2 rounded-r-md p-6 space-y-4 border border-border">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Location</div>
                    <div className="text-sm font-semibold text-ink">{locationType === 'flat' ? '🏠 Flat-Specific' : '🏢 Common Area'}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Category</div>
                    <div className="text-sm font-semibold text-ink">{category ? (ISSUES[locationType!] as any)[category].label : '—'}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Issue</div>
                    <div className="text-sm font-semibold text-ink">{issue || otherIssue || '—'}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Priority</div>
                    <div className="text-sm font-semibold text-ink">{priority}</div>
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <div className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Title</div>
                    <div className="text-sm font-semibold text-ink">{title}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-12 flex items-center justify-between pt-8 border-t border-border">
            {step > 0 ? (
              <button 
                onClick={handleBack}
                className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-ink2 hover:text-brand transition-colors"
              >
                <ChevronLeft size={18} />
                Back
              </button>
            ) : <div />}

            {step < 3 ? (
              <button 
                onClick={handleNext}
                disabled={(step === 0 && !locationType) || (step === 1 && !category) || (step === 2 && !title)}
                className="flex items-center gap-2 px-8 py-3 bg-brand text-white rounded-r-sm text-sm font-bold hover:bg-brand-mid transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight size={18} />
              </button>
            ) : (
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-10 py-3 bg-brand-light text-brand rounded-r-sm text-sm font-bold hover:bg-brand-light/90 transition-all shadow-lg shadow-brand-light/20 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check size={18} />
                )}
                {isSubmitting ? 'Submitting...' : 'Submit Complaint'}
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
