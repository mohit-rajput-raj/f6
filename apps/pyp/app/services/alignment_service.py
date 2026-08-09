"""
AI Schema Alignment & Attendance Merger Service for apps/pyp.
Provides LLM-assisted and heuristic schema alignment between CSV attendance files and master spreadsheet grids.
"""

import csv
import re
import json
from typing import List, Dict, Any, Tuple, Optional
from pydantic import BaseModel, Field

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
    present_value: str = Field("P", description="The value indicating present status.")
    
    # Master sheet coordinates
    master_enrollment_col_idx: int = Field(description="0-based column index in master grid for Enrollment IDs.")
    master_attended_col_idx: int = Field(description="0-based column index in master grid for target subject Attended classes.")
    master_total_col_idx: int = Field(description="0-based column index in master grid for target subject Total classes.")


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


def get_alignment_llm(provider: str, api_key: str, model: Optional[str] = None):
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
            model=model or "gemini-2.0-flash",
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
            if col.lower() in ("id", "no", "s.no"):
                enrollment_csv = col
                break
    if not enrollment_csv:
        enrollment_csv = csv_headers[1] if len(csv_headers) > 1 else csv_headers[0]
        
    # 2. Identify Name column in CSV
    name_csv = None
    for col in csv_headers:
        if "name" in col.lower():
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
            if ("attend" in col_lower or "present" in col_lower) and "total" not in col_lower:
                attended_csv = col
            if ("total" in col_lower or "held" in col_lower) and "attend" not in col_lower:
                total_csv = col
        if not attended_csv:
            for col in csv_headers:
                if "classes" in col.lower() and col != total_csv:
                    attended_csv = col
                    break

    # 5. Master grid column locations
    master_enrollment_col = 1
    master_attended_col = 4
    master_total_col = 3
    
    detail_row_idx = -1
    for r_idx, row in enumerate(master_grid[:15]):
        for c_idx, cell in enumerate(row):
            if cell and "enroll" in str(cell).lower():
                detail_row_idx = r_idx
                master_enrollment_col = c_idx
                break
        if detail_row_idx != -1:
            break
            
    if detail_row_idx < 2:
        return SchemaAlignment(
            enrollment_csv_column=enrollment_csv, name_csv_column=name_csv,
            attended_classes_csv_column=attended_csv, total_classes_csv_column=total_csv,
            is_date_wise=is_date_wise, date_columns=date_cols, present_value="P",
            master_enrollment_col_idx=master_enrollment_col,
            master_attended_col_idx=master_attended_col, master_total_col_idx=master_total_col
        )
    
    component_keywords = ["theory", "tutorial", "lab", "practical", "lecture", "tut", "th"]
    component_row_idx = -1
    subject_row_idx = -1
    sub_detail_row_idx = detail_row_idx - 1
    
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
            if cell and subject_pattern.search(str(cell)):
                subject_row_idx = r_idx
                break
        if subject_row_idx != -1:
            break
            
    if subject_row_idx == -1 or component_row_idx == -1:
        return SchemaAlignment(
            enrollment_csv_column=enrollment_csv, name_csv_column=name_csv,
            attended_classes_csv_column=attended_csv, total_classes_csv_column=total_csv,
            is_date_wise=is_date_wise, date_columns=date_cols, present_value="P",
            master_enrollment_col_idx=master_enrollment_col,
            master_attended_col_idx=master_attended_col, master_total_col_idx=master_total_col
        )
    
    subject_row = master_grid[subject_row_idx]
    component_row = master_grid[component_row_idx]
    sub_detail_row = master_grid[sub_detail_row_idx] if 0 <= sub_detail_row_idx < len(master_grid) else []
    
    max_cols = max(len(subject_row), len(component_row), len(sub_detail_row))
    
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
            
    target_sub_clean = target_subject.lower().replace(":", "").replace(" ", "")
    target_comp_clean = target_component.lower().replace(" ", "").replace(".", "")
    
    matched_start_col = -1
    for c in range(max_cols):
        sub_name = col_subject.get(c, "").lower().replace(":", "").replace(" ", "")
        comp_name = col_component.get(c, "").lower().replace(" ", "").replace(".", "")
        
        sub_match = (target_sub_clean in sub_name or sub_name in target_sub_clean) and len(sub_name) > 3
        comp_match = (target_comp_clean == comp_name) or \
                     (target_comp_clean in comp_name and len(target_comp_clean) > 1) or \
                     (comp_name in target_comp_clean and len(comp_name) > 1) or \
                     (target_comp_clean == "theory" and comp_name in ("th", "theory")) or \
                     (target_comp_clean == "tutorial" and comp_name in ("tut", "tutorial")) or \
                     (target_comp_clean == "lab" and comp_name in ("lab", "laboratory"))
        
        if sub_match and comp_match:
            matched_start_col = c
            break
            
    if matched_start_col != -1:
        found_total = False
        found_attended = False
        for offset in range(4):
            c = matched_start_col + offset
            if c < len(sub_detail_row) and sub_detail_row[c]:
                label = str(sub_detail_row[c]).lower().strip()
                if ("total" in label and "attar" not in label and "attend" not in label) or label.startswith("total class"):
                    master_total_col = c
                    found_total = True
                elif "attar" in label or "attend" in label:
                    master_attended_col = c
                    found_attended = True
        if not found_total:
            master_total_col = matched_start_col
        if not found_attended:
            master_attended_col = matched_start_col + 1
            
    return SchemaAlignment(
        enrollment_csv_column=enrollment_csv, name_csv_column=name_csv,
        attended_classes_csv_column=attended_csv, total_classes_csv_column=total_csv,
        is_date_wise=is_date_wise, date_columns=date_cols, present_value="P",
        master_enrollment_col_idx=master_enrollment_col,
        master_attended_col_idx=master_attended_col, master_total_col_idx=master_total_col
    )


