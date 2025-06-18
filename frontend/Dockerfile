# Dockerfile.frontend

# Stage 1: build do React
FROM node:18-alpine AS build
WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# Stage 2: serve estático com Nginx
FROM nginx:stable-alpine
COPY --from=build /app/build /usr/share/nginx/html

# Expõe porta padrão do Nginx
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]