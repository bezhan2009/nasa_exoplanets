# === Базовый образ ===
FROM python:3.11-alpine

# === Устанавливаем зависимости для компиляции и работы pandas/numpy ===
RUN apk add --no-cache gcc g++ musl-dev libffi-dev

# === Рабочая директория ===
WORKDIR /app

# === Копируем файлы проекта ===
COPY . .

# === Устанавливаем зависимости ===
RUN pip install --no-cache-dir fastapi uvicorn joblib pandas scikit-learn

# === Открываем порт ===
EXPOSE 8000

# === Запуск приложения ===
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
