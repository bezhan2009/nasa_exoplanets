from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import pandas as pd

app = FastAPI(title="Exoplanet Classifier API")

# === Загружаем модель ===
model = joblib.load("exoplanet_model.pkl")

# === Описываем входные данные ===
class ExoplanetFeatures(BaseModel):
    orbital_period: float
    planet_radius: float
    insolation_flux: float
    equilibrium_temp: float
    stellar_teff: float
    stellar_radius: float
    stellar_logg: float
    ra: float
    dec: float
    telescope_encoded: int

# === Основной эндпоинт ===
@app.post("/predict")
def predict(features: ExoplanetFeatures):
    df = pd.DataFrame([features.dict()])

    prediction = model.predict(df)[0]
    probabilities = model.predict_proba(df)[0]

    # Явно преобразуем numpy -> python
    return {
        "prediction": str(prediction),  # часто строка
        "probabilities": {
            "CONFIRMED": float(probabilities[0]),
            "CANDIDATE": float(probabilities[1]),
            "FALSE_POSITIVE": float(probabilities[2]),
        }
    }

@app.get("/")
def root():
    return {"message": "Exoplanet API is running! Use POST /predict"}

