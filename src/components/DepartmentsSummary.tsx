import { useEffect, useState } from 'react';
import { projectId } from '../utils/supabase/info';
import { FileText, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string;
  accessToken: string;
  role: 'staff' | 'hod' | 'principal';
  department: 'CSE' | 'IT' | 'ALL';
}

interface DepartmentStat {
  department: string;
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

interface DepartmentsSummaryProps {
  user: User;
}

export function DepartmentsSummary({ user }: DepartmentsSummaryProps) {
  const [stats, setStats] = useState<DepartmentStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditTitle, setAuditTitle] = useState('');
  const [auditDeadline, setAuditDeadline] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-b9eb9a31/dashboard/departments`,
          {
            headers: {
              Authorization: `Bearer ${user.accessToken}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setStats(data.departments || []);
        }
      } catch (error) {
        console.error('Departments summary error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user.accessToken]);

  useEffect(() => {
    const fetchAuditSettings = async () => {
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-b9eb9a31/dashboard/audit-settings`,
          {
            headers: {
              Authorization: `Bearer ${user.accessToken}`,
            },
          }
        );
        if (response.ok) {
          const data = await response.json();
          setAuditTitle(data?.title || '');
          setAuditDeadline(data?.deadline ? data.deadline.substring(0, 10) : '');
        }
      } catch (error) {
        console.error('Audit settings fetch error:', error);
      }
    };

    fetchAuditSettings();
  }, [user.accessToken]);

  const handleSave = async () => {
    if (!auditTitle || !auditDeadline) {
      setStatusMessage('Please provide both audit name and deadline.');
      return;
    }
    setSaving(true);
    setStatusMessage('');
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b9eb9a31/dashboard/audit-settings`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.accessToken}`,
          },
          body: JSON.stringify({
            title: auditTitle,
            deadline: auditDeadline,
          }),
        }
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setStatusMessage(data.error || 'Failed to save audit settings.');
        return;
      }
      setStatusMessage('Audit settings saved.');
    } catch (error) {
      console.error('Audit settings save error:', error);
      setStatusMessage('Failed to save audit settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl mb-2">Departments Summary</h2>
        <p className="text-gray-600">Overview of audit progress across departments</p>
      </div>

      {user.role === 'principal' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Audit Countdown Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Audit Name
              </label>
              <input
                type="text"
                value={auditTitle}
                onChange={(e) => setAuditTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="e.g., NBA 2026 Audit"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deadline
              </label>
              <input
                type="date"
                value={auditDeadline}
                onChange={(e) => setAuditDeadline(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            {statusMessage && (
              <span className="text-sm text-gray-600">{statusMessage}</span>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-600">
          Loading department statistics...
        </div>
      ) : stats.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-600">
          No department data available yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {stats.map((dept) => (
            <div key={dept.department} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{dept.department}</h3>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FileText className="w-4 h-4 text-blue-600" />
                  {dept.total} files
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="flex items-center gap-2 text-yellow-700 bg-yellow-50 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4" />
                  Pending: {dept.pending}
                </div>
                <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg px-3 py-2">
                  <CheckCircle className="w-4 h-4" />
                  Approved: {dept.approved}
                </div>
                <div className="flex items-center gap-2 text-red-700 bg-red-50 rounded-lg px-3 py-2">
                  <XCircle className="w-4 h-4" />
                  Rejected: {dept.rejected}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
