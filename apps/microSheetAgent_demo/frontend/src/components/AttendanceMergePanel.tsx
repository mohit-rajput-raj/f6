import React, { useState, useEffect, useRef } from "react";
import { 
  UploadCloud, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  FileSpreadsheet, 
  ArrowRight,
  RefreshCw,
  Sliders,
  Settings
} from "lucide-react";
import { Button } from "./ui/button";

interface SubjectOption {
  subject: string;
  component: string;
}

interface AttendanceMergePanelProps {
  spreadsheetRef: React.MutableRefObject<{
    getJson: () => Promise<any>;
    loadJson: (data: any) => void;
    getDataGrid: () => Promise<any[][]>;
    updateCell: (rowIdx: number, colIdx: number, value: any, formula?: string) => void;
    getSubjectsList: () => Promise<SubjectOption[]>;
  } | null>;
  onMerged?: () => void;
}

interface AlignmentConfig {
  enrollment_csv_column: string;
  name_csv_column?: string;
  attended_classes_csv_column?: string;
  total_classes_csv_column?: string;
  is_date_wise: boolean;
  date_columns: string[];
  present_value: string;
  master_enrollment_col_idx: number;
  master_attended_col_idx: number;
  master_total_col_idx: number;
}

interface StudentUpdate {
  row_idx: number;
  student_name: string;
  enrollment: string;
  total_col_idx: number;
  total_old_value: number;
  total_new_value: number;
  attended_col_idx: number;
  attended_old_value: number;
  attended_new_value: number;
}

