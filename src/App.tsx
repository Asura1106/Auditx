import { useState, useEffect, Suspense, lazy, type CSSProperties } from 'react';
import { supabase } from './utils/supabase/client';
import { projectId } from './utils/supabase/info';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Overview } from './components/Overview';
import { LoginPage } from './components/LoginPage';
import { getAllowedUser, UserRole } from './utils/access';
import { getActiveScene, getScenePalette, type SceneMode } from './utils/sceneTheme';

// Lazy load heavy components
const FormBasedUpload = lazy(() => import('./components/FormBasedUpload').then(m => ({ default: m.FormBasedUpload })));
const AuditFilesDetails = lazy(() => import('./components/AuditFilesDetails').then(m => ({ default: m.AuditFilesDetails })));
const AuditPendingList = lazy(() => import('./components/AuditPendingList').then(m => ({ default: m.AuditPendingList })));
const FilesList = lazy(() => import('./components/FilesList').then(m => ({ default: m.FilesList })));
const DepartmentsSummary = lazy(() => import('./components/DepartmentsSummary').then(m => ({ default: m.DepartmentsSummary })));
const TemplatesPage = lazy(() => import('./components/TemplatesPage').then(m => ({ default: m.TemplatesPage })));
const DocumentViewer = lazy(() => import('./components/DocumentViewer').then(m => ({ default: m.DocumentViewer })));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-96">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p className="mt-4 text-gray-600">Loading page...</p>
    </div>
  </div>
);

type Page =
  | 'overview'
  | 'upload'
  | 'audit'
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
  department: 'CSE' | 'IT' | 'BIO' | 'CHEM' | 'AIDS' | 'MECH' | 'ALL';
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('overview');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isEntered, setIsEntered] = useState(false);
  const [sceneMode, setSceneMode] = useState<SceneMode>('auto');
  const [sceneNow, setSceneNow] = useState(() => new Date());

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => setIsEntered(true));
    return () => window.cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const tick = () => setSceneNow(new Date());
    tick();
    const interval = window.setInterval(tick, 60_000);
    return () => window.clearInterval(interval);
  }, []);

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
            const allowed = getAllowedUser(session.user.email);
            setUser({
              ...userData,
              name:
                allowed?.name ||
                userData.name ||
                session.user.user_metadata?.name ||
                session.user.email?.split('@')[0] ||
                'User',
              role: allowed?.role || userData.role || 'staff',
              department: allowed?.department || userData.department || 'CSE',
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


  const handleOpenCategory = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage('document-viewer');
  };

  const handleAddMissingNow = (fileNumber: string, fileName: string) => {
    sessionStorage.setItem('auditx_upload_prefill', JSON.stringify({ fileNumber, fileName }));
    setCurrentPage('upload');
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
      return ['overview', 'templates', 'upload', 'departments', 'approved', 'system-rejected', 'pending'] as Page[];
    }
    if (role === 'hod') {
      return ['overview', 'templates', 'upload', 'verify', 'system-rejected', 'pending'] as Page[];
    }
    return ['overview', 'templates', 'upload', 'audit', 'system-rejected', 'pending'] as Page[];
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
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        sceneMode={sceneMode}
        onSceneModeChange={setSceneMode}
      />
    );
  }

  const activeScene = getActiveScene(sceneMode, sceneNow);
  const scenePalette = getScenePalette(activeScene);
  const sceneThemeVars = {
    '--hud-bg': scenePalette.background,
    '--hud-surface': scenePalette.surface,
    '--hud-surface-2': scenePalette.surface2,
    '--hud-card': scenePalette.card,
    '--hud-topbar': scenePalette.topbar,
    '--hud-sidebar': scenePalette.sidebar,
    '--hud-line': scenePalette.line,
    '--hud-glow': scenePalette.glow,
    '--hud-text': scenePalette.text,
    '--hud-muted': scenePalette.muted,
    '--hud-ok': scenePalette.ok,
    '--hud-warn': scenePalette.warn,
    '--hud-danger': scenePalette.danger,
  } as CSSProperties;

  return (
    <div
      className={`app-shell min-h-screen hud-theme scene-theme scene-${activeScene} ${isEntered ? 'is-entered' : 'is-entering'}`}
      style={sceneThemeVars}
    >
      <div className="app-intro-vignette" aria-hidden />
      <Navbar user={user} onLogout={handleLogout} notifications={notifications} />
      
      <div className="app-body flex">
        <Sidebar currentPage={currentPage} onNavigate={handleNavigate} role={user.role} />
        
        <main className="app-main flex-1">
          {currentPage === 'overview' && <Overview user={user} />}
          
          {currentPage === 'upload' && (
            <Suspense fallback={<PageLoader />}>
              <div className="space-y-6">
                <FormBasedUpload user={user} />
              </div>
            </Suspense>
          )}
          
          {currentPage === 'audit' && (
            <Suspense fallback={<PageLoader />}>
              <AuditFilesDetails
                onOpenCategory={handleOpenCategory}
                user={user}
              />
            </Suspense>
          )}

          {currentPage === 'document-viewer' && (
            <Suspense fallback={<PageLoader />}>
              <DocumentViewer
                user={user}
                documentName={selectedCategory || 'Selected Category'}
                onBack={() => setCurrentPage('audit')}
              />
            </Suspense>
          )}

          {currentPage === 'departments' && user.role === 'principal' && (
            <Suspense fallback={<PageLoader />}>
              <DepartmentsSummary user={user} />
            </Suspense>
          )}

          {currentPage === 'templates' && (
            <Suspense fallback={<PageLoader />}>
              <TemplatesPage user={user} />
            </Suspense>
          )}

          {currentPage === 'verify' && (
            <Suspense fallback={<PageLoader />}>
              <FilesList
                user={user}
                status="pending"
                title="Verify Files"
                subtitle="Files awaiting HOD verification for your department"
              />
            </Suspense>
          )}

          {currentPage === 'approved' && (
            <Suspense fallback={<PageLoader />}>
              <FilesList
                user={user}
                status="approved"
                title="Approved Files"
                subtitle="All approved files across departments"
              />
            </Suspense>
          )}

          {currentPage === 'system-rejected' && (
            <Suspense fallback={<PageLoader />}>
              <FilesList
                user={user}
                status="system_rejected"
                title="System Rejected Files"
                subtitle="Files auto-rejected by similarity or template checks"
              />
            </Suspense>
          )}
          
          {currentPage === 'pending' && (
            <Suspense fallback={<PageLoader />}>
              <AuditPendingList user={user} onAddNow={handleAddMissingNow} />
            </Suspense>
          )}
        </main>
      </div>
    </div>
  );
}



