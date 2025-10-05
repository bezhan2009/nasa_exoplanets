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
FROM nginx:alpine

# Копирование собранных файлов из предыдущего этапа
COPY --from=builder /app/build /usr/share/nginx/html

# Копирование кастомной конфигурации Nginx (опционально)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Открытие порта
EXPOSE 80

# Запуск Nginx
CMD ["nginx", "-g", "daemon off;"]
