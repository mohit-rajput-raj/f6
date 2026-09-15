import csv
import re
from typing import List, Dict, Any, Tuple, Optional
from pydantic import BaseModel, Field
from config import get_llm

class SchemaAlignment(BaseModel):
    enrollment_csv_column: str = Field(description="The exact name of the column in the CSV file that contains student enrollment IDs.")
    name_csv_column: Optional[str] = Field(None, description="The name of the column in the CSV file that contains student names.")
    
    # Option A: Aggregated summary format
    attended_classes_csv_column: Optional[str] = Field(None, description="The column in the CSV representing classes attended by the student.")
    total_classes_csv_column: Optional[str] = Field(None, description="The column in the CSV representing total classes held.")
    
    # Option B: Daily checklist format
    is_date_wise: bool = Field(False, description="True if the CSV has individual columns representing dates with P/A (Present/Absent) marks.")
    date_columns: List[str] = Field(default=[], description="List of individual date columns in the CSV representing days (e.g., 'Jul 1', 'Jul 2').")
    present_value: str = Field("P", description="The value indicating the student was present (e.g., 'P', '1', 'Present').")
    
    # Master sheet coordinates (found by LLM/Heuristics)
    master_enrollment_col_idx: int = Field(description="The 0-based column index in the master spreadsheet grid where Enrollment IDs are stored.")
    master_name_col_idx: Optional[int] = Field(None, description="The 0-based column index in the master spreadsheet where student Names are stored.")
    master_total_col_idx: int = Field(description="The 0-based column index in the master spreadsheet representing the target subject's Total classes.")
    master_attended_col_idx: int = Field(description="The 0-based column index in the master spreadsheet representing the target subject's Attended classes.")
    master_percentage_col_idx: Optional[int] = Field(None, description="The 0-based column index in the master spreadsheet representing the target subject's Percentage.")

def parse_csv_content(csv_string: str) -> Tuple[List[str], List[Dict[str, str]]]:
    """
    Parses raw CSV string content into headers and list of rows (dictionary).
    """
    lines = csv_string.strip().splitlines()
    if not lines:
        return [], []
    
    # Read headers and rows using python standard csv reader
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

