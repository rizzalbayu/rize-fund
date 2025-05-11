FROM node:23.11.0-bullseye

WORKDIR /app
RUN npm install -g @nestjs/cli
COPY package*json ./

RUN npm install
COPY . .

RUN npm run build
EXPOSE 3000
