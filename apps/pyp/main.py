from fastapi import FastAPI, UploadFile, File
from fastapi.responses import StreamingResponse
import io
import pandas as pd
app = FastAPI()
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
from fastapi import APIRouter, UploadFile, File
from pydantic import BaseModel
from typing import List, Any, Optional
from app.services.file_service import (
    load_dataframe,
    process_attendance,
    dataframe_to_csv_stream,
)
from app.services.calculation_service import (
    calculate_column_math,
    evaluate_formula,
    transform_data,
)

router = APIRouter()


@router.get("/health")
async def health():
    return {"status": "ok"}


# ─── File upload endpoints ───────────────────────

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    df = await load_dataframe(file)
    return {
        "filename": file.filename,
        "rows": len(df),
        "data": df.to_dict(orient="records"),
    }


@router.post("/process")
async def process_file(file: UploadFile = File(...)):
    df = await load_dataframe(file)
    updated_df = process_attendance(df)
    return dataframe_to_csv_stream(updated_df, file.filename)


@router.post("/process-json")
async def process_file_json(file: UploadFile = File(...)):
    df = await load_dataframe(file)
    updated_df = process_attendance(df)
    return updated_df.to_dict(orient="records")


@router.post("/process-json-stream")
async def process_file_json_stream(file: UploadFile = File(...)):
    df = await load_dataframe(file)
    return {
        "columns": df.columns.tolist(),
        "data": df.values.tolist(),
    }


# ─── Calculation endpoints ───────────────────────

class CalculateRequest(BaseModel):
    columns: List[str]
    data: List[List[Any]]
    column: str
    operation: str
    value: Optional[float] = None
    source_column: Optional[str] = None
    result_column: Optional[str] = None


@router.post("/calculate")
async def calculate(req: CalculateRequest):
    """Column math operations (add/sub/mul/div)."""
    try:
        result = calculate_column_math(
            columns=req.columns,
            data=req.data,
            column=req.column,
            operation=req.operation,
            value=req.value,
            source_column=req.source_column,
            result_column=req.result_column,
        )
        return result
    except Exception as e:
        return {"error": str(e)}


class FormulaRequest(BaseModel):
    columns: List[str]
    data: List[List[Any]]
    formula: str
    result_column: Optional[str] = None


@router.post("/formula")
async def formula(req: FormulaRequest):
    """Evaluate a custom formula using pandas eval."""
    try:
        result = evaluate_formula(
            columns=req.columns,
            data=req.data,
            formula=req.formula,
            result_column=req.result_column,
        )
        return result
    except Exception as e:
        return {"error": str(e)}


class TransformRequest(BaseModel):
    columns: List[str]
    data: List[List[Any]]
    operation: str
    config: dict


@router.post("/transform")
async def transform(req: TransformRequest):
    """General data transforms (sort, aggregate, etc.)."""
    try:
        result = transform_data(
            columns=req.columns,
            data=req.data,
            operation=req.operation,
            config=req.config,
        )
        return result
    except Exception as e:
        return {"error": str(e)}


app.include_router(router)
