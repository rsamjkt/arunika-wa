# Image untuk menjalankan arunika-wa (Next.js) di Docker / Portainer.
# Pola non-standalone: build di dalam image lalu `next start` — sama persis
# dengan cara systemd menjalankannya, jadi perilaku runtime tak berubah.
FROM node:22-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
# Hanya yang diperlukan runtime (build + deps + aset statis + config).
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.ts ./next.config.ts
EXPOSE 4000
CMD ["npx", "next", "start", "-p", "4000"]
