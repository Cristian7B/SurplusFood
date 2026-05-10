# FoodBridge — Food Surplus Redistribution Platform

Mobile platform for real-time food surplus redistribution within a 3 km radius of Universidad Distrital Francisco José de Caldas.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React Native + Expo |
| Backend | NestJS (Node.js) |
| Database | PostgreSQL + PostGIS |
| Cache / Queue | Redis + Bull |
| Notifications | Firebase Cloud Messaging (FCM) |
| Containerization | Docker Compose |

## Project Structure
├── backend/        # NestJS API
├── frontend/       # React Native + Expo app
├── docs/           # Architecture diagrams, API docs
├── scripts/        # DB seeds, migration scripts
├── docker-compose.yml
├── .env.example
└── README.md

## Installation

**Prerequisites:** Node.js >= 18, Docker Desktop, Expo CLI (`npm install -g expo-cli`)

1. Switch to develop branch: `git checkout develop`
2. Copy env file: `cp .env.example .env`
3. Start database: `docker compose up -d`
4. Start backend: `cd backend && npm install && npm run start:dev`
5. Start frontend: `cd frontend && npm install && npx expo start`

## Running Tests

```bash
cd backend
npm run test
npm run test:e2e
```

## Code Conventions

- **Commits:** Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`)
- **Branches:** `feature/`, `fix/`, `docs/` prefixes
- **Linting:** ESLint + Prettier enforced via Husky pre-commit hook
- **PRs:** All PRs target `develop`, reviewed by at least one teammate