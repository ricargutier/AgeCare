FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml* ./
COPY backend/package.json ./backend/
COPY shared/ ./shared/

RUN pnpm install --filter @agecare/backend --frozen-lockfile

COPY backend/ ./backend/

WORKDIR /app/backend

RUN pnpm build
RUN pnpm exec prisma generate

ENV PORT=3000
EXPOSE 3000

CMD ["node", "dist/src/index.js"]
