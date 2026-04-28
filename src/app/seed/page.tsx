'use client';

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

const SAMPLE_VOLUNTEERS = [
  {
    name: 'Rapid Response Team Alpha',
    phone: '+91 99999 11111',
    email: 'info@rapidresponse.org.in',
    organization: 'Rapid Response India',
    skills: ['search-and-rescue', 'medical', 'logistics'],
    availability: 'available',
    location: { lat: 13.0827, lng: 80.2707 }, // Chennai (HQ)
    locationName: 'Chennai, India',
    radius: 500,
    activeAssignments: 2,
    totalCompleted: 840,
    rating: 4.9,
    registeredAt: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000).toISOString(),
    lastActiveAt: new Date().toISOString(),
  },
  {
    name: 'Goonj Relief Hub',
    phone: '+91 11 26972351',
    email: 'mail@goonj.org',
    organization: 'Goonj',
    skills: ['logistics', 'clothing', 'sanitation'],
    availability: 'available',
    location: { lat: 28.5355, lng: 77.2639 }, // Delhi (HQ)
    locationName: 'New Delhi, India',
    radius: 1000,
    activeAssignments: 5,
    totalCompleted: 1250,
    rating: 5.0,
    registeredAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
    lastActiveAt: new Date().toISOString(),
  },
  {
    name: 'DFY Medical Camp Unit',
    phone: '+91 90290 13444',
    email: 'info@doctorsforyou.org',
    organization: 'Doctors For You (DFY)',
    skills: ['medical', 'surgery', 'pediatrics'],
    availability: 'busy',
    location: { lat: 19.0441, lng: 72.9197 }, // Mumbai
    locationName: 'Mumbai, India',
    radius: 300,
    activeAssignments: 3,
    totalCompleted: 560,
    rating: 4.8,
    registeredAt: new Date(Date.now() - 250 * 24 * 60 * 60 * 1000).toISOString(),
    lastActiveAt: new Date().toISOString(),
  },
  {
    name: 'SEEDS Task Force',
    phone: '+91 11 26174272',
    email: 'info@seedsindia.org',
    organization: 'SEEDS India',
    skills: ['construction', 'shelter', 'sanitation'],
    availability: 'available',
    location: { lat: 28.5677, lng: 77.1723 }, // Delhi
    locationName: 'Delhi NCR, India',
    radius: 400,
    activeAssignments: 1,
    totalCompleted: 730,
    rating: 4.9,
    registeredAt: new Date(Date.now() - 350 * 24 * 60 * 60 * 1000).toISOString(),
    lastActiveAt: new Date().toISOString(),
  },
  {
    name: 'Khalsa Aid Panjab',
    phone: '+91 98150 12345',
    email: 'india@khalsaaid.org',
    organization: 'Khalsa Aid India',
    skills: ['cooking', 'logistics', 'search-and-rescue'],
    availability: 'available',
    location: { lat: 30.3165, lng: 76.3820 }, // Patiala
    locationName: 'Patiala, Punjab',
    radius: 800,
    activeAssignments: 4,
    totalCompleted: 2100,
    rating: 5.0,
    registeredAt: new Date(Date.now() - 500 * 24 * 60 * 60 * 1000).toISOString(),
    lastActiveAt: new Date().toISOString(),
  },
  {
    name: 'Oxfam WASH Team',
    phone: '+91 11 4653 8000',
    email: 'delhi@oxfamindia.org',
    organization: 'Oxfam India',
    skills: ['sanitation', 'medical', 'teaching'],
    availability: 'offline',
    location: { lat: 28.5355, lng: 77.2639 },
    locationName: 'New Delhi, India',
    radius: 600,
    activeAssignments: 0,
    totalCompleted: 950,
    rating: 4.7,
    registeredAt: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString(),
    lastActiveAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  }
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
