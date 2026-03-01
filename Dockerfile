# Stage 1: Install dependencies and build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace config and package files
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/

# Install all dependencies (including devDependencies for build)
RUN npm ci --workspace=packages/shared --workspace=packages/server --include-workspace-root

# Copy source code
COPY tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY packages/server/ packages/server/

# Build shared, then server
RUN npm run build -w packages/shared
RUN npm run build -w packages/server

# Stage 2: Production runtime
FROM node:20-alpine AS runtime

WORKDIR /app

# Copy workspace config and package files
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/

# Install production dependencies only
RUN npm ci --workspace=packages/shared --workspace=packages/server --include-workspace-root --omit=dev

# Copy built output from builder
COPY --from=builder /app/packages/shared/dist packages/shared/dist
COPY --from=builder /app/packages/server/dist packages/server/dist

ENV NODE_ENV=production
ENV PORT=2567

EXPOSE 2567

CMD ["node", "packages/server/dist/index.js"]
