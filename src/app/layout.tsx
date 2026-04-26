import type { Metadata } from 'next';
import '@/styles/globals.css';
import { AuthProvider } from '@/components/AuthContext';

export const metadata: Metadata = {
  title: 'NeedPulse — AI Field Intelligence for Community Impact',
  description: 'WhatsApp-first AI platform that transforms scattered field reports into coordinated community action. Powered by Gemini AI.',
  keywords: ['NeedPulse', 'AI', 'community', 'NGO', 'field intelligence', 'WhatsApp', 'Gemini'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
