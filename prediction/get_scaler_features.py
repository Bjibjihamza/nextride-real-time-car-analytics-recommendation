import pickle

with open('../feature_scaler.pkl', 'rb') as f:
    scaler = pickle.load(f)
print(scaler.feature_names_in_.tolist())