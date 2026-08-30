import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import MinMaxScaler
from keras.models import Sequential
from keras.layers import Dense

# 1. Load Data
df = pd.read_csv("your_patient_data.csv")
X = df.values

# 2. Split Data
Xtrain, Xtest = train_test_split(X, test_size=0.2, random_state=2)

# 3. Fit Scaler & Transform Data
scaler = MinMaxScaler()
Xtrain_scaled = scaler.fit_transform(Xtrain)

# Save the fitted scaler for use in the separate inference script
joblib.dump(scaler, "patient_scaler.pkl")

# 4. Build Autoencoder Model
num_features = Xtrain_scaled.shape[1]

model = Sequential([
    Dense(8, activation='relu', input_dim=num_features),
    Dense(4, activation='relu'),
    Dense(2, activation='relu'),  # Bottleneck layer
    Dense(4, activation='relu'),
    Dense(8, activation='relu'),
    Dense(num_features, activation='sigmoid')  # Output layer matches input_dim
])

model.compile(loss="mean_squared_error", optimizer="adam", metrics=["mse"])

# 5. Train Model
model.fit(
    Xtrain_scaled, 
    Xtrain_scaled, 
    epochs=50, 
    batch_size=16, 
    validation_split=0.1
)

# 6. Save Model Weights & Architecture
# Option A: Save complete model (Architecture + Weights together)
model.save("autoencoder_model.keras")

# Option B: Save weights only
model.save_weights("autoencoder_weights.weights.h5")

print("\nModel and Scaler successfully saved!")