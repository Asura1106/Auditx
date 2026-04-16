import { useEffect, useState } from 'react';
import { ArrowLeft, FileText, Download, Eye, Calendar, User } from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { supabase } from '../utils/supabase/client';

interface FileItem {
  id: string;
  fileName: string;
  fileType?: string | null;
  fileSize?: number | null;
  uploadedBy?: string | null;
  uploadedAt: string;
  filePath?: string | null;
  fileBucket?: string | null;
}

interface ViewerUser {
  accessToken: string;
}

interface DocumentViewerProps {
  user: ViewerUser;
  documentName: string;
  onBack: () => void;
}

const formatSize = (bytes?: number | null) => {
  if (!bytes || bytes <= 0) return 'N/A';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(1)} ${units[unit]}`;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export function DocumentViewer({ user, documentName, onBack }: DocumentViewerProps) {
  const [documents, setDocuments] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const fetchFilesByCategory = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-b9eb9a31/files/list?category=${encodeURIComponent(documentName)}&ts=${Date.now()}`,
          {
            cache: 'no-store',
            headers: {
              Authorization: `Bearer ${user.accessToken}`,
            },
          }
        );

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to load files for this category');
        }

        const data = await response.json();
        setDocuments((data.files || []) as FileItem[]);
      } catch (fetchError) {
        console.error('Document viewer fetch error:', fetchError);
        setError(fetchError instanceof Error ? fetchError.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    void fetchFilesByCategory();
  }, [documentName, user.accessToken]);

  const getFileColor = (fileType?: string | null) => {
    const normalized = (fileType || '').toUpperCase();
    if (normalized.includes('PDF')) return 'bg-red-50 text-red-700 border-red-200';
    if (normalized.includes('DOC')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (normalized.includes('XLS')) return 'bg-green-50 text-green-700 border-green-200';
    return 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const getSignedUrl = async (doc: FileItem) => {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-b9eb9a31/files/signed-url`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.accessToken}`,
        },
        body: JSON.stringify({ fileId: doc.id }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data?.signedUrl) return data.signedUrl as string;
    }

    if (doc.fileBucket && doc.filePath) {
      const { data, error: signError } = await supabase.storage
        .from(doc.fileBucket)
        .createSignedUrl(doc.filePath, 60);
      if (signError || !data?.signedUrl) {
        throw new Error(signError?.message || 'Failed to generate file link');
      }
      return data.signedUrl;
    }

    throw new Error('File path metadata missing for this document');
  };

  const handleView = async (doc: FileItem) => {
    setBusyId(doc.id);
    try {
      const signedUrl = await getSignedUrl(doc);
      window.open(signedUrl, '_blank');
    } catch (viewError) {
      console.error('View file error:', viewError);
      alert(viewError instanceof Error ? viewError.message : 'Failed to open file');
    } finally {
      setBusyId(null);
    }
  };

  const handleDownload = async (doc: FileItem) => {
    setBusyId(doc.id);
    try {
      const signedUrl = await getSignedUrl(doc);
      const link = document.createElement('a');
      link.href = signedUrl;
      link.download = doc.fileName || 'document';
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (downloadError) {
      console.error('Download file error:', downloadError);
      alert(downloadError instanceof Error ? downloadError.message : 'Failed to download file');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl">{documentName}</h2>
          <p className="text-gray-600">
            {loading ? 'Loading documents...' : `${documents.length} documents stored`}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-600">Loading documents...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">{error}</div>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No documents found</p>
            <p className="text-sm text-gray-400">
              Documents will appear here once they are uploaded
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {documents.map((doc) => (
              <div key={doc.id} className="p-4 hover:bg-gray-50 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-50 rounded-lg flex-shrink-0">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-gray-900 truncate">{doc.fileName}</p>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded border ${getFileColor(doc.fileType)}`}
                      >
                        {(doc.fileType || 'FILE').toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        {doc.uploadedBy || 'Unknown'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(doc.uploadedAt)}
                      </span>
                      <span>{formatSize(doc.fileSize)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleView(doc)}
                      disabled={busyId === doc.id}
                      className="p-2 hover:bg-blue-50 rounded-lg transition-colors text-blue-600 disabled:opacity-60"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDownload(doc)}
                      disabled={busyId === doc.id}
                      className="p-2 hover:bg-green-50 rounded-lg transition-colors text-green-600 disabled:opacity-60"
                    >
                      <Download className="w-5 h-5" />
                    </button>
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
