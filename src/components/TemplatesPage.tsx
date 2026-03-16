import { useMemo, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { QUALITY_RECORDS } from '../data/qualityRecords';

interface User {
  id: string;
  email: string;
  name: string;
  accessToken: string;
  role: 'staff' | 'hod' | 'principal';
  department: 'CSE' | 'IT' | 'ALL';
}

interface TemplatesPageProps {
  user: User;
}

const TEMPLATE_BUCKET = 'audit_templates';

export function TemplatesPage({ user }: TemplatesPageProps) {
  const [search, setSearch] = useState('');
  const [workingKey, setWorkingKey] = useState<string | null>(null);

  const canUploadTemplate = user.role === 'hod' || user.role === 'principal';

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return QUALITY_RECORDS;
    return QUALITY_RECORDS.filter((record) => {
      return (
        record.fileNumber.toLowerCase().includes(query) ||
        record.fileName.toLowerCase().includes(query)
      );
    });
  }, [search]);

  const handleDownload = async (fileNumber: string, fileName: string) => {
    setWorkingKey(fileNumber);
    try {
      const { data: folderFiles, error: listError } = await supabase.storage
        .from(TEMPLATE_BUCKET)
        .list(fileNumber, {
          limit: 20,
          sortBy: { column: 'updated_at', order: 'desc' },
        });

      if (listError) {
        alert(`Failed to list templates: ${listError.message}`);
        return;
      }

      const templateFile = (folderFiles || []).find((item) => item.name && !item.name.startsWith('.'));

      let fullPath: string | null = null;
      if (templateFile) {
        fullPath = `${fileNumber}/${templateFile.name}`;
      } else {
        const { data: rootFiles, error: rootListError } = await supabase.storage
          .from(TEMPLATE_BUCKET)
          .list('', {
            limit: 100,
            sortBy: { column: 'updated_at', order: 'desc' },
          });

        if (rootListError) {
          alert(`Failed to list root templates: ${rootListError.message}`);
          return;
        }

        const normalizedFileName = fileName.toLowerCase();
        const rootMatch = (rootFiles || []).find((item) => {
          const candidate = (item.name || '').toLowerCase();
          return candidate.includes(fileNumber.toLowerCase()) || candidate.includes(normalizedFileName);
        });

        if (rootMatch) {
          fullPath = rootMatch.name;
        }
      }

      if (!fullPath) {
        alert('No template uploaded yet for this file number.');
        return;
      }

      const { data: signed, error: signError } = await supabase.storage
        .from(TEMPLATE_BUCKET)
        .createSignedUrl(fullPath, 60);

      if (signError || !signed?.signedUrl) {
        alert('Failed to generate template download link.');
        return;
      }

      window.open(signed.signedUrl, '_blank');
    } finally {
      setWorkingKey(null);
    }
  };

  const handleUpload = async (fileNumber: string, file: File | null) => {
    if (!file) return;
    setWorkingKey(fileNumber);
    try {
      const safeName = file.name.replace(/[^\w.\-()]/g, '_');
      const path = `${fileNumber}/${Date.now()}-${safeName}`;
      const { error } = await supabase.storage.from(TEMPLATE_BUCKET).upload(path, file, {
        upsert: true,
      });

      if (error) {
        alert(`Template upload failed: ${error.message}`);
        return;
      }

      alert('Template uploaded successfully.');
    } finally {
      setWorkingKey(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Templates</h2>
        <p className="text-sm text-slate-600 mt-1">
          Download official templates and upload updated versions for each quality record file number.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <input
          type="text"
          placeholder="Search by file number or file name"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="max-h-[68vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
              <tr className="text-left text-slate-600">
                <th className="px-4 py-3 font-medium">File Number</th>
                <th className="px-4 py-3 font-medium">File Name</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => (
                <tr key={record.fileNumber} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-900">{record.fileNumber}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{record.fileName}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDownload(record.fileNumber, record.fileName)}
                        disabled={workingKey === record.fileNumber}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                      {canUploadTemplate ? (
                        <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-blue-300 text-blue-700 hover:bg-blue-50 cursor-pointer transition-colors">
                          <Upload className="w-4 h-4" />
                          Upload
                          <input
                            type="file"
                            className="hidden"
                            accept=".doc,.docx,.pdf"
                            onChange={(event) => {
                              const file = event.target.files?.[0] ?? null;
                              void handleUpload(record.fileNumber, file);
                              event.currentTarget.value = '';
                            }}
                          />
                        </label>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
