"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
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
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ReferenceLine,
} from "recharts";
import {
  BarChart3,
  PieChart as PieIcon,
  TrendingUp,
  Sliders,
  Sparkles,
  Download,
  Bookmark,
  RotateCcw,
  Layers,
  Table2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowUpDown,
  Filter,
  Check,
  X,
  Hash,
  Type,
  Calendar as CalendarIcon,
  Activity,
  UserCheck,
  UserX,
  Users,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Search,
  SlidersHorizontal,
  Settings2,
  Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@repo/ui/components/ui/button";
import { Badge } from "@repo/ui/components/ui/badge";
import { Input } from "@repo/ui/components/ui/input";
import { toast } from "sonner";

export interface DocumentCountConfig {
  positiveToken: string;
  positiveLabel: string;
  negativeToken: string;
  negativeLabel: string;
  benchmarkPct: number;
  isConfigured: boolean;
}

export const DEFAULT_COUNT_CONFIG: DocumentCountConfig = {
  positiveToken: "P",
  positiveLabel: "Present",
  negativeToken: "A",
  negativeLabel: "Absent",
  benchmarkPct: 75,
  isConfigured: false,
};

export const COUNT_PRESETS: {
  name: string;
  description: string;
  positiveToken: string;
  positiveLabel: string;
  negativeToken: string;
  negativeLabel: string;
  benchmarkPct: number;
}[] = [
  {
    name: "Attendance (P / A)",
    description: "Standard Present & Absent marks",
    positiveToken: "P",
    positiveLabel: "Present",
    negativeToken: "A",
    negativeLabel: "Absent",
    benchmarkPct: 75,
  },
  {
    name: "Full Words (Present / Absent)",
    description: "Spelled out attendance text",
    positiveToken: "Present",
    positiveLabel: "Present",
    negativeToken: "Absent",
    negativeLabel: "Absent",
    benchmarkPct: 75,
  },
  {
    name: "Binary (1 / 0)",
    description: "Numeric completion status",
    positiveToken: "1",
    positiveLabel: "Completed",
    negativeToken: "0",
    negativeLabel: "Incomplete",
    benchmarkPct: 80,
  },
  {
    name: "Boolean (Yes / No)",
    description: "Yes or No response tracking",
    positiveToken: "Yes",
    positiveLabel: "Yes",
    negativeToken: "No",
    negativeLabel: "No",
    benchmarkPct: 75,
  },
  {
    name: "Results (Pass / Fail)",
    description: "Evaluation / test grading",
    positiveToken: "Pass",
    positiveLabel: "Passed",
    negativeToken: "Fail",
    negativeLabel: "Failed",
    benchmarkPct: 70,
  },
];

interface DatasetAnalyticsTabProps {
  columns: string[];
  rows: any[][];
  file: {
    id: string;
    name: string;
    metadata?: any;
  } | null;
}

// Curated colors for Attendance & Analytics (Sky Blue theme everywhere, NO green)
const ATTENDANCE_COLORS = {
  present: "#0ea5e9", // Sky Blue
  absent: "#f43f5e", // Rose/Red
  warning: "#f59e0b", // Amber
  neutral: "#71717a", // Zinc
  primary: "#0ea5e9", // Sky Blue
};

const COLOR_PALETTES: Record<string, { name: string; colors: string[] }> = {
  monochrome: {
    name: "Zinc Monochrome",
    colors: ["#18181b", "#3f3f46", "#71717a", "#a1a1aa", "#d4d4d8", "#e4e4e7"],
  },
  indigo: {
    name: "Indigo Electric",
    colors: ["#6366f1", "#8b5cf6", "#3b82f6", "#0ea5e9", "#06b6d4", "#a855f7"],
  },
  emerald: {
    name: "Emerald Forest",
    colors: ["#059669", "#10b981", "#34d399", "#14b8a6", "#2dd4bf", "#0d9488"],
  },
  amber: {
    name: "Sunset Amber",
    colors: ["#d97706", "#f59e0b", "#fbbf24", "#ea580c", "#f97316", "#ef4444"],
  },
  violet: {
    name: "Cyber Violet",
    colors: ["#7c3aed", "#8b5cf6", "#a78bfa", "#c084fc", "#e879f9", "#9333ea"],
  },
  ocean: {
    name: "Oceanic Cyan",
    colors: ["#0284c7", "#0ea5e9", "#38bdf8", "#7dd3fc", "#06b6d4", "#22d3ee"],
  },
};

interface PinnedChart {
  id: string;
  title: string;
  chartType: "bar" | "horizontal-bar" | "line" | "area" | "pie" | "radar";
  dimensionCol: string;
  metricType: "count" | "sum" | "avg" | "min" | "max";
  measureCol: string;
  paletteKey: string;
  topN: number;
  sortOrder: "desc" | "asc" | "none";
  createdAt: number;
}

/**
 * Intelligent detector for Date / Session columns in datasets.
 * Handles formats such as:
 * - "Date / 9", "Date / 14", "Date / 28", "Date"
 * - "2016 / 8", "2017 / 3", "2024 / 09", "29-10-2026", "29/10/2026"
 * - "Jul 1", "Session 2", "Day 3"
 * - Columns containing predominantly P/A attendance markers
 */
export function isDateOrSessionColumn(
  colName: string,
  sampleValues: any[] = [],
): boolean {
  const lower = colName.toLowerCase().trim();

  // Exclude primary metadata / student identity columns
  const idKeywords = [
    "s.no",
    "sno",
    "sl. no.",
    "sl no",
    "sl.no",
    "sr. no.",
    "sr no",
    "serial",
    "enrollment",
    "enroll",
    "roll no",
    "roll",
    "reg no",
    "reg",
    "class no",
    "class",
    "student name",
    "name of student",
    "name of students",
    "student",
    "name",
    "email",
    "phone",
    "gender",
    "section",
    "id",
  ];
  if (
    idKeywords.some(
      (kw) =>
        lower === kw ||
        lower.startsWith(kw + " ") ||
        lower.endsWith(" " + kw) ||
        lower.includes("name of"),
    )
  ) {
    return false;
  }

  // 1. Matches "date" in column name (e.g. "Date / 9", "Date / 14")
  if (lower.includes("date")) return true;

  // 2. Matches Year / Month or Date patterns: "2016 / 8", "2017 / 3", "29-10-2026"
  if (/\b(19|20)\d{2}\s*[/.-]\s*\d{1,2}\b/.test(lower)) return true;
  if (/\b\d{1,2}\s*[/.-]\s*\d{1,2}\s*[/.-]\s*\d{2,4}\b/.test(lower))
    return true;
  if (
    /\b\d{1,2}\s*[/.-]\s*\d{1,2}\b/.test(lower) &&
    !lower.includes("class") &&
    !lower.includes("roll")
  ) {
    return true;
  }

  // 3. Month names in header: "Jan 12", "15 Aug", "Jul / 5"
  if (
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i.test(lower)
  ) {
    return true;
  }

  // 4. Day / Session / Period / Lecture patterns: "Day 1", "Session / 3", "Period 2"
  if (/\b(session|day|lecture|period)\s*[/.-]?\s*\d*\b/i.test(lower)) {
    return true;
  }

  // 5. Value fallback: If 60%+ of non-empty values are attendance tokens (P, A, Present, Absent)
  if (sampleValues.length > 0) {
    let attendanceCount = 0;
    let filledCount = 0;
    sampleValues.forEach((v) => {
      if (v !== undefined && v !== null && String(v).trim() !== "") {
        filledCount++;
        const s = String(v).trim().toUpperCase();
        if (
          s === "P" ||
          s === "A" ||
          s === "PRESENT" ||
          s === "ABSENT" ||
          s === "1" ||
          s === "0"
        ) {
          attendanceCount++;
        }
      }
    });
    if (filledCount > 0 && attendanceCount / filledCount >= 0.6) {
      return true;
    }
  }

  return false;
}

export const DatasetAnalyticsTab: React.FC<DatasetAnalyticsTabProps> = ({
  columns,
  rows,
  file,
}) => {
  // Navigation inside Analytics tab
  const [subTab, setSubTab] = useState<
    "attendance" | "auto" | "studio" | "completeness"
  >("attendance");

  // -------------------------------------------------------------
  // Dynamic "What to Count" Configuration
  // Persisted in localStorage per document: dl_count_config_${file.id}
  // -------------------------------------------------------------
  const countConfigStorageKey = useMemo(() => {
    return file?.id ? `dl_count_config_${file.id}` : "dl_count_config_default";
  }, [file?.id]);

  const [countConfig, setCountConfig] = useState<DocumentCountConfig>(() => {
    if (typeof window !== "undefined" && file?.id) {
      try {
        const stored = localStorage.getItem(`dl_count_config_${file.id}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed === "object" && parsed.positiveToken) {
            return {
              positiveToken: String(parsed.positiveToken || "P"),
              positiveLabel: String(parsed.positiveLabel || "Present"),
              negativeToken: String(parsed.negativeToken || "A"),
              negativeLabel: String(parsed.negativeLabel || "Absent"),
              benchmarkPct: Number(parsed.benchmarkPct) || 75,
              isConfigured: Boolean(parsed.isConfigured),
            };
          }
        }
      } catch (err) {
        console.error("Failed to load count configuration:", err);
      }
    }
    return DEFAULT_COUNT_CONFIG;
  });

  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [draftPosToken, setDraftPosToken] = useState(countConfig.positiveToken);
  const [draftPosLabel, setDraftPosLabel] = useState(countConfig.positiveLabel);
  const [draftNegToken, setDraftNegToken] = useState(countConfig.negativeToken);
  const [draftNegLabel, setDraftNegLabel] = useState(countConfig.negativeLabel);
  const [draftBenchmark, setDraftBenchmark] = useState(
    countConfig.benchmarkPct,
  );

  // Check localStorage on mount or file change; if not configured, ask user before starting
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(countConfigStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === "object" && parsed.isConfigured) {
          const loaded: DocumentCountConfig = {
            positiveToken: String(parsed.positiveToken || "P"),
            positiveLabel: String(parsed.positiveLabel || "Present"),
            negativeToken: String(parsed.negativeToken || "A"),
            negativeLabel: String(parsed.negativeLabel || "Absent"),
            benchmarkPct: Number(parsed.benchmarkPct) || 75,
            isConfigured: true,
          };
          setCountConfig(loaded);
          setDraftPosToken(loaded.positiveToken);
          setDraftPosLabel(loaded.positiveLabel);
          setDraftNegToken(loaded.negativeToken);
          setDraftNegLabel(loaded.negativeLabel);
          setDraftBenchmark(loaded.benchmarkPct);
          setIsConfigModalOpen(false);
          return;
        }
      }
      // If no valid configuration found in localStorage for this document, prompt the user!
      setIsConfigModalOpen(true);
    } catch (err) {
      console.error("Error checking count config in localStorage:", err);
      setIsConfigModalOpen(true);
    }
  }, [countConfigStorageKey]);

  // Match helpers for counting
  const isPositiveMatch = useCallback(
    (rawVal: any) => {
      if (rawVal === undefined || rawVal === null) return false;
      const str = String(rawVal).trim().toUpperCase();
      if (!str) return false;

      const pos = countConfig.positiveToken.trim().toUpperCase();
      if (str === pos) return true;

      // Also match aliases if standard P or 1
      if (pos === "P" && (str === "PRESENT" || str === "1" || str === "TRUE"))
        return true;
      if (pos === "PRESENT" && (str === "P" || str === "1" || str === "TRUE"))
        return true;
      if (pos === "1" && (str === "TRUE" || str === "YES")) return true;
      if (pos === "YES" && str === "Y") return true;

      return false;
    },
    [countConfig.positiveToken],
  );

  const isNegativeMatch = useCallback(
    (rawVal: any) => {
      if (rawVal === undefined || rawVal === null) return false;
      const str = String(rawVal).trim().toUpperCase();
      if (!str) return false;

      const neg = countConfig.negativeToken.trim().toUpperCase();
      if (str === neg) return true;

      // Also match aliases if standard A or 0
      if (neg === "A" && (str === "ABSENT" || str === "0" || str === "FALSE"))
        return true;
      if (neg === "ABSENT" && (str === "A" || str === "0" || str === "FALSE"))
        return true;
      if (neg === "0" && (str === "FALSE" || str === "NO")) return true;
      if (neg === "NO" && str === "N") return true;

      return false;
    },
    [countConfig.negativeToken],
  );

  // -------------------------------------------------------------
  // 1. Column Identification & Classification
  // -------------------------------------------------------------
  const {
    detectedDateColumns,
    idColumns,
    numericColumns,
    categoricalColumns,
    studentNameCol,
    hasAttendanceData,
  } = useMemo(() => {
    const dates: string[] = [];
    const ids: string[] = [];
    const numCols: string[] = [];
    const catCols: string[] = [];
    let nameCol = "";
    let attendanceMarkerCount = 0;

    // Detect student name or primary identifier column
    const nameKeywords = [
      "name of students",
      "student name",
      "name",
      "student",
      "enrollment",
      "roll no",
      "class no",
      "id",
    ];

    columns.forEach((col, colIdx) => {
      const lower = col.toLowerCase().trim();
      const sample = rows.slice(0, 30).map((r) => r[colIdx]);

      // Check if Date / Attendance session column
      if (isDateOrSessionColumn(col, sample)) {
        dates.push(col);
      } else {
        ids.push(col);
      }

      // Check for Name column
      if (!nameCol) {
        for (const kw of nameKeywords) {
          if (lower === kw || lower.includes(kw)) {
            nameCol = col;
            break;
          }
        }
      }

      // Count attendance marks across rows
      rows.forEach((r) => {
        const val = String(r[colIdx] ?? "")
          .trim()
          .toUpperCase();
        if (
          val === "P" ||
          val === "A" ||
          val === "PRESENT" ||
          val === "ABSENT"
        ) {
          attendanceMarkerCount++;
        }
      });
    });

    if (!nameCol && ids.length > 0) {
      nameCol = ids[0];
    }

    // Classify numeric and categorical
    columns.forEach((col, colIdx) => {
      let filled = 0;
      let numCount = 0;
      const uniqueVals = new Set<string>();

      rows.forEach((r) => {
        const val = r[colIdx];
        if (val !== undefined && val !== null && String(val).trim() !== "") {
          filled++;
          const str = String(val).trim();
          uniqueVals.add(str);
          if (!isNaN(Number(str)) && isFinite(Number(str))) {
            numCount++;
          }
        }
      });

      if (filled > 0 && numCount / filled >= 0.75) {
        numCols.push(col);
      } else if (uniqueVals.size <= 25 && uniqueVals.size > 0) {
        catCols.push(col);
      }
    });

    return {
      detectedDateColumns: dates,
      idColumns: ids,
      numericColumns: numCols,
      categoricalColumns: catCols.length > 0 ? catCols : columns.slice(0, 5),
      studentNameCol: nameCol || columns[0] || "",
      hasAttendanceData: attendanceMarkerCount >= 5 || dates.length > 0,
    };
  }, [columns, rows]);

  // -------------------------------------------------------------
  // 2. Active Columns Selection for Analytics (User-customizable)
  // Default: SELECT ONLY THOSE COLUMNS WHOSE NAME IS DATE!
  // -------------------------------------------------------------
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [columnSearch, setColumnSearch] = useState("");

  // -------------------------------------------------------------
  // Column Frequency Distribution state & handlers
  // Allows user to dynamically add more columns, search, and adjust limit
  // -------------------------------------------------------------
  const [distribColumns, setDistribColumns] = useState<string[]>([]);
  const [distribSearch, setDistribSearch] = useState("");
  const [distribDisplayLimit, setDistribDisplayLimit] = useState<number>(12);
  const [isAddColumnMenuOpen, setIsAddColumnMenuOpen] = useState(false);

  // Initialize distribColumns: default to categorical columns or up to 12 columns
  useEffect(() => {
    if (columns.length > 0 && distribColumns.length === 0) {
      if (categoricalColumns.length > 0) {
        setDistribColumns(categoricalColumns);
      } else {
        setDistribColumns(columns.slice(0, 12));
      }
    }
  }, [columns, categoricalColumns]);

  const handleToggleDistribColumn = (col: string) => {
    setDistribColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  const handleAddAllDistribColumns = () => {
    setDistribColumns([...columns]);
    toast.info(`Showing all ${columns.length} columns in distribution`);
  };

  const handleAddCategoricalDistribColumns = () => {
    if (categoricalColumns.length > 0) {
      setDistribColumns([...categoricalColumns]);
      toast.info(`Showing ${categoricalColumns.length} categorical columns`);
    } else {
      setDistribColumns(columns.slice(0, 12));
    }
  };

  const handleAddDateDistribColumns = () => {
    if (detectedDateColumns.length > 0) {
      setDistribColumns([...detectedDateColumns]);
      toast.info(`Showing ${detectedDateColumns.length} date columns`);
    } else {
      toast.warning("No date columns detected");
    }
  };

  const handleClearDistribColumns = () => {
    setDistribColumns([]);
    toast.info("Cleared distribution columns");
  };

  const handleRemoveDistribColumn = (col: string) => {
    setDistribColumns((prev) => prev.filter((c) => c !== col));
  };

  // Initialize: Default to date columns only! If none, default to all columns
  useEffect(() => {
    if (columns.length > 0) {
      if (detectedDateColumns.length > 0) {
        setSelectedColumns(detectedDateColumns);
      } else {
        setSelectedColumns(columns);
      }
    }
  }, [columns, detectedDateColumns]);

  // If dataset has attendance data, default subTab to attendance
  useEffect(() => {
    if (hasAttendanceData) {
      setSubTab("attendance");
    } else {
      setSubTab("auto");
    }
  }, [hasAttendanceData]);

  // Quick Column Selectors
  const handleSelectDatesOnly = () => {
    if (detectedDateColumns.length > 0) {
      setSelectedColumns(detectedDateColumns);
      toast.info(`Selected ${detectedDateColumns.length} date columns`);
    } else {
      toast.warning("No explicit date columns detected in dataset");
    }
  };

  const handleSelectAllColumns = () => {
    setSelectedColumns([...columns]);
    toast.info(`Selected all ${columns.length} columns`);
  };

  const handleClearAllColumns = () => {
    setSelectedColumns([]);
    toast.info("Cleared column selection");
  };

  const toggleColumnSelection = (col: string) => {
    setSelectedColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col],
    );
  };

  // Filtered columns for the column picker
  const filteredColumnsList = useMemo(() => {
    if (!columnSearch.trim()) return columns;
    const q = columnSearch.toLowerCase();
    return columns.filter((col) => col.toLowerCase().includes(q));
  }, [columns, columnSearch]);

  // Active date columns = intersection of selected columns and detected date columns
  // or all selected columns if user manually added them
  const activeDateColumns = useMemo(() => {
    return columns.filter((col) => selectedColumns.includes(col));
  }, [columns, selectedColumns]);

  // Scan dataset columns to discover all unique values and their frequencies
  // Used for intelligent 1-click token suggestions in the "What to Count" modal
  const detectedSheetTokens = useMemo(() => {
    const scanCols =
      detectedDateColumns.length > 0 ? detectedDateColumns : columns;
    const freq: Record<string, number> = {};

    scanCols.forEach((col) => {
      const colIdx = columns.indexOf(col);
      if (colIdx === -1) return;
      rows.forEach((r) => {
        const val = r[colIdx];
        if (val !== undefined && val !== null) {
          const str = String(val).trim();
          if (str && str.length <= 15) {
            freq[str] = (freq[str] || 0) + 1;
          }
        }
      });
    });

    return Object.entries(freq)
      .map(([token, count]) => ({ token, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 16);
  }, [columns, rows, detectedDateColumns]);

  // Save count configuration to localStorage for this specific document
  const handleSaveCountConfig = (
    posToken = draftPosToken,
    posLabel = draftPosLabel,
    negToken = draftNegToken,
    negLabel = draftNegLabel,
    benchmark = draftBenchmark,
  ) => {
    const finalPosToken = posToken.trim() || "P";
    const finalPosLabel = posLabel.trim() || finalPosToken;
    const finalNegToken = negToken.trim() || "A";
    const finalNegLabel = negLabel.trim() || finalNegToken;
    const finalBenchmark = Number(benchmark) || 75;

    const newConfig: DocumentCountConfig = {
      positiveToken: finalPosToken,
      positiveLabel: finalPosLabel,
      negativeToken: finalNegToken,
      negativeLabel: finalNegLabel,
      benchmarkPct: finalBenchmark,
      isConfigured: true,
    };

    setCountConfig(newConfig);
    setDraftPosToken(finalPosToken);
    setDraftPosLabel(finalPosLabel);
    setDraftNegToken(finalNegToken);
    setDraftNegLabel(finalNegLabel);
    setDraftBenchmark(finalBenchmark);

    try {
      localStorage.setItem(countConfigStorageKey, JSON.stringify(newConfig));
      toast.success(
        `Counting saved for ${file?.name || "document"}: "${finalPosToken}" (${finalPosLabel}) vs "${finalNegToken}" (${finalNegLabel})`,
      );
    } catch (err) {
      console.error("Failed to save count configuration to localStorage:", err);
      toast.error("Failed to save configuration to localStorage");
    }

    setIsConfigModalOpen(false);
  };

  const handleUseStandardDefault = () => {
    handleSaveCountConfig("P", "Present", "A", "Absent", 75);
  };

  // -------------------------------------------------------------
  // 3. Attendance Analytics Computation (Present / Absent)
  // -------------------------------------------------------------
  const [attendanceViewMode, setAttendanceViewMode] = useState<
    "counts" | "rate"
  >("counts");
  const [selectedStudent, setSelectedStudent] = useState<string>("all");
  const [windowSize, setWindowSize] = useState<number | "all">(15);
  const [windowStartIndex, setWindowStartIndex] = useState<number>(0);

  const {
    dailyAttendanceTrend,
    studentAttendanceList,
    overallAttendanceStats,
    tierBreakdown,
  } = useMemo(() => {
    if (rows.length === 0 || activeDateColumns.length === 0) {
      return {
        dailyAttendanceTrend: [],
        studentAttendanceList: [],
        overallAttendanceStats: {
          present: 0,
          absent: 0,
          total: 0,
          rate: 0,
          activeDatesCount: 0,
        },
        tierBreakdown: [],
      };
    }

    let totalPresentMarks = 0;
    let totalAbsentMarks = 0;

    // 1. Daily trend: For each active date column, count positive & negative tokens
    const dailyTrend = activeDateColumns.map((day) => {
      const dayIdx = columns.indexOf(day);
      let pCount = 0;
      let aCount = 0;

      rows.forEach((row) => {
        const rawVal = row[dayIdx];
        if (isPositiveMatch(rawVal)) {
          pCount++;
          totalPresentMarks++;
        } else if (isNegativeMatch(rawVal)) {
          aCount++;
          totalAbsentMarks++;
        }
      });

      const dayTotal = pCount + aCount;
      const rate = dayTotal > 0 ? Math.round((pCount / dayTotal) * 100) : 0;

      return {
        day,
        Present: pCount,
        Absent: aCount,
        "Attendance Rate (%)": rate,
        total: dayTotal,
      };
    });

    // 2. Student-level Trajectory & Breakdown
    const nameColIdx = columns.indexOf(studentNameCol);

    const studentList = rows.map((row, idx) => {
      const studentName =
        nameColIdx !== -1 && row[nameColIdx]
          ? String(row[nameColIdx]).trim()
          : `Student #${idx + 1}`;

      let studentP = 0;
      let studentA = 0;
      const dailyHistory: { day: string; status: "P" | "A" | "None" }[] = [];

      activeDateColumns.forEach((day) => {
        const dayIdx = columns.indexOf(day);
        const rawVal = row[dayIdx];

        if (isPositiveMatch(rawVal)) {
          studentP++;
          dailyHistory.push({ day, status: "P" });
        } else if (isNegativeMatch(rawVal)) {
          studentA++;
          dailyHistory.push({ day, status: "A" });
        } else {
          dailyHistory.push({ day, status: "None" });
        }
      });

      const totalStudentDays = studentP + studentA;
      const percentage =
        totalStudentDays > 0
          ? Math.round((studentP / totalStudentDays) * 100)
          : 0;

      const benchmark = countConfig.benchmarkPct || 75;
      const warningThreshold = Math.max(10, benchmark - 15);

      let tier: "safe" | "warning" | "shortage" = "safe";
      if (percentage < warningThreshold) {
        tier = "shortage";
      } else if (percentage < benchmark) {
        tier = "warning";
      }

      return {
        id: `stud_${idx}`,
        name: studentName,
        present: studentP,
        absent: studentA,
        total: totalStudentDays,
        percentage,
        tier,
        dailyHistory,
      };
    });

    // 3. Overall Stats
    const totalMarks = totalPresentMarks + totalAbsentMarks;
    const overallRate =
      totalMarks > 0 ? Math.round((totalPresentMarks / totalMarks) * 100) : 0;

    // 4. Tier breakdown with dynamic benchmark
    const benchmark = countConfig.benchmarkPct || 75;
    const warningThreshold = Math.max(10, benchmark - 15);

    const safeCount = studentList.filter(
      (s) => s.percentage >= benchmark,
    ).length;
    const warningCount = studentList.filter(
      (s) => s.percentage >= warningThreshold && s.percentage < benchmark,
    ).length;
    const shortageCount = studentList.filter(
      (s) => s.percentage < warningThreshold,
    ).length;

    const tiers = [
      {
        name: `Eligible (≥ ${benchmark}%)`,
        count: safeCount,
        color: ATTENDANCE_COLORS.present,
        pct:
          studentList.length > 0
            ? Math.round((safeCount / studentList.length) * 100)
            : 0,
      },
      {
        name: `Warning (${warningThreshold}% - ${benchmark - 1}%)`,
        count: warningCount,
        color: ATTENDANCE_COLORS.warning,
        pct:
          studentList.length > 0
            ? Math.round((warningCount / studentList.length) * 100)
            : 0,
      },
      {
        name: `Critical Shortage (< ${warningThreshold}%)`,
        count: shortageCount,
        color: ATTENDANCE_COLORS.absent,
        pct:
          studentList.length > 0
            ? Math.round((shortageCount / studentList.length) * 100)
            : 0,
      },
    ].filter((t) => t.count > 0);

    return {
      dailyAttendanceTrend: dailyTrend,
      studentAttendanceList: studentList,
      overallAttendanceStats: {
        present: totalPresentMarks,
        absent: totalAbsentMarks,
        total: totalMarks,
        rate: overallRate,
        activeDatesCount: activeDateColumns.length,
      },
      tierBreakdown: tiers,
    };
  }, [rows, columns, activeDateColumns, studentNameCol]);

  // Windowed Daily Attendance Trend (prevents overlapping labels when there are 30+ dates)
  const windowedDailyTrend = useMemo(() => {
    if (windowSize === "all") return dailyAttendanceTrend;
    const size = typeof windowSize === "number" ? windowSize : 15;
    return dailyAttendanceTrend.slice(
      windowStartIndex,
      windowStartIndex + size,
    );
  }, [dailyAttendanceTrend, windowSize, windowStartIndex]);

  const canSlidePrev = windowStartIndex > 0;
  const canSlideNext =
    windowSize !== "all" &&
    windowStartIndex + (typeof windowSize === "number" ? windowSize : 15) <
      dailyAttendanceTrend.length;

  // Selected Student Trajectory
  const selectedStudentData = useMemo(() => {
    if (!selectedStudent || selectedStudent === "all") return null;
    return (
      studentAttendanceList.find((s) => s.name === selectedStudent) || null
    );
  }, [selectedStudent, studentAttendanceList]);

  // -------------------------------------------------------------
  // 4. CUSTOMIZABLE GRAPH STUDIO (Interactive Charts)
  // -------------------------------------------------------------
  const [studioChartType, setStudioChartType] = useState<
    "bar" | "horizontal-bar" | "line" | "area" | "pie" | "radar"
  >("bar");
  const [studioDimension, setStudioDimension] = useState<string>(
    columns[0] || "",
  );
  const [studioMetric, setStudioMetric] = useState<
    "count" | "sum" | "avg" | "min" | "max"
  >("count");
  const [studioMeasureCol, setStudioMeasureCol] = useState<string>(
    numericColumns[0] || "",
  );
  const [studioPaletteKey, setStudioPaletteKey] = useState<string>("indigo");
  const [studioTopN, setStudioTopN] = useState<number>(10);
  const [studioSort, setStudioSort] = useState<"desc" | "asc" | "none">("desc");
  const [studioShowGrid, setStudioShowGrid] = useState(true);
  const [studioShowLegend, setStudioShowLegend] = useState(true);

  // Dynamic aggregation for custom studio
  const studioData = useMemo(() => {
    if (!studioDimension) return [];
    const dimIdx = columns.indexOf(studioDimension);
    if (dimIdx === -1) return [];

    const measureIdx =
      studioMetric !== "count" && studioMeasureCol
        ? columns.indexOf(studioMeasureCol)
        : -1;

    const groupMap: Record<string, { count: number; values: number[] }> = {};

    rows.forEach((row) => {
      const rawDim = row[dimIdx];
      const dimKey =
        rawDim !== undefined && rawDim !== null && String(rawDim).trim() !== ""
          ? String(rawDim).trim()
          : "(Empty)";

      if (!groupMap[dimKey]) {
        groupMap[dimKey] = { count: 0, values: [] };
      }
      groupMap[dimKey].count += 1;

      if (measureIdx !== -1) {
        const rawM = row[measureIdx];
        if (rawM !== undefined && rawM !== null && String(rawM).trim() !== "") {
          const numM = Number(String(rawM).trim());
          if (!isNaN(numM) && isFinite(numM)) {
            groupMap[dimKey].values.push(numM);
          }
        }
      }
    });

    let processed = Object.entries(groupMap).map(([name, data]) => {
      let metricValue = 0;
      if (studioMetric === "count") {
        metricValue = data.count;
      } else if (data.values.length === 0) {
        metricValue = 0;
      } else if (studioMetric === "sum") {
        metricValue = Number(
          data.values.reduce((acc, v) => acc + v, 0).toFixed(2),
        );
      } else if (studioMetric === "avg") {
        metricValue = Number(
          (
            data.values.reduce((acc, v) => acc + v, 0) / data.values.length
          ).toFixed(2),
        );
      } else if (studioMetric === "min") {
        metricValue = Math.min(...data.values);
      } else if (studioMetric === "max") {
        metricValue = Math.max(...data.values);
      }

      return {
        name,
        value: metricValue,
        count: data.count,
      };
    });

    if (studioSort === "desc") {
      processed.sort((a, b) => b.value - a.value);
    } else if (studioSort === "asc") {
      processed.sort((a, b) => a.value - b.value);
    }

    if (studioTopN > 0 && studioTopN < processed.length) {
      processed = processed.slice(0, studioTopN);
    }

    return processed;
  }, [
    studioDimension,
    studioMetric,
    studioMeasureCol,
    studioSort,
    studioTopN,
    columns,
    rows,
  ]);

  // Pinned charts in localStorage
  const [pinnedCharts, setPinnedCharts] = useState<PinnedChart[]>([]);
  const storageKey = file?.id ? `dl_custom_charts_${file.id}` : null;

  useEffect(() => {
    if (!storageKey) return;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) setPinnedCharts(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, [storageKey]);

  const handleSaveCurrentChart = () => {
    if (!storageKey) return;
    const title = `${studioMetric.toUpperCase()} of ${
      studioMetric === "count" ? studioDimension : studioMeasureCol
    } by ${studioDimension}`;

    const newChart: PinnedChart = {
      id: "chart_" + Date.now(),
      title,
      chartType: studioChartType,
      dimensionCol: studioDimension,
      metricType: studioMetric,
      measureCol: studioMeasureCol,
      paletteKey: studioPaletteKey,
      topN: studioTopN,
      sortOrder: studioSort,
      createdAt: Date.now(),
    };

    const updated = [newChart, ...pinnedCharts];
    setPinnedCharts(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
      toast.success("Graph saved to your Custom Charts gallery!");
    } catch {
      toast.error("Failed to save chart to storage");
    }
  };

  const currentPalette =
    COLOR_PALETTES[studioPaletteKey]?.colors || COLOR_PALETTES.indigo.colors;

  // Custom tooltips
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl border border-border/80 bg-popover/95 backdrop-blur-md px-3.5 py-2 text-xs shadow-xl text-popover-foreground space-y-1">
          <p className="font-semibold text-foreground border-b border-border/60 pb-1">
            {label || payload[0]?.name}
          </p>
          {payload.map((entry: any, i: number) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 text-[11px]"
            >
              <span className="text-muted-foreground flex items-center gap-1">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: entry.color || entry.fill }}
                />
                {entry.name}:
              </span>
              <span className="font-mono font-bold text-foreground">
                {entry.value?.toLocaleString()}
                {entry.name.includes("%") || entry.name.includes("Rate")
                  ? "%"
                  : ""}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (columns.length === 0 || rows.length === 0) {
    return (
      <div className="p-8 text-center rounded-2xl border border-dashed border-border bg-card/40 space-y-3">
        <div className="size-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground border border-border">
          <BarChart3 className="size-6" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-foreground">
            No Data to Analyze Yet
          </h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Add columns and rows or upload a dataset to automatically generate
            attendance trends, distributions, and customizable graphs.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* ============================================================
          1. COLUMN FILTER & SELECTION BAR (User can take/remove any column)
      ============================================================ */}
      <div className="p-3.5 sm:p-4 rounded-2xl border border-border/80 bg-card/70 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
              <Filter className="size-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="text-xs sm:text-sm font-bold text-foreground">
                  Active Columns for Analytics
                </h4>
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 font-mono border-border bg-background"
                >
                  {selectedColumns.length} of {columns.length} active
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                By default only date columns are selected. Click any column to
                include or exclude it.
              </p>
            </div>
          </div>

          {/* Quick presets & Count Configuration Trigger */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsConfigModalOpen(true)}
              className="h-7 px-2.5 text-[11px] font-semibold border-sky-400/50 dark:border-sky-800 bg-sky-500/10 text-sky-800 dark:text-sky-200 hover:bg-sky-500/20 cursor-pointer gap-1.5 shadow-2xs"
              title="Click to change what values (Present/Absent/etc.) are counted in this document"
            >
              <SlidersHorizontal className="size-3 text-sky-600 dark:text-sky-400" />
              <span>
                Counting:{" "}
                <span className="font-bold text-sky-700 dark:text-sky-300">
                  {countConfig.positiveToken}
                </span>{" "}
                ({countConfig.positiveLabel}) vs{" "}
                <span className="font-bold text-rose-600 dark:text-rose-400">
                  {countConfig.negativeToken}
                </span>{" "}
                ({countConfig.negativeLabel})
              </span>
              <Badge
                variant="secondary"
                className="text-[9px] px-1 py-0 h-4 font-mono bg-sky-500/20 text-sky-700 dark:text-sky-300 border-none"
              >
                {countConfig.benchmarkPct}%
              </Badge>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSelectDatesOnly}
              className="h-7 px-2.5 text-[11px] font-semibold border-border bg-background hover:bg-muted text-foreground cursor-pointer gap-1"
            >
              <CalendarIcon className="size-3 text-primary" />
              <span>Dates Only (Default)</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSelectAllColumns}
              className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Select All
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearAllColumns}
              className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Clear All
            </Button>
          </div>
        </div>

        {/* Column Chips List with Search */}
        <div className="space-y-2 pt-1 border-t border-border/60">
          {columns.length > 12 && (
            <div className="relative max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
              <Input
                value={columnSearch}
                onChange={(e) => setColumnSearch(e.target.value)}
                placeholder="Search columns to toggle..."
                className="pl-7 h-6.5 text-[11px] bg-background border-border"
              />
            </div>
          )}

          {/* Multi-select chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-h-24 flex-wrap no-scrollbar">
            {filteredColumnsList.map((col) => {
              const isSelected = selectedColumns.includes(col);
              const isDate = detectedDateColumns.includes(col);

              return (
                <button
                  key={col}
                  type="button"
                  onClick={() => toggleColumnSelection(col)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition border shrink-0 ${
                    isSelected
                      ? "bg-sky-500/10 dark:bg-sky-950/40 text-sky-800 dark:text-sky-200 border-sky-400/50 dark:border-sky-800/80 font-semibold shadow-2xs ring-1 ring-sky-500/25"
                      : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-border/70"
                  }`}
                  title={
                    isSelected
                      ? `Click to remove "${col}" from analytics`
                      : `Click to include "${col}" in analytics`
                  }
                >
                  {isDate ? (
                    <CalendarIcon className="size-3 text-sky-600 dark:text-sky-400 opacity-90" />
                  ) : (
                    <Hash className="size-3 opacity-60" />
                  )}
                  <span className="truncate max-w-[140px]">{col}</span>
                  {isSelected ? (
                    <Check className="size-3 text-sky-600 dark:text-sky-400" />
                  ) : (
                    <span className="size-1.5 rounded-full bg-border" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ============================================================
          2. ATTENDANCE HERO SUMMARY (Present / Absent KPI Cards)
      ============================================================ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
        <div className="p-3 rounded-xl border border-border/80 bg-card/60 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-[11px]">
            <span className="font-medium">Attendance Rate</span>
            <Activity className="size-3 text-foreground" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {overallAttendanceStats.rate}%
          </div>
          <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden mt-1">
            <div
              className={`h-full rounded-full transition-all ${
                overallAttendanceStats.rate >= 75
                  ? "bg-sky-500"
                  : overallAttendanceStats.rate >= 60
                    ? "bg-amber-500"
                    : "bg-rose-500"
              }`}
              style={{ width: `${overallAttendanceStats.rate}%` }}
            />
          </div>
        </div>

        <div className="p-3 rounded-xl border border-border/80 bg-card/60 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-sky-600 dark:text-sky-400 text-[11px]">
            <span className="font-semibold truncate">
              Total {countConfig.positiveLabel} ({countConfig.positiveToken})
            </span>
            <UserCheck className="size-3 text-sky-500 shrink-0" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {overallAttendanceStats.present.toLocaleString()}
          </div>
          <p className="text-[10px] text-muted-foreground">Marks counted</p>
        </div>

        <div className="p-3 rounded-xl border border-border/80 bg-card/60 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 text-[11px]">
            <span className="font-semibold truncate">
              Total {countConfig.negativeLabel} ({countConfig.negativeToken})
            </span>
            <UserX className="size-3 text-rose-500 shrink-0" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {overallAttendanceStats.absent.toLocaleString()}
          </div>
          <p className="text-[10px] text-muted-foreground">Absences recorded</p>
        </div>

        <div className="p-3 rounded-xl border border-border/80 bg-card/60 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-[11px]">
            <span className="font-medium">Dates / Sessions</span>
            <CalendarIcon className="size-3 text-foreground" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {overallAttendanceStats.activeDatesCount}
          </div>
          <p className="text-[10px] text-muted-foreground">Active dates</p>
        </div>

        <div className="p-3 rounded-xl border border-border/80 bg-card/60 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-[11px]">
            <span className="font-medium">Total Students</span>
            <Users className="size-3 text-foreground" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {studentAttendanceList.length}
          </div>
          <p className="text-[10px] text-muted-foreground truncate">
            {studentNameCol}
          </p>
        </div>

        <div className="p-3 rounded-xl border border-border/80 bg-card/60 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-[11px]">
            <span className="font-medium">
              Eligible (≥{countConfig.benchmarkPct}%)
            </span>
            <ShieldCheck className="size-3 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-sky-600 dark:text-sky-400">
            {
              studentAttendanceList.filter(
                (s) => s.percentage >= countConfig.benchmarkPct,
              ).length
            }
          </div>
          <p className="text-[10px] text-muted-foreground">
            {
              studentAttendanceList.filter(
                (s) =>
                  s.percentage < Math.max(10, countConfig.benchmarkPct - 15),
              ).length
            }{" "}
            critical shortage
          </p>
        </div>
      </div>

      {/* ============================================================
          3. NAVIGATION SUB-TABS
      ============================================================ */}
      <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3 flex-wrap">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 border border-border/60">
          <button
            type="button"
            onClick={() => setSubTab("attendance")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
              subTab === "attendance"
                ? "bg-card text-foreground shadow-2xs border border-border/80 font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <TrendingUp className="size-3.5 text-sky-600 dark:text-sky-400" />
            <span>Attendance Trends & P/A Graphs</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab("studio")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
              subTab === "studio"
                ? "bg-card text-foreground shadow-2xs border border-border/80 font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sliders className="size-3.5" />
            <span>Custom Graph Studio</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab("auto")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
              subTab === "auto"
                ? "bg-card text-foreground shadow-2xs border border-border/80 font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BarChart3 className="size-3.5" />
            <span>Column Distributions</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab("completeness")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
              subTab === "completeness"
                ? "bg-card text-foreground shadow-2xs border border-border/80 font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Activity className="size-3.5" />
            <span>Column Health</span>
          </button>
        </div>

        {/* Saved Custom Charts Quick Access */}
        {pinnedCharts.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground font-medium flex items-center gap-1">
              <Bookmark className="size-3 text-foreground" />
              Saved:
            </span>
            <div className="flex items-center gap-1 overflow-x-auto max-w-xs no-scrollbar">
              {pinnedCharts.map((chart) => (
                <button
                  key={chart.id}
                  type="button"
                  onClick={() => {
                    setStudioChartType(chart.chartType);
                    setStudioDimension(chart.dimensionCol);
                    setStudioMetric(chart.metricType);
                    setStudioMeasureCol(chart.measureCol);
                    setStudioPaletteKey(chart.paletteKey);
                    setStudioTopN(chart.topN);
                    setStudioSort(chart.sortOrder);
                    setSubTab("studio");
                  }}
                  className="px-2 py-0.5 rounded-md text-[11px] border border-border bg-card hover:bg-muted text-foreground font-mono truncate max-w-[120px] cursor-pointer"
                >
                  {chart.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ============================================================
          SUB-TAB: ATTENDANCE TRENDS & P/A GRAPHS
      ============================================================ */}
      {subTab === "attendance" && (
        <div className="space-y-6">
          {/* Main Attendance Timeline Chart Card */}
          <div className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-card/60 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <CalendarIcon className="size-4 text-primary" />
                  <span>Daily / Session Attendance Timeline</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Track {countConfig.positiveLabel} ({countConfig.positiveToken}
                  ) and {countConfig.negativeLabel} ({countConfig.negativeToken}
                  ) counts across selected date sessions
                </p>
              </div>

              {/* View mode toggle & Window Pagination */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="p-0.5 rounded-lg bg-muted/70 border border-border/60 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setAttendanceViewMode("counts")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                      attendanceViewMode === "counts"
                        ? "bg-card text-foreground shadow-2xs border border-border/80"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Counts ({countConfig.positiveToken} vs{" "}
                    {countConfig.negativeToken})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttendanceViewMode("rate")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                      attendanceViewMode === "rate"
                        ? "bg-card text-foreground shadow-2xs border border-border/80"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Attendance Rate (%)
                  </button>
                </div>

                {/* Sliding Window Pagination */}
                {dailyAttendanceTrend.length > 15 && (
                  <div className="flex items-center gap-1 border border-border/70 rounded-lg p-0.5 bg-background text-[11px]">
                    <button
                      type="button"
                      disabled={!canSlidePrev}
                      onClick={() =>
                        setWindowStartIndex((prev) => Math.max(0, prev - 10))
                      }
                      className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                      title="Previous dates"
                    >
                      <ChevronLeft className="size-3.5" />
                    </button>
                    <span className="font-mono text-[10px] px-1 text-muted-foreground">
                      {windowStartIndex + 1}-
                      {Math.min(
                        dailyAttendanceTrend.length,
                        windowStartIndex +
                          (typeof windowSize === "number" ? windowSize : 15),
                      )}{" "}
                      of {dailyAttendanceTrend.length}
                    </span>
                    <button
                      type="button"
                      disabled={!canSlideNext}
                      onClick={() =>
                        setWindowStartIndex((prev) =>
                          Math.min(dailyAttendanceTrend.length - 10, prev + 10),
                        )
                      }
                      className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                      title="Next dates"
                    >
                      <ChevronRight className="size-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline Graph Canvas */}
            <div className="h-72 w-full pt-2">
              {windowedDailyTrend.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  No date columns active. Use the top bar to select date
                  columns.
                </div>
              ) : attendanceViewMode === "counts" ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={windowedDailyTrend}
                    margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-border/40"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="day"
                      tick={{ fill: "currentColor" }}
                      className="text-[11px] text-muted-foreground"
                      tickLine={false}
                      axisLine={{ stroke: "currentColor", opacity: 0.2 }}
                      interval={0}
                    />
                    <YAxis
                      tick={{ fill: "currentColor" }}
                      className="text-[11px] text-muted-foreground"
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar
                      dataKey="Present"
                      name={`${countConfig.positiveLabel} (${countConfig.positiveToken})`}
                      fill={ATTENDANCE_COLORS.present}
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="Absent"
                      name={`${countConfig.negativeLabel} (${countConfig.negativeToken})`}
                      fill={ATTENDANCE_COLORS.absent}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={windowedDailyTrend}
                    margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                  >
                    <defs>
                      <linearGradient
                        id="attendRateGrad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={ATTENDANCE_COLORS.present}
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="95%"
                          stopColor={ATTENDANCE_COLORS.present}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-border/40"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="day"
                      tick={{ fill: "currentColor" }}
                      className="text-[11px] text-muted-foreground"
                      tickLine={false}
                      axisLine={{ stroke: "currentColor", opacity: 0.2 }}
                      interval={0}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: "currentColor" }}
                      className="text-[11px] text-muted-foreground"
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine
                      y={countConfig.benchmarkPct}
                      stroke={ATTENDANCE_COLORS.warning}
                      strokeDasharray="4 4"
                      label={{
                        value: `${countConfig.benchmarkPct}% Minimum`,
                        fill: ATTENDANCE_COLORS.warning,
                        fontSize: 10,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="Attendance Rate (%)"
                      stroke={ATTENDANCE_COLORS.present}
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#attendRateGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Dual Section: Student Comparison Ranking & Tiers Donut */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Student Comparison & Ranking (7 cols) */}
            <div className="lg:col-span-7 p-4 sm:p-5 rounded-2xl border border-border/80 bg-card/60 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <Users className="size-4 text-foreground" />
                    <span>Student Attendance Leaderboard</span>
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Sorted by personal attendance rate across all selected dates
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono border-border"
                >
                  {studentAttendanceList.length} Students
                </Badge>
              </div>

              {/* Ranking List */}
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {studentAttendanceList
                  .slice()
                  .sort((a, b) => b.percentage - a.percentage)
                  .map((student, rank) => (
                    <div
                      key={student.id}
                      className="p-2.5 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 transition flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono text-xs font-bold text-muted-foreground w-5 text-center">
                          #{rank + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {student.name}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                            <span className="text-sky-600 dark:text-sky-400">
                              {student.present} {countConfig.positiveLabel}
                            </span>
                            <span>•</span>
                            <span className="text-rose-600 dark:text-rose-400">
                              {student.absent} {countConfig.negativeLabel}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Percentage & Progress Bar */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        <div className="w-20 hidden xs:block h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              student.percentage >= 75
                                ? "bg-sky-500"
                                : student.percentage >= 60
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                            }`}
                            style={{ width: `${student.percentage}%` }}
                          />
                        </div>
                        <span
                          className={`font-mono font-bold text-xs px-2 py-0.5 rounded-md ${
                            student.percentage >= 75
                              ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                              : student.percentage >= 60
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {student.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Attendance Tiers Donut & Individual Trajectory (5 cols) */}
            <div className="lg:col-span-5 p-4 sm:p-5 rounded-2xl border border-border/80 bg-card/60 shadow-xs space-y-4">
              <div>
                <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-foreground" />
                  <span>Attendance Tiers Breakdown</span>
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Eligible vs Shortage student distribution
                </p>
              </div>

              {/* Donut Chart */}
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={tierBreakdown}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={4}
                    >
                      {tierBreakdown.map((entry, index) => (
                        <Cell key={`tier-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Tiers Legend Table */}
              <div className="space-y-1.5 pt-1 border-t border-border/60">
                {tierBreakdown.map((tier) => (
                  <div
                    key={tier.name}
                    className="flex items-center justify-between text-xs py-1"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: tier.color }}
                      />
                      <span className="font-medium text-foreground">
                        {tier.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="text-foreground font-bold">
                        {tier.count}
                      </span>
                      <span className="text-muted-foreground">
                        ({tier.pct}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Individual Student Trajectory Picker */}
              <div className="pt-3 border-t border-border/60 space-y-2">
                <label className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                  <span>Inspect Individual Student Trajectory:</span>
                </label>
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg text-xs bg-background border border-border text-foreground cursor-pointer focus:outline-hidden"
                >
                  <option value="all">Class Overview (All Students)</option>
                  {studentAttendanceList.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({s.percentage}%)
                    </option>
                  ))}
                </select>

                {selectedStudentData && (
                  <div className="p-3 rounded-xl border border-border/70 bg-muted/40 space-y-1.5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-foreground">
                        {selectedStudentData.name}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-mono ${
                          selectedStudentData.percentage >= 75
                            ? "bg-sky-500/10 text-sky-600 border-sky-500/20"
                            : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                        }`}
                      >
                        {selectedStudentData.percentage}% Attendance
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground font-mono">
                      Attended {selectedStudentData.present} of{" "}
                      {selectedStudentData.total} active sessions
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          SUB-TAB: CUSTOMIZABLE GRAPH STUDIO ("customisable graphs")
      ============================================================ */}
      {subTab === "studio" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Controls Panel (4 cols on lg) */}
          <div className="lg:col-span-4 p-4 rounded-2xl border border-border/80 bg-card/60 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                <Sliders className="size-3.5" />
                <span>Custom Graph Studio Controls</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStudioChartType("bar");
                  setStudioDimension(columns[0] || "");
                  setStudioMetric("count");
                  setStudioTopN(10);
                  setStudioSort("desc");
                }}
                className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
                title="Reset settings"
              >
                <RotateCcw className="size-2.5 mr-1" />
                Reset
              </Button>
            </div>

            {/* 1. Chart Type Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-foreground">
                1. Chart Type:
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: "bar", label: "Vertical Bar" },
                  { id: "horizontal-bar", label: "Horizontal Bar" },
                  { id: "line", label: "Line Chart" },
                  { id: "area", label: "Area Chart" },
                  { id: "pie", label: "Donut / Pie" },
                  { id: "radar", label: "Radar" },
                ].map((ct) => (
                  <button
                    key={ct.id}
                    type="button"
                    onClick={() => setStudioChartType(ct.id as any)}
                    className={`p-2 rounded-lg text-[11px] font-medium border text-center cursor-pointer transition ${
                      studioChartType === ct.id
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 font-semibold shadow-2xs"
                        : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-border/70"
                    }`}
                  >
                    {ct.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Dimension / Category Column (X-Axis) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-foreground">
                2. Category / Dimension (X-Axis):
              </label>
              <select
                value={studioDimension}
                onChange={(e) => setStudioDimension(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg text-xs bg-background border border-border text-foreground cursor-pointer focus:outline-hidden"
              >
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Metric Aggregation */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-foreground">
                3. Metric Aggregation:
              </label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: "count", label: "Frequency / Count" },
                  { id: "sum", label: "Sum (Total)" },
                  { id: "avg", label: "Average (Mean)" },
                  { id: "min", label: "Minimum" },
                  { id: "max", label: "Maximum" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setStudioMetric(m.id as any)}
                    className={`p-1.5 rounded-md text-[10px] font-medium border text-center cursor-pointer transition ${
                      studioMetric === m.id
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 font-semibold"
                        : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-border/70"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Measure Column (if not Count) */}
            {studioMetric !== "count" && (
              <div className="space-y-1.5 animate-in fade-in duration-150">
                <label className="text-[11px] font-semibold text-foreground">
                  4. Measure Column to Aggregate:
                </label>
                {numericColumns.length === 0 ? (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400">
                    No numeric columns detected in dataset. Aggregation defaults
                    to row count.
                  </p>
                ) : (
                  <select
                    value={studioMeasureCol}
                    onChange={(e) => setStudioMeasureCol(e.target.value)}
                    className="w-full h-8 px-2.5 rounded-lg text-xs bg-background border border-border text-foreground cursor-pointer focus:outline-hidden"
                  >
                    {numericColumns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* 5. Palette & Limits */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground">
                  Color Theme:
                </label>
                <select
                  value={studioPaletteKey}
                  onChange={(e) => setStudioPaletteKey(e.target.value)}
                  className="w-full h-7.5 px-2 rounded-lg text-[11px] bg-background border border-border text-foreground cursor-pointer focus:outline-hidden"
                >
                  {Object.entries(COLOR_PALETTES).map(([k, p]) => (
                    <option key={k} value={k}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground">
                  Top Items:
                </label>
                <select
                  value={studioTopN}
                  onChange={(e) => setStudioTopN(Number(e.target.value))}
                  className="w-full h-7.5 px-2 rounded-lg text-[11px] bg-background border border-border text-foreground cursor-pointer focus:outline-hidden font-mono"
                >
                  <option value={5}>Top 5</option>
                  <option value={10}>Top 10</option>
                  <option value={15}>Top 15</option>
                  <option value={25}>Top 25</option>
                  <option value={999}>All Values</option>
                </select>
              </div>
            </div>

            {/* 6. Sorting Order & Toggles */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground">Sort:</span>
                <button
                  type="button"
                  onClick={() =>
                    setStudioSort(studioSort === "desc" ? "asc" : "desc")
                  }
                  className="px-2 py-0.5 rounded border border-border bg-background hover:bg-muted text-[10px] font-mono cursor-pointer flex items-center gap-1"
                >
                  <ArrowUpDown className="size-2.5" />
                  <span>{studioSort === "desc" ? "Highest" : "Lowest"}</span>
                </button>
              </div>

              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={studioShowGrid}
                    onChange={(e) => setStudioShowGrid(e.target.checked)}
                    className="size-3 rounded accent-zinc-900"
                  />
                  <span>Grid</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={studioShowLegend}
                    onChange={(e) => setStudioShowLegend(e.target.checked)}
                    className="size-3 rounded accent-zinc-900"
                  />
                  <span>Legend</span>
                </label>
              </div>
            </div>

            {/* Studio Action Buttons */}
            <div className="pt-2 flex items-center gap-2 border-t border-border/60">
              <Button
                type="button"
                size="sm"
                onClick={handleSaveCurrentChart}
                className="flex-1 h-8 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 text-xs font-semibold cursor-pointer gap-1.5 shadow-2xs"
              >
                <Bookmark className="size-3.5" />
                <span>Save to Gallery</span>
              </Button>
            </div>
          </div>

          {/* Visualization Canvas (8 cols on lg) */}
          <div className="lg:col-span-8 p-4 sm:p-5 rounded-2xl border border-border/80 bg-card/60 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-foreground capitalize">
                  {studioMetric} of{" "}
                  {studioMetric === "count"
                    ? studioDimension
                    : studioMeasureCol}{" "}
                  by {studioDimension}
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Showing {studioData.length} data points • Chart:{" "}
                  {studioChartType}
                </p>
              </div>

              <Badge
                variant="outline"
                className="text-[10px] font-mono px-2 py-0.5 border-border bg-background"
              >
                {studioData.length} points
              </Badge>
            </div>

            {/* Live Chart Rendering */}
            <div className="h-96 w-full pt-2">
              {studioData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-xs space-y-1">
                  <AlertCircle className="size-5" />
                  <span>No data points match the current studio filters.</span>
                </div>
              ) : studioChartType === "bar" ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={studioData}
                    margin={{ top: 10, right: 10, left: -10, bottom: 25 }}
                  >
                    {studioShowGrid && (
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-border/40"
                        vertical={false}
                      />
                    )}
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "currentColor" }}
                      className="text-[11px] text-muted-foreground"
                      tickLine={false}
                      axisLine={{ stroke: "currentColor", opacity: 0.2 }}
                      interval={0}
                    />
                    <YAxis
                      tick={{ fill: "currentColor" }}
                      className="text-[11px] text-muted-foreground"
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    {studioShowLegend && (
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    )}
                    <Bar
                      dataKey="value"
                      name={studioMetric.toUpperCase()}
                      radius={[6, 6, 0, 0]}
                    >
                      {studioData.map((_, idx) => (
                        <Cell
                          key={`bar-${idx}`}
                          fill={currentPalette[idx % currentPalette.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : studioChartType === "horizontal-bar" ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={studioData}
                    margin={{ top: 10, right: 20, left: 30, bottom: 10 }}
                  >
                    {studioShowGrid && (
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-border/40"
                        horizontal={false}
                      />
                    )}
                    <XAxis
                      type="number"
                      tick={{ fill: "currentColor" }}
                      className="text-[11px] text-muted-foreground"
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tick={{ fill: "currentColor" }}
                      className="text-[11px] text-muted-foreground"
                      tickLine={false}
                      axisLine={{ stroke: "currentColor", opacity: 0.2 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    {studioShowLegend && (
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    )}
                    <Bar
                      dataKey="value"
                      name={studioMetric.toUpperCase()}
                      radius={[0, 6, 6, 0]}
                    >
                      {studioData.map((_, idx) => (
                        <Cell
                          key={`hbar-${idx}`}
                          fill={currentPalette[idx % currentPalette.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : studioChartType === "line" ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={studioData}
                    margin={{ top: 10, right: 10, left: -10, bottom: 25 }}
                  >
                    {studioShowGrid && (
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-border/40"
                      />
                    )}
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "currentColor" }}
                      className="text-[11px] text-muted-foreground"
                      tickLine={false}
                      axisLine={{ stroke: "currentColor", opacity: 0.2 }}
                    />
                    <YAxis
                      tick={{ fill: "currentColor" }}
                      className="text-[11px] text-muted-foreground"
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    {studioShowLegend && (
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    )}
                    <Line
                      type="monotone"
                      dataKey="value"
                      name={studioMetric.toUpperCase()}
                      stroke={currentPalette[0]}
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: currentPalette[0] }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : studioChartType === "area" ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={studioData}
                    margin={{ top: 10, right: 10, left: -10, bottom: 25 }}
                  >
                    <defs>
                      <linearGradient
                        id="studioGrad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={currentPalette[0]}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor={currentPalette[0]}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    {studioShowGrid && (
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-border/40"
                      />
                    )}
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "currentColor" }}
                      className="text-[11px] text-muted-foreground"
                      tickLine={false}
                      axisLine={{ stroke: "currentColor", opacity: 0.2 }}
                    />
                    <YAxis
                      tick={{ fill: "currentColor" }}
                      className="text-[11px] text-muted-foreground"
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    {studioShowLegend && (
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    )}
                    <Area
                      type="monotone"
                      dataKey="value"
                      name={studioMetric.toUpperCase()}
                      stroke={currentPalette[0]}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#studioGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={studioData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      label={({ name, percent }) =>
                        `${name}: ${Math.round((percent || 0) * 100)}%`
                      }
                    >
                      {studioData.map((_, idx) => (
                        <Cell
                          key={`pie-${idx}`}
                          fill={currentPalette[idx % currentPalette.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    {studioShowLegend && (
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    )}
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          SUB-TAB: COLUMN DISTRIBUTIONS (CATEGORICAL BREAKDOWN)
      ============================================================ */}
      {subTab === "auto" && (
        <div className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-card/60 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <BarChart3 className="size-4 text-primary" />
                <span>Column Frequency Distribution</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Distribution breakdown across active dataset columns
              </p>
            </div>

            {/* Quick Actions & Limit Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Display Limit selector */}
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                <span>Show:</span>
                <div className="flex items-center p-0.5 rounded-lg bg-muted/70 border border-border/60">
                  {[6, 12, 24, "All"].map((limit) => {
                    const isLimitActive =
                      limit === "All"
                        ? distribDisplayLimit >= distribColumns.length &&
                          distribDisplayLimit > 50
                        : distribDisplayLimit === limit;
                    return (
                      <button
                        key={String(limit)}
                        type="button"
                        onClick={() =>
                          setDistribDisplayLimit(
                            limit === "All" ? 9999 : Number(limit)
                          )
                        }
                        className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer transition ${
                          isLimitActive
                            ? "bg-card text-foreground font-bold shadow-2xs border border-border/70"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {limit}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Presets */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddAllDistribColumns}
                className="h-7 px-2 text-[11px] cursor-pointer"
                title="Add all columns in this dataset to frequency distribution"
              >
                All ({columns.length})
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddCategoricalDistribColumns}
                className="h-7 px-2 text-[11px] cursor-pointer"
                title="Show categorical columns"
              >
                Categorical
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddDateDistribColumns}
                className="h-7 px-2 text-[11px] cursor-pointer"
                title="Show date columns"
              >
                Dates
              </Button>

              {/* Add / Manage Columns Dropdown Toggle */}
              <div className="relative">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsAddColumnMenuOpen((prev) => !prev)}
                  className="h-7 px-2.5 text-[11px] bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Plus className="size-3.5" />
                  <span>Add Columns</span>
                  <Badge
                    variant="secondary"
                    className="text-[9px] px-1 py-0 h-4 bg-background/20 text-current ml-0.5"
                  >
                    {distribColumns.length}
                  </Badge>
                </Button>

                {/* Dropdown panel */}
                {isAddColumnMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-72 sm:w-80 rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl p-3 z-30 space-y-2 animate-in fade-in-50 zoom-in-95">
                    <div className="flex items-center justify-between pb-1.5 border-b border-border/60">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <SlidersHorizontal className="size-3.5" />
                        Choose Columns to Display
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsAddColumnMenuOpen(false)}
                        className="p-1 rounded text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>

                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                      <Input
                        value={distribSearch}
                        onChange={(e) => setDistribSearch(e.target.value)}
                        placeholder="Search columns to add..."
                        className="pl-7 h-7 text-xs bg-background"
                      />
                    </div>

                    {/* Column List */}
                    <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                      {columns
                        .filter((c) =>
                          c.toLowerCase().includes(distribSearch.toLowerCase())
                        )
                        .map((col) => {
                          const isSelected = distribColumns.includes(col);
                          return (
                            <button
                              key={col}
                              type="button"
                              onClick={() => handleToggleDistribColumn(col)}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer text-left ${
                                isSelected
                                  ? "bg-sky-500/15 text-sky-800 dark:text-sky-200 font-semibold border border-sky-400/30"
                                  : "hover:bg-muted text-foreground"
                              }`}
                            >
                              <span className="truncate pr-2">{col}</span>
                              {isSelected ? (
                                <Check className="size-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                              ) : (
                                <span className="size-3.5 rounded-sm border border-border shrink-0" />
                              )}
                            </button>
                          );
                        })}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-border/60 text-[11px]">
                      <button
                        type="button"
                        onClick={handleClearDistribColumns}
                        className="text-muted-foreground hover:text-foreground underline cursor-pointer"
                      >
                        Clear Selection
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAddColumnMenuOpen(false)}
                        className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground font-semibold cursor-pointer text-xs"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Active Chips bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-h-20 flex-wrap no-scrollbar pt-1 border-t border-border/60">
            <span className="text-[11px] font-semibold text-muted-foreground mr-1">
              Active ({distribColumns.length}):
            </span>
            {distribColumns.map((col) => (
              <span
                key={col}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/30 font-medium"
              >
                <span className="truncate max-w-[130px]">{col}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveDistribColumn(col)}
                  className="hover:text-rose-500 cursor-pointer ml-0.5"
                  title={`Remove ${col} from distribution`}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
            {distribColumns.length === 0 && (
              <span className="text-[11px] text-muted-foreground italic">
                No columns selected. Click "Add Columns" above or use the "+ Add Column" card below.
              </span>
            )}
          </div>

          {/* Grid of Frequency Distribution Charts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {distribColumns.slice(0, distribDisplayLimit).map((col) => {
              const colIdx = columns.indexOf(col);
              const counts: Record<string, number> = {};
              rows.forEach((r) => {
                const val = String(r[colIdx] ?? "").trim() || "(Empty)";
                counts[val] = (counts[val] || 0) + 1;
              });

              const chartData = Object.entries(counts)
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 8);

              return (
                <div
                  key={col}
                  className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-2 relative group"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                    <span className="truncate pr-2">{col}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant="outline" className="text-[9px] font-mono">
                        {Object.keys(counts).length} unique
                      </Badge>
                      <button
                        type="button"
                        onClick={() => handleRemoveDistribColumn(col)}
                        className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-rose-500 cursor-pointer"
                        title="Remove column from distribution"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  </div>

                  <div className="h-44 w-full pt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          className="stroke-border/40"
                        />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11 }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                          {chartData.map((entry, idx) => {
                            const upper = entry.name.trim().toUpperCase();
                            const pos = countConfig.positiveToken
                              .trim()
                              .toUpperCase();
                            const neg = countConfig.negativeToken
                              .trim()
                              .toUpperCase();
                            const isPos =
                              upper === pos ||
                              (pos === "P" &&
                                (upper === "PRESENT" ||
                                  upper === "1" ||
                                  upper === "TRUE"));
                            const isNeg =
                              upper === neg ||
                              (neg === "A" &&
                                (upper === "ABSENT" ||
                                  upper === "0" ||
                                  upper === "FALSE"));

                            const fill = isPos
                              ? "#0ea5e9"
                              : isNeg
                                ? "#f43f5e"
                                : [
                                    "#0ea5e9",
                                    "#38bdf8",
                                    "#0284c7",
                                    "#7dd3fc",
                                  ][idx % 4];
                            return <Cell key={`cell-${idx}`} fill={fill} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })}

            {/* "+ Add More Columns" Card */}
            <button
              type="button"
              onClick={() => setIsAddColumnMenuOpen(true)}
              className="p-6 rounded-xl border border-dashed border-border/80 hover:border-sky-500/50 bg-muted/10 hover:bg-sky-500/5 transition flex flex-col items-center justify-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground min-h-[220px]"
            >
              <div className="size-10 rounded-full bg-muted flex items-center justify-center text-foreground border border-border">
                <Plus className="size-5" />
              </div>
              <span className="text-xs font-semibold">
                Add More Columns
              </span>
              <span className="text-[10px] text-muted-foreground">
                Select from all {columns.length} columns in this dataset
              </span>
            </button>
          </div>

          {/* Load More Button if more columns are available */}
          {distribColumns.length > distribDisplayLimit && (
            <div className="text-center pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDistribDisplayLimit((prev) => prev + 12)}
                className="text-xs px-4 cursor-pointer gap-1.5"
              >
                <Plus className="size-3.5" />
                <span>
                  Load More ({distribColumns.length - distribDisplayLimit} remaining)
                </span>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          SUB-TAB: COLUMN HEALTH
      ============================================================ */}
      {subTab === "completeness" && (
        <div className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-card/60 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Activity className="size-4 text-foreground" />
              <span>Column Health & Fill Rates</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Review fill rate percentages and record completeness across all
              columns
            </p>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {columns.map((col) => {
              const colIdx = columns.indexOf(col);
              let filled = 0;
              rows.forEach((r) => {
                const val = r[colIdx];
                if (
                  val !== undefined &&
                  val !== null &&
                  String(val).trim() !== ""
                ) {
                  filled++;
                }
              });
              const pct =
                rows.length > 0 ? Math.round((filled / rows.length) * 100) : 0;
              const isSelected = selectedColumns.includes(col);

              return (
                <div
                  key={col}
                  className="p-3 rounded-xl border border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-foreground truncate">
                        {col}
                      </span>
                      {isSelected ? (
                        <Badge
                          variant="secondary"
                          className="text-[9px] px-1.5 py-0"
                        >
                          Active in Analytics
                        </Badge>
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">
                          Excluded
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-foreground rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono font-bold text-foreground w-10 text-right">
                        {pct}%
                      </span>
                    </div>
                  </div>

                  <div className="text-right text-[11px] text-muted-foreground font-mono shrink-0">
                    <span className="text-foreground font-semibold">
                      {filled}
                    </span>{" "}
                    / {rows.length} rows filled
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================
          COUNTING CONFIGURATION MODAL ("What to Count")
          Prompts before starting analytics if not configured in localStorage.
          Can also be reopened anytime via the "Counting: P vs A" button.
      ============================================================ */}
      <AnimatePresence>
        {isConfigModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.18 }}
              className="relative w-full max-w-xl rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-2xl p-5 sm:p-6 space-y-4.5 my-auto"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-border/70">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-500/25 shrink-0">
                    <SlidersHorizontal className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      Configure What to Count
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Choose what values in{" "}
                      <span className="font-semibold text-foreground">
                        {file?.name || "this document"}
                      </span>{" "}
                      represent attendance or completion. Saved locally for this
                      document.
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (!countConfig.isConfigured) {
                      handleSaveCountConfig();
                    } else {
                      setIsConfigModalOpen(false);
                    }
                  }}
                  className="size-8 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Close and save"
                >
                  <X className="size-4" />
                </Button>
              </div>

              {/* 1. Quick Presets */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                  1. Quick Presets
                </label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {COUNT_PRESETS.map((preset) => {
                    const isActive =
                      draftPosToken.trim().toUpperCase() ===
                        preset.positiveToken.toUpperCase() &&
                      draftNegToken.trim().toUpperCase() ===
                        preset.negativeToken.toUpperCase();
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => {
                          setDraftPosToken(preset.positiveToken);
                          setDraftPosLabel(preset.positiveLabel);
                          setDraftNegToken(preset.negativeToken);
                          setDraftNegLabel(preset.negativeLabel);
                          setDraftBenchmark(preset.benchmarkPct);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition border ${
                          isActive
                            ? "bg-sky-500/15 text-sky-800 dark:text-sky-200 border-sky-400/60 dark:border-sky-700 shadow-2xs font-semibold ring-1 ring-sky-500/30"
                            : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/70"
                        }`}
                      >
                        {preset.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Detected Tokens from Dataset */}
              {detectedSheetTokens.length > 0 && (
                <div className="space-y-1.5 p-3 rounded-xl bg-muted/30 border border-border/60">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <Sparkles className="size-3 text-sky-500" />
                      Values Detected in this Dataset:
                    </span>
                    <span className="text-muted-foreground font-mono text-[10px]">
                      Click button to assign token
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {detectedSheetTokens.map((item) => {
                      const isPos =
                        draftPosToken.toUpperCase() ===
                        item.token.toUpperCase();
                      const isNeg =
                        draftNegToken.toUpperCase() ===
                        item.token.toUpperCase();
                      return (
                        <div
                          key={item.token}
                          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-mono border transition ${
                            isPos
                              ? "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/40 font-bold"
                              : isNeg
                                ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40 font-bold"
                                : "bg-background text-foreground border-border"
                          }`}
                        >
                          <span>{item.token}</span>
                          <span className="text-[10px] opacity-60">
                            ({item.count})
                          </span>
                          <div className="flex items-center gap-0.5 ml-1 border-l border-border/80 pl-1 font-sans">
                            <button
                              type="button"
                              onClick={() => {
                                setDraftPosToken(item.token);
                                if (item.token.toUpperCase() === "P")
                                  setDraftPosLabel("Present");
                                else if (item.token === "1")
                                  setDraftPosLabel("Completed");
                                else setDraftPosLabel(item.token);
                              }}
                              className="text-[9px] px-1 py-0.5 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-700 dark:text-sky-300 cursor-pointer"
                              title="Set as Value to Count"
                            >
                              + Count
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDraftNegToken(item.token);
                                if (item.token.toUpperCase() === "A")
                                  setDraftNegLabel("Absent");
                                else if (item.token === "0")
                                  setDraftNegLabel("Incomplete");
                                else setDraftNegLabel(item.token);
                              }}
                              className="text-[9px] px-1 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-700 dark:text-rose-300 cursor-pointer"
                              title="Set as Counter Value"
                            >
                              - Counter
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. Inputs: Value to Count vs Counter Value */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Positive / Count Target */}
                <div className="p-3.5 rounded-xl border border-sky-400/40 dark:border-sky-800/80 bg-sky-500/5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                      <UserCheck className="size-3.5 text-sky-500" />
                      Value to Count (Present / Success)
                    </span>
                    <span className="size-2 rounded-full bg-sky-500" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-muted-foreground">
                      Sheet Value (exact token)
                    </label>
                    <Input
                      value={draftPosToken}
                      onChange={(e) => setDraftPosToken(e.target.value)}
                      placeholder="e.g. P, Present, 1, Yes"
                      className="h-8 text-xs bg-background font-mono font-semibold border-sky-400/50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-muted-foreground">
                      Display Label in Graphs & Cards
                    </label>
                    <Input
                      value={draftPosLabel}
                      onChange={(e) => setDraftPosLabel(e.target.value)}
                      placeholder="e.g. Present"
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                </div>

                {/* Negative / Counter Target */}
                <div className="p-3.5 rounded-xl border border-rose-400/40 dark:border-rose-800/80 bg-rose-500/5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                      <UserX className="size-3.5 text-rose-500" />
                      Counter Value (Absent / Failure)
                    </span>
                    <span className="size-2 rounded-full bg-rose-500" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-muted-foreground">
                      Sheet Value (exact token)
                    </label>
                    <Input
                      value={draftNegToken}
                      onChange={(e) => setDraftNegToken(e.target.value)}
                      placeholder="e.g. A, Absent, 0, No"
                      className="h-8 text-xs bg-background font-mono font-semibold border-rose-400/50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-muted-foreground">
                      Display Label in Graphs & Cards
                    </label>
                    <Input
                      value={draftNegLabel}
                      onChange={(e) => setDraftNegLabel(e.target.value)}
                      placeholder="e.g. Absent"
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Minimum Target Benchmark % */}
              <div className="p-3 rounded-xl border border-border/80 bg-muted/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5 text-sky-600 dark:text-sky-400" />
                    Minimum Attendance / Success Benchmark
                  </span>
                  <span className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400">
                    {draftBenchmark}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="40"
                    max="95"
                    step="5"
                    value={draftBenchmark}
                    onChange={(e) => setDraftBenchmark(Number(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer h-1.5 rounded-lg bg-muted"
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    {[60, 75, 80, 85].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setDraftBenchmark(pct)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer border ${
                          draftBenchmark === pct
                            ? "bg-sky-500 text-white border-sky-500 font-bold"
                            : "bg-background text-muted-foreground hover:text-foreground border-border"
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Actions Footer */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3 border-t border-border/70">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleUseStandardDefault}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Use Standard Attendance (P / A)
                </Button>

                <div className="flex items-center gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!countConfig.isConfigured) {
                        handleSaveCountConfig();
                      } else {
                        setIsConfigModalOpen(false);
                      }
                    }}
                    className="h-8 text-xs cursor-pointer"
                  >
                    Cancel
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleSaveCountConfig()}
                    className="h-8 text-xs bg-sky-600 hover:bg-sky-700 text-white font-semibold shadow-xs cursor-pointer gap-1.5"
                  >
                    <Check className="size-3.5" />
                    <span>Save & Start Analytics</span>
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default DatasetAnalyticsTab;
