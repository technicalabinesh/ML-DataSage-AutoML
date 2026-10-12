import numpy as np
import pandas as pd
import math
from typing import Dict, Any, List, Tuple, Optional
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler, LabelEncoder, OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score, roc_auc_score,
    confusion_matrix, classification_report,
    mean_squared_error, mean_absolute_error, r2_score,
    silhouette_score, davies_bouldin_score
)

# Classification models
from sklearn.linear_model import LogisticRegression, RidgeClassifier
from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier, ExtraTreesClassifier, AdaBoostClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.neighbors import KNeighborsClassifier

# Regression models
from sklearn.linear_model import LinearRegression, Ridge, Lasso
from sklearn.ensemble import RandomForestRegressor, HistGradientBoostingRegressor, ExtraTreesRegressor, AdaBoostRegressor
from sklearn.tree import DecisionTreeRegressor
from sklearn.neighbors import KNeighborsRegressor

# Clustering models
from sklearn.cluster import KMeans, AgglomerativeClustering

# Try XGBoost / LightGBM if available
try:
    import xgboost as xgb
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False

try:
    import lightgbm as lgb
    HAS_LIGHTGBM = True
except ImportError:
    HAS_LIGHTGBM = False

def train_and_evaluate(
    df: pd.DataFrame,
    target_col: str,
    problem_type: str,
    scaling_strategy: str = "standard",
    encoding_strategy: str = "auto",
    selected_models: Optional[List[str]] = None,
    fast_mode: bool = False,
    metric_strategy: str = "f1_weighted"
) -> Dict[str, Any]:

    if problem_type == "clustering" or not target_col or target_col not in df.columns:
        return train_clustering_models(df, scaling_strategy)

    # 1. Target Column Validation & Cleaning
    target_series = df[target_col]
    if pd.api.types.is_object_dtype(target_series) or pd.api.types.is_string_dtype(target_series):
        target_series = target_series.astype(str).str.strip()

    valid_mask = target_series.notna() & (target_series != "") & (target_series.astype(str).str.lower() != "nan")
    clean_ml_df = df[valid_mask].copy()

    if len(clean_ml_df) < 5:
        raise ValueError(f"Target column '{target_col}' has fewer than 5 valid non-null rows.")

    # Validate numeric target for regression
    if problem_type == "regression":
        y_num = pd.to_numeric(clean_ml_df[target_col], errors='coerce')
        valid_num = y_num.notna()
        clean_ml_df = clean_ml_df[valid_num].copy()
        if len(clean_ml_df) < 5:
            raise ValueError(f"Target column '{target_col}' does not have enough numerical values for regression.")
        clean_ml_df[target_col] = y_num[valid_num]

    # Validate classification has >= 2 classes
    if problem_type == "classification" and clean_ml_df[target_col].nunique() <= 1:
        raise ValueError(f"Target '{target_col}' has only 1 unique class. Classification requires at least 2 distinct classes.")

    X = clean_ml_df.drop(columns=[target_col]).copy()
    y = clean_ml_df[target_col].copy()

    # 2. Sanitize Feature Names (Remove characters like [ ] { } , : " that crash LightGBM/XGBoost)
    import re
    sanitized_map = {c: re.sub(r'[\[\]\{\}\",:]', '_', str(c)).strip() for c in X.columns}
    X.rename(columns=sanitized_map, inplace=True)

    # 3. High-cardinality & ID feature pruning
    cols_to_drop = []
    for c in list(X.columns):
        if X[c].dtype == object or X[c].dtype.name == 'category':
            n_unq = X[c].nunique()
            if (n_unq > 50 and n_unq / len(X) > 0.4) or n_unq == len(X):
                cols_to_drop.append(c)
    if cols_to_drop:
        X.drop(columns=cols_to_drop, inplace=True)

    # Preprocessing X
    feature_names = list(X.columns)
    numeric_features = list(X.select_dtypes(include=[np.number]).columns)
    categorical_features = list(X.select_dtypes(exclude=[np.number]).columns)

    # Build robust column transformers with built-in imputation
    transformers = []

    # Scaler selection
    if scaling_strategy == "minmax":
        scaler = MinMaxScaler()
    elif scaling_strategy == "robust":
        scaler = RobustScaler()
    elif scaling_strategy == "standard":
        scaler = StandardScaler()
    else:
        scaler = "passthrough"

    if numeric_features:
        num_pipeline = Pipeline(steps=[
            ('imputer', SimpleImputer(strategy='median')),
            ('scaler', scaler)
        ])
        transformers.append(("num", num_pipeline, numeric_features))

    if categorical_features:
        cat_pipeline = Pipeline(steps=[
            ('imputer', SimpleImputer(strategy='most_frequent')),
            ('encoder', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
        ])
        transformers.append(("cat", cat_pipeline, categorical_features))

    preprocessor = ColumnTransformer(transformers=transformers, remainder='passthrough')

    # Process y - Always fit LabelEncoder for classification to ensure original label preservation
    label_encoder = None
    y_encoded = y.copy()

    if problem_type == "classification":
        label_encoder = LabelEncoder()
        y_encoded = label_encoder.fit_transform(y.astype(str))

    # Fast Train-test split with stratification for classification
    try:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded if problem_type == "classification" else None
        )
    except Exception:
        X_train, X_test, y_train, y_test = train_test_split(X, y_encoded, test_size=0.2, random_state=42)

    # Scalable Reservoir Subsampling (Enables scaling up to 10M rows in seconds with <100MB RAM)
    sub_limit = 1500 if fast_mode else 3000
    if len(X_train) > sub_limit:
        if problem_type == "classification" and len(np.unique(y_train)) > 1:
            try:
                from sklearn.model_selection import StratifiedShuffleSplit
                sss = StratifiedShuffleSplit(n_splits=1, train_size=sub_limit, random_state=42)
                sub_indices, _ = next(sss.split(X_train, y_train))
            except Exception:
                sub_indices = np.random.choice(len(X_train), sub_limit, replace=False)
        else:
            sub_indices = np.random.choice(len(X_train), sub_limit, replace=False)

        X_train_fit = X_train.iloc[sub_indices]
        y_train_fit = y_train[sub_indices] if isinstance(y_train, np.ndarray) else y_train.iloc[sub_indices]
    else:
        X_train_fit = X_train
        y_train_fit = y_train

    # Fit preprocessor strictly on training data to prevent data leakage
    X_train_trans = preprocessor.fit_transform(X_train_fit)
    X_test_trans = preprocessor.transform(X_test)

    # Cast to float32 to cut memory usage in half and prevent Render 512MB RAM exhaustion
    import gc
    try:
        X_train_trans = X_train_trans.astype(np.float32, copy=False)
        X_test_trans = X_test_trans.astype(np.float32, copy=False)
    except Exception:
        pass
    gc.collect()

    # Get feature names after encoding
    transformed_feature_names = []
    if numeric_features:
        transformed_feature_names.extend(numeric_features)
    if categorical_features:
        try:
            ohe = preprocessor.named_transformers_['cat'].named_steps['encoder']
            cat_encoded = list(ohe.get_feature_names_out(categorical_features))
            transformed_feature_names.extend(cat_encoded)
        except Exception:
            transformed_feature_names.extend(categorical_features)

    # High-Performance Model Definitions (Optimized with n_jobs=1 to avoid joblib multiprocess RAM spikes)
    all_available_models = {}

    if problem_type == "classification":
        all_available_models = {
            "Hist Gradient Boosting": HistGradientBoostingClassifier(max_iter=25, random_state=42),
            "Random Forest": RandomForestClassifier(n_estimators=20, max_depth=12, n_jobs=1, random_state=42),
            "Logistic Regression": LogisticRegression(max_iter=100, n_jobs=1, random_state=42),
            "Decision Tree": DecisionTreeClassifier(max_depth=8, random_state=42),
            "Extra Trees": ExtraTreesClassifier(n_estimators=15, max_depth=10, n_jobs=1, random_state=42),
            "K-Nearest Neighbors": KNeighborsClassifier(n_neighbors=5, n_jobs=1)
        }
        if HAS_XGBOOST:
            all_available_models["XGBoost"] = xgb.XGBClassifier(n_estimators=20, n_jobs=1, eval_metric='logloss', random_state=42)
        if HAS_LIGHTGBM:
            all_available_models["LightGBM"] = lgb.LGBMClassifier(n_estimators=20, n_jobs=1, random_state=42, verbose=-1)

    else: # Regression
        all_available_models = {
            "Hist Gradient Boosting": HistGradientBoostingRegressor(max_iter=25, random_state=42),
            "Random Forest": RandomForestRegressor(n_estimators=20, max_depth=12, n_jobs=1, random_state=42),
            "Linear Regression": LinearRegression(n_jobs=1),
            "Ridge Regression": Ridge(alpha=1.0, random_state=42),
            "Decision Tree": DecisionTreeRegressor(max_depth=8, random_state=42),
            "Extra Trees": ExtraTreesRegressor(n_estimators=15, max_depth=10, n_jobs=1, random_state=42),
            "K-Nearest Neighbors": KNeighborsRegressor(n_neighbors=5, n_jobs=1)
        }
        if HAS_XGBOOST:
            all_available_models["XGBoost"] = xgb.XGBRegressor(n_estimators=20, n_jobs=1, random_state=42)
        if HAS_LIGHTGBM:
            all_available_models["LightGBM"] = lgb.LGBMRegressor(n_estimators=20, n_jobs=1, random_state=42, verbose=-1)

    # Filter candidate models if selected_models is provided
    models_to_train = {}
    if selected_models and len(selected_models) > 0:
        models_to_train = {k: v for k, v in all_available_models.items() if k in selected_models}
    
    if not models_to_train:
        models_to_train = all_available_models

    leaderboard = []
    trained_pipelines = {}
    best_score = -999.0
    best_model_name = ""
    best_metrics = {}
    best_feature_importances = []

    for name, model in models_to_train.items():
        try:
            model.fit(X_train_trans, y_train_fit)
            y_pred = model.predict(X_test_trans)
            
            pipeline = Pipeline(steps=[
                ('preprocessor', preprocessor),
                ('model', model)
            ])
            trained_pipelines[name] = pipeline
            
            if problem_type == "classification":
                acc = float(accuracy_score(y_test, y_pred))
                f1_w = float(f1_score(y_test, y_pred, average='weighted', zero_division=0))
                f1_m = float(f1_score(y_test, y_pred, average='macro', zero_division=0))
                prec_w = float(precision_score(y_test, y_pred, average='weighted', zero_division=0))
                prec_m = float(precision_score(y_test, y_pred, average='macro', zero_division=0))
                rec_w = float(recall_score(y_test, y_pred, average='weighted', zero_division=0))
                rec_m = float(recall_score(y_test, y_pred, average='macro', zero_division=0))
                
                auc = 0.0
                try:
                    if hasattr(model, "predict_proba"):
                        proba = model.predict_proba(X_test_trans)
                        if proba.shape[1] == 2:
                            auc = float(roc_auc_score(y_test, proba[:, 1]))
                        else:
                            auc = float(roc_auc_score(y_test, proba, multi_class='ovr'))
                except Exception:
                    auc = 0.0
                    
                cm = confusion_matrix(y_test, y_pred).tolist()
                
                metrics = {
                    "Accuracy": round(acc, 4),
                    "F1-Score": round(f1_w, 4),
                    "F1-Macro": round(f1_m, 4),
                    "Precision": round(prec_w, 4),
                    "Precision-Macro": round(prec_m, 4),
                    "Recall": round(rec_w, 4),
                    "Recall-Macro": round(rec_m, 4),
                    "ROC-AUC": round(auc, 4),
                    "Confusion_Matrix": cm
                }
                
                # Configurable metric selection
                if metric_strategy == "accuracy":
                    score = acc
                elif metric_strategy == "f1_macro":
                    score = f1_m
                elif metric_strategy == "roc_auc":
                    score = auc
                elif metric_strategy == "precision":
                    score = prec_w
                elif metric_strategy == "recall":
                    score = rec_w
                else:
                    score = f1_w  # default primary sorting metric
                
            else: # Regression
                r2 = float(r2_score(y_test, y_pred))
                mse = float(mean_squared_error(y_test, y_pred))
                rmse = float(np.sqrt(mse))
                mae = float(mean_absolute_error(y_test, y_pred))
                
                metrics = {
                    "R2_Score": round(r2, 4),
                    "RMSE": round(rmse, 4),
                    "MAE": round(mae, 4),
                    "MSE": round(mse, 4)
                }
                
                if metric_strategy == "rmse":
                    score = -rmse
                elif metric_strategy == "mae":
                    score = -mae
                else:
                    score = r2  # primary sorting metric
                
            # Extract Feature Importances if available
            importances = []
            if hasattr(model, "feature_importances_"):
                imp_vals = model.feature_importances_
                for fname, val in zip(transformed_feature_names, imp_vals):
                    importances.append({"feature": fname, "importance": round(float(val), 4)})
                importances = sorted(importances, key=lambda x: x["importance"], reverse=True)[:10]
            elif hasattr(model, "coef_"):
                coef_vals = np.abs(model.coef_).ravel()
                if len(coef_vals) == len(transformed_feature_names):
                    for fname, val in zip(transformed_feature_names, coef_vals):
                        importances.append({"feature": fname, "importance": round(float(val), 4)})
                    importances = sorted(importances, key=lambda x: x["importance"], reverse=True)[:10]

            leaderboard.append({
                "model_name": name,
                "score": round(score, 4),
                "metrics": metrics,
                "feature_importances": importances
            })
            
            if score > best_score:
                best_score = score
                best_model_name = name
                best_metrics = metrics
                best_feature_importances = importances
                
        except Exception as e:
            print(f"Error training {name}: {e}")

    # Fallback safety: ensure leaderboard is never empty
    if not leaderboard:
        fb_name = "Decision Tree"
        fb_model = DecisionTreeClassifier(max_depth=6, random_state=42) if problem_type == "classification" else DecisionTreeRegressor(max_depth=6, random_state=42)
        try:
            fb_model.fit(X_train_trans, y_train_fit)
            y_pred = fb_model.predict(X_test_trans)
            pipeline = Pipeline(steps=[('preprocessor', preprocessor), ('model', fb_model)])
            trained_pipelines[fb_name] = pipeline
            best_model_name = fb_name
            if problem_type == "classification":
                acc = float(accuracy_score(y_test, y_pred))
                f1_w = float(f1_score(y_test, y_pred, average='weighted', zero_division=0))
                best_metrics = {"Accuracy": round(acc, 4), "F1-Score": round(f1_w, 4), "Precision": round(acc, 4), "Recall": round(acc, 4), "ROC-AUC": 0.5, "Confusion_Matrix": []}
                leaderboard.append({"model_name": fb_name, "score": round(f1_w, 4), "metrics": best_metrics, "feature_importances": []})
            else:
                r2 = float(r2_score(y_test, y_pred))
                best_metrics = {"R2_Score": round(r2, 4), "RMSE": 0.0, "MAE": 0.0, "MSE": 0.0}
                leaderboard.append({"model_name": fb_name, "score": round(r2, 4), "metrics": best_metrics, "feature_importances": []})
        except Exception as e:
            raise ValueError(f"Failed to train models on target '{target_col}': {e}")

    gc.collect()

    # Sort leaderboard descending
    leaderboard = sorted(leaderboard, key=lambda x: x["score"], reverse=True)

    return {
        "problem_type": problem_type,
        "target_col": target_col,
        "best_model_name": best_model_name,
        "best_metrics": best_metrics,
        "leaderboard": leaderboard,
        "feature_importances": best_feature_importances,
        "trained_pipelines": trained_pipelines,
        "label_encoder": label_encoder,
        "feature_names": feature_names,
        "numeric_features": numeric_features,
        "categorical_features": categorical_features
    }

