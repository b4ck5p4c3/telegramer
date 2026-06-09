FROM node:25-slim
ENV NODE_ENV=production
WORKDIR /app
RUN ["npm", "install", "-g", "pnpm@latest-10"]
COPY ./package.json ./pnpm-lock.yaml ./
RUN ["pnpm", "install", "--frozen-lockfile"]
COPY . .
CMD ["pnpm", "run", "start"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD ["node", "bin/healthcheck"]