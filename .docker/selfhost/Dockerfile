# Multi-stage Dockerfile for MadisBoard self-hosted deployment
# Builds the full monorepo inside Linux (avoids Windows bundler path issues)

# ============================================
# Stage 1: Install dependencies and build
# ============================================
FROM node:22-bookworm AS builder

WORKDIR /app

# Install Rust toolchain (needed for server-native NAPI module)
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain 1.92.0
ENV PATH="/root/.cargo/bin:$PATH"

# Enable corepack for yarn 4
RUN corepack enable

# Copy everything (filtered by .dockerignore)
COPY . .

# Install all dependencies
RUN yarn install

# Initialize workspace metadata
RUN yarn affine init

# Build the Rust native module for the current platform (x86_64-linux)
# napi build outputs server-native.node directly (from binaryName in package.json)
RUN cd packages/backend/native && \
  /app/node_modules/.bin/napi build --release --strip --no-const-enum && \
  ls -la *.node && \
  cp server-native.node server-native.x64.node && \
  cp server-native.node server-native.arm64.node && \
  cp server-native.node server-native.armv7.node

# Build server (produces dist/main.js with externalized npm deps)
RUN yarn affine build -p @madisboard/server

# Copy native binary into server dist (webpack node-loader may not emit it reliably)
RUN cp packages/backend/native/server-native.node packages/backend/server/dist/server-native.node && \
  cp packages/backend/native/server-native.node packages/backend/server/dist/server-native.x64.node && \
  cp packages/backend/native/server-native.node packages/backend/server/dist/server-native.arm64.node && \
  cp packages/backend/native/server-native.node packages/backend/server/dist/server-native.armv7.node

# Set GITHUB_SHA so html-plugin.ts doesn't need a .git directory
ENV GITHUB_SHA=5bd9b309a

# Build web frontend (needs extra heap for large webpack bundle)
RUN NODE_OPTIONS=--max-old-space-size=4096 yarn affine build -p @madisboard/web

# Build admin panel
RUN yarn affine build -p @madisboard/admin

# Note: We keep the full node_modules from yarn install above
# rather than using 'yarn workspaces focus' which can miss dynamically
# loaded dependencies required by NestJS at runtime

# Generate Prisma client
RUN cd packages/backend/server && npx prisma generate

# ============================================
# Stage 2: Runtime image
# ============================================
FROM node:22-bookworm-slim AS runner

WORKDIR /app

# Install minimal runtime dependencies
RUN apt-get update && \
  apt-get install -y --no-install-recommends openssl libjemalloc2 && \
  rm -rf /var/lib/apt/lists/*

# Enable jemalloc for better memory management
ENV LD_PRELOAD=libjemalloc.so.2

# Copy server build output
COPY --from=builder /app/packages/backend/server/dist ./dist
COPY --from=builder /app/packages/backend/server/scripts ./scripts
COPY --from=builder /app/packages/backend/server/schema.prisma ./schema.prisma
COPY --from=builder /app/packages/backend/server/migrations ./migrations
COPY --from=builder /app/packages/backend/server/package.json ./package.json

# Copy production node_modules (after workspaces focus --production)
COPY --from=builder /app/node_modules ./node_modules

# Copy frontend static assets
COPY --from=builder /app/packages/frontend/apps/web/dist ./static
COPY --from=builder /app/packages/frontend/admin/dist ./static/admin

# Set environment defaults
ENV NODE_ENV=production
ENV AFFINE_SERVER_PORT=3010
ENV AFFINE_INDEXER_ENABLED=false

EXPOSE 3010

CMD ["node", "./dist/main.js"]
