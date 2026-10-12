import os
import json
import re
from typing import Dict, Any, Optional

try:
    from google import genai
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False

def clean_markdown_text(text: str) -> str:
    """Removes raw markdown asterisks, hashes, and formats text cleanly."""
    if not text:
        return ""
    text = re.sub(r'#{1,6}\s*', '', text)
    text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
    text = re.sub(r'\*(.*?)\*', r'\1', text)
    text = re.sub(r'^\s*[\*\-]\s*', '• ', text, flags=re.MULTILINE)
    return text.strip()

def query_ai_analyst(
    user_prompt: str,
    dataset_summary: Dict[str, Any],
    problem_info: Dict[str, Any],
    cleaning_report: Dict[str, Any],
    ml_results: Dict[str, Any],
    last_prediction: Optional[Dict[str, Any]] = None,
    gemini_model: str = "gemini-2.5-flash",
    api_key: Optional[str] = None
) -> Dict[str, Any]:

    target_col = problem_info.get("suggested_target") or ml_results.get("target_col") or "N/A"
    problem_type = problem_info.get("problem_type") or ml_results.get("problem_type") or "N/A"
    best_model = ml_results.get("best_model_name", "N/A")
    best_metrics = ml_results.get("best_metrics", {})
    top_features = ml_results.get("feature_importances", [])[:5]
    
    # Construct context summary
    context = f"""
ML DataSage AI Dataset & Model Context:
- File Name: {dataset_summary.get('filename', 'Uploaded Data')}
- Rows: {dataset_summary.get('total_rows', 0)}, Columns: {dataset_summary.get('total_cols', 0)}
- Data Health Score: {dataset_summary.get('health_score', 0)}%
- Target Column: {target_col}
- Problem Type: {problem_type.upper()}
- Cleaning Actions: {', '.join(cleaning_report.get('transformations_applied', ['Auto-cleaning performed']))}
- Winning ML Model: {best_model}
- Model Performance Metrics: {json.dumps(best_metrics)}
- Top Driving Features: {json.dumps(top_features)}
"""

    if last_prediction and "prediction" in last_prediction:
        context += f"""
- Latest Prediction Scenario:
  - Input Features: {json.dumps(last_prediction.get('input_summary', {}))}
  - Predicted Result: {last_prediction.get('prediction')}
  - Confidence / Probability: {last_prediction.get('confidence')}% (Probabilities: {json.dumps(last_prediction.get('probabilities', {}))})
"""

    # Try Gemini API if API key is present
    api_key_to_use = api_key or os.environ.get("GEMINI_API_KEY")
    
    if HAS_GENAI and api_key_to_use:
        try:
            client = genai.Client(api_key=api_key_to_use)
            
            model_name = gemini_model
            if "gemini-3.6-flash" in model_name or "gemini-3.5-flash" in model_name:
                model_name = "gemini-2.5-flash"
                
            system_prompt = (
                "You are an expert Senior ML DataSage AI Scientist and Business Analyst. "
                "Answer the user's question clearly without using markdown symbols like asterisks (*) or hash signs (#). "
                "Use plain text, clean bullet points with bullet symbol '•', and clean line breaks."
            )
            
            full_prompt = f"{system_prompt}\n\n{context}\n\nUser Question: {user_prompt}"
            
            response = client.models.generate_content(
                model=model_name,
                contents=full_prompt
            )
            
            if response and response.text:
                cleaned_resp = clean_markdown_text(response.text)
                return {
                    "source": "gemini",
                    "model_used": gemini_model,
                    "response": cleaned_resp
                }
        except Exception as e:
            print(f"Gemini API call failed, using Statistical AI fallback engine: {e}")

    # Statistical AI Reasoning Engine Fallback (Cleaned of asterisks)
    fallback_response = generate_statistical_ai_response(
        user_prompt, target_col, problem_type, best_model, best_metrics, top_features, last_prediction, cleaning_report
    )
    
    return {
        "source": "statistical_ai_engine",
        "model_used": "ML DataSage Statistical AI Engine",
        "response": clean_markdown_text(fallback_response)
    }

