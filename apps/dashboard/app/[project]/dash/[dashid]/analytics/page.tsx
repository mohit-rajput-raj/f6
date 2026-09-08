'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from '@/lib/auth-client';
import {
  BarChart3,
  TrendingUp,
  PieChart as PieChartIcon,
  Activity,
  Calendar,
  Layers,
  Sparkles,
  ArrowUpDown,
  RefreshCw,
  Trash2,
  BookmarkPlus,
  Eye,
  Table as TableIcon,
  CheckCircle2,
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  Users,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Sliders,
  FileDown,
  Loader2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Button } from '@repo/ui/components/ui/button';
import { Input } from '@repo/ui/components/ui/input';
import { Badge } from '@repo/ui/components/ui/badge';
import { toast } from 'sonner';
import {
  getAnalyticsStacks,
  deleteAnalyticsStack,
  savePinnedChart,
  getPinnedCharts,
  deletePinnedChart,
} from './_actions/analytics-actions';
import { exportSheetToExcel, exportSheetToCsv } from '@/lib/sheet-utils';
import { generateAnalyticsPdfReport } from './_lib/analytics-pdf-report';

// Color palette for charts
const CHART_COLORS = {
  present: '#10b981', // Emerald for P (Present)
  absent: '#f43f5e', // Rose/Red for A (Absent)
  primary: '#8b5cf6', // Violet
  secondary: '#0ea5e9', // Sky
  amber: '#f59e0b', // Amber
  teal: '#14b8a6', // Teal
  pink: '#ec4899', // Pink
};

const PALETTE = ['#8b5cf6', '#10b981', '#0ea5e9', '#f59e0b', '#f43f5e', '#ec4899', '#14b8a6', '#6366f1'];

