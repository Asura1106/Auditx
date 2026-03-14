export type UserRole = 'staff' | 'hod' | 'principal';

export interface AllowedUser {
  email: string;
  name: string;
  role: UserRole;
  department: 'CSE' | 'IT' | 'ALL';
}

// NOTE:
// Add all real accounts here to enforce allow-listed login.
// Keep this list in sync with the Edge Function allowlist in:
// src/supabase/functions/server/index.tsx
export const ALLOWED_USERS: Record<string, AllowedUser> = {
  'principalspcet@gmail.com': {
    email: 'principalspcet@gmail.com',
    name: 'Principal',
    role: 'principal',
    department: 'ALL',
  },
  'csestaff-1@gmail.com': {
    email: 'csestaff-1@gmail.com',
    name: 'CSE Staff 1',
    role: 'staff',
    department: 'CSE',
  },
  'csestaff-2@gmail.com': {
    email: 'csestaff-2@gmail.com',
    name: 'CSE Staff 2',
    role: 'staff',
    department: 'CSE',
  },
  'csestaff-3@gmail.com': {
    email: 'csestaff-3@gmail.com',
    name: 'CSE Staff 3',
    role: 'staff',
    department: 'CSE',
  },
  'itstaff-1@gmail.com': {
    email: 'itstaff-1@gmail.com',
    name: 'IT Staff 1',
    role: 'staff',
    department: 'IT',
  },
  'itstaff-2@gmail.com': {
    email: 'itstaff-2@gmail.com',
    name: 'IT Staff 2',
    role: 'staff',
    department: 'IT',
  },
  'itstaff-3@gmail.com': {
    email: 'itstaff-3@gmail.com',
    name: 'IT Staff 3',
    role: 'staff',
    department: 'IT',
  },
  'csehod@gmail.com': {
    email: 'csehod@gmail.com',
    name: 'CSE HOD',
    role: 'hod',
    department: 'CSE',
  },
  'ithod@gmail.com': {
    email: 'ithod@gmail.com',
    name: 'IT HOD',
    role: 'hod',
    department: 'IT',
  },
};

export const isAllowedEmail = (email?: string | null) => {
  if (!email) return false;
  return Boolean(ALLOWED_USERS[email.toLowerCase()]);
};

export const getAllowedUser = (email?: string | null) => {
  if (!email) return null;
  return ALLOWED_USERS[email.toLowerCase()] ?? null;
};
