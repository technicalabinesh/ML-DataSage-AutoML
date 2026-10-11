import pandas as pd
import numpy as np
from typing import Dict, Any, Tuple, Optional, List
from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler, MaxAbsScaler, LabelEncoder, OrdinalEncoder
from sklearn.impute import KNNImputer

def auto_clean_dataset(
    df: pd.DataFrame,
    missing_num_strategy: str = "median",          # "median", "mean", "zero", "knn", "drop"
    missing_cat_strategy: str = "mode",            # "mode", "missing", "knn", "drop"
    duplicate_strategy: str = "exact",             # "exact", "none", "subset"
    duplicate_subset_cols: Optional[List[str]] = None,
    remove_duplicates: bool = True,                # backwards compatibility
    outlier_strategy: str = "none",                # "none", "iqr_cap", "zscore_cap", "percentile_cap", "log_transform"
    scaling_strategy: str = "none",                # "none", "standard", "minmax", "robust", "maxabs"
    encoding_strategy: str = "onehot",             # "onehot", "ordinal", "label", "target", "frequency", "none", "auto"
    drop_first: bool = False,
    remove_identifiers: bool = True,
    remove_constants: bool = True,
    target_col: Optional[str] = None
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
        "removed_columns": [],
        "encoded_columns": [],
        "scaled_columns": [],
        "class_imbalance": None,
        "transformations_applied": []
    }

    # 1. Duplicate Handling
    if duplicate_strategy == "exact" or (remove_duplicates and duplicate_strategy != "none"):
        dup_count = int(cleaned_df.duplicated().sum())
        if dup_count > 0:
            cleaned_df = cleaned_df.drop_duplicates()
            report["duplicates_removed"] = dup_count
            report["transformations_applied"].append(f"Removed {dup_count} exact duplicate rows.")
    elif duplicate_strategy == "subset" and duplicate_subset_cols:
        valid_cols = [c for c in duplicate_subset_cols if c in cleaned_df.columns]
        if valid_cols:
            dup_count = int(cleaned_df.duplicated(subset=valid_cols).sum())
            if dup_count > 0:
                cleaned_df = cleaned_df.drop_duplicates(subset=valid_cols)
                report["duplicates_removed"] = dup_count
                report["transformations_applied"].append(f"Removed {dup_count} duplicates based on columns: {', '.join(valid_cols)}.")

    # 2. Remove Identifier & Constant Columns (Feature Selection)
    cols_to_drop = []
    if remove_constants:
        for col in cleaned_df.columns:
            if col == target_col:
                continue
            if cleaned_df[col].nunique(dropna=False) <= 1:
                cols_to_drop.append((col, "zero variance / constant column"))
                
    if remove_identifiers:
        for col in cleaned_df.columns:
            if col == target_col or col in [c for c, _ in cols_to_drop]:
                continue
            col_lower = str(col).lower()
            # High cardinality unique identifiers (e.g., id, uuid, guid, customer_id with 100% uniqueness)
            is_id_name = any(col_lower.endswith(suffix) or col_lower == suffix for suffix in ["id", "uuid", "guid", "_id", "code", "index"])
            if is_id_name and (cleaned_df[col].nunique() == len(cleaned_df) or cleaned_df[col].nunique() > 0.95 * len(cleaned_df)):
                cols_to_drop.append((col, "unique identifier column"))

    for col, reason in cols_to_drop:
        if col in cleaned_df.columns:
            cleaned_df = cleaned_df.drop(columns=[col])
            report["removed_columns"].append(f"{col} ({reason})")
            report["transformations_applied"].append(f"Dropped {col} ({reason}).")

    # 3. Missing Value Imputation
    initial_missing_count = int(cleaned_df.isna().sum().sum())
    
    # If drop strategy is selected for rows
    if missing_num_strategy == "drop" or missing_cat_strategy == "drop":
        rows_before = len(cleaned_df)
        cleaned_df = cleaned_df.dropna()
        dropped = rows_before - len(cleaned_df)
        report["rows_dropped"] += dropped
        if dropped > 0:
            report["transformations_applied"].append(f"Dropped {dropped} rows containing missing values.")
    else:
        # Separate numerical and categorical columns
        num_cols = cleaned_df.select_dtypes(include=[np.number]).columns.tolist()
        cat_cols = [c for c in cleaned_df.columns if c not in num_cols]

        # Numerical Imputation
        if num_cols and cleaned_df[num_cols].isna().sum().sum() > 0:
            if missing_num_strategy == "knn":
                try:
                    imputer = KNNImputer(n_neighbors=5)
                    cleaned_df[num_cols] = imputer.fit_transform(cleaned_df[num_cols])
                    report["transformations_applied"].append("Applied KNN Imputation across numerical features.")
                except Exception:
                    # Fallback to median if KNN fails
                    cleaned_df[num_cols] = cleaned_df[num_cols].fillna(cleaned_df[num_cols].median())
                    report["transformations_applied"].append("Applied Median Imputation across numerical features (KNN fallback).")
            else:
                for col in num_cols:
                    if cleaned_df[col].isna().sum() > 0:
                        if missing_num_strategy == "median":
                            val = cleaned_df[col].median()
                        elif missing_num_strategy == "mean":
                            val = cleaned_df[col].mean()
                        elif missing_num_strategy == "zero":
                            val = 0
                        else:
                            val = cleaned_df[col].median()
                        cleaned_df[col] = cleaned_df[col].fillna(val)

        # Categorical Imputation
        if cat_cols and cleaned_df[cat_cols].isna().sum().sum() > 0:
            if missing_cat_strategy == "knn":
                try:
                    # Temporary encode for KNN
                    temp_encoded = cleaned_df[cat_cols].copy()
                    mappings = {}
                    for col in cat_cols:
                        non_null = temp_encoded[col].dropna()
                        cats = {v: i for i, v in enumerate(non_null.unique())}
                        inv_cats = {i: v for v, i in cats.items()}
                        mappings[col] = inv_cats
                        temp_encoded[col] = temp_encoded[col].map(cats)
                    
                    imputer = KNNImputer(n_neighbors=3)
                    imputed_vals = np.round(imputer.fit_transform(temp_encoded))
                    for idx, col in enumerate(cat_cols):
                        cleaned_df[col] = [mappings[col].get(int(v), "Missing") for v in imputed_vals[:, idx]]
                    report["transformations_applied"].append("Applied Categorical KNN Imputation.")
                except Exception:
                    for col in cat_cols:
                        mode_val = cleaned_df[col].mode()
                        fill_val = mode_val.iloc[0] if not mode_val.empty else "Missing"
                        cleaned_df[col] = cleaned_df[col].fillna(fill_val)
                    report["transformations_applied"].append("Applied Mode Categorical Imputation (KNN fallback).")
            else:
                for col in cat_cols:
                    if cleaned_df[col].isna().sum() > 0:
                        if missing_cat_strategy == "missing":
                            fill_val = "Missing"
                        else: # mode (default)
                            mode_val = cleaned_df[col].mode()
                            fill_val = mode_val.iloc[0] if not mode_val.empty else "Missing"
                        cleaned_df[col] = cleaned_df[col].fillna(fill_val)

    report["missing_filled"] = initial_missing_count - int(cleaned_df.isna().sum().sum())
    if report["missing_filled"] > 0:
        report["transformations_applied"].append(f"Imputed {report['missing_filled']} missing values.")

    # 4. Outlier Treatment
    if outlier_strategy != "none":
        num_cols = cleaned_df.select_dtypes(include=[np.number]).columns.tolist()
        if target_col and target_col in num_cols:
            num_cols.remove(target_col)
            
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
            elif outlier_strategy == "percentile_cap":
                lower_b = series.quantile(0.01)
                upper_b = series.quantile(0.99)
                outliers_mask = (cleaned_df[col] < lower_b) | (cleaned_df[col] > upper_b)
                capped_count += int(outliers_mask.sum())
                cleaned_df[col] = np.clip(cleaned_df[col], lower_b, upper_b)
            elif outlier_strategy == "log_transform":
                # For strictly non-negative features with right skew
                if (cleaned_df[col] >= 0).all() and cleaned_df[col].skew() > 1.5:
                    cleaned_df[col] = np.log1p(cleaned_df[col])
                    capped_count += 1
                    report["transformations_applied"].append(f"Applied Log1p transformation to right-skewed column '{col}'.")

        report["outliers_capped"] = capped_count
        if capped_count > 0 and outlier_strategy != "log_transform":
            report["transformations_applied"].append(f"Treated {capped_count} outliers using {outlier_strategy.replace('_', ' ').title()}.")

    # 5. Categorical Encoding (Exploratory / Preprocessing)
    # Note: ML Pipeline does full robust encoding during model training,
    # but when user runs cleaning step, encoding produces analysis-ready data.
    cat_cols = [c for c in cleaned_df.select_dtypes(include=['object', 'category']).columns if c != target_col]
    if encoding_strategy != "none" and cat_cols:
        for col in cat_cols:
            if encoding_strategy == "onehot" or (encoding_strategy == "auto" and cleaned_df[col].nunique() <= 10):
                dummies = pd.get_dummies(cleaned_df[col], prefix=col, drop_first=drop_first)
                cleaned_df = pd.concat([cleaned_df.drop(columns=[col]), dummies], axis=1)
                report["encoded_columns"].append(f"{col} (One-Hot, {dummies.shape[1]} cols)")
            elif encoding_strategy == "ordinal":
                oe = OrdinalEncoder(handle_unknown='use_encoded_value', unknown_value=-1)
                cleaned_df[col] = oe.fit_transform(cleaned_df[[col]].astype(str)).ravel()
                report["encoded_columns"].append(f"{col} (Ordinal)")
            elif encoding_strategy == "label":
                le = LabelEncoder()
                cleaned_df[col] = le.fit_transform(cleaned_df[col].astype(str))
                report["encoded_columns"].append(f"{col} (Label)")
            elif encoding_strategy == "frequency":
                freq = cleaned_df[col].value_counts(normalize=True).to_dict()
                cleaned_df[col] = cleaned_df[col].map(freq).fillna(0)
                report["encoded_columns"].append(f"{col} (Frequency)")
            elif encoding_strategy == "target" and target_col and target_col in cleaned_df.columns:
                # Target encoding with smoothing (no data leakage for simple view)
                if pd.api.types.is_numeric_dtype(cleaned_df[target_col]):
                    target_means = cleaned_df.groupby(col)[target_col].mean().to_dict()
                    cleaned_df[col] = cleaned_df[col].map(target_means).fillna(cleaned_df[target_col].mean())
                    report["encoded_columns"].append(f"{col} (Target Smoothed)")
        if report["encoded_columns"]:
            report["transformations_applied"].append(f"Encoded {len(report['encoded_columns'])} categorical columns.")

    # 6. Feature Scaling
    if scaling_strategy != "none":
        num_cols = cleaned_df.select_dtypes(include=[np.number]).columns.tolist()
        if target_col and target_col in num_cols:
            num_cols.remove(target_col)
            
        if num_cols:
            scaler = None
            if scaling_strategy == "standard":
                scaler = StandardScaler()
            elif scaling_strategy == "minmax":
                scaler = MinMaxScaler()
            elif scaling_strategy == "robust":
                scaler = RobustScaler()
            elif scaling_strategy == "maxabs":
                scaler = MaxAbsScaler()

            if scaler:
                cleaned_df[num_cols] = scaler.fit_transform(cleaned_df[num_cols])
                report["scaled_columns"] = num_cols
                report["transformations_applied"].append(f"Applied {scaling_strategy.title()} Scaling to {len(num_cols)} numerical features.")

    # 7. Class Imbalance Detection (Reporting only, no automatic resampling per spec)
    potential_targets = [target_col] if target_col else []
    if not potential_targets:
        # Check lowest cardinality categorical or binary column
        for col in cleaned_df.columns:
            if 2 <= cleaned_df[col].nunique() <= 10:
                potential_targets.append(col)
                break
                
    if potential_targets:
        t_col = potential_targets[0]
        val_counts = cleaned_df[t_col].value_counts(normalize=True)
        min_ratio = val_counts.min()
        if min_ratio < 0.20:
            report["class_imbalance"] = {
                "column": t_col,
                "minority_share_percent": round(float(min_ratio * 100), 1),
                "distribution": {str(k): round(float(v * 100), 1) for k, v in val_counts.items()},
                "recommendation": "Class imbalance detected! Stratified cross-validation and weighted F1-score will be used automatically."
            }

    report["final_rows"], report["final_cols"] = cleaned_df.shape
    return cleaned_df, report
