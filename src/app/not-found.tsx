export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0d0015',
      color: '#f9fafb',
      fontFamily: 'Inter, system-ui, sans-serif',
      textAlign: 'center',
      gap: '16px',
    }}>
      <div style={{ fontSize: '64px' }}>🔍</div>
      <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Page Not Found</h1>
      <p style={{ color: '#9ca3af', maxWidth: '400px' }}>
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <a
        href="/"
        style={{
          marginTop: '16px',
          padding: '12px 24px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #0077b6, #023e8a)',
          color: 'white',
          fontWeight: 700,
          textDecoration: 'none',
          fontSize: '0.875rem',
        }}
      >
        ← Back to Home
      </a>
    </div>
  );
}
