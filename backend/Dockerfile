# Dockerfile.backend
FROM node:18-alpine
WORKDIR /app

# Instala apenas dependências de produção
COPY backend/package*.json ./
RUN npm ci --production

# Copia o código do backend
COPY backend/ ./

# Expõe porta da API
EXPOSE 3000

# Inicia o servidor
CMD ["npm", "run", "start"]