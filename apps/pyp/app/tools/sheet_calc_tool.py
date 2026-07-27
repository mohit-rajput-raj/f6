"""
Sheet Calculation Tool — Complex spreadsheet operations (sort, filter, pivot, etc.)
"""

import pandas as pd
from langchain_core.tools import tool
from typing import List, Any, Optional


@tool
def sort_data(
    columns: List[str],
    data: List[List[Any]],
    sort_by: str,
    ascending: bool = True,
) -> dict:
    """Sort spreadsheet data by a column."""
    try:
        df = pd.DataFrame(data, columns=columns)
        if sort_by not in df.columns:
            return {"error": f"Column '{sort_by}' not found"}
        df = df.sort_values(by=sort_by, ascending=ascending).reset_index(drop=True)
        return {"columns": df.columns.tolist(), "data": df.values.tolist()}
    except Exception as e:
        return {"error": str(e)}


@tool
def filter_data(
    columns: List[str],
    data: List[List[Any]],
    column: str,
    operator: str,
    value: Any,
) -> dict:
    """
    Filter rows by condition. Operators: eq, ne, gt, lt, gte, lte, contains.
    """
    try:
        df = pd.DataFrame(data, columns=columns)
        if column not in df.columns:
            return {"error": f"Column '{column}' not found"}

        col = df[column]
        ops = {
            "eq": lambda: col == value,
            "ne": lambda: col != value,
            "gt": lambda: pd.to_numeric(col, errors="coerce") > float(value),
            "lt": lambda: pd.to_numeric(col, errors="coerce") < float(value),
            "gte": lambda: pd.to_numeric(col, errors="coerce") >= float(value),
            "lte": lambda: pd.to_numeric(col, errors="coerce") <= float(value),
            "contains": lambda: col.astype(str).str.contains(str(value), case=False, na=False),
        }

        if operator not in ops:
            return {"error": f"Unknown operator: {operator}"}

        mask = ops[operator]()
        filtered = df[mask].reset_index(drop=True)
        return {"columns": filtered.columns.tolist(), "data": filtered.values.tolist()}
    except Exception as e:
        return {"error": str(e)}


@tool
def pivot_table(
    columns: List[str],
    data: List[List[Any]],
    index_col: str,
    value_col: str,
    agg_func: str = "sum",
) -> dict:
    """Create a pivot table from spreadsheet data."""
    try:
        df = pd.DataFrame(data, columns=columns)
        for c in [index_col, value_col]:
            if c not in df.columns:
                return {"error": f"Column '{c}' not found"}

        df[value_col] = pd.to_numeric(df[value_col], errors="coerce")
        pivot = df.pivot_table(index=index_col, values=value_col, aggfunc=agg_func)
        pivot = pivot.reset_index()
        return {"columns": pivot.columns.tolist(), "data": pivot.values.tolist()}
    except Exception as e:
        return {"error": str(e)}


@tool
def add_computed_column(
    columns: List[str],
    data: List[List[Any]],
    new_column: str,
    expression: str,
) -> dict:
    """
    Add a computed column using a pandas eval expression.
    Example expression: "col_a + col_b * 2"
    """
    try:
        df = pd.DataFrame(data, columns=columns)
        df[new_column] = df.eval(expression)
        return {"columns": df.columns.tolist(), "data": df.values.tolist()}
    except Exception as e:
        return {"error": str(e)}


@tool
def fill_missing_values(
    columns: List[str],
    data: List[List[Any]],
    column: str,
    strategy: str = "mean",
    fill_value: Optional[Any] = None,
) -> dict:
    """
    Fill missing/NaN values. Strategies: mean, median, mode, forward, backward, value.
    """
    try:
        df = pd.DataFrame(data, columns=columns)
        if column not in df.columns:
            return {"error": f"Column '{column}' not found"}

        col = pd.to_numeric(df[column], errors="coerce")

        if strategy == "mean":
            df[column] = col.fillna(col.mean())
        elif strategy == "median":
            df[column] = col.fillna(col.median())
        elif strategy == "mode":
            mode_val = col.mode()
            df[column] = col.fillna(mode_val[0] if len(mode_val) > 0 else 0)
        elif strategy == "forward":
            df[column] = df[column].ffill()
        elif strategy == "backward":
            df[column] = df[column].bfill()
        elif strategy == "value" and fill_value is not None:
            df[column] = df[column].fillna(fill_value)
        else:
            return {"error": f"Unknown strategy: {strategy}"}

        return {"columns": df.columns.tolist(), "data": df.values.tolist()}
    except Exception as e:
        return {"error": str(e)}
