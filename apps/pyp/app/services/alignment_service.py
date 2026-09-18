"""
AI Schema Alignment & Attendance Merger Service for apps/pyp.
Provides LLM-assisted and heuristic schema alignment between CSV attendance files and master spreadsheet grids.
Supports dynamic target paths (e.g. CO24554/th, CO24804/lab), custom prompts from LLM nodes, and percentage calculation.
"""

import csv
import re
import json
from typing import List, Dict, Any, Tuple, Optional
from pydantic import BaseModel, Field

from fastapi import HTTPException
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI


class SchemaAlignment(BaseModel):
    enrollment_csv_column: str = Field(description="The exact name of the column in the CSV file that contains student enrollment IDs.")
    name_csv_column: Optional[str] = Field(None, description="The name of the column in the CSV file that contains student names.")
    
    # Aggregated summary format
    attended_classes_csv_column: Optional[str] = Field(None, description="The column in the CSV representing classes attended by the student.")
    total_classes_csv_column: Optional[str] = Field(None, description="The column in the CSV representing total classes held.")
    
    # Date-wise checklist format
    is_date_wise: bool = Field(False, description="True if the CSV has individual columns representing dates with P/A marks.")
    date_columns: List[str] = Field(default=[], description="List of individual date columns in the CSV representing days.")
    present_value: str = Field("P", description="The value indicating present status (e.g. 'P', '1', 'Present').")
    
    # Master sheet coordinates
    master_enrollment_col_idx: int = Field(description="0-based column index in master grid for Enrollment IDs.")
    master_name_col_idx: Optional[int] = Field(None, description="0-based column index in master grid for student Names.")
    master_total_col_idx: int = Field(description="0-based column index in master grid for target subject Total classes.")
    master_attended_col_idx: int = Field(description="0-based column index in master grid for target subject Attended classes.")
    master_percentage_col_idx: Optional[int] = Field(None, description="0-based column index in master grid for target subject Percentage / % column.")


def parse_csv_content(csv_string: str) -> Tuple[List[str], List[Dict[str, str]]]:
    lines = csv_string.strip().splitlines()
    if not lines:
        return [], []
    
    reader = csv.reader(lines)
    headers = [h.strip() for h in next(reader)]
    
    rows = []
    for row in reader:
        if not row or all(cell.strip() == "" for cell in row):
            continue
        row_dict = {}
        for i, val in enumerate(row):
            if i < len(headers):
                row_dict[headers[i]] = val.strip()
        rows.append(row_dict)
        
    return headers, rows


def clean_id(val: Any) -> str:
    if val is None:
        return ""
    return re.sub(r'[^a-zA-Z0-9]', '', str(val)).lower().strip()


def get_alignment_llm(provider: str, api_key: Optional[str] = None, model: Optional[str] = None):
    if not api_key or not api_key.strip():
        raise ValueError("API Key is required. Please provide a valid Gemini / OpenAI API key in your node or user settings.")
    
    if provider == "openai":
        return ChatOpenAI(
            model=model or "gpt-4o-mini",
            api_key=api_key,
            temperature=0,
        )
    elif provider == "claude":
        return ChatOpenAI(
            model=model or "claude-sonnet-4-20250514",
            api_key=api_key,
            base_url="https://api.anthropic.com/v1",
            temperature=0,
        )
    else:
        # Default gemini
        return ChatGoogleGenerativeAI(
            model=model or "gemini-2.5-flash",
            google_api_key=api_key,
            temperature=0,
        )
def normalize_token(s: str) -> str:
    return re.sub(r'[^a-zA-Z0-9]', '', str(s)).lower()


