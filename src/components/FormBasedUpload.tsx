import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle, FileText, Upload, X } from 'lucide-react';
import mammoth from 'mammoth';
import { createWorker } from 'tesseract.js';
import { projectId } from '../utils/supabase/info';
import { supabase } from '../utils/supabase/client';
import { QUALITY_RECORDS, findQualityRecord, type QualityRecord } from '../data/qualityRecords';

interface UploadFormData {
  recordNumber: string;
  department: string;
  notes: string;
  file: File | null;
}

interface QueueItem {
  id: string;
  record: QualityRecord;
  notes: string;
  department: string;
  file: File;
}

interface UploadFeedback {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  details?: string[];
}

interface User {
  id: string;
  email: string;
  name: string;
  accessToken: string;
  role: 'staff' | 'hod' | 'principal';
  department: 'CSE' | 'IT' | 'ALL';
}

interface FormBasedUploadProps {
  user?: User;
}

export function FormBasedUpload({ user }: FormBasedUploadProps) {
  const [formData, setFormData] = useState<UploadFormData>({
    recordNumber: '',
    department: '',
    notes: '',
    file: null,
  });
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [feedback, setFeedback] = useState<UploadFeedback | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.department && user.department !== 'ALL') {
      setFormData((prev) => ({ ...prev, department: user.department }));
    }
  }, [user?.department]);

  const selectedRecord = useMemo(
    () => findQualityRecord(formData.recordNumber),
    [formData.recordNumber]
  );

  const sanitizePathPart = (value: string) => value.replace(/[^\w.-]/g, '_');

  const extractDocxText = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return result.value || '';
  };

  const extractPdfText = async (file: File) => {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.mjs',
      import.meta.url
    ).toString();
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: buffer }).promise;
    const pages: string[] = [];

    for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
      const page = await pdf.getPage(pageIndex);
      const content = await page.getTextContent();
      const text = content.items.map((item) => ('str' in item ? item.str : '')).join(' ');
      pages.push(text);
    }

    return pages.join('\n');
  };

  const extractImageText = async (file: File) => {
    const worker = await createWorker('eng');
    try {
      const imageUrl = URL.createObjectURL(file);
      const result = await worker.recognize(imageUrl);
      URL.revokeObjectURL(imageUrl);
      return result.data.text || '';
    } finally {
      await worker.terminate();
    }
  };

  const extractTextFromFile = async (file: File) => {
    const fileType = file.type.toLowerCase();
    const lowerName = file.name.toLowerCase();

    try {
      if (
        fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        lowerName.endsWith('.docx') ||
        lowerName.endsWith('.doc')
      ) {
        return await extractDocxText(file);
      }
      if (fileType === 'application/pdf' || lowerName.endsWith('.pdf')) {
        return await extractPdfText(file);
      }
      if (fileType === 'text/plain' || lowerName.endsWith('.txt')) {
        return await file.text();
      }
      if (
        fileType.startsWith('image/') ||
        lowerName.endsWith('.png') ||
        lowerName.endsWith('.jpg') ||
        lowerName.endsWith('.jpeg')
      ) {
        return await extractImageText(file);
      }
    } catch (error) {
      console.error('Text extraction failed:', error);
      return '';
    }

    return '';
  };

  const handleAddToQueue = (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.file || !selectedRecord || !formData.department) return;

    const queueItem: QueueItem = {
      id: crypto.randomUUID(),
      record: selectedRecord,
      notes: formData.notes,
      department: formData.department,
      file: formData.file,
    };

    setQueue((prev) => [...prev, queueItem]);
    setFormData({
      recordNumber: '',
      department: user?.department && user.department !== 'ALL' ? user.department : '',
      notes: '',
      file: null,
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFromQueue = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const uploadAll = async () => {
    if (!user?.accessToken) {
      setFeedback({ type: 'error', message: 'Login required before uploading files.' });
      return;
    }

    setUploading(true);
    setUploadSuccess(false);
    setFeedback(null);

    try {
      const successMessages: string[] = [];
      const rejectedMessages: string[] = [];
      const rejectedReasons: string[] = [];

      for (const item of queue) {
        const filePath = [
          item.department,
          user.id,
          `${sanitizePathPart(item.record.fileNumber)}-${Date.now()}-${sanitizePathPart(item.file.name)}`,
        ].join('/');

        const { error: storageError } = await supabase.storage
          .from('audit_files')
          .upload(filePath, item.file, { upsert: false });

        if (storageError) {
          setFeedback({ type: 'error', message: `Storage upload failed: ${storageError.message}` });
          return;
        }

        const extractedText = await extractTextFromFile(item.file);
        const description = [
          `Record: ${item.record.fileName}`,
          item.record.content.length > 0 ? `Expected: ${item.record.content.join(', ')}` : '',
          item.notes ? `Notes: ${item.notes}` : '',
        ]
          .filter(Boolean)
          .join('\n');

        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-b9eb9a31/files/upload`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${user.accessToken}`,
            },
            body: JSON.stringify({
              fileName: `${item.record.fileNumber} - ${item.record.fileName}`,
              fileCategory: item.record.fileNumber,
              expectedCategoryName: item.record.fileName,
              fileDescription: description,
              extractedText,
              templateChecklist: item.record.content,
              fileType: item.file.type || 'application/octet-stream',
              fileSize: item.file.size || 0,
              filePath,
              fileBucket: 'audit_files',
              department: item.department,
              studentName: null,
              studentRecordType: null,
            }),
          }
        );

        const result = await response.json();
        if (!response.ok) {
          setFeedback({
            type: 'error',
            message: `Upload failed for ${item.record.fileNumber}: ${result.error || 'Unknown error'}`,
          });
          return;
        }

        if (result?.verification?.autoRejected) {
          const details = Array.isArray(result.verification.reasons)
            ? result.verification.reasons.filter((item: unknown) => typeof item === 'string')
            : [];
          rejectedMessages.push(
            `${item.record.fileNumber} was auto-rejected. Similarity ${(
              result.verification.similarity * 100
            ).toFixed(2)}%, category relevance ${(
              (result.verification.categoryRelevance ?? 0) * 100
            ).toFixed(2)}%.`
          );
          rejectedReasons.push(...details);
          continue;
        } else if (result?.verification) {
          successMessages.push(
            `${item.record.fileNumber} passed system check. Similarity ${(
              result.verification.similarity * 100
            ).toFixed(2)}%, category relevance ${(
              (result.verification.categoryRelevance ?? 0) * 100
            ).toFixed(2)}%. Sent to HoD review.`
          );
        } else {
          successMessages.push(`${item.record.fileNumber} uploaded. System check unavailable for this file.`);
        }
      }

      setQueue([]);
      if (successMessages.length > 0) {
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 3000);
      }

      if (rejectedMessages.length > 0 && successMessages.length > 0) {
        setFeedback({
          type: 'warning',
          message: `${successMessages.join(' ')} ${rejectedMessages.join(' ')}`.trim(),
          details: rejectedReasons,
        });
      } else if (rejectedMessages.length > 0) {
        setFeedback({
          type: 'warning',
          message: rejectedMessages.join(' '),
          details: rejectedReasons,
        });
      } else {
        setFeedback({
          type: 'success',
          message: successMessages.join(' '),
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unexpected error';
      setFeedback({ type: 'error', message: `Upload failed: ${message}` });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {feedback ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm shadow-sm ${
            feedback.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : feedback.type === 'warning'
              ? 'border-amber-200 bg-amber-50 text-amber-800'
              : feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-blue-200 bg-blue-50 text-blue-700'
          }`}
        >
          <div>{feedback.message}</div>
          {feedback.details && feedback.details.length > 0 ? (
            <ul className="mt-2 list-disc pl-5 space-y-1 text-xs">
              {feedback.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <form onSubmit={handleAddToQueue} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
            <h3 className="font-semibold text-xl tracking-tight text-slate-900">Add Record File</h3>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Quality Record *</label>
              <select
                value={formData.recordNumber}
                onChange={(event) => setFormData((prev) => ({ ...prev, recordNumber: event.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                required
              >
                <option value="">Select file number</option>
                {QUALITY_RECORDS.map((record) => (
                  <option key={record.fileNumber} value={record.fileNumber}>
                    {record.fileNumber} - {record.fileName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Department *</label>
              <select
                value={formData.department}
                onChange={(event) => setFormData((prev) => ({ ...prev, department: event.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                required
                disabled={user?.department !== 'ALL'}
              >
                <option value="">Select department</option>
                <option value="CSE">CSE</option>
                <option value="IT">IT</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">File *</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-2 border border-slate-200"
                >
                  <Upload className="w-4 h-4" />
                  Choose File
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setFormData((prev) => ({ ...prev, file }));
                }}
                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Notes (optional)</label>
              <textarea
                value={formData.notes}
                onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none transition"
                rows={3}
                placeholder="Add note for reviewer"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    recordNumber: '',
                    department: user?.department && user.department !== 'ALL' ? user.department : '',
                    notes: '',
                    file: null,
                  });
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="px-6 py-2 text-slate-700 hover:bg-slate-100 rounded-xl transition-colors border border-transparent hover:border-slate-200"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={!formData.recordNumber || !formData.department || !formData.file}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed shadow-sm"
              >
                Add to Queue
              </button>
            </div>
          </form>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm sticky top-6">
            <div className="p-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900">Upload Queue ({queue.length})</h3>
            </div>
            {queue.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No files queued</p>
              </div>
            ) : (
              <>
                <div className="divide-y max-h-96 overflow-y-auto">
                  {queue.map((item, index) => (
                    <div
                      key={item.id}
                      className="p-3 hover:bg-slate-50 group animate-in fade-in slide-in-from-bottom-2"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-start gap-2">
                        <FileText className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.record.fileNumber}</p>
                          <p className="text-xs text-slate-500 truncate">{item.record.fileName}</p>
                        </div>
                        <button
                          onClick={() => removeFromQueue(item.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 rounded transition-all"
                        >
                          <X className="w-4 h-4 text-slate-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-slate-200 bg-slate-50">
                  <button
                    onClick={uploadAll}
                    disabled={uploading}
                    className="w-full px-4 py-2.5 rounded-xl transition shadow-sm font-medium disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: uploading ? '#e2e8f0' : '#2563eb',
                      color: uploading ? '#334155' : '#ffffff',
                      border: uploading ? '1px solid #cbd5e1' : '1px solid #2563eb',
                    }}
                  >
                    {uploading ? 'Uploading...' : 'Upload All'}
                  </button>
                </div>
                {uploadSuccess ? (
                  <div className="p-4 bg-green-100 text-green-800 border-t border-green-200">
                    <CheckCircle className="w-4 h-4 mr-2 inline-block" />
                    Upload complete.
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
