import { useEffect, useState } from 'react';
import { projectId } from '../utils/supabase/info';
import { FileText, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';

interface User {
  id: string;
  email: string;
  name: string;
  accessToken: string;
  role: 'staff' | 'hod' | 'principal';
  department: 'CSE' | 'IT' | 'BIO' | 'CHEM' | 'AIDS' | 'MECH' | 'ALL';
}

interface DepartmentStat {
  department: string;
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

interface DepartmentsSummaryProps {
  user: User;
}

const STATUS_COLORS = {
  pending: '#f59e0b',
  approved: '#16a34a',
  rejected: '#ef4444',
} as const;

const STATUS_LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
} as const;

export function DepartmentsSummary({ user }: DepartmentsSummaryProps) {
  const [stats, setStats] = useState<DepartmentStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-b9eb9a31/dashboard/departments`,
          {
            headers: {
              Authorization: `Bearer ${user.accessToken}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setStats(data.departments || []);
        }
      } catch (error) {
        console.error('Departments summary error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user.accessToken]);

  return (
    <div className="space-y-6 departments-page">
      <div>
        <h2 className="text-2xl mb-2">Departments Summary</h2>
        <p className="text-gray-600">Overview of audit progress across departments</p>
      </div>

      {loading ? (
        <div className="panel-card rounded-xl p-8 text-center text-gray-300">
          Loading department statistics...
        </div>
      ) : stats.length === 0 ? (
        <div className="panel-card rounded-xl p-8 text-center text-gray-300">
          No department data available yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {stats.map((dept) => {
            const chartData = [
              {
                name: STATUS_LABELS.pending,
                value: Number(dept.pending) || 0,
                fill: STATUS_COLORS.pending,
              },
              {
                name: STATUS_LABELS.approved,
                value: Number(dept.approved) || 0,
                fill: STATUS_COLORS.approved,
              },
              {
                name: STATUS_LABELS.rejected,
                value: Number(dept.rejected) || 0,
                fill: STATUS_COLORS.rejected,
              },
            ];

            const totalCount = chartData.reduce((sum, item) => sum + item.value, 0);

            return (
              <div key={dept.department} className="panel-card rounded-xl p-5 overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">{dept.department}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600 shrink-0">
                    <FileText className="w-4 h-4 text-blue-600" />
                    {dept.total} files
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[220px_1fr] gap-4 items-center">
                  <div className="w-full flex items-center justify-center">
                    <div className="w-[220px] h-[220px] max-w-full max-h-full flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200">
                      {totalCount > 0 ? (
                        <PieChart width={200} height={200}>
                          <Pie
                            data={chartData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={52}
                            outerRadius={82}
                            paddingAngle={2}
                          >
                            {chartData.map((entry) => (
                              <Cell key={entry.name} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number, name: string) => [
                              `${value} (${totalCount ? ((value / totalCount) * 100).toFixed(0) : 0}%)`,
                              name,
                            ]}
                          />
                        </PieChart>
                      ) : (
                        <div className="text-sm text-gray-500">No files yet</div>
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 grid grid-cols-3 gap-2 text-xs">
                    <div className="flex items-center gap-2 text-yellow-700 bg-yellow-50 rounded-lg px-2 py-1.5 min-w-0">
                      <AlertCircle className="w-4 h-4" />
                      <span className="truncate">Pending: {dept.pending}</span>
                    </div>
                    <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg px-2 py-1.5 min-w-0">
                      <CheckCircle className="w-4 h-4" />
                      <span className="truncate">Approved: {dept.approved}</span>
                    </div>
                    <div className="flex items-center gap-2 text-red-700 bg-red-50 rounded-lg px-2 py-1.5 min-w-0">
                      <XCircle className="w-4 h-4" />
                      <span className="truncate">Rejected: {dept.rejected}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


