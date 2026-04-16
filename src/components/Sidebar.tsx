import { AlertCircle, CheckCircle, ChevronLeft, ChevronRight, FileText, Home, Upload } from 'lucide-react';
import { useMemo, useState, type ComponentType } from 'react';
import { UserRole } from '../utils/access';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  role: UserRole;
}

type MenuItem = {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

export function Sidebar({ currentPage, onNavigate, role }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = useMemo<MenuItem[]>(() => {
    if (role === 'principal') {
      return [
        { id: 'overview', label: 'Overview', icon: Home },
        { id: 'templates', label: 'Templates', icon: FileText },
        { id: 'departments', label: 'Departments Summary', icon: FileText },
        { id: 'approved', label: 'Approved Files', icon: CheckCircle },
        { id: 'system-rejected', label: 'System Rejected', icon: AlertCircle },
        { id: 'pending', label: 'Pending Files Checklist', icon: AlertCircle },
      ];
    }
    if (role === 'hod') {
      return [
        { id: 'overview', label: 'Overview', icon: Home },
        { id: 'templates', label: 'Templates', icon: FileText },
        { id: 'verify', label: 'Verify Files', icon: FileText },
        { id: 'system-rejected', label: 'System Rejected', icon: AlertCircle },
        { id: 'pending', label: 'Pending Files Checklist', icon: AlertCircle },
      ];
    }
    return [
      { id: 'overview', label: 'Overview', icon: Home },
      { id: 'templates', label: 'Templates', icon: FileText },
      { id: 'upload', label: 'Upload', icon: Upload },
      { id: 'audit', label: 'Files Details', icon: FileText },
      { id: 'system-rejected', label: 'System Rejected', icon: AlertCircle },
      { id: 'pending', label: 'Pending Files Checklist', icon: AlertCircle },
    ];
  }, [role]);

  return (
    <aside className={`audit-sidebar ${collapsed ? 'is-collapsed' : ''}`}>
      <div className={`audit-sidebar-toggle ${collapsed ? 'justify-center' : 'justify-end'}`}>
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="audit-sidebar-toggle-btn"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="audit-sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              type="button"
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`audit-sidebar-link ${isActive ? 'is-active' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed ? <span>{item.label}</span> : null}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