export default function AnalyticsPage() {
  const params = useParams();
  const dashid = (params?.dashid as string) || '';
  const { data: session } = useSession();
  const userId = session?.user?.id;

  // Stacks & Pinned Charts State
  const [stacks, setStacks] = useState<any[]>([]);
  const [pinnedCharts, setPinnedCharts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStackId, setSelectedStackId] = useState<string | null>(null);

  // Studio Chart Controls
  const [analysisMode, setAnalysisMode] = useState<'timeline' | 'matrix' | 'custom'>('timeline');
  const [timelineMetric, setTimelineMetric] = useState<
    'class_trend' | 'student_trajectory' | 'tiers_over_time' | 'student_comparison' | 'tier_donut'
  >('class_trend');
  const [selectedStudentKey, setSelectedStudentKey] = useState<string>('all');
  const [matrixMetric, setMatrixMetric] = useState<'daily_trend' | 'daily_rate' | 'student_breakdown' | 'pie_distribution'>('daily_trend');
  const [chartType, setChartType] = useState<'bar' | 'area' | 'line' | 'pie'>('area');
  const [isStacked, setIsStacked] = useState(true);

  // Custom Axis Selection State
  const [customXAxis, setCustomXAxis] = useState<string>('');
  const [customYAxis, setCustomYAxis] = useState<string[]>([]);
  const [customYType, setCustomYType] = useState<'category_count' | 'numerical_sum' | 'numerical_avg'>('category_count');
  const [categoryTarget, setCategoryTarget] = useState<string>('P');

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [showTablePreview, setShowTablePreview] = useState(false);

  // X-Axis Sliding Window & Navigation State (prevents messy overlapping labels for 365+ days)
  const [xAxisWindowSize, setXAxisWindowSize] = useState<number | 'all'>(20);
  const [xAxisStartIndex, setXAxisStartIndex] = useState<number>(0);

  // PDF Export State & Chart Ref
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Fetch stacks and pinned charts
  const fetchData = useCallback(async () => {
    if (!dashid) return;
    setLoading(true);
    try {
      const [stackList, charts] = await Promise.all([
        getAnalyticsStacks(dashid, userId),
        getPinnedCharts(dashid, userId),
      ]);
      setStacks(stackList);
      setPinnedCharts(charts);

      if (stackList.length > 0 && !selectedStackId) {
        setSelectedStackId(stackList[0].id);
      }
    } catch (err) {
      console.error('Failed to load analytics data:', err);
      toast.error('Failed to load analytics stacks');
    } finally {
      setLoading(false);
    }
  }, [dashid, userId, selectedStackId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Selected stack data
  const selectedStack = useMemo(() => {
    return stacks.find((s) => s.id === selectedStackId) || stacks[0] || null;
  }, [stacks, selectedStackId]);

  const dataset = selectedStack?.data as { columns: string[]; data: any[][] } | null;
  const columns = dataset?.columns || [];
  const rows = dataset?.data || [];

  // Auto-detect matrix date columns (e.g. "Jul 1", "Jul 2", "01/07", etc.) vs identifier columns
  const { dateColumns, idColumns } = useMemo(() => {
    if (!columns.length) return { dateColumns: [], idColumns: [] };

    // Identifying key columns
    const idKeys = ['s.no', 'sno', 'enrollment', 'roll no', 'id', 'name', 'student name'];
    const ids: string[] = [];
    const dates: string[] = [];

    columns.forEach((col) => {
      const lower = col.toLowerCase().trim();
      if (idKeys.some((k) => lower.includes(k))) {
        ids.push(col);
      } else {
        dates.push(col);
      }
    });

    // If no explicit date columns identified, split first 2 or 3 as IDs and rest as metrics
    if (dates.length === 0 && columns.length > 2) {
      return { idColumns: columns.slice(0, 2), dateColumns: columns.slice(2) };
    }

    return { idColumns: ids, dateColumns: dates };
  }, [columns]);

  // Update default X and Y axis when dataset changes
  useEffect(() => {
    if (columns.length > 0) {
      if (!customXAxis || !columns.includes(customXAxis)) {
        setCustomXAxis(idColumns[0] || columns[0]);
      }
      if (customYAxis.length === 0 || !customYAxis.every((c) => columns.includes(c))) {
        setCustomYAxis(dateColumns.slice(0, 3));
      }
    }
  }, [columns, idColumns, dateColumns, customXAxis, customYAxis]);

  // Detect if current stack is an Attendance Summary / Percentage Table
  const isSummaryTable = useMemo(() => {
    return (
      Boolean(selectedStack?.metadata?.isSummaryTable) ||
      columns.some((c) => /percent|pct|%/i.test(c)) ||
      columns.some((c) => /attend/i.test(c))
    );
  }, [selectedStack, columns]);

  // Default to timeline mode if it's a summary table, or matrix if it has date columns
  useEffect(() => {
    if (isSummaryTable) {
      setAnalysisMode('timeline');
    } else if (dateColumns.length > 0) {
      setAnalysisMode('matrix');
    }
  }, [selectedStackId, isSummaryTable, dateColumns.length]);

  // ── TIMELINE & TIME-SERIES COMPUTATIONS (For Tables Inserted Over Time) ──
  const studentsList = useMemo(() => {
    if (!rows.length) return [];
    const enrollIdx = columns.findIndex((c) => /enroll|roll|id/i.test(c));
    const nameIdx = columns.findIndex((c) => /name|student/i.test(c));
    const pctIdx = columns.findIndex((c) => /percent|pct|%/i.test(c));
    const attendIdx = columns.findIndex((c) => /attend/i.test(c));
    const totalIdx = columns.findIndex((c) => /total.*class|classes.*total|total/i.test(c));

    return rows.map((r, idx) => {
      const enroll = enrollIdx >= 0 ? String(r[enrollIdx] ?? '').trim() : `S_${idx + 1}`;
      const name = nameIdx >= 0 ? String(r[nameIdx] ?? enroll).trim() : enroll;

      let pct = 0;
      if (pctIdx >= 0 && r[pctIdx] !== undefined) {
        const raw = String(r[pctIdx]).replace('%', '').trim();
        const num = parseFloat(raw);
        if (!isNaN(num)) pct = num;
      }
      let attend = 0;
      if (attendIdx >= 0 && r[attendIdx] !== undefined) {
        const num = parseFloat(String(r[attendIdx]).trim());
        if (!isNaN(num)) attend = num;
      }
      let total = 0;
      if (totalIdx >= 0 && r[totalIdx] !== undefined) {
        const num = parseFloat(String(r[totalIdx]).trim());
        if (!isNaN(num)) total = num;
      }
      if (pct === 0 && total > 0 && attend > 0) {
        pct = Math.round((attend / total) * 10000) / 100;
      }

      return {
        enroll,
        name,
        attend,
        total,
        percentage: pct,
      };
    });
  }, [rows, columns]);

  const snapshots: any[] = useMemo(() => {
    return Array.isArray(selectedStack?.metadata?.snapshots)
      ? selectedStack.metadata.snapshots
      : [];
  }, [selectedStack]);

  const timelineData = useMemo(() => {
    if (snapshots.length > 0) {
      return snapshots.map((snap: any, idx: number) => {
        const label = snap.shortLabel || `Run ${idx + 1}`;
        const entry: any = {
          time: label,
          fullLabel: snap.label,
          'Class Average (%)': snap.avgPercentage ?? 0,
          'Total Classes': snap.totalClasses ?? 0,
          'Total Attended': snap.totalAttend ?? 0,
          'Safe (>=75%)': snap.eligibleCount ?? 0,
          'Warning (60-74%)': snap.warningCount ?? 0,
          'Defaulters (<60%)': snap.defaulterCount ?? 0,
        };

        if (selectedStudentKey && selectedStudentKey !== 'all' && snap.students) {
          const stud = snap.students[selectedStudentKey];
          if (stud) {
            entry[`${stud.name || selectedStudentKey} (%)`] = stud.percentage ?? 0;
            entry[`${stud.name || selectedStudentKey} Attended`] = stud.attend ?? 0;
          }
        }
        return entry;
      });
    }

    const avg = studentsList.length > 0
      ? Math.round((studentsList.reduce((acc, s) => acc + s.percentage, 0) / studentsList.length) * 100) / 100
      : 0;

    const entry: any = {
      time: 'Run 1 (Initial Table)',
      'Class Average (%)': avg,
      'Total Classes': studentsList[0]?.total || 30,
      'Safe (>=75%)': studentsList.filter((s) => s.percentage >= 75).length,
      'Warning (60-74%)': studentsList.filter((s) => s.percentage >= 60 && s.percentage < 75).length,
      'Defaulters (<60%)': studentsList.filter((s) => s.percentage < 60).length,
    };

    if (selectedStudentKey && selectedStudentKey !== 'all') {
      const stud = studentsList.find((s) => s.enroll === selectedStudentKey);
      if (stud) {
        entry[`${stud.name} (%)`] = stud.percentage;
        entry[`${stud.name} Attended`] = stud.attend;
      }
    }

    return [entry];
  }, [snapshots, studentsList, selectedStudentKey]);

  const timelineDonutData = useMemo(() => {
    const safe = studentsList.filter((s) => s.percentage >= 75).length;
    const warning = studentsList.filter((s) => s.percentage >= 60 && s.percentage < 75).length;
    const defaulters = studentsList.filter((s) => s.percentage < 60).length;

    return [
      { name: 'Eligible (>= 75%)', value: safe, color: '#10b981' },
      { name: 'Warning (60% - 74%)', value: warning, color: '#f59e0b' },
      { name: 'Critical Shortage (< 60%)', value: defaulters, color: '#f43f5e' },
    ].filter((d) => d.value > 0);
  }, [studentsList]);

  const studentComparisonData = useMemo(() => {
    return studentsList
      .slice()
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 40)
      .map((s) => ({
        name: s.name,
        enroll: s.enroll,
        'Attendance (%)': s.percentage,
        'Attended Classes': s.attend,
        'Total Classes': s.total,
        fill: s.percentage >= 75 ? '#10b981' : s.percentage >= 60 ? '#f59e0b' : '#f43f5e',
      }));
  }, [studentsList]);

  const currentAvgPercentage = useMemo(() => {
    if (!studentsList.length) return 0;
    const sum = studentsList.reduce((acc, s) => acc + s.percentage, 0);
    return Math.round((sum / studentsList.length) * 100) / 100;
  }, [studentsList]);

  const currentSafeCount = useMemo(() => {
    return studentsList.filter((s) => s.percentage >= 75).length;
  }, [studentsList]);

  const currentDefaulterCount = useMemo(() => {
    return studentsList.filter((s) => s.percentage < 60).length;
  }, [studentsList]);

  // ── MATRIX MODE COMPUTATIONS (For Attendance / P & A Data) ──
  const matrixData = useMemo(() => {
    if (!rows.length || !dateColumns.length) {
      return { dailyTrend: [], studentBreakdown: [], overallStats: { present: 0, absent: 0, total: 0 } };
    }

    let totalPresent = 0;
    let totalAbsent = 0;

    // 1. Daily trend: for each date column, count P and A
    const dailyTrend = dateColumns.map((day) => {
      const dayIdx = columns.indexOf(day);
      let pCount = 0;
      let aCount = 0;

      rows.forEach((r) => {
        const val = String(r[dayIdx] ?? '').trim().toUpperCase();
        if (val === 'P' || val === 'PRESENT' || val === '1') {
          pCount++;
          totalPresent++;
        } else if (val === 'A' || val === 'ABSENT' || val === '0') {
          aCount++;
          totalAbsent++;
        }
      });

      const totalDay = pCount + aCount;
      const rate = totalDay > 0 ? Math.round((pCount / totalDay) * 100) : 0;

      return {
        day,
        Present: pCount,
        Absent: aCount,
        'Attendance Rate (%)': rate,
      };
    });

    // 2. Student Breakdown
    const nameColIdx = columns.findIndex((c) => c.toLowerCase().includes('name')) >= 0
      ? columns.findIndex((c) => c.toLowerCase().includes('name'))
      : columns.findIndex((c) => c.toLowerCase().includes('enrollment')) >= 0
      ? columns.findIndex((c) => c.toLowerCase().includes('enrollment'))
      : 1;

    const studentBreakdown = rows
      .map((r, idx) => {
        const studentName = String(r[nameColIdx] ?? `Student ${idx + 1}`).trim();
        let studentP = 0;
        let studentA = 0;

        dateColumns.forEach((day) => {
          const dayIdx = columns.indexOf(day);
          const val = String(r[dayIdx] ?? '').trim().toUpperCase();
          if (val === 'P' || val === 'PRESENT' || val === '1') studentP++;
          else if (val === 'A' || val === 'ABSENT' || val === '0') studentA++;
        });

        const totalStudent = studentP + studentA;
        const rate = totalStudent > 0 ? Math.round((studentP / totalStudent) * 100) : 0;

        return {
          name: studentName,
          Present: studentP,
          Absent: studentA,
          Rate: rate,
        };
      })
      .slice(0, 35); // limit top 35 for readable chart

    return {
      dailyTrend,
      studentBreakdown,
      overallStats: {
        present: totalPresent,
        absent: totalAbsent,
        total: totalPresent + totalAbsent,
      },
    };
  }, [rows, columns, dateColumns]);

  // Overall pie data
  const overallPieData = useMemo(() => {
    const { present, absent } = matrixData.overallStats;
    if (present === 0 && absent === 0) return [];
    return [
      { name: 'Present (P)', value: present, color: CHART_COLORS.present },
      { name: 'Absent (A)', value: absent, color: CHART_COLORS.absent },
    ];
  }, [matrixData]);

  // ── CUSTOM X / Y MODE COMPUTATIONS ──
  const customChartData = useMemo(() => {
    if (!rows.length || !customXAxis) return [];

    const xIdx = columns.indexOf(customXAxis);
    if (xIdx < 0) return [];

    if (customYType === 'category_count') {
      // Count frequency of categoryTarget (e.g. 'P') for selected columns
      return rows.map((r) => {
        const xVal = String(r[xIdx] ?? '');
        const entry: any = { x: xVal };

        customYAxis.forEach((yCol) => {
          const yIdx = columns.indexOf(yCol);
          const val = String(r[yIdx] ?? '').trim().toUpperCase();
          entry[yCol] = val === categoryTarget.toUpperCase() ? 1 : 0;
        });

        return entry;
      });
    } else {
      // Numerical values
      return rows.map((r) => {
        const xVal = String(r[xIdx] ?? '');
        const entry: any = { x: xVal };

        customYAxis.forEach((yCol) => {
          const yIdx = columns.indexOf(yCol);
          const num = Number(r[yIdx]);
          entry[yCol] = isNaN(num) ? 0 : num;
        });

        return entry;
      });
    }
  }, [rows, columns, customXAxis, customYAxis, customYType, categoryTarget]);

  // ── X-AXIS SLIDING WINDOW & PAGINATION COMPUTATIONS (For 365+ Days or Long Datasets) ──
  // Active dataset count along the X-Axis based on active mode & metric
  const activeXTotal = useMemo(() => {
    if (analysisMode === 'timeline') {
      if (timelineMetric === 'student_comparison') return studentComparisonData.length;
      if (timelineMetric === 'tier_donut') return 0;
      return timelineData.length;
    } else if (analysisMode === 'matrix') {
      if (matrixMetric === 'student_breakdown') return matrixData.studentBreakdown.length;
      if (matrixMetric === 'pie_distribution') return 0;
      return matrixData.dailyTrend.length;
    } else {
      return customChartData.length;
    }
  }, [
    analysisMode,
    timelineMetric,
    matrixMetric,
    studentComparisonData.length,
    timelineData.length,
    matrixData.studentBreakdown.length,
    matrixData.dailyTrend.length,
    customChartData.length,
  ]);

  const effectiveWindowSize = typeof xAxisWindowSize === 'number' ? xAxisWindowSize : activeXTotal;
  const slideStep = typeof xAxisWindowSize === 'number' ? Math.max(1, Math.floor(xAxisWindowSize / 2)) : 10;
  const canSlideLeft = xAxisWindowSize !== 'all' && xAxisStartIndex > 0;
  const canSlideRight = xAxisWindowSize !== 'all' && xAxisStartIndex + effectiveWindowSize < activeXTotal;

  // Clamping when dataset, mode, or window size changes
  useEffect(() => {
    if (xAxisWindowSize !== 'all' && activeXTotal > 0 && xAxisStartIndex >= activeXTotal) {
      setXAxisStartIndex(Math.max(0, activeXTotal - (typeof xAxisWindowSize === 'number' ? xAxisWindowSize : 20)));
    }
  }, [activeXTotal, xAxisWindowSize, xAxisStartIndex]);

  const handleSlideLeft = () => {
    setXAxisStartIndex((prev) => Math.max(0, prev - slideStep));
  };

  const handleSlideRight = () => {
    setXAxisStartIndex((prev) => Math.min(Math.max(0, activeXTotal - effectiveWindowSize), prev + slideStep));
  };

  const handleJumpFirst = () => {
    setXAxisStartIndex(0);
  };

  const handleJumpLast = () => {
    setXAxisStartIndex(Math.max(0, activeXTotal - effectiveWindowSize));
  };

  // Sliced datasets for rendering
  const slicedDailyTrend = useMemo(() => {
    if (xAxisWindowSize === 'all' || matrixData.dailyTrend.length <= (xAxisWindowSize as number)) {
      return matrixData.dailyTrend;
    }
    return matrixData.dailyTrend.slice(xAxisStartIndex, xAxisStartIndex + (xAxisWindowSize as number));
  }, [matrixData.dailyTrend, xAxisWindowSize, xAxisStartIndex]);

  const slicedStudentBreakdown = useMemo(() => {
    if (xAxisWindowSize === 'all' || matrixData.studentBreakdown.length <= (xAxisWindowSize as number)) {
      return matrixData.studentBreakdown;
    }
    return matrixData.studentBreakdown.slice(xAxisStartIndex, xAxisStartIndex + (xAxisWindowSize as number));
  }, [matrixData.studentBreakdown, xAxisWindowSize, xAxisStartIndex]);

  const slicedTimelineData = useMemo(() => {
    if (xAxisWindowSize === 'all' || timelineData.length <= (xAxisWindowSize as number)) {
      return timelineData;
    }
    return timelineData.slice(xAxisStartIndex, xAxisStartIndex + (xAxisWindowSize as number));
  }, [timelineData, xAxisWindowSize, xAxisStartIndex]);

  const slicedStudentComparisonData = useMemo(() => {
    if (xAxisWindowSize === 'all' || studentComparisonData.length <= (xAxisWindowSize as number)) {
      return studentComparisonData;
    }
    return studentComparisonData.slice(xAxisStartIndex, xAxisStartIndex + (xAxisWindowSize as number));
  }, [studentComparisonData, xAxisWindowSize, xAxisStartIndex]);

  const slicedCustomChartData = useMemo(() => {
    if (xAxisWindowSize === 'all' || customChartData.length <= (xAxisWindowSize as number)) {
      return customChartData;
    }
    return customChartData.slice(xAxisStartIndex, xAxisStartIndex + (xAxisWindowSize as number));
  }, [customChartData, xAxisWindowSize, xAxisStartIndex]);

  // Description of current visible range along X-Axis
  const rangeDescription = useMemo(() => {
    if (activeXTotal === 0) return 'No data';
    if (xAxisWindowSize === 'all' || activeXTotal <= effectiveWindowSize) {
      return `All ${activeXTotal} points`;
    }
    const start = xAxisStartIndex;
    const end = Math.min(activeXTotal - 1, xAxisStartIndex + effectiveWindowSize - 1);

    if (analysisMode === 'matrix' && (matrixMetric === 'daily_trend' || matrixMetric === 'daily_rate')) {
      const startDay = matrixData.dailyTrend[start]?.day || `Day ${start + 1}`;
      const endDay = matrixData.dailyTrend[end]?.day || `Day ${end + 1}`;
      return `${startDay} → ${endDay}`;
    }
    if (analysisMode === 'matrix' && matrixMetric === 'student_breakdown') {
      const startName = matrixData.studentBreakdown[start]?.name || `#${start + 1}`;
      const endName = matrixData.studentBreakdown[end]?.name || `#${end + 1}`;
      return `${startName} → ${endName}`;
    }
    if (analysisMode === 'timeline' && timelineMetric === 'student_comparison') {
      const startName = studentComparisonData[start]?.name || `#${start + 1}`;
      const endName = studentComparisonData[end]?.name || `#${end + 1}`;
      return `${startName} → ${endName}`;
    }
    if (analysisMode === 'timeline') {
      const startTime = timelineData[start]?.time || `Run ${start + 1}`;
      const endTime = timelineData[end]?.time || `Run ${end + 1}`;
      return `${startTime} → ${endTime}`;
    }
    if (analysisMode === 'custom') {
      const startX = customChartData[start]?.x || `#${start + 1}`;
      const endX = customChartData[end]?.x || `#${end + 1}`;
      return `${startX} → ${endX}`;
    }
    return `${start + 1} – ${end + 1}`;
  }, [
    activeXTotal,
    xAxisWindowSize,
    effectiveWindowSize,
    xAxisStartIndex,
    analysisMode,
    matrixMetric,
    timelineMetric,
    matrixData,
    studentComparisonData,
    timelineData,
    customChartData,
  ]);

  const isPieOrDonut =
    (analysisMode === 'timeline' && timelineMetric === 'tier_donut') ||
    (analysisMode === 'matrix' && matrixMetric === 'pie_distribution') ||
    (analysisMode === 'custom' && chartType === 'pie');

  const showXAxisControls = !isPieOrDonut && activeXTotal > 1;

  // Handle PDF report generation
  const handleExportPdf = async () => {
    if (!chartContainerRef.current || !selectedStack) return;
    setIsExportingPdf(true);
    const toastId = toast.loading('Generating executive PDF report...');
    try {
      const dimensionTitle =
        analysisMode === 'timeline'
          ? `Timeline Progress: ${timelineMetric.replace(/_/g, ' ').toUpperCase()}`
          : analysisMode === 'matrix'
          ? `Matrix Attendance: ${matrixMetric.replace(/_/g, ' ').toUpperCase()}`
          : `Custom Axis: ${customXAxis} vs ${customYAxis.join(', ')}`;

      const overallPct =
        isSummaryTable
          ? `${currentAvgPercentage}%`
          : matrixData.overallStats.total > 0
          ? `${Math.round((matrixData.overallStats.present / matrixData.overallStats.total) * 100)}%`
          : '100%';

      await generateAnalyticsPdfReport(chartContainerRef.current, {
        stackName: selectedStack.name,
        reportTitle: 'Attendance & Performance Analytics Report',
        dimensionTitle,
        metrics: [
          {
            label: isSummaryTable ? 'Total Students' : 'Analyzed Records',
            value: isSummaryTable ? `${studentsList.length} Students` : `${rows.length} Rows`,
            subtext: `${columns.length} Fields Tracked`,
          },
          {
            label: 'Average Attendance Rate',
            value: overallPct,
            subtext: 'Class Benchmark',
          },
          {
            label: isSummaryTable ? 'Safe (>=75%)' : 'Total Present',
            value: isSummaryTable ? currentSafeCount : matrixData.overallStats.present,
            subtext: isSummaryTable ? 'Eligible for Exams' : 'Total P marks',
          },
          {
            label: isSummaryTable ? 'Critical Shortage (<60%)' : 'Total Absent',
            value: isSummaryTable ? currentDefaulterCount : matrixData.overallStats.absent,
            subtext: isSummaryTable ? 'Defaulters List' : 'Total A marks',
          },
        ],
        table: {
          headers: columns.slice(0, 8),
          rows: rows.slice(0, 20).map((r) => r.slice(0, 8)),
        },
      });

      toast.success('PDF report downloaded successfully!', { id: toastId });
    } catch (err) {
      console.error('Failed to generate PDF report:', err);
      toast.error('Failed to generate PDF report', { id: toastId });
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Handle stack deletion
  const handleDeleteStack = async (id: string, name: string) => {
    if (!confirm(`Delete stack table "${name}"? This action cannot be undone.`)) return;
    try {
      await deleteAnalyticsStack(id, userId);
      toast.success(`Deleted stack "${name}"`);
      setStacks((prev) => prev.filter((s) => s.id !== id));
      if (selectedStackId === id) {
        setSelectedStackId(null);
      }
    } catch (e) {
      toast.error('Failed to delete stack');
    }
  };

  // Handle pinning current chart
  const handlePinChart = async () => {
    if (!userId || !dashid) return;
    try {
      const title = `${selectedStack?.name || 'Analytics'} — ${
        analysisMode === 'timeline'
          ? timelineMetric.replace(/_/g, ' ').toUpperCase()
          : analysisMode === 'matrix'
          ? matrixMetric.replace(/_/g, ' ').toUpperCase()
          : `${customXAxis} Analysis`
      }`;

      const newChart = await savePinnedChart(dashid, userId, {
        title,
        stackId: selectedStack?.id,
        stackName: selectedStack?.name,
        chartType,
        analysisMode,
        timelineMetric,
        selectedStudentKey,
        matrixMetric,
        customXAxis,
        customYAxis,
        createdAt: new Date().toISOString(),
      });

      setPinnedCharts((prev) => [newChart, ...prev]);
      toast.success('Chart pinned to dashboard!');
    } catch (e) {
      toast.error('Failed to pin chart');
    }
  };

  return (
    <div className="p-6 w-full mx-auto space-y-6 max-w-[1600px]">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/10">
            <BarChart3 className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Analytics &amp; Graph Studio</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Visualize stacked tables, daily matrices, and multi-axis performance trends from your workflow nodes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="h-8 text-xs gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {selectedStack && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="h-8 text-xs gap-1.5 border-violet-500/40 text-violet-400 hover:bg-violet-500/10 cursor-pointer shadow-xs"
            >
              {isExportingPdf ? (
                <Loader2 className="size-3.5 animate-spin text-violet-400" />
              ) : (
                <FileDown className="size-3.5 text-violet-400" />
              )}
              Export PDF
            </Button>
          )}

          {selectedStack && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportSheetToExcel(selectedStack.data, `${selectedStack.name}_analytics`)}
              className="h-8 text-xs gap-1.5 border-emerald-600/30 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer"
            >
              <FileSpreadsheet className="size-3.5" />
              Export Excel
            </Button>
          )}

          {selectedStack && (
            <Button
              size="sm"
              onClick={handlePinChart}
              className="h-8 text-xs gap-1.5 bg-violet-600 hover:bg-violet-700 text-white shadow-sm cursor-pointer"
            >
              <BookmarkPlus className="size-3.5" />
              Pin Chart
            </Button>
          )}
        </div>
      </div>

      {/* ── Key Metrics Summary ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border bg-card/60 backdrop-blur-sm shadow-xs flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-violet-500/10 text-violet-500">
            <Layers className="size-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Stack Tables</p>
            <p className="text-xl font-bold">{stacks.length}</p>
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-card/60 backdrop-blur-sm shadow-xs flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500">
            <Users className="size-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">
              {isSummaryTable ? 'Total Students' : 'Analyzed Records'}
            </p>
            <p className="text-xl font-bold">
              {isSummaryTable ? `${studentsList.length} Students` : `${rows.length.toLocaleString()} rows`}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-card/60 backdrop-blur-sm shadow-xs flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-sky-500/10 text-sky-500">
            {isSummaryTable ? <TrendingUp className="size-5" /> : <Calendar className="size-5" />}
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">
              {isSummaryTable ? 'Class Average Attendance' : 'Tracked Columns'}
            </p>
            <p className="text-xl font-bold">
              {isSummaryTable ? `${currentAvgPercentage}%` : `${dateColumns.length} Days / Fields`}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-card/60 backdrop-blur-sm shadow-xs flex items-center gap-3.5">
          <div
            className={`p-2.5 rounded-lg ${
              isSummaryTable && currentDefaulterCount > 0
                ? 'bg-rose-500/10 text-rose-500'
                : 'bg-amber-500/10 text-amber-500'
            }`}
          >
            <TrendingUp className="size-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">
              {isSummaryTable ? 'At-Risk Defaulters (<60%)' : 'Total Attendance Rate'}
            </p>
            <p className="text-xl font-bold">
              {isSummaryTable
                ? `${currentDefaulterCount} Students`
                : matrixData.overallStats.total > 0
                ? `${Math.round((matrixData.overallStats.present / matrixData.overallStats.total) * 100)}%`
                : '100%'}
            </p>
          </div>
        </div>
      </div>

      {/* ── STACKS DIRECTORY: The Generated Stacks (Rows) ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight">Active Analytics Stacks</h2>
            <Badge variant="outline" className="text-[10px] font-mono">
              {stacks.length} Available
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Select a stack row to configure and inspect its graph
          </p>
        </div>

        {stacks.length === 0 ? (
          <div className="p-8 border rounded-xl bg-card text-center space-y-3">
            <Layers className="size-10 text-muted-foreground/40 mx-auto" />
            <div>
              <p className="text-sm font-semibold">No Analytics Stacks Created Yet</p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                Add an <strong>Analytics Stack Node</strong> in your desk editor, connect your data (like your attendance sheet), and click &quot;Push to Analytics&quot; to begin.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {stacks.map((stack) => {
              const isSelected = stack.id === selectedStackId;
              const meta = stack.metadata as any;
              const stackRows = stack.data?.data?.length || meta?.rowCount || 0;
              const stackCols = stack.data?.columns?.length || meta?.colCount || 0;

              return (
                <div
                  key={stack.id}
                  onClick={() => setSelectedStackId(stack.id)}
                  className={`relative p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    isSelected
                      ? 'border-violet-500 bg-violet-500/5 shadow-md shadow-violet-500/10 ring-1 ring-violet-500'
                      : 'bg-card hover:bg-muted/40 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-violet-600 text-white'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <BarChart3 className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold truncate">{stack.name}</h3>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(stack.updatedAt).toLocaleDateString()} at{' '}
                          {new Date(stack.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteStack(stack.id, stack.name);
                      }}
                      className="p-1 rounded text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition"
                      title="Delete stack"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-2 border-t border-border/50">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span>{stackRows} rows</span>
                      <span>•</span>
                      <span>{stackCols} cols</span>
                    </div>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        isSelected
                          ? 'bg-violet-600/20 text-violet-300 font-semibold'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {isSelected ? 'Active Selection' : 'Click to Analyze'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── INTERACTIVE GRAPH STUDIO ── */}
      {selectedStack && (
        <div className="rounded-xl border bg-card overflow-hidden shadow-sm space-y-0">
          {/* Studio Navigation & Mode Bar */}
          <div className="p-4 bg-muted/30 border-b flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-md bg-violet-600 text-white">
                <Sliders className="size-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <span>Graph Studio: {selectedStack.name}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {rows.length} rows × {columns.length} columns
                  </Badge>
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Choose analysis mode, X/Y axes, and visualization type
                </p>
              </div>
            </div>

            {/* Mode Toggle: Timeline / Snapshots vs Matrix Attendance Mode vs Custom Column Mapping */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-muted rounded-lg text-xs font-medium">
              <button
                onClick={() => setAnalysisMode('timeline')}
                className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 cursor-pointer ${
                  analysisMode === 'timeline'
                    ? 'bg-background text-foreground shadow-xs font-semibold text-violet-600 dark:text-violet-400'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <TrendingUp className="size-3.5" />
                <span>Progress Over Time (Snapshots)</span>
              </button>

              <button
                onClick={() => setAnalysisMode('matrix')}
                className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 cursor-pointer ${
                  analysisMode === 'matrix'
                    ? 'bg-background text-foreground shadow-xs font-semibold text-violet-600 dark:text-violet-400'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Calendar className="size-3.5" />
                <span>Attendance / Matrix Mode</span>
              </button>

              <button
                onClick={() => setAnalysisMode('custom')}
                className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 cursor-pointer ${
                  analysisMode === 'custom'
                    ? 'bg-background text-foreground shadow-xs font-semibold text-violet-600 dark:text-violet-400'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <ArrowUpDown className="size-3.5" />
                <span>Custom X / Y Axis Mapping</span>
              </button>
            </div>
          </div>

          {/* Controls Panel */}
          <div className="p-4 border-b bg-muted/10 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            {analysisMode === 'timeline' ? (
              <>
                {/* Metric Selector for Timeline / Snapshots */}
                <div className="lg:col-span-6 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-violet-500" />
                      Time-Series Dimension
                    </label>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      X-Axis = Inserted Table Runs ({snapshots.length || 1} Snapshots)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                    <button
                      onClick={() => setTimelineMetric('class_trend')}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-medium border text-center transition cursor-pointer ${
                        timelineMetric === 'class_trend'
                          ? 'bg-violet-600 text-white border-violet-600 font-semibold'
                          : 'bg-background hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      Class Trend %
                    </button>
                    <button
                      onClick={() => setTimelineMetric('student_trajectory')}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-medium border text-center transition cursor-pointer ${
                        timelineMetric === 'student_trajectory'
                          ? 'bg-violet-600 text-white border-violet-600 font-semibold'
                          : 'bg-background hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      Student Trajectory
                    </button>
                    <button
                      onClick={() => setTimelineMetric('tiers_over_time')}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-medium border text-center transition cursor-pointer ${
                        timelineMetric === 'tiers_over_time'
                          ? 'bg-violet-600 text-white border-violet-600 font-semibold'
                          : 'bg-background hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      Eligibility Tiers
                    </button>
                    <button
                      onClick={() => setTimelineMetric('student_comparison')}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-medium border text-center transition cursor-pointer ${
                        timelineMetric === 'student_comparison'
                          ? 'bg-violet-600 text-white border-violet-600 font-semibold'
                          : 'bg-background hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      Rankings
                    </button>
                    <button
                      onClick={() => setTimelineMetric('tier_donut')}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-medium border text-center transition cursor-pointer ${
                        timelineMetric === 'tier_donut'
                          ? 'bg-violet-600 text-white border-violet-600 font-semibold'
                          : 'bg-background hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      Tier Donut
                    </button>
                  </div>
                </div>

                {/* Sub-selector: Student picker when student_trajectory or style toggle */}
                <div className="lg:col-span-4 space-y-1.5">
                  {timelineMetric === 'student_trajectory' ? (
                    <>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Users className="size-3.5 text-violet-500" />
                        Select Student to Track
                      </label>
                      <select
                        value={selectedStudentKey}
                        onChange={(e) => setSelectedStudentKey(e.target.value)}
                        className="w-full h-8 px-2 text-xs border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-violet-500 cursor-pointer"
                      >
                        <option value="all">Class Average Only</option>
                        {studentsList.map((stud) => (
                          <option key={stud.enroll} value={stud.enroll}>
                            {stud.enroll} — {stud.name} ({stud.percentage}%)
                          </option>
                        ))}
                      </select>
                    </>
                  ) : timelineMetric === 'tier_donut' ? (
                    <div className="text-xs text-muted-foreground flex items-center gap-2 h-8">
                      <span>Thresholds: 🟢 &gt;=75% Safe | 🟡 60-74% Warning | 🔴 &lt;60% Defaulter</span>
                    </div>
                  ) : (
                    <>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Chart Style
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setChartType('area')}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium border transition cursor-pointer ${
                            chartType === 'area' ? 'bg-primary text-primary-foreground font-bold' : 'bg-background'
                          }`}
                        >
                          Wave / Area
                        </button>
                        <button
                          onClick={() => setChartType('line')}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium border transition cursor-pointer ${
                            chartType === 'line' ? 'bg-primary text-primary-foreground font-bold' : 'bg-background'
                          }`}
                        >
                          Line
                        </button>
                        <button
                          onClick={() => setChartType('bar')}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium border transition cursor-pointer ${
                            chartType === 'bar' ? 'bg-primary text-primary-foreground font-bold' : 'bg-background'
                          }`}
                        >
                          Bar
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <div className="lg:col-span-2 flex justify-end items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTablePreview(!showTablePreview)}
                    className="h-8 text-xs gap-1.5 cursor-pointer"
                  >
                    <TableIcon className="size-3.5" />
                    {showTablePreview ? 'Hide Data' : 'View Data'}
                  </Button>
                </div>
              </>
            ) : analysisMode === 'matrix' ? (
              <>
                {/* Metric Selector for Matrix */}
                <div className="lg:col-span-6 space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-violet-500" />
                    Analysis Dimension
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    <button
                      onClick={() => setMatrixMetric('daily_trend')}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-medium border text-center transition cursor-pointer ${
                        matrixMetric === 'daily_trend'
                          ? 'bg-violet-600 text-white border-violet-600'
                          : 'bg-background hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      Daily Trend (P vs A)
                    </button>
                    <button
                      onClick={() => setMatrixMetric('daily_rate')}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-medium border text-center transition cursor-pointer ${
                        matrixMetric === 'daily_rate'
                          ? 'bg-violet-600 text-white border-violet-600'
                          : 'bg-background hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      Attendance Rate %
                    </button>
                    <button
                      onClick={() => setMatrixMetric('student_breakdown')}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-medium border text-center transition cursor-pointer ${
                        matrixMetric === 'student_breakdown'
                          ? 'bg-violet-600 text-white border-violet-600'
                          : 'bg-background hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      Student Breakdown
                    </button>
                    <button
                      onClick={() => setMatrixMetric('pie_distribution')}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-medium border text-center transition cursor-pointer ${
                        matrixMetric === 'pie_distribution'
                          ? 'bg-violet-600 text-white border-violet-600'
                          : 'bg-background hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      Overall Donut
                    </button>
                  </div>
                </div>

                {/* Chart Style Toggle */}
                <div className="lg:col-span-4 space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Chart Style
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setChartType('bar')}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium border transition cursor-pointer ${
                        chartType === 'bar' ? 'bg-primary text-primary-foreground font-bold' : 'bg-background'
                      }`}
                    >
                      Bar
                    </button>
                    <button
                      onClick={() => setChartType('area')}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium border transition cursor-pointer ${
                        chartType === 'area' ? 'bg-primary text-primary-foreground font-bold' : 'bg-background'
                      }`}
                    >
                      Wave / Area
                    </button>
                    <button
                      onClick={() => setChartType('line')}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium border transition cursor-pointer ${
                        chartType === 'line' ? 'bg-primary text-primary-foreground font-bold' : 'bg-background'
                      }`}
                    >
                      Line
                    </button>
                    {chartType === 'bar' && (
                      <button
                        onClick={() => setIsStacked(!isStacked)}
                        className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition cursor-pointer ml-auto ${
                          isStacked ? 'bg-violet-500/20 text-violet-400 border-violet-500/40' : 'bg-background'
                        }`}
                      >
                        {isStacked ? 'Stacked' : 'Grouped'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-2 flex justify-end items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTablePreview(!showTablePreview)}
                    className="h-8 text-xs gap-1.5 cursor-pointer"
                  >
                    <TableIcon className="size-3.5" />
                    {showTablePreview ? 'Hide Data' : 'View Data'}
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* Custom X Axis */}
                <div className="lg:col-span-4 space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    X Axis (Categories / Days)
                  </label>
                  <select
                    value={customXAxis}
                    onChange={(e) => setCustomXAxis(e.target.value)}
                    className="w-full h-8 px-2 text-xs border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-violet-500 cursor-pointer"
                  >
                    {columns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom Y Axis */}
                <div className="lg:col-span-5 space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                    <span>Y Axis Columns</span>
                    <span className="text-[10px] text-muted-foreground">Pick fields to plot</span>
                  </label>
                  <div className="flex flex-wrap gap-1 max-h-[60px] overflow-y-auto p-1 border rounded bg-background">
                    {columns.map((col) => {
                      const isChecked = customYAxis.includes(col);
                      return (
                        <button
                          key={col}
                          type="button"
                          onClick={() => {
                            setCustomYAxis((prev) =>
                              isChecked ? prev.filter((c) => c !== col) : [...prev, col]
                            );
                          }}
                          className={`text-[10px] px-2 py-0.5 rounded-full border transition cursor-pointer ${
                            isChecked
                              ? 'bg-violet-600 text-white border-violet-600'
                              : 'bg-muted text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {col}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Chart Type */}
                <div className="lg:col-span-3 space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Chart Type
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setChartType('bar')}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition cursor-pointer ${
                        chartType === 'bar' ? 'bg-primary text-primary-foreground font-bold' : 'bg-background'
                      }`}
                    >
                      Bar
                    </button>
                    <button
                      onClick={() => setChartType('area')}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition cursor-pointer ${
                        chartType === 'area' ? 'bg-primary text-primary-foreground font-bold' : 'bg-background'
                      }`}
                    >
                      Wave
                    </button>
                    <button
                      onClick={() => setChartType('line')}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition cursor-pointer ${
                        chartType === 'line' ? 'bg-primary text-primary-foreground font-bold' : 'bg-background'
                      }`}
                    >
                      Line
                    </button>
                    <button
                      onClick={() => setChartType('pie')}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition cursor-pointer ${
                        chartType === 'pie' ? 'bg-primary text-primary-foreground font-bold' : 'bg-background'
                      }`}
                    >
                      Pie
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── Interactive X-Axis Navigation & Window Bar (For 365+ Days or Long Datasets) ── */}
          {showXAxisControls && (
            <div className="px-6 py-2.5 bg-muted/20 border-b flex flex-wrap items-center justify-between gap-3 text-xs">
              {/* Navigation arrows & range badge */}
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleJumpFirst}
                  disabled={!canSlideLeft}
                  className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-30"
                  title="Jump to Earliest / Start"
                >
                  <ChevronsLeft className="size-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleSlideLeft}
                  disabled={!canSlideLeft}
                  className="h-7 w-7 cursor-pointer disabled:opacity-30 border-violet-500/30 hover:bg-violet-500/10 text-violet-300"
                  title="Slide Left (Previous dates)"
                >
                  <ChevronLeft className="size-4" />
                </Button>

                <div className="px-3 py-1 rounded-md bg-background border font-mono text-[11px] flex items-center gap-2 shadow-2xs">
                  <span className="text-violet-400 font-semibold">{rangeDescription}</span>
                  <span className="text-muted-foreground">
                    ({xAxisStartIndex + 1}–{Math.min(activeXTotal, xAxisStartIndex + effectiveWindowSize)} of {activeXTotal})
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleSlideRight}
                  disabled={!canSlideRight}
                  className="h-7 w-7 cursor-pointer disabled:opacity-30 border-violet-500/30 hover:bg-violet-500/10 text-violet-300"
                  title="Slide Right (Next dates)"
                >
                  <ChevronRight className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleJumpLast}
                  disabled={!canSlideRight}
                  className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-30"
                  title="Jump to Latest / End"
                >
                  <ChevronsRight className="size-3.5" />
                </Button>
              </div>

              {/* Timeline scrubbing slider */}
              {xAxisWindowSize !== 'all' && activeXTotal > effectiveWindowSize && (
                <div className="flex-1 min-w-[140px] max-w-[280px] flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, activeXTotal - effectiveWindowSize)}
                    value={xAxisStartIndex}
                    onChange={(e) => setXAxisStartIndex(Number(e.target.value))}
                    className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-violet-600"
                    title="Drag to scrub through timeline"
                  />
                </div>
              )}

              {/* Window size selector */}
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground text-[10px] uppercase font-semibold mr-1">View:</span>
                {[15, 25, 40, 'all'].map((sz) => (
                  <button
                    key={String(sz)}
                    onClick={() => setXAxisWindowSize(sz as any)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium border transition cursor-pointer ${
                      xAxisWindowSize === sz
                        ? 'bg-violet-600 text-white border-violet-600 font-semibold shadow-xs'
                        : 'bg-background hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    {sz === 'all' ? 'All' : `${sz} items`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chart Display Area */}
          <div className="p-6 bg-card min-h-[460px] flex flex-col justify-center relative">
            {/* Flanking Slide Buttons for single-click navigation directly on the chart sides */}
            {showXAxisControls && (
              <>
                <button
                  type="button"
                  onClick={handleSlideLeft}
                  disabled={!canSlideLeft}
                  aria-label="Slide X-Axis Left"
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full border border-border/80 bg-card/90 backdrop-blur-md shadow-xl text-foreground hover:bg-violet-600 hover:text-white hover:border-violet-500 disabled:opacity-0 disabled:pointer-events-none transition duration-200 cursor-pointer group"
                  title="Slide Left (Previous dates)"
                >
                  <ChevronLeft className="size-5 text-violet-400 group-hover:text-white transition" />
                </button>

                <button
                  type="button"
                  onClick={handleSlideRight}
                  disabled={!canSlideRight}
                  aria-label="Slide X-Axis Right"
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full border border-border/80 bg-card/90 backdrop-blur-md shadow-xl text-foreground hover:bg-violet-600 hover:text-white hover:border-violet-500 disabled:opacity-0 disabled:pointer-events-none transition duration-200 cursor-pointer group"
                  title="Slide Right (Next dates)"
                >
                  <ChevronRight className="size-5 text-violet-400 group-hover:text-white transition" />
                </button>
              </>
            )}

            <div ref={chartContainerRef} id="analytics-chart-container" className="w-full">
              {analysisMode === 'timeline' ? (
                /* ── TIMELINE / SNAPSHOT MODE ── */
                timelineMetric === 'tier_donut' ? (
                  <div className="h-[400px] w-full flex flex-col items-center justify-center">
                    <div className="text-center mb-2">
                      <h4 className="text-sm font-semibold">Attendance Eligibility Distribution</h4>
                      <p className="text-xs text-muted-foreground">
                        Current breakdown across {studentsList.length} students
                      </p>
                    </div>
                    <ResponsiveContainer width="100%" height="85%">
                      <PieChart>
                        <Pie
                          data={timelineDonutData}
                          cx="50%"
                          cy="50%"
                          innerRadius={80}
                          outerRadius={125}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, value, percent }) =>
                            `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                          }
                        >
                          {timelineDonutData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#18181b',
                            borderColor: '#27272a',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : timelineMetric === 'student_comparison' ? (
                  <div className="h-[420px] w-full">
                    <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <span>Student Attendance Rankings</span>
                          <Badge variant="outline" className="text-[10px]">
                            {slicedStudentComparisonData.length} of {studentComparisonData.length} Students
                          </Badge>
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Color coded: Green (&gt;=75% safe), Amber (60-74% warning), Red (&lt;60% defaulter)
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-emerald-500" /> Safe (&gt;=75%)</span>
                        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-amber-500" /> Warning (60-74%)</span>
                        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-rose-500" /> Defaulter (&lt;60%)</span>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height="85%">
                      <BarChart data={slicedStudentComparisonData} margin={{ bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.5} />
                        <XAxis
                          dataKey="name"
                          stroke="#a1a1aa"
                          fontSize={10}
                          angle={-35}
                          textAnchor="end"
                          interval={0}
                          height={60}
                        />
                        <YAxis stroke="#a1a1aa" fontSize={11} domain={[0, 100]} unit="%" />
                        <ReferenceLine
                          y={75}
                          stroke="#f59e0b"
                          strokeDasharray="4 4"
                          strokeWidth={1.5}
                          label={{ value: '75% Required', fill: '#f59e0b', fontSize: 11, position: 'right' }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#18181b',
                            borderColor: '#27272a',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                          formatter={(val: any, name: any, item: any) => [
                            `${val}% (${item.payload['Attended Classes']}/${item.payload['Total Classes']} classes)`,
                            'Attendance Rate',
                          ]}
                        />
                        <Bar dataKey="Attendance (%)" radius={[4, 4, 0, 0]}>
                          {slicedStudentComparisonData.map((entry, idx) => (
                            <Cell key={`cell-${idx}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : timelineMetric === 'tiers_over_time' ? (
                  <div className="h-[400px] w-full">
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold">Eligibility Tiers Over Time (Inserted Tables)</h4>
                      <p className="text-xs text-muted-foreground">
                        Progression of Safe, Warning, and Defaulter student volumes across each table insertion
                      </p>
                    </div>
                    <ResponsiveContainer width="100%" height="88%">
                      <BarChart data={slicedTimelineData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.5} />
                        <XAxis dataKey="time" stroke="#a1a1aa" fontSize={11} />
                        <YAxis stroke="#a1a1aa" fontSize={11} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#18181b',
                            borderColor: '#27272a',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                        />
                        <Legend />
                        <Bar dataKey="Safe (>=75%)" fill="#10b981" stackId="tier" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="Warning (60-74%)" fill="#f59e0b" stackId="tier" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="Defaulters (<60%)" fill="#f43f5e" stackId="tier" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : timelineMetric === 'student_trajectory' ? (
                  <div className="h-[400px] w-full">
                    <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-semibold">
                          Student Attendance Trajectory Over Time
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {selectedStudentKey !== 'all' && studentsList.find((s) => s.enroll === selectedStudentKey)
                            ? `Tracking ${studentsList.find((s) => s.enroll === selectedStudentKey)?.name} (${selectedStudentKey}) vs Class Benchmark`
                            : 'Comparing Class Average across table insertion runs'}
                        </p>
                      </div>
                      {snapshots.length <= 1 && (
                        <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30">
                          Initial Snapshot • Subsequent runs will stack along X-Axis
                        </Badge>
                      )}
                    </div>
                    <ResponsiveContainer width="100%" height="88%">
                      <LineChart data={slicedTimelineData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.5} />
                        <XAxis dataKey="time" stroke="#a1a1aa" fontSize={11} />
                        <YAxis stroke="#a1a1aa" fontSize={11} domain={[0, 100]} unit="%" />
                        <ReferenceLine
                          y={75}
                          stroke="#f59e0b"
                          strokeDasharray="4 4"
                          strokeWidth={1.5}
                          label={{ value: '75% Cutoff', fill: '#f59e0b', fontSize: 11, position: 'right' }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#18181b',
                            borderColor: '#27272a',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="Class Average (%)"
                          stroke="#8b5cf6"
                          strokeWidth={2}
                          strokeDasharray="4 4"
                          dot={{ r: 4 }}
                        />
                        {selectedStudentKey !== 'all' && (
                          <Line
                            type="monotone"
                            dataKey={`${studentsList.find((s) => s.enroll === selectedStudentKey)?.name || selectedStudentKey} (%)`}
                            stroke="#10b981"
                            strokeWidth={3}
                            dot={{ r: 5 }}
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  /* class_trend */
                  <div className="h-[400px] w-full">
                    <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-semibold">
                          Overall Class Attendance Trend (%) Across Table Insertions
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          X-Axis represents newly inserted table executions over time (Runs / Days)
                        </p>
                      </div>
                      {snapshots.length <= 1 && (
                        <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30">
                          Initial Snapshot • Subsequent runs will automatically plot along X-Axis
                        </Badge>
                      )}
                    </div>
                    <ResponsiveContainer width="100%" height="88%">
                      {chartType === 'line' ? (
                        <LineChart data={slicedTimelineData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.5} />
                          <XAxis dataKey="time" stroke="#a1a1aa" fontSize={11} />
                          <YAxis stroke="#a1a1aa" fontSize={11} domain={[0, 100]} unit="%" />
                          <ReferenceLine
                            y={75}
                            stroke="#f59e0b"
                            strokeDasharray="4 4"
                            strokeWidth={1.5}
                            label={{ value: '75% Required', fill: '#f59e0b', fontSize: 11, position: 'right' }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#18181b',
                              borderColor: '#27272a',
                              borderRadius: '8px',
                              fontSize: '12px',
                            }}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="Class Average (%)"
                            stroke="#8b5cf6"
                            strokeWidth={3}
                            dot={{ r: 5 }}
                          />
                        </LineChart>
                      ) : chartType === 'bar' ? (
                        <BarChart data={slicedTimelineData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.5} />
                          <XAxis dataKey="time" stroke="#a1a1aa" fontSize={11} />
                          <YAxis stroke="#a1a1aa" fontSize={11} domain={[0, 100]} unit="%" />
                          <ReferenceLine
                            y={75}
                            stroke="#f59e0b"
                            strokeDasharray="4 4"
                            strokeWidth={1.5}
                            label={{ value: '75% Required', fill: '#f59e0b', fontSize: 11, position: 'right' }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#18181b',
                              borderColor: '#27272a',
                              borderRadius: '8px',
                              fontSize: '12px',
                            }}
                          />
                          <Legend />
                          <Bar dataKey="Class Average (%)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      ) : (
                        <AreaChart data={slicedTimelineData}>
                          <defs>
                            <linearGradient id="classTrendGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.5} />
                          <XAxis dataKey="time" stroke="#a1a1aa" fontSize={11} />
                          <YAxis stroke="#a1a1aa" fontSize={11} domain={[0, 100]} unit="%" />
                          <ReferenceLine
                            y={75}
                            stroke="#f59e0b"
                            strokeDasharray="4 4"
                            strokeWidth={1.5}
                            label={{ value: '75% Required', fill: '#f59e0b', fontSize: 11, position: 'right' }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#18181b',
                              borderColor: '#27272a',
                              borderRadius: '8px',
                              fontSize: '12px',
                            }}
                          />
                          <Legend />
                          <Area
                            type="monotone"
                            dataKey="Class Average (%)"
                            stroke="#8b5cf6"
                            strokeWidth={3}
                            fill="url(#classTrendGrad)"
                          />
                        </AreaChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                )
              ) : analysisMode === 'matrix' ? (
                /* MATRIX ATTENDANCE MODE */
                matrixMetric === 'pie_distribution' ? (
                  <div className="h-[380px] w-full flex flex-col items-center justify-center">
                    <h4 className="text-sm font-semibold mb-2">Overall Attendance Breakdown</h4>
                    <ResponsiveContainer width="100%" height="90%">
                      <PieChart>
                        <Pie
                          data={overallPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={80}
                          outerRadius={120}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {overallPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#18181b',
                            borderColor: '#27272a',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : matrixMetric === 'daily_rate' ? (
                  <div className="h-[400px] w-full">
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold">Attendance Rate Trend (%) Over Time</h4>
                      <p className="text-xs text-muted-foreground">Percentage of students present on each calendar day</p>
                    </div>
                    <ResponsiveContainer width="100%" height="90%">
                      <AreaChart data={slicedDailyTrend}>
                        <defs>
                          <linearGradient id="rateGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.4} />
                            <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.5} />
                        <XAxis dataKey="day" stroke="#a1a1aa" fontSize={11} />
                        <YAxis stroke="#a1a1aa" fontSize={11} domain={[0, 100]} unit="%" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#18181b',
                            borderColor: '#27272a',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="Attendance Rate (%)"
                          stroke={CHART_COLORS.primary}
                          strokeWidth={2.5}
                          fill="url(#rateGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : matrixMetric === 'student_breakdown' ? (
                  <div className="h-[400px] w-full">
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold">Student Attendance Breakdown (Present vs Absent)</h4>
                      <p className="text-xs text-muted-foreground">Total classes attended per student</p>
                    </div>
                    <ResponsiveContainer width="100%" height="90%">
                      <BarChart data={slicedStudentBreakdown}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.5} />
                        <XAxis dataKey="name" stroke="#a1a1aa" fontSize={10} angle={-30} textAnchor="end" height={60} />
                        <YAxis stroke="#a1a1aa" fontSize={11} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#18181b',
                            borderColor: '#27272a',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                        />
                        <Legend />
                        <Bar dataKey="Present" fill={CHART_COLORS.present} stackId={isStacked ? 'a' : undefined} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Absent" fill={CHART_COLORS.absent} stackId={isStacked ? 'a' : undefined} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  /* Daily Trend (P vs A) */
                  <div className="h-[400px] w-full">
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold">Daily Attendance Volume (P vs A)</h4>
                      <p className="text-xs text-muted-foreground">Number of Present and Absent students per date column</p>
                    </div>
                    <ResponsiveContainer width="100%" height="90%">
                      {chartType === 'area' ? (
                        <AreaChart data={slicedDailyTrend}>
                          <defs>
                            <linearGradient id="pGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={CHART_COLORS.present} stopOpacity={0.4} />
                              <stop offset="95%" stopColor={CHART_COLORS.present} stopOpacity={0.0} />
                            </linearGradient>
                            <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={CHART_COLORS.absent} stopOpacity={0.4} />
                              <stop offset="95%" stopColor={CHART_COLORS.absent} stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.5} />
                          <XAxis dataKey="day" stroke="#a1a1aa" fontSize={11} />
                          <YAxis stroke="#a1a1aa" fontSize={11} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#18181b',
                              borderColor: '#27272a',
                              borderRadius: '8px',
                              fontSize: '12px',
                            }}
                          />
                          <Legend />
                          <Area type="monotone" dataKey="Present" stroke={CHART_COLORS.present} fill="url(#pGrad)" strokeWidth={2} />
                          <Area type="monotone" dataKey="Absent" stroke={CHART_COLORS.absent} fill="url(#aGrad)" strokeWidth={2} />
                        </AreaChart>
                      ) : chartType === 'line' ? (
                        <LineChart data={slicedDailyTrend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.5} />
                          <XAxis dataKey="day" stroke="#a1a1aa" fontSize={11} />
                          <YAxis stroke="#a1a1aa" fontSize={11} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#18181b',
                              borderColor: '#27272a',
                              borderRadius: '8px',
                              fontSize: '12px',
                            }}
                          />
                          <Legend />
                          <Line type="monotone" dataKey="Present" stroke={CHART_COLORS.present} strokeWidth={2.5} dot={{ r: 3 }} />
                          <Line type="monotone" dataKey="Absent" stroke={CHART_COLORS.absent} strokeWidth={2.5} dot={{ r: 3 }} />
                        </LineChart>
                      ) : (
                        <BarChart data={slicedDailyTrend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.5} />
                          <XAxis dataKey="day" stroke="#a1a1aa" fontSize={11} />
                          <YAxis stroke="#a1a1aa" fontSize={11} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#18181b',
                              borderColor: '#27272a',
                              borderRadius: '8px',
                              fontSize: '12px',
                            }}
                          />
                          <Legend />
                          <Bar dataKey="Present" fill={CHART_COLORS.present} stackId={isStacked ? 'a' : undefined} radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Absent" fill={CHART_COLORS.absent} stackId={isStacked ? 'a' : undefined} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                )
              ) : (
                /* CUSTOM COLUMN MAPPING MODE */
                <div className="h-[400px] w-full">
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold">Custom Column Visualization</h4>
                    <p className="text-xs text-muted-foreground">
                      X-Axis: <span className="font-mono text-violet-400">{customXAxis}</span> • Y-Axis:{' '}
                      <span className="font-mono text-violet-400">{customYAxis.join(', ') || 'None selected'}</span>
                    </p>
                  </div>

                  {customChartData.length === 0 || customYAxis.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground text-xs italic">
                      Select at least one Y-Axis column to plot
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="90%">
                      {chartType === 'area' ? (
                        <AreaChart data={slicedCustomChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.5} />
                          <XAxis dataKey="x" stroke="#a1a1aa" fontSize={10} />
                          <YAxis stroke="#a1a1aa" fontSize={11} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#18181b',
                              borderColor: '#27272a',
                              borderRadius: '8px',
                              fontSize: '12px',
                            }}
                          />
                          <Legend />
                          {customYAxis.map((col, idx) => (
                            <Area
                              key={col}
                              type="monotone"
                              dataKey={col}
                              stroke={PALETTE[idx % PALETTE.length]}
                              fill={PALETTE[idx % PALETTE.length]}
                              fillOpacity={0.2}
                              strokeWidth={2}
                            />
                          ))}
                        </AreaChart>
                      ) : chartType === 'line' ? (
                        <LineChart data={slicedCustomChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.5} />
                          <XAxis dataKey="x" stroke="#a1a1aa" fontSize={10} />
                          <YAxis stroke="#a1a1aa" fontSize={11} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#18181b',
                              borderColor: '#27272a',
                              borderRadius: '8px',
                              fontSize: '12px',
                            }}
                          />
                          <Legend />
                          {customYAxis.map((col, idx) => (
                            <Line
                              key={col}
                              type="monotone"
                              dataKey={col}
                              stroke={PALETTE[idx % PALETTE.length]}
                              strokeWidth={2}
                              dot={{ r: 3 }}
                            />
                          ))}
                        </LineChart>
                      ) : (
                        <BarChart data={slicedCustomChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.5} />
                          <XAxis dataKey="x" stroke="#a1a1aa" fontSize={10} />
                          <YAxis stroke="#a1a1aa" fontSize={11} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#18181b',
                              borderColor: '#27272a',
                              borderRadius: '8px',
                              fontSize: '12px',
                            }}
                          />
                          <Legend />
                          {customYAxis.map((col, idx) => (
                            <Bar
                              key={col}
                              dataKey={col}
                              fill={PALETTE[idx % PALETTE.length]}
                              radius={[4, 4, 0, 0]}
                            />
                          ))}
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Raw Data Preview Drawer */}
          {showTablePreview && (
            <div className="border-t bg-muted/20 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <TableIcon className="size-3.5 text-violet-500" />
                  Underlying Table Preview (First 50 Rows)
                </h4>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {columns.length} columns aligned
                </span>
              </div>
              <div className="border rounded-lg overflow-x-auto max-h-[260px] bg-background">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/60 border-b">
                      {columns.map((c, i) => (
                        <th key={i} className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 50).map((r, rIdx) => (
                      <tr key={rIdx} className="border-b hover:bg-muted/30">
                        {columns.map((_, cIdx) => (
                          <td key={cIdx} className="px-3 py-1.5 whitespace-nowrap font-mono text-[11px]">
                            {String(r[cIdx] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PINNED CHARTS GALLERY ── */}
      {pinnedCharts.length > 0 && (
        <div className="space-y-3 pt-4 border-t">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold tracking-tight flex items-center gap-2">
              <BookmarkPlus className="size-4 text-violet-400" />
              <span>Pinned Dashboard Charts</span>
            </h3>
            <span className="text-xs text-muted-foreground">{pinnedCharts.length} Saved</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pinnedCharts.map((chart) => (
              <div key={chart.id} className="p-4 rounded-xl border bg-card flex flex-col justify-between gap-3 shadow-xs">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold">{chart.name}</h4>
                    <p className="text-[10px] text-muted-foreground">
                      Pinned on {new Date(chart.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      await deletePinnedChart(chart.id);
                      setPinnedCharts((prev) => prev.filter((c) => c.id !== chart.id));
                      toast.success('Chart removed');
                    }}
                    className="p-1 rounded text-zinc-400 hover:text-red-500"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>

                <div className="h-[180px] w-full flex items-center justify-center border rounded bg-muted/10 p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={
                        chart.analysisMode === 'timeline' || chart.config?.analysisMode === 'timeline'
                          ? timelineData
                          : matrixData.dailyTrend
                      }
                    >
                      <CartesianGrid strokeDasharray="2 2" opacity={0.3} />
                      <XAxis
                        dataKey={
                          chart.analysisMode === 'timeline' || chart.config?.analysisMode === 'timeline'
                            ? 'time'
                            : 'day'
                        }
                        fontSize={9}
                      />
                      <YAxis fontSize={9} />
                      <Area
                        type="monotone"
                        dataKey={
                          chart.analysisMode === 'timeline' || chart.config?.analysisMode === 'timeline'
                            ? 'Class Average (%)'
                            : 'Present'
                        }
                        stroke="#8b5cf6"
                        fill="#8b5cf6"
                        fillOpacity={0.2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}