def extract_header_tree(master_grid: List[List[Any]]) -> Tuple[int, Dict[int, List[str]], int, Optional[int]]:
    """
    Scans master_grid to build hierarchical column paths and identify:
    - data_start_row: 0-based row index where student data rows begin (never header rows)
    - col_paths: Dict[col_idx, List[str]] path of header labels from top to bottom
    - master_enrollment_col_idx: column index for enrollment ID
    - master_name_col_idx: column index for student name (or None)
    """
    if not master_grid or len(master_grid) == 0:
        return 0, {}, 1, 2

    # Step 1: Find detail_row_idx (row containing Enrollment / Roll No)
    detail_row_idx = -1
    master_enrollment_col_idx = 1
    master_name_col_idx = None

    enroll_keywords = ["enroll", "roll", "reg. no", "reg no", "registration"]
    for r_idx, row in enumerate(master_grid[:30]):
        for c_idx, cell in enumerate(row):
            if cell is not None:
                cell_str = str(cell).lower().strip()
                if any(kw in cell_str for kw in enroll_keywords):
                    detail_row_idx = r_idx
                    master_enrollment_col_idx = c_idx
                    break
        if detail_row_idx != -1:
            break

    # If detail row found, locate name column in the same row
    if detail_row_idx != -1:
        for c_idx, cell in enumerate(master_grid[detail_row_idx]):
            if cell is not None:
                cell_str = str(cell).lower().strip()
                if "name" in cell_str and "father" not in cell_str and "mother" not in cell_str:
                    master_name_col_idx = c_idx
                    break
        if master_name_col_idx is None:
            master_name_col_idx = master_enrollment_col_idx + 1
    else:
        detail_row_idx = 0
        master_name_col_idx = 2

    # Step 2: Determine data_start_row by finding first student row
    enrollment_pattern = re.compile(r'.*\d{3,}.*')
    data_start_row = -1
    scan_start = detail_row_idx + 1 if detail_row_idx >= 0 else 1
    for r_idx in range(scan_start, len(master_grid)):
        row = master_grid[r_idx]
        if len(row) > master_enrollment_col_idx:
            val = row[master_enrollment_col_idx]
            if val is not None and enrollment_pattern.match(str(val).strip()):
                data_start_row = r_idx
                break

    if data_start_row == -1:
        data_start_row = scan_start if scan_start < len(master_grid) else len(master_grid)

    # Step 3: Determine header_start_row by scanning upward from detail_row_idx
    header_start_row = detail_row_idx
    for r_idx in range(detail_row_idx - 1, -1, -1):
        row = master_grid[r_idx]
        non_empty = [c for c in row if c is not None and str(c).strip() != ""]
        if len(non_empty) >= 2:
            header_start_row = r_idx
        elif len(non_empty) == 1 and r_idx == detail_row_idx - 1:
            header_start_row = r_idx
        else:
            break

    # Step 4: Calculate max columns across header rows
    max_cols = 0
    for r_idx in range(header_start_row, data_start_row):
        max_cols = max(max_cols, len(master_grid[r_idx]))
    if len(master_grid) > data_start_row:
        max_cols = max(max_cols, len(master_grid[data_start_row]))
    if max_cols == 0 and master_grid:
        max_cols = max(len(r) for r in master_grid)

    # Step 5: Build hierarchical column paths with horizontal span propagation
    col_paths: Dict[int, List[str]] = {c: [] for c in range(max_cols)}

    for r_idx in range(header_start_row, data_start_row):
        row = master_grid[r_idx]
        current_val = ""
        for c in range(max_cols):
            val = row[c] if c < len(row) else None
            if val is not None and str(val).strip() != "":
                current_val = str(val).strip()
            # If current_val is set, and this row is before detail_row_idx, propagate rightward
            # On detail_row_idx (leaf headers), each cell should be specific, don't propagate rightward
            if r_idx == detail_row_idx:
                leaf_val = str(val).strip() if (val is not None and str(val).strip() != "") else ""
                if leaf_val:
                    col_paths[c].append(leaf_val)
            else:
                if current_val:
                    col_paths[c].append(current_val)

    return data_start_row, col_paths, master_enrollment_col_idx, master_name_col_idx


def resolve_group_columns(
    col_paths: Dict[int, List[str]],
    target_path: str,
) -> List[Dict[str, Any]]:
    """
    Resolves a target path (e.g. 'CO24804/Tut.' or 'CO24554/Th.') to list of matched column dicts:
    [
      { "col_idx": 6, "header": "Total Class", "full_path": [...] },
      ...
    ]
    """
    raw_segments = [p.strip() for p in target_path.replace(":", "/").split("/") if p.strip()]
    norm_segments = [normalize_token(s) for s in raw_segments if normalize_token(s)]

    if not norm_segments:
        return []

    matched = []
    for col_idx, path in col_paths.items():
        if not path:
            continue
        norm_path = [normalize_token(p) for p in path]

        # Check if every segment of target_path is matched by at least one element in col's path
        all_matched = True
        for seg in norm_segments:
            seg_found = False
            for p in norm_path:
                if seg in p or p in seg:
                    seg_found = True
                    break
            # Component aliases
            if not seg_found:
                if seg in ("th", "theory", "lec", "lecture"):
                    seg_found = any(p in ("th", "theory", "lec", "lecture") or "th" in p or "theory" in p for p in norm_path)
                elif seg in ("tut", "tutorial"):
                    seg_found = any(p in ("tut", "tutorial") or "tut" in p or "tutorial" in p for p in norm_path)
                elif seg in ("lab", "practical", "prac"):
                    seg_found = any(p in ("lab", "practical", "prac") or "lab" in p or "practical" in p for p in norm_path)

            if not seg_found:
                all_matched = False
                break

        if all_matched:
            leaf_header = path[-1] if path else f"Col_{col_idx+1}"
            matched.append({
                "col_idx": col_idx,
                "header": leaf_header,
                "full_path": path
            })

    return matched


