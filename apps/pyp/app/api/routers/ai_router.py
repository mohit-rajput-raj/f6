"""
AI Router — Endpoints for running the LangGraph agent and individual tools.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Any, Optional
from app.services.agent_service import run_agent
from app.services.alignment_service import align_and_compute_updates, parse_csv_content
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
    api_key: str
    model_name: Optional[str] = "gemini-2.0-flash"


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
    """Extract table data from an image using vision LLM."""
    try:
        result = extract_table_from_image.invoke({
            "image_base64": req.image_base64,
            "api_key": req.api_key,
            "model_name": req.model_name,
        })
        if "error" in result:
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
            model=req.model
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

