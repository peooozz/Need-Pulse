import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  where,
  Timestamp,
  Firestore,
} from 'firebase/firestore';
import {
  getAuth,
  Auth,
} from 'firebase/auth';
import type { Need, Volunteer, Assignment } from './types';

/* ---------- Firebase Config ---------- */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/* ---------- Check if Firebase is configured ---------- */
export function isFirebaseConfigured(): boolean {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.apiKey.length > 0 &&
    firebaseConfig.projectId.length > 0
  );
}

/* ---------- Initialize Firebase (only if configured) ---------- */
let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

if (isFirebaseConfigured()) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    db = getFirestore(app);
    auth = getAuth(app);
    console.log('✅ Firebase initialized successfully (Firestore + Auth)');
  } catch (error) {
    console.warn('⚠️ Firebase initialization failed:', error);
    app = null;
    db = null;
    auth = null;
  }
} else {
  console.log('ℹ️ Firebase not configured — using mock data fallback');
}

export { app, db, auth };

/* ---------- Collection References ---------- */
const COLLECTIONS = {
  needs: 'needs',
  volunteers: 'volunteers',
  assignments: 'assignments',
} as const;

/* ---------- Firestore Helper Functions ---------- */

/** Add a new need to Firestore */
export async function addNeed(need: Omit<Need, 'id' | 'createdAt' | 'updatedAt'>): Promise<string | null> {
  if (!db) return null;
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.needs), {
      ...need,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding need:', error);
    return null;
  }
}

/** Update a need's status and assignment */
export async function updateNeedStatus(
  needId: string,
  status: Need['status'],
  volunteerId?: string
): Promise<boolean> {
  if (!db) return false;
  try {
    const needRef = doc(db, COLLECTIONS.needs, needId);
    await updateDoc(needRef, {
      status,
      ...(volunteerId && { assignedVolunteerId: volunteerId }),
      updatedAt: Timestamp.now(),
    });
    return true;
  } catch (error) {
    console.error('Error updating need:', error);
    return false;
  }
}

/** Add an assignment */
export async function addAssignment(assignment: Omit<Assignment, 'id'>): Promise<string | null> {
  if (!db) return null;
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.assignments), {
      ...assignment,
      dispatchedAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding assignment:', error);
    return null;
  }
}

/** Get all needs (ordered by creation time) */
export async function getNeeds(): Promise<Need[]> {
  if (!db) return [];
  try {
    const q = query(collection(db, COLLECTIONS.needs), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Need));
  } catch (error) {
    console.error('Error fetching needs:', error);
    return [];
  }
}

/** Get available volunteers */
export async function getAvailableVolunteers(): Promise<Volunteer[]> {
  if (!db) return [];
  try {
    const q = query(
      collection(db, COLLECTIONS.volunteers),
      where('availability', '==', 'available')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Volunteer));
  } catch (error) {
    console.error('Error fetching volunteers:', error);
    return [];
  }
}

/** Subscribe to real-time need updates */
export function subscribeToNeeds(
  callback: (needs: Need[]) => void,
  onError?: (error: Error) => void
): (() => void) | null {
  if (!db) return null;
  try {
    const q = query(collection(db, COLLECTIONS.needs), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const needs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Need));
      callback(needs);
    }, (error) => {
      console.error('Needs snapshot error:', error);
      if (onError) onError(error);
    });
  } catch (error) {
    console.error('Error subscribing to needs:', error);
    if (onError && error instanceof Error) onError(error);
    return null;
  }
}

/** Subscribe to real-time volunteer updates */
export function subscribeToVolunteers(
  callback: (volunteers: Volunteer[]) => void,
  onError?: (error: Error) => void
): (() => void) | null {
  if (!db) return null;
  try {
    const q = query(collection(db, COLLECTIONS.volunteers));
    return onSnapshot(q, (snapshot) => {
      const vols = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Volunteer));
      callback(vols);
    }, (error) => {
      console.error('Volunteers snapshot error:', error);
      if (onError) onError(error);
    });
  } catch (error) {
    console.error('Error subscribing to volunteers:', error);
    if (onError && error instanceof Error) onError(error);
    return null;
  }
}

/** Get all volunteers */
export async function getVolunteers(): Promise<Volunteer[]> {
  if (!db) return [];
  try {
    const q = query(collection(db, COLLECTIONS.volunteers));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Volunteer));
  } catch (error) {
    console.error('Error fetching volunteers:', error);
    return [];
  }
}