def heuristic_align_schema(
    master_grid: List[List[Any]], 
    csv_headers: List[str], 
    target_subject: str, 
    target_component: str,
    target_path: Optional[str] = None
) -> SchemaAlignment:
    # 1. Identify Enrollment column in CSV
    enrollment_csv = None
    for col in csv_headers:
        col_lower = col.lower()
        if "enroll" in col_lower or "roll" in col_lower:
            enrollment_csv = col
            break
    if not enrollment_csv:
        for col in csv_headers:
            if col.lower() in ("id", "no", "s.no", "enrollment_no", "roll_no"):
                enrollment_csv = col
                break
    if not enrollment_csv:
        enrollment_csv = csv_headers[1] if len(csv_headers) > 1 else csv_headers[0]
        
    # 2. Identify Name column in CSV
    name_csv = None
    for col in csv_headers:
        if "name" in col.lower() or "student" in col.lower():
            name_csv = col
            break
            
    # 3. Check if CSV is date-wise
    is_date_wise = False
    date_cols = []
    date_pattern = re.compile(r'(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d+[\-/]\d+)', re.IGNORECASE)
    for col in csv_headers:
        if date_pattern.search(col):
            date_cols.append(col)
    if len(date_cols) >= 3:
        is_date_wise = True
        
    # 4. Aggregate columns if not date-wise
    attended_csv = None
    total_csv = None
    if not is_date_wise:
        for col in csv_headers:
            col_lower = col.lower()
            if ("attend" in col_lower or "present" in col_lower or "attar" in col_lower) and "total" not in col_lower:
                attended_csv = col
            if ("total" in col_lower or "held" in col_lower) and ("attend" not in col_lower and "attar" not in col_lower):
                total_csv = col
        if not attended_csv:
            for col in csv_headers:
                if "classes" in col.lower() and col != total_csv:
                    attended_csv = col
                    break

    # 5. Use extract_header_tree and resolve_group_columns
    data_start_row, col_paths, master_enrollment_col, master_name_col = extract_header_tree(master_grid)
    effective_path = target_path or f"{target_subject}/{target_component}"
    matched_cols = resolve_group_columns(col_paths, effective_path)

    master_total_col = None
    master_attended_col = None
    master_percentage_col = None

    if matched_cols:
        for col_info in matched_cols:
            c_idx = col_info["col_idx"]
            header_clean = str(col_info["header"]).lower().strip()
            if ("total" in header_clean and "att" not in header_clean and "pres" not in header_clean) or header_clean.startswith("total class"):
                if master_total_col is None:
                    master_total_col = c_idx
            elif "att" in header_clean or "pres" in header_clean or "present" in header_clean:
                if master_attended_col is None:
                    master_attended_col = c_idx
            elif "percent" in header_clean or "pct" in header_clean or "%" in header_clean:
                if master_percentage_col is None:
                    master_percentage_col = c_idx

        # Assign remaining columns if any not matched by keywords
        unassigned = [c["col_idx"] for c in matched_cols if c["col_idx"] not in (master_total_col, master_attended_col, master_percentage_col)]
        if master_total_col is None and unassigned:
            master_total_col = unassigned.pop(0)
        if master_attended_col is None and unassigned:
            master_attended_col = unassigned.pop(0)
        if master_percentage_col is None and unassigned:
            master_percentage_col = unassigned.pop(0)

    # Fallback if no matching group was found
    if master_total_col is None:
        master_total_col = 3
    if master_attended_col is None:
        master_attended_col = 4
    if master_percentage_col is None:
        master_percentage_col = 5

    return SchemaAlignment(
        enrollment_csv_column=enrollment_csv,
        name_csv_column=name_csv,
        attended_classes_csv_column=attended_csv,
        total_classes_csv_column=total_csv,
        is_date_wise=is_date_wise,
        date_columns=date_cols,
        present_value="P",
        master_enrollment_col_idx=master_enrollment_col,
        master_name_col_idx=master_name_col,
        master_attended_col_idx=master_attended_col,
        master_total_col_idx=master_total_col,
        master_percentage_col_idx=master_percentage_col
    )


