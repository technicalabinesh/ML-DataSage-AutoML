import os
import io
import uuid
import pandas as pd
from typing import Dict, Any, Optional, List, Tuple

# Global session cache for uploaded & processed datasets
# Key: session_id, Value: dict of dataframes and models
SESSIONS: Dict[str, Dict[str, Any]] = {}

def get_or_create_session(session_id: Optional[str] = None) -> str:
    if not session_id:
        session_id = str(uuid.uuid4())
    if session_id not in SESSIONS:
        SESSIONS[session_id] = {
            "raw_df": None,
            "cleaned_df": None,
            "filename": "",
            "datasets": {},  # Dict of filename -> DataFrame
            "problem_info": {},
            "cleaning_config": {},
            "cleaning_report": {},
            "trained_models": {},
            "best_model_name": "",
            "best_model_metrics": {},
            "feature_importances": [],
            "pipeline": None,
            "feature_names": [],
            "target_col": None,
            "problem_type": None
        }
    return session_id

def _parse_file(file_content: bytes, filename: str) -> pd.DataFrame:
    ext = os.path.splitext(filename)[1].lower()
    if ext == '.csv':
        return pd.read_csv(io.BytesIO(file_content))
    elif ext in ['.xlsx', '.xls']:
        return pd.read_excel(io.BytesIO(file_content))
    else:
        raise ValueError(f"Unsupported file format for '{filename}'. Please upload CSV or XLSX.")

def load_file(file_content: bytes, filename: str, session_id: str) -> pd.DataFrame:
    session_id = get_or_create_session(session_id)
    df = _parse_file(file_content, filename)
    
    # Store in session
    SESSIONS[session_id]["raw_df"] = df.copy()
    SESSIONS[session_id]["cleaned_df"] = df.copy()
    SESSIONS[session_id]["filename"] = filename
    SESSIONS[session_id]["datasets"][filename] = df.copy()
    
    # Reset downstream steps
    SESSIONS[session_id]["trained_models"] = {}
    SESSIONS[session_id]["pipeline"] = None
    SESSIONS[session_id]["cleaning_report"] = {}
    SESSIONS[session_id]["problem_info"] = {}
    
    return df

def load_multiple_files(
    files_data: List[Tuple[bytes, str]], 
    session_id: str, 
    merge: bool = True
) -> Tuple[pd.DataFrame, str, List[str]]:
    session_id = get_or_create_session(session_id)
    if not files_data:
        raise ValueError("No files provided for upload.")
    
    parsed_dfs: List[Tuple[str, pd.DataFrame]] = []
    for content, name in files_data:
        df = _parse_file(content, name)
        SESSIONS[session_id]["datasets"][name] = df.copy()
        parsed_dfs.append((name, df))
        
    if merge and len(parsed_dfs) > 1:
        # Concatenate multiple dataframes with outer alignment
        merged_df = pd.concat([d for _, d in parsed_dfs], ignore_index=True)
        names = [name for name, _ in parsed_dfs]
        merged_name = f"Merged ({len(parsed_dfs)} files: {', '.join(names[:2])}{'...' if len(names) > 2 else ''})"
        
        SESSIONS[session_id]["raw_df"] = merged_df.copy()
        SESSIONS[session_id]["cleaned_df"] = merged_df.copy()
        SESSIONS[session_id]["filename"] = merged_name
        SESSIONS[session_id]["datasets"][merged_name] = merged_df.copy()
        active_df = merged_df
        active_name = merged_name
    else:
        # Default active to the first uploaded file
        active_name, active_df = parsed_dfs[0]
        SESSIONS[session_id]["raw_df"] = active_df.copy()
        SESSIONS[session_id]["cleaned_df"] = active_df.copy()
        SESSIONS[session_id]["filename"] = active_name

    # Reset downstream steps
    SESSIONS[session_id]["trained_models"] = {}
    SESSIONS[session_id]["pipeline"] = None
    SESSIONS[session_id]["cleaning_report"] = {}
    SESSIONS[session_id]["problem_info"] = {}
    
    return active_df, active_name, list(SESSIONS[session_id]["datasets"].keys())

def switch_dataset(session_id: str, target_filename: str) -> Tuple[pd.DataFrame, str]:
    if session_id not in SESSIONS or target_filename not in SESSIONS[session_id]["datasets"]:
        raise ValueError(f"Dataset '{target_filename}' not found in current session.")
    
    df = SESSIONS[session_id]["datasets"][target_filename].copy()
    SESSIONS[session_id]["raw_df"] = df.copy()
    SESSIONS[session_id]["cleaned_df"] = df.copy()
    SESSIONS[session_id]["filename"] = target_filename
    
    # Reset downstream steps for fresh pipeline on new dataset
    SESSIONS[session_id]["trained_models"] = {}
    SESSIONS[session_id]["pipeline"] = None
    SESSIONS[session_id]["cleaning_report"] = {}
    SESSIONS[session_id]["problem_info"] = {}
    
    return df, target_filename

def remove_dataset(session_id: str, filename: Optional[str] = None) -> Tuple[Optional[str], List[str]]:
    if session_id not in SESSIONS:
        return None, []
    
    datasets = SESSIONS[session_id]["datasets"]
    if filename and filename in datasets:
        del datasets[filename]
        
    if not datasets or filename == SESSIONS[session_id]["filename"] or not filename:
        if datasets:
            # Switch to first remaining dataset
            next_name = next(iter(datasets))
            switch_dataset(session_id, next_name)
            return next_name, list(datasets.keys())
        else:
            # Entire session wiped
            reset_session(session_id)
            return None, []
            
    return SESSIONS[session_id]["filename"], list(datasets.keys())

def reset_session(session_id: str) -> None:
    if session_id in SESSIONS:
        SESSIONS[session_id] = {
            "raw_df": None,
            "cleaned_df": None,
            "filename": "",
            "datasets": {},
            "problem_info": {},
            "cleaning_config": {},
            "cleaning_report": {},
            "trained_models": {},
            "best_model_name": "",
            "best_model_metrics": {},
            "feature_importances": [],
            "pipeline": None,
            "feature_names": [],
            "target_col": None,
            "problem_type": None
        }

def load_sample_dataset(sample_name: str, session_id: str) -> pd.DataFrame:
    session_id = get_or_create_session(session_id)
    base_dir = os.path.dirname(os.path.abspath(__file__))
    sample_path = os.path.join(base_dir, "sample_data", f"{sample_name}.csv")
    
    if not os.path.exists(sample_path):
        from backend.sample_data.generator import generate_samples
        generate_samples(os.path.join(base_dir, "sample_data"))
        
    df = pd.read_csv(sample_path)
    
    filename = f"{sample_name}.csv"
    SESSIONS[session_id]["raw_df"] = df.copy()
    SESSIONS[session_id]["cleaned_df"] = df.copy()
    SESSIONS[session_id]["filename"] = filename
    SESSIONS[session_id]["datasets"][filename] = df.copy()
    SESSIONS[session_id]["trained_models"] = {}
    SESSIONS[session_id]["pipeline"] = None
    SESSIONS[session_id]["cleaning_report"] = {}
    SESSIONS[session_id]["problem_info"] = {}
    
    return df
