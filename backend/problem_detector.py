import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional

def detect_problem(df: pd.DataFrame, target_col: Optional[str] = None) -> Dict[str, Any]:
    cols = list(df.columns)
    if not cols:
        return {"error": "Empty dataset"}
        
    # Auto candidate detection if target_col is not provided
    target_candidates = []
    
    # Check column names with common target keywords
    keywords = ["target", "label", "class", "churn", "price", "salary", "outcome", "survived", "status", "sales", "rating", "score"]
    for col in cols:
        col_lower = str(col).lower()
        if any(kw in col_lower for kw in keywords):
            target_candidates.append(col)
            
    # Add last column if not already added
    if cols[-1] not in target_candidates:
        target_candidates.append(cols[-1])
        
    # Select best candidate
    suggested_target = target_col if (target_col and target_col in cols) else target_candidates[0]
    
    if suggested_target is None or suggested_target == "None":
        problem_type = "clustering"
        reasoning = "No target column specified. Task categorized as Unsupervised Clustering/Segmentation."
        classes = []
        target_stats = {}
    else:
        series = df[suggested_target].dropna()
        n_unique = series.nunique()
        
        if pd.api.types.is_numeric_dtype(series) and n_unique > 15:
            problem_type = "regression"
            reasoning = f"Target '{suggested_target}' is continuous numerical with {n_unique} unique values."
            classes = []
            target_stats = {
                "min": round(float(series.min()), 4),
                "max": round(float(series.max()), 4),
                "mean": round(float(series.mean()), 4),
                "std": round(float(series.std()), 4)
            }
        else:
            if n_unique <= 2:
                problem_type = "classification"
                sub_type = "binary"
                reasoning = f"Target '{suggested_target}' has binary outcomes ({n_unique} unique values)."
            else:
                problem_type = "classification"
                sub_type = "multiclass"
                reasoning = f"Target '{suggested_target}' has categorical/discrete outcomes ({n_unique} unique values)."
            
            top_classes = series.value_counts().head(10).to_dict()
            classes = [str(k) for k in top_classes.keys()]
            target_stats = {str(k): int(v) for k, v in top_classes.items()}

    return {
        "suggested_target": suggested_target,
        "target_candidates": target_candidates,
        "problem_type": problem_type,
        "reasoning": reasoning,
        "classes": classes,
        "target_stats": target_stats
    }
