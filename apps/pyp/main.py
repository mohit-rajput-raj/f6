"""
UNIXL Python AI Server — FastAPI entrypoint
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

# ─── Existing routers (file processing, calculations) ────────
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

# ─── New AI router ───────────────────────────────────────────
from app.api.routers.ai_router import router as ai_router

# ─── App Setup ───────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Legacy Data Processing Router ──────────────────────────
legacy_router = APIRouter(tags=["Data Processing"])


@legacy_router.get("/health")
async def health():
    return {"status": "ok", "app": settings.APP_NAME, "version": settings.APP_VERSION}


@legacy_router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    df = await load_dataframe(file)
    return {
        "filename": file.filename,
        "rows": len(df),
        "data": df.to_dict(orient="records"),
    }


@legacy_router.post("/process")
async def process_file(file: UploadFile = File(...)):
    df = await load_dataframe(file)
    updated_df = process_attendance(df)
    return dataframe_to_csv_stream(updated_df, file.filename)


@legacy_router.post("/process-json")
async def process_file_json(file: UploadFile = File(...)):
    df = await load_dataframe(file)
    updated_df = process_attendance(df)
    return updated_df.to_dict(orient="records")


@legacy_router.post("/process-json-stream")
async def process_file_json_stream(file: UploadFile = File(...)):
    df = await load_dataframe(file)
    return {
        "columns": df.columns.tolist(),
        "data": df.values.tolist(),
    }


class CalculateRequest(BaseModel):
    columns: List[str]
    data: List[List[Any]]
    column: str
    operation: str
    value: Optional[float] = None
    source_column: Optional[str] = None
    result_column: Optional[str] = None


@legacy_router.post("/calculate")
async def calculate(req: CalculateRequest):
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


@legacy_router.post("/formula")
async def formula(req: FormulaRequest):
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


@legacy_router.post("/transform")
async def transform(req: TransformRequest):
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


# ─── Mount Routers ───────────────────────────────────────────
app.include_router(legacy_router)
app.include_router(ai_router)
