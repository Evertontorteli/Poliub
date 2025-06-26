# backend/Dockerfile

# 1) Definir a imagem base
FROM node:18-alpine

# 2) Diretório de trabalho
WORKDIR /app

# 3) Copiar package.json e lockfile (se existir)
COPY package.json package-lock.json ./

# 4) Instalar só deps de produção
RUN npm ci --production
# ou, se você não tiver lockfile:
# RUN npm install --production

# 5) Copiar o restante do backend
COPY . ./

# 6) Expor porta e iniciar
EXPOSE 3000
CMD ["npm", "run", "start"]
