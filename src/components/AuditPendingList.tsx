import { AlertCircle, CheckCircle2, CircleHelp, Sparkles } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { projectId } from '../utils/supabase/info';
import { QUALITY_RECORDS } from '../data/qualityRecords';
import { HoverCard, HoverCardContent, HoverCardTrigger } from './ui/hover-card';

interface User {
  id: string;
  email: string;
  name: string;
  accessToken: string;
  role: 'staff' | 'hod' | 'principal';
  department: 'CSE' | 'IT' | 'BIO' | 'CHEM' | 'AIDS' | 'MECH' | 'ALL';
}

interface AuditPendingListProps {
  user?: User;
  onAddNow?: (fileNumber: string, fileName: string) => void;
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

export function AuditPendingList({ user, onAddNow }: AuditPendingListProps) {
  const [allFiles, setAllFiles] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openChecklistFor, setOpenChecklistFor] = useState<string | null>(null);

  useEffect(() => {
    if (user?.accessToken) {
      fetchPendingFiles();
    }
  }, [user]);

  const fetchPendingFiles = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b9eb9a31/files/list`,
        {
          headers: {
            Authorization: `Bearer ${user?.accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAllFiles(data.files || []);
      }
    } catch (error) {
      console.error('Error fetching pending files:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadedCategories = useMemo(
    () => new Set(allFiles.map((item) => (item.fileCategory || '').trim()).filter(Boolean)),
    [allFiles]
  );

  const missingRecords = useMemo(
    () => QUALITY_RECORDS.filter((record) => !uploadedCategories.has(record.fileNumber)),
    [uploadedCategories]
  );

  const pendingCount = useMemo(
    () => allFiles.filter((item) => (item.status || 'pending') === 'pending').length,
    [allFiles]
  );

  return (
    <div className="space-y-6 pending-page">
      <style>{`
        @keyframes twinkleDot {
          0%, 100% { transform: scale(0.85); opacity: 0.4; box-shadow: 0 0 0 rgba(239, 68, 68, 0); }
          50% { transform: scale(1.16); opacity: 1; box-shadow: 0 0 14px rgba(239, 68, 68, 0.45); }
        }
      `}</style>
      <div>
        <h2 className="text-2xl font-semibold text-slate-900 mb-1">Audit Pending / Missed List</h2>
        <p className="text-slate-600">
          Required files that are still not uploaded to the system
        </p>
      </div>

      <div className="rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50 via-orange-50 to-rose-50 p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl border border-rose-200 bg-white flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Total Missing Files</p>
              <p className="text-lg font-semibold text-slate-900">Files requiring immediate upload</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-rose-600">{loading ? '...' : missingRecords.length}</p>
            <p className="text-xs text-slate-500">
              {pendingCount} awaiting verification
            </p>
          </div>
        </div>
      </div>

      <div className="panel-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-600">Checking missing files...</div>
        ) : missingRecords.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">All Required Files Uploaded</h3>
            <p className="text-slate-600">Great work. Nothing is missing right now.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {missingRecords.map((record, index) => (
              <div key={record.fileNumber} className="p-4 md:p-5 hover:bg-slate-50/70 transition-colors file-row-line">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="flex gap-3 min-w-0 flex-1">
                    <div
                      className="mt-1 h-3 w-3 rounded-full shrink-0 bg-rose-500"
                      style={{
                        animation: 'twinkleDot 1.5s ease-in-out infinite',
                        animationDelay: `${(index % 6) * 0.12}s`,
                      }}
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{record.fileNumber}</h3>
                        <span className="px-2 py-0.5 text-xs rounded-full border border-rose-200 bg-rose-50 text-rose-700">
                          Missing
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 mt-1 hud-name-with-line"><span>{record.fileName}</span></p>
                      <div className="mt-2">
                        <HoverCard
                          openDelay={120}
                          closeDelay={120}
                          open={openChecklistFor === record.fileNumber}
                          onOpenChange={(nextOpen) =>
                            setOpenChecklistFor(nextOpen ? record.fileNumber : null)
                          }
                        >
                          <HoverCardTrigger asChild>
                            <button
                              type="button"
                              onClick={() =>
                                setOpenChecklistFor((prev) =>
                                  prev === record.fileNumber ? null : record.fileNumber
                                )
                              }
                              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-blue-700"
                            >
                              Expected checklist items: {record.content.length}
                              <CircleHelp className="h-3.5 w-3.5 text-slate-400" />
                            </button>
                          </HoverCardTrigger>
                          <HoverCardContent
                            side="top"
                            align="start"
                            sideOffset={8}
                            className="z-[140] w-80 max-w-[92vw] border border-slate-200 bg-white p-3 shadow-xl"
                          >
                            <p className="text-xs font-semibold text-slate-800 mb-2">
                              Expected Items ({record.content.length})
                            </p>
                            {record.content.length > 0 ? (
                              <ul className="max-h-52 overflow-y-auto space-y-1 text-xs text-slate-700 list-disc pl-4">
                                {record.content.map((item) => (
                                  <li key={item}>{item}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-slate-500">No checklist items configured.</p>
                            )}
                          </HoverCardContent>
                        </HoverCard>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-start shrink-0">
                    <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 text-xs">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Upload needed
                    </div>
                    <button
                      type="button"
                      onClick={() => onAddNow?.(record.fileNumber, record.fileName)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-cyan-300 bg-cyan-500/20 text-cyan-100 hover:bg-cyan-500/30 transition-colors font-semibold"
                    >
                      Add now
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



