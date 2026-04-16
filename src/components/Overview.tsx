import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, Eye, FileText, ShieldAlert } from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { supabase } from '../utils/supabase/client';
import {
  Line,
  LineChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface User {
  id: string;
  email: string;
  name: string;
  accessToken: string;
  role: 'staff' | 'hod' | 'principal';
  department: 'CSE' | 'IT' | 'BIO' | 'CHEM' | 'AIDS' | 'MECH' | 'ALL';
}

interface OverviewProps {
  user?: User;
}

interface DashboardStats {
  totalFiles: number;
  totalCategories: number;
  completionPercentage: number;
  pendingCount: number;
  recentFiles: FileItem[];
}

interface FileItem {
  id: string;
  fileName: string;
  fileCategory: string;
  status: string;
  uploadedAt: string;
  uploadedBy: string;
  updatedAt?: string;
  filePath?: string;
  fileBucket?: string;
  department?: string;
}

interface WeeklyPoint {
  day: string;
  dateLabel: string;
  isToday: boolean;
  submissions: number;
  approved: number;
  pending: number;
  rejected: number;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const getLocalDateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatShortDate = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

const formatAxisDate = (date: Date) =>
  date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

function AnalyticsDayTick({ x, y, payload }: any) {
  const point = payload?.payload as WeeklyPoint | undefined;
  if (!point) return null;

  const dayColor = point.isToday ? '#d9f5ff' : '#7fa8bc';
  const dateColor = point.isToday ? '#67d9ff' : '#5f8197';

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={12}
        textAnchor="middle"
        fill={dayColor}
        fontSize={11}
        fontWeight={point.isToday ? 700 : 500}
      >
        {point.day}
      </text>
      <text x={0} y={0} dy={26} textAnchor="middle" fill={dateColor} fontSize={10}>
        {point.dateLabel}
      </text>
    </g>
  );
}

function AnalyticsTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as WeeklyPoint | undefined;
  const metricLabels: Record<string, string> = {
    submissions: 'submitted',
    approved: 'verified',
    pending: 'pending',
    rejected: 'rejected',
  };

  return (
    <div className="hud-tooltip">
      <p className="hud-tooltip-title">
        {point ? `${point.day}, ${point.dateLabel}` : label}
      </p>
      {payload.map((item: any) => (
        <p key={item.dataKey} style={{ color: item.color }}>
          {(metricLabels[item.dataKey] || item.dataKey)}: {item.value}
        </p>
      ))}
    </div>
  );
}

