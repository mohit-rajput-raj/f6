"""
Formula Tool — Evaluates pandas formulas and expressions on spreadsheet data.
"""

import pandas as pd
from langchain_core.tools import tool
from typing import List, Any, Optional


@tool
def evaluate_formula(
    columns: List[str],
    data: List[List[Any]],
    formula: str,
    result_column: Optional[str] = None,
) -> dict:
    """
    Evaluate a pandas expression/formula on tabular data.
    Returns updated { columns, data } with the formula result appended.
    """
    try:
        df = pd.DataFrame(data, columns=columns)
        result_col = result_column or "Result"

        df[result_col] = df.eval(formula)

        return {
            "columns": df.columns.tolist(),
            "data": df.values.tolist(),
        }
    except Exception as e:
        return {"error": f"Formula evaluation failed: {str(e)}"}


@tool
def aggregate_column(
    columns: List[str],
    data: List[List[Any]],
    column: str,
    operation: str,
) -> dict:
    """
    Perform aggregation on a column: sum, mean, max, min, count, std.
    Returns the aggregation result.
    """
    try:
        df = pd.DataFrame(data, columns=columns)

        if column not in df.columns:
            return {"error": f"Column '{column}' not found"}

        col = pd.to_numeric(df[column], errors="coerce")

        ops = {
            "sum": col.sum,
            "mean": col.mean,
            "max": col.max,
            "min": col.min,
            "count": col.count,
            "std": col.std,
        }

        if operation not in ops:
            return {"error": f"Unknown operation: {operation}. Use: {list(ops.keys())}"}

        result = ops[operation]()
        return {"column": column, "operation": operation, "result": float(result)}
    except Exception as e:
        return {"error": f"Aggregation failed: {str(e)}"}
