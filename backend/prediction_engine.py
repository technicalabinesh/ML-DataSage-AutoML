import io
import os
import joblib
import pandas as pd
import numpy as np
from typing import Dict, Any, Optional

SAVED_MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "saved_models")
os.makedirs(SAVED_MODELS_DIR, exist_ok=True)

def save_pipeline_to_disk(session_id: str, pipeline: Any, label_encoder: Any, metadata: Dict[str, Any]):
    """Persists fitted pipeline, label encoder, and metadata to disk via joblib."""
    filepath = os.path.join(SAVED_MODELS_DIR, f"{session_id}.joblib")
    data = {
        "pipeline": pipeline,
        "label_encoder": label_encoder,
        "metadata": metadata
    }
    joblib.dump(data, filepath)
    return filepath

def load_pipeline_from_disk(session_id: str) -> Optional[Dict[str, Any]]:
    """Loads fitted pipeline and metadata from disk if present."""
    filepath = os.path.join(SAVED_MODELS_DIR, f"{session_id}.joblib")
    if os.path.exists(filepath):
        try:
            return joblib.load(filepath)
        except Exception as e:
            print(f"Error loading saved pipeline for session {session_id}: {e}")
    return None

def predict_single_record(
    input_data: Dict[str, Any],
    pipeline: Any,
    label_encoder: Any,
    problem_type: str,
    target_col: str,
    feature_names: list
) -> Dict[str, Any]:

    if not pipeline:
        return {"error": "No trained model pipeline available. Please train models first."}
        
    # Construct single row dataframe with all required features in exact order
    row_dict = {}
    for feat in feature_names:
        val = input_data.get(feat, None)
        if val is not None and str(val).strip() != "":
            try:
                row_dict[feat] = float(val)
            except ValueError:
                row_dict[feat] = str(val)
        else:
            row_dict[feat] = np.nan
            
    df_single = pd.DataFrame([row_dict], columns=feature_names)
    
    try:
        raw_pred = pipeline.predict(df_single)[0]
        
        probabilities = {}
        confidence = 0.0
        predicted_label = str(raw_pred)
        
        if problem_type == "classification":
            if label_encoder is not None:
                try:
                    predicted_label = str(label_encoder.inverse_transform([int(raw_pred)])[0])
                except Exception:
                    predicted_label = str(raw_pred)
            
            if hasattr(pipeline, "predict_proba"):
                try:
                    probas = pipeline.predict_proba(df_single)[0]
                    classifier = pipeline.named_steps.get('model')
                    
                    if classifier is not None and hasattr(classifier, "classes_") and label_encoder is not None:
                        for idx, p in enumerate(probas):
                            cls_val = classifier.classes_[idx]
                            orig_class_name = str(label_encoder.inverse_transform([cls_val])[0])
                            probabilities[orig_class_name] = round(float(p) * 100, 2)
                    elif label_encoder is not None:
                        for idx, (p, c) in enumerate(zip(probas, label_encoder.classes_)):
                            probabilities[str(c)] = round(float(p) * 100, 2)
                    else:
                        for idx, p in enumerate(probas):
                            probabilities[f"Class_{idx}"] = round(float(p) * 100, 2)
                            
                    confidence = round(float(np.max(probas)) * 100, 2)
                except Exception as ex:
                    print(f"Probabilities calculation exception: {ex}")
                    confidence = 100.0
        elif problem_type == "regression":
            predicted_label = str(round(float(raw_pred), 4))
            confidence = 95.0
        else: # clustering
            predicted_label = f"Cluster {int(raw_pred)}"
            confidence = 100.0

        return {
            "prediction": predicted_label,
            "raw_prediction": float(raw_pred) if isinstance(raw_pred, (int, float, np.number)) else str(raw_pred),
            "confidence": confidence,
            "probabilities": probabilities,
            "target_col": target_col,
            "problem_type": problem_type,
            "probability_disclaimer": "Predicted probability represents the model's likelihood estimate on feature inputs, not an absolute guarantee of outcome.",
            "input_summary": row_dict
        }

    except Exception as e:
        return {"error": f"Prediction failed: {str(e)}"}

def predict_batch_csv(
    file_bytes: bytes,
    filename: str,
    pipeline: Any,
    label_encoder: Any,
    problem_type: str,
    target_col: str,
    feature_names: list
) -> bytes:

    ext = filename.split('.')[-1].lower()
    if ext == 'csv':
        df = pd.read_csv(io.BytesIO(file_bytes))
    else:
        df = pd.read_excel(io.BytesIO(file_bytes))
        
    if df.empty:
        raise ValueError("Uploaded file is empty.")

    # Validate feature columns
    missing_cols = [f for f in feature_names if f not in df.columns]
    if missing_cols:
        raise ValueError(f"Missing required feature columns in batch CSV: {', '.join(missing_cols)}")
        
    # Prepare feature dataframe strictly in expected column order
    df_features = df[feature_names].copy()
    
    # Execute batch predictions
    preds = pipeline.predict(df_features)
    
    out_df = df.copy()
    pred_col_name = f"Predicted_{target_col if target_col else 'Cluster'}"
    
    if problem_type == "classification" and label_encoder is not None:
        try:
            out_df[pred_col_name] = label_encoder.inverse_transform(preds.astype(int))
        except Exception:
            out_df[pred_col_name] = preds
    else:
        out_df[pred_col_name] = preds
        
    # Append probabilities if classification
    if problem_type == "classification" and hasattr(pipeline, "predict_proba"):
        try:
            probas = pipeline.predict_proba(df_features)
            max_probas = np.max(probas, axis=1)
            out_df["Prediction_Probability"] = [f"{round(float(p) * 100, 2)}%" for p in max_probas]
            
            classifier = pipeline.named_steps.get('model')
            if classifier is not None and hasattr(classifier, "classes_") and label_encoder is not None:
                for idx, cls_val in enumerate(classifier.classes_):
                    c_name = str(label_encoder.inverse_transform([cls_val])[0])
                    out_df[f"Prob_{c_name}"] = [f"{round(float(p) * 100, 2)}%" for p in probas[:, idx]]
        except Exception as e:
            print(f"Batch probabilities warning: {e}")

    output = io.BytesIO()
    out_df.to_csv(output, index=False)
    return output.getvalue()
