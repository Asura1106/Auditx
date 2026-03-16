import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', logger(console.log));

// Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

type UserRole = 'staff' | 'hod' | 'principal';
type Department = 'CSE' | 'IT' | 'ALL';

const ALLOWED_USERS: Record<string, { role: UserRole; department: Department; name: string }> = {
  'principalspcet@gmail.com': { role: 'principal', department: 'ALL', name: 'Principal' },
  'csestaff-1@gmail.com': { role: 'staff', department: 'CSE', name: 'CSE Staff 1' },
  'csestaff-2@gmail.com': { role: 'staff', department: 'CSE', name: 'CSE Staff 2' },
  'csestaff-3@gmail.com': { role: 'staff', department: 'CSE', name: 'CSE Staff 3' },
  'itstaff-1@gmail.com': { role: 'staff', department: 'IT', name: 'IT Staff 1' },
  'itstaff-2@gmail.com': { role: 'staff', department: 'IT', name: 'IT Staff 2' },
  'itstaff-3@gmail.com': { role: 'staff', department: 'IT', name: 'IT Staff 3' },
  'csehod@gmail.com': { role: 'hod', department: 'CSE', name: 'CSE HOD' },
  'ithod@gmail.com': { role: 'hod', department: 'IT', name: 'IT HOD' },
};

const normalizeEmail = (email?: string | null) => (email ?? '').toLowerCase();

const getAllowedProfile = (email?: string | null) => {
  const normalized = normalizeEmail(email);
  return ALLOWED_USERS[normalized] ?? null;
};

type FileRow = {
  id: string;
  user_id: string;
  file_name: string;
  file_category: string;
  file_description: string | null;
  file_type: string | null;
  file_size: number | null;
  file_path: string | null;
  file_bucket: string | null;
  student_name: string | null;
  student_record_type: string | null;
  department: string;
  status: string;
  uploaded_by: string | null;
  uploaded_at: string;
};

type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  message: string;
  read: boolean;
  created_at: string;
};

type AuditSettingRow = {
  id: string;
  title: string;
  deadline: string;
  updated_at: string;
};

type EqCapable<T> = {
  eq: (column: string, value: string) => T;
};

const applyScopeFilters = <T extends EqCapable<T>>(
  query: T,
  role: UserRole,
  department: Department,
  userId: string
) => {
  if (role === 'principal') return query;
  if (role === 'hod') {
    return query.eq('department', department);
  }
  return query.eq('user_id', userId);
};

const mapFileRow = (row: FileRow) => ({
  id: row.id,
  userId: row.user_id,
  fileName: row.file_name,
  fileCategory: row.file_category,
  fileDescription: row.file_description,
  fileType: row.file_type,
  fileSize: row.file_size,
  filePath: row.file_path,
  fileBucket: row.file_bucket,
  studentName: row.student_name,
  studentRecordType: row.student_record_type,
  department: row.department,
  status: row.status,
  uploadedAt: row.uploaded_at,
  uploadedBy: row.uploaded_by,
});

const mapNotificationRow = (row: NotificationRow) => ({
  id: row.id,
  type: row.type,
  message: row.message,
  timestamp: row.created_at,
  read: row.read,
});

const mapAuditSettingRow = (row: AuditSettingRow) => ({
  id: row.id,
  title: row.title,
  deadline: row.deadline,
  updatedAt: row.updated_at,
});

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return String(error);
};

type VerificationRiskLevel = 'PASS' | 'SOFT_FLAG' | 'STRONG_FLAG';

type VerificationFeatureRow = {
  document_id: string;
  header_ok: boolean;
  circular_ok: boolean;
  minutes_ok: boolean;
  agenda_count: number;
  discussion_rows: number;
  subject_count: number;
  subject_code_order_hash: string;
  progressive_text: string;
  content_fingerprint: string;
  created_at?: string;
};

type VerificationResultRow = {
  id: string;
  document_id: string;
  compared_document_id: string | null;
  progression_similarity: number;
  risk_score: number;
  risk_level: VerificationRiskLevel;
  reasons: string[] | string;
  created_at: string;
};

const REQUIRED_TEMPLATE_MARKERS = [
  'department of computer science and engineering',
  'circular',
  'minutes of class committee meeting',
];
const AUTO_REJECT_THRESHOLD = 0.5;
const CATEGORY_MATCH_THRESHOLD = 0.7;

const normalizeText = (value?: string | null) =>
  (value ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const countMatches = (value: string, regex: RegExp) => {
  const matches = value.match(regex);
  return matches ? matches.length : 0;
};

const hashString = (value: string) => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
};

const tokenize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2);

const termFrequency = (tokens: string[]) => {
  const frequency = new Map<string, number>();
  tokens.forEach((token) => {
    frequency.set(token, (frequency.get(token) ?? 0) + 1);
  });
  return frequency;
};

const uniqueTokens = (value: string) => Array.from(new Set(tokenize(value)));

