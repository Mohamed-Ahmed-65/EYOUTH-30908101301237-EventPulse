# EYOUTH-30908101301237-EventPulse

Event management API: public event discovery, JWT auth with admin/attendee roles, capacity-aware registrations, and Socket.io announcements that persist to MongoDB.

Interactive docs: `/api-docs`

## Stack

- Node.js, Express, Mongoose
- JWT + bcryptjs
- express-validator
- Socket.io
- Jest + Supertest + mongodb-memory-server
- Vercel (`vercel.json`) targeting this `server.js` entry

## Setup

```bash
cp .env.example .env
npm install
npm run seed
npm start
```

Required environment variables (see `.env.example`):

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port (default `3000`) |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Signing key for access tokens |
| `NODE_ENV` | `development`, `production`, or `test` |
| `SEED_ADMIN_EMAIL` | Admin created by `npm run seed` |
| `SEED_ADMIN_PASSWORD` | Plain password hashed on insert |

Seed is idempotent: it upserts three categories, two events, and one admin by unique name/email.

Default admin after seed:

- email: `admin@eventpulse.local`
- password: `AdminPass123`

## HTTP API

| Method | Path | Access |
| --- | --- | --- |
| `GET` | `/health` | Public |
| `POST` | `/auth/register` | Public (creates `attendee`) |
| `POST` | `/auth/login` | Public |
| `GET` | `/events` | Public (filters, search, sort, pagination) |
| `GET` | `/events/:id` | Public |
| `POST` | `/events` | Admin |
| `PUT` | `/events/:id` | Admin |
| `DELETE` | `/events/:id` | Admin |
| `GET` | `/events/:id/announcements` | Public |
| `POST` | `/registrations` | Authenticated |
| `GET` | `/registrations` | Authenticated (own records) |
| `DELETE` | `/registrations/:id` | Owner |

`GET /events` query params: `category`, `city`, `startDate`, `endDate`, `search`, `sort=date|popularity`, `page`, `limit`.

Response shape:

```json
{
  "status": "success",
  "events": [],
  "meta": { "totalEvents": 0, "currentPage": 1, "totalPages": 0, "limit": 10 }
}
```

Send `Authorization: Bearer <token>` on protected routes. Attendees receive `403` on event write routes.

Validation failures return `422` with `{ field, message }` entries. Duplicate email or duplicate registration returns `409`. A full event returns `409` with a clear message.

## Socket.io

Connect to the same HTTP origin. Optional handshake: `auth: { token }`.

| Event | Direction | Notes |
| --- | --- | --- |
| `joinRoom` | client → server | payload: event id string |
| `leaveRoom` | client → server | payload: event id string |
| `announce` | client → server | `{ eventId, text }` — admin JWT required; stored in `messages` |
| `announcement` | server → room | only sockets that joined that event id |
| `announceError` | server → sender | authorization or validation failure |

Vercel’s serverless runtime will serve REST (`/health`, CRUD, etc.). Persistent Socket.io connections need a long-running Node process (local `npm start` or a VM). The announcement history route still works on Vercel because messages are stored in MongoDB.

## Tests

```bash
npm test
```

- Unit: `AppError` status mapping, `asyncHandler` forwarding rejections to `next`
- Integration: attendee blocked from create, 422 on bad payloads, admin create, populated list, city/category/date filters, empty search results

## Postman

Import `postman/EventPulse.postman_collection.json` and `postman/EventPulse.postman_environment.json`. Shared variables: `base_url`, `auth_token`.

## Deploy

1. Create a MongoDB Atlas cluster and whitelist `0.0.0.0/0` (or Vercel egress) for the assignment review.
2. Push this repository to GitHub as **EYOUTH-30908101301237-EventPulse**.
3. Import the repo in Vercel. Set `MONGO_URI`, `JWT_SECRET`, and `NODE_ENV=production`.
4. Expected production host: `https://eyouth-30908101301237-eventpulse.vercel.app`
5. Confirm `GET /health` reports `database.connected: true`.

## Submission files

Place these at the repo root when the URLs are final (first line only):

- `github-link.txt` → `https://github.com/<user>/EYOUTH-30908101301237-EventPulse`
- `vercel-link.txt` → `https://eyouth-30908101301237-eventpulse.vercel.app`

## Test evidence

```text
$ npm test

PASS tests/integration/event.test.js
PASS tests/unit/utils.test.js

Test Suites: 2 passed, 2 total
Tests:       12 passed, 12 total
```
