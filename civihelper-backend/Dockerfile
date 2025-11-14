FROM node:20

# carpeta de trabajo dentro del contenedor
WORKDIR /app

# copiar package.json primero para aprovechar cache
COPY package*.json ./

# Copiar schema de Prisma ANTES de npm install (necesario para postinstall)
COPY prisma ./prisma

# Ahora sí instalar (ejecutará prisma generate correctamente)
RUN npm install

# copiar el resto del código
COPY . .

# puerto que expone tu app
EXPOSE 4000

# comando por defecto (aunque lo sobrescribas en docker-compose)
CMD ["npm", "run", "dev"]