def llm_align_schema(
    master_grid: List[List[Any]], 
    csv_headers: List[str], 
    csv_sample_rows: List[Dict[str, str]],
    target_subject: str, 
    target_component: str,
    target_path: Optional[str] = None,
    provider: str = "gemini",
    api_key: Optional[str] = None,
    model: Optional[str] = None,
    custom_prompt: Optional[str] = None
) -> Optional[SchemaAlignment]:
    if not api_key:
        return None
        
    try:
        llm = get_alignment_llm(provider, api_key, model)
        grid_preview = ""
        for idx, row in enumerate(master_grid[:15]):
            row_vals = [f"Col {i}: '{val}'" for i, val in enumerate(row) if val is not None and str(val).strip() != ""]
            if row_vals:
                grid_preview += f"Row {idx}: {', '.join(row_vals)}\n"
            
        csv_preview = f"Headers: {csv_headers}\nSample Rows:\n"
        for r in csv_sample_rows[:4]:
            csv_preview += f"- {r}\n"
            
        custom_section = f"\n### CUSTOM USER INSTRUCTIONS (FROM LLM WORKFLOW NODE):\n{custom_prompt}\n" if custom_prompt and custom_prompt.strip() else ""

        effective_path = target_path or f"{target_subject}/{target_component}"

        prompt = f"""
You are an expert data mapping and spreadsheet alignment assistant. Analyze two spreadsheet schemas (a multi-level Master Spreadsheet grid and an uploaded CSV file) and align them to merge student attendance for a target subject and component.

### TARGET SUBJECT & COMPONENT:
Subject: {target_subject}
Component: {target_component} (e.g. Theory, Lab, Tutorial)
Target Path: {effective_path}
{custom_section}
### MASTER SPREADSHEET (Top 15 Rows with 0-based column and row indices):
{grid_preview}

### UPLOADED CSV FILE DETAILS:
{csv_preview}

### TASK:
1. Identify the exact CSV column for student enrollment ID (e.g. "Enrollment", "Roll No", "Enrollment No").
2. Identify the CSV column for student name (if available).
3. Determine if the CSV is:
   - Aggregated format: has columns for total classes and attended classes.
   - Date-wise checklist format: has individual date columns with P/A (Present/Absent) marks.
4. In the Master Spreadsheet Grid:
   - Identify the 0-based column index for student Enrollment IDs.
   - Identify the 0-based column index for student Names (if present).
   - Under the specific target subject ({target_subject}) and component ({target_component}) matching path ({effective_path}):
     - Find the 0-based column index for "Total Classes" (e.g. Total Class).
     - Find the 0-based column index for "Attended Classes" (e.g. Total Attar, Total Attendance).
     - Find the 0-based column index for "Percentage" (e.g. Percentage, %).

Return the alignment details structured matching the SchemaAlignment schema.
"""
        structured_llm = llm.with_structured_output(SchemaAlignment)
        result = structured_llm.invoke(prompt)
        return result
    except Exception as e:
        print(f"[LLM ALIGNMENT ERROR]: {e}")
        return None


