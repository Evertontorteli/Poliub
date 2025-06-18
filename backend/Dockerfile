# backend/Dockerfile
FROM node:18-alpine
WORKDIR /app

# Copia os package.json direto (já estamos em backend/)
COPY package*.json ./
RUN npm ci --production

# Copia todo o resto do código do backend
COPY . ./

EXPOSE 3000
CMD ["npm", "run", "start"]
