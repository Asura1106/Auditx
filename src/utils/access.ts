export type UserRole = 'staff' | 'hod' | 'principal';

export interface AllowedUser {
  email: string;
  name: string;
  role: UserRole;
  department: 'CSE' | 'IT' | 'BIO' | 'CHEM' | 'AIDS' | 'MECH' | 'ALL';
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
  'biostaff-1@gmail.com': {
    email: 'biostaff-1@gmail.com',
    name: 'Bio Staff 1',
    role: 'staff',
    department: 'BIO',
  },
  'mechstaff-1@gmail.com': {
    email: 'mechstaff-1@gmail.com',
    name: 'Mech Staff 1',
    role: 'staff',
    department: 'MECH',
  },
  'chemstaff-1@gmail.com': {
    email: 'chemstaff-1@gmail.com',
    name: 'Chem Staff 1',
    role: 'staff',
    department: 'CHEM',
  },
  'aidsstaff-1@gmail.com': {
    email: 'aidsstaff-1@gmail.com',
    name: 'AIDS Staff 1',
    role: 'staff',
    department: 'AIDS',
  },
  'csehod@gmail.com': {
    email: 'csehod@gmail.com',
    name: 'CSE HOD',
    role: 'hod',
    department: 'CSE',
  },
  'chemhod@gmail.com': {
    email: 'chemhod@gmail.com',
    name: 'Chem HOD',
    role: 'hod',
    department: 'CHEM',
  },
  'aidshod@gmail.com': {
    email: 'aidshod@gmail.com',
    name: 'AIDS HOD',
    role: 'hod',
    department: 'AIDS',
  },
  'mechhod@gmail.com': {
    email: 'mechhod@gmail.com',
    name: 'Mech HOD',
    role: 'hod',
    department: 'MECH',
  },
  'biohod@gmail.com': {
    email: 'biohod@gmail.com',
    name: 'Bio HOD',
    role: 'hod',
    department: 'BIO',
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