def align_and_compute_updates(
    master_grid: List[List[Any]],
    csv_headers: List[str],
    csv_rows: List[Dict[str, str]],
    target_subject: str,
    target_component: str,
    target_path: Optional[str] = None,
    provider: str = "gemini",
    api_key: Optional[str] = None,
    model: Optional[str] = None,
    custom_prompt: Optional[str] = None
) -> Dict[str, Any]:
    effective_path = target_path or f"{target_subject}/{target_component}"

    # 1. Hierarchical header tree resolution from raw master grid
    data_start_row, col_paths, master_enroll_col, master_name_col = extract_header_tree(master_grid)
    group_columns = resolve_group_columns(col_paths, effective_path)

    # 2. Align schema via LLM if api_key available, otherwise fallback to heuristics
    alignment = None
    if api_key:
        alignment = llm_align_schema(
            master_grid=master_grid,
            csv_headers=csv_headers,
            csv_sample_rows=csv_rows[:5],
            target_subject=target_subject,
            target_component=target_component,
            target_path=effective_path,
            provider=provider,
            api_key=api_key,
            model=model,
            custom_prompt=custom_prompt
        )
    
    if not alignment:
        alignment = heuristic_align_schema(
            master_grid=master_grid,
            csv_headers=csv_headers,
            target_subject=target_subject,
            target_component=target_component,
            target_path=effective_path
        )
    elif group_columns:
        # If LLM ran but group_columns were resolved deterministically from the header tree,
        # ensure total/attended/percentage column indices strictly target the matched group columns
        matched_col_indices = {g["col_idx"] for g in group_columns}
        if alignment.master_total_col_idx not in matched_col_indices or alignment.master_attended_col_idx not in matched_col_indices:
            heuristic_aln = heuristic_align_schema(
                master_grid=master_grid,
                csv_headers=csv_headers,
                target_subject=target_subject,
                target_component=target_component,
                target_path=effective_path
            )
            alignment.master_total_col_idx = heuristic_aln.master_total_col_idx
            alignment.master_attended_col_idx = heuristic_aln.master_attended_col_idx
            alignment.master_percentage_col_idx = heuristic_aln.master_percentage_col_idx

    # Ensure enrollment and name col indices adhere to tree detection
    if master_enroll_col is not None:
        alignment.master_enrollment_col_idx = master_enroll_col
    if master_name_col is not None:
        alignment.master_name_col_idx = master_name_col

    # 3. Build CSV index map
    csv_map = {}
    for row in csv_rows:
        raw_enroll = row.get(alignment.enrollment_csv_column)
        if raw_enroll:
            csv_map[clean_id(raw_enroll)] = row

    # 4. Use absolute data_start_row from header tree (never write to header rows!)
    actual_start_row = data_start_row

    updates = []
    def parse_int_safe(val: Any) -> int:
        try:
            if isinstance(val, (int, float)):
                return int(val)
            nums = re.findall(r'\d+', str(val))
            return int(nums[0]) if nums else 0
        except Exception:
            return 0

    total_col = alignment.master_total_col_idx
    attended_col = alignment.master_attended_col_idx
    pct_col = alignment.master_percentage_col_idx if alignment.master_percentage_col_idx is not None else (attended_col + 1)

    # 5. Generate updates for existing student rows
    student_counter = 1
    for r_idx in range(actual_start_row, len(master_grid)):
        row = master_grid[r_idx]
        if len(row) <= alignment.master_enrollment_col_idx:
            continue
            
        enrollment_val = row[alignment.master_enrollment_col_idx]
        if not enrollment_val or str(enrollment_val).strip() == "":
            continue
            
        clean_enroll = clean_id(enrollment_val)
        csv_student_row = csv_map.get(clean_enroll)
        
        # Name fallback matching
        if not csv_student_row and alignment.name_csv_column:
            name_col = alignment.master_name_col_idx if alignment.master_name_col_idx is not None else alignment.master_enrollment_col_idx + 1
            if name_col < len(row):
                master_name_val = row[name_col]
                if master_name_val:
                    clean_master_name = re.sub(r'[^a-z]', '', str(master_name_val).lower())
                    for row_csv in csv_rows:
                        csv_name_val = row_csv.get(alignment.name_csv_column)
                        if csv_name_val:
                            clean_csv_name = re.sub(r'[^a-z]', '', str(csv_name_val).lower())
                            if clean_master_name == clean_csv_name or (len(clean_master_name) > 4 and clean_master_name in clean_csv_name):
                                csv_student_row = row_csv
                                break

        if csv_student_row:
            old_total_val = row[total_col] if total_col < len(row) else "0"
            old_attended_val = row[attended_col] if attended_col < len(row) else "0"
            
            old_total = parse_int_safe(old_total_val)
            old_attended = parse_int_safe(old_attended_val)
            
            if alignment.is_date_wise and alignment.date_columns:
                added_total = len(alignment.date_columns)
                added_attended = sum(
                    1 for col_name in alignment.date_columns 
                    if str(csv_student_row.get(col_name, '')).strip().upper() in ("P", "1", "PRESENT", "PR", "YES", "Y", "TRUE")
                )
                new_total = old_total + added_total
                new_attended = old_attended + added_attended
            else:
                raw_add_total = csv_student_row.get(alignment.total_classes_csv_column) if alignment.total_classes_csv_column else None
                raw_add_att = csv_student_row.get(alignment.attended_classes_csv_column) if alignment.attended_classes_csv_column else None
                
                added_total = parse_int_safe(raw_add_total) if raw_add_total is not None else 1
                added_attended = parse_int_safe(raw_add_att) if raw_add_att is not None else 1
                
                new_total = old_total + added_total
                new_attended = old_attended + added_attended

            # Clean numeric percentage (no '%' character)
            pct_val = round((new_attended / new_total) * 100, 1) if new_total > 0 else 0
            pct_num = int(pct_val) if float(pct_val).is_integer() else round(pct_val, 1)

            student_name = ""
            name_col = alignment.master_name_col_idx if alignment.master_name_col_idx is not None else alignment.master_enrollment_col_idx + 1
            if name_col < len(row):
                student_name = str(row[name_col] or "")
            if not student_name and alignment.name_csv_column:
                student_name = str(csv_student_row.get(alignment.name_csv_column, ""))

            s_no_val = student_counter
            if alignment.master_enrollment_col_idx > 0 and len(row) > 0 and row[0]:
                try:
                    s_no_val = int(row[0])
                except Exception:
                    s_no_val = student_counter

            cell_updates = {
                total_col: new_total,
                attended_col: new_attended,
                pct_col: pct_num
            }

            updates.append({
                "row_idx": r_idx,
                "s_no": s_no_val,
                "student_name": student_name or str(enrollment_val),
                "enrollment": str(enrollment_val),
                "enrollment_col_idx": alignment.master_enrollment_col_idx,
                "name_col_idx": name_col,
                "cell_updates": cell_updates,
                "total_col_idx": total_col,
                "total_old_value": old_total,
                "total_new_value": new_total,
                "attended_col_idx": attended_col,
                "attended_old_value": old_attended,
                "attended_new_value": new_attended,
                "percentage_col_idx": pct_col,
                "percentage_old_value": row[pct_col] if pct_col < len(row) else "",
                "percentage_new_value": pct_num,
            })
            student_counter += 1

    # 6. Auto-populate student rows if master_grid had no student rows
    if not updates and csv_rows:
        for idx, row_csv in enumerate(csv_rows):
            r_idx = actual_start_row + idx
            enrollment_val = row_csv.get(alignment.enrollment_csv_column, f"ID_{idx+1}")
            student_name = row_csv.get(alignment.name_csv_column, f"Student {idx+1}") if alignment.name_csv_column else f"Student {idx+1}"
            
            if alignment.is_date_wise and alignment.date_columns:
                added_total = len(alignment.date_columns)
                added_attended = sum(
                    1 for col_name in alignment.date_columns 
                    if str(row_csv.get(col_name, '')).strip().upper() in ("P", "1", "PRESENT", "PR", "YES", "Y", "TRUE")
                )
            else:
                raw_add_total = row_csv.get(alignment.total_classes_csv_column) if alignment.total_classes_csv_column else None
                raw_add_att = row_csv.get(alignment.attended_classes_csv_column) if alignment.attended_classes_csv_column else None
                added_total = parse_int_safe(raw_add_total) if raw_add_total is not None else 1
                added_attended = parse_int_safe(raw_add_att) if raw_add_att is not None else 1
                
            pct_val = round((added_attended / added_total) * 100, 1) if added_total > 0 else 0
            pct_num = int(pct_val) if float(pct_val).is_integer() else round(pct_val, 1)

            cell_updates = {
                total_col: added_total,
                attended_col: added_attended,
                pct_col: pct_num
            }

            updates.append({
                "row_idx": r_idx,
                "s_no": idx + 1,
                "student_name": student_name,
                "enrollment": enrollment_val,
                "enrollment_col_idx": alignment.master_enrollment_col_idx,
                "name_col_idx": alignment.master_name_col_idx or (alignment.master_enrollment_col_idx + 1),
                "cell_updates": cell_updates,
                "total_col_idx": total_col,
                "total_old_value": 0,
                "total_new_value": added_total,
                "attended_col_idx": attended_col,
                "attended_old_value": 0,
                "attended_new_value": added_attended,
                "percentage_col_idx": pct_col,
                "percentage_old_value": "",
                "percentage_new_value": pct_num,
                "auto_populated": True
            })

    return {
        "success": True,
        "alignment": alignment.dict() if hasattr(alignment, "dict") else alignment,
        "updates": updates,
        "data_start_row": actual_start_row,
        "group_columns": group_columns
    }