export default function AttendanceMergePanel({ spreadsheetRef, onMerged }: AttendanceMergePanelProps) {
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [selectedSubjectIdx, setSelectedSubjectIdx] = useState<number>(0);
  
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Schema matching results
  const [alignment, setAlignment] = useState<AlignmentConfig | null>(null);
  const [updates, setUpdates] = useState<StudentUpdate[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load subjects dynamically from the spreadsheet cells when component mounts or spreadsheet changes
  const fetchSubjects = async () => {
    if (spreadsheetRef.current) {
      try {
        const list = await spreadsheetRef.current.getSubjectsList();
        setSubjects(list);
        if (list.length > 0) {
          setSelectedSubjectIdx(0);
        }
      } catch (err) {
        console.error("Failed to load subjects from spreadsheet:", err);
      }
    }
  };

  useEffect(() => {
    // Wait a brief moment to ensure spreadsheet initializes
    const timer = setTimeout(() => {
      fetchSubjects();
    }, 1500);
    return () => clearTimeout(timer);
  }, [spreadsheetRef]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith(".csv")) {
        setFile(droppedFile);
        setErrorMsg(null);
        setSuccessMsg(null);
      } else {
        setErrorMsg("Please upload a valid CSV file (.csv).");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleAnalyze = async () => {
    if (!file) {
      setErrorMsg("Please select or drop a CSV file first.");
      return;
    }
    if (subjects.length === 0) {
      setErrorMsg("No target subjects found in the spreadsheet. Try refreshing.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const activeTarget = subjects[selectedSubjectIdx];
      const masterGrid = await spreadsheetRef.current?.getDataGrid();
      
      if (!masterGrid || masterGrid.length === 0) {
        throw new Error("Could not extract cell grid from spreadsheet. Ensure it is fully loaded.");
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("master_grid", JSON.stringify(masterGrid));
      formData.append("target_subject", activeTarget.subject);
      formData.append("target_component", activeTarget.component);

      // POST to our LangChain Server endpoint
      const response = await fetch("http://localhost:8000/api/align-schema", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.detail || "Error connecting to LangChain backend.");
      }

      const data = await response.json();
      if (data.success) {
        setAlignment(data.alignment);
        setUpdates(data.updates);
        setShowPreview(true);
        if (data.updates.length === 0) {
          setErrorMsg("Matched 0 students. Verify if the CSV enrollment IDs match the spreadsheet.");
        }
      } else {
        throw new Error("Backend failed to process alignment.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to analyze schema alignment. Ensure the backend langchainServer is running on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyMerge = () => {
    if (!spreadsheetRef.current || !updates.length) return;

    try {
      const getColLetter = (cIdx: number) => {
        let temp, letter = '';
        let tempCol = cIdx;
        while (tempCol >= 0) {
          temp = tempCol % 26;
          letter = String.fromCharCode(temp + 65) + letter;
          tempCol = Math.floor(tempCol / 26) - 1;
        }
        return letter;
      };

      updates.forEach((update) => {
        // Update Total Classes
        spreadsheetRef.current?.updateCell(
          update.row_idx,
          update.total_col_idx,
          update.total_new_value
        );
        // Update Attended Classes
        spreadsheetRef.current?.updateCell(
          update.row_idx,
          update.attended_col_idx,
          update.attended_new_value
        );

        // Automatically set/update the Percentage column formula
        const pctColIdx = Math.max(update.total_col_idx, update.attended_col_idx) + 1;
        const totalColLetter = getColLetter(update.total_col_idx);
        const attColLetter = getColLetter(update.attended_col_idx);
        const excelRow = update.row_idx + 1;

        // Formula: =IF(TotalClassCell>0, ROUND((AttendedCell/TotalClassCell)*100, 0), 0)
        const pctFormula = `=IF(${totalColLetter}${excelRow}>0, ROUND((${attColLetter}${excelRow}/${totalColLetter}${excelRow})*100, 0), 0)`;

        spreadsheetRef.current?.updateCell(
          update.row_idx,
          pctColIdx,
          null,
          pctFormula
        );
      });

      setSuccessMsg(`Successfully merged attendance for ${updates.length} students into the spreadsheet!`);
      setFile(null);
      setShowPreview(false);
      setAlignment(null);
      setUpdates([]);
      
      if (onMerged) {
        // Trigger auto-save or local cache update
        setTimeout(() => onMerged(), 1000);
      }
    } catch (err: any) {
      setErrorMsg("Failed to apply values in the spreadsheet cells: " + err.message);
    }
  };

  const handleCancelPreview = () => {
    setShowPreview(false);
    setAlignment(null);
    setUpdates([]);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 transition-all duration-200">
      <div className="flex items-center justify-between gap-4 mb-4 border-b border-slate-100 pb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <Sliders className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-md font-bold text-slate-800">AI Attendance CSV Import Tool</h2>
            <p className="text-xs text-slate-500">Drop a CSV file to automatically map & merge daily or summary attendance.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Target Subject Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Target Subject:</span>
            {subjects.length === 0 ? (
              <Button size="sm" variant="outline" className="text-xs py-1" onClick={fetchSubjects}>
                <RefreshCw className="h-3 w-3 animate-spin mr-1" /> Scanning sheet...
              </Button>
            ) : (
              <select
                className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none max-w-xs font-medium"
                value={selectedSubjectIdx}
                onChange={(e) => setSelectedSubjectIdx(Number(e.target.value))}
              >
                {subjects.map((sub, idx) => (
                  <option key={idx} value={idx}>
                    {sub.subject} ({sub.component})
                  </option>
                ))}
              </select>
            )}
          </div>

          <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={fetchSubjects}>
            <RefreshCw className="h-3.5 w-3.5" />
            Rescan Columns
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-xs flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>{errorMsg}</div>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-3 text-xs flex items-start gap-2">
          <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>{successMsg}</div>
        </div>
      )}

      {!showPreview ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          {/* Drag & Drop File Box */}
          <div 
            className={`col-span-1 md:col-span-3 border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
              dragActive ? "border-indigo-500 bg-indigo-50/50" : "border-slate-300 hover:border-indigo-400 bg-slate-50/30"
            }`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={handleUploadClick}
          >
            <input 
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
            {file ? (
              <div className="flex items-center gap-3 text-slate-700">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                  <FileSpreadsheet className="h-6 w-6" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold truncate max-w-sm">{file.name}</p>
                  <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB • CSV Format</p>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <UploadCloud className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">Drag & Drop CSV Attendance File Here</p>
                <p className="text-[10px] text-slate-400 mt-1">or click to browse from files</p>
              </div>
            )}
          </div>

          {/* Action Trigger Button */}
          <div className="col-span-1 flex flex-col gap-2">
            <Button
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm h-11"
              disabled={loading || !file}
              onClick={handleAnalyze}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Analyzing...
                </>
              ) : (
                "Analyze & Match"
              )}
            </Button>
            {file && (
              <Button 
                variant="outline" 
                size="sm" 
                className="text-slate-500 border-slate-200" 
                onClick={() => setFile(null)}
              >
                Clear File
              </Button>
            )}
          </div>
        </div>
      ) : (
        /* Merging Preview View */
        <div className="border border-slate-200 rounded-xl bg-slate-50/50 p-4 transition-all duration-200">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center bg-indigo-100 text-indigo-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                Preview Mode
              </span>
              <span className="text-xs text-slate-500">
                Matched <strong>{updates.length}</strong> students. Review details below before applying:
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCancelPreview} className="text-xs">
                Cancel
              </Button>
              <Button variant="default" size="sm" onClick={handleApplyMerge} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                Apply Merge Updates
              </Button>
            </div>
          </div>

          {/* Alignment schema detected summary */}
          {alignment && (
            <div className="mb-4 bg-white border border-slate-200 rounded-lg p-3 text-[11px] grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-600 shadow-sm">
              <div>
                <span className="font-semibold block text-slate-400">CSV enrollment ID column:</span>
                <code className="text-indigo-600 font-bold">{alignment.enrollment_csv_column}</code>
              </div>
              <div>
                <span className="font-semibold block text-slate-400">Attendance format:</span>
                <span className="text-slate-800 font-bold">
                  {alignment.is_date_wise ? "📅 Date-wise checklist" : "📊 Aggregated summary"}
                </span>
              </div>
              {alignment.is_date_wise ? (
                <div className="col-span-2">
                  <span className="font-semibold block text-slate-400">Detected dates:</span>
                  <span className="text-slate-800 font-medium truncate block" title={alignment.date_columns.join(", ")}>
                    {alignment.date_columns.join(", ")}
                  </span>
                </div>
              ) : (
                <>
                  <div>
                    <span className="font-semibold block text-slate-400">Attended column:</span>
                    <code className="text-slate-800 font-medium">{alignment.attended_classes_csv_column}</code>
                  </div>
                  <div>
                    <span className="font-semibold block text-slate-400">Total column:</span>
                    <code className="text-slate-800 font-medium">{alignment.total_classes_csv_column}</code>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Preview Scrollable Table */}
          <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold sticky top-0">
                <tr>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Enrollment</th>
                  <th className="px-4 py-2 text-center">Classes Attended</th>
                  <th className="px-4 py-2 text-center">Total Classes</th>
                  <th className="px-4 py-2 text-center">New Merged Attendance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {updates.map((student, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2 font-medium text-slate-700">{student.student_name}</td>
                    <td className="px-4 py-2 font-mono text-slate-500">{student.enrollment}</td>
                    <td className="px-4 py-2 text-center text-slate-500">
                      {student.attended_old_value} <ArrowRight className="inline h-3 w-3 mx-1 text-slate-400" /> {student.attended_new_value}
                    </td>
                    <td className="px-4 py-2 text-center text-slate-500">
                      {student.total_old_value} <ArrowRight className="inline h-3 w-3 mx-1 text-slate-400" /> {student.total_new_value}
                    </td>
                    <td className="px-4 py-2 text-center font-bold text-emerald-600">
                      {student.attended_new_value} / {student.total_new_value} 
                      <span className="text-[10px] font-normal text-slate-400 ml-1">
                        ({student.total_new_value > 0 ? Math.round((student.attended_new_value / student.total_new_value) * 100) : 0}%)
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
