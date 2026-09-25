"""
AI Router — Endpoints for running the LangGraph agent and individual tools.
"""

from fastapi import APIRouter, HTTPException, UploadFile, File
import os
import base64
from pydantic import BaseModel
from typing import List, Any, Optional
from app.services.agent_service import run_agent
from app.services.alignment_service import (
    align_and_compute_updates,
    parse_csv_content,
    dynamic_align_schema,
    DynamicAlignmentRequest,
    generic_align_schema,
    GenericAlignmentRequest,
    detect_code_paths_from_grid,
    extract_header_tree,
)
from app.tools.ocr_tool import extract_table_from_image
from app.tools.formula_tool import evaluate_formula, aggregate_column
from app.tools.column_matcher import match_columns

router = APIRouter(prefix="/ai", tags=["AI"])


# ─── Schemas ─────────────────────────────────────────────────

class AlignSchemaRequest(BaseModel):
    master_grid: List[List[Any]]
    csv_string: str
    target_subject: str
    target_component: str
    custom_prompt: Optional[str] = None
    provider: Optional[str] = "gemini"
    api_key: Optional[str] = None
    model: Optional[str] = None


class AgentRequest(BaseModel):
    provider: str  # "gemini" | "openai" | "claude"
    api_key: str
    model: Optional[str] = None
    prompt: str
    context_data: Optional[dict] = None  # { columns, data }


class OCRRequest(BaseModel):
    image_base64: str
    api_key: Optional[str] = None
    model_name: Optional[str] = "gemini-2.5-flash"
    custom_prompt: Optional[str] = None
    dot_to_a: Optional[bool] = True
    leave_unclear_blank: Optional[bool] = True
    handle_cross_outs: Optional[bool] = True
    parse_multi_tier_dates: Optional[bool] = True
    include_bottom_notes: Optional[bool] = True
    is_data_only: Optional[bool] = False
    tile_context: Optional[str] = None


class FormulaRequest(BaseModel):
    columns: List[str]
    data: List[List[Any]]
    formula: str
    result_column: Optional[str] = None


class AggregateRequest(BaseModel):
    columns: List[str]
    data: List[List[Any]]
    column: str
    operation: str


class ColumnMatchRequest(BaseModel):
    source_columns: List[str]
    target_columns: List[str]
    threshold: Optional[float] = 0.6


# ─── Endpoints ───────────────────────────────────────────────

@router.post("/agent")
async def agent_endpoint(req: AgentRequest):
    """Run the LangGraph ReAct agent with all spreadsheet tools."""
    try:
        result = await run_agent(
            provider=req.provider,
            api_key=req.api_key,
            model=req.model,
            prompt=req.prompt,
            context_data=req.context_data,
        )
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ocr")
async def ocr_endpoint(req: OCRRequest):
    """Extract table data from an image using vision LLM with LangChain."""
    try:
        api_key = req.api_key or os.getenv("GEMINI_API_KEY")
        result = extract_table_from_image.invoke({
            "image_base64": req.image_base64,
            "api_key": api_key,
            "model_name": req.model_name or "gemini-2.5-flash",
            "custom_prompt": req.custom_prompt,
            "dot_to_a": req.dot_to_a if req.dot_to_a is not None else True,
            "leave_unclear_blank": req.leave_unclear_blank if req.leave_unclear_blank is not None else True,
            "handle_cross_outs": req.handle_cross_outs if req.handle_cross_outs is not None else True,
            "parse_multi_tier_dates": req.parse_multi_tier_dates if req.parse_multi_tier_dates is not None else True,
            "include_bottom_notes": req.include_bottom_notes if req.include_bottom_notes is not None else True,
            "is_data_only": req.is_data_only or False,
            "tile_context": req.tile_context,
        })
        if isinstance(result, dict) and "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return {"success": True, "data": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ocr/upload")
