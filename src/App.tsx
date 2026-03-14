import { useState, useEffect } from 'react';
import { supabase } from './utils/supabase/client';
import { projectId } from './utils/supabase/info';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { FormBasedUpload } from './components/FormBasedUpload';
import { AuditFilesDetails } from './components/AuditFilesDetails';
import { Overview } from './components/Overview';
import { AuditPendingList } from './components/AuditPendingList';
import { LoginPage } from './components/LoginPage';
import { getAllowedUser, UserRole } from './utils/access';
import { FilesList } from './components/FilesList';
import { DepartmentsSummary } from './components/DepartmentsSummary';
import { TemplatesPage } from './components/TemplatesPage';

type Page =
  | 'overview'
  | 'upload'
  | 'audit'
  | 'all-files'
  | 'pending'
  | 'document-viewer'
  | 'verify'
  | 'approved'
  | 'departments'
  | 'templates'
  | 'system-rejected';

interface User {
  id: string;
  email: string;
  name: string;
  accessToken: string;
  role: UserRole;
  department: 'CSE' | 'IT' | 'ALL';
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('overview');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (session?.access_token) {
          // Fetch user details from backend
          const response = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-b9eb9a31/auth/user`,
            {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            }
          );

          if (response.ok) {
            const userData = await response.json();
            setUser({
              ...userData,
              accessToken: session.access_token,
            });
          } else {
            const allowed = getAllowedUser(session.user.email);
            if (!allowed) {
              await supabase.auth.signOut();
              setUser(null);
              setLoading(false);
              return;
            }
            // Fallback to session user data
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              name:
                allowed?.name ||
                session.user.user_metadata?.name ||
                session.user.email?.split('@')[0] ||
                'User',
              accessToken: session.access_token,
              role: allowed?.role || 'staff',
              department: allowed?.department || 'CSE',
            });
          }
        }
      } catch (error) {
        console.error('Session check error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  // Fetch notifications when user is authenticated
  useEffect(() => {
    if (user?.accessToken) {
      const fetchNotifications = async () => {
        try {
          const response = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-b9eb9a31/notifications`,
            {
              headers: {
                Authorization: `Bearer ${user.accessToken}`,
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            setNotifications(data.notifications || []);
          }
        } catch (error) {
          console.error('Fetch notifications error:', error);
        }
      };

      fetchNotifications();
      
      // Poll for notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleLoginSuccess = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setCurrentPage('overview');
  };

  const handleViewAllFiles = () => {
    setCurrentPage('all-files');
  };

  const handleNavigate = (page: string) => {
    if (!user) return;
    const allowedPages = getAllowedPages(user.role);
    if (!allowedPages.includes(page as Page)) {
      setCurrentPage('overview');
      return;
    }
    setCurrentPage(page as Page);
  };

  const getAllowedPages = (role: UserRole) => {
    if (role === 'principal') {
      return ['overview', 'templates', 'all-files', 'departments', 'approved', 'system-rejected', 'pending'] as Page[];
    }
    if (role === 'hod') {
      return ['overview', 'templates', 'all-files', 'verify', 'system-rejected', 'pending'] as Page[];
    }
    return ['overview', 'templates', 'upload', 'audit', 'all-files', 'system-rejected', 'pending'] as Page[];
  };

  useEffect(() => {
    if (!user) return;
    const allowedPages = getAllowedPages(user.role);
    if (!allowedPages.includes(currentPage)) {
      setCurrentPage(allowedPages[0]);
    }
  }, [user, currentPage]);

  // Show loading spinner while checking session
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} onLogout={handleLogout} notifications={notifications} />
      
      <div className="flex">
        <Sidebar currentPage={currentPage} onNavigate={handleNavigate} role={user.role} />
        
        <main className="flex-1 p-8">
          {currentPage === 'overview' && <Overview user={user} />}
          
          {currentPage === 'upload' && (
            <div className="space-y-6">
              <FormBasedUpload user={user} />
            </div>
          )}
          
          {currentPage === 'audit' && <AuditFilesDetails onViewAllFiles={handleViewAllFiles} user={user} />}

          {currentPage === 'all-files' && (
            <FilesList
              user={user}
              title="All Verified Files"
              subtitle="All files currently stored in the system (excluding auto-rejected)"
            />
          )}

          {currentPage === 'departments' && user.role === 'principal' && (
            <DepartmentsSummary user={user} />
          )}

          {currentPage === 'templates' && <TemplatesPage user={user} />}

          {currentPage === 'verify' && (
            <FilesList
              user={user}
              status="pending"
              title="Verify Files"
              subtitle="Files awaiting HOD verification for your department"
            />
          )}

          {currentPage === 'approved' && (
            <FilesList
              user={user}
              status="approved"
              title="Approved Files"
              subtitle="All approved files across departments"
            />
          )}

          {currentPage === 'system-rejected' && (
            <FilesList
              user={user}
              status="system_rejected"
              title="System Rejected Files"
              subtitle="Files auto-rejected by similarity or template checks"
            />
          )}
          
          {currentPage === 'pending' && <AuditPendingList user={user} />}
        </main>
      </div>
    </div>
  );
}
