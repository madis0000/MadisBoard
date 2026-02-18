# Dev Setup

Check and set up the development environment for MadisBoard.

## Steps

1. Verify prerequisites are installed:
   - Node.js (< 23.0.0, LTS preferred)
   - Rust toolchain (rustc, cargo)
   - Yarn 4.x (via corepack)
   - Docker (for backend services)

2. Run `yarn install` to install dependencies

3. Build native modules:
   - `yarn affine @affine/native build` (frontend native)
   - `yarn affine @affine/server-native build` (server native, if doing backend work)

4. For backend development, set up Docker services:
   - Copy `.docker/dev/compose.yml.example` to `.docker/dev/compose.yml`
   - Copy `.docker/dev/.env.example` to `.docker/dev/.env`
   - Run `docker compose -f .docker/dev/compose.yml up -d`
   - Run `yarn affine server init` to initialize the database

5. Report what's ready and what needs attention.
