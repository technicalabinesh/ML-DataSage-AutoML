import os
import pandas as pd
# pyrefly: ignore [missing-import]
import numpy as np

def generate_samples(output_dir):
    os.makedirs(output_dir, exist_ok=True)
    np.random.seed(42)

    # 1. Telecom Churn Dataset (Classification)
    n_churn = 1000
    tenure = np.random.randint(1, 72, n_churn)
    monthly_charges = np.round(np.random.uniform(20.0, 120.0, n_churn), 2)
    total_charges = np.round(tenure * monthly_charges * np.random.uniform(0.9, 1.05, n_churn), 2)
    contract = np.random.choice(['Month-to-month', 'One year', 'Two year'], n_churn, p=[0.5, 0.3, 0.2])
    internet = np.random.choice(['Fiber optic', 'DSL', 'No'], n_churn, p=[0.45, 0.4, 0.15])
    payment = np.random.choice(['Electronic check', 'Mailed check', 'Bank transfer', 'Credit card'], n_churn)
    senior = np.random.choice([0, 1], n_churn, p=[0.84, 0.16])
    tech_support = np.random.choice(['Yes', 'No', 'No internet'], n_churn, p=[0.35, 0.5, 0.15])

    # Compute realistic churn probability
    churn_score = (
        (contract == 'Month-to-month') * 1.5 +
        (monthly_charges > 70) * 1.0 +
        (internet == 'Fiber optic') * 0.8 +
        (tenure < 12) * 1.2 -
        (tech_support == 'Yes') * 0.8 +
        np.random.normal(0, 0.5, n_churn)
    )
    churn = (churn_score > 1.2).astype(int)

    df_churn = pd.DataFrame({
        'Tenure_Months': tenure,
        'Monthly_Charges': monthly_charges,
        'Total_Charges': total_charges,
        'Contract_Type': contract,
        'Internet_Service': internet,
        'Payment_Method': payment,
        'Senior_Citizen': senior,
        'Tech_Support': tech_support,
        'Churn': churn
    })

    # Add some realistic missing values and outliers for cleaning demonstration
    df_churn.loc[np.random.choice(n_churn, 25, replace=False), 'Total_Charges'] = np.nan
    df_churn.loc[np.random.choice(n_churn, 15, replace=False), 'Contract_Type'] = np.nan
    df_churn.loc[np.random.choice(n_churn, 5, replace=False), 'Monthly_Charges'] = 999.0 # Outlier

    df_churn.to_csv(os.path.join(output_dir, 'telecom_churn.csv'), index=False)
    print("Created telecom_churn.csv")

    # 2. Housing Prices Dataset (Regression)
    n_house = 1000
    sqft = np.random.randint(700, 4500, n_house)
    bedrooms = np.random.randint(1, 6, n_house)
    bathrooms = np.random.choice([1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0], n_house)
    year_built = np.random.randint(1960, 2024, n_house)
    garage_cars = np.random.choice([0, 1, 2, 3], n_house, p=[0.1, 0.3, 0.4, 0.2])
    neighborhood = np.random.choice(['Downtown', 'Suburbs', 'Uptown', 'Waterfront', 'Rural'], n_house)
    has_pool = np.random.choice(['Yes', 'No'], n_house, p=[0.2, 0.8])
    distance_city = np.round(np.random.uniform(1.0, 35.0, n_house), 1)

    base_price = (
        sqft * 180 +
        bedrooms * 15000 +
        bathrooms * 22000 +
        (year_built - 1960) * 1200 +
        garage_cars * 18000 +
        (neighborhood == 'Waterfront') * 120000 +
        (neighborhood == 'Downtown') * 50000 +
        (has_pool == 'Yes') * 35000 -
        distance_city * 1500 +
        np.random.normal(0, 25000, n_house)
    )
    price = np.round(np.maximum(50000, base_price), -2)

    df_house = pd.DataFrame({
        'Square_Feet': sqft,
        'Bedrooms': bedrooms,
        'Bathrooms': bathrooms,
        'Year_Built': year_built,
        'Garage_Cars': garage_cars,
        'Neighborhood': neighborhood,
        'Has_Pool': has_pool,
        'Distance_To_City_KM': distance_city,
        'Price_USD': price
    })

    # Add missing values & duplicates for demonstration
    df_house.loc[np.random.choice(n_house, 20, replace=False), 'Distance_To_City_KM'] = np.nan
    df_house.loc[np.random.choice(n_house, 10, replace=False), 'Neighborhood'] = np.nan
    # duplicate 5 rows
    df_house = pd.concat([df_house, df_house.iloc[:5]], ignore_index=True)

    df_house.to_csv(os.path.join(output_dir, 'housing_prices.csv'), index=False)
    print("Created housing_prices.csv")

    # 3. Customer Segmentation Dataset (Clustering)
    n_cust = 800
    age = np.random.randint(18, 70, n_cust)
    income = np.round(np.random.uniform(18.0, 150.0, n_cust), 1) # $k
    spending = np.random.randint(1, 100, n_cust)
    visits = np.random.randint(1, 30, n_cust)
    loyalty_years = np.round(np.random.uniform(0.1, 10.0, n_cust), 1)

    df_cust = pd.DataFrame({
        'Age': age,
        'Annual_Income_kUSD': income,
        'Spending_Score_1to100': spending,
        'Monthly_Visits': visits,
        'Loyalty_Years': loyalty_years
    })

    df_cust.to_csv(os.path.join(output_dir, 'customer_segmentation.csv'), index=False)
    print("Created customer_segmentation.csv")

if __name__ == '__main__':
    generate_samples(os.path.dirname(os.path.abspath(__file__)))
