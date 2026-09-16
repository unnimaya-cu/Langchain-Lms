# Minbar Backend

NestJS backend for Minbar — an educational platform / LMS providing REST APIs and WebSocket support for courses, assessments, and student tracking.

## Tech Stack

- **Runtime**: Node.js 18, TypeScript 5.1
- **Framework**: NestJS 10
- **Database**: MongoDB via Mongoose
- **Auth**: JWT + Passport (Local & JWT strategies), Argon2 for password hashing
- **Real-time**: Socket.IO
- **Docs**: Swagger/OpenAPI at `/api`
- **Storage**: AWS S3
- **Email**: SendGrid + Nodemailer
- **Scheduling**: `@nestjs/schedule`
- **Security**: Helmet, CORS, Throttler (rate limiting)
- **Validation**: class-validator, class-transformer

## Project Structure

```
src/
├── modules/        # Feature modules (auth, user, course, assessment, ...)
├── common/         # Decorators, interceptors, pipes, middlewares, websockets
├── database/
│   ├── mongodb/    # Mongoose schema registration
│   └── seed/       # Database seeding
├── utils/          # Email, validation, response builders
├── constants/
├── main.ts         # Bootstrap (CORS, Swagger, ValidationPipe)
└── app.module.ts   # Root module
```

Each feature module follows NestJS conventions: `controller.ts`, `service.ts`, `module.ts`, `dto/`, `schema/`.

## Commands

- `npm install` — install deps
- `npm run start:dev` — dev server with watch (port 3000)
- `npm run start:prod` — production
- `npm run build` — compile to `dist/`
- `npm run lint` — ESLint
- `npm run format` — Prettier
- `npm test` — Jest unit tests (`*.spec.ts`)
- `npm run test:e2e` — E2E tests (supertest)
- `npm run test:cov` — coverage
- `npm run seed` — seed database
- Docker: `docker build -t minbar-backend . && docker run -p 3000:3000 minbar-backend`

## Conventions

- API prefix: `/api` (set globally in [main.ts](src/main.ts))
- Use `responseBuilder` / `errorResponseBuilder` from `utils/` for consistent responses
- DTOs use class-validator decorators for request validation
- Swagger annotations (`@ApiTags`, `@ApiOperation`) on controllers
- Guards: `@UseGuards(AuthGuard('jwt'))` for protected routes
- Custom `@User()` decorator in [common/decorators](src/common/decorators/) extracts authenticated user

## Environment

Config loaded via `@nestjs/config` from `.env`. No `.env.example` — refer to actual `.env`. Key vars:

- `MONGODB_URI`
- `JWT_SECRET`, `JWT_EXPIRE`
- SendGrid / SMTP credentials
- AWS S3 credentials

CORS origins are hardcoded in [main.ts](src/main.ts) (localhost:5173/5174 + production domains).
