'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar/Sidebar';
import './dashboard-layout.css';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (!mounted || loading) {
    return null;
  }

  if (!user) return null;

  return (
    <div className="dashboard-layout" suppressHydrationWarning>
      <Sidebar />
      <main className="dashboard-main" suppressHydrationWarning>
        <div className="dashboard-content" suppressHydrationWarning>
          {children}
        </div>
      </main>
    </div>
  );
}
