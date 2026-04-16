import { useEffect, useMemo, useRef, useState } from 'react';
import pdfCompressor from 'pdf-compressor';
// Helper to compress PDF files using pdf-compressor
async function compressPdfFile(file: File): Promise<File> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const compressedBuffer = await pdfCompressor(arrayBuffer);
    // Create a new File object with the compressed data
    return new File([compressedBuffer], file.name, { type: file.type });
  } catch (error) {
    console.error('PDF compression failed:', error);
    // If compression fails, return the original file
    return file;
  }
}
import { CheckCircle, FileText, Upload, X, FileWarning } from 'lucide-react';
import Lottie, { LottieRefCurrentProps } from 'lottie-react';
import mammoth from 'mammoth';
import { createWorker } from 'tesseract.js';
import { projectId } from '../utils/supabase/info';
import { supabase } from '../utils/supabase/client';
import { QUALITY_RECORDS, findQualityRecord, type QualityRecord } from '../data/qualityRecords';
import successAnimation from '../assets/successfully-done.json';
import warningAnimation from '../assets/warning.json';

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
  department: 'CSE' | 'IT' | 'BIO' | 'CHEM' | 'AIDS' | 'MECH' | 'ALL';
}

interface FormBasedUploadProps {
  user?: User;
}

const MAX_UPLOAD_SIZE_MB = 8;
const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;
const ALLOWED_FILE_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt', '.png', '.jpg', '.jpeg'];
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/png',
  'image/jpeg',
]);

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
  const [statusCard, setStatusCard] = useState<UploadFeedback | null>(null);
  const [isDragging, setIsDragging] = useState(false); // State for drag-and-drop visual feedback
  const [prefillHint, setPrefillHint] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.department && user.department !== 'ALL') {
      setFormData((prev) => ({ ...prev, department: user.department }));
    }
  }, [user?.department]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('auditx_upload_prefill');
      if (!raw) return;
      const parsed = JSON.parse(raw) as { fileNumber?: string; fileName?: string };
      const nextRecordNumber = (parsed.fileNumber || '').trim();
      if (!nextRecordNumber) return;
      setFormData((prev) => ({
        ...prev,
        recordNumber: nextRecordNumber,
      }));
      if (parsed.fileName) {
        setPrefillHint(`Prefilled from pending list: ${parsed.fileNumber} - ${parsed.fileName}`);
      } else {
        setPrefillHint(`Prefilled from pending list: ${parsed.fileNumber}`);
      }
      sessionStorage.removeItem('auditx_upload_prefill');
    } catch {
      sessionStorage.removeItem('auditx_upload_prefill');
    }
  }, []);

  const selectedRecord = useMemo(
    () => findQualityRecord(formData.recordNumber),
    [formData.recordNumber]
  );

  const sanitizePathPart = (value: string) => value.replace(/[^\w.-]/g, '_');
  const getLowerName = (file: File) => file.name.toLowerCase();

  const validateUploadFile = (file: File) => {
    if (file.size <= 0) return 'Selected file is empty.';
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      return `File exceeds ${MAX_UPLOAD_SIZE_MB} MB limit.`;
    }

    const lowerName = getLowerName(file);
    const hasAllowedExtension = ALLOWED_FILE_EXTENSIONS.some((extension) =>
      lowerName.endsWith(extension)
    );
    const hasAllowedMime = ALLOWED_MIME_TYPES.has((file.type || '').toLowerCase());
    if (!hasAllowedExtension && !hasAllowedMime) {
      return 'Unsupported file type. Use PDF, DOC, DOCX, TXT, PNG, JPG, or JPEG.';
    }

    return null;
  };

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

  const handleAddToQueue = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.file || !selectedRecord || !formData.department) return;
    let fileToAdd = formData.file;
    // If PDF, compress before adding to queue
    if (fileToAdd.type === 'application/pdf' || fileToAdd.name.toLowerCase().endsWith('.pdf')) {
      fileToAdd = await compressPdfFile(fileToAdd);
    }
    const validationError = validateUploadFile(fileToAdd);
    if (validationError) {
      setFeedback({ type: 'error', message: validationError });
      return;
    }

    const queueItem: QueueItem = {
      id: crypto.randomUUID(),
      record: selectedRecord,
      notes: formData.notes,
      department: formData.department,
      file: fileToAdd,
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

  // --- Drag and Drop Handlers ---
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      setFormData((prev) => ({ ...prev, file: droppedFiles[0] }));
    }
  };
  // --- End Drag and Drop Handlers ---

  const removeFromQueue = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const showTimedStatusCard = (nextFeedback: UploadFeedback) => {
    setStatusCard(nextFeedback);
  };

  const uploadAll = async () => {
    if (!user?.accessToken) {
      setFeedback({ type: 'error', message: 'Login required before uploading files.' });
      return;
    }

    setUploading(true);
    setUploadSuccess(false);
    setFeedback(null);
    setStatusCard(null);

    try {
      const successMessages: string[] = [];
      const rejectedMessages: string[] = [];
      const rejectedReasons: string[] = [];

      for (const item of queue) {
        const validationError = validateUploadFile(item.file);
        if (validationError) {
          setFeedback({
            type: 'error',
            message: `${item.record.fileNumber}: ${validationError}`,
          });
          return;
        }

        const filePath = [
          item.department,
          user.id,
          `${sanitizePathPart(item.record.fileNumber)}-${Date.now()}-${sanitizePathPart(item.file.name)}`,
        ].join('/');
        let uploadedToStorage = false;

        try {
          const { error: storageError } = await supabase.storage
            .from('audit_files')
            .upload(filePath, item.file, { upsert: false });

          if (storageError) {
            setFeedback({ type: 'error', message: `Storage upload failed: ${storageError.message}` });
            return;
          }
          uploadedToStorage = true;

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
            if (uploadedToStorage) {
              await supabase.storage.from('audit_files').remove([filePath]);
            }
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
        } catch (error: unknown) {
          if (uploadedToStorage) {
            await supabase.storage.from('audit_files').remove([filePath]);
          }
          const message = error instanceof Error ? error.message : 'Unexpected error';
          setFeedback({
            type: 'error',
            message: `Upload failed for ${item.record.fileNumber}: ${message}`,
          });
          return;
        }
      }

      setQueue([]);
      if (successMessages.length > 0) {
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 3000);
      }

      if (rejectedMessages.length > 0 && successMessages.length > 0) {
        const nextFeedback = {
          type: 'warning',
          message: `${successMessages.join(' ')} ${rejectedMessages.join(' ')}`.trim(),
          details: rejectedReasons,
        } satisfies UploadFeedback;
        setFeedback(nextFeedback);
        showTimedStatusCard(nextFeedback);
      } else if (rejectedMessages.length > 0) {
        const nextFeedback = {
          type: 'warning',
          message: rejectedMessages.join(' '),
          details: rejectedReasons,
        } satisfies UploadFeedback;
        setFeedback(nextFeedback);
        showTimedStatusCard(nextFeedback);
      } else {
        const nextFeedback = {
          type: 'success',
          message: successMessages.join(' '),
        } satisfies UploadFeedback;
        setFeedback(nextFeedback);
        showTimedStatusCard(nextFeedback);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unexpected error';
      setFeedback({ type: 'error', message: `Upload failed: ${message}` });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 upload-page">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <form onSubmit={handleAddToQueue} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
            <h3 className="font-semibold text-xl tracking-tight text-slate-900">Add Record File</h3>
            {prefillHint ? (
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                {prefillHint}
              </div>
            ) : null}

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
                <option value="BIO">BIO</option>
                <option value="CHEM">CHEM</option>
                <option value="AIDS">AIDS</option>
                <option value="MECH">MECH</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Upload File *</label>
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

              {/* New Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()} // Allow clicking the zone to open file dialog
                className={`
                  mt-3 flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed cursor-pointer
                  transition-all duration-200 ease-in-out
                  ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:border-blue-400'}
                `}
              >
                <div className={`p-3 rounded-full ${isDragging ? 'bg-blue-100' : 'bg-slate-200'}`}>
                  <Upload className={`w-6 h-6 ${isDragging ? 'text-blue-600' : 'text-slate-500'}`} />
                </div>
                <p className="mt-3 text-sm font-medium text-slate-700">
                  {formData.file ? (
                    <span className="flex items-center gap-2">
                      <FileText className="w-4 h-4" /> {formData.file.name}
                    </span>
                  ) : (
                    <>
                      Drag & drop your file here, or <span className="text-blue-600 hover:underline">browse</span>
                    </>
                  )}
                </p>
                {formData.file && (
                  <p className="text-xs text-slate-500 mt-1">
                    ({(formData.file.size / (1024 * 1024)).toFixed(2)} MB)
                  </p>
                )}
              </div>
              {/* End New Drag and Drop Zone */}
              <p className="mt-2 text-xs text-slate-500">
                Allowed: PDF, DOC, DOCX, TXT, PNG, JPG, JPEG. Max {MAX_UPLOAD_SIZE_MB} MB.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={async (event) => {
                  let file = event.target.files?.[0] ?? null;
                  // If PDF, compress before setting in form
                  if (file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
                    file = await compressPdfFile(file);
                  }
                  setFormData((prev) => ({ ...prev, file }));
                }}
                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
              />
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-2">Notes (optional)</label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none resize-none transition"
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
                disabled={!formData.recordNumber || !formData.department || !formData.file || uploading}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed shadow-sm"
              >
                Add to Queue
              </button>
            </div>
          </form>
        </div>

        <div className="lg:col-span-1">
          {statusCard && (statusCard.type === 'success' || statusCard.type === 'warning') ? (
            <div
              className={`mb-4 rounded-2xl border p-4 shadow-[0_18px_40px_rgba(15,23,42,0.14)] transition-transform duration-200 hover:-translate-y-0.5 ${
                statusCard.type === 'success'
                  ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white'
                  : 'border-amber-200 bg-gradient-to-br from-amber-50 to-white'
              }`}
            >
              <div className="mb-2 flex justify-end">
                <button
                  type="button" // Changed to type="button" to prevent form submission
                  aria-label="Close status card"
                  onClick={() => setStatusCard(null)}
                  className="rounded-md p-1 text-slate-500 hover:bg-white hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-20 w-20 shrink-0 rounded-xl bg-white/80 p-1 shadow-inner flex items-center justify-center">
                  <Lottie
                    animationData={statusCard.type === 'success' ? successAnimation : warningAnimation}
                    loop={false}
                    autoplay
                    style={{ height: '100%', width: '100%' }}
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">
                    {statusCard.type === 'success' ? 'File Verified by System' : 'File Rejected by System'}
                  </p>
                  <p className="mt-1 text-xs text-slate-700">
                    {statusCard.message}
                  </p>
                  <ul className="mt-2 text-xs text-slate-600 list-disc pl-4 space-y-0.5">
                    {statusCard.details?.map((detail, idx) => (
                      <li key={idx}>
                        <FileWarning className="inline-block w-3 h-3 mr-1 text-red-500" /> {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : null}

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
                  {queue.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 hover:bg-slate-50 group"
                    >
                      {/* Enhanced Queue Item Display */}
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
                      {/* End Enhanced Queue Item Display */}
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

          {feedback && feedback.type === 'error' ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
              <div>{feedback.message}</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}