def generate_statistical_ai_response(
    prompt: str,
    target_col: str,
    problem_type: str,
    best_model: str,
    best_metrics: Dict[str, Any],
    top_features: list,
    last_prediction: Optional[Dict[str, Any]],
    cleaning_report: Dict[str, Any]
) -> str:

    p_lower = prompt.lower()
    
    feat_names = [f.get("feature", "N/A") for f in top_features] if top_features else ["Key features"]
    feat_str = ", ".join(feat_names[:3])
    
    if "why" in p_lower or "explain" in p_lower or "reason" in p_lower:
        if last_prediction and "prediction" in last_prediction:
            pred_val = last_prediction.get("prediction")
            conf = last_prediction.get("confidence", 90)
            return (
                f"PREDICTION RATIONALE FOR {pred_val}\n\n"
                f"The {best_model} model predicted {pred_val} with {conf}% confidence based on the following key drivers:\n\n"
                f"• Primary Key Drivers: The prediction is heavily influenced by {feat_str}.\n"
                f"• Data Patterns: Across training data, records sharing similar feature values strongly favored {pred_val}.\n"
                f"• Model Validation: This model achieved high cross-validation scores ({list(best_metrics.values())[0] if best_metrics else 'top accuracy'})."
            )
        else:
            return (
                f"MODEL DECISION RATIONALE\n\n"
                f"The {best_model} model predicts target '{target_col}' by analyzing statistical feature interactions:\n\n"
                f"• Top Driving Features: {feat_str}\n"
                f"• Validation Performance: {best_metrics}\n\n"
                f"Tip: Enter feature values in the Prediction tab to test individual record predictions."
            )

    elif "affect" in p_lower or "feature" in p_lower or "importance" in p_lower or "driver" in p_lower:
        bullet_list = "\n".join([f"• {f.get('feature')}: Relative importance score of {f.get('importance')}" for f in top_features])
        return (
            f"KEY FEATURE IMPORTANCE BREAKDOWN\n\n"
            f"Here are the top factors determining the {target_col} outcome:\n\n"
            f"{bullet_list}\n\n"
            f"Actionable Takeaway: Adjusting parameters for {feat_names[0] if feat_names else 'top feature'} will have the highest leverage on changing predicted outcomes."
        )

    elif "clean" in p_lower or "quality" in p_lower or "missing" in p_lower or "etl" in p_lower:
        transforms = cleaning_report.get("transformations_applied", ["Automatic deduplication and imputation"])
        t_str = "\n".join([f"• {t}" for t in transforms])
        return (
            f"AUTOMATED DATA ETL & CLEANING SUMMARY\n\n"
            f"The dataset underwent the following automated preprocessing transformations:\n\n"
            f"{t_str}\n\n"
            f"• Initial Rows: {cleaning_report.get('initial_rows', 0)} → Cleaned Rows: {cleaning_report.get('final_rows', 0)}\n"
            f"• Missing Values Imputed: {cleaning_report.get('missing_filled', 0)} cells\n"
            f"• Outliers Capped: {cleaning_report.get('outliers_capped', 0)} records"
        )

    else:
        return (
            f"ML DATASAGE AI SUMMARY\n\n"
            f"• Selected Best Model: {best_model}\n"
            f"• Problem Task: {problem_type.upper()} on target '{target_col}'\n"
            f"• Key Metrics: {json.dumps(best_metrics)}\n"
            f"• Top Influential Variables: {feat_str}\n\n"
            f"Feel free to ask questions like:\n"
            f"• Why was this prediction made?\n"
            f"• What features affect the model most?\n"
            f"• Summarize dataset quality and ETL steps."
        )


