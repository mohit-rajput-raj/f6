"""
Column Matcher Tool — Fuzzy matching and mapping between source and target column schemas.
"""

from difflib import SequenceMatcher
from langchain_core.tools import tool
from typing import List


@tool
def match_columns(
    source_columns: List[str],
    target_columns: List[str],
    threshold: float = 0.6,
) -> dict:
    """
    Fuzzy match source columns to target columns using string similarity.
    Returns a mapping of { source_col: best_matching_target_col }.
    """
    mapping = {}
    unmatched = []

    for src in source_columns:
        best_match = None
        best_score = 0.0

        for tgt in target_columns:
            score = SequenceMatcher(None, src.lower().strip(), tgt.lower().strip()).ratio()
            if score > best_score:
                best_score = score
                best_match = tgt

        if best_score >= threshold and best_match:
            mapping[src] = {"target": best_match, "confidence": round(best_score, 3)}
        else:
            unmatched.append(src)

    return {
        "mapping": mapping,
        "unmatched_sources": unmatched,
        "match_count": len(mapping),
        "total_sources": len(source_columns),
    }


@tool
def remap_data(
    columns: List[str],
    data: list,
    column_mapping: dict,
) -> dict:
    """
    Remap column names in a dataset using a column mapping.
    column_mapping: { "old_name": "new_name", ... }
    Returns remapped { columns, data }.
    """
    try:
        new_columns = [column_mapping.get(col, col) for col in columns]
        return {"columns": new_columns, "data": data}
    except Exception as e:
        return {"error": f"Remapping failed: {str(e)}"}