class DynamicAlignmentRequest(BaseModel):
    master_grid: List[List[Any]]
    csv_string: str
    target_column_path: str  # e.g. "CO24554/th", "CO24804/lab", "CO24804:Mobile Application/Lab"
    custom_prompt: Optional[str] = None
    sheet_name: Optional[str] = "Sheet1"
    provider: Optional[str] = "gemini"
    api_key: Optional[str] = None
    model: Optional[str] = "gemini-2.5-flash"


def dynamic_align_schema(req: DynamicAlignmentRequest) -> dict:
    """
    Dynamic schema alignment driven by user node custom prompt and target column path.
    Splits path like 'CO24554/th' or 'CO24804/Lab' into subject/component and aligns against master_grid.
    Supports running with or without api_key.
    """
    path_parts = [p.strip() for p in req.target_column_path.replace(":", "/").split("/") if p.strip()]
    target_subject = path_parts[0] if len(path_parts) > 0 else "General"
    target_component = path_parts[1] if len(path_parts) > 1 else "Theory"

    # API key is optional: if not provided or empty, runs robust heuristic schema alignment
    api_key = req.api_key.strip() if req.api_key and req.api_key.strip() else None

    csv_headers, csv_rows = parse_csv_content(req.csv_string)
    if not csv_headers or not csv_rows:
        raise HTTPException(status_code=400, detail="Provided CSV data is empty or invalid")

    hardcoded_prompt = (
        req.custom_prompt
        if req.custom_prompt and req.custom_prompt.strip()
        else "Match Enrollment ID in column 1. Calculate present count and update total and attended classes for target path."
    )

    return align_and_compute_updates(
        master_grid=req.master_grid,
        csv_headers=csv_headers,
        csv_rows=csv_rows,
        target_subject=target_subject,
        target_component=target_component,
        target_path=req.target_column_path,
        provider=req.provider or "gemini",
        api_key=api_key,
        model=req.model or "gemini-2.5-flash",
        custom_prompt=hardcoded_prompt
    )


# ─── Generic Alignment (Any Spreadsheet Type) ───────────────────────


class GenericAlignmentRequest(BaseModel):
    master_grid: List[List[Any]]
    csv_string: str
    target_column_path: str                           # e.g. "CO24009/Lab", "Sheet1", "Name"
    column_key_map: Optional[Dict[str, int]] = None   # pre-existing mapping from DB
    merge_config: Optional[Dict[str, Any]] = None     # merge operations per column key
    custom_prompt: Optional[str] = None
    sheet_name: Optional[str] = "Sheet1"
    provider: Optional[str] = "gemini"
    api_key: Optional[str] = None
    model: Optional[str] = "gemini-2.5-flash"


def detect_code_paths_from_grid(master_grid: List[List[Any]]) -> List[Dict[str, Any]]:
    """
    Detect all unique code paths from master grid headers.
    Returns a list of { codePath, columns: [{col_idx, header, full_path}] }
    """
    if not master_grid or len(master_grid) == 0:
        return []

    data_start_row, col_paths, _, _ = extract_header_tree(master_grid)

    # Group columns by their prefix path (all but last segment)
    groups: Dict[str, List[Dict[str, Any]]] = {}

    for col_idx, path in col_paths.items():
        if not path or len(path) == 0:
            continue

        if len(path) >= 2:
            # Hierarchical header: code path is everything except the leaf
            code_path = "/".join(path[:-1])
            leaf_header = path[-1]
        else:
            # Single-row header: code path is the header itself
            code_path = "__flat__"
            leaf_header = path[0]

        if code_path not in groups:
            groups[code_path] = []

        groups[code_path].append({
            "col_idx": col_idx,
            "header": leaf_header,
            "full_path": path,
        })

    result = []
    for code_path, columns in groups.items():
        result.append({
            "codePath": code_path,
            "columns": columns,
            "isFlat": code_path == "__flat__",
        })

    return result