export function Overview({ user }: OverviewProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalFiles: 0,
    totalCategories: 0,
    completionPercentage: 0,
    pendingCount: 0,
    recentFiles: [],
  });
  const [allFiles, setAllFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditTitle, setAuditTitle] = useState<string>('Upcoming Audit');
  const [auditDeadline, setAuditDeadline] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    hasDeadline: false,
  });
  const [departmentStats, setDepartmentStats] = useState<Array<{ department: string; total: number }> | null>(null);
  const [savingAuditSettings, setSavingAuditSettings] = useState(false);
  const [auditSaveMessage, setAuditSaveMessage] = useState('');

  useEffect(() => {
    if (user?.accessToken) {
      void fetchOverviewPayload();
      void fetchDepartmentStats();
    }
  }, [user?.accessToken]);

  useEffect(() => {
    if (!user?.accessToken) return;
    const fetchAuditSettings = async () => {
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-b9eb9a31/dashboard/audit-settings`,
          { headers: { Authorization: `Bearer ${user.accessToken}` } }
        );
        if (!response.ok) return;
        const data = await response.json();
        if (data?.title) setAuditTitle(data.title);
        if (data?.deadline) setAuditDeadline(new Date(data.deadline));
      } catch (error) {
        console.error('Audit settings fetch error:', error);
      }
    };
    void fetchAuditSettings();
  }, [user?.accessToken]);

  useEffect(() => {
    if (!auditDeadline) return;
    const updateCountdown = () => {
      const now = new Date();
      const diffMs = auditDeadline.getTime() - now.getTime();
      if (diffMs <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, hasDeadline: true });
        return;
      }
      const totalSeconds = Math.floor(diffMs / 1000);
      setCountdown({
        days: Math.floor(totalSeconds / (24 * 60 * 60)),
        hours: Math.floor((totalSeconds % (24 * 60 * 60)) / 3600),
        minutes: Math.floor((totalSeconds % 3600) / 60),
        seconds: totalSeconds % 60,
        hasDeadline: true,
      });
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [auditDeadline]);

  useEffect(() => {
    if (auditDeadline) return;
    setCountdown((prev) => ({ ...prev, hasDeadline: false }));
  }, [auditDeadline]);

  const fetchOverviewPayload = async () => {
    if (!user?.accessToken) return;
    setLoading(true);
    try {
      const [statsResponse, activeFilesResponse, rejectedFilesResponse, systemRejectedFilesResponse] = await Promise.all([
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-b9eb9a31/dashboard/stats?ts=${Date.now()}`,
          { cache: 'no-store', headers: { Authorization: `Bearer ${user.accessToken}` } }
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-b9eb9a31/files/list?ts=${Date.now()}`,
          { cache: 'no-store', headers: { Authorization: `Bearer ${user.accessToken}` } }
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-b9eb9a31/files/list?status=rejected&ts=${Date.now()}`,
          { cache: 'no-store', headers: { Authorization: `Bearer ${user.accessToken}` } }
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-b9eb9a31/files/list?status=system_rejected&ts=${Date.now()}`,
          { cache: 'no-store', headers: { Authorization: `Bearer ${user.accessToken}` } }
        ),
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats({
          totalFiles: statsData.totalFiles ?? 0,
          totalCategories: statsData.totalCategories ?? 0,
          completionPercentage: statsData.completionPercentage ?? 0,
          pendingCount: statsData.pendingCount ?? 0,
          recentFiles: statsData.recentFiles ?? [],
        });
      }

      const aggregatedFiles: FileItem[] = [];
      if (activeFilesResponse.ok) {
        const data = await activeFilesResponse.json();
        aggregatedFiles.push(...((data.files ?? []) as FileItem[]));
      }
      if (rejectedFilesResponse.ok) {
        const data = await rejectedFilesResponse.json();
        aggregatedFiles.push(...((data.files ?? []) as FileItem[]));
      }
      if (systemRejectedFilesResponse.ok) {
        const data = await systemRejectedFilesResponse.json();
        aggregatedFiles.push(...((data.files ?? []) as FileItem[]));
      }

      const byId = new Map<string, FileItem>();
      for (const file of aggregatedFiles) {
        byId.set(file.id, file);
      }
      setAllFiles(Array.from(byId.values()));
    } catch (error) {
      console.error('Error fetching overview payload:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartmentStats = async () => {
    if (!user?.accessToken || user.role !== 'principal') {
      setDepartmentStats(null);
      return;
    }
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b9eb9a31/dashboard/departments`,
        { headers: { Authorization: `Bearer ${user.accessToken}` } }
      );
      if (!response.ok) return;
      const data = await response.json();
      const rows = (data.departments || []) as Array<{ department: string; total: number }>;
      setDepartmentStats(rows);
    } catch (error) {
      console.error('Error fetching department stats:', error);
    }
  };

  const saveAuditSettings = async () => {
    if (!user?.accessToken || user.role !== 'principal' || !auditTitle || !auditDeadline) {
      setAuditSaveMessage('Audit name and deadline are required');
      return;
    }
    setSavingAuditSettings(true);
    setAuditSaveMessage('');
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b9eb9a31/dashboard/audit-settings`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.accessToken}`,
          },
          body: JSON.stringify({
            title: auditTitle,
            deadline: auditDeadline.toISOString().slice(0, 10),
          }),
        }
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setAuditSaveMessage(data.error || 'Failed to save settings');
        return;
      }
      setAuditSaveMessage('Saved');
    } catch (error) {
      console.error('Error saving audit settings:', error);
      setAuditSaveMessage('Failed to save settings');
    } finally {
      setSavingAuditSettings(false);
    }
  };

  const weeklyTrend = useMemo<WeeklyPoint[]>(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const base = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now);
      const offsetFromToday = index - 3;
      date.setDate(now.getDate() + offsetFromToday);
      return {
        day: DAY_LABELS[date.getDay()],
        dateLabel: formatAxisDate(date),
        isToday: offsetFromToday === 0,
        key: getLocalDateKey(date),
        submissions: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
      };
    });

    const lookup = new Map(base.map((entry) => [entry.key, entry]));
    for (const file of allFiles) {
      const eventTime = file.status === 'pending' ? file.uploadedAt : (file.updatedAt || file.uploadedAt);
      const date = new Date(eventTime);
      if (Number.isNaN(date.getTime())) continue;
      const key = getLocalDateKey(date);
      const row = lookup.get(key);
      if (!row) continue;
      row.submissions += 1;
      if (file.status === 'approved') {
        row.approved += 1;
      } else if (file.status === 'pending') {
        row.pending += 1;
      } else if (file.status === 'rejected' || file.status === 'system_rejected') {
        row.rejected += 1;
      }
    }

    return base.map(({ day, dateLabel, isToday, submissions, approved, pending, rejected }) => ({
      day,
      dateLabel,
      isToday,
      submissions,
      approved,
      pending,
      rejected,
    }));
  }, [allFiles]);

  const departmentDistribution = useMemo(() => {
    const countsFromFiles: Record<string, number> = {};
    for (const file of allFiles) {
      const department = (file.department || 'NA').toUpperCase();
      countsFromFiles[department] = (countsFromFiles[department] ?? 0) + 1;
    }

    const mergedCounts: Record<string, number> = { ...countsFromFiles };
    if (departmentStats && departmentStats.length > 0) {
      for (const row of departmentStats) {
        const key = (row.department || 'NA').toUpperCase();
        const total = Number(row.total) || 0;
        mergedCounts[key] = Math.max(mergedCounts[key] ?? 0, total);
      }
    }

    return Object.entries(mergedCounts)
      .map(([name, files]) => ({ name, files }))
      .sort((a, b) => b.files - a.files)
      .slice(0, 8);
  }, [allFiles, departmentStats]);

  const approvedCount = useMemo(
    () => allFiles.filter((file) => file.status === 'approved').length,
    [allFiles]
  );
  const rejectedCount = useMemo(
    () => allFiles.filter((file) => file.status === 'system_rejected' || file.status === 'rejected').length,
    [allFiles]
  );

  return (
    <div className="space-y-5 hud-overview">
      <div>
        <h2 className="hud-title">AuditX Intelligence Deck</h2>
        <p className="hud-subtitle">
          Live telemetry for {user?.name || 'User'} - {user?.department || 'N/A'}
        </p>
      </div>

      <div className="panel-card hud-hero-panel">
        <div className="hud-hero-main">
          <div>
            <p className="hud-kicker">{auditTitle}</p>
            <p className="hud-muted">
              {auditDeadline
                ? `Deadline ${auditDeadline.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`
                : 'Deadline not set'}
            </p>
          </div>
          {user?.role === 'principal' ? (
            <div className="hud-hero-settings-inline">
              <span>Audit Countdown Settings</span>
              <input
                type="text"
                value={auditTitle}
                onChange={(e) => setAuditTitle(e.target.value)}
                placeholder="Audit name"
              />
              <input
                type="date"
                value={auditDeadline ? auditDeadline.toISOString().slice(0, 10) : ''}
                onChange={(e) => setAuditDeadline(e.target.value ? new Date(e.target.value) : null)}
              />
              <button onClick={saveAuditSettings} disabled={savingAuditSettings}>
                {savingAuditSettings ? 'Saving...' : 'Save'}
              </button>
            </div>
          ) : null}
          {auditSaveMessage ? <p className="hud-muted mt-1 text-xs">{auditSaveMessage}</p> : null}
        </div>
        <div className="hud-countdown-grid">
          {[
            { label: 'Days', value: countdown.days },
            { label: 'Hours', value: countdown.hours },
            { label: 'Min', value: countdown.minutes },
            { label: 'Sec', value: countdown.seconds },
          ].map((entry) => (
            <div key={entry.label} className="hud-count-box">
              <strong>{countdown.hasDeadline ? String(entry.value).padStart(2, '0') : '--'}</strong>
              <span>{entry.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="hud-kpi-row">
        <div className="panel-card hud-stat-card">
          <p>Total Files</p>
          <strong>{loading ? '...' : stats.totalFiles}</strong>
          <FileText className="w-4 h-4 text-cyan-300" />
        </div>
        <div className="panel-card hud-stat-card">
          <p>Categories</p>
          <strong>{loading ? '...' : stats.totalCategories}</strong>
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
        </div>
        <div className="panel-card hud-stat-card">
          <p>Completion</p>
          <strong>{loading ? '...' : `${stats.completionPercentage}%`}</strong>
          <Clock className="w-4 h-4 text-amber-300" />
        </div>
        <div className="panel-card hud-stat-card">
          <p>Pending / Rejected</p>
          <strong>{loading ? '...' : `${stats.pendingCount} / ${rejectedCount}`}</strong>
          <ShieldAlert className="w-4 h-4 text-rose-300" />
        </div>
      </div>

      <div className="panel-card hud-analytics-panel">
        <div className="hud-panel-head">
          <h3>Analytics Panel</h3>
          <span>WEEKLY OVERVIEW</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <section className="hud-chart-shell">
            <h4>SUBMISSIONS / APPROVED / PENDING / REJECTED</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f3444" />
                  <XAxis
                    dataKey="day"
                    interval={0}
                    height={40}
                    tickLine={false}
                    axisLine={false}
                    tick={<AnalyticsDayTick />}
                  />
                  <YAxis tick={{ fill: '#7fa8bc', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<AnalyticsTooltip />} />
                  <Line type="monotone" dataKey="submissions" stroke="#22d3ee" strokeWidth={2.2} dot={false} />
                  <Line type="monotone" dataKey="approved" stroke="#00d66b" strokeWidth={2.2} dot={false} />
                  <Line type="monotone" dataKey="pending" stroke="#facc15" strokeWidth={2.2} dot={false} />
                  <Line type="monotone" dataKey="rejected" stroke="#ef4444" strokeWidth={2.2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="hud-chart-shell">
            <h4>DEPARTMENT DISTRIBUTION</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f3444" />
                  <XAxis dataKey="name" tick={{ fill: '#7fa8bc', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#7fa8bc', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<AnalyticsTooltip />} />
                  <Bar dataKey="files" fill="#22d3ee" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="panel-card hud-status-panel">
          <h3>Final Approval Status</h3>
          <div className="hud-status-grid">
            <div>
              <span>Approved</span>
              <strong>{approvedCount}</strong>
            </div>
            <div>
              <span>Pending</span>
              <strong>{stats.pendingCount}</strong>
            </div>
            <div>
              <span>Rejected</span>
              <strong>{rejectedCount}</strong>
            </div>
          </div>
        </div>

        <div className="panel-card hud-recent-panel xl:col-span-2">
          <h3>Recent Uploads</h3>
          {stats.recentFiles.length === 0 ? (
            <p className="hud-muted py-3">No recent files</p>
          ) : (
            <div className="space-y-2">
              {stats.recentFiles.map((file) => (
                <div key={file.id} className="hud-file-row">
                  <div className="min-w-0">
                    <p className="truncate">{file.fileName}</p>
                    <span>
                      {(file.department || 'NA').toUpperCase()} - {file.fileCategory} - {formatShortDate(file.uploadedAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`hud-tag ${file.status === 'approved' ? 'ok' : 'warn'}`}>
                      {file.status || 'pending'}
                    </span>
                    <button
                      className="hud-view-btn"
                      onClick={async () => {
                        try {
                          const response = await fetch(
                            `https://${projectId}.supabase.co/functions/v1/make-server-b9eb9a31/files/signed-url`,
                            {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${user?.accessToken}`,
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
                          if (file.fileBucket && file.filePath) {
                            const { data, error } = await supabase.storage
                              .from(file.fileBucket)
                              .createSignedUrl(file.filePath, 60);
                            if (error || !data?.signedUrl) {
                              alert(error?.message || 'Failed to open file');
                              return;
                            }
                            window.open(data.signedUrl, '_blank');
                          } else {
                            alert('File path missing');
                          }
                        } catch (error) {
                          console.error('View file error:', error);
                          alert('Failed to open file');
                        }
                      }}
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {!loading && stats.totalFiles === 0 && (
        <div className="panel-card hud-empty-panel">
          <AlertCircle className="w-10 h-10 mx-auto mb-2 text-cyan-300" />
          <h3>No Files Uploaded Yet</h3>
          <p>Upload documents to activate the dashboard telemetry.</p>
        </div>
      )}
    </div>
  );
}















