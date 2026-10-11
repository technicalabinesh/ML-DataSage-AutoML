import pandas as pd
import numpy as np
from typing import Dict, Any, Tuple
from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler, LabelEncoder

def auto_clean_dataset(
    df: pd.DataFrame,
    missing_num_strategy: str = "median",      # "median", "mean", "zero", "drop"
    missing_cat_strategy: str = "mode",        # "mode", "missing", "drop"
    remove_duplicates: bool = True,
    outlier_strategy: str = "iqr_cap",         # "iqr_cap", "zscore_cap", "none"
    scaling_strategy: str = "standard",        # "standard", "minmax", "robust", "none"
    encoding_strategy: str = "auto"            # "auto", "onehot", "label", "none"
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    
    cleaned_df = df.copy()
    initial_rows, initial_cols = cleaned_df.shape
    report = {
        "initial_rows": initial_rows,
        "initial_cols": initial_cols,
        "duplicates_removed": 0,
        "missing_filled": 0,
        "rows_dropped": 0,
        "outliers_capped": 0,
        "encoded_columns": [],
        "scaled_columns": [],
        "transformations_applied": []
    }
    
    # 1. Remove Duplicates
    if remove_duplicates:
        dup_count = int(cleaned_df.duplicated().sum())
        if dup_count > 0:
            cleaned_df.drop_duplicates(inplace=True)
            report["duplicates_removed"] = dup_count
            report["transformations_applied"].append(f"Removed {dup_count} duplicate rows.")

    # 2. Missing Values Imputation
    initial_missing_count = int(cleaned_df.isna().sum().sum())
    
    # Drop rows if strategy is drop and overall missing is low
    if (missing_num_strategy == "drop" or missing_cat_strategy == "drop"):
        cleaned_df.dropna(inplace=True)
        report["rows_dropped"] += initial_rows - len(cleaned_df)
        report["transformations_applied"].append(f"Dropped rows with missing values.")
    else:
        for col in cleaned_df.columns:
            if cleaned_df[col].isna().sum() > 0:
                if pd.api.types.is_numeric_dtype(cleaned_df[col]):
                    if missing_num_strategy == "median":
                        fill_val = cleaned_df[col].median()
                    elif missing_num_strategy == "mean":
                        fill_val = cleaned_df[col].mean()
                    else:
                        fill_val = 0
                    cleaned_df[col] = cleaned_df[col].fillna(fill_val)
                else:
                    if missing_cat_strategy == "mode":
                        mode_vals = cleaned_df[col].mode()
                        fill_val = mode_vals.iloc[0] if not mode_vals.empty else "Unknown"
                    else:
                        fill_val = "Missing"
                    cleaned_df[col] = cleaned_df[col].fillna(fill_val)

    report["missing_filled"] = initial_missing_count - int(cleaned_df.isna().sum().sum())
    if report["missing_filled"] > 0:
        report["transformations_applied"].append(f"Imputed missing values across numerical and categorical features.")

    # 3. Outlier Handling
    if outlier_strategy != "none":
        num_cols = cleaned_df.select_dtypes(include=[np.number]).columns
        capped_count = 0
        for col in num_cols:
            series = cleaned_df[col]
            if series.nunique() <= 5:  # skip discrete/binary columns
                continue
            if outlier_strategy == "iqr_cap":
                q25 = series.quantile(0.25)
                q75 = series.quantile(0.75)
                iqr = q75 - q25
                lower_b = q25 - 1.5 * iqr
                upper_b = q75 + 1.5 * iqr
                
                outliers_mask = (cleaned_df[col] < lower_b) | (cleaned_df[col] > upper_b)
                capped_count += int(outliers_mask.sum())
                cleaned_df[col] = np.clip(cleaned_df[col], lower_b, upper_b)
            elif outlier_strategy == "zscore_cap":
                mean_val = series.mean()
                std_val = series.std()
                if std_val > 0:
                    lower_b = mean_val - 3 * std_val
                    upper_b = mean_val + 3 * std_val
                    outliers_mask = (cleaned_df[col] < lower_b) | (cleaned_df[col] > upper_b)
                    capped_count += int(outliers_mask.sum())
                    cleaned_df[col] = np.clip(cleaned_df[col], lower_b, upper_b)
                    
        report["outliers_capped"] = capped_count
        if capped_count > 0:
            report["transformations_applied"].append(f"Capped {capped_count} outliers using {outlier_strategy.upper()} clipping.")

    report["final_rows"], report["final_cols"] = cleaned_df.shape
    return cleaned_df, report
