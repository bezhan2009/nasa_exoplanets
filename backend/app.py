from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd

app = FastAPI(title="Exoplanet Classifier API")

# === Разрешаем CORS для всех источников ===
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # Разрешаем ВСЕ домены
    allow_credentials=True,
    allow_methods=["*"],        # Разрешаем любые методы (GET, POST и т.д.)
    allow_headers=["*"],        # Разрешаем любые заголовки
)

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

    return {
        "prediction": str(prediction),
        "probabilities": {
            "CONFIRMED": float(probabilities[0]),
            "CANDIDATE": float(probabilities[1]),
            "FALSE_POSITIVE": float(probabilities[2]),
        },
    }

@app.get("/")
def root():
    return {"message": "Exoplanet API is running! Use POST /predict"}

