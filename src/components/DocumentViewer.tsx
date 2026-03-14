import { ArrowLeft, FileText, Download, Eye, Calendar, User } from 'lucide-react';

interface Document {
  id: string;
  fileName: string;
  fileSize: string;
  uploadedBy: string;
  uploadDate: string;
  fileType: string;
}

interface DocumentViewerProps {
  documentName: string;
  onBack: () => void;
}

export function DocumentViewer({ documentName, onBack }: DocumentViewerProps) {
  // Mock documents for the selected category
  const documents: Document[] = [
    {
      id: '1',
      fileName: `${documentName} - Report 2023.pdf`,
      fileSize: '2.4 MB',
      uploadedBy: 'Dr. Rajesh Kumar',
      uploadDate: '2024-01-15',
      fileType: 'PDF',
    },
    {
      id: '2',
      fileName: `${documentName} - Guidelines.docx`,
      fileSize: '1.8 MB',
      uploadedBy: 'Prof. Meera Sharma',
      uploadDate: '2024-01-14',
      fileType: 'DOCX',
    },
    {
      id: '3',
      fileName: `${documentName} - Data Sheet.xlsx`,
      fileSize: '3.2 MB',
      uploadedBy: 'Dr. Amit Patel',
      uploadDate: '2024-01-12',
      fileType: 'XLSX',
    },
    {
      id: '4',
      fileName: `${documentName} - Summary.pdf`,
      fileSize: '1.1 MB',
      uploadedBy: 'Prof. Sunita Verma',
      uploadDate: '2024-01-10',
      fileType: 'PDF',
    },
    {
      id: '5',
      fileName: `${documentName} - Appendix.pdf`,
      fileSize: '4.5 MB',
      uploadedBy: 'Dr. Rajesh Kumar',
      uploadDate: '2024-01-08',
      fileType: 'PDF',
    },
  ];

  const getFileIcon = (fileType: string) => {
    return <FileText className="w-5 h-5 text-blue-600" />;
  };

  const getFileColor = (fileType: string) => {
    switch (fileType) {
      case 'PDF':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'DOCX':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'XLSX':
        return 'bg-green-50 text-green-700 border-green-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl">{documentName}</h2>
          <p className="text-gray-600">{documents.length} documents stored</p>
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="divide-y">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="p-4 hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-center gap-4">
                {/* File Icon */}
                <div className="p-3 bg-blue-50 rounded-lg flex-shrink-0">
                  {getFileIcon(doc.fileType)}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-gray-900 truncate">
                      {doc.fileName}
                    </p>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded border ${getFileColor(
                        doc.fileType
                      )}`}
                    >
                      {doc.fileType}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      {doc.uploadedBy}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(doc.uploadDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span>{doc.fileSize}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-2 hover:bg-blue-50 rounded-lg transition-colors text-blue-600">
                    <Eye className="w-5 h-5" />
                  </button>
                  <button className="p-2 hover:bg-green-50 rounded-lg transition-colors text-green-600">
                    <Download className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Empty State (if no documents) */}
      {documents.length === 0 && (
        <div className="bg-white rounded-xl border shadow-sm p-12 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">No documents found</p>
          <p className="text-sm text-gray-400">
            Documents will appear here once they are uploaded
          </p>
        </div>
      )}
    </div>
  );
}
