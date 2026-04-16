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
import { useEffect, useMemo, useRef, useState } from 'react';
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
    department: 'CSE' | 'IT' | 'BIO' | 'CHEM' | 'AIDS' | 'MECH' | 'ALL';
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
  const [auditTitle, setAuditTitle] = useState('Upcoming Audit');
  const [auditDeadline, setAuditDeadline] = useState<Date | null>(null);
  const [seenNotificationIds, setSeenNotificationIds] = useState<Record<string, true>>({});

  const userRef = useRef<HTMLDivElement>(null);
  const helpRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read && !seenNotificationIds[n.id]).length,
    [notifications, seenNotificationIds]
  );

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

  const roleLabel = user?.role ? user.role.toUpperCase() : 'STAFF';
  const loginName = user?.email ? user.email.split('@')[0] : user?.name || 'user';

  const getNotificationIcon = (type: Notification['type']) => {
    if (type === 'rejection') return <XCircle className="w-4 h-4 text-red-500 mt-0.5" />;
    if (type === 'approval') return <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5" />;
    return <Clock className="w-4 h-4 text-blue-500 mt-0.5" />;
  };

  return (
    <header className="topbar sticky top-0 z-40">
      <div className="topbar-inner">
        <div className="topbar-left">
          <h1 className="topbar-title">Academic Audit System</h1>

          <div className="topbar-meta">
            <button className="topbar-chip" type="button">
              <span className="topbar-chip-label">Organization</span>
              <span className="topbar-chip-value">SPCET</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            <button className="topbar-chip topbar-chip-user" type="button">
              <span className="topbar-chip-label">{roleLabel}</span>
              <span className="topbar-chip-value">
                {loginName}
                {user?.department && user.department !== 'ALL' ? ` - ${user.department}` : ''}
              </span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            <div className="topbar-chip topbar-chip-timer">
              <Clock className="w-3.5 h-3.5" />
              <span className="topbar-chip-value">
                {auditTitle}: {daysLeft === null ? 'Set by principal' : `${daysLeft} day(s) left`}
              </span>
            </div>
          </div>
        </div>

        <div className="topbar-actions">
          <div className="relative" ref={helpRef}>
            <button
              type="button"
              onClick={() => closeOtherMenus('help')}
              className="topbar-icon-btn"
              aria-label="Help"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            {showHelpMenu ? (
              <div className="topbar-dropdown" style={{ width: 'min(520px, calc(100vw - 24px))' }}>
                <div className="topbar-dropdown-header">
                  <h3>Help</h3>
                  <button type="button" onClick={() => setShowHelpMenu(false)} className="topbar-close">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="topbar-dropdown-content">
                  Upload files from the Upload page, review approved and system-rejected documents,
                  and track department progress in Pending Checklist.
                </div>
              </div>
            ) : null}
          </div>

          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => {
                closeOtherMenus('notif');
                const nextSeen: Record<string, true> = {};
                for (const notification of notifications) {
                  nextSeen[notification.id] = true;
                }
                setSeenNotificationIds((prev) => ({ ...prev, ...nextSeen }));
              }}
              className="topbar-icon-btn"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 ? <span className="topbar-badge">{unreadCount > 9 ? '9+' : unreadCount}</span> : null}
            </button>
            {showNotifMenu ? (
              <div
                className="topbar-dropdown topbar-dropdown-notifications"
                style={{ width: 'min(560px, calc(100vw - 24px))' }}
              >
                <div className="topbar-dropdown-header">
                  <h3>Notifications</h3>
                  <button type="button" onClick={() => setShowNotifMenu(false)} className="topbar-close">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="topbar-notifications-scroll">
                  {notifications.length === 0 ? (
                    <p className="topbar-empty">No notifications</p>
                  ) : (
                    notifications.map((notif) => (
                      <div key={notif.id} className="topbar-notification-item">
                        {getNotificationIcon(notif.type)}
                        <div className="min-w-0">
                          <p className="topbar-notification-msg">{notif.message}</p>
                          <p className="topbar-notification-time">
                            {new Date(notif.timestamp).toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <div className="relative" ref={toolsRef}>
            <button
              type="button"
              onClick={() => closeOtherMenus('tools')}
              className="topbar-icon-btn"
              aria-label="Tools"
            >
              <Grid3x3 className="w-5 h-5" />
            </button>
            {showToolsMenu ? (
              <div className="topbar-dropdown" style={{ width: 'min(460px, calc(100vw - 24px))' }}>
                <div className="topbar-dropdown-header">
                  <h3>Tools</h3>
                  <button type="button" onClick={() => setShowToolsMenu(false)} className="topbar-close">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="topbar-dropdown-content">No extra tools configured yet.</div>
              </div>
            ) : null}
          </div>

          <div className="relative" ref={userRef}>
            <button type="button" onClick={() => closeOtherMenus('user')} className="topbar-avatar" aria-label="Profile">
              {initials || 'U'}
            </button>
            {showUserMenu ? (
              <div className="topbar-dropdown" style={{ width: '280px' }}>
                <div className="topbar-user-header">
                  <p>{user?.name || 'User'}</p>
                  <span>{user?.email || ''}</span>
                </div>
                <button type="button" className="topbar-menu-btn">
                  <User className="w-4 h-4" />
                  Profile
                </button>
                <button
                  type="button"
                  className="topbar-menu-btn topbar-menu-btn-danger"
                  onClick={() => {
                    setShowUserMenu(false);
                    onLogout?.();
                  }}
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}



