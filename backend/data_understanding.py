import pandas as pd
import numpy as np
from typing import Dict, Any, List

def format_memory_size(bytes_val: int) -> str:
    if bytes_val < 1024:
        return f"{bytes_val} B"
    elif bytes_val < 1024 * 1024:
        return f"{round(bytes_val / 1024, 2)} KB"
    else:
        return f"{round(bytes_val / (1024 * 1024), 2)} MB"

def analyze_dataset(df: pd.DataFrame) -> Dict[str, Any]:
    total_rows, total_cols = df.shape
    if total_rows == 0:
        return {"error": "Dataset is empty", "total_rows": 0, "total_cols": 0}

    # Memory Usage Calculation
    try:
        memory_bytes = int(df.memory_usage(deep=True).sum())
    except Exception:
        memory_bytes = int(df.memory_usage().sum())
    memory_str = format_memory_size(memory_bytes)

    # Duplicates & Overall Missing
    duplicate_rows = int(df.duplicated().sum())
    duplicate_pct = round((duplicate_rows / total_rows) * 100, 2)
    
    total_cells = total_rows * total_cols
    total_missing = int(df.isna().sum().sum())
    overall_missing_pct = round((total_missing / total_cells) * 100, 2) if total_cells > 0 else 0.0

    columns_info = []
    numeric_cols = []
    categorical_cols = []
    boolean_cols = []
    datetime_cols = []
    id_cols = []
    constant_cols = []
    excessive_missing_cols = []
    issues_summary = []

    outlier_count_total = 0

    if duplicate_rows > 0:
        issues_summary.append({
            "type": "duplicate_rows",
            "severity": "medium" if duplicate_pct < 10 else "high",
            "message": f"{duplicate_rows} exact duplicate rows detected ({duplicate_pct}% of dataset)."
        })

    for col in df.columns:
        series = df[col]
        missing_count = int(series.isna().sum())
        missing_pct = round((missing_count / total_rows) * 100, 2)
        unique_count = int(series.nunique(dropna=True))
        s_clean = series.dropna()
        sample_vals = s_clean.head(5).tolist()

        is_constant = (unique_count <= 1)
        if is_constant and len(s_clean) > 0:
            constant_cols.append(col)
            issues_summary.append({
                "type": "constant_column",
                "column": col,
                "severity": "medium",
                "message": f"Column '{col}' is constant (zero variance with only 1 unique value)."
            })

        is_excessive_missing = (missing_pct >= 50.0)
        if is_excessive_missing:
            excessive_missing_cols.append(col)
            issues_summary.append({
                "type": "excessive_missing",
                "column": col,
                "severity": "high",
                "message": f"Column '{col}' has excessive missing values ({missing_pct}% missing)."
            })

        # Semantic Type Detection
        col_lower = str(col).lower()
        is_id_name = any(col_lower.endswith(s) or col_lower == s for s in ["id", "uuid", "guid", "_id", "code", "index"])
        is_id_like = is_id_name and (unique_count == total_rows or (unique_count > 0.95 * total_rows and total_rows > 10))

        is_bool = False
        if pd.api.types.is_bool_dtype(series):
            is_bool = True
        elif len(s_clean) > 0 and unique_count <= 2:
            unique_set = set(str(v).strip().lower() for v in s_clean.unique())
            if unique_set.issubset({"0", "1", "true", "false", "yes", "no", "t", "f"}):
                is_bool = True

        is_datetime = False
        if not pd.api.types.is_numeric_dtype(series) and not is_bool and len(s_clean) > 0:
            sample_strings = s_clean.astype(str).head(20)
            if all(len(s.strip()) >= 5 for s in sample_strings):
                try:
                    parsed = pd.to_datetime(sample_strings, errors='coerce')
                    if parsed.notna().sum() / len(sample_strings) >= 0.8:
                        is_datetime = True
                except Exception:
                    pass

        is_numeric = pd.api.types.is_numeric_dtype(series) and not is_bool

        is_text = False
        if not is_numeric and not is_bool and not is_datetime and len(s_clean) > 0:
            avg_len = float(s_clean.astype(str).map(len).mean())
            if avg_len > 40 and unique_count > 0.5 * total_rows:
                is_text = True

        # Inconsistent Category Check (e.g., 'Male' vs 'male' vs ' Male ')
        inconsistent_categories = []
        if not is_numeric and not is_datetime and len(s_clean) > 0 and unique_count < 100:
            raw_cats = [str(x) for x in s_clean.unique()]
            norm_map = {}
            for c_val in raw_cats:
                cleaned = c_val.strip().lower()
                norm_map.setdefault(cleaned, []).append(c_val)
            for norm_key, variants in norm_map.items():
                if len(variants) > 1:
                    inconsistent_categories.append(variants)
            if inconsistent_categories:
                issues_summary.append({
                    "type": "inconsistent_categories",
                    "column": col,
                    "severity": "low",
                    "message": f"Column '{col}' has inconsistent text casings/whitespace: {inconsistent_categories[:3]}"
                })

        # Infinite Values Check
        infinite_count = 0
        if is_numeric and len(s_clean) > 0:
            try:
                infinite_count = int(np.isinf(s_clean).sum())
                if infinite_count > 0:
                    issues_summary.append({
                        "type": "infinite_values",
                        "column": col,
                        "severity": "high",
                        "message": f"Column '{col}' contains {infinite_count} infinite values (inf/-inf)."
                    })
            except Exception:
                pass

        # Assign primary semantic type
        if is_bool:
            semantic_type = "boolean"
            boolean_cols.append(col)
        elif is_datetime:
            semantic_type = "datetime"
            datetime_cols.append(col)
        elif is_id_like:
            semantic_type = "id_like"
            id_cols.append(col)
        elif is_text:
            semantic_type = "text"
        elif is_numeric:
            semantic_type = "numerical"
        else:
            semantic_type = "categorical"

        if is_numeric:
            dtype_label = "numerical"
            numeric_cols.append(col)
            
            s_num = s_clean[~np.isinf(s_clean)] if infinite_count > 0 else s_clean
            if len(s_num) > 0:
                col_min = float(s_num.min())
                col_max = float(s_num.max())
                col_mean = float(s_num.mean())
                col_median = float(s_num.median())
                col_std = float(s_num.std()) if len(s_num) > 1 else 0.0
                col_skew = float(s_num.skew()) if len(s_num) > 2 else 0.0
                
                # Outliers via IQR
                if not is_id_like and not is_bool and unique_count > 2:
                    q25 = float(s_num.quantile(0.25))
                    q75 = float(s_num.quantile(0.75))
                    iqr = q75 - q25
                    lower_bound = q25 - 1.5 * iqr
                    upper_bound = q75 + 1.5 * iqr
                    outliers = int(((s_num < lower_bound) | (s_num > upper_bound)).sum())
                    outlier_count_total += outliers
                else:
                    outliers = 0
            else:
                col_min = col_max = col_mean = col_median = col_std = col_skew = 0.0
                outliers = 0

            hist_counts = []
            hist_bins = []
            if len(s_num) > 0:
                try:
                    counts, bin_edges = np.histogram(s_num, bins=min(10, max(3, unique_count)))
                    hist_counts = [int(c) for c in counts]
                    hist_bins = [round(float(b), 2) for b in bin_edges]
                except Exception:
                    pass

            col_detail = {
                "name": col,
                "type": dtype_label,
                "semantic_type": semantic_type,
                "raw_dtype": str(series.dtype),
                "missing_count": missing_count,
                "missing_pct": missing_pct,
                "unique_count": unique_count,
                "sample_values": sample_vals,
                "outliers_count": outliers,
                "infinite_count": infinite_count,
                "is_constant": is_constant,
                "is_excessive_missing": is_excessive_missing,
                "is_id_like": is_id_like,
                "stats": {
                    "min": round(col_min, 4),
                    "max": round(col_max, 4),
                    "mean": round(col_mean, 4),
                    "median": round(col_median, 4),
                    "std": round(col_std, 4),
                    "skewness": round(col_skew, 2)
                },
                "histogram": {
                    "counts": hist_counts,
                    "bins": hist_bins
                }
            }
        else:
            dtype_label = "categorical"
            categorical_cols.append(col)
            
            val_counts = series.value_counts(dropna=True).head(10).to_dict()
            val_counts_formatted = {str(k): int(v) for k, v in val_counts.items()}
            
            top_val = str(series.mode().iloc[0]) if not series.mode().empty else "N/A"
            top_freq = int(series.value_counts().iloc[0]) if not series.value_counts().empty else 0

            col_detail = {
                "name": col,
                "type": dtype_label,
                "semantic_type": semantic_type,
                "raw_dtype": str(series.dtype),
                "missing_count": missing_count,
                "missing_pct": missing_pct,
                "unique_count": unique_count,
                "sample_values": [str(v) for v in sample_vals],
                "outliers_count": 0,
                "infinite_count": 0,
                "is_constant": is_constant,
                "is_excessive_missing": is_excessive_missing,
                "is_id_like": is_id_like,
                "inconsistent_categories": inconsistent_categories,
                "stats": {
                    "top_category": top_val,
                    "top_frequency": top_freq,
                    "value_counts": val_counts_formatted
                }
            }
        
        columns_info.append(col_detail)

    # Health Score Calculation
    outlier_pct = round((outlier_count_total / max(1, total_rows * max(1, len(numeric_cols)))) * 100, 2)
    missing_penalty = min(35.0, overall_missing_pct * 1.5)
    dup_penalty = min(25.0, duplicate_pct * 2.0)
    outlier_penalty = min(20.0, outlier_pct * 1.0)
    constant_penalty = min(10.0, len(constant_cols) * 2.5)
    
    health_score = max(0, min(100, round(100 - missing_penalty - dup_penalty - outlier_penalty - constant_penalty, 1)))

    # Correlation Matrix
    corr_matrix = {}
    if len(numeric_cols) >= 2:
        df_num = df[numeric_cols].replace([np.inf, -np.inf], np.nan).dropna()
        if len(df_num) > 1:
            try:
                corr_df = df_num.corr().fillna(0).round(3)
                corr_matrix = {
                    "columns": numeric_cols,
                    "values": corr_df.to_dict()
                }
            except Exception:
                pass

    # Head 10 rows preview
    df_head = df.head(10).fillna("NaN").to_dict(orient="records")

    return {
        "total_rows": total_rows,
        "total_cols": total_cols,
        "memory_usage_bytes": memory_bytes,
        "memory_usage_str": memory_str,
        "duplicate_rows": duplicate_rows,
        "duplicate_pct": duplicate_pct,
        "total_missing": total_missing,
        "overall_missing_pct": overall_missing_pct,
        "health_score": health_score,
        "numeric_cols_count": len(numeric_cols),
        "categorical_cols_count": len(categorical_cols),
        "boolean_cols_count": len(boolean_cols),
        "datetime_cols_count": len(datetime_cols),
        "id_cols_count": len(id_cols),
        "constant_cols_count": len(constant_cols),
        "excessive_missing_cols_count": len(excessive_missing_cols),
        "issues_summary": issues_summary,
        "columns": columns_info,
        "correlation_matrix": corr_matrix,
        "head_preview": df_head
    }
