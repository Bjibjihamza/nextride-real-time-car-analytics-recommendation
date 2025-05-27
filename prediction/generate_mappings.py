import pandas as pd
import pickle

# Load the datasets
cleaned_df = pd.read_csv('cleaned_data.csv')
preprocessed_df = pd.read_csv('preprocessed_data.csv')

# Define categorical columns
categorical_cols = ['brand', 'condition', 'fuel_type', 'model', 'origin', 'first_owner', 'sector', 'seller_city', 'transmission']

# Create mappings
mappings = {}
for col in categorical_cols:
    # Ensure the column exists in cleaned_df
    if col not in cleaned_df.columns:
        print(f"Warning: {col} not found in cleaned_data.csv")
        continue
    # Get unique pairs of raw values and encoded values
    # Merge on index or a common key if necessary; here we assume row alignment
    # For simplicity, we'll use a subset where both are non-null
    merged = pd.DataFrame({
        'raw': cleaned_df[col].astype(str).str.lower(),
        'encoded': preprocessed_df[col]
    }).dropna()
    # Create a dictionary mapping raw values to encoded values
    mapping = dict(zip(merged['raw'], merged['encoded']))
    mappings[col] = mapping
    print(f"Mapping for {col}: {mapping}")

# Save the mappings to a pickle file
with open('categorical_mappings.pkl', 'wb') as f:
    pickle.dump(mappings, f)
print("Saved categorical_mappings.pkl")