def heuristic_align_schema(
    master_grid: List[List[Any]], 
    csv_headers: List[str], 
    target_subject: str, 
    target_component: str
) -> SchemaAlignment:
    """
    Fall back heuristic rules to align schema if LLM is unavailable or fails.
    Uses carry-forward logic for merged cells to find the correct subject+component columns.
    """
    # 1. Identify Enrollment column in CSV
    enrollment_csv = None
    for col in csv_headers:
        col_lower = col.lower()
        if "enroll" in col_lower or "roll" in col_lower:
            enrollment_csv = col
            break
    if not enrollment_csv:
        for col in csv_headers:
            if col.lower() in ("id", "no", "s.no", "enrollment_no"):
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
        
    # 4. If not date-wise, find aggregate columns
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

    # 5. Locate column indices in master sheet
    master_enrollment_col = 1
    master_name_col = 2
    master_total_col = 3
    master_attended_col = 4
    master_percentage_col = 5
    
    # Find the detail header row (containing "Enrollment")
    detail_row_idx = -1
    for r_idx, row in enumerate(master_grid[:15]):
        for c_idx, cell in enumerate(row):
            if cell and "enroll" in str(cell).lower():
                detail_row_idx = r_idx
                master_enrollment_col = c_idx
                break
        if detail_row_idx != -1:
            break

    if detail_row_idx != -1:
        for c_idx, cell in enumerate(master_grid[detail_row_idx]):
            if cell and "name" in str(cell).lower():
                master_name_col = c_idx
                break
            
    if detail_row_idx < 1:
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
    
    # Find component row and subject row
    component_keywords = ["theory", "tutorial", "lab", "practical", "lecture", "tut", "th", "tut."]
    component_row_idx = -1
    subject_row_idx = -1
    
    for r_idx in range(detail_row_idx - 1, max(-1, detail_row_idx - 5), -1):
        if r_idx < 0 or r_idx >= len(master_grid):
            continue
        row_cells = [str(c).lower().strip() for c in master_grid[r_idx] if c is not None]
        if component_row_idx == -1 and any(any(kw in cell for kw in component_keywords) for cell in row_cells):
            component_row_idx = r_idx
            
    subject_pattern = re.compile(r'[A-Z]{2}\d{3,}', re.IGNORECASE)
    for r_idx in range(detail_row_idx - 1, max(-1, detail_row_idx - 5), -1):
        if r_idx < 0 or r_idx >= len(master_grid) or r_idx == component_row_idx:
            continue
        for cell in master_grid[r_idx]:
            if cell and (subject_pattern.search(str(cell)) or ":" in str(cell)):
                subject_row_idx = r_idx
                break
        if subject_row_idx != -1:
            break

    if subject_row_idx == -1 and component_row_idx != -1 and component_row_idx > 0:
        subject_row_idx = component_row_idx - 1
    elif component_row_idx == -1 and subject_row_idx != -1 and subject_row_idx < detail_row_idx - 1:
        component_row_idx = subject_row_idx + 1

    subject_row = master_grid[subject_row_idx] if 0 <= subject_row_idx < len(master_grid) else []
    component_row = master_grid[component_row_idx] if 0 <= component_row_idx < len(master_grid) else []
    detail_row = master_grid[detail_row_idx] if 0 <= detail_row_idx < len(master_grid) else []
    
    max_cols = max(len(subject_row), len(component_row), len(detail_row), len(master_grid[0]) if master_grid else 0)
    
    col_subject = {}
    current_sub = None
    for c in range(max_cols):
        val = subject_row[c] if c < len(subject_row) else None
        if val is not None and str(val).strip():
            current_sub = str(val).strip()
        if current_sub:
            col_subject[c] = current_sub
            
    col_component = {}
    current_comp = None
    for c in range(max_cols):
        val = component_row[c] if c < len(component_row) else None
        if val is not None and str(val).strip():
            current_comp = str(val).strip()
        if current_comp:
            col_component[c] = current_comp
            
    target_sub_clean = re.sub(r'[^a-zA-Z0-9]', '', target_subject).lower()
    target_comp_clean = re.sub(r'[^a-zA-Z0-9]', '', target_component).lower()
    
    matched_cols = []
    for c in range(max_cols):
        sub_name = re.sub(r'[^a-zA-Z0-9]', '', col_subject.get(c, "")).lower()
        comp_name = re.sub(r'[^a-zA-Z0-9]', '', col_component.get(c, "")).lower()
        
        sub_match = (target_sub_clean in sub_name or sub_name in target_sub_clean) and len(sub_name) >= 3
        
        comp_match = False
        if target_comp_clean in ("th", "theory", "lecture", "lec"):
            comp_match = comp_name in ("th", "theory", "lecture", "lec") if comp_name else True
        elif target_comp_clean in ("tut", "tutorial"):
            comp_match = comp_name in ("tut", "tutorial") if comp_name else True
        elif target_comp_clean in ("lab", "practical", "laboratory", "prac"):
            comp_match = comp_name in ("lab", "practical", "laboratory", "prac") if comp_name else True
        else:
            comp_match = (target_comp_clean in comp_name or comp_name in target_comp_clean) if comp_name else True
        
        if sub_match and comp_match:
            matched_cols.append(c)
            
    if matched_cols:
        matched_start_col = matched_cols[0]
        found_total = False
        found_attended = False
        found_pct = False
        
        for c in matched_cols:
            label = str(detail_row[c]).lower().strip() if c < len(detail_row) else ""
            if ("total" in label and "attar" not in label and "attend" not in label) or label.startswith("total class"):
                master_total_col = c
                found_total = True
            elif "attar" in label or "attend" in label or "present" in label:
                master_attended_col = c
                found_attended = True
            elif "percent" in label or "pct" in label or "%" in label:
                master_percentage_col = c
                found_pct = True
                
        if not found_total:
            master_total_col = matched_start_col
        if not found_attended:
            master_attended_col = matched_start_col + 1
        if not found_pct:
            master_percentage_col = matched_start_col + 2
            
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
    custom_prompt: Optional[str] = None
) -> Optional[SchemaAlignment]:
    """
    Uses Gemini LLM with structured output to parse the layout and determine the exact mapping.
    """
    llm = get_llm()
    if not llm:
        print("[GEMINI LLM] get_llm() returned None. Check GEMINI_API_KEY.")
        return None
        
    grid_preview = ""
    for idx, row in enumerate(master_grid[:15]):
        row_vals = [f"Col {i}: '{val}'" for i, val in enumerate(row) if val is not None and str(val).strip() != ""]
        if row_vals:
            grid_preview += f"Row {idx}: {', '.join(row_vals)}\n"
        
    csv_preview = f"Headers: {csv_headers}\n"
    csv_preview += "Sample Rows:\n"
    for r in csv_sample_rows[:4]:
        csv_preview += f"- {r}\n"
        
    custom_section = f"\n### CUSTOM USER INSTRUCTIONS (FROM LLM WORKFLOW NODE):\n{custom_prompt}\n" if custom_prompt and custom_prompt.strip() else ""

    prompt = f"""
You are an expert data mapping assistant. Your job is to analyze two spreadsheet schemas (a multi-level master attendance spreadsheet grid and an uploaded CSV file) and align them to merge student attendance for a target subject and component.

### TARGET SUBJECT & COMPONENT
Subject: {target_subject}
Component: {target_component} (e.g. Theory, Lab, Tutorial)
{custom_section}
### MASTER SPREADSHEET (Top 15 Rows with 0-based column indices)
{grid_preview}

### UPLOADED CSV FILE DETAILS
{csv_preview}

### TASK
1. Identify which column in the CSV contains the student's unique enrollment ID (e.g. "Enrollment", "Enrollment No").
2. Identify which column in the CSV contains the student's name (if any).
3. Determine how attendance is represented in the CSV:
   - **Case A (Aggregated)**: There are specific columns indicating total classes held and classes attended (e.g. 'Attend_Classes', 'Total_Classes').
   - **Case B (Date-wise)**: There are multiple columns representing individual dates (e.g. 'Jul 1', 'Jul 2') where attendance is logged cell-by-cell (e.g. 'P' for Present, 'A' for Absent).
4. In the Master Spreadsheet:
   - Find the 0-based column index for student Enrollment IDs.
   - Find the 0-based column index for student Names (if available).
   - Find the 0-based column index for the target subject's "Total Classes" (under {target_subject} and {target_component}).
   - Find the 0-based column index for the target subject's "Total Attended" (under {target_subject} and {target_component}).
   - Find the 0-based column index for the target subject's "Percentage" (under {target_subject} and {target_component}).

Return the alignment details structured matching the SchemaAlignment schema.
"""
    try:
        structured_llm = llm.with_structured_output(SchemaAlignment)
        result = structured_llm.invoke(prompt)
        print(f"[GEMINI LLM] Successfully returned alignment: {result}")
        return result
    except Exception as e:
        import traceback
        print(f"[GEMINI LLM] Error in LLM schema alignment: {e}")
        traceback.print_exc()
        return None