async def ocr_upload_endpoint(file: UploadFile = File(...)):
    """Extract table data directly from an uploaded image file."""
    try:
        content = await file.read()
        mime_type = file.content_type or "image/png"
        b64 = f"data:{mime_type};base64,{base64.b64encode(content).decode('utf-8')}"
        api_key = os.getenv("GEMINI_API_KEY")
        result = extract_table_from_image.invoke({
            "image_base64": b64,
            "api_key": api_key,
            "model_name": "gemini-2.5-flash",
        })
        if isinstance(result, dict) and "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return {"success": True, "data": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/formula")
async def formula_endpoint(req: FormulaRequest):
    """Evaluate a pandas formula on spreadsheet data."""
    try:
        result = evaluate_formula.invoke({
            "columns": req.columns,
            "data": req.data,
            "formula": req.formula,
            "result_column": req.result_column,
        })
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return {"success": True, "data": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/aggregate")
async def aggregate_endpoint(req: AggregateRequest):
    """Aggregate a column using sum, mean, max, min, etc."""
    try:
        result = aggregate_column.invoke({
            "columns": req.columns,
            "data": req.data,
            "column": req.column,
            "operation": req.operation,
        })
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return {"success": True, "data": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/match-columns")
async def match_columns_endpoint(req: ColumnMatchRequest):
    """Fuzzy match source columns to target columns."""
    try:
        result = match_columns.invoke({
            "source_columns": req.source_columns,
            "target_columns": req.target_columns,
            "threshold": req.threshold,
        })
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/align-schema")
async def align_schema_endpoint(req: AlignSchemaRequest):
    """Align CSV attendance schema with MasterSheet grid and generate student updates."""
    try:
        csv_headers, csv_rows = parse_csv_content(req.csv_string)
        if not csv_headers or not csv_rows:
            raise HTTPException(status_code=400, detail="Provided CSV data is empty or invalid")

        result = align_and_compute_updates(
            master_grid=req.master_grid,
            csv_headers=csv_headers,
            csv_rows=csv_rows,
            target_subject=req.target_subject,
            target_component=req.target_component,
            provider=req.provider or "gemini",
            api_key=req.api_key,
            model=req.model,
            custom_prompt=req.custom_prompt
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/dynamic-align-schema")
async def dynamic_align_schema_endpoint(req: DynamicAlignmentRequest):
    """Dynamically align attendance/marks schema using dynamic target column path (e.g. code123/th) and custom prompt."""
    try:
        if not req.master_grid:
            raise HTTPException(status_code=400, detail="Missing master grid")
        if not req.csv_string:
            raise HTTPException(status_code=400, detail="Missing input data string")
            
        result = dynamic_align_schema(req)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generic-align")
async def generic_align_endpoint(req: GenericAlignmentRequest):
    """
    Generic schema alignment for any spreadsheet type.
    Supports deterministic mapping via column_key_map, merge operations,
    and auto-detection of code paths from master sheet headers.
    """
    try:
        if not req.master_grid:
            raise HTTPException(status_code=400, detail="Missing master grid")
        if not req.csv_string:
            raise HTTPException(status_code=400, detail="Missing input data string")

        result = generic_align_schema(req)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class DetectCodesRequest(BaseModel):
    master_grid: List[List[Any]]


@router.post("/detect-codes")
async def detect_codes_endpoint(req: DetectCodesRequest):
    """Detect all code paths from master sheet headers without alignment."""
    try:
        if not req.master_grid:
            raise HTTPException(status_code=400, detail="Missing master grid")

        codes = detect_code_paths_from_grid(req.master_grid)
        data_start_row, col_paths, enroll_col, name_col = extract_header_tree(req.master_grid)

        return {
            "success": True,
            "detected_codes": codes,
            "data_start_row": data_start_row,
            "enrollment_col_idx": enroll_col,
            "name_col_idx": name_col,
            "col_paths": {str(k): v for k, v in col_paths.items()},
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
