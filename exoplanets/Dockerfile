# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve static files
FROM node:18-alpine
WORKDIR /app

# Копируем только финальную сборку
COPY --from=builder /app/build ./build

# Устанавливаем только serve
RUN npm install -g serve

EXPOSE 80
CMD ["serve", "-s", "build", "-l", "80"]
