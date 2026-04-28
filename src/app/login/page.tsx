'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import Link from 'next/link';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const { login, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    setIsSubmitting(true);
    try {
      await login(email, password);
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
          <div className={styles.brandIcon}>
            <img src="/logo.png" alt="NeedPulse Logo" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
          </div>
          <h1 className={styles.brandName}>NeedPulse</h1>
          <p className={styles.brandTagline}>Community Intelligence Platform</p>
        </div>

        <h2 className={styles.authTitle}>Welcome Back</h2>

        {/* Error */}
        {error && <div className={styles.errorMsg}>{error}</div>}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="login-email" className={styles.formLabel}>Email</label>
            <input
              id="login-email"
              type="email"
              className={styles.formInput}
              placeholder="you@organization.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="login-password" className={styles.formLabel}>Password</label>
            <input
              id="login-password"
              type="password"
              className={styles.formInput}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
            {isSubmitting && <span className={styles.spinner} />}
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className={styles.switchLink}>
          Don&apos;t have an account? <Link href="/signup">Sign up</Link>
        </p>

        <div className={styles.demoNotice}>
          🎯 GDG Solution Challenge Demo — use any email to explore
        </div>
      </div>
    </div>
  );
}
