'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import Link from 'next/link';
import type { UserRole } from '@/lib/types';
import styles from '../login/login.module.css';

export default function SignupPage() {
  const router = useRouter();
  const { signup, error, clearError } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('volunteer');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    setIsSubmitting(true);
    try {
      await signup(email, password, name, role);
      router.push('/dashboard');
    } catch {
      /* error handled by context */
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.authPage}>
      <div className={styles.authCard}>
        {/* Brand */}
        <div className={styles.brandSection}>
          <div className={styles.brandLogo}>⚡</div>
          <h1 className={styles.brandName}>NeedPulse</h1>
          <p className={styles.brandTagline}>Join the Network</p>
        </div>

        <h2 className={styles.authTitle}>Create Account</h2>

        {/* Error */}
        {error && <div className={styles.errorMsg}>{error}</div>}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="signup-name" className={styles.formLabel}>Full Name</label>
            <input
              id="signup-name"
              type="text"
              className={styles.formInput}
              placeholder="Your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="signup-email" className={styles.formLabel}>Email</label>
            <input
              id="signup-email"
              type="email"
              className={styles.formInput}
              placeholder="you@organization.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="signup-password" className={styles.formLabel}>Password</label>
            <input
              id="signup-password"
              type="password"
              className={styles.formInput}
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {/* Role Selector */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>I am a</label>
            <div className={styles.roleSelector}>
              <button
                type="button"
                className={`${styles.roleBtn} ${role === 'volunteer' ? styles.roleBtnActive : ''}`}
                onClick={() => setRole('volunteer')}
              >
                🤝 Volunteer
              </button>
              <button
                type="button"
                className={`${styles.roleBtn} ${role === 'admin' ? styles.roleBtnActive : ''}`}
                onClick={() => setRole('admin')}
              >
                🛡️ Admin
              </button>
            </div>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
            {isSubmitting && <span className={styles.spinner} />}
            {isSubmitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className={styles.switchLink}>
          Already have an account? <Link href="/login">Sign in</Link>
        </p>

        <div className={styles.demoNotice}>
          🎯 GDG Solution Challenge Demo — use any email to explore
        </div>
      </div>
    </div>
  );
}
