# syntax=docker/dockerfile:1

FROM oven/bun:1 AS build
WORKDIR /app

COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile

COPY . .

ARG VITE_APP_TAG=0.0.0
ARG VITE_APP_COMMIT=unknown
ENV VITE_APP_TAG=$VITE_APP_TAG \
    VITE_APP_COMMIT=$VITE_APP_COMMIT

RUN bun run build

FROM oven/bun:1 AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

COPY package.json bun.lock bunfig.toml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY server.ts ./
COPY app ./app

EXPOSE 3000

CMD ["bun", "run", "server.ts"]
