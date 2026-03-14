import { useState, useEffect } from 'react';
import { FileText, Clock, AlertCircle, Eye } from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { supabase } from '../utils/supabase/client';

interface User {
  id: string;
  email: string;
  name: string;
  accessToken: string;
  role: 'staff' | 'hod' | 'principal';
  department: 'CSE' | 'IT' | 'ALL';
}

interface OverviewProps {
  user?: User;
}

interface DashboardStats {
  totalFiles: number;
  totalCategories: number;
  completionPercentage: number;
  pendingCount: number;
  recentFiles: any[];
}

export function Overview({ user }: OverviewProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalFiles: 0,
    totalCategories: 0,
    completionPercentage: 0,
    pendingCount: 0,
    recentFiles: [],
  });
  const [loading, setLoading] = useState(true);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [auditTitle, setAuditTitle] = useState<string>('Upcoming Audit');
  const [auditDeadline, setAuditDeadline] = useState<Date | null>(null);

  useEffect(() => {
    if (user?.accessToken) {
      fetchDashboardStats();
    }
  }, [user]);

  useEffect(() => {
    if (!user?.accessToken) return;
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
          if (data?.title) setAuditTitle(data.title);
          if (data?.deadline) setAuditDeadline(new Date(data.deadline));
        }
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

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b9eb9a31/dashboard/stats?ts=${Date.now()}`,
        {
          cache: 'no-store',
          headers: {
            Authorization: `Bearer ${user?.accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to fetch dashboard stats:', response.status, errorData);
      }
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl mb-2">Overview</h2>
        <p className="text-gray-600">
          Welcome to the Academic Audit System, {user?.name || 'User'}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{auditTitle}</p>
            <p className="text-xl font-semibold text-gray-900 mt-1">
              {daysLeft === null ? 'Set by principal' : `${daysLeft} day(s) left`}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {auditDeadline
                ? `Deadline: ${auditDeadline.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}`
                : 'Deadline not set'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Files</p>
            <FileText className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {loading ? '...' : stats.totalFiles}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Categories</p>
            <FileText className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {loading ? '...' : stats.totalCategories}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Completion</p>
            <Clock className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {loading ? '...' : `${stats.completionPercentage}%`}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Pending</p>
            <AlertCircle className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {loading ? '...' : stats.pendingCount}
          </p>
        </div>
      </div>

      {!loading && stats.totalFiles === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Files Uploaded Yet</h3>
          <p className="text-gray-600 mb-6">
            Start by uploading your first audit document to see progress and statistics.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="font-semibold text-lg mb-4">Recent Uploads</h3>
          {stats.recentFiles.length > 0 ? (
            <div className="space-y-3">
              {stats.recentFiles.map((file: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">{file.fileName}</p>
                      <p className="text-sm text-gray-600">{file.fileCategory}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="px-3 py-1.5 text-xs font-medium rounded border border-blue-200 text-blue-700 hover:bg-blue-50"
                      onClick={async () => {
                        try {
                          const response = await fetch(
                            `https://${projectId}.supabase.co/functions/v1/make-server-b9eb9a31/files/signed-url`,
                            {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${user?.accessToken}`,
                              },
                              body: JSON.stringify({ fileId: file.id }),
                            }
                          );
                          if (response.ok) {
                            const data = await response.json();
                            if (data?.signedUrl) {
                              window.open(data.signedUrl, '_blank');
                              return;
                            }
                          }
                          if (file.fileBucket && file.filePath) {
                            const { data, error } = await supabase.storage
                              .from(file.fileBucket)
                              .createSignedUrl(file.filePath, 60);
                            if (error || !data?.signedUrl) {
                              alert(error?.message || 'Failed to open file');
                              return;
                            }
                            window.open(data.signedUrl, '_blank');
                          } else {
                            alert('File path missing');
                          }
                        } catch (error) {
                          console.error('View file error:', error);
                          alert('Failed to open file');
                        }
                      }}
                    >
                      <Eye className="w-3.5 h-3.5 inline-block mr-1" />
                      View
                    </button>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        file.status === 'approved' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {file.status || 'pending'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-center py-4">No recent files</p>
          )}
        </div>
      )}
    </div>
  );
}
