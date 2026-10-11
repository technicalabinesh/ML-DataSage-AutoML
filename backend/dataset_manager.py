import os
import io
import uuid
import pandas as pd
from typing import Dict, Any, Optional

# Global session cache for uploaded & processed datasets
# Key: session_id, Value: dict of dataframes and models
SESSIONS: Dict[str, Dict[str, Any]] = {}

def get_or_create_session(session_id: Optional[str] = None) -> str:
    if not session_id or session_id not in SESSIONS:
        session_id = str(uuid.uuid4())
        SESSIONS[session_id] = {
            "raw_df": None,
            "cleaned_df": None,
            "filename": "",
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

def load_file(file_content: bytes, filename: str, session_id: str) -> pd.DataFrame:
    session_id = get_or_create_session(session_id)
    ext = os.path.splitext(filename)[1].lower()
    
    if ext == '.csv':
        df = pd.read_csv(io.BytesIO(file_content))
    elif ext in ['.xlsx', '.xls']:
        df = pd.read_excel(io.BytesIO(file_content))
    else:
        raise ValueError("Unsupported file format. Please upload CSV or XLSX.")
    
    # Store in session
    SESSIONS[session_id]["raw_df"] = df.copy()
    SESSIONS[session_id]["cleaned_df"] = df.copy()
    SESSIONS[session_id]["filename"] = filename
    # Reset downstream steps
    SESSIONS[session_id]["trained_models"] = {}
    SESSIONS[session_id]["pipeline"] = None
    
    return df

def load_sample_dataset(sample_name: str, session_id: str) -> pd.DataFrame:
    session_id = get_or_create_session(session_id)
    base_dir = os.path.dirname(os.path.abspath(__file__))
    sample_path = os.path.join(base_dir, "sample_data", f"{sample_name}.csv")
    
    if not os.path.exists(sample_path):
        # Fallback generate samples if missing
        from backend.sample_data.generator import generate_samples
        generate_samples(os.path.join(base_dir, "sample_data"))
        
    df = pd.read_csv(sample_path)
    
    SESSIONS[session_id]["raw_df"] = df.copy()
    SESSIONS[session_id]["cleaned_df"] = df.copy()
    SESSIONS[session_id]["filename"] = f"{sample_name}.csv"
    SESSIONS[session_id]["trained_models"] = {}
    SESSIONS[session_id]["pipeline"] = None
    
    return df
