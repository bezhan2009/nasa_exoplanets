# Базовый образ для сборки
FROM node:18-alpine AS builder

# Установка рабочей директории
WORKDIR /app

# Копирование package.json и package-lock.json
COPY package*.json ./

# Установка зависимостей
RUN npm ci

# Копирование исходного кода
COPY . .

# Сборка React приложения
RUN npm run build

# Финальный образ для продакшн
FROM node:18-alpine

# Установка рабочей директории
WORKDIR /app

# Копирование package.json
COPY package*.json ./

# Установка только production зависимостей
RUN npm ci --only=production

# Копирование собранных файлов из предыдущего этапа
COPY --from=builder /app/build ./build

# Установка serve для раздачи статических файлов
RUN npm install -g serve

# Открытие порта
EXPOSE 80

# Запуск приложения через serve
CMD ["serve", "-s", "build", "-l", "80"]
