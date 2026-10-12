import os
import io
import json
import numpy as np
import pandas as pd
from typing import Dict, Any, Optional, List
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel

from backend.dataset_manager import (
    load_file, 
    load_multiple_files,
    load_sample_dataset, 
    switch_dataset,
    remove_dataset,
    reset_session,
    SESSIONS, 
    get_or_create_session
)
from backend.data_understanding import analyze_dataset
from backend.data_cleaning import auto_clean_dataset
from backend.problem_detector import detect_problem
from backend.ml_engine import train_and_evaluate
from backend.prediction_engine import (
    predict_single_record, 
    predict_batch_csv, 
    predict_dataframe,
    save_pipeline_to_disk, 
    load_pipeline_from_disk
)
from backend.ai_analyst import query_ai_analyst, ai_select_models_from_header, generate_step_insight

app = FastAPI(title="ML DataSage AI API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
@app.head("/")
def health_check():
    return {"status": "healthy", "service": "ML DataSage AI API"}

# Pydantic Request Models
class CleanRequest(BaseModel):
    session_id: str
    missing_num_strategy: str = "median"          # "median", "mean", "zero", "knn", "drop", "keep"
    missing_cat_strategy: str = "mode"            # "mode", "missing", "knn", "drop", "keep"
    missing_cat_fill_value: str = "Missing"
    convert_empty_to_nan: bool = True
    duplicate_strategy: str = "exact"             # "exact", "none", "subset"
    duplicate_subset_cols: Optional[List[str]] = None
    duplicate_keep: str = "first"                 # "first", "last"
    remove_duplicates: bool = True
    outlier_strategy: str = "none"                # "none", "iqr_cap", "zscore_cap", "percentile_cap", "remove_rows", "log_transform"
    percentile_lower: float = 0.01
    percentile_upper: float = 0.99
    scaling_strategy: str = "none"                # "none", "standard", "minmax", "robust", "maxabs"
    encoding_strategy: str = "none"               # "none", "onehot", "ordinal", "label", "target", "frequency", "auto"
    drop_first: bool = False
    remove_identifiers: bool = False
    remove_constants: bool = True
    strip_whitespace: bool = True
    case_normalization: str = "none"              # "none", "lower", "upper", "title"
    handle_currency_commas: bool = True
    preserve_leading_zeros: bool = True
    parse_dates: bool = False
    target_col: Optional[str] = None

class TrainRequest(BaseModel):
    session_id: str
    target_col: Optional[str] = None
    problem_type: Optional[str] = None
    scaling_strategy: str = "standard"
    selected_models: Optional[List[str]] = None
    fast_mode: bool = True
    metric_strategy: str = "f1_weighted"

class PredictRequest(BaseModel):
    session_id: str
    features: Dict[str, Any]

class ChatRequest(BaseModel):
    session_id: str
    message: str
    gemini_model: str = "gemini-2.5-flash"
    api_key: Optional[str] = None

class StepInsightRequest(BaseModel):
    session_id: str
    step: str
    gemini_model: str = "gemini-2.5-flash"
    api_key: Optional[str] = None

@app.get("/api/health")
def api_health_check():
    return {"status": "ok", "service": "ML DataSage AI Engine"}

@app.post("/api/upload")
async def upload_dataset(file: UploadFile = File(...), session_id: Optional[str] = Form(None)):
    try:
        content = await file.read()
        session_id = get_or_create_session(session_id)
        df = load_file(content, file.filename, session_id)
        understanding = analyze_dataset(df)
        understanding["filename"] = file.filename
        
        return {
            "session_id": session_id,
            "filename": file.filename,
            "available_datasets": list(SESSIONS[session_id].get("datasets", {}).keys()),
            "understanding": understanding
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/upload_multiple")
async def upload_multiple_datasets(
    files: List[UploadFile] = File(...), 
    session_id: Optional[str] = Form(None),
    merge: bool = Form(True)
):
    try:
        session_id = get_or_create_session(session_id)
        files_data = []
        for f in files:
            content = await f.read()
            files_data.append((content, f.filename))
            
        df, active_name, all_datasets = load_multiple_files(files_data, session_id, merge=merge)
        understanding = analyze_dataset(df)
        understanding["filename"] = active_name
        
        return {
            "session_id": session_id,
            "filename": active_name,
            "available_datasets": all_datasets,
            "understanding": understanding,
            "is_merged": merge and len(files_data) > 1,
            "total_files": len(files_data)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/switch_dataset")
def api_switch_dataset(session_id: str = Form(...), filename: str = Form(...)):
    try:
        df, active_name = switch_dataset(session_id, filename)
        understanding = analyze_dataset(df)
        understanding["filename"] = active_name
        return {
            "session_id": session_id,
            "filename": active_name,
            "available_datasets": list(SESSIONS[session_id].get("datasets", {}).keys()),
            "understanding": understanding
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/remove_dataset")
def api_remove_dataset(session_id: str = Form(...), filename: Optional[str] = Form(None)):
    try:
        active_name, remaining = remove_dataset(session_id, filename)
        if not remaining or active_name is None:
            return {
                "session_id": session_id,
                "filename": None,
                "available_datasets": [],
                "understanding": None,
                "is_empty": True
            }
        df = SESSIONS[session_id]["raw_df"]
        understanding = analyze_dataset(df)
        understanding["filename"] = active_name
        return {
            "session_id": session_id,
            "filename": active_name,
            "available_datasets": remaining,
            "understanding": understanding,
            "is_empty": False
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/reset_session")
def api_reset_session(session_id: str = Form(...)):
    reset_session(session_id)
    return {"status": "ok", "session_id": session_id}

@app.post("/api/load_sample")
def load_sample(sample_name: str = Form(...), session_id: Optional[str] = Form(None)):
    try:
        session_id = get_or_create_session(session_id)
        df = load_sample_dataset(sample_name, session_id)
        understanding = analyze_dataset(df)
        understanding["filename"] = f"{sample_name}.csv"
        
        return {
            "session_id": session_id,
            "filename": f"{sample_name}.csv",
            "available_datasets": list(SESSIONS[session_id].get("datasets", {}).keys()),
            "understanding": understanding
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/understanding/{session_id}")
def get_understanding(session_id: str):
    if session_id not in SESSIONS or SESSIONS[session_id]["raw_df"] is None:
        raise HTTPException(status_code=404, detail="Session or dataset not found")
    df = SESSIONS[session_id]["raw_df"]
    understanding = analyze_dataset(df)
    understanding["filename"] = SESSIONS[session_id]["filename"]
    return understanding

@app.post("/api/clean")
def clean_data(req: CleanRequest):
    if req.session_id not in SESSIONS or SESSIONS[req.session_id]["raw_df"] is None:
        raise HTTPException(status_code=404, detail="Session or dataset not found")
        
    raw_df = SESSIONS[req.session_id]["raw_df"]
    cleaned_df, report = auto_clean_dataset(
        df=raw_df,
        missing_num_strategy=req.missing_num_strategy,
        missing_cat_strategy=req.missing_cat_strategy,
        missing_cat_fill_value=req.missing_cat_fill_value,
        convert_empty_to_nan=req.convert_empty_to_nan,
        duplicate_strategy=req.duplicate_strategy,
        duplicate_subset_cols=req.duplicate_subset_cols,
        duplicate_keep=req.duplicate_keep,
        remove_duplicates=req.remove_duplicates,
        outlier_strategy=req.outlier_strategy,
        percentile_lower=req.percentile_lower,
        percentile_upper=req.percentile_upper,
        strip_whitespace=req.strip_whitespace,
        case_normalization=req.case_normalization,
        handle_currency_commas=req.handle_currency_commas,
        preserve_leading_zeros=req.preserve_leading_zeros,
        parse_dates=req.parse_dates,
        remove_identifiers=req.remove_identifiers,
        remove_constants=req.remove_constants,
        scaling_strategy=req.scaling_strategy,
        encoding_strategy=req.encoding_strategy,
        drop_first=req.drop_first,
        target_col=req.target_col
    )
    
    SESSIONS[req.session_id]["cleaned_df"] = cleaned_df
    SESSIONS[req.session_id]["cleaning_report"] = report
    SESSIONS[req.session_id]["cleaning_config"] = req.dict()
    
    post_understanding = analyze_dataset(cleaned_df)
    post_understanding["filename"] = SESSIONS[req.session_id]["filename"]
    
    preview_rows = min(15, len(cleaned_df))
    head_preview = cleaned_df.head(preview_rows).replace({np.nan: None}).to_dict(orient="records")
    
    return {
        "report": report,
        "understanding": post_understanding,
        "head_preview": head_preview
    }

@app.get("/api/download_cleaned/{session_id}")
def download_cleaned_dataset(session_id: str, format: str = "csv"):
    if session_id not in SESSIONS:
        raise HTTPException(status_code=404, detail="Session not found. Please upload a dataset first.")
    
    cleaned_df = SESSIONS[session_id].get("cleaned_df")
    if cleaned_df is None:
        cleaned_df = SESSIONS[session_id].get("raw_df")
        
    if cleaned_df is None or cleaned_df.empty:
        raise HTTPException(status_code=404, detail="No dataset found for this session. Please upload a dataset first.")
    
    raw_filename = SESSIONS[session_id].get("filename") or "dataset"
    base_name = os.path.splitext(raw_filename)[0].replace(" ", "_")
    
    fmt = format.lower().strip()
    if fmt in ["xlsx", "excel"]:
        clean_filename = f"Cleaned_{base_name}.xlsx"
        bio = io.BytesIO()
        cleaned_df.to_excel(bio, index=False, engine="openpyxl")
        bio.seek(0)
        return Response(
            content=bio.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename={clean_filename}",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    else:
        clean_filename = f"Cleaned_{base_name}.csv"
        csv_bytes = cleaned_df.to_csv(index=False).encode('utf-8')
        return Response(
            content=csv_bytes,
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename={clean_filename}",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )

@app.get("/api/detect_problem/{session_id}")
def get_problem_detection(session_id: str, target_col: Optional[str] = None):
    if session_id not in SESSIONS or SESSIONS[session_id]["cleaned_df"] is None:
        raise HTTPException(status_code=404, detail="Session or dataset not found")
    df = SESSIONS[session_id]["cleaned_df"]
    detection = detect_problem(df, target_col=target_col)
    SESSIONS[session_id]["problem_info"] = detection
    return detection

@app.get("/api/recommend_models/{session_id}")
def recommend_models(session_id: str, target_col: Optional[str] = None):
    if session_id not in SESSIONS or SESSIONS[session_id]["cleaned_df"] is None:
        raise HTTPException(status_code=404, detail="Session or dataset not found")
        
    df = SESSIONS[session_id]["cleaned_df"]
    understanding = analyze_dataset(df)
    detection = detect_problem(df, target_col=target_col)
    
    rec = ai_select_models_from_header(
        dataset_summary=understanding,
        problem_info=detection
    )
    return rec

@app.post("/api/train")
def train_models(req: TrainRequest):
    if req.session_id not in SESSIONS or SESSIONS[req.session_id]["cleaned_df"] is None:
        raise HTTPException(status_code=404, detail="Session or dataset not found")
        
    try:
        df = SESSIONS[req.session_id]["cleaned_df"]
        detection = detect_problem(df, target_col=req.target_col)
        
        target = req.target_col or detection.get("suggested_target")
        prob_type = req.problem_type or detection.get("problem_type")
        
        results = train_and_evaluate(
            df=df,
            target_col=target,
            problem_type=prob_type,
            scaling_strategy=req.scaling_strategy,
            selected_models=req.selected_models,
            fast_mode=req.fast_mode,
            metric_strategy=req.metric_strategy
        )
        
        # Cache trained models & pipeline in session
        SESSIONS[req.session_id]["trained_models"] = results.get("trained_pipelines", {})
        best_name = results.get("best_model_name")
        best_pipe = results.get("trained_pipelines", {}).get(best_name)
        
        SESSIONS[req.session_id]["best_model_name"] = best_name
        SESSIONS[req.session_id]["pipeline"] = best_pipe
        SESSIONS[req.session_id]["label_encoder"] = results.get("label_encoder")
        SESSIONS[req.session_id]["feature_names"] = results.get("feature_names", [])
        SESSIONS[req.session_id]["target_col"] = target
        SESSIONS[req.session_id]["problem_type"] = prob_type
        SESSIONS[req.session_id]["best_model_metrics"] = results.get("best_metrics", {})
        SESSIONS[req.session_id]["feature_importances"] = results.get("feature_importances", [])
        
        # Persist pipeline to disk
        if best_pipe is not None:
            save_pipeline_to_disk(
                session_id=req.session_id,
                pipeline=best_pipe,
                label_encoder=results.get("label_encoder"),
                metadata={
                    "target_col": target,
                    "problem_type": prob_type,
                    "best_model_name": best_name,
                    "feature_names": results.get("feature_names", []),
                    "best_metrics": results.get("best_metrics", {})
                }
            )
        
        import gc
        gc.collect()
        
        # Return serializable summary without pipeline objects
        return {
            "problem_type": results.get("problem_type"),
            "target_col": results.get("target_col"),
            "best_model_name": results.get("best_model_name"),
            "best_metrics": results.get("best_metrics"),
            "leaderboard": results.get("leaderboard"),
            "feature_importances": results.get("feature_importances"),
            "feature_names": results.get("feature_names")
        }
    except Exception as e:
        import gc
        gc.collect()
        raise HTTPException(status_code=400, detail=f"Model training error: {str(e)}")

@app.post("/api/predict")
def predict_record(req: PredictRequest):
    session_id = req.session_id
    session_id = get_or_create_session(session_id)
    sess = SESSIONS[session_id]
    
    pipeline = sess.get("pipeline")
    if not pipeline:
        # Attempt reloading from disk
        saved = load_pipeline_from_disk(session_id)
        if saved:
            sess["pipeline"] = saved.get("pipeline")
            sess["label_encoder"] = saved.get("label_encoder")
            meta = saved.get("metadata", {})
            sess["target_col"] = meta.get("target_col")
            sess["problem_type"] = meta.get("problem_type")
            sess["feature_names"] = meta.get("feature_names", [])
            pipeline = sess["pipeline"]
            
    if not pipeline:
        raise HTTPException(status_code=400, detail="No trained model available. Train models first.")
        
    res = predict_single_record(
        input_data=req.features,
        pipeline=pipeline,
        label_encoder=sess.get("label_encoder"),
        problem_type=sess.get("problem_type"),
        target_col=sess.get("target_col"),
        feature_names=sess.get("feature_names", [])
    )
    
    sess["last_prediction"] = res
    return res

@app.post("/api/predict_batch")
async def predict_batch(
    session_id: str = Form(...),
    file: UploadFile = File(...)
):
    session_id = get_or_create_session(session_id)
    sess = SESSIONS[session_id]
    
    pipeline = sess.get("pipeline")
    if not pipeline:
        saved = load_pipeline_from_disk(session_id)
        if saved:
            sess["pipeline"] = saved.get("pipeline")
            sess["label_encoder"] = saved.get("label_encoder")
            meta = saved.get("metadata", {})
            sess["target_col"] = meta.get("target_col")
            sess["problem_type"] = meta.get("problem_type")
            sess["feature_names"] = meta.get("feature_names", [])
            pipeline = sess["pipeline"]

    if not pipeline:
        raise HTTPException(status_code=400, detail="No trained model available. Train models first.")
        
    try:
        content = await file.read()
        csv_out = predict_batch_csv(
            file_bytes=content,
            filename=file.filename,
            pipeline=pipeline,
            label_encoder=sess.get("label_encoder"),
            problem_type=sess.get("problem_type"),
            target_col=sess.get("target_col"),
            feature_names=sess.get("feature_names", [])
        )
        
        return Response(
            content=csv_out,
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=Predicted_{file.filename}",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/predict_current_dataset/{session_id}")
def predict_current_dataset(session_id: str):
    session_id = get_or_create_session(session_id)
    sess = SESSIONS[session_id]
    
    pipeline = sess.get("pipeline")
    if not pipeline:
        saved = load_pipeline_from_disk(session_id)
        if saved:
            sess["pipeline"] = saved.get("pipeline")
            sess["label_encoder"] = saved.get("label_encoder")
            meta = saved.get("metadata", {})
            sess["target_col"] = meta.get("target_col")
            sess["problem_type"] = meta.get("problem_type")
            sess["feature_names"] = meta.get("feature_names", [])
            pipeline = sess["pipeline"]

    if not pipeline:
        raise HTTPException(status_code=400, detail="No trained model available. Train models in Step 4/5 first.")

    target_df = sess.get("cleaned_df") if sess.get("cleaned_df") is not None else sess.get("raw_df")
    if target_df is None or target_df.empty:
        raise HTTPException(status_code=400, detail="No dataset loaded in current session.")
        
    try:
        csv_bytes = predict_dataframe(
            df=target_df,
            pipeline=pipeline,
            label_encoder=sess.get("label_encoder"),
            problem_type=sess.get("problem_type"),
            target_col=sess.get("target_col"),
            feature_names=sess.get("feature_names", [])
        )
        
        filename = sess.get("filename") or "dataset"
        base_name = os.path.splitext(filename)[0].replace(" ", "_")
        pred_filename = f"Predicted_{base_name}.csv"
        
        return Response(
            content=csv_bytes,
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename={pred_filename}",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/chat")
def chat_ai(req: ChatRequest):
    if req.session_id not in SESSIONS:
        raise HTTPException(status_code=404, detail="Session not found")
        
    sess = SESSIONS[req.session_id]
    raw_df = sess.get("raw_df")
    
    if raw_df is None:
        dataset_summary = {"filename": "No dataset uploaded", "total_rows": 0, "total_cols": 0, "health_score": 0}
    else:
        dataset_summary = analyze_dataset(raw_df)
        dataset_summary["filename"] = sess.get("filename", "Uploaded Dataset")

    problem_info = sess.get("problem_info", {})
    cleaning_report = sess.get("cleaning_report", {})
    
    ml_results = {
        "best_model_name": sess.get("best_model_name", "N/A"),
        "best_metrics": sess.get("best_model_metrics", {}),
        "feature_importances": sess.get("feature_importances", []),
        "target_col": sess.get("target_col"),
        "problem_type": sess.get("problem_type")
    }
    
    last_prediction = sess.get("last_prediction")
    
    response = query_ai_analyst(
        user_prompt=req.message,
        dataset_summary=dataset_summary,
        problem_info=problem_info,
        cleaning_report=cleaning_report,
        ml_results=ml_results,
        last_prediction=last_prediction,
        gemini_model=req.gemini_model,
        api_key=req.api_key
    )
    
    return response

@app.post("/api/gemini_step_insight")
def get_step_insight(req: StepInsightRequest):
    if req.session_id not in SESSIONS:
        raise HTTPException(status_code=404, detail="Session not found")
        
    sess = SESSIONS[req.session_id]
    df = sess.get("cleaned_df") if sess.get("cleaned_df") is not None else sess.get("raw_df")
    
    if df is None:
        summary = {"filename": "No dataset loaded", "total_rows": 0, "total_cols": 0, "health_score": 0}
    else:
        summary = analyze_dataset(df)
        summary["filename"] = sess.get("filename", "Dataset")

    problem_info = sess.get("problem_info") or (detect_problem(df, target_col=sess.get("target_col")) if df is not None else {})
    cleaning_report = sess.get("cleaning_report") or {}
    ml_results = {
        "best_model_name": sess.get("best_model_name", "N/A"),
        "best_metrics": sess.get("best_model_metrics", {}),
        "target_col": sess.get("target_col"),
        "problem_type": sess.get("problem_type")
    }

    insight = generate_step_insight(
        step=req.step,
        dataset_summary=summary,
        problem_info=problem_info,
        cleaning_report=cleaning_report,
        ml_results=ml_results,
        gemini_model=req.gemini_model,
        api_key=req.api_key
    )

    return insight