const tfIdfCosineSimilarity = (left: string, right: string) => {
  const leftTokens = tokenize(left);
  const rightTokens = tokenize(right);
  if (leftTokens.length === 0 || rightTokens.length === 0) return 0;

  const leftTf = termFrequency(leftTokens);
  const rightTf = termFrequency(rightTokens);
  const vocabulary = new Set<string>([...leftTf.keys(), ...rightTf.keys()]);
  const totalDocs = 2;

  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  vocabulary.forEach((term) => {
    const documentFrequency = (leftTf.has(term) ? 1 : 0) + (rightTf.has(term) ? 1 : 0);
    const idf = Math.log((totalDocs + 1) / (documentFrequency + 1)) + 1;

    const leftWeight = (leftTf.get(term) ?? 0) * idf;
    const rightWeight = (rightTf.get(term) ?? 0) * idf;

    dot += leftWeight * rightWeight;
    leftNorm += leftWeight * leftWeight;
    rightNorm += rightWeight * rightWeight;
  });

  if (leftNorm === 0 || rightNorm === 0) return 0;
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
};

const diffDays = (currentIso: string, previousIso: string) => {
  const currentDate = new Date(currentIso).getTime();
  const previousDate = new Date(previousIso).getTime();
  if (Number.isNaN(currentDate) || Number.isNaN(previousDate)) return 0;
  return Math.max(0, Math.floor((currentDate - previousDate) / (1000 * 60 * 60 * 24)));
};

const extractVerificationFeatures = (
  fileRow: FileRow,
  extractedTextOverride?: string | null
): VerificationFeatureRow => {
  const source = normalizeText(
    [
      fileRow.file_name,
      fileRow.file_description,
      fileRow.file_category,
      fileRow.student_name,
      fileRow.student_record_type,
    ]
      .filter(Boolean)
      .join(' ')
  );

  const headerOk = REQUIRED_TEMPLATE_MARKERS.every((marker) => source.includes(marker));
  const circularOk = source.includes('circular');
  const minutesOk = source.includes('minutes');
  const agendaCount = countMatches(source, /\bagenda\b/g);
  const discussionRows = countMatches(source, /\bpoints?\s+discussed\b/g);
  const subjectCodes = source.match(/\b\d{2}[a-z]{2}\d[a-z]\d{3}\b/g) ?? [];
  const subjectCount = subjectCodes.length;
  const subjectCodeOrderHash = hashString(subjectCodes.join('|'));
  const progressiveText = normalizeText(
    extractedTextOverride ||
      [
        fileRow.file_description,
        fileRow.file_name,
        fileRow.file_category,
        fileRow.student_name,
        fileRow.student_record_type,
      ]
        .filter(Boolean)
        .join(' ')
  );
  const contentFingerprint = hashString(
    `${agendaCount}|${discussionRows}|${subjectCount}|${subjectCodeOrderHash}`
  );

  return {
    document_id: fileRow.id,
    header_ok: headerOk,
    circular_ok: circularOk,
    minutes_ok: minutesOk,
    agenda_count: agendaCount,
    discussion_rows: discussionRows,
    subject_count: subjectCount,
    subject_code_order_hash: subjectCodeOrderHash,
    progressive_text: progressiveText,
    content_fingerprint: contentFingerprint,
  };
};

const getRiskLevel = (score: number): VerificationRiskLevel => {
  if (score >= 4) return 'STRONG_FLAG';
  if (score >= 2) return 'SOFT_FLAG';
  return 'PASS';
};

const computeTemplateChecklistMatch = (sourceText: string, checklist: string[]) => {
  if (!checklist || checklist.length === 0) return { ratio: 1, missing: [] as string[] };
  const normalizedSource = normalizeText(sourceText);
  const missing: string[] = [];

  checklist.forEach((item) => {
    const token = normalizeText(item);
    if (!token) return;
    if (!normalizedSource.includes(token)) {
      missing.push(item);
    }
  });

  const matched = checklist.length - missing.length;
  return { ratio: matched / checklist.length, missing };
};

const computeCategoryContentRelevance = (
  sourceText: string,
  fileCategory: string,
  expectedCategoryName?: string | null,
  checklist?: string[]
) => {
  const normalizedSource = normalizeText(sourceText);
  if (!normalizedSource) {
    return {
      score: 0,
      matchedKeywords: [] as string[],
      missingKeywords: [] as string[],
      referenceText: '',
    };
  }

  const referenceParts = [fileCategory, expectedCategoryName ?? '', ...(checklist ?? [])]
    .map((item) => normalizeText(item))
    .filter(Boolean);

  const referenceText = referenceParts.join(' ');
  const referenceTokens = uniqueTokens(referenceText).filter((token) => token.length >= 4);

  const matchedKeywords = referenceTokens.filter((token) => normalizedSource.includes(token));
  const missingKeywords = referenceTokens.filter((token) => !normalizedSource.includes(token));

  const keywordCoverage =
    referenceTokens.length > 0 ? matchedKeywords.length / referenceTokens.length : 1;
  const semanticScore = referenceText ? tfIdfCosineSimilarity(normalizedSource, referenceText) : 1;
  const score = Number((keywordCoverage * 0.65 + semanticScore * 0.35).toFixed(4));

  return {
    score,
    matchedKeywords,
    missingKeywords,
    referenceText,
  };
};

