import pandas as pd
import numpy as np
from typing import Dict, Any, List

def analyze_dataset(df: pd.DataFrame) -> Dict[str, Any]:
    total_rows, total_cols = df.shape
    if total_rows == 0:
        return {"error": "Dataset is empty"}
        
    duplicate_rows = int(df.duplicated().sum())
    duplicate_pct = round((duplicate_rows / total_rows) * 100, 2)
    
    total_cells = total_rows * total_cols
    total_missing = int(df.isna().sum().sum())
    overall_missing_pct = round((total_missing / total_cells) * 100, 2) if total_cells > 0 else 0.0
    
    columns_info = []
    numeric_cols = []
    categorical_cols = []

    outlier_count_total = 0

    for col in df.columns:
        series = df[col]
        missing_count = int(series.isna().sum())
        missing_pct = round((missing_count / total_rows) * 100, 2)
        unique_count = int(series.nunique(dropna=True))
        sample_vals = series.dropna().head(5).tolist()
        
        # Datatype detection
        if pd.api.types.is_numeric_dtype(series):
            dtype_label = "numerical"
            numeric_cols.append(col)
            
            # Summary stats
            s_clean = series.dropna()
            if len(s_clean) > 0:
                col_min = float(s_clean.min())
                col_max = float(s_clean.max())
                col_mean = float(s_clean.mean())
                col_median = float(s_clean.median())
                col_std = float(s_clean.std()) if len(s_clean) > 1 else 0.0
                col_skew = float(s_clean.skew()) if len(s_clean) > 2 else 0.0
                
                # Outliers via IQR
                q25 = float(s_clean.quantile(0.25))
                q75 = float(s_clean.quantile(0.75))
                iqr = q75 - q25
                lower_bound = q25 - 1.5 * iqr
                upper_bound = q75 + 1.5 * iqr
                outliers = int(((s_clean < lower_bound) | (s_clean > upper_bound)).sum())
                outlier_count_total += outliers
            else:
                col_min = col_max = col_mean = col_median = col_std = col_skew = 0.0
                outliers = 0

            # Histogram bins for distribution preview
            hist_counts = []
            hist_bins = []
            if len(s_clean) > 0:
                counts, bin_edges = np.histogram(s_clean, bins=min(10, max(3, unique_count)))
                hist_counts = [int(c) for c in counts]
                hist_bins = [round(float(b), 2) for b in bin_edges]

            col_detail = {
                "name": col,
                "type": dtype_label,
                "raw_dtype": str(series.dtype),
                "missing_count": missing_count,
                "missing_pct": missing_pct,
                "unique_count": unique_count,
                "sample_values": sample_vals,
                "outliers_count": outliers,
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
                "raw_dtype": str(series.dtype),
                "missing_count": missing_count,
                "missing_pct": missing_pct,
                "unique_count": unique_count,
                "sample_values": [str(v) for v in sample_vals],
                "outliers_count": 0,
                "stats": {
                    "top_category": top_val,
                    "top_frequency": top_freq,
                    "value_counts": val_counts_formatted
                }
            }
        
        columns_info.append(col_detail)

    # Calculate Data Health Score (0 - 100%)
    # Deductions: missing % (up to 30), duplicate % (up to 20), outlier % (up to 20)
    outlier_pct = round((outlier_count_total / max(1, total_rows * max(1, len(numeric_cols)))) * 100, 2)
    
    missing_penalty = min(35.0, overall_missing_pct * 1.5)
    dup_penalty = min(25.0, duplicate_pct * 2.0)
    outlier_penalty = min(20.0, outlier_pct * 1.0)
    
    health_score = max(0, min(100, round(100 - missing_penalty - dup_penalty - outlier_penalty, 1)))

    # Correlation Matrix calculation for numeric columns
    corr_matrix = {}
    if len(numeric_cols) >= 2:
        df_num = df[numeric_cols].dropna()
        if len(df_num) > 1:
            corr_df = df_num.corr().fillna(0).round(3)
            corr_matrix = {
                "columns": numeric_cols,
                "values": corr_df.to_dict()
            }

    # Head 10 rows preview
    df_head = df.head(10).fillna("NaN").to_dict(orient="records")

    return {
        "total_rows": total_rows,
        "total_cols": total_cols,
        "duplicate_rows": duplicate_rows,
        "duplicate_pct": duplicate_pct,
        "total_missing": total_missing,
        "overall_missing_pct": overall_missing_pct,
        "health_score": health_score,
        "numeric_cols_count": len(numeric_cols),
        "categorical_cols_count": len(categorical_cols),
        "columns": columns_info,
        "correlation_matrix": corr_matrix,
        "head_preview": df_head
    }
