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


def heuristic_align_schema(
    master_grid: List[List[Any]], 
    csv_headers: List[str], 
    target_subject: str, 
    target_component: str
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

    # 5. Master grid column locations
    master_enrollment_col = 1
    master_name_col = 2
    master_total_col = 3
    master_attended_col = 4
    master_percentage_col = 5
    
    detail_row_idx = -1
    for r_idx, row in enumerate(master_grid[:15]):
        for c_idx, cell in enumerate(row):
            if cell and "enroll" in str(cell).lower():
                detail_row_idx = r_idx
                master_enrollment_col = c_idx
                break
        if detail_row_idx != -1:
            break

    # Also look for Name column in master_grid
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
    
    # Identify component row (Theory/Tutorial/Lab) and subject row (e.g. CO24554:Discret)
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
    
    col_subject: Dict[int, str] = {}
    current_sub = None
    for c in range(max_cols):
        val = subject_row[c] if c < len(subject_row) else None
        if val is not None and str(val).strip():
            current_sub = str(val).strip()
        if current_sub:
            col_subject[c] = current_sub
            
    col_component: Dict[int, str] = {}
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
        
        # Component matching aliases
        comp_match = False
        # Component matching aliases (robust against abbreviations, casing, punctuation like Th.)
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
        # Inspect columns within matched group
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
    else:
        # Fallback search by scanning detail_row and subject_row directly
        for c in range(max_cols):
            label = str(detail_row[c]).lower().strip() if c < len(detail_row) else ""
            if "total class" in label and not master_total_col:
                master_total_col = c
            elif ("total attar" in label or "attendance" in label) and not master_attended_col:
                master_attended_col = c
            elif ("percentage" in label or "%" in label) and not master_percentage_col:
                master_percentage_col = c

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

        prompt = f"""
You are an expert data mapping and spreadsheet alignment assistant. Analyze two spreadsheet schemas (a multi-level Master Spreadsheet grid and an uploaded CSV file) and align them to merge student attendance for a target subject and component.

### TARGET SUBJECT & COMPONENT:
Subject: {target_subject}
Component: {target_component} (e.g. Theory, Lab, Tutorial)
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
   - Under the specific target subject ({target_subject}) and component ({target_component}):
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
    provider: str = "gemini",
    api_key: Optional[str] = None,
    model: Optional[str] = None,
    custom_prompt: Optional[str] = None
) -> Dict[str, Any]:
    # 1. Align schema via LLM if api_key available, otherwise fallback to heuristics
    alignment = None
    if api_key:
        alignment = llm_align_schema(
            master_grid=master_grid,
            csv_headers=csv_headers,
            csv_sample_rows=csv_rows[:5],
            target_subject=target_subject,
            target_component=target_component,
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
            target_component=target_component
        )

    # 2. Build index map
    csv_map = {}
    for row in csv_rows:
        raw_enroll = row.get(alignment.enrollment_csv_column)
        if raw_enroll:
            csv_map[clean_id(raw_enroll)] = row

    # 3. Locate start data row
    enrollment_pattern = re.compile(r'.*\d{3,}.*')
    actual_start_row = 9
    for r_idx in range(len(master_grid)):
        row = master_grid[r_idx]
        if len(row) > alignment.master_enrollment_col_idx:
            val = row[alignment.master_enrollment_col_idx]
            if val and enrollment_pattern.match(str(val)):
                actual_start_row = r_idx
                break

    updates = []
    def parse_int_safe(val: Any) -> int:
        try:
            if isinstance(val, (int, float)):
                return int(val)
            nums = re.findall(r'\d+', str(val))
            return int(nums[0]) if nums else 0
        except Exception:
            return 0

    # 4. Generate updates
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
            old_total_val = row[alignment.master_total_col_idx] if alignment.master_total_col_idx < len(row) else "0"
            old_attended_val = row[alignment.master_attended_col_idx] if alignment.master_attended_col_idx < len(row) else "0"
            
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

            # Compute Percentage
            pct_val = round((new_attended / new_total) * 100, 1) if new_total > 0 else 0.0
            pct_str = f"{int(pct_val)}%" if pct_val.is_integer() else f"{pct_val:.1f}%"

            student_name = ""
            name_col = alignment.master_name_col_idx if alignment.master_name_col_idx is not None else alignment.master_enrollment_col_idx + 1
            if name_col < len(row):
                student_name = str(row[name_col] or "")
            if not student_name and alignment.name_csv_column:
                student_name = str(csv_student_row.get(alignment.name_csv_column, ""))

            pct_col = alignment.master_percentage_col_idx if alignment.master_percentage_col_idx is not None else alignment.master_attended_col_idx + 1

            s_no_val = student_counter
            if alignment.master_enrollment_col_idx > 0 and len(row) > 0 and row[0]:
                try:
                    s_no_val = int(row[0])
                except Exception:
                    s_no_val = student_counter

            updates.append({
                "row_idx": r_idx,
                "s_no": s_no_val,
                "student_name": student_name or str(enrollment_val),
                "enrollment": str(enrollment_val),
                "enrollment_col_idx": alignment.master_enrollment_col_idx,
                "name_col_idx": name_col,
                "total_col_idx": alignment.master_total_col_idx,
                "total_old_value": old_total,
                "total_new_value": new_total,
                "attended_col_idx": alignment.master_attended_col_idx,
                "attended_old_value": old_attended,
                "attended_new_value": new_attended,
                "percentage_col_idx": pct_col,
                "percentage_old_value": row[pct_col] if pct_col < len(row) else "",
                "percentage_new_value": pct_str,
            })
            student_counter += 1

    # 5. Auto-populate student rows if master_grid is empty
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
                
            pct_val = round((added_attended / added_total) * 100, 1) if added_total > 0 else 0.0
            pct_str = f"{int(pct_val)}%" if pct_val.is_integer() else f"{pct_val:.1f}%"
            pct_col = alignment.master_percentage_col_idx if alignment.master_percentage_col_idx is not None else alignment.master_attended_col_idx + 1

            updates.append({
                "row_idx": r_idx,
                "s_no": idx + 1,
                "student_name": student_name,
                "enrollment": enrollment_val,
                "enrollment_col_idx": alignment.master_enrollment_col_idx,
                "name_col_idx": alignment.master_name_col_idx or (alignment.master_enrollment_col_idx + 1),
                "total_col_idx": alignment.master_total_col_idx,
                "total_old_value": 0,
                "total_new_value": added_total,
                "attended_col_idx": alignment.master_attended_col_idx,
                "attended_old_value": 0,
                "attended_new_value": added_attended,
                "percentage_col_idx": pct_col,
                "percentage_old_value": "",
                "percentage_new_value": pct_str,
                "auto_populated": True
            })

    return {
        "success": True,
        "alignment": alignment.dict(),
        "updates": updates
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
    """
    path_parts = [p.strip() for p in req.target_column_path.replace(":", "/").split("/") if p.strip()]
    target_subject = path_parts[0] if len(path_parts) > 0 else "General"
    target_component = path_parts[1] if len(path_parts) > 1 else "Theory"

    if not req.api_key or not req.api_key.strip():
        raise HTTPException(status_code=400, detail="Missing API Key. Please enter a valid Gemini/OpenAI API Key on the node or in account settings.")

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
        provider=req.provider or "gemini",
        api_key=req.api_key,
        model=req.model or "gemini-2.5-flash",
        custom_prompt=hardcoded_prompt
    )