const computeSimilarityDrivenRisk = (
  currentFeature: VerificationFeatureRow,
  bestFeature: VerificationFeatureRow | null,
  bestFile: FileRow | null,
  currentFile: FileRow,
  bestSimilarity: number
) => {
  let riskScore = 0;
  const reasons: string[] = [];

  if ((currentFeature.progressive_text || '').length < 30) {
    riskScore += 4;
    reasons.push('Extracted document text is too short for reliable verification.');
  }

  if (!currentFeature.header_ok || !currentFeature.circular_ok || !currentFeature.minutes_ok) {
    riskScore += 3;
    reasons.push('Missing mandatory CCM template markers.');
  }

  if (bestFeature && currentFeature.content_fingerprint === bestFeature.content_fingerprint) {
    riskScore += 2;
    reasons.push('Structural fingerprint matches an existing document.');
  }

  if (bestSimilarity > AUTO_REJECT_THRESHOLD) {
    riskScore += 4;
    reasons.push(`Similarity ${bestSimilarity.toFixed(4)} is above 0.50 threshold.`);
  } else if (bestSimilarity > 0) {
    riskScore += 1;
    reasons.push(`Similarity ${bestSimilarity.toFixed(4)} is within allowed range (<= 0.50).`);
  }

  if (bestFile && bestSimilarity >= 0.85) {
    const gapDays = diffDays(currentFile.uploaded_at, bestFile.uploaded_at);
    if (gapDays >= 20) {
      riskScore += 2;
      reasons.push('Large time gap with highly similar progression text.');
    }
  }

  const autoRejected =
    bestSimilarity > AUTO_REJECT_THRESHOLD || (currentFeature.progressive_text || '').length < 30;
  const riskLevel = autoRejected ? 'STRONG_FLAG' : getRiskLevel(riskScore);

  return { riskScore, riskLevel, reasons, autoRejected };
};

const runVerificationForDocument = async (
  supabase: SupabaseClient,
  currentFile: FileRow,
  extractedTextOverride?: string | null,
  templateChecklist?: string[],
  expectedCategoryName?: string | null
) => {
  const currentFeature = extractVerificationFeatures(currentFile, extractedTextOverride);

  const { error: featureUpsertError } = await supabase
    .from('document_features')
    .upsert(
      {
        ...currentFeature,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'document_id' }
    );

  if (featureUpsertError) {
    throw new Error(
      `Failed to save features: ${featureUpsertError.message}. Ensure table public.document_features exists and service role can insert.`
    );
  }

  const { data: candidateFiles, error: candidateFilesError } = await supabase
    .from('files')
    .select('*')
    .eq('file_category', currentFile.file_category)
    .neq('id', currentFile.id)
    .order('uploaded_at', { ascending: false })
    .limit(100);

  if (candidateFilesError) {
    throw new Error('Failed to load candidate documents for similarity check.');
  }

  let bestSimilarity = 0;
  let bestFile: FileRow | null = null;
  let bestFeature: VerificationFeatureRow | null = null;

  for (const candidate of (candidateFiles ?? []) as FileRow[]) {
    const { data: fromDbFeature } = await supabase
      .from('document_features')
      .select('*')
      .eq('document_id', candidate.id)
      .maybeSingle();

    const candidateFeature = (fromDbFeature as VerificationFeatureRow | null) ?? extractVerificationFeatures(candidate);
    const similarity = tfIdfCosineSimilarity(currentFeature.progressive_text, candidateFeature.progressive_text);

    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestFile = candidate;
      bestFeature = candidateFeature;
    }
  }

  const evaluation = computeSimilarityDrivenRisk(
    currentFeature,
    bestFeature,
    bestFile,
    currentFile,
    bestSimilarity
  );

  const checklistMatch = computeTemplateChecklistMatch(currentFeature.progressive_text, templateChecklist ?? []);
  const categoryRelevance = computeCategoryContentRelevance(
    currentFeature.progressive_text,
    currentFile.file_category,
    expectedCategoryName,
    templateChecklist ?? []
  );

  if (checklistMatch.ratio < 0.6) {
    evaluation.riskScore += 2;
    evaluation.reasons.push(
      `Template checklist match is low (${(checklistMatch.ratio * 100).toFixed(0)}%). Missing: ${checklistMatch.missing.join(
        ', '
      )}`
    );
  } else if (checklistMatch.ratio < 1) {
    evaluation.riskScore += 1;
    evaluation.reasons.push(`Template checklist partially matched (${(checklistMatch.ratio * 100).toFixed(0)}%).`);
  }

  if (categoryRelevance.score < CATEGORY_MATCH_THRESHOLD) {
    evaluation.riskScore += 4;
    evaluation.reasons.push(
      `Document content relevance to "${expectedCategoryName || currentFile.file_category}" is only ${(
        categoryRelevance.score * 100
      ).toFixed(0)}%.`
    );
  } else if (categoryRelevance.score < 0.85) {
    evaluation.riskScore += 1;
    evaluation.reasons.push(
      `Document content partially matches "${expectedCategoryName || currentFile.file_category}" (${(
        categoryRelevance.score * 100
      ).toFixed(0)}%).`
    );
  }

  const finalAutoRejected =
    evaluation.autoRejected || categoryRelevance.score < CATEGORY_MATCH_THRESHOLD;

  if (!finalAutoRejected) {
    evaluation.riskLevel = getRiskLevel(evaluation.riskScore);
  } else {
    evaluation.riskLevel = 'STRONG_FLAG';
  }

  const { data: resultRow, error: resultInsertError } = await supabase
    .from('verification_results')
    .insert({
      document_id: currentFile.id,
      compared_document_id: bestFile?.id ?? null,
      progression_similarity: Number(bestSimilarity.toFixed(4)),
      risk_score: evaluation.riskScore,
      risk_level: evaluation.riskLevel,
      reasons: evaluation.reasons,
    })
    .select('*')
    .single();

  if (resultInsertError) {
    throw new Error(
      `Failed to save verification result: ${resultInsertError.message}. Ensure table public.verification_results exists and service role can insert.`
    );
  }

  return {
    currentFeature,
    bestFile,
    bestSimilarity,
    autoRejected: finalAutoRejected,
    categoryRelevance,
    resultRow: resultRow as VerificationResultRow,
  };
};

