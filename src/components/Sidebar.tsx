import { Home, Upload, FileText, AlertCircle, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { UserRole } from '../utils/access';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  role: UserRole;
}

export function Sidebar({ currentPage, onNavigate, role }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = (() => {
    if (role === 'principal') {
      return [
        { id: 'overview', label: 'Overview', icon: Home },
        { id: 'templates', label: 'Templates', icon: FileText },
        { id: 'all-files', label: 'All Files', icon: FileText },
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
        { id: 'all-files', label: 'All Files', icon: FileText },
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
      { id: 'all-files', label: 'All Files', icon: FileText },
      { id: 'system-rejected', label: 'System Rejected', icon: AlertCircle },
      { id: 'pending', label: 'Pending Files Checklist', icon: AlertCircle },
    ];
  })();

  return (
    <aside
      className={`bg-white border-r border-gray-200 min-h-[calc(100vh-57px)] flex-shrink-0 transition-all ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-end'} p-3`}>
        <button
          onClick={() => setCollapsed((value) => !value)}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
      <nav className="px-3 pb-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors
                ${
                  isActive
                    ? 'bg-green-50 text-green-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }
              `}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-green-700' : 'text-gray-500'}`} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