def llm_align_schema(
    master_grid: List[List[Any]], 
    csv_headers: List[str], 
    csv_sample_rows: List[Dict[str, str]],
    target_subject: str, 
    target_component: str,
    provider: str = "gemini",
    api_key: Optional[str] = None,
    model: Optional[str] = None
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
        for r in csv_sample_rows[:3]:
            csv_preview += f"- {r}\n"
            
        prompt = f"""
You are an expert data mapping assistant. Analyze two spreadsheet schemas and align them to merge student attendance for a target subject and component.

TARGET SUBJECT & COMPONENT:
Subject: {target_subject}
Component: {target_component}

MASTER SPREADSHEET (Top 15 Rows):
{grid_preview}

UPLOADED CSV FILE DETAILS:
{csv_preview}

TASK:
1. Identify CSV column for student enrollment ID.
2. Identify CSV column for student name (if available).
3. Determine if CSV is aggregated (total & attended columns) or date-wise (date columns with P/A).
4. In Master Spreadsheet:
   - Find 0-based column index for student Enrollment IDs.
   - Find 0-based column index for target subject Total Classes.
   - Find 0-based column index for target subject Attended Classes.
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
    model: Optional[str] = None
) -> Dict[str, Any]:
    # 1. Align schema
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
            model=model
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
    for r_idx in range(actual_start_row, len(master_grid)):
        row = master_grid[r_idx]
        if len(row) <= alignment.master_enrollment_col_idx:
            continue
            
        enrollment_val = row[alignment.master_enrollment_col_idx]
        if not enrollment_val or str(enrollment_val).strip() == "":
            continue
            
        clean_enroll = clean_id(enrollment_val)
        csv_student_row = csv_map.get(clean_enroll)
        
        # Name fallback
        if not csv_student_row and alignment.name_csv_column:
            master_name_col_idx = alignment.master_enrollment_col_idx + 1
            if master_name_col_idx < len(row):
                master_name_val = row[master_name_col_idx]
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
                    if str(csv_student_row.get(col_name, '')).strip().upper() == alignment.present_value.upper()
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

            updates.append({
                "row_idx": r_idx,
                "student_name": csv_student_row.get(alignment.name_csv_column, str(enrollment_val)),
                "enrollment": str(enrollment_val),
                "total_col_idx": alignment.master_total_col_idx,
                "total_old_value": old_total,
                "total_new_value": new_total,
                "attended_col_idx": alignment.master_attended_col_idx,
                "attended_old_value": old_attended,
                "attended_new_value": new_attended,
            })

    return {
        "success": True,
        "alignment": alignment.dict(),
        "updates": updates
    }