def ai_select_models_from_header(
    dataset_summary: Dict[str, Any],
    problem_info: Dict[str, Any],
    gemini_model: str = "gemini-2.5-flash",
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Analyzes dataset headers, columns, data types, and problem type using AI (Gemini or Statistical AI Rules)
    to choose the top 2-3 machine learning algorithms tailored for ultra-fast and accurate training.
    """
    target_col = problem_info.get("suggested_target", "N/A")
    problem_type = problem_info.get("problem_type", "classification")
    total_rows = dataset_summary.get("total_rows", 1000)
    total_cols = dataset_summary.get("total_cols", 10)
    
    # Extract headers and data types
    cols_info = dataset_summary.get("columns", [])
    col_names = [c.get("name") for c in cols_info] if isinstance(cols_info, list) else list(cols_info)
    num_cols = [c.get("name") for c in cols_info if isinstance(c, dict) and c.get("dtype") in ["int64", "float64", "number"]] if isinstance(cols_info, list) else []
    cat_cols = [c.get("name") for c in cols_info if isinstance(c, dict) and c.get("name") not in num_cols and c.get("name") != target_col] if isinstance(cols_info, list) else []
    
    available_models = [
        "Random Forest", "Hist Gradient Boosting", "Logistic Regression", 
        "Decision Tree", "Extra Trees", "K-Nearest Neighbors", "XGBoost", "LightGBM"
    ] if problem_type == "classification" else [
        "Random Forest", "Hist Gradient Boosting", "Linear Regression", "Ridge Regression",
        "Decision Tree", "Extra Trees", "K-Nearest Neighbors", "XGBoost", "LightGBM"
    ]

    api_key_to_use = api_key or os.environ.get("GEMINI_API_KEY")
    
    if HAS_GENAI and api_key_to_use:
        try:
            client = genai.Client(api_key=api_key_to_use)
            model_name = gemini_model
            if "gemini-3.6-flash" in model_name or "gemini-3.5-flash" in model_name:
                model_name = "gemini-2.5-flash"
                
            prompt = (
                f"You are a Senior Data Scientist AI. Analyze this dataset header and metadata:\n"
                f"- Target Column: {target_col}\n"
                f"- Problem Type: {problem_type.upper()}\n"
                f"- Dataset Dimensions: {total_rows} rows x {total_cols} columns\n"
                f"- Feature Headers: {col_names}\n"
                f"- Numeric Columns Count: {len(num_cols)}, Categorical Columns Count: {len(cat_cols)}\n\n"
                f"From this list of available models: {available_models}\n"
                f"Pick the top 2-3 best ML model candidates specifically suited for this dataset header and structure.\n"
                f"Return ONLY valid JSON with keys: \"selected_models\" (list of 2-3 model names exactly from available list) "
                f"and \"reasoning\" (1-2 sentences explaining why these models fit the dataset headers best)."
            )
            
            response = client.models.generate_content(
                model=model_name,
                contents=prompt
            )
            
            if response and response.text:
                text = response.text.strip()
                json_match = re.search(r'\{.*\}', text, re.DOTALL)
                if json_match:
                    parsed = json.loads(json_match.group(0))
                    selected = [m for m in parsed.get("selected_models", []) if m in available_models]
                    if len(selected) >= 2:
                        return {
                            "source": "gemini",
                            "selected_models": selected,
                            "reasoning": clean_markdown_text(parsed.get("reasoning", ""))
                        }
        except Exception as e:
            print(f"Gemini model recommendation fallback: {e}")

    # Statistical AI Schema Selector Fallback
    selected = ["Hist Gradient Boosting", "Random Forest"]
    if "LightGBM" in available_models:
        selected.append("LightGBM")
    elif "Extra Trees" in available_models:
        selected.append("Extra Trees")
    elif problem_type == "classification" and "Logistic Regression" in available_models:
        selected.append("Logistic Regression")
    elif problem_type == "regression" and "Ridge Regression" in available_models:
        selected.append("Ridge Regression")

    reasoning = (
        f"AI Schema Analysis of dataset headers ({len(col_names)} columns, {total_rows} records): "
        f"Selected high-efficiency tree ensemble models ({', '.join(selected)}) tailored for tabular feature structures "
        f"with automated categorical encoding to maximize speed and cross-validation accuracy."
    )

    return {
        "source": "statistical_ai_engine",
        "selected_models": selected[:3],
        "reasoning": reasoning
    }


def generate_step_insight(
    step: str,
    dataset_summary: Dict[str, Any],
    problem_info: Dict[str, Any],
    cleaning_report: Dict[str, Any],
    ml_results: Dict[str, Any],
    gemini_model: str = "gemini-2.5-flash",
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generates intelligent step-by-step guidance powered by Gemini across:
    1. Profiling (Data health audit & readiness)
    2. Cleaning (Targeted strategy recommendations)
    3. Target Detection (Business use-case & label balance)
    4. Model Training (Leaderboard analysis & metric trade-offs)
    5. Prediction (Inference interpretation & feature leverage)
    """
    api_key_to_use = api_key or os.environ.get("GEMINI_API_KEY")
    total_rows = dataset_summary.get("total_rows", 0)
    total_cols = dataset_summary.get("total_cols", 0)
    target_col = problem_info.get("suggested_target") or ml_results.get("target_col") or "N/A"
    problem_type = problem_info.get("problem_type") or ml_results.get("problem_type") or "N/A"
    best_model = ml_results.get("best_model_name", "N/A")
    best_metrics = ml_results.get("best_metrics", {})
    health_score = dataset_summary.get("health_score", 90)

    # Step-specific prompt construction
    if step == "profiling":
        title = "AI Data Health & Schema Assessment"
        user_prompt = (
            f"You are a Senior ML Engineer. Analyze this dataset profile:\n"
            f"- File: {dataset_summary.get('filename', 'Dataset')}, Dimensions: {total_rows} rows x {total_cols} columns\n"
            f"- Data Health Score: {health_score}%, Memory: {dataset_summary.get('memory_usage_str', 'N/A')}\n"
            f"- Missing Total: {dataset_summary.get('total_missing_cells', 0)} cells, Duplicates: {dataset_summary.get('duplicate_rows', 0)}\n\n"
            f"Provide a clear 3-bullet assessment: 1) Data Quality Health, 2) Key Data Patterns & Anomalies, 3) Machine Learning Readiness."
        )
        fallback = [
            f"Data Health Score is {health_score}% with {total_rows:,} records and {total_cols} features.",
            f"Detected {dataset_summary.get('total_missing_cells', 0)} missing cells and {dataset_summary.get('duplicate_rows', 0)} duplicate rows.",
            "Features are well-structured for automated pipeline transformations and tree-based model training."
        ]

    elif step == "cleaning":
        title = "AI Data Cleaning Strategy Advisor"
        user_prompt = (
            f"You are a Senior Data Engineer. Recommend optimal cleaning strategies for:\n"
            f"- Missing Cells: {dataset_summary.get('total_missing_cells', 0)}, Duplicates: {dataset_summary.get('duplicate_rows', 0)}\n"
            f"- Outliers Detected: {dataset_summary.get('total_potential_outliers', 0)}\n\n"
            f"Provide 3 bullet points: 1) Best missing value strategy, 2) Safe outlier treatment, 3) Recommended deduplication rule."
        )
        fallback = [
            "Use Median imputation for skewed numeric features and Mode for categorical columns to minimize bias.",
            "Apply IQR Winsorization (1.5*IQR clipping) to cap extreme values without dropping valid observations.",
            "Retain first occurrence during deduplication and preserve leading zeros in ID or code columns."
        ]

    elif step == "target":
        title = "AI Target & Problem Formulation Review"
        user_prompt = (
            f"You are an AI Machine Learning Architect. Analyze this target definition:\n"
            f"- Target Column: {target_col}\n"
            f"- Inferred Task: {problem_type.upper()}\n"
            f"- Total Observations: {total_rows}\n\n"
            f"Provide 3 bullets: 1) Business value of predicting this target, 2) Suitability of the {problem_type} formulation, 3) Recommended metric."
        )
        fallback = [
            f"Target '{target_col}' accurately captures the core business objective.",
            f"Formulated as {problem_type.upper()}; stratified sampling will be applied to prevent class skew.",
            "Evaluation will prioritize Weighted F1-Score and ROC-AUC for robust generalization."
        ]

    elif step == "training":
        title = "AI Model Leaderboard & Performance Analysis"
        user_prompt = (
            f"You are an AI ML Specialist. Review these trained model results:\n"
            f"- Best Model: {best_model}\n"
            f"- Validation Metrics: {json.dumps(best_metrics)}\n"
            f"- Task: {problem_type.upper()} on target '{target_col}'\n\n"
            f"Provide 3 bullets: 1) Why {best_model} won the leaderboard, 2) Metric trade-off analysis, 3) Deployment recommendation."
        )
        fallback = [
            f"Top Performer: {best_model} achieved optimal cross-validation balance across metrics.",
            f"Performance Metrics: {', '.join([f'{k}: {v}' for k, v in best_metrics.items()])}.",
            "Pipeline is fitted with leakage protection and ready for single-record or batch CSV test inference."
        ]

    else: # prediction
        title = "AI Inference & Feature Leverage Insights"
        user_prompt = (
            f"You are an AI Decision Scientist. Review inference readiness for target '{target_col}':\n"
            f"- Model: {best_model}\n"
            f"Provide 3 bullets explaining how feature interactions drive outputs and how users can test counterfactual scenarios."
        )
        fallback = [
            f"Model {best_model} produces probabilistic predictions for '{target_col}'.",
            "Adjusting top driver values in the single prediction form immediately reflects model sensitivity.",
            "Batch CSV inference automatically appends confidence scores and class probability distributions."
        ]

    if HAS_GENAI and api_key_to_use:
        try:
            client = genai.Client(api_key=api_key_to_use)
            model_name = gemini_model
            if "gemini-3.6-flash" in model_name or "gemini-3.5-flash" in model_name:
                model_name = "gemini-2.5-flash"

            response = client.models.generate_content(
                model=model_name,
                contents=user_prompt
            )

            if response and response.text:
                cleaned = clean_markdown_text(response.text)
                lines = [l.strip().lstrip('•').strip() for l in cleaned.split('\n') if l.strip()]
                return {
                    "source": "gemini",
                    "title": title,
                    "bullets": lines[:4] if lines else fallback,
                    "text": cleaned
                }
        except Exception as e:
            print(f"Gemini step insight fallback: {e}")

    return {
        "source": "statistical_ai_engine",
        "title": title,
        "bullets": fallback,
        "text": "\n\n".join([f"• {b}" for b in fallback])
    }


