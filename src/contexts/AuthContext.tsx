'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<boolean>;
  signInWithEmail: (email: string, password: string) => Promise<boolean>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<boolean>;
  signInDemo: () => Promise<boolean>;
  signOut: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => false,
  signInWithEmail: async () => false,
  signUpWithEmail: async () => false,
  signInDemo: async () => false,
  signOut: async () => {},
  error: null,
  clearError: () => {},
});

export const useAuth = () => useContext(AuthContext);

// Translate raw Firebase auth errors to friendly Vietnamese messages
function formatAuthError(err: any): string {
  const code = err?.code || err?.message || '';
  if (code.includes('auth/email-already-in-use')) {
    return 'Email này đã được đăng ký! Vui lòng chuyển sang tab "Đăng nhập" hoặc sử dụng email khác.';
  }
  if (code.includes('auth/invalid-email')) {
    return 'Địa chỉ email không đúng định dạng!';
  }
  if (code.includes('auth/weak-password')) {
    return 'Mật khẩu quá yếu. Vui lòng nhập ít nhất 6 ký tự!';
  }
  if (code.includes('auth/user-not-found') || code.includes('auth/wrong-password') || code.includes('auth/invalid-credential')) {
    return 'Tài khoản hoặc mật khẩu không chính xác!';
  }
  if (code.includes('auth/too-many-requests')) {
    return 'Tài khoản đã bị tạm khóa do nhập sai quá nhiều lần. Vui lòng thử lại sau!';
  }
  if (code.includes('auth/popup-closed-by-user')) {
    return 'Cửa sổ đăng nhập bằng Google đã bị đóng!';
  }
  return err?.message || 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại!';
}

// Create or update user document in Firestore
async function createUserDocument(user: User) {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email?.split('@')[0] || 'User',
      photoURL: user.photoURL || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      settings: {
        currency: 'VND',
        budgetLimit: 10000000,
        notifications: true,
      },
    });
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if demo user session is saved
    const isDemo = typeof window !== 'undefined' && localStorage.getItem('chainguard_demo_session') === 'true';
    if (isDemo) {
      setUser({
        uid: 'demo-judge-hungyen-2026',
        email: 'judge.demo@chainguard.ai',
        displayName: 'Giám Khảo Khởi Nghiệp Hưng Yên',
        photoURL: '',
      } as unknown as User);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);

      if (user) {
        try {
          await createUserDocument(user);
        } catch (err) {
          console.error('Error creating user document:', err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async (): Promise<boolean> => {
    try {
      setError(null);
      const result = await signInWithPopup(auth, googleProvider);
      await createUserDocument(result.user);
      return true;
    } catch (err: any) {
      setError(formatAuthError(err));
      return false;
    }
  };

  const signInWithEmail = async (email: string, password: string): Promise<boolean> => {
    try {
      setError(null);
      await signInWithEmailAndPassword(auth, email, password);
      return true;
    } catch (err: any) {
      setError(formatAuthError(err));
      return false;
    }
  };

  const signUpWithEmail = async (email: string, password: string, displayName: string): Promise<boolean> => {
    try {
      setError(null);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await createUserDocument({ ...result.user, displayName } as User);
      return true;
    } catch (err: any) {
      setError(formatAuthError(err));
      return false;
    }
  };

  const signInDemo = async (): Promise<boolean> => {
    try {
      setError(null);
      const response = await fetch('/api/auth/demo', { method: 'POST', credentials: 'same-origin' });
      if (!response.ok) throw new Error('Demo session is not configured');
      if (typeof window !== 'undefined') {
        localStorage.setItem('chainguard_demo_session', 'true');
      }
      setUser({
        uid: 'demo-judge-hungyen-2026',
        email: 'judge.demo@chainguard.ai',
        displayName: 'Giám Khảo Khởi Nghiệp Hưng Yên',
        photoURL: '',
      } as unknown as User);
      return true;
    } catch (err: any) {
      setError('Không thể khởi tạo phiên demo');
      return false;
    }
  };

  const signOut = async () => {
    try {
      await fetch('/api/auth/demo', { method: 'DELETE', credentials: 'same-origin' }).catch(() => undefined);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('chainguard_demo_session');
      }
      await firebaseSignOut(auth);
      setUser(null);
    } catch (err: any) {
      setError(err.message || 'Đăng xuất thất bại');
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signInDemo,
        signOut,
        error,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
