import {
  Bell,
  CheckCircle,
  ChevronDown,
  Clock,
  Grid3x3,
  HelpCircle,
  LogOut,
  User,
  X,
  XCircle,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { projectId } from '../utils/supabase/info';

interface Notification {
  id: string;
  type: 'rejection' | 'approval' | 'remark' | 'timeline';
  message: string;
  timestamp: string;
  read: boolean;
}

interface NavbarProps {
  user?: {
    id: string;
    email: string;
    name: string;
    accessToken: string;
    role: 'staff' | 'hod' | 'principal';
    department: 'CSE' | 'IT' | 'ALL';
  };
  onLogout?: () => void;
  notifications?: Notification[];
}

export function Navbar({ user, onLogout, notifications = [] }: NavbarProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showHelpMenu, setShowHelpMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);

  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [auditTitle, setAuditTitle] = useState<string>('Upcoming Audit');
  const [auditDeadline, setAuditDeadline] = useState<Date | null>(null);

  const userRef = useRef<HTMLDivElement>(null);
  const helpRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);

  const closeOtherMenus = (key: 'user' | 'help' | 'notif' | 'tools') => {
    setShowUserMenu(key === 'user' ? (v) => !v : false);
    setShowHelpMenu(key === 'help' ? (v) => !v : false);
    setShowNotifMenu(key === 'notif' ? (v) => !v : false);
    setShowToolsMenu(key === 'tools' ? (v) => !v : false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (userRef.current && !userRef.current.contains(target)) setShowUserMenu(false);
      if (helpRef.current && !helpRef.current.contains(target)) setShowHelpMenu(false);
      if (notifRef.current && !notifRef.current.contains(target)) setShowNotifMenu(false);
      if (toolsRef.current && !toolsRef.current.contains(target)) setShowToolsMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user?.accessToken) return;
    const fetchAuditSettings = async () => {
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-b9eb9a31/dashboard/audit-settings`,
          {
            headers: { Authorization: `Bearer ${user.accessToken}` },
          }
        );
        if (!response.ok) return;
        const data = await response.json();
        if (data?.title) setAuditTitle(data.title);
        if (data?.deadline) setAuditDeadline(new Date(data.deadline));
      } catch (error) {
        console.error('Audit settings fetch error:', error);
      }
    };
    fetchAuditSettings();
  }, [user?.accessToken]);

  useEffect(() => {
    if (!auditDeadline) return;
    const updateCountdown = () => {
      const now = new Date();
      const diffMs = auditDeadline.getTime() - now.getTime();
      const diffDays = Math.max(Math.ceil(diffMs / (1000 * 60 * 60 * 24)), 0);
      setDaysLeft(diffDays);
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 60 * 60 * 1000);
    return () => clearInterval(timer);
  }, [auditDeadline]);

  const initials = (user?.name || 'User')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-6 min-w-0 overflow-hidden">
          <h1 className="text-[38px] leading-none font-semibold whitespace-nowrap text-gray-900">
            Academic Audit System
          </h1>

          <div className="hidden lg:flex items-center gap-3 text-sm min-w-0">
            <div className="flex items-center gap-1 text-gray-500 uppercase text-xs">
              ORGANIZATION
              <span className="text-gray-800 font-medium normal-case ml-1">SPCET</span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </div>
            <div className="flex items-center gap-1 text-gray-500 uppercase text-xs min-w-0">
              STAFF
              <span className="text-gray-800 font-medium normal-case ml-1 truncate max-w-[240px]">
                {user?.name || 'User'} {user?.department && user.department !== 'ALL' ? `- ${user.department}` : ''}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </div>
            <div className="hidden xl:flex items-center gap-1 text-gray-500 text-xs">
              <Clock className="w-4 h-4" />
              <span className="normal-case text-gray-700">
                {auditTitle}: {daysLeft === null ? 'Set by principal' : `${daysLeft} day(s) left`}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="relative" ref={helpRef}>
            <button
              type="button"
              onClick={() => closeOtherMenus('help')}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
              aria-label="Help"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            {showHelpMenu && (
              <div
                className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
                style={{ width: '460px', maxWidth: '95vw' }}
              >
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900">Help</h3>
                  <button
                    type="button"
                    onClick={() => setShowHelpMenu(false)}
                    className="p-1 rounded hover:bg-gray-100"
                  >
                    <X className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
                <div className="px-4 py-3 text-sm text-gray-700">
                  Upload files from Upload page, track final accepted files in All Files, and pending items in Pending
                  Files Checklist.
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => closeOtherMenus('notif')}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-600 relative"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {notifications.some((n) => !n.read) && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
              )}
            </button>
            {showNotifMenu && (
              <div
                className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden"
                style={{ width: '500px', maxWidth: '95vw' }}
              >
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                  <button
                    type="button"
                    onClick={() => setShowNotifMenu(false)}
                    className="p-1 rounded hover:bg-gray-100"
                  >
                    <X className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
                <div className="overflow-y-auto" style={{ maxHeight: '65vh' }}>
                  {notifications.length === 0 ? (
                    <p className="text-sm text-gray-500 px-4 py-4">No notifications</p>
                  ) : (
                    notifications.map((notif) => (
                      <div key={notif.id} className="px-4 py-3 border-b border-gray-100">
                        <div className="flex items-start gap-2">
                          {notif.type === 'rejection' && <XCircle className="w-4 h-4 text-red-500 mt-0.5" />}
                          {notif.type === 'approval' && <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />}
                          {(notif.type === 'remark' || notif.type === 'timeline') && (
                            <Clock className="w-4 h-4 text-blue-500 mt-0.5" />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm text-gray-800 break-words">{notif.message}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(notif.timestamp).toLocaleString('en-IN')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={toolsRef}>
            <button
              type="button"
              onClick={() => closeOtherMenus('tools')}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
              aria-label="Tools"
            >
              <Grid3x3 className="w-5 h-5" />
            </button>
            {showToolsMenu && (
              <div
                className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
                style={{ width: '420px', maxWidth: '95vw' }}
              >
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900">Tools</h3>
                  <button
                    type="button"
                    onClick={() => setShowToolsMenu(false)}
                    className="p-1 rounded hover:bg-gray-100"
                  >
                    <X className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
                <div className="px-4 py-3 text-sm text-gray-700 min-h-24">No extra tools configured yet.</div>
              </div>
            )}
          </div>

          <div className="relative" ref={userRef}>
            <button
              type="button"
              onClick={() => closeOtherMenus('user')}
              className="rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm"
              style={{ backgroundColor: '#16a34a', width: '36px', height: '36px' }}
              aria-label="Profile"
            >
              {initials || 'U'}
            </button>
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-900">{user?.name || 'User'}</p>
                  <p className="text-xs text-gray-500 mt-0.5 break-all">{user?.email || ''}</p>
                </div>
                <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <User className="w-4 h-4" />
                  Profile
                </button>
                <button
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  onClick={() => {
                    setShowUserMenu(false);
                    onLogout?.();
                  }}
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
