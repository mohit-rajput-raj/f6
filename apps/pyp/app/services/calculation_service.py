import pandas as pd
import numpy as np
from typing import List, Any, Optional

def calculate_column_math(
    columns: List[str],
    data: List[List[Any]],
    column: str,
    operation: str,
    value: Optional[float] = None,
    source_column: Optional[str] = None,
    result_column: Optional[str] = None
) -> dict:
    """Column math: add/sub/mul/div with constant or another column."""
    df = pd.DataFrame(data, columns=columns)
    
    col = pd.to_numeric(df[column], errors='coerce').fillna(0)
    
    if source_column and source_column != "__none__":
        operand = pd.to_numeric(df[source_column], errors='coerce').fillna(0)
    else:
        operand = value or 0
    
    result_name = result_column or f"{column}_{operation}"
    
    if operation == "add":
        df[result_name] = col + operand
    elif operation == "subtract":
        df[result_name] = col - operand
    elif operation == "multiply":
        df[result_name] = col * operand
    elif operation == "divide":
        df[result_name] = col / operand.replace(0, np.nan) if isinstance(operand, pd.Series) else col / (operand if operand != 0 else np.nan)
        df[result_name] = df[result_name].fillna(0)
    
    return {
        "columns": df.columns.tolist(),
        "data": df.values.tolist()
    }


def evaluate_formula(
    columns: List[str],
    data: List[List[Any]],
    formula: str,
    result_column: Optional[str] = None
) -> dict:
    """Evaluate a formula expression using pandas eval."""
    df = pd.DataFrame(data, columns=columns)
    
    # Convert numeric columns
    for col in df.columns:
        df[col] = pd.to_numeric(df[col], errors='coerce').fillna(df[col])
    
    result_name = result_column or "formula_result"
    
    # Replace column names with backtick syntax for pandas eval
    safe_formula = formula
    for col in sorted(columns, key=len, reverse=True):
        safe_formula = safe_formula.replace(col, f"`{col}`")
    
    df[result_name] = df.eval(safe_formula)
    
    return {
        "columns": df.columns.tolist(),
        "data": df.values.tolist()
    }


def transform_data(
    columns: List[str],
    data: List[List[Any]],
    operation: str,
    config: dict
) -> dict:
    """General transform operations: sort, aggregate, etc."""
    df = pd.DataFrame(data, columns=columns)
    
    if operation == "sort":
        col = config.get("column")
        direction = config.get("direction", "asc")
        ascending = direction == "asc"
        df[col] = pd.to_numeric(df[col], errors='coerce').fillna(df[col])
        df = df.sort_values(by=col, ascending=ascending)
    
    elif operation == "aggregate":
        group_col = config.get("group_by_column")
        agg_col = config.get("aggregate_column")
        agg_op = config.get("operation", "sum")
        
        df[agg_col] = pd.to_numeric(df[agg_col], errors='coerce').fillna(0)
        
        agg_map = {
            "sum": "sum",
            "count": "count",
            "average": "mean",
            "min": "min",
            "max": "max"
        }
        
        result = df.groupby(group_col)[agg_col].agg(agg_map.get(agg_op, "sum")).reset_index()
        result.columns = [group_col, f"{agg_col}_{agg_op}"]
        
        return {
            "columns": result.columns.tolist(),
            "data": result.values.tolist()
        }
    
    return {
        "columns": df.columns.tolist(),
        "data": df.values.tolist()
    }
