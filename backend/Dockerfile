# dentro de backend/Dockerfile

WORKDIR /app

# 1) Copia package.json **e** package-lock.json
COPY package.json package-lock.json ./

# 2) Agora npm ci vai funcionar
RUN npm ci --production

# 3) Copia o restante do backend
COPY . ./


EXPOSE 3000
CMD ["npm", "run", "start"]
