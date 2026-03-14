import pandas as pd
import io
from fastapi import UploadFile, HTTPException
from fastapi.responses import StreamingResponse
from app.utils import create_AttandanceFile

async def load_dataframe(file: UploadFile) -> pd.DataFrame:
    content = await file.read()
    filename = file.filename.lower()

    ext = filename.split(".")[-1]

    try:
        if ext == "csv":
            return pd.read_csv(io.StringIO(content.decode("utf-8")))
        elif ext == "json":
            return pd.read_json(io.StringIO(content.decode("utf-8")))
        elif ext in ["xlsx", "xls"]:
            return pd.read_excel(io.BytesIO(content))
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


def process_attendance(df: pd.DataFrame) -> pd.DataFrame:
    return create_AttandanceFile(df)


def dataframe_to_csv_stream(df: pd.DataFrame, filename: str):
    output = io.StringIO()
    df.to_csv(output, index=False)
    output.seek(0)

    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=updated_{filename}"
        },
    )