import { FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import { projectId } from '../utils/supabase/info';

interface User {
  id: string;
  email: string;
  name: string;
  accessToken: string;
  role: 'staff' | 'hod' | 'principal';
  department: 'CSE' | 'IT' | 'BIO' | 'CHEM' | 'AIDS' | 'MECH' | 'ALL';
}

interface AuditFile {
  name: string;
  count: number;
}

interface AuditFilesDetailsProps {
  onOpenCategory: (category: string) => void;
  user?: User;
}

export function AuditFilesDetails({ onOpenCategory, user }: AuditFilesDetailsProps) {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [auditFiles, setAuditFiles] = useState<AuditFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.accessToken) {
      fetchCategories();
    }
  }, [user]);

  const fetchCategories = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b9eb9a31/files/categories?ts=${Date.now()}`,
        {
          cache: 'no-store',
          headers: {
            Authorization: `Bearer ${user?.accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAuditFiles(data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl mb-2">Audit Files Details</h2>
        <p className="text-gray-600">
          Categories are shown only from currently available files.
        </p>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-600">Loading categories...</p>
        </div>
      ) : auditFiles.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Categories Yet</h3>
          <p className="text-gray-600">
            Upload files to create categories and view them here.
          </p>
        </div>
      ) : (
        <>
          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {auditFiles.map((file, index) => (
              <button
                key={index}
                onClick={() => onOpenCategory(file.name)}
                onMouseEnter={() => setHoveredCard(file.name)}
                onMouseLeave={() => setHoveredCard(null)}
                className={`
                  group relative
                  bg-white rounded-full px-6 py-4
                  border border-gray-200
                  text-left
                  transition-all duration-300 ease-out
                  ${
                    hoveredCard === file.name
                      ? 'shadow-xl scale-105 border-blue-300 z-10'
                      : hoveredCard
                      ? 'shadow-sm opacity-60 scale-95'
                      : 'shadow-md hover:shadow-lg'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  {/* Icon */}
                  <div
                    className={`
                      flex-shrink-0 transition-all duration-300
                      ${hoveredCard === file.name ? 'scale-110' : ''}
                    `}
                  >
                    <div className="w-8 h-10 bg-yellow-50 rounded flex items-center justify-center">
                      <FileText 
                        className={`
                          w-5 h-5 transition-colors duration-300
                          ${hoveredCard === file.name ? 'text-yellow-600' : 'text-yellow-500'}
                        `} 
                      />
                    </div>
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`
                        font-medium text-gray-900 transition-all duration-300
                        ${hoveredCard === file.name ? 'text-blue-700' : ''}
                      `}
                    >
                      {file.name}
                    </p>
                    {hoveredCard === file.name && (
                      <p className="text-xs text-gray-500 mt-0.5 animate-in fade-in slide-in-from-bottom-1 duration-200">
                        {file.count} documents
                      </p>
                    )}
                  </div>
                </div>

                {/* Hover indicator */}
                {hoveredCard === file.name && (
                  <div className="absolute inset-0 rounded-full border-2 border-blue-400 pointer-events-none animate-in fade-in duration-300" />
                )}
              </button>
            ))}
          </div>

          {/* Stats */}
          <div className="bg-white rounded-xl border shadow-sm p-6 mt-8">
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-600">Total Categories</p>
                <p className="text-2xl font-medium mt-1">{auditFiles.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Documents</p>
                <p className="text-2xl font-medium mt-1">
                  {auditFiles.reduce((acc, file) => acc + file.count, 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Last Updated</p>
                <p className="text-2xl font-medium mt-1">Today</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

