/* ============================================
   NeedPulse — Authentication Utilities
   Firebase Auth with localStorage demo fallback
   ============================================ */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  User,
} from 'firebase/auth';
import { auth } from './firebase';
import type { AppUser, UserRole } from './types';

const STORAGE_KEY = 'needpulse_user';

/* ---------- Firebase Auth Functions ---------- */

export async function signUpWithEmail(
  email: string,
  password: string,
  name: string,
  role: UserRole
): Promise<AppUser> {
  /* Try Firebase Auth first */
  if (auth) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      const appUser: AppUser = {
        uid: cred.user.uid,
        email: cred.user.email || email,
        name,
        role,
      };
      /* Store role in localStorage (Firestore user-roles collection would be better in production) */
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appUser));
      return appUser;
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      /* If Firebase Auth method not enabled, fall back to demo mode */
      if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/configuration-not-found') {
        console.warn('⚠️ Firebase Auth not enabled — using demo mode');
        return createDemoUser(email, name, role);
      }
      throw error;
    }
  }

  /* Fallback: demo mode (no Firebase) */
  return createDemoUser(email, name, role);
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<AppUser> {
  if (auth) {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const stored = localStorage.getItem(STORAGE_KEY);
      const storedUser = stored ? JSON.parse(stored) : null;
      const appUser: AppUser = {
        uid: cred.user.uid,
        email: cred.user.email || email,
        name: cred.user.displayName || email.split('@')[0],
        role: storedUser?.role || 'volunteer',
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appUser));
      return appUser;
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/configuration-not-found') {
        console.warn('⚠️ Firebase Auth not enabled — using demo mode');
        return loginDemoUser(email);
      }
      throw error;
    }
  }

  return loginDemoUser(email);
}

export async function signOutUser(): Promise<void> {
  if (auth) {
    try {
      await firebaseSignOut(auth);
    } catch {
      /* ignore */
    }
  }
  localStorage.removeItem(STORAGE_KEY);
}

export function getCurrentUser(): AppUser | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as AppUser;
  } catch {
    return null;
  }
}

export function onAuthChange(callback: (user: AppUser | null) => void): () => void {
  if (auth) {
    return onAuthStateChanged(auth, (firebaseUser: User | null) => {
      if (firebaseUser) {
        const stored = localStorage.getItem(STORAGE_KEY);
        const storedUser = stored ? JSON.parse(stored) : null;
        callback({
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || 'User',
          role: storedUser?.role || 'volunteer',
        });
      } else {
        /* Check localStorage for demo user */
        const demoUser = getCurrentUser();
        callback(demoUser);
      }
    });
  }

  /* No Firebase — just return current demo user */
  const demoUser = getCurrentUser();
  callback(demoUser);
  return () => {};
}

/* ---------- Demo Mode Helpers ---------- */

function createDemoUser(email: string, name: string, role: UserRole): AppUser {
  const appUser: AppUser = {
    uid: `demo_${Date.now()}`,
    email,
    name,
    role,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appUser));
  return appUser;
}

function loginDemoUser(email: string): AppUser {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const user = JSON.parse(stored) as AppUser;
    if (user.email === email) return user;
  }
  /* Create a new demo user if no match */
  return createDemoUser(email, email.split('@')[0], 'volunteer');
}

/* ---------- Error Message Helper ---------- */
export function getAuthErrorMessage(error: unknown): string {
  const err = error as { code?: string; message?: string };
  switch (err.code) {
    case 'auth/email-already-in-use': return 'This email is already registered. Try logging in.';
    case 'auth/invalid-email': return 'Please enter a valid email address.';
    case 'auth/weak-password': return 'Password must be at least 6 characters.';
    case 'auth/user-not-found': return 'No account found with this email.';
    case 'auth/wrong-password': return 'Incorrect password. Please try again.';
    case 'auth/invalid-credential': return 'Invalid credentials. Please check your email and password.';
    case 'auth/too-many-requests': return 'Too many attempts. Please wait and try again.';
    default: return err.message || 'An unexpected error occurred.';
  }
}
