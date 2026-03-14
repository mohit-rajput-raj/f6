from fastapi import FastAPI , UploadFile, File
from fastapi.responses import StreamingResponse
import io 
import pandas as pd 
app = FastAPI()
from fastapi.middleware.cors import CORSMiddleware 
app.add_middleware( CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"], )
from fastapi import APIRouter, UploadFile, File
from app.services.file_service import ( 
    load_dataframe,
    process_attendance,
    dataframe_to_csv_stream,
)

router = APIRouter()

@router.get("/health")
async def health():
    return {"status": "ok"}



@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    df = await load_dataframe(file)
    return {
        "filename": file.filename,
        "rows": len(df),
        "data": df.to_dict(orient="records")
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
    # updated_df = process_attendance(df)

    return {
        "columns": df.columns.tolist(),
        "data": df.values.tolist()
    }
app.include_router(router)