def suggest_column_keys(
    matched_columns: List[Dict[str, Any]],
    csv_headers: List[str],
) -> Dict[int, str]:
    """
    For each matched master grid column, suggest a stable key name
    by normalizing the leaf header into a snake_case identifier.
    """
    suggested: Dict[int, str] = {}

    for col_info in matched_columns:
        col_idx = col_info["col_idx"]
        header = str(col_info.get("header", f"Col_{col_idx + 1}"))
        # Convert to snake_case: "Total Class" → "Total_Class", "Percentage" → "Percentage"
        key = re.sub(r'[^a-zA-Z0-9]+', '_', header).strip('_')
        if not key:
            key = f"Col_{col_idx + 1}"
        suggested[col_idx] = key

    return suggested


def apply_merge_operations(
    existing_val: Any,
    incoming_val: Any,
    op: str,
) -> Any:
    """Apply a merge operation between existing and incoming values."""
    def to_num(v: Any) -> float:
        try:
            if isinstance(v, (int, float)):
                return float(v)
            nums = re.findall(r'[-+]?\d*\.?\d+', str(v))
            return float(nums[0]) if nums else 0.0
        except Exception:
            return 0.0

    if op == "replace":
        return incoming_val
    elif op == "+":
        return to_num(existing_val) + to_num(incoming_val)
    elif op == "-":
        return to_num(existing_val) - to_num(incoming_val)
    elif op == "*":
        return to_num(existing_val) * to_num(incoming_val)
    elif op == "/":
        divisor = to_num(incoming_val)
        if divisor == 0:
            return to_num(existing_val)
        return to_num(existing_val) / divisor
    else:
        return incoming_val


