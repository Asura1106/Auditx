import { AlertCircle, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { projectId } from '../utils/supabase/info';

interface User {
  id: string;
  email: string;
  name: string;
  accessToken: string;
  role: 'staff' | 'hod' | 'principal';
  department: 'CSE' | 'IT' | 'ALL';
}

interface AuditPendingListProps {
  user?: User;
}

interface PendingItem {
  id: string;
  fileName: string;
  fileCategory: string;
  uploadedAt: string;
  status: string;
  department: string;
  uploadedBy: string;
}

export function AuditPendingList({ user }: AuditPendingListProps) {
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.accessToken) {
      fetchPendingFiles();
    }
  }, [user]);

  const fetchPendingFiles = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b9eb9a31/files/list?status=pending`,
        {
          headers: {
            Authorization: `Bearer ${user?.accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPendingItems(data.files || []);
      }
    } catch (error) {
      console.error('Error fetching pending files:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDaysOverdue = (uploadedAt: string) => {
    const uploaded = new Date(uploadedAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - uploaded.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl text-gray-900 mb-2">Audit Pending/Missed List</h2>
        <p className="text-gray-600">
          Documents that require attention and completion
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-600">Total Pending</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">
            {loading ? '...' : pendingItems.length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-600">High Priority</p>
          <p className="text-2xl font-semibold mt-1 text-red-600">
            {loading ? '...' : pendingItems.filter(item => item.status === 'pending').length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-600">Average Days Overdue</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">
            {loading || pendingItems.length === 0
              ? '0'
              : Math.round(
                  pendingItems.reduce((acc, item) => acc + calculateDaysOverdue(item.uploadedAt), 0) /
                    pendingItems.length
                )}
          </p>
        </div>
      </div>

      {/* Pending Items List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-600">Loading pending files...</div>
        ) : pendingItems.length === 0 ? (
          <div className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Files</h3>
            <p className="text-gray-600">All audit files are up to date!</p>
          </div>
        ) : (
          <div className="divide-y">
            {pendingItems.map((item) => (
              <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-2 bg-yellow-50 rounded-xl mt-1 border border-yellow-200">
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-gray-900">{item.fileName}</h3>
                        <span className="px-2.5 py-1 text-xs font-medium rounded-full border bg-yellow-100 text-yellow-700 border-yellow-200">
                          {(item.status || 'pending').toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {calculateDaysOverdue(item.uploadedAt)} days ago
                        </span>
                        <span>{item.fileCategory}</span>
                        <span>{item.department}</span>
                        <span className="text-gray-500">{item.uploadedBy}</span>
                      </div>
                    </div>
                  </div>

                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm">
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
