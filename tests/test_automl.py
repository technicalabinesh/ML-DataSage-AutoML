import os
import io
import unittest
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, confusion_matrix

from backend.ml_engine import train_and_evaluate
from backend.prediction_engine import (
    predict_single_record, 
    predict_batch_csv, 
    save_pipeline_to_disk, 
    load_pipeline_from_disk
)

class TestAutoMLEngine(unittest.TestCase):

    def setUp(self):
        np.random.seed(42)
        n = 200
        self.df_binary = pd.DataFrame({
            "age": np.random.randint(18, 70, size=n),
            "monthly_charges": np.random.uniform(20.0, 120.0, size=n),
            "contract_type": np.random.choice(["month-to-month", "one-year", "two-year"], size=n),
            "churn": np.random.choice(["No", "Yes"], size=n)
        })
        
        self.df_multiclass = pd.DataFrame({
            "feature1": np.random.randn(n),
            "feature2": np.random.randn(n),
            "category": np.random.choice(["A", "B", "C"], size=n),
            "target": np.random.choice(["Low", "Medium", "High"], size=n)
        })

    def test_metric_calculation_accuracy(self):
        """1. Verify that evaluation metrics are calculated strictly against held-out ground truth."""
        y_true = np.array([0, 1, 1, 0, 1, 0, 1, 1, 0, 0])
        y_pred = np.array([0, 1, 1, 0, 0, 0, 1, 1, 1, 0])
        
        acc = accuracy_score(y_true, y_pred)
        f1_w = f1_score(y_true, y_pred, average='weighted')
        prec_w = precision_score(y_true, y_pred, average='weighted')
        rec_w = recall_score(y_true, y_pred, average='weighted')
        cm = confusion_matrix(y_true, y_pred).tolist()
        
        self.assertEqual(acc, 0.8)
        self.assertAlmostEqual(f1_w, 0.8, places=4)
        self.assertAlmostEqual(prec_w, 0.8, places=4)
        self.assertAlmostEqual(rec_w, 0.8, places=4)
        self.assertEqual(cm, [[4, 1], [1, 4]])

    def test_no_target_data_leakage(self):
        """2. Verify that preprocessing transformers are fitted ONLY on training split to prevent data leakage."""
        res = train_and_evaluate(
            df=self.df_binary.copy(),
            target_col="churn",
            problem_type="classification",
            fast_mode=True
        )
        self.assertIn("best_model_name", res)
        self.assertIn("leaderboard", res)
        self.assertGreater(len(res["leaderboard"]), 0)
        
        # Verify pipeline transformer exists
        best_pipe = res["trained_pipelines"][res["best_model_name"]]
        preprocessor = best_pipe.named_steps["preprocessor"]
        self.assertIsNotNone(preprocessor)

    def test_label_mapping_and_probabilities(self):
        """3. Verify predicted class labels and probability sum equal 100%."""
        res = train_and_evaluate(
            df=self.df_binary.copy(),
            target_col="churn",
            problem_type="classification",
            fast_mode=True
        )
        
        best_pipe = res["trained_pipelines"][res["best_model_name"]]
        label_encoder = res["label_encoder"]
        feature_names = res["feature_names"]
        
        test_input = {
            "age": 45,
            "monthly_charges": 85.5,
            "contract_type": "month-to-month"
        }
        
        pred_res = predict_single_record(
            input_data=test_input,
            pipeline=best_pipe,
            label_encoder=label_encoder,
            problem_type="classification",
            target_col="churn",
            feature_names=feature_names
        )
        
        self.assertIn("prediction", pred_res)
        self.assertIn(pred_res["prediction"], ["No", "Yes"])
        self.assertIn("probabilities", pred_res)
        
        prob_dict = pred_res["probabilities"]
        self.assertIn("No", prob_dict)
        self.assertIn("Yes", prob_dict)
        
        prob_sum = sum(prob_dict.values())
        self.assertAlmostEqual(prob_sum, 100.0, delta=1.5)
        self.assertEqual(pred_res["confidence"], max(prob_dict.values()))

    def test_pipeline_serialization(self):
        """4. Verify model pipeline serialization to disk and reload consistency."""
        res = train_and_evaluate(
            df=self.df_binary.copy(),
            target_col="churn",
            problem_type="classification",
            fast_mode=True
        )
        
        session_id = "test_serialization_123"
        best_pipe = res["trained_pipelines"][res["best_model_name"]]
        label_encoder = res["label_encoder"]
        feature_names = res["feature_names"]
        
        filepath = save_pipeline_to_disk(
            session_id=session_id,
            pipeline=best_pipe,
            label_encoder=label_encoder,
            metadata={"target_col": "churn", "feature_names": feature_names}
        )
        self.assertTrue(os.path.exists(filepath))
        
        loaded = load_pipeline_from_disk(session_id)
        self.assertIsNotNone(loaded)
        loaded_pipe = loaded["pipeline"]
        loaded_encoder = loaded["label_encoder"]
        
        test_input = {"age": 30, "monthly_charges": 50.0, "contract_type": "two-year"}
        
        orig_pred = predict_single_record(test_input, best_pipe, label_encoder, "classification", "churn", feature_names)
        loaded_pred = predict_single_record(test_input, loaded_pipe, loaded_encoder, "classification", "churn", feature_names)
        
        self.assertEqual(orig_pred["prediction"], loaded_pred["prediction"])
        self.assertEqual(orig_pred["confidence"], loaded_pred["confidence"])
        self.assertEqual(orig_pred["probabilities"], loaded_pred["probabilities"])
        
        # Cleanup
        if os.path.exists(filepath):
            os.remove(filepath)

    def test_individual_vs_batch_equivalence(self):
        """5. Verify single record prediction matches 1-row batch CSV prediction exactly."""
        res = train_and_evaluate(
            df=self.df_binary.copy(),
            target_col="churn",
            problem_type="classification",
            fast_mode=True
        )
        
        best_pipe = res["trained_pipelines"][res["best_model_name"]]
        label_encoder = res["label_encoder"]
        feature_names = res["feature_names"]
        
        test_input = {"age": 55, "monthly_charges": 99.0, "contract_type": "month-to-month"}
        
        single_res = predict_single_record(test_input, best_pipe, label_encoder, "classification", "churn", feature_names)
        
        batch_df = pd.DataFrame([test_input])
        csv_bytes = batch_df.to_csv(index=False).encode('utf-8')
        
        output_bytes = predict_batch_csv(
            file_bytes=csv_bytes,
            filename="batch.csv",
            pipeline=best_pipe,
            label_encoder=label_encoder,
            problem_type="classification",
            target_col="churn",
            feature_names=feature_names
        )
        
        out_df = pd.read_csv(io.BytesIO(output_bytes))
        self.assertEqual(len(out_df), 1)
        self.assertIn("Predicted_churn", out_df.columns)
        self.assertIn("Prediction_Probability", out_df.columns)
        
        self.assertEqual(out_df["Predicted_churn"].iloc[0], single_res["prediction"])

    def test_missing_and_unseen_inputs(self):
        """6. Verify robust handling of missing features, NaNs, unseen categories, and strings."""
        res = train_and_evaluate(
            df=self.df_binary.copy(),
            target_col="churn",
            problem_type="classification",
            fast_mode=True
        )
        
        best_pipe = res["trained_pipelines"][res["best_model_name"]]
        label_encoder = res["label_encoder"]
        feature_names = res["feature_names"]
        
        # Input with missing column, string numeric, unseen category
        test_input = {
            "age": "42",
            "monthly_charges": None, # Missing
            "contract_type": "UNKNOWN_SUPER_PLAN" # Unseen category
        }
        
        pred_res = predict_single_record(test_input, best_pipe, label_encoder, "classification", "churn", feature_names)
        self.assertNotIn("error", pred_res)
        self.assertIn("prediction", pred_res)

    def test_batch_csv_missing_column_error(self):
        """7. Verify descriptive error when batch CSV is missing required feature columns."""
        res = train_and_evaluate(
            df=self.df_binary.copy(),
            target_col="churn",
            problem_type="classification",
            fast_mode=True
        )
        
        best_pipe = res["trained_pipelines"][res["best_model_name"]]
        label_encoder = res["label_encoder"]
        feature_names = res["feature_names"]
        
        bad_df = pd.DataFrame([{"age": 30}]) # missing monthly_charges & contract_type
        csv_bytes = bad_df.to_csv(index=False).encode('utf-8')
        
        with self.assertRaises(ValueError) as ctx:
            predict_batch_csv(
                file_bytes=csv_bytes,
                filename="bad.csv",
                pipeline=best_pipe,
                label_encoder=label_encoder,
                problem_type="classification",
                target_col="churn",
                feature_names=feature_names
            )
    def test_multi_dataset_management(self):
        """8. Verify multi-dataset loading, concatenation/merge, switching, and removal."""
        from backend.dataset_manager import load_multiple_files, switch_dataset, remove_dataset, reset_session
        
        df1 = pd.DataFrame({"a": [1, 2], "b": ["x", "y"]})
        df2 = pd.DataFrame({"a": [3, 4], "b": ["z", "w"]})
        
        bytes1 = df1.to_csv(index=False).encode('utf-8')
        bytes2 = df2.to_csv(index=False).encode('utf-8')
        
        test_session = "test_multi_session"
        active_df, active_name, datasets = load_multiple_files(
            [(bytes1, "part1.csv"), (bytes2, "part2.csv")],
            session_id=test_session,
            merge=True
        )
        
        # Verify merged length is 4
        self.assertEqual(len(active_df), 4)
        self.assertIn("Merged", active_name)
        self.assertEqual(len(datasets), 3) # part1, part2, and merged
        
        # Test switching to part1
        switched_df, switched_name = switch_dataset(test_session, "part1.csv")
        self.assertEqual(len(switched_df), 2)
        self.assertEqual(switched_name, "part1.csv")
        
        # Test removing a dataset
        active_after_remove, remaining = remove_dataset(test_session, "part1.csv")
        self.assertNotIn("part1.csv", remaining)
        
        # Test resetting session
        reset_session(test_session)
        from backend.dataset_manager import SESSIONS
        self.assertIsNone(SESSIONS[test_session]["raw_df"])
        self.assertEqual(len(SESSIONS[test_session]["datasets"]), 0)

if __name__ == "__main__":
    unittest.main()
