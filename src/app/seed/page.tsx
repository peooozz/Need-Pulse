'use client';

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

const SAMPLE_VOLUNTEERS = [
  {
    name: 'Dr. Ramesh Patel',
    phone: '+91 98765 43210',
    email: 'ramesh.patel@example.com',
    organization: 'Red Cross India',
    skills: ['medical'],
    availability: 'available',
    location: { lat: 28.6139, lng: 77.2090 }, // Delhi
    locationName: 'New Delhi, India',
    radius: 50,
    activeAssignments: 1,
    totalCompleted: 142,
    rating: 4.9,
    registeredAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  },
  {
    name: 'Priya Sharma',
    phone: '+91 87654 32109',
    email: 'priya.s@example.com',
    skills: ['logistics', 'cooking'],
    availability: 'available',
    location: { lat: 19.0760, lng: 72.8777 }, // Mumbai
    locationName: 'Mumbai, India',
    radius: 30,
    activeAssignments: 0,
    totalCompleted: 45,
    rating: 4.7,
    registeredAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  },
  {
    name: 'Arjun Kumar',
    phone: '+91 76543 21098',
    email: 'arjun.builds@example.com',
    organization: 'Habitat for Humanity',
    skills: ['construction', 'logistics'],
    availability: 'busy',
    location: { lat: 13.0827, lng: 80.2707 }, // Chennai
    locationName: 'Chennai, India',
    radius: 100,
    activeAssignments: 2,
    totalCompleted: 89,
    rating: 4.8,
    registeredAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  },
];

const SAMPLE_NEEDS = [
  {
    rawMessage: 'Need medical assistance urgently for 5 people injured in the flood.',
    rawLanguage: 'en',
    translatedMessage: 'Need medical assistance urgently for 5 people injured in the flood.',
    category: 'medical',
    subcategory: 'injury',
    urgency: 9,
    sentiment: 'desperate',
    peopleAffected: 5,
    location: { lat: 28.7041, lng: 77.1025 },
    locationName: 'Delhi NCR',
    mediaUrls: [],
    reporterPhone: '+91 99999 88888',
    reporterName: 'Rahul',
    status: 'new',
    assignedVolunteerId: null,
    aiConfidence: 0.95,
  },
  {
    rawMessage: 'We need clean drinking water for 50 families. The main supply is broken.',
    rawLanguage: 'en',
    translatedMessage: 'We need clean drinking water for 50 families. The main supply is broken.',
    category: 'water',
    subcategory: 'drinking water',
    urgency: 7,
    sentiment: 'urgent',
    peopleAffected: 200,
    location: { lat: 19.1000, lng: 72.9000 },
    locationName: 'Navi Mumbai',
    mediaUrls: [],
    reporterPhone: '+91 88888 77777',
    reporterName: 'Anita',
    status: 'new',
    assignedVolunteerId: null,
    aiConfidence: 0.92,
  }
];

import { useAuth } from '@/components/AuthContext';

export default function SeedPage() {
  const [status, setStatus] = useState('Idle');
  const { user } = useAuth();
  
  const handleSeed = async () => {
    if (!db) {
      setStatus('Error: Firebase DB not initialized');
      return;
    }
    
    setStatus('Seeding Volunteers...');
    try {
      const volIds = [];
      for (const vol of SAMPLE_VOLUNTEERS) {
        const ref = await addDoc(collection(db, 'volunteers'), vol);
        volIds.push(ref.id);
      }
      
      setStatus('Seeding Needs & Assignments...');
      const needIds = [];
      let i = 0;
      for (const need of SAMPLE_NEEDS) {
        const needRef = await addDoc(collection(db, 'needs'), {
          ...need,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        needIds.push(needRef.id);

        // Create an assignment for the logged-in user if available
        if (user && i === 0) {
          await addDoc(collection(db, 'assignments'), {
            needId: needRef.id,
            volunteerId: user.uid,
            status: 'dispatched',
            matchScore: 0.95,
            matchReason: 'Excellent skill match and proximity',
            dispatchedAt: Timestamp.now().toDate().toISOString(),
            acceptedAt: null,
            completedAt: null,
            feedback: null
          });
        }
        i++;
      }
      
      setStatus(`Success! Added ${volIds.length} Volunteers and ${needIds.length} Needs. Created 1 demo assignment for you.`);
    } catch (err: any) {
      console.error(err);
      setStatus(`Error: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1>Database Seeder</h1>
      <p>Click the button below to inject realistic volunteers and needs into Firestore.</p>
      <button 
        onClick={handleSeed}
        style={{ padding: '10px 20px', background: '#0077b6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
      >
        Run Seeder
      </button>
      <div style={{ marginTop: '20px', padding: '15px', background: '#f1f5f9', borderRadius: '4px' }}>
        <strong>Status:</strong> {status}
      </div>
    </div>
  );
}