def generic_align_and_compute(
    master_grid: List[List[Any]],
    csv_headers: List[str],
    csv_rows: List[Dict[str, str]],
    target_path: str,
    column_key_map: Optional[Dict[str, int]] = None,
    merge_config: Optional[Dict[str, Any]] = None,
    provider: str = "gemini",
    api_key: Optional[str] = None,
    model: Optional[str] = None,
    custom_prompt: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Generic schema alignment that works with any spreadsheet type.
    Uses code paths for deterministic column mapping.
    Falls back to LLM/heuristics if no pre-existing column_key_map.
    """
    # 1. Extract header tree from master grid
    data_start_row, col_paths, master_enroll_col, master_name_col = extract_header_tree(master_grid)

    # 2. Detect all code paths and resolve target group
    all_code_paths = detect_code_paths_from_grid(master_grid)
    matched_group_columns = resolve_group_columns(col_paths, target_path)

    # 3. If we have a pre-existing column_key_map, use it deterministically
    if column_key_map and len(column_key_map) > 0:
        # Deterministic mode: column_key_map maps key names to master col indices
        # We just need to find the key column in CSV (enrollment/ID)
        enroll_csv_col = None
        for col in csv_headers:
            col_lower = col.lower()
            if any(kw in col_lower for kw in ["enroll", "roll", "reg", "id", "no"]):
                enroll_csv_col = col
                break
        if not enroll_csv_col:
            enroll_csv_col = csv_headers[0]

        # Build CSV index map
        csv_map: Dict[str, Dict[str, str]] = {}
        for row in csv_rows:
            raw_id = row.get(enroll_csv_col)
            if raw_id:
                csv_map[clean_id(raw_id)] = row

        # Build suggested keys from matched columns
        suggested_keys = suggest_column_keys(matched_group_columns, csv_headers) if matched_group_columns else {}

        # Generate updates using deterministic mapping
        updates = []
        for r_idx in range(data_start_row, len(master_grid)):
            row = master_grid[r_idx]
            if len(row) <= master_enroll_col:
                continue

            enroll_val = row[master_enroll_col]
            if not enroll_val or str(enroll_val).strip() == "":
                continue

            clean_enroll = clean_id(enroll_val)
            csv_student_row = csv_map.get(clean_enroll)

            if csv_student_row:
                cell_updates: Dict[int, Any] = {}

                for key_name, col_idx in column_key_map.items():
                    # Find matching CSV column for this key
                    csv_col_match = None
                    key_norm = normalize_token(key_name)

                    for csv_col in csv_headers:
                        if normalize_token(csv_col) == key_norm:
                            csv_col_match = csv_col
                            break

                    if not csv_col_match:
                        # Try fuzzy match
                        for csv_col in csv_headers:
                            csv_norm = normalize_token(csv_col)
                            if key_norm in csv_norm or csv_norm in key_norm:
                                csv_col_match = csv_col
                                break

                    if csv_col_match:
                        incoming_val = csv_student_row.get(csv_col_match, "")
                        existing_val = row[col_idx] if col_idx < len(row) else ""

                        # Apply merge operation if configured
                        if merge_config and key_name in merge_config:
                            op = merge_config[key_name].get("op", "replace")
                            new_val = apply_merge_operations(existing_val, incoming_val, op)
                        else:
                            new_val = incoming_val

                        cell_updates[col_idx] = new_val

                if cell_updates:
                    name_val = ""
                    if master_name_col is not None and master_name_col < len(row):
                        name_val = str(row[master_name_col] or "")

                    updates.append({
                        "row_idx": r_idx,
                        "enrollment": str(enroll_val),
                        "enrollment_col_idx": master_enroll_col,
                        "name_col_idx": master_name_col,
                        "student_name": name_val or str(enroll_val),
                        "cell_updates": cell_updates,
                    })

        # Auto-populate if no master rows matched
        if not updates and csv_rows:
            for idx, row_csv in enumerate(csv_rows):
                r_idx = data_start_row + idx
                enroll_val = row_csv.get(enroll_csv_col, f"ID_{idx+1}")
                cell_updates = {}

                for key_name, col_idx in column_key_map.items():
                    key_norm = normalize_token(key_name)
                    for csv_col in csv_headers:
                        if normalize_token(csv_col) == key_norm or key_norm in normalize_token(csv_col):
                            cell_updates[col_idx] = row_csv.get(csv_col, "")
                            break

                updates.append({
                    "row_idx": r_idx,
                    "enrollment": str(enroll_val),
                    "enrollment_col_idx": master_enroll_col,
                    "name_col_idx": master_name_col,
                    "student_name": str(enroll_val),
                    "cell_updates": cell_updates,
                    "auto_populated": True,
                })

        # Build output columns from key map
        output_columns = ["S.No", "Enrollment"]
        for key_name in column_key_map.keys():
            output_columns.append(key_name)

        output_data = []
        for i, upd in enumerate(updates):
            row_out = [i + 1, upd["enrollment"]]
            for key_name, col_idx in column_key_map.items():
                val = upd["cell_updates"].get(col_idx, "")
                row_out.append(val)
            output_data.append(row_out)

        return {
            "success": True,
            "mode": "deterministic",
            "updates": updates,
            "columns": output_columns,
            "data": output_data,
            "data_start_row": data_start_row,
            "column_key_map": column_key_map,
            "suggested_keys": suggested_keys,
            "detected_codes": [cp["codePath"] for cp in all_code_paths],
            "group_columns": [{"col_idx": g["col_idx"], "header": g["header"], "full_path": g.get("full_path", [])} for g in matched_group_columns],
        }

    # 4. No pre-existing map: fall back to LLM/heuristic alignment
    # Use the existing dynamic alignment for attendance-style sheets
    path_parts = [p.strip() for p in target_path.replace(":", "/").split("/") if p.strip()]
    target_subject = path_parts[0] if len(path_parts) > 0 else "General"
    target_component = path_parts[1] if len(path_parts) > 1 else "General"

    result = align_and_compute_updates(
        master_grid=master_grid,
        csv_headers=csv_headers,
        csv_rows=csv_rows,
        target_subject=target_subject,
        target_component=target_component,
        target_path=target_path,
        provider=provider,
        api_key=api_key,
        model=model,
        custom_prompt=custom_prompt,
    )

    # Enhance result with suggested keys and detected codes
    suggested_keys = suggest_column_keys(matched_group_columns, csv_headers)

    # Build column_key_map from alignment result for flat sheets
    auto_key_map: Dict[str, int] = {}
    if matched_group_columns:
        for col_info in matched_group_columns:
            key = re.sub(r'[^a-zA-Z0-9]+', '_', str(col_info["header"])).strip('_')
            auto_key_map[key] = col_info["col_idx"]
    elif result.get("alignment"):
        aln = result["alignment"]
        if isinstance(aln, dict):
            auto_key_map["Total_Classes"] = aln.get("master_total_col_idx", 3)
            auto_key_map["Total_Attended"] = aln.get("master_attended_col_idx", 4)
            if aln.get("master_percentage_col_idx") is not None:
                auto_key_map["Percentage"] = aln["master_percentage_col_idx"]

    result["suggested_keys"] = suggested_keys
    result["column_key_map"] = auto_key_map
    result["detected_codes"] = [cp["codePath"] for cp in all_code_paths]
    result["mode"] = "llm_heuristic"

    return result


def generic_align_schema(req: GenericAlignmentRequest) -> dict:
    """
    Entry point for generic schema alignment.
    Handles any spreadsheet type — attendance, inventory, grades, etc.
    """
    api_key = req.api_key.strip() if req.api_key and req.api_key.strip() else None

    csv_headers, csv_rows = parse_csv_content(req.csv_string)
    if not csv_headers or not csv_rows:
        raise HTTPException(status_code=400, detail="Provided CSV data is empty or invalid")

    return generic_align_and_compute(
        master_grid=req.master_grid,
        csv_headers=csv_headers,
        csv_rows=csv_rows,
        target_path=req.target_column_path,
        column_key_map=req.column_key_map,
        merge_config=req.merge_config,
        provider=req.provider or "gemini",
        api_key=api_key,
        model=req.model or "gemini-2.5-flash",
        custom_prompt=req.custom_prompt,
    )

