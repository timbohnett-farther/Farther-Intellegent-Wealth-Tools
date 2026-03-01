'use client';

import { createContext, useContext } from 'react';
import type { UserRole } from './types';

export interface AuthUser {
  user_id: string;
  email: string;
  role: UserRole;
  first_name: string;
  last_name: string;
}

export interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export interface ToastContextValue {
  toasts: Toast[];
  addToast: (message: string, type: Toast['type']) => void;
  removeToast: (id: string) => void;
}

export const ToastContext = createContext<ToastContextValue>({
  toasts: [],
  addToast: () => {},
  removeToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}
