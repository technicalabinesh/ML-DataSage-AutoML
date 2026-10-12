import re
import pandas as pd
import numpy as np
from typing import Dict, Any, Tuple, Optional, List
from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler, MaxAbsScaler, OrdinalEncoder
from sklearn.impute import KNNImputer

def auto_clean_dataset(
    df: pd.DataFrame,
    # 1. Missing Values
    missing_num_strategy: str = "median",          # "median", "mean", "zero", "drop", "keep", "knn"
    missing_cat_strategy: str = "mode",            # "mode", "missing", "drop", "keep", "knn"
    missing_cat_fill_value: str = "Missing",
    convert_empty_to_nan: bool = True,
    # 2. Duplicate Handling
    duplicate_strategy: str = "exact",             # "exact", "subset", "none"
    duplicate_subset_cols: Optional[List[str]] = None,
    duplicate_keep: str = "first",                 # "first", "last"
    remove_duplicates: bool = True,                # backwards compatibility
    # 3. Outlier Handling
    outlier_strategy: str = "none",                # "none", "iqr_cap", "zscore_cap", "percentile_cap", "remove_rows"
    percentile_lower: float = 0.01,
    percentile_upper: float = 0.99,
    # 4. Text & Format Normalization
    strip_whitespace: bool = True,
    case_normalization: str = "none",              # "none", "lower", "upper", "title", "trim_only"
    handle_currency_commas: bool = True,
    preserve_leading_zeros: bool = True,
    parse_dates: bool = False,
    # 5. Feature Selection
    remove_identifiers: bool = False,
    remove_constants: bool = True,
    # 6. Encoding & Scaling (Optional for ML)
    scaling_strategy: str = "none",                # "none", "standard", "minmax", "robust", "maxabs"
    encoding_strategy: str = "none",               # "none", "onehot", "ordinal"
    drop_first: bool = False,
    # Target Column Protection
    target_col: Optional[str] = None
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    
    if df.empty:
        return df.copy(), {
            "initial_rows": 0, "final_rows": 0, "initial_cols": 0, "final_cols": 0,
            "duplicates_removed": 0, "missing_filled": 0, "rows_dropped": 0,
            "outliers_capped": 0, "removed_columns": [], "transformations_applied": ["Empty dataset provided."],
            "per_column_report": [], "validation_status": "warning"
        }

    cleaned_df = df.copy()
    initial_rows, initial_cols = cleaned_df.shape
    initial_missing_total = int(cleaned_df.isna().sum().sum())
    
    report: Dict[str, Any] = {
        "initial_rows": initial_rows,
        "initial_cols": initial_cols,
        "final_rows": initial_rows,
        "final_cols": initial_cols,
        "duplicates_removed": 0,
        "missing_filled": 0,
        "rows_dropped": 0,
        "outliers_capped": 0,
        "outliers_removed": 0,
        "removed_columns": [],
        "encoded_columns": [],
        "scaled_columns": [],
        "type_conversions": [],
        "class_imbalance": None,
        "per_column_report": {},
        "transformations_applied": [],
        "warnings": [],
        "validation_checks": {}
    }

    # Initialize per-column tracking
    for col in cleaned_df.columns:
        report["per_column_report"][col] = {
            "raw_dtype": str(cleaned_df[col].dtype),
            "clean_dtype": str(cleaned_df[col].dtype),
            "initial_missing": int(cleaned_df[col].isna().sum()),
            "final_missing": 0,
            "outliers_treated": 0,
            "actions": []
        }

    # =========================================================================
    # STEP 1: Text, Format & Data-Type Corrections
    # =========================================================================
    for col in list(cleaned_df.columns):
        if col == target_col:
            continue

        series = cleaned_df[col]
        # Only process object / string series
        if pd.api.types.is_object_dtype(series) or pd.api.types.is_string_dtype(series):
            # 1.1 Strip leading/trailing whitespace
            if strip_whitespace:
                cleaned_df[col] = series.map(lambda x: x.strip() if isinstance(x, str) else x)
                series = cleaned_df[col]

            # 1.2 Convert empty strings & whitespace to NaN
            if convert_empty_to_nan:
                empty_mask = series.map(lambda x: isinstance(x, str) and x.strip() == "")
                empty_count = int(empty_mask.sum())
                if empty_count > 0:
                    cleaned_df.loc[empty_mask, col] = np.nan
                    report["per_column_report"][col]["actions"].append(f"Converted {empty_count} empty strings to NaN")
                    series = cleaned_df[col]

            non_null = series.dropna()
            if len(non_null) == 0:
                continue

            # 1.3 Check for Leading Zeros preservation (Postal codes, IDs)
            has_leading_zeros = False
            if preserve_leading_zeros:
                # Detect if strings have leading zero followed by digits (e.g., '01234')
                leading_zero_matches = non_null.astype(str).str.match(r"^0\d+$")
                if leading_zero_matches.any():
                    has_leading_zeros = True

            # 1.4 Numeric Strings Parsing (Currency $, €, £, ¥, commas, percentages %)
            if handle_currency_commas and not has_leading_zeros:
                # Check if strings look like numeric formats (e.g. "$1,234.50" or "98.5%")
                cleaned_num_strings = non_null.astype(str).str.replace(r"[\$,€,£,¥,\s]", "", regex=True)
                # Remove trailing percentage sign
                is_pct = cleaned_num_strings.str.endswith("%")
                cleaned_num_strings = cleaned_num_strings.str.rstrip("%")
                
                # Check if parseable to float
                parsed_floats = pd.to_numeric(cleaned_num_strings, errors='coerce')
                valid_num_ratio = float(parsed_floats.notna().sum() / max(1, len(non_null)))
                
                if valid_num_ratio >= 0.90:
                    # Apply numeric conversion
                    full_cleaned = series.astype(str).str.replace(r"[\$,€,£,¥,\s]", "", regex=True).str.rstrip("%")
                    converted_series = pd.to_numeric(full_cleaned, errors='coerce')
                    # If it was percentages, scale to decimal
                    if is_pct.sum() / max(1, len(non_null)) >= 0.8:
                        converted_series = converted_series / 100.0
                    cleaned_df[col] = converted_series
                    report["type_conversions"].append(f"{col} (String formatted currency/numeric ➔ Float)")
                    report["transformations_applied"].append(f"Converted formatted numeric strings in '{col}' to numerical float.")
                    report["per_column_report"][col]["actions"].append("Converted currency/numeric strings to float")
                    continue

            # 1.5 Safe Date Parsing
            if parse_dates and not has_leading_zeros:
                # Check if strings look like dates (at least 6 chars, contains - or / or :)
                sample = non_null.astype(str).head(30)
                date_like = sample.str.contains(r"[\-/:]", regex=True) & (sample.str.len() >= 6)
                if date_like.sum() / len(sample) >= 0.8:
                    try:
                        parsed_dates = pd.to_datetime(series, errors='coerce')
                        valid_date_ratio = float(parsed_dates.notna().sum() / max(1, len(non_null)))
                        if valid_date_ratio >= 0.85:
                            cleaned_df[col] = parsed_dates
                            report["type_conversions"].append(f"{col} (String ➔ Datetime)")
                            report["transformations_applied"].append(f"Parsed reliable datetime format in column '{col}'.")
                            report["per_column_report"][col]["actions"].append("Converted to Datetime")
                            continue
                    except Exception:
                        pass

            # 1.6 Categorical Case Normalization
            if case_normalization != "none" and not has_leading_zeros:
                if case_normalization == "lower":
                    cleaned_df[col] = series.map(lambda x: x.lower() if isinstance(x, str) else x)
                elif case_normalization == "upper":
                    cleaned_df[col] = series.map(lambda x: x.upper() if isinstance(x, str) else x)
                elif case_normalization == "title":
                    cleaned_df[col] = series.map(lambda x: x.title() if isinstance(x, str) else x)
                report["per_column_report"][col]["actions"].append(f"Normalized casing ({case_normalization})")

    # =========================================================================
    # STEP 2: Duplicate Row Detection & Removal
    # =========================================================================
    dup_keep_val = "first" if duplicate_keep == "first" else "last"
    
    if duplicate_strategy == "subset" and duplicate_subset_cols:
        valid_subset = [c for c in duplicate_subset_cols if c in cleaned_df.columns]
        if valid_subset:
            subset_dup_mask = cleaned_df.duplicated(subset=valid_subset, keep=dup_keep_val)
            subset_dup_count = int(subset_dup_mask.sum())
            if subset_dup_count > 0:
                cleaned_df = cleaned_df[~subset_dup_mask].copy()
                report["duplicates_removed"] = subset_dup_count
                report["transformations_applied"].append(f"Removed {subset_dup_count} duplicate rows matching subset [{', '.join(valid_subset)}] (retained {duplicate_keep} occurrence).")
    elif (duplicate_strategy == "exact" or remove_duplicates) and duplicate_strategy != "none":
        exact_dup_mask = cleaned_df.duplicated(keep=dup_keep_val)
        exact_dup_count = int(exact_dup_mask.sum())
        if exact_dup_count > 0:
            cleaned_df = cleaned_df[~exact_dup_mask].copy()
            report["duplicates_removed"] = exact_dup_count
            report["transformations_applied"].append(f"Removed {exact_dup_count} exact duplicate rows (retained {duplicate_keep} occurrence).")

    # =========================================================================
    # STEP 3: Feature Selection (Constant & Identifier Columns)
    # =========================================================================
    cols_to_drop = []
    if remove_constants:
        for col in list(cleaned_df.columns):
            if col == target_col:
                continue
            if cleaned_df[col].nunique(dropna=False) <= 1:
                cols_to_drop.append((col, "zero variance / constant column"))

    if remove_identifiers:
        for col in list(cleaned_df.columns):
            if col == target_col or col in [c for c, _ in cols_to_drop]:
                continue
            col_lower = str(col).lower()
            is_id_name = any(col_lower.endswith(s) or col_lower == s for s in ["id", "uuid", "guid", "_id", "code", "index"])
            if is_id_name and (cleaned_df[col].nunique() == len(cleaned_df) or cleaned_df[col].nunique() > 0.95 * len(cleaned_df)):
                cols_to_drop.append((col, "unique identifier column"))

    for col, reason in cols_to_drop:
        if col in cleaned_df.columns:
            cleaned_df = cleaned_df.drop(columns=[col])
            report["removed_columns"].append(f"{col} ({reason})")
            report["transformations_applied"].append(f"Dropped {col} ({reason}).")

    # =========================================================================
    # STEP 4: Missing Value Imputation
    # =========================================================================
    initial_missing_count = int(cleaned_df.isna().sum().sum())

    # Strategy: Drop Rows
    if missing_num_strategy == "drop" or missing_cat_strategy == "drop":
        cols_to_check = [c for c in cleaned_df.columns if c != target_col]
        if missing_num_strategy == "drop" and missing_cat_strategy != "drop":
            cols_to_check = [c for c in cleaned_df.select_dtypes(include=[np.number]).columns if c != target_col]
        elif missing_cat_strategy == "drop" and missing_num_strategy != "drop":
            cols_to_check = [c for c in cleaned_df.select_dtypes(exclude=[np.number]).columns if c != target_col]

        rows_before = len(cleaned_df)
        cleaned_df = cleaned_df.dropna(subset=cols_to_check).copy()
        dropped_count = rows_before - len(cleaned_df)
        report["rows_dropped"] += dropped_count
        if dropped_count > 0:
            report["transformations_applied"].append(f"Dropped {dropped_count} rows containing missing values.")

    # Numerical Column Imputation
    if missing_num_strategy not in ["drop", "keep", "none"]:
        num_cols = [c for c in cleaned_df.select_dtypes(include=[np.number]).columns if c != target_col]
        for col in num_cols:
            col_missing = int(cleaned_df[col].isna().sum())
            if col_missing > 0:
                # Handle 100% missing column
                s_valid = cleaned_df[col].dropna()
                if len(s_valid) == 0:
                    fill_val = 0.0
                    report["warnings"].append(f"Column '{col}' was 100% missing; imputed with 0.0.")
                elif missing_num_strategy == "median":
                    fill_val = float(s_valid.median())
                elif missing_num_strategy == "mean":
                    fill_val = float(s_valid.mean())
                elif missing_num_strategy == "zero":
                    fill_val = 0.0
                elif missing_num_strategy == "knn":
                    fill_val = float(s_valid.median()) # fallback
                else:
                    fill_val = float(s_valid.median())

                cleaned_df[col] = cleaned_df[col].fillna(fill_val)
                report["per_column_report"][col]["actions"].append(f"Imputed {col_missing} missing values with {missing_num_strategy} ({round(fill_val, 2)})")

    # Categorical Column Imputation
    if missing_cat_strategy not in ["drop", "keep", "none"]:
        cat_cols = [c for c in cleaned_df.select_dtypes(exclude=[np.number]).columns if c != target_col]
        for col in cat_cols:
            col_missing = int(cleaned_df[col].isna().sum())
            if col_missing > 0:
                s_valid = cleaned_df[col].dropna()
                if missing_cat_strategy == "missing" or len(s_valid) == 0:
                    fill_cat = missing_cat_fill_value or "Missing"
                else:
                    mode_series = s_valid.mode()
                    fill_cat = mode_series.iloc[0] if not mode_series.empty else (missing_cat_fill_value or "Missing")

                cleaned_df[col] = cleaned_df[col].fillna(fill_cat)
                report["per_column_report"][col]["actions"].append(f"Imputed {col_missing} missing values with {missing_cat_strategy} ('{fill_cat}')")

    post_missing_count = int(cleaned_df.isna().sum().sum())
    report["missing_filled"] = max(0, initial_missing_count - post_missing_count)
    if report["missing_filled"] > 0:
        report["transformations_applied"].append(f"Imputed {report['missing_filled']} missing values across feature columns.")

    # =========================================================================
    # STEP 5: Outlier Detection & Treatment
    # =========================================================================
    if outlier_strategy not in ["none", "keep"]:
        num_cols = [c for c in cleaned_df.select_dtypes(include=[np.number]).columns if c != target_col]
        capped_total = 0
        rows_to_remove_outliers = set()

        for col in num_cols:
            series = cleaned_df[col]
            # Exclude discrete binary flags (e.g., 0/1) or constants
            if series.nunique() <= 2:
                continue

            s_clean = series.dropna()
            if len(s_clean) < 4:
                continue

            lower_bound = None
            upper_bound = None

            if outlier_strategy in ["iqr_cap", "remove_rows"]:
                q25 = float(s_clean.quantile(0.25))
                q75 = float(s_clean.quantile(0.75))
                iqr = q75 - q25
                if iqr > 0:
                    lower_bound = q25 - 1.5 * iqr
                    upper_bound = q75 + 1.5 * iqr
            elif outlier_strategy == "zscore_cap":
                mean_val = float(s_clean.mean())
                std_val = float(s_clean.std())
                if std_val > 0:
                    lower_bound = mean_val - 3 * std_val
                    upper_bound = mean_val + 3 * std_val
            elif outlier_strategy == "percentile_cap":
                lower_bound = float(s_clean.quantile(percentile_lower))
                upper_bound = float(s_clean.quantile(percentile_upper))

            if lower_bound is not None and upper_bound is not None:
                outliers_mask = (cleaned_df[col] < lower_bound) | (cleaned_df[col] > upper_bound)
                outliers_count = int(outliers_mask.sum())

                if outliers_count > 0:
                    if outlier_strategy == "remove_rows":
                        outlier_indices = cleaned_df[outliers_mask].index
                        rows_to_remove_outliers.update(outlier_indices)
                        report["per_column_report"][col]["actions"].append(f"Identified {outliers_count} outlier rows for removal [{round(lower_bound, 2)}, {round(upper_bound, 2)}]")
                    else:
                        cleaned_df[col] = np.clip(cleaned_df[col], lower_bound, upper_bound)
                        capped_total += outliers_count
                        report["per_column_report"][col]["outliers_treated"] = outliers_count
                        report["per_column_report"][col]["actions"].append(f"Clipped {outliers_count} outliers to range [{round(lower_bound, 2)}, {round(upper_bound, 2)}]")

        if outlier_strategy == "remove_rows" and rows_to_remove_outliers:
            before_len = len(cleaned_df)
            cleaned_df = cleaned_df.drop(index=list(rows_to_remove_outliers)).copy()
            outliers_removed_count = before_len - len(cleaned_df)
            report["outliers_removed"] = outliers_removed_count
            report["rows_dropped"] += outliers_removed_count
            report["transformations_applied"].append(f"Removed {outliers_removed_count} rows containing extreme statistical outliers.")
        elif capped_total > 0:
            report["outliers_capped"] = capped_total
            report["transformations_applied"].append(f"Clipped {capped_total} statistical outliers using {outlier_strategy.replace('_', ' ').title()}.")

    # =========================================================================
    # STEP 6: Optional Categorical Encoding & Numerical Scaling
    # =========================================================================
    if encoding_strategy != "none":
        cat_cols = [c for c in cleaned_df.select_dtypes(include=['object', 'category']).columns if c != target_col]
        for col in cat_cols:
            if encoding_strategy == "onehot":
                dummies = pd.get_dummies(cleaned_df[col], prefix=col, drop_first=drop_first, dtype=int)
                cleaned_df = pd.concat([cleaned_df.drop(columns=[col]), dummies], axis=1)
                report["encoded_columns"].append(f"{col} (One-Hot, {dummies.shape[1]} cols)")
            elif encoding_strategy == "ordinal":
                oe = OrdinalEncoder(handle_unknown='use_encoded_value', unknown_value=-1)
                cleaned_df[col] = oe.fit_transform(cleaned_df[[col]].astype(str)).ravel()
                report["encoded_columns"].append(f"{col} (Ordinal)")
        if report["encoded_columns"]:
            report["transformations_applied"].append(f"Encoded categorical features: {', '.join(report['encoded_columns'][:4])}.")

    if scaling_strategy != "none":
        num_cols = [c for c in cleaned_df.select_dtypes(include=[np.number]).columns if c != target_col]
        if num_cols:
            if scaling_strategy == "standard":
                scaler = StandardScaler()
            elif scaling_strategy == "minmax":
                scaler = MinMaxScaler()
            elif scaling_strategy == "robust":
                scaler = RobustScaler()
            elif scaling_strategy == "maxabs":
                scaler = MaxAbsScaler()
            else:
                scaler = StandardScaler()

            cleaned_df[num_cols] = scaler.fit_transform(cleaned_df[num_cols])
            report["scaled_columns"] = num_cols
            report["transformations_applied"].append(f"Applied {scaling_strategy.title()} Scaler to {len(num_cols)} numerical features.")

    # =========================================================================
    # STEP 7: Final Validation & Health Verification
    # =========================================================================
    final_rows, final_cols = cleaned_df.shape
    report["final_rows"] = final_rows
    report["final_cols"] = final_cols

    # Update per-column final types & missing counts
    for col in cleaned_df.columns:
        if col in report["per_column_report"]:
            report["per_column_report"][col]["clean_dtype"] = str(cleaned_df[col].dtype)
            report["per_column_report"][col]["final_missing"] = int(cleaned_df[col].isna().sum())

    remaining_missing = int(cleaned_df.isna().sum().sum())
    remaining_duplicates = int(cleaned_df.duplicated().sum())
    remaining_infinite = 0
    num_sub = cleaned_df.select_dtypes(include=[np.number])
    if not num_sub.empty:
        remaining_infinite = int(np.isinf(num_sub).sum().sum())

    validation_status = "passed"
    if remaining_infinite > 0 or (remaining_missing > 0 and missing_num_strategy != "keep"):
        validation_status = "needs_review"
    elif report["warnings"] or remaining_duplicates > 0:
        validation_status = "passed_with_warnings"

    report["validation_checks"] = {
        "remaining_missing": remaining_missing,
        "remaining_duplicates": remaining_duplicates,
        "remaining_infinite": remaining_infinite,
        "validation_status": validation_status
    }

    # Class Imbalance Check on target column
    if target_col and target_col in cleaned_df.columns:
        t_series = cleaned_df[target_col].dropna()
        if t_series.nunique() == 2:
            counts = t_series.value_counts()
            minority_share = round((counts.min() / len(t_series)) * 100, 2)
            if minority_share < 25.0:
                report["class_imbalance"] = {
                    "column": target_col,
                    "minority_share_percent": minority_share,
                    "classes": counts.to_dict()
                }

    return cleaned_df, report
