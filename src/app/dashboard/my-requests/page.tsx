'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';
import { subscribeToAssignments, subscribeToNeeds, updateAssignmentStatus, updateNeedStatus } from '@/lib/firebase';
import type { Assignment, Need } from '@/lib/types';
import { CATEGORY_CONFIG, URGENCY_CONFIG } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';
import styles from './requests.module.css';

export default function MyRequestsPage() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [needs, setNeeds] = useState<Need[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    // In demo, we just use the user UID. Since user might not be in the 'volunteers' collection explicitly 
    // for this demo context, we'll assume user.uid is the volunteerId used when creating assignments.
    const unsubAssignments = subscribeToAssignments(user.uid, (data) => {
      setAssignments(data);
    });

    const unsubNeeds = subscribeToNeeds((data) => {
      setNeeds(data);
      setLoading(false);
    });

    return () => {
      if (unsubAssignments) unsubAssignments();
      if (unsubNeeds) unsubNeeds();
    };
  }, [user]);

  const handleAccept = async (assignment: Assignment) => {
    await updateAssignmentStatus(assignment.id, 'accepted', { acceptedAt: Timestamp.now().toDate().toISOString() } as any);
    await updateNeedStatus(assignment.needId, 'in_progress', user?.uid);
  };

  const handleDecline = async (assignment: Assignment) => {
    await updateAssignmentStatus(assignment.id, 'declined');
    // If the need was assigned to this user, unassign it. For safety, just set to 'new'.
    await updateNeedStatus(assignment.needId, 'new', null as any);
  };

  const handleComplete = async (assignment: Assignment) => {
    await updateAssignmentStatus(assignment.id, 'completed', { completedAt: Timestamp.now().toDate().toISOString() } as any);
    await updateNeedStatus(assignment.needId, 'resolved', user?.uid);
  };

  if (loading) return <div style={{ padding: 40, color: '#0077b6' }}>Loading requests...</div>;

  const combinedData = assignments.map(a => ({
    assignment: a,
    need: needs.find(n => n.id === a.needId)
  })).filter(data => data.need); // Only show if need exists

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>My Requests</h1>
        <p className={styles.subtitle}>Review and manage incoming community needs assigned to you.</p>
      </header>

      {combinedData.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📬</div>
          <h3>No incoming requests</h3>
          <p>You have not been dispatched to any needs yet.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {combinedData.map(({ assignment, need }) => {
            const catInfo = CATEGORY_CONFIG[need!.category] || CATEGORY_CONFIG.other;
            const urgencyClass = URGENCY_CONFIG.getCssClass(need!.urgency);
            const isPending = assignment.status === 'dispatched';
            
            return (
              <div key={assignment.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.category}>
                    <span>{catInfo.emoji}</span>
                    <span>{catInfo.label}</span>
                  </div>
                  <div className={`${styles.urgencyBadge} ${styles[urgencyClass]}`}>
                    {need!.urgency}/10 Urgency
                  </div>
                </div>

                <div className={styles.message}>
                  {need!.translatedMessage || need!.rawMessage}
                </div>

                <div className={styles.meta}>
                  <div className={styles.metaRow}>
                    <span>📍</span> <span>{need!.locationName}</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span>👥</span> <span>{need!.peopleAffected} affected</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span>⏰</span> <span>Dispatched: {new Date(assignment.dispatchedAt).toLocaleTimeString()}</span>
                  </div>
                  {assignment.matchReason && (
                    <div className={styles.metaRow}>
                      <span>🤖</span> <span>AI Match: {assignment.matchReason} ({Math.round(assignment.matchScore * 100)}%)</span>
                    </div>
                  )}
                </div>

                {isPending ? (
                  <div className={styles.actions}>
                    <button onClick={() => handleDecline(assignment)} className={`${styles.btn} ${styles.btnReject}`}>
                      Decline
                    </button>
                    <button onClick={() => handleAccept(assignment)} className={`${styles.btn} ${styles.btnAccept}`}>
                      Accept & Go
                    </button>
                  </div>
                ) : (
                  <div className={`${styles.statusBanner} ${styles['status' + assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)]}`}>
                    Status: {assignment.status.toUpperCase()}
                    {assignment.status === 'accepted' && (
                       <div style={{ marginTop: '10px' }}>
                         <button onClick={() => handleComplete(assignment)} className={`${styles.btn} ${styles.btnAccept}`} style={{ width: '100%'}}>
                            Mark as Completed
                         </button>
                       </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
