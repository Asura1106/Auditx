import { useEffect, useState } from 'react';
import { FileText, Clock, Users, Eye, Trash2 } from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { supabase } from '../utils/supabase/client';

interface User {
  id: string;
  email: string;
  name: string;
  accessToken: string;
  role: 'staff' | 'hod' | 'principal';
  department: 'CSE' | 'IT' | 'BIO' | 'CHEM' | 'AIDS' | 'MECH' | 'ALL';
}

interface FilesListProps {
  user: User;
  status?: 'pending' | 'approved' | 'rejected' | 'system_rejected';
  title: string;
  subtitle: string;
}

interface FileItem {
  id: string;
  fileName: string;
  fileCategory: string;
  fileDescription?: string;
  fileType: string;
  fileSize: number;
  status: string;
  uploadedAt: string;
  uploadedBy: string;
  department: string;
  userId?: string;
  filePath?: string;
  fileBucket?: string;
  studentName?: string;
  studentRecordType?: string;
}

export function FilesList({ user, status, title, subtitle }: FilesListProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const fetchFiles = async () => {
    try {
      const query = status ? `?status=${encodeURIComponent(status)}` : '';
      const separator = query ? '&' : '?';
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b9eb9a31/files/list${query}${separator}ts=${Date.now()}`,
        {
          cache: 'no-store',
          headers: {
            Authorization: `Bearer ${user.accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const fetchedFiles = (data.files || []) as FileItem[];
        setFiles(
          status
            ? fetchedFiles
            : fetchedFiles.filter(
                (file) => file.status !== 'system_rejected' && file.status !== 'rejected'
              )
        );
      }
    } catch (error) {
      console.error('Error fetching files list:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (fileId: string, nextStatus: 'approved' | 'rejected') => {
    if (!user?.accessToken) return;
    const reason =
      nextStatus === 'rejected'
        ? window.prompt('Optional: add a rejection reason for the staff')
        : '';
    setUpdatingId(fileId);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b9eb9a31/files/status`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.accessToken}`,
          },
          body: JSON.stringify({
            fileId,
            status: nextStatus,
            reason,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        alert(data.error || 'Failed to update file status');
        return;
      }

      await fetchFiles();
    } catch (error) {
      console.error('Status update error:', error);
      alert('Failed to update file status');
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteFile = async (file: FileItem) => {
    if (!user?.accessToken) return;
    const ok = window.confirm(`Delete "${file.fileName}" permanently?`);
    if (!ok) return;

    setUpdatingId(file.id);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b9eb9a31/files/delete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.accessToken}`,
          },
          body: JSON.stringify({ fileId: file.id }),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        alert(data.error || 'Failed to delete file');
        return;
      }

      await fetchFiles();
    } catch (error) {
      console.error('Delete file error:', error);
      alert('Failed to delete file');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleViewFile = async (file: FileItem) => {
    if (!file.filePath || !file.fileBucket) {
      alert('File path is missing for this item. It may be an older upload without storage metadata.');
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b9eb9a31/files/signed-url`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.accessToken}`,
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

      const { data, error } = await supabase.storage
        .from(file.fileBucket)
        .createSignedUrl(file.filePath, 60);
      if (error || !data?.signedUrl) {
        alert(error?.message || 'Failed to generate file link (object not found).');
        return;
      }
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('View file error:', error);
      alert('Failed to open file');
    }
  };

  const formatDate = (value: string) => {
    const date = new Date(value);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6 files-page">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-1">{title}</h2>
        <p className="text-slate-600">{subtitle}</p>
      </div>

      <div className="panel-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-600">Loading files...</div>
        ) : files.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Files Found</h3>
            <p className="text-gray-600">Files will appear here once they are available.</p>
          </div>
        ) : (
          <div className="divide-y">
            {files.map((file) => (
              <div key={file.id} className="p-4 transition-all hover:bg-slate-50 file-row-line">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <div className="p-2 bg-blue-50 rounded-lg mt-1 border border-blue-100">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-gray-900 hud-name-with-line"><span>{file.fileName}</span></h3>
                      <p className="text-sm text-gray-600">{file.fileCategory}</p>
                      <div className="flex items-center flex-wrap gap-4 text-xs text-gray-500 mt-2">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {file.department}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDate(file.uploadedAt)}
                        </span>
                        <span>{file.uploadedBy}</span>
                        {file.studentName && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                            {file.studentName}
                          </span>
                        )}
                        {file.studentRecordType && (
                          <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
                            {file.studentRecordType}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 justify-end flex-wrap shrink-0 min-w-[280px]">
                    <button
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 transition-all hover:shadow"
                      onClick={() => handleViewFile(file)}
                    >
                      <Eye className="w-3.5 h-3.5 inline-block mr-1" />
                      View
                    </button>
                    <button
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-60 transition-all hover:shadow"
                      onClick={() => deleteFile(file)}
                      disabled={updatingId === file.id}
                    >
                      <Trash2 className="w-3.5 h-3.5 inline-block mr-1" />
                      Delete
                    </button>
                    <span
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg border ${
                        file.status === 'approved'
                          ? 'bg-green-100 text-green-700 border-green-200'
                          : file.status === 'rejected'
                          ? 'bg-red-100 text-red-700 border-red-200'
                          : file.status === 'system_rejected'
                          ? 'bg-orange-100 text-orange-700 border-orange-200'
                          : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                      }`}
                    >
                      {(file.status || 'pending').toUpperCase()}
                    </span>
                    {user.role === 'hod' && status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-green-200 text-green-700 hover:bg-green-50 disabled:opacity-60 transition-all hover:shadow"
                          onClick={() => updateStatus(file.id, 'approved')}
                          disabled={updatingId === file.id}
                        >
                          Approve
                        </button>
                        <button
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-60 transition-all hover:shadow"
                          onClick={() => updateStatus(file.id, 'rejected')}
                          disabled={updatingId === file.id}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}