// Health check
app.get('/make-server-b9eb9a31/health', (c) => {
  return c.json({ status: 'ok', message: 'Server is running' });
});

// Sign up route
app.post('/make-server-b9eb9a31/auth/signup', (c) => {
  return c.json(
    { error: 'Signup is disabled. Please contact the administrator to add your account.' },
    403
  );
});

// Get user info route (protected)
app.get('/make-server-b9eb9a31/auth/user', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];

    if (!accessToken) {
      return c.json({ error: 'No access token provided' }, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const profile = getAllowedProfile(user.email);
    if (!profile) {
      return c.json({ error: 'Access denied' }, 403);
    }

    return c.json({
      id: user.id,
      email: user.email,
      name: profile.name || user.user_metadata?.name || user.email?.split('@')[0],
      role: profile.role,
      department: profile.department,
    });
  } catch (error: unknown) {
    console.error('Get user error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Upload file route (protected)
app.post('/make-server-b9eb9a31/files/upload', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];

    if (!accessToken) {
      console.error('Upload: No access token provided');
      return c.json({ error: 'No access token provided' }, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      console.error('Upload: Unauthorized', authError);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const {
      fileName,
      fileCategory,
      fileDescription,
      extractedText,
      templateChecklist,
      expectedCategoryName,
      fileType,
      fileSize,
      filePath,
      fileBucket,
      department,
      studentName,
      studentRecordType,
    } = body;

    const profile = getAllowedProfile(user.email);
    if (!profile) {
      return c.json({ error: 'Access denied' }, 403);
    }
    
    console.log('Upload request:', { fileName, fileCategory, userId: user.id });

    if (!fileName || !fileCategory) {
      console.error('Upload: Missing required fields');
      return c.json({ error: 'File name and category are required' }, 400);
    }

    const finalDepartment =
      profile.role === 'principal'
        ? (department === 'CSE' || department === 'IT' ? department : 'ALL')
        : profile.department;

    const fileData = {
      user_id: user.id,
      file_name: fileName,
      file_category: fileCategory,
      file_description: fileDescription || '',
      file_type: fileType || 'application/pdf',
      file_size: fileSize || 0,
      file_path: filePath || '',
      file_bucket: fileBucket || '',
      student_name: studentName || null,
      student_record_type: studentRecordType || null,
      department: finalDepartment,
      status: 'pending',
      uploaded_by: profile.name || user.user_metadata?.name || user.email,
    };

    console.log('Inserting file data:', fileData);

    const { data: inserted, error: insertError } = await supabase
      .from('files')
      .insert(fileData)
      .select('*')
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return c.json({ error: `Failed to store file metadata: ${insertError.message}` }, 500);
    }

    console.log('Upload successful:', inserted?.id);

    let verificationSummary:
      | {
          comparedDocumentId: string | null;
          similarity: number;
          categoryRelevance: number;
          autoRejected: boolean;
          riskLevel: string;
          reasons: string[];
        }
      | null = null;

    try {
      const verification = await runVerificationForDocument(
        supabase,
        inserted as FileRow,
        typeof extractedText === 'string' ? extractedText : null,
        Array.isArray(templateChecklist) ? templateChecklist.filter((item) => typeof item === 'string') : [],
        typeof expectedCategoryName === 'string' ? expectedCategoryName : null
      );

      if (verification.autoRejected) {
        const { data: updatedRejectedFile } = await supabase
          .from('files')
          .update({ status: 'system_rejected' })
          .eq('id', inserted.id)
          .select('*')
          .single();

        inserted.status = updatedRejectedFile?.status ?? 'system_rejected';

        await supabase.from('notifications').insert({
          user_id: inserted.user_id,
          type: 'rejection',
          message: `Your file "${inserted.file_name}" was auto-rejected by system verification. Similarity: ${(
            verification.bestSimilarity * 100
          ).toFixed(2)}%, category relevance: ${(
            verification.categoryRelevance.score * 100
          ).toFixed(2)}%. Please upload a correct document.`,
          read: false,
        });
      }

      verificationSummary = {
        comparedDocumentId: verification.bestFile?.id ?? null,
        similarity: Number(verification.bestSimilarity.toFixed(4)),
        categoryRelevance: verification.categoryRelevance.score,
        autoRejected: verification.autoRejected,
        riskLevel: verification.resultRow.risk_level,
        reasons: Array.isArray(verification.resultRow.reasons)
          ? verification.resultRow.reasons
          : typeof verification.resultRow.reasons === 'string'
          ? [verification.resultRow.reasons]
          : [],
      };
    } catch (verificationError: unknown) {
      console.error('Auto verification failed:', getErrorMessage(verificationError));
      if (inserted.file_bucket && inserted.file_path) {
        const { error: cleanupStorageError } = await supabase.storage
          .from(inserted.file_bucket)
          .remove([inserted.file_path]);
        if (cleanupStorageError) {
          console.error('Cleanup storage remove failed:', cleanupStorageError);
        }
      }
      await supabase.from('files').delete().eq('id', inserted.id);
      return c.json(
        {
          error: `System check failed. Upload was rolled back. ${getErrorMessage(verificationError)}`,
        },
        500
      );
    }

    return c.json({
      success: true,
      message: inserted.status === 'system_rejected'
        ? 'File uploaded but auto-rejected by system verification'
        : 'File uploaded successfully',
      file: inserted,
      verification: verificationSummary,
    });
  } catch (error: unknown) {
    console.error('Upload error:', getErrorMessage(error));
    return c.json({ 
      error: `Internal server error during upload: ${getErrorMessage(error) || 'Unknown error'}` 
    }, 500);
  }
});

// Update file status (HOD/Principal)
app.post('/make-server-b9eb9a31/files/status', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];

    if (!accessToken) {
      return c.json({ error: 'No access token provided' }, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const profile = getAllowedProfile(user.email);
    if (!profile || profile.role === 'staff') {
      return c.json({ error: 'Access denied' }, 403);
    }

    const { fileId, status, reason } = await c.req.json();

    if (!fileId || !status || !['approved', 'rejected'].includes(status)) {
      return c.json({ error: 'fileId and valid status are required' }, 400);
    }

    const { data: fileRow, error: fileError } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (fileError || !fileRow) {
      return c.json({ error: 'File not found' }, 404);
    }

    if (fileRow.status === 'system_rejected') {
      return c.json({ error: 'System-rejected files cannot be manually reviewed' }, 400);
    }

    if (profile.role === 'hod' && fileRow.department !== profile.department) {
      return c.json({ error: 'Access denied' }, 403);
    }

    if (status === 'rejected' && fileRow.file_bucket && fileRow.file_path) {
      const { error: removeError } = await supabase.storage
        .from(fileRow.file_bucket)
        .remove([fileRow.file_path]);
      if (removeError) {
        console.error('Storage remove error:', removeError);
      }
    }

    const updatePayload =
      status === 'rejected'
        ? { status, file_path: null, file_bucket: null }
        : { status };

    const { data: updated, error: updateError } = await supabase
      .from('files')
      .update(updatePayload)
      .eq('id', fileId)
      .select('*')
      .single();

    if (updateError) {
      return c.json({ error: 'Failed to update status' }, 500);
    }

    const notificationMessage =
      status === 'approved'
        ? `Your file "${fileRow.file_name}" was approved.`
        : `Your file "${fileRow.file_name}" was rejected.${reason ? ` Reason: ${reason}` : ''}`;

    await supabase.from('notifications').insert({
      user_id: fileRow.user_id,
      type: status === 'approved' ? 'approval' : 'rejection',
      message: notificationMessage,
      read: false,
    });

    return c.json({ success: true, file: mapFileRow(updated) });
  } catch (error: unknown) {
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Delete file metadata + storage object (role-scoped)
app.post('/make-server-b9eb9a31/files/delete', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No access token provided' }, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const profile = getAllowedProfile(user.email);
    if (!profile) {
      return c.json({ error: 'Access denied' }, 403);
    }

    const { fileId } = await c.req.json();
    if (!fileId) {
      return c.json({ error: 'fileId is required' }, 400);
    }

    const { data: fileRow, error: fileError } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (fileError || !fileRow) {
      return c.json({ error: 'File not found' }, 404);
    }

    if (profile.role === 'staff' && fileRow.user_id !== user.id) {
      return c.json({ error: 'Access denied' }, 403);
    }
    if (profile.role === 'hod' && fileRow.department !== profile.department) {
      return c.json({ error: 'Access denied' }, 403);
    }

    if (fileRow.file_bucket && fileRow.file_path) {
      const { error: removeError } = await supabase.storage
        .from(fileRow.file_bucket)
        .remove([fileRow.file_path]);
      if (removeError) {
        console.error('Storage remove warning:', removeError);
      }
    }

    await supabase.from('document_features').delete().eq('document_id', fileId);
    await supabase
      .from('verification_results')
      .delete()
      .or(`document_id.eq.${fileId},compared_document_id.eq.${fileId}`);

    const { error: deleteError } = await supabase.from('files').delete().eq('id', fileId);
    if (deleteError) {
      return c.json({ error: 'Failed to delete file metadata' }, 500);
    }

    return c.json({ success: true });
  } catch (error: unknown) {
    console.error('Delete file error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Run automated verification for a document (HOD/Principal)
app.post('/make-server-b9eb9a31/verify/run', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No access token provided' }, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const profile = getAllowedProfile(user.email);
    if (!profile || profile.role === 'staff') {
      return c.json({ error: 'Access denied' }, 403);
    }

    const { documentId, extractedText, templateChecklist, expectedCategoryName } = await c.req.json();
    if (!documentId) {
      return c.json({ error: 'documentId is required' }, 400);
    }

    const { data: currentFile, error: currentFileError } = await supabase
      .from('files')
      .select('*')
      .eq('id', documentId)
      .single();

    if (currentFileError || !currentFile) {
      return c.json({ error: 'Document not found' }, 404);
    }

    if (profile.role === 'hod' && currentFile.department !== profile.department) {
      return c.json({ error: 'Access denied' }, 403);
    }

    const verification = await runVerificationForDocument(
      supabase,
      currentFile as FileRow,
      typeof extractedText === 'string' ? extractedText : null,
      Array.isArray(templateChecklist) ? templateChecklist.filter((item) => typeof item === 'string') : [],
      typeof expectedCategoryName === 'string' ? expectedCategoryName : null
    );

    if (verification.autoRejected && currentFile.status !== 'system_rejected') {
      await supabase
        .from('files')
        .update({ status: 'system_rejected' })
        .eq('id', currentFile.id);
    }

    return c.json({
      success: true,
      result: verification.resultRow,
      currentFeature: verification.currentFeature,
      previousDocumentId: verification.bestFile?.id ?? null,
      autoRejected: verification.autoRejected,
      similarity: Number(verification.bestSimilarity.toFixed(4)),
      categoryRelevance: verification.categoryRelevance.score,
    });
  } catch (error: unknown) {
    console.error('Verification run error:', getErrorMessage(error));
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get latest verification result for a document
app.get('/make-server-b9eb9a31/verify/result/:documentId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No access token provided' }, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const profile = getAllowedProfile(user.email);
    if (!profile) {
      return c.json({ error: 'Access denied' }, 403);
    }

    const documentId = c.req.param('documentId');

    const { data: fileRow, error: fileError } = await supabase
      .from('files')
      .select('*')
      .eq('id', documentId)
      .single();

    if (fileError || !fileRow) {
      return c.json({ error: 'Document not found' }, 404);
    }

    if (profile.role === 'staff' && fileRow.user_id !== user.id) {
      return c.json({ error: 'Access denied' }, 403);
    }
    if (profile.role === 'hod' && fileRow.department !== profile.department) {
      return c.json({ error: 'Access denied' }, 403);
    }

    const { data: resultRows, error: resultError } = await supabase
      .from('verification_results')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (resultError) {
      return c.json(
        { error: 'Failed to fetch verification result. Create table verification_results first.' },
        500
      );
    }

    if (!resultRows || resultRows.length === 0) {
      return c.json({ success: true, result: null });
    }

    return c.json({
      success: true,
      result: resultRows[0] as VerificationResultRow,
    });
  } catch (error: unknown) {
    console.error('Get verification result error:', getErrorMessage(error));
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Reviewer decision endpoint (HOD/Principal)
app.post('/make-server-b9eb9a31/verify/review', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No access token provided' }, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const profile = getAllowedProfile(user.email);
    if (!profile || profile.role === 'staff') {
      return c.json({ error: 'Access denied' }, 403);
    }

    const { documentId, action, reason } = await c.req.json();
    if (!documentId || !action || !['approved', 'rejected'].includes(action)) {
      return c.json({ error: 'documentId and valid action are required' }, 400);
    }

    if (action === 'rejected' && !reason) {
      return c.json({ error: 'reason is required for rejection' }, 400);
    }

    const { data: fileRow, error: fileError } = await supabase
      .from('files')
      .select('*')
      .eq('id', documentId)
      .single();

    if (fileError || !fileRow) {
      return c.json({ error: 'Document not found' }, 404);
    }

    if (fileRow.status === 'system_rejected') {
      return c.json({ error: 'System-rejected files cannot be manually reviewed' }, 400);
    }

    if (profile.role === 'hod' && fileRow.department !== profile.department) {
      return c.json({ error: 'Access denied' }, 403);
    }

    const updatePayload: Record<string, string> = { status: action };
    if (action === 'rejected' && fileRow.file_bucket && fileRow.file_path) {
      const { error: removeError } = await supabase.storage
        .from(fileRow.file_bucket)
        .remove([fileRow.file_path]);
      if (removeError) {
        console.error('Storage remove error:', removeError);
      }
    }

    const finalUpdatePayload =
      action === 'rejected'
        ? { ...updatePayload, file_path: null, file_bucket: null }
        : updatePayload;

    const { data: updated, error: updateError } = await supabase
      .from('files')
      .update(finalUpdatePayload)
      .eq('id', documentId)
      .select('*')
      .single();

    if (updateError) {
      return c.json({ error: 'Failed to update file review status' }, 500);
    }

    const reviewMessage =
      action === 'approved'
        ? `Your file "${fileRow.file_name}" was approved by reviewer.`
        : `Your file "${fileRow.file_name}" was rejected by reviewer. Reason: ${reason}`;

    await supabase.from('notifications').insert({
      user_id: fileRow.user_id,
      type: action === 'approved' ? 'approval' : 'rejection',
      message: reviewMessage,
      read: false,
    });

    return c.json({ success: true, file: mapFileRow(updated as FileRow) });
  } catch (error: unknown) {
    console.error('Verify review error:', getErrorMessage(error));
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Create signed URL for viewing files
app.post('/make-server-b9eb9a31/files/signed-url', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];

    if (!accessToken) {
      return c.json({ error: 'No access token provided' }, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const profile = getAllowedProfile(user.email);
    if (!profile) {
      return c.json({ error: 'Access denied' }, 403);
    }

    const { fileId } = await c.req.json();
    if (!fileId) {
      return c.json({ error: 'fileId is required' }, 400);
    }

    const { data: fileRow, error: fileError } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (fileError || !fileRow) {
      return c.json({ error: 'File not found' }, 404);
    }

    if (profile.role === 'staff' && fileRow.user_id !== user.id) {
      return c.json({ error: 'Access denied' }, 403);
    }
    if (profile.role === 'hod' && fileRow.department !== profile.department) {
      return c.json({ error: 'Access denied' }, 403);
    }

    if (!fileRow.file_bucket || !fileRow.file_path) {
      return c.json({ error: 'File path missing' }, 400);
    }

    const { data, error } = await supabase
      .storage
      .from(fileRow.file_bucket)
      .createSignedUrl(fileRow.file_path, 60);

    if (error || !data?.signedUrl) {
      return c.json({ error: 'Failed to generate signed URL' }, 500);
    }

    return c.json({ signedUrl: data.signedUrl });
  } catch (error: unknown) {
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get files by category
app.get('/make-server-b9eb9a31/files/category/:category', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];

    if (!accessToken) {
      return c.json({ error: 'No access token provided' }, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const profile = getAllowedProfile(user.email);
    if (!profile) {
      return c.json({ error: 'Access denied' }, 403);
    }

    const category = c.req.param('category');
    let query = supabase.from('files').select('*').eq('file_category', category);
    query = applyScopeFilters(query, profile.role, profile.department, user.id);
    const { data: files, error: filesError } = await query.order('uploaded_at', { ascending: false });

    if (filesError) {
      console.error('Get files error:', filesError);
      return c.json({ error: 'Internal server error' }, 500);
    }

    return c.json({ files: (files || []).map(mapFileRow) });
  } catch (error: unknown) {
    console.error('Get files error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get all categories with file counts
app.get('/make-server-b9eb9a31/files/categories', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];

    if (!accessToken) {
      return c.json({ error: 'No access token provided' }, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const profile = getAllowedProfile(user.email);
    if (!profile) {
      return c.json({ error: 'Access denied' }, 403);
    }

    let query = supabase
      .from('files')
      .select('*')
      .neq('status', 'system_rejected')
      .neq('status', 'rejected');
    query = applyScopeFilters(query, profile.role, profile.department, user.id);
    const { data: scoped, error: scopedError } = await query;

    if (scopedError) {
      console.error('Get categories error:', scopedError);
      return c.json({ error: 'Internal server error' }, 500);
    }

    const counts: Record<string, number> = {};
    (scoped || []).forEach((file: FileRow) => {
      const category = file?.file_category || 'Uncategorized';
      counts[category] = (counts[category] ?? 0) + 1;
    });

    const categoryData = Object.entries(counts).map(([name, count]) => ({
      name,
      count,
    }));

    return c.json({ categories: categoryData });
  } catch (error: unknown) {
    console.error('Get categories error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get dashboard statistics
app.get('/make-server-b9eb9a31/dashboard/stats', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];

    if (!accessToken) {
      console.error('Dashboard stats: No access token provided');
      return c.json({ error: 'No access token provided' }, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      console.error('Dashboard stats: Unauthorized', authError);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const profile = getAllowedProfile(user.email);
    if (!profile) {
      return c.json({ error: 'Access denied' }, 403);
    }

    let query = supabase
      .from('files')
      .select('*')
      .neq('status', 'rejected')
      .neq('status', 'system_rejected');
    query = applyScopeFilters(query, profile.role, profile.department, user.id);
    const { data: scopedFiles, error: scopedError } = await query;

    if (scopedError) {
      console.error('Get dashboard stats error:', scopedError);
      return c.json({ error: 'Internal server error' }, 500);
    }
    
    console.log('Scoped files:', scopedFiles?.length || 0);
    
    // Calculate statistics
    const totalFiles = scopedFiles.length;
    const categorySet = new Set(
      (scopedFiles || []).map((fileData: FileRow) => fileData?.file_category).filter(Boolean)
    );
    const totalCategories = categorySet.size;
    
    // Calculate completion percentage (based on having at least one file per category)
    const expectedCategories = 10; // Adjust based on your requirements
    const completionPercentage = totalCategories > 0 
      ? Math.min(Math.round((totalCategories / expectedCategories) * 100), 100)
      : 0;
    
    // Get pending items (files awaiting review)
    const pendingFiles = (scopedFiles || []).filter((fileData: FileRow) => 
      !fileData?.status || fileData?.status === 'pending'
    );
    
    const stats = {
      totalFiles,
      totalCategories,
      completionPercentage,
      pendingCount: pendingFiles.length,
      recentFiles: (scopedFiles || []).slice(-5).reverse().filter(Boolean).map(mapFileRow)
    };
    
    console.log('Dashboard stats:', stats);
    
    return c.json(stats);
  } catch (error: unknown) {
    console.error('Get dashboard stats error:', getErrorMessage(error));
    return c.json({ 
      error: `Internal server error: ${getErrorMessage(error) || 'Unknown error'}`,
      totalFiles: 0,
      totalCategories: 0,
      completionPercentage: 0,
      pendingCount: 0,
      recentFiles: []
    }, 500);
  }
});

// Get department summary (principal only)
app.get('/make-server-b9eb9a31/dashboard/departments', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];

    if (!accessToken) {
      return c.json({ error: 'No access token provided' }, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const profile = getAllowedProfile(user.email);
    if (!profile || profile.role !== 'principal') {
      return c.json({ error: 'Access denied' }, 403);
    }

    const { data: rows, error: listError } = await supabase
      .from('files')
      .select('department,status');

    if (listError) {
      return c.json({ error: 'Internal server error' }, 500);
    }

    const byDept: Record<string, { total: number; pending: number; approved: number; rejected: number }> = {};
    (rows || []).forEach((row: { department: string; status: string }) => {
      const dept = row.department || 'Unknown';
      if (!byDept[dept]) {
        byDept[dept] = { total: 0, pending: 0, approved: 0, rejected: 0 };
      }
      byDept[dept].total += 1;
      if (row.status === 'approved') byDept[dept].approved += 1;
      else if (row.status === 'rejected') byDept[dept].rejected += 1;
      else byDept[dept].pending += 1;
    });

    const departments = Object.entries(byDept).map(([department, counts]) => ({
      department,
      ...counts,
    }));

    return c.json({ departments });
  } catch (error: unknown) {
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get audit settings (all authenticated users)
app.get('/make-server-b9eb9a31/dashboard/audit-settings', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];

    if (!accessToken) {
      return c.json({ error: 'No access token provided' }, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { data: rows, error: listError } = await supabase
      .from('audit_settings')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (listError) {
      return c.json({ error: 'Internal server error' }, 500);
    }

    if (!rows || rows.length === 0) {
      return c.json({});
    }

    return c.json(mapAuditSettingRow(rows[0]));
  } catch (error: unknown) {
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Save audit settings (principal only)
app.post('/make-server-b9eb9a31/dashboard/audit-settings', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];

    if (!accessToken) {
      return c.json({ error: 'No access token provided' }, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const profile = getAllowedProfile(user.email);
    if (!profile || profile.role !== 'principal') {
      return c.json({ error: 'Access denied' }, 403);
    }

    const { title, deadline } = await c.req.json();
    if (!title || !deadline) {
      return c.json({ error: 'title and deadline are required' }, 400);
    }

    const { data: inserted, error: insertError } = await supabase
      .from('audit_settings')
      .insert({
        title,
        deadline,
      })
      .select('*')
      .single();

    if (insertError) {
      return c.json({ error: 'Failed to save settings' }, 500);
    }

    return c.json(mapAuditSettingRow(inserted));
  } catch (error: unknown) {
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get notifications for user
app.get('/make-server-b9eb9a31/notifications', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];

    if (!accessToken) {
      return c.json({ error: 'No access token provided' }, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const profile = getAllowedProfile(user.email);
    if (!profile) {
      return c.json({ error: 'Access denied' }, 403);
    }

    const { data: notifications, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (notifError) {
      console.error('Get notifications error:', notifError);
      return c.json({ error: 'Internal server error' }, 500);
    }

    return c.json({ notifications: (notifications || []).map(mapNotificationRow) });
  } catch (error: unknown) {
    console.error('Get notifications error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Add notification (for HOD/admin use)
app.post('/make-server-b9eb9a31/notifications', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];

    if (!accessToken) {
      return c.json({ error: 'No access token provided' }, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const profile = getAllowedProfile(user.email);
    if (!profile || profile.role === 'staff') {
      return c.json({ error: 'Access denied' }, 403);
    }

    const { userId, type, message } = await c.req.json();

    if (!userId || !type || !message) {
      return c.json({ error: 'userId, type, and message are required' }, 400);
    }

    const newNotification = {
      user_id: userId,
      type,
      message,
      read: false,
    };

    const { data: inserted, error: insertError } = await supabase
      .from('notifications')
      .insert(newNotification)
      .select('*')
      .single();

    if (insertError) {
      console.error('Add notification error:', insertError);
      return c.json({ error: 'Internal server error' }, 500);
    }

    return c.json({ success: true, notification: inserted });
  } catch (error: unknown) {
    console.error('Add notification error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// List files with optional filters (protected)
app.get('/make-server-b9eb9a31/files/list', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];

    if (!accessToken) {
      return c.json({ error: 'No access token provided' }, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const profile = getAllowedProfile(user.email);
    if (!profile) {
      return c.json({ error: 'Access denied' }, 403);
    }

    const status = c.req.query('status');
    const category = c.req.query('category');

    let query = supabase.from('files').select('*');
    query = applyScopeFilters(query, profile.role, profile.department, user.id);

    if (status) {
      query = query.eq('status', status);
    } else {
      query = query.neq('status', 'system_rejected').neq('status', 'rejected');
    }
    if (category) {
      query = query.eq('file_category', category);
    }

    const { data: files, error: listError } = await query.order('uploaded_at', {
      ascending: false,
    });

    if (listError) {
      console.error('List files error:', listError);
      return c.json({ error: 'Internal server error' }, 500);
    }

    return c.json({ files: (files || []).map(mapFileRow) });
  } catch (error: unknown) {
    console.error('List files error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

Deno.serve(app.fetch);
