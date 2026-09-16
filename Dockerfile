FROM node:18 as builder

WORKDIR /app

COPY package.json .
COPY . .
COPY .env /app/src/.env

RUN npm install --legacy-peer-deps

RUN npm run build

FROM node:18

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src/.env ./.env

EXPOSE 3000
CMD ["node", "dist/src/main.js"]

