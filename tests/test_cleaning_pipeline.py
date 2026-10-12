import unittest
import io
import numpy as np
import pandas as pd
from backend.data_cleaning import auto_clean_dataset
from backend.data_understanding import analyze_dataset
from backend.ml_engine import train_and_evaluate
from backend.prediction_engine import predict_single_record, predict_batch_csv

class TestCleaningPipeline(unittest.TestCase):
    
    def test_missing_values_numeric_strategies(self):
        # 1. Median
        df1 = pd.DataFrame({"A": [10.0, 20.0, 30.0, np.nan], "id": [1, 2, 3, 4]})
        res1, rep1 = auto_clean_dataset(df1, missing_num_strategy="median", remove_duplicates=False)
        self.assertEqual(res1["A"].iloc[3], 20.0)
        self.assertEqual(rep1["missing_filled"], 1)

        # 2. Mean
        df2 = pd.DataFrame({"A": [10.0, 20.0, np.nan], "id": [1, 2, 3]})
        res2, rep2 = auto_clean_dataset(df2, missing_num_strategy="mean", remove_duplicates=False)
        self.assertEqual(res2["A"].iloc[2], 15.0)

        # 3. Zero
        df3 = pd.DataFrame({"A": [5.0, np.nan], "id": [1, 2]})
        res3, rep3 = auto_clean_dataset(df3, missing_num_strategy="zero", remove_duplicates=False)
        self.assertEqual(res3["A"].iloc[1], 0.0)

        # 4. Drop
        df4 = pd.DataFrame({"A": [5.0, np.nan], "B": [1, 2]})
        res4, rep4 = auto_clean_dataset(df4, missing_num_strategy="drop", remove_duplicates=False)
        self.assertEqual(len(res4), 1)

        # 5. Keep
        df5 = pd.DataFrame({"A": [5.0, np.nan], "id": [1, 2]})
        res5, rep5 = auto_clean_dataset(df5, missing_num_strategy="keep", remove_duplicates=False)
        self.assertTrue(pd.isna(res5["A"].iloc[1]))

    def test_missing_values_categorical_strategies(self):
        # 1. Mode (using distinct rows to avoid deduplication)
        df1 = pd.DataFrame({
            "Cat": ["apple", "apple", "banana", None],
            "row_id": [1, 2, 3, 4]
        })
        res1, rep1 = auto_clean_dataset(df1, missing_cat_strategy="mode", remove_duplicates=False)
        self.assertEqual(res1["Cat"].iloc[3], "apple")

        # 2. Custom category
        df2 = pd.DataFrame({"Cat": ["alpha", None], "id": [1, 2]})
        res2, rep2 = auto_clean_dataset(df2, missing_cat_strategy="missing", missing_cat_fill_value="UnknownCategory", remove_duplicates=False)
        self.assertEqual(res2["Cat"].iloc[1], "UnknownCategory")

        # 3. Keep
        df3 = pd.DataFrame({"Cat": ["alpha", None], "id": [1, 2]})
        res3, rep3 = auto_clean_dataset(df3, missing_cat_strategy="keep", remove_duplicates=False)
        self.assertTrue(pd.isna(res3["Cat"].iloc[1]))

    def test_all_missing_column_and_empty_whitespace(self):
        # Column 100% missing should not crash
        df = pd.DataFrame({
            "num_all_na": [np.nan, np.nan, np.nan],
            "cat_all_na": [None, None, None],
            "valid_col": [1, 2, 3]
        })
        res, rep = auto_clean_dataset(df, missing_num_strategy="mean", missing_cat_strategy="mode", remove_duplicates=False)
        self.assertEqual(len(res), 3)

        # Whitespace and empty strings should convert to NaN
        df_ws = pd.DataFrame({
            "col": ["  ", "", "valid"],
            "id": [1, 2, 3]
        })
        res_ws, rep_ws = auto_clean_dataset(df_ws, convert_empty_to_nan=True, missing_cat_strategy="missing", missing_cat_fill_value="Missing", remove_duplicates=False)
        self.assertEqual(res_ws["col"].iloc[0], "Missing")
        self.assertEqual(res_ws["col"].iloc[1], "Missing")
        self.assertEqual(res_ws["col"].iloc[2], "valid")

    def test_target_column_preservation(self):
        # Target column missing values must NOT be automatically imputed
        df = pd.DataFrame({
            "feature": [1.0, 2.0, np.nan],
            "target": ["Yes", "No", None],
            "id": [1, 2, 3]
        })
        res, rep = auto_clean_dataset(df, missing_num_strategy="mean", missing_cat_strategy="mode", target_col="target", remove_duplicates=False)
        # Feature imputed
        self.assertEqual(res["feature"].iloc[2], 1.5)
        # Target missing value remains NaN untouched
        self.assertTrue(pd.isna(res["target"].iloc[2]))

    def test_outlier_detection_and_treatment(self):
        # 1. IQR winsorization
        df_iqr = pd.DataFrame({
            "val": [10.0, 11.0, 12.0, 13.0, 14.0, 1000.0],  # 1000 is extreme outlier
            "id": [1, 2, 3, 4, 5, 6]
        })
        res_iqr, rep_iqr = auto_clean_dataset(df_iqr, outlier_strategy="iqr_cap", remove_duplicates=False)
        self.assertLess(res_iqr["val"].max(), 100.0)
        self.assertGreater(rep_iqr["outliers_capped"], 0)

        # 2. Z-Score 3-sigma (n=16 continuous values to allow statistically valid 3-sigma threshold)
        df_z = pd.DataFrame({
            "val": [10.0, 11.0, 12.0, 10.5, 9.5, 10.2, 11.1, 10.8, 9.9, 10.1, 11.3, 10.4, 9.8, 10.6, 11.0, 500.0],
            "id": list(range(16))
        })
        res_z, rep_z = auto_clean_dataset(df_z, outlier_strategy="zscore_cap", remove_duplicates=False)
        self.assertLess(res_z["val"].max(), 500.0)

        # 3. Percentile clipping
        df_p = pd.DataFrame({
            "val": [1.0, 2.0, 3.0, 4.0, 100.0],
            "id": [1, 2, 3, 4, 5]
        })
        res_p, rep_p = auto_clean_dataset(df_p, outlier_strategy="percentile_cap", percentile_upper=0.90, remove_duplicates=False)
        self.assertLess(res_p["val"].max(), 100.0)

        # 4. Remove rows
        df_rem = pd.DataFrame({
            "val": [10.0, 11.0, 12.0, 13.0, 14.0, 1000.0],
            "id": [1, 2, 3, 4, 5, 6]
        })
        res_rem, rep_rem = auto_clean_dataset(df_rem, outlier_strategy="remove_rows", remove_duplicates=False)
        self.assertEqual(len(res_rem), 5)

    def test_duplicate_removal_options(self):
        df = pd.DataFrame({
            "id": [1, 2, 2],
            "val": ["A", "B", "B_modified"]
        })
        # Exact duplicates - nothing removed because rows are not identical
        res_exact, rep_exact = auto_clean_dataset(df, duplicate_strategy="exact")
        self.assertEqual(len(res_exact), 3)

        # Subset duplicates on "id" with keep "first"
        res_first, rep_first = auto_clean_dataset(df, duplicate_strategy="subset", duplicate_subset_cols=["id"], duplicate_keep="first")
        self.assertEqual(len(res_first), 2)
        self.assertEqual(res_first["val"].iloc[1], "B")

        # Subset duplicates on "id" with keep "last"
        res_last, rep_last = auto_clean_dataset(df, duplicate_strategy="subset", duplicate_subset_cols=["id"], duplicate_keep="last")
        self.assertEqual(len(res_last), 2)
        self.assertEqual(res_last["val"].iloc[1], "B_modified")

    def test_format_and_type_correction(self):
        # 1. Currency & comma parsing ($1,250.50 -> 1250.50)
        df_cur = pd.DataFrame({
            "salary": ["$1,250.50", "€2,500", "3,000.00", "$450"],
            "id": [1, 2, 3, 4]
        })
        res_cur, _ = auto_clean_dataset(df_cur, handle_currency_commas=True, remove_duplicates=False)
        self.assertTrue(pd.api.types.is_numeric_dtype(res_cur["salary"]))
        self.assertEqual(res_cur["salary"].iloc[0], 1250.50)

        # 2. Leading zero preservation in postal codes / IDs
        df_id = pd.DataFrame({
            "zip_code": ["00123", "07410", "90210"],
            "val": [1, 2, 3]
        })
        res_id, _ = auto_clean_dataset(df_id, preserve_leading_zeros=True, remove_duplicates=False)
        self.assertEqual(res_id["zip_code"].iloc[0], "00123")
        self.assertEqual(res_id["zip_code"].dtype, object)

        # 3. Whitespace trimming
        df_ws = pd.DataFrame({
            "text": ["  hello  ", "world   ", "   foo"],
            "id": [1, 2, 3]
        })
        res_ws, _ = auto_clean_dataset(df_ws, strip_whitespace=True, remove_duplicates=False)
        self.assertEqual(res_ws["text"].iloc[0], "hello")
        self.assertEqual(res_ws["text"].iloc[1], "world")

    def test_constant_column_removal(self):
        df = pd.DataFrame({
            "constant_col": [42, 42, 42, 42],
            "feature": [1, 2, 3, 4]
        })
        res, rep = auto_clean_dataset(df, remove_constants=True)
        self.assertNotIn("constant_col", res.columns)
        self.assertTrue(any("constant_col" in c for c in rep["removed_columns"]))

    def test_excel_and_csv_export_compatibility(self):
        df = pd.DataFrame({
            "id": ["00123", "00456"],
            "revenue": [1200.5, 3400.0],
            "status": ["active", "pending"]
        })
        # CSV Export & Reopen
        csv_buffer = io.StringIO()
        df.to_csv(csv_buffer, index=False)
        csv_buffer.seek(0)
        reopened_csv = pd.read_csv(csv_buffer, dtype={"id": str})
        self.assertEqual(len(reopened_csv), 2)
        self.assertEqual(reopened_csv["id"].iloc[0], "00123")

        # Excel (.xlsx) Export & Reopen via openpyxl
        excel_buffer = io.BytesIO()
        df.to_excel(excel_buffer, index=False, engine="openpyxl")
        excel_buffer.seek(0)
        reopened_excel = pd.read_excel(excel_buffer, dtype={"id": str})
        self.assertEqual(len(reopened_excel), 2)
        self.assertEqual(reopened_excel["id"].iloc[0], "00123")

    def test_original_dataframe_not_modified(self):
        original = pd.DataFrame({"A": [1, np.nan, 3], "B": [10, 20, 30]})
        original_copy = original.copy(deep=True)
        res, _ = auto_clean_dataset(original, missing_num_strategy="zero")
        # Ensure original remains unchanged
        pd.testing.assert_frame_equal(original, original_copy)

if __name__ == "__main__":
    unittest.main()
