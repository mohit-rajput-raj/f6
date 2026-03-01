from fastapi import FastAPI, UploadFile, File
from fastapi.responses import StreamingResponse
import io
import pandas as pd

from utils import create_AttandanceFile

app = FastAPI()
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def read_root():
    return {"message": "Hello World"}



@app.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    content = await file.read()
    df = pd.read_csv(io.StringIO(content.decode('utf-8')))
    return {"filename": file.filename, "rows": len(df), "data": df.to_dict(orient="records")}


@app.post("/process-csv")
async def process_csv(file: UploadFile = File(...)):
    content = await file.read()
    df = pd.read_csv(io.StringIO(content.decode("utf-8")))

    updated_df = create_AttandanceFile(df)

    output = io.StringIO()
    updated_df.to_csv(output, index=False)
    output.seek(0)

    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=updated_{file.filename}"}
    )
from fastapi import UploadFile, File
import pandas as pd
import io

@app.post("/process-csv-json")
async def process_csv_json(file: UploadFile = File(...)):

    filename = file.filename.lower()
    content = await file.read()

    def load_data(file_bytes, file_ext):
        if file_ext == ".csv":
            return pd.read_csv(io.StringIO(file_bytes.decode("utf-8")))
        if file_ext == ".json":
            return pd.read_json(io.StringIO(file_bytes.decode("utf-8")))
        if file_ext in [".xlsx", ".xls"]:
            return pd.read_excel(io.BytesIO(file_bytes))
        raise ValueError("Unsupported file format")

    ext = file.filename.split(".")[-1].lower()
    df = load_data(content, f".{ext}")


    updated_df = create_AttandanceFile(df)
    return updated_df.to_dict(orient="records")

