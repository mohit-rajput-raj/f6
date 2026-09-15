import json
import re
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional

from utils import parse_csv_content, heuristic_align_schema, llm_align_schema, SchemaAlignment

app = FastAPI(title="AI Attendance Merger API")

# Add CORS Middleware to support frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "AI Attendance Merger Server is Running"}

def clean_id(val: Any) -> str:
    if val is None:
        return ""
    # Strip spaces, dashes, slashes, and make lowercase
    return re.sub(r'[^a-zA-Z0-9]', '', str(val)).lower().strip()

@app.post("/api/align-schema")
async def align_schema(
    file: UploadFile = File(...),
    master_grid_str: str = Form(..., alias="master_grid"),
    target_subject: str = Form(...),
    target_component: str = Form(...),
    custom_prompt: Optional[str] = Form(None)
):
    try:
        # 1. Parse Master Grid
        master_grid = json.loads(master_grid_str)
        if not isinstance(master_grid, list):
            raise HTTPException(status_code=400, detail="master_grid must be a JSON array of arrays")
            
        # 2. Parse CSV file content
        csv_bytes = await file.read()
        csv_string = csv_bytes.decode("utf-8-sig", errors="ignore")
        csv_headers, csv_rows = parse_csv_content(csv_string)
        
        if not csv_headers or not csv_rows:
            raise HTTPException(status_code=400, detail="Uploaded CSV file is empty or invalid")
            
        # 3. Align Schema using LLM (if API key available) or Heuristics
        alignment = None
        
        # Try LLM first
        alignment = llm_align_schema(
            master_grid=master_grid,
            csv_headers=csv_headers,
            csv_sample_rows=csv_rows[:5],
            target_subject=target_subject,
            target_component=target_component,
            custom_prompt=custom_prompt
        )
        
        if alignment:
            print("Successfully aligned schema using Gemini LLM!")
        else:
            print("LLM aligned schema returned None or failed. Falling back to heuristics.")
            alignment = heuristic_align_schema(
                master_grid=master_grid,
                csv_headers=csv_headers,
                target_subject=target_subject,
                target_component=target_component
            )
            
        print(f"Alignment columns: {alignment}")

        # 4. Generate updates
        updates = []
        
        # Build CSV enrollment index map for O(N) lookup
        csv_map = {}
        for row in csv_rows:
            raw_enroll = row.get(alignment.enrollment_csv_column)
            if raw_enroll:
                csv_map[clean_id(raw_enroll)] = row

        enrollment_pattern = re.compile(r'.*\d{3,}.*') # has at least 3 digits
        actual_start_row = 9 # fallback
        for r_idx in range(len(master_grid)):
            row = master_grid[r_idx]
            if len(row) > alignment.master_enrollment_col_idx:
                val = row[alignment.master_enrollment_col_idx]
                if val and enrollment_pattern.match(str(val)):
                    actual_start_row = r_idx
                    break

        for r_idx in range(actual_start_row, len(master_grid)):
            row = master_grid[r_idx]
            if len(row) <= alignment.master_enrollment_col_idx:
                continue
                
            enrollment_val = row[alignment.master_enrollment_col_idx]
            if not enrollment_val or str(enrollment_val).strip() == "":
                continue
                
            clean_enroll = clean_id(enrollment_val)
            
            # Find matching student in CSV
            csv_student_row = csv_map.get(clean_enroll)
            
            # Fallback to name matching if enrollment not matched directly
            if not csv_student_row and alignment.name_csv_column:
                master_name_col_idx = alignment.master_name_col_idx if alignment.master_name_col_idx is not None else alignment.master_enrollment_col_idx + 1
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
                
                def parse_int_safe(val: Any) -> int:
                    try:
                        if isinstance(val, (int, float)):
                            return int(val)
                        digits = re.findall(r'\d+', str(val))
                        return int(digits[0]) if digits else 0
                    except Exception:
                        return 0
                        
                old_total = parse_int_safe(old_total_val)
                old_attended = parse_int_safe(old_attended_val)
                
                new_total = 0
                new_attended = 0
                
                if alignment.is_date_wise and alignment.date_columns:
                    for d_col in alignment.date_columns:
                        status = str(csv_student_row.get(d_col, "")).strip().upper()
                        if status in ("P", "1", "PRESENT", "PR", "YES", "Y", "TRUE"):
                            new_attended += 1
                    new_total = len(alignment.date_columns)
                else:
                    new_total_str = csv_student_row.get(alignment.total_classes_csv_column, "0")
                    new_attend_str = csv_student_row.get(alignment.attended_classes_csv_column, "0")
                    new_total = parse_int_safe(new_total_str) if new_total_str else 1
                    new_attended = parse_int_safe(new_attend_str) if new_attend_str else 1
                
                total_merged = old_total + new_total
                attended_merged = old_attended + new_attended
                
                # Percentage calculation
                pct_val = round((attended_merged / total_merged) * 100, 1) if total_merged > 0 else 0.0
                pct_str = f"{int(pct_val)}%" if pct_val.is_integer() else f"{pct_val:.1f}%"
                
                student_name = ""
                name_col = alignment.master_name_col_idx if alignment.master_name_col_idx is not None else alignment.master_enrollment_col_idx + 1
                if name_col < len(row):
                    student_name = str(row[name_col] or "")
                if not student_name and alignment.name_csv_column:
                    student_name = str(csv_student_row.get(alignment.name_csv_column, ""))

                pct_col = alignment.master_percentage_col_idx if alignment.master_percentage_col_idx is not None else alignment.master_attended_col_idx + 1
                
                s_no_val = len(updates) + 1
                if alignment.master_enrollment_col_idx > 0 and len(row) > 0 and row[0]:
                    try:
                        s_no_val = int(row[0])
                    except Exception:
                        s_no_val = len(updates) + 1

                updates.append({
                    "row_idx": r_idx,
                    "s_no": s_no_val,
                    "student_name": student_name or str(enrollment_val),
                    "enrollment": str(enrollment_val),
                    "enrollment_col_idx": alignment.master_enrollment_col_idx,
                    "name_col_idx": name_col,
                    "total_col_idx": alignment.master_total_col_idx,
                    "total_old_value": old_total,
                    "total_new_value": total_merged,
                    "attended_col_idx": alignment.master_attended_col_idx,
                    "attended_old_value": old_attended,
                    "attended_new_value": attended_merged,
                    "percentage_col_idx": pct_col,
                    "percentage_old_value": row[pct_col] if pct_col < len(row) else "",
                    "percentage_new_value": pct_str
                })
                
        return {
            "success": True,
            "alignment": alignment.dict(),
            "updates": updates
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error merging attendance: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)