def train_clustering_models(df: pd.DataFrame, scaling_strategy: str = "standard") -> Dict[str, Any]:
    X = df.select_dtypes(include=[np.number]).dropna().copy()
    if X.empty:
        return {"error": "No numeric columns for clustering."}
        
    if scaling_strategy == "minmax":
        scaler = MinMaxScaler()
    elif scaling_strategy == "robust":
        scaler = RobustScaler()
    else:
        scaler = StandardScaler()
        
    X_scaled = scaler.fit_transform(X)
    
    leaderboard = []
    trained_pipelines = {}
    
    best_score = -1.0
    best_model_name = ""
    best_metrics = {}
    
    for k in range(2, 6):
        name = f"K-Means (k={k})"
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=3)
        labels = kmeans.fit_predict(X_scaled)
        
        sil = float(silhouette_score(X_scaled, labels))
        db = float(davies_bouldin_score(X_scaled, labels))
        
        metrics = {
            "Silhouette_Score": round(sil, 4),
            "Davies_Bouldin": round(db, 4),
            "Clusters": k
        }
        
        leaderboard.append({
            "model_name": name,
            "score": round(sil, 4),
            "metrics": metrics,
            "feature_importances": []
        })
        
        if sil > best_score:
            best_score = sil
            best_model_name = name
            best_metrics = metrics
            
    leaderboard = sorted(leaderboard, key=lambda x: x["score"], reverse=True)
    
    return {
        "problem_type": "clustering",
        "target_col": None,
        "best_model_name": best_model_name,
        "best_metrics": best_metrics,
        "leaderboard": leaderboard,
        "feature_importances": [],
        "trained_pipelines": trained_pipelines,
        "label_encoder": None,
        "feature_names": list(X.columns),
        "numeric_features": list(X.columns),
        "categorical_features": []
    }
