import joblib
import numpy as np
from keras.models import load_model

def get_patient_severity(patient_raw_features, model_path="autoencoder_model.keras", scaler_path="patient_scaler.pkl"):
    """
    Calculates the severity score for a single patient using a trained Autoencoder.
    
    Parameters:
        patient_raw_features (list or np.ndarray): Raw clinical values for 1 patient.
        model_path (str): Path to saved .keras model.
        scaler_path (str): Path to saved joblib MinMaxScaler.
        
    Returns:
        float: Severity score (Reconstruction Error).
    """
    # 1. Load saved model and scaler
    scaler = joblib.load(scaler_path)
    model = load_model(model_path)

    # 2. Convert input to 2D array shape (1, num_features)
    patient_array = np.array(patient_raw_features, dtype=float).reshape(1, -1)

    # 3. Scale features using the fitted training scaler
    patient_scaled = scaler.transform(patient_array)

    # 4. Predict reconstruction
    reconstructed = model.predict(patient_scaled, verbose=0)

    # 5. Calculate Mean Squared Error (Severity Score)
    severity_score = float(np.mean(np.square(patient_scaled - reconstructed)))
    
    return severity_score


# =====================================================================
# EXAMPLE USAGE FOR 1 PATIENT
# =====================================================================
if __name__ == "__main__":
    # Supply raw clinical values for 1 patient matching your input feature order
    # Example (10 features): [HeartRate, SysBP, DiasBP, SpO2, Temp, WBC, CRP, Lactate, Area, GCS]
    sample_patient_vitals = [115.0, 85.0, 55.0, 91.0, 38.9, 15.2, 45.0, 3.8, 12.5, 13.0]

    # Calculate severity
    score = get_patient_severity(sample_patient_vitals)

    # Output severity interpretation
    print(f"\n--- Patient Health Analysis ---")
    print(f"Raw Input Features   : {sample_patient_vitals}")
    print(f"Severity Score (MSE) : {score:.6f}")
    
    # Optional thresholding logic based on expected baseline deviation
    if score < 0.015:
        print("Clinical Status      : Normal / Mild Deviation")
    elif score < 0.050:
        print("Clinical Status      : Moderate Severity")
    else:
        print("Clinical Status      : High Severity / Critical Anomaly")