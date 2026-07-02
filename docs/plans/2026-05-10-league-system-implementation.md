# League System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the FastAPI backend with Express.js + TypeScript and implement the full league system as designed in `docs/plans/2026-05-05-league-system-design.md`.

**Architecture:** New Express.js backend lives in `backend-express/` alongside the existing `backend/`. The frontend gains React Router and league screens. MongoDB Atlas is already in place and supports transactions. The existing Python backend remains untouched until the new one is deployed and verified.

**Tech Stack:** Express.js, TypeScript, Mongoose, Zod (validation), Vitest + Supertest (tests), React Router v6, React + TypeScript + Tailwind (frontend)

---

## Open Issues (from design review — decide before implementing)

1. **`code_encrypted` in join codes** — Design stores both `code_hash` (verification) and `code_encrypted` (retrieval). Join codes are temporary revocable tokens, not passwords — plaintext storage is simpler and equally safe. Recommendation: store raw code as `code_plain` and hash only for lookup. Update the design before implementing Task 14.
2. **`resume` auth wording** — Auth rule says "active participants" but aborted games have no active participants. Implementation should check `participant_user_ids` array, not game status.
3. **`GET /join-code` with no active code** — Return `404` with `{ error: "no_active_code" }`.

---

## Pre-work A: Express Backend Scaffold

### Task 1: Initialize Express + TypeScript project

**Files:**
- Create: `backend-express/package.json`
- Create: `backend-express/tsconfig.json`
- Create: `backend-express/src/index.ts`
- Create: `backend-express/.env.example`
- Create: `backend-express/.gitignore`

**Step 1: Create the directory and package.json**

```bash
mkdir -p backend-express/src
cd backend-express
```

`backend-express/package.json`:
```json
{
  "name": "captin-calc-backend",
  "version": "1.0.0",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "express": "^4.19.2",
    "mongoose": "^8.4.0",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "zod": "^3.23.8",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "node-cron": "^3.0.3"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/bcryptjs": "^2.4.6",
    "@types/cors": "^2.8.17",
    "@types/node": "^20.14.0",
    "@types/node-cron": "^3.0.11",
    "@types/supertest": "^6.0.2",
    "tsx": "^4.15.6",
    "typescript": "^5.4.5",
    "supertest": "^7.0.0",
    "vitest": "^1.6.0"
  }
}
```

**Step 2: Create tsconfig.json**

`backend-express/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: Create `src/index.ts`**

```typescript
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './db';
import { authRouter } from './routes/auth';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT ?? 3000;

const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(',');
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);

app.use(errorHandler);

async function start() {
  await connectDB();
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

start();

export { app }; // exported for tests
```

**Step 4: Create `.env.example`**

```
MONGO_URL=mongodb+srv://<user>:<pass>@cluster.mongodb.net/?retryWrites=true&w=majority
MONGO_DB=captincalc
JWT_SECRET=change-me
JWT_EXPIRE_MINUTES=10080
CORS_ORIGINS=http://localhost:5173
PORT=3000
```

**Step 5: Create `.gitignore`**

```
node_modules/
dist/
.env
```

**Step 6: Install dependencies**

```bash
cd backend-express && npm install
```

**Step 7: Commit**

```bash
git add backend-express/
git commit -m "feat: scaffold Express + TypeScript backend"
```

---

### Task 2: Database connection + error handler middleware

**Files:**
- Create: `backend-express/src/db.ts`
- Create: `backend-express/src/middleware/errorHandler.ts`

**Step 1: Create `src/db.ts`**

```typescript
import mongoose from 'mongoose';

export async function connectDB() {
  const url = process.env.MONGO_URL;
  const db = process.env.MONGO_DB ?? 'captincalc';
  if (!url) throw new Error('MONGO_URL is required');
  await mongoose.connect(url, { dbName: db });
  console.log('MongoDB connected');
}
```

**Step 2: Create `src/middleware/errorHandler.ts`**

```typescript
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'validation_error', issues: err.issues });
  }
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(err);
  return res.status(500).json({ error: 'internal_server_error' });
}
```

**Step 3: Commit**

```bash
git add backend-express/src/
git commit -m "feat: add db connection and error handler"
```

---

## Pre-work B: Frontend Scaffold

### Task 3: Add React Router + auth gate + placeholder screens

**Files:**
- Modify: `package.json`
- Modify: `src/main.tsx`
- Create: `src/router.tsx`
- Create: `src/screens/AuthScreen.tsx`
- Create: `src/screens/HomeScreen.tsx`
- Create: `src/screens/LeagueModeScreen.tsx`
- Modify: `src/App.tsx`

**Step 1: Install React Router**

```bash
npm install react-router-dom
```

**Step 2: Create `src/router.tsx`**

```typescript
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { isLoggedIn } from './auth';
import App from './App';
import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import LeagueModeScreen from './screens/LeagueModeScreen';

function RequireAuth({ children }: { children: React.ReactNode }) {
  return isLoggedIn() ? <>{children}</> : <Navigate to="/auth" replace />;
}

export const router = createBrowserRouter([
  {
    path: '/auth',
    element: <AuthScreen />,
  },
  {
    path: '/',
    element: <RequireAuth><HomeScreen /></RequireAuth>,
  },
  {
    path: '/quick-game',
    element: <RequireAuth><App /></RequireAuth>,
  },
  {
    path: '/league',
    element: <RequireAuth><LeagueModeScreen /></RequireAuth>,
  },
]);
```

**Step 3: Update `src/main.tsx`**

```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
```

**Step 4: Create `src/screens/HomeScreen.tsx`** (entry split)

```typescript
import { useNavigate } from 'react-router-dom';
import { clearAuth, getDisplayName } from '../auth';

export default function HomeScreen() {
  const navigate = useNavigate();
  const name = getDisplayName();

  function logout() {
    clearAuth();
    navigate('/auth');
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-bold">Captain Calculator</h1>
      {name && <p className="text-gray-500">Welcome, {name}</p>}
      <button
        onClick={() => navigate('/quick-game')}
        className="w-64 py-4 bg-blue-600 text-white rounded-xl text-lg font-semibold"
      >
        Quick Game
      </button>
      <button
        onClick={() => navigate('/league')}
        className="w-64 py-4 bg-green-600 text-white rounded-xl text-lg font-semibold"
      >
        League Mode
      </button>
      <button onClick={logout} className="text-sm text-gray-400 underline mt-4">
        Log out
      </button>
    </div>
  );
}
```

**Step 5: Create `src/screens/AuthScreen.tsx`** (placeholder — full impl in Task 9)

```typescript
export default function AuthScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Auth screen — coming in Task 9</p>
    </div>
  );
}
```

**Step 6: Create `src/screens/LeagueModeScreen.tsx`** (placeholder)

```typescript
export default function LeagueModeScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">League Mode — coming soon</p>
    </div>
  );
}
```

**Step 7: Commit**

```bash
git add src/
git commit -m "feat: add React Router + home screen + auth gate"
```

---

## Phase 1: Auth

### Task 4: User model + auth service

**Files:**
- Create: `backend-express/src/models/User.ts`
- Create: `backend-express/src/services/authService.ts`

**Step 1: Create `src/models/User.ts`**

```typescript
import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  username: string;
  display_name: string;
  password_hash: string;
  created_at: Date;
}

const UserSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  display_name: { type: String, required: true, trim: true },
  password_hash: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
});

export const User = mongoose.model<IUser>('User', UserSchema);
```

**Step 2: Create `src/services/authService.ts`**

```typescript
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET!;
const EXPIRE_MINUTES = parseInt(process.env.JWT_EXPIRE_MINUTES ?? '10080');

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function createToken(username: string): string {
  return jwt.sign({ sub: username }, SECRET, { expiresIn: EXPIRE_MINUTES * 60 });
}

export function decodeToken(token: string): string {
  const payload = jwt.verify(token, SECRET) as { sub: string };
  return payload.sub;
}
```

**Step 3: Write the test first**

Create `backend-express/src/services/__tests__/authService.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, createToken, decodeToken } from '../authService';

process.env.JWT_SECRET = 'test-secret';

describe('authService', () => {
  it('hashes and verifies a password', async () => {
    const hash = await hashPassword('mypassword');
    expect(await verifyPassword('mypassword', hash)).toBe(true);
    expect(await verifyPassword('wrongpassword', hash)).toBe(false);
  });

  it('creates and decodes a JWT token', () => {
    const token = createToken('alice');
    expect(decodeToken(token)).toBe('alice');
  });

  it('throws on invalid token', () => {
    expect(() => decodeToken('invalid.token.here')).toThrow();
  });
});
```

**Step 4: Run test — expect FAIL**

```bash
cd backend-express && npm test
```

Expected: FAIL — `authService` module not found

**Step 5: Run test again after creating the files**

```bash
npm test
```

Expected: PASS

**Step 6: Commit**

```bash
git add backend-express/src/
git commit -m "feat: add User model and authService"
```

---

### Task 5: Auth middleware

**Files:**
- Create: `backend-express/src/middleware/auth.ts`

**Step 1: Write the test**

Create `backend-express/src/middleware/__tests__/auth.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { requireAuth } from '../auth';
import { createToken } from '../../services/authService';

process.env.JWT_SECRET = 'test-secret';

const app = express();
app.get('/protected', requireAuth, (req: any, res) => {
  res.json({ username: req.username });
});

describe('requireAuth middleware', () => {
  it('rejects requests with no token', async () => {
    const res = await request(app).get('/protected');
    expect(res.status).toBe(401);
  });

  it('rejects requests with invalid token', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer badtoken');
    expect(res.status).toBe(401);
  });

  it('passes through valid token and sets req.username', async () => {
    const token = createToken('alice');
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.username).toBe('alice');
  });
});
```

**Step 2: Run test — expect FAIL**

```bash
npm test
```

**Step 3: Create `src/middleware/auth.ts`**

```typescript
import { Request, Response, NextFunction } from 'express';
import { decodeToken } from '../services/authService';

export interface AuthRequest extends Request {
  username?: string;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  try {
    req.username = decodeToken(header.slice(7));
    next();
  } catch {
    return res.status(401).json({ error: 'invalid_token' });
  }
}
```

**Step 4: Run test — expect PASS**

```bash
npm test
```

**Step 5: Commit**

```bash
git add backend-express/src/
git commit -m "feat: add requireAuth middleware"
```

---

### Task 6: Auth routes (register, login, me)

**Files:**
- Create: `backend-express/src/routes/auth.ts`
- Modify: `backend-express/src/index.ts`

**Step 1: Write the test**

Create `backend-express/src/routes/__tests__/auth.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../../index';

// Note: install mongodb-memory-server: npm install -D mongodb-memory-server

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGO_URL = mongo.getUri();
  process.env.MONGO_DB = 'test';
  process.env.JWT_SECRET = 'test-secret';
  const { connectDB } = await import('../../db');
  await connectDB();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe('POST /api/auth/register', () => {
  it('registers a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'alice', display_name: 'Alice', password: 'pass123' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.display_name).toBe('Alice');
  });

  it('rejects duplicate username', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'bob', display_name: 'Bob', password: 'pass123' });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'bob', display_name: 'Bob2', password: 'pass456' });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  it('returns token for valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'alice', password: 'pass123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('rejects invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'alice', password: 'wrongpass' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns user info for authenticated user', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'alice', password: 'pass123' });
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${loginRes.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.username).toBe('alice');
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
```

**Step 2: Install test dependency**

```bash
npm install -D mongodb-memory-server
```

**Step 3: Run test — expect FAIL**

```bash
npm test
```

**Step 4: Create `src/routes/auth.ts`**

```typescript
import { Router } from 'express';
import { z } from 'zod';
import { User } from '../models/User';
import { hashPassword, verifyPassword, createToken } from '../services/authService';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const authRouter = Router();

const RegisterSchema = z.object({
  username: z.string().min(2).max(30),
  display_name: z.string().min(1).max(50),
  password: z.string().min(6),
});

const LoginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

authRouter.post('/register', async (req, res, next) => {
  try {
    const body = RegisterSchema.parse(req.body);
    const existing = await User.findOne({ username: body.username.toLowerCase() });
    if (existing) throw new AppError(409, 'username_taken');
    const password_hash = await hashPassword(body.password);
    const user = await User.create({
      username: body.username.toLowerCase(),
      display_name: body.display_name,
      password_hash,
    });
    const token = createToken(user.username);
    res.status(201).json({ token, display_name: user.display_name });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const body = LoginSchema.parse(req.body);
    const user = await User.findOne({ username: body.username.toLowerCase() });
    if (!user || !(await verifyPassword(body.password, user.password_hash))) {
      throw new AppError(401, 'invalid_credentials');
    }
    const token = createToken(user.username);
    res.json({ token, display_name: user.display_name });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const user = await User.findOne({ username: req.username });
    if (!user) throw new AppError(404, 'user_not_found');
    res.json({ username: user.username, display_name: user.display_name });
  } catch (err) {
    next(err);
  }
});
```

**Step 5: Register router in `src/index.ts`** — already done in Task 1.

**Step 6: Run tests — expect PASS**

```bash
npm test
```

**Step 7: Commit**

```bash
git add backend-express/src/
git commit -m "feat: auth routes — register, login, me"
```

---

### Task 7: Port existing routes (players, games, dashboard)

**Files:**
- Create: `backend-express/src/routes/players.ts`
- Create: `backend-express/src/routes/games.ts`
- Create: `backend-express/src/routes/dashboard.ts`
- Create: `backend-express/src/models/Player.ts`
- Create: `backend-express/src/models/GameSession.ts`
- Modify: `backend-express/src/index.ts`

**Step 1: Create `src/models/Player.ts`**

```typescript
import mongoose, { Document, Schema } from 'mongoose';

export interface IPlayer extends Document {
  name: string;
  photo_url: string | null;
  created_at: Date;
}

const PlayerSchema = new Schema<IPlayer>({
  name: { type: String, required: true },
  photo_url: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
});

export const Player = mongoose.model<IPlayer>('Player', PlayerSchema, 'players');
```

**Step 2: Create `src/models/GameSession.ts`**

```typescript
import mongoose, { Document, Schema } from 'mongoose';

export interface IGameSession extends Document {
  date: Date;
  player_ids: string[];
  rounds: Record<string, unknown>[];
}

const GameSessionSchema = new Schema<IGameSession>(
  {
    date: { type: Date, default: Date.now },
    player_ids: [String],
    rounds: [Schema.Types.Mixed],
  },
  { strict: false }
);

export const GameSession = mongoose.model<IGameSession>(
  'GameSession',
  GameSessionSchema,
  'game_sessions'
);
```

**Step 3: Create `src/routes/players.ts`** (same contract as existing FastAPI `/players`)

```typescript
import { Router } from 'express';
import { z } from 'zod';
import { Player } from '../models/Player';
import { requireAuth } from '../middleware/auth';

export const playersRouter = Router();

playersRouter.get('/public', async (_req, res, next) => {
  try {
    const players = await Player.find({}, { name: 1, photo_url: 1 });
    res.json(players.map(p => ({ id: p._id, name: p.name, photo_url: p.photo_url })));
  } catch (err) {
    next(err);
  }
});

const CreatePlayerSchema = z.object({
  name: z.string().min(1),
  photo_url: z.string().url().optional(),
});

playersRouter.post('/public', requireAuth, async (req, res, next) => {
  try {
    const body = CreatePlayerSchema.parse(req.body);
    const player = await Player.create({ name: body.name, photo_url: body.photo_url ?? null });
    res.status(201).json({ id: player._id, name: player.name, photo_url: player.photo_url });
  } catch (err) {
    next(err);
  }
});
```

**Step 4: Create `src/routes/games.ts`**

```typescript
import { Router } from 'express';
import { z } from 'zod';
import { GameSession } from '../models/GameSession';
import { requireAuth } from '../middleware/auth';

export const gamesRouter = Router();

const RoundSchema = z.object({
  round_number: z.number(),
  captain_id: z.string(),
  representative_id: z.string(),
  winner: z.enum(['captain', 'teamB']),
  win_type: z.enum(['normal', 'mars', 'turkish']),
  final_stake: z.number(),
  doublings: z.number(),
  first_doubler: z.string().nullable(),
  removed_player_ids: z.array(z.string()),
  balance_changes: z.record(z.number()),
});

const SaveGameSchema = z.object({
  player_ids: z.array(z.string()),
  rounds: z.array(RoundSchema),
});

gamesRouter.post('', requireAuth, async (req, res, next) => {
  try {
    const body = SaveGameSchema.parse(req.body);
    const session = await GameSession.create({ player_ids: body.player_ids, rounds: body.rounds });
    res.status(201).json({ id: session._id });
  } catch (err) {
    next(err);
  }
});
```

**Step 5: Create `src/routes/dashboard.ts`**

```typescript
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import mongoose from 'mongoose';

export const dashboardRouter = Router();

dashboardRouter.get('', requireAuth, async (_req, res, next) => {
  try {
    const db = mongoose.connection.db!;
    const sessions = await db.collection('game_sessions').find({}).toArray();
    const players = await db.collection('players').find({}).toArray();

    const playerMap = new Map(players.map(p => [String(p._id), p]));
    const stats: Record<string, {
      id: string; name: string; photo_url: string | null;
      games_played: number; total_balance: number; wins: number; losses: number;
      rounds_as_captain: number; wins_as_captain: number;
      rounds_as_teamb: number; wins_as_teamb: number;
      rounds_played: number; total_stake: number;
      biggest_win: number | null; biggest_loss: number | null;
    }> = {};

    for (const session of sessions) {
      for (const round of (session.rounds ?? [])) {
        const changes: Record<string, number> = round.balance_changes ?? {};
        for (const [pid, change] of Object.entries(changes)) {
          if (!stats[pid]) {
            const p = playerMap.get(pid);
            stats[pid] = {
              id: pid, name: p?.name ?? 'Unknown', photo_url: p?.photo_url ?? null,
              games_played: 0, total_balance: 0, wins: 0, losses: 0,
              rounds_as_captain: 0, wins_as_captain: 0,
              rounds_as_teamb: 0, wins_as_teamb: 0,
              rounds_played: 0, total_stake: 0,
              biggest_win: null, biggest_loss: null,
            };
          }
          const s = stats[pid];
          s.rounds_played++;
          s.total_balance += change as number;
          s.total_stake += round.final_stake ?? 0;
          if ((change as number) > 0) s.wins++;
          else if ((change as number) < 0) s.losses++;
          if ((change as number) > 0 && (s.biggest_win === null || (change as number) > s.biggest_win)) s.biggest_win = change as number;
          if ((change as number) < 0 && (s.biggest_loss === null || (change as number) < s.biggest_loss)) s.biggest_loss = change as number;
          if (round.captain_id === pid) {
            s.rounds_as_captain++;
            if (round.winner === 'captain') s.wins_as_captain++;
          } else {
            s.rounds_as_teamb++;
            if (round.winner === 'teamB') s.wins_as_teamb++;
          }
        }
      }
      const participantIds: string[] = session.player_ids ?? [];
      for (const pid of participantIds) {
        if (stats[pid]) stats[pid].games_played++;
      }
    }

    const result = Object.values(stats).map(s => ({
      ...s,
      avg_stake: s.rounds_played > 0 ? s.total_stake / s.rounds_played : 0,
      captain_win_rate: s.rounds_as_captain > 0 ? s.wins_as_captain / s.rounds_as_captain : null,
      teamb_win_rate: s.rounds_as_teamb > 0 ? s.wins_as_teamb / s.rounds_as_teamb : null,
      first_double_win_rate: null,
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
});
```

**Step 6: Register all routers in `src/index.ts`**

```typescript
// Add after authRouter line:
import { playersRouter } from './routes/players';
import { gamesRouter } from './routes/games';
import { dashboardRouter } from './routes/dashboard';

app.use('/api/players', playersRouter);
app.use('/api/games', gamesRouter);
app.use('/api/dashboard', dashboardRouter);
```

**Step 7: Commit**

```bash
git add backend-express/src/
git commit -m "feat: port players, games, dashboard routes to Express"
```

---

## Phase 1: Leagues

### Task 8: League model + CRUD routes

**Files:**
- Create: `backend-express/src/models/League.ts`
- Create: `backend-express/src/models/LeagueMember.ts`
- Create: `backend-express/src/routes/leagues.ts`
- Modify: `backend-express/src/index.ts`

**Step 1: Create `src/models/League.ts`**

```typescript
import mongoose, { Document, Schema } from 'mongoose';

export interface ILeague extends Document {
  name: string;
  created_by: string; // username
  status: 'active';
  created_at: Date;
}

const LeagueSchema = new Schema<ILeague>({
  name: { type: String, required: true, trim: true },
  created_by: { type: String, required: true },
  status: { type: String, default: 'active' },
  created_at: { type: Date, default: Date.now },
});

LeagueSchema.index({ created_by: 1 });

export const League = mongoose.model<ILeague>('League', LeagueSchema);
```

**Step 2: Create `src/models/LeagueMember.ts`**

```typescript
import mongoose, { Document, Schema } from 'mongoose';

export interface ILeagueMember extends Document {
  league_id: mongoose.Types.ObjectId;
  user_id: string; // username
  joined_at: Date;
  left_at: Date | null;
  rejoined_at: Date | null;
  is_active: boolean;
}

const LeagueMemberSchema = new Schema<ILeagueMember>({
  league_id: { type: Schema.Types.ObjectId, required: true, ref: 'League' },
  user_id: { type: String, required: true },
  joined_at: { type: Date, default: Date.now },
  left_at: { type: Date, default: null },
  rejoined_at: { type: Date, default: null },
  is_active: { type: Boolean, default: true },
});

LeagueMemberSchema.index({ league_id: 1, user_id: 1 }, { unique: true });
LeagueMemberSchema.index({ user_id: 1, is_active: 1 });

export const LeagueMember = mongoose.model<ILeagueMember>('LeagueMember', LeagueMemberSchema);
```

**Step 3: Create `src/routes/leagues.ts`**

```typescript
import { Router } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { League } from '../models/League';
import { LeagueMember } from '../models/LeagueMember';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const leaguesRouter = Router();
leaguesRouter.use(requireAuth);

// Helper: verify caller is an active member of the league
async function assertActiveMember(leagueId: string, username: string) {
  if (!mongoose.isValidObjectId(leagueId)) throw new AppError(404, 'league_not_found');
  const member = await LeagueMember.findOne({
    league_id: leagueId,
    user_id: username,
    is_active: true,
  });
  if (!member) throw new AppError(403, 'not_a_member');
  return member;
}

// POST /leagues — create
leaguesRouter.post('/', async (req: AuthRequest, res, next) => {
  try {
    const { name } = z.object({ name: z.string().min(1).max(60) }).parse(req.body);
    const league = await League.create({ name, created_by: req.username });
    // Creator automatically becomes a member
    await LeagueMember.create({ league_id: league._id, user_id: req.username });
    res.status(201).json({ id: league._id, name: league.name, created_by: league.created_by });
  } catch (err) {
    next(err);
  }
});

// GET /leagues — my leagues
leaguesRouter.get('/', async (req: AuthRequest, res, next) => {
  try {
    const memberships = await LeagueMember.find({ user_id: req.username, is_active: true });
    const leagueIds = memberships.map(m => m.league_id);
    const leagues = await League.find({ _id: { $in: leagueIds } });
    res.json(leagues.map(l => ({ id: l._id, name: l.name, created_by: l.created_by })));
  } catch (err) {
    next(err);
  }
});

// GET /leagues/:id
leaguesRouter.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    await assertActiveMember(req.params.id, req.username!);
    const league = await League.findById(req.params.id);
    if (!league) throw new AppError(404, 'league_not_found');
    res.json({ id: league._id, name: league.name, created_by: league.created_by });
  } catch (err) {
    next(err);
  }
});

// PATCH /leagues/:id — rename (any active member)
leaguesRouter.patch('/:id', async (req: AuthRequest, res, next) => {
  try {
    await assertActiveMember(req.params.id, req.username!);
    const { name } = z.object({ name: z.string().min(1).max(60) }).parse(req.body);
    const league = await League.findByIdAndUpdate(req.params.id, { name }, { new: true });
    if (!league) throw new AppError(404, 'league_not_found');
    res.json({ id: league._id, name: league.name });
  } catch (err) {
    next(err);
  }
});
```

**Step 4: Register in `src/index.ts`**

```typescript
import { leaguesRouter } from './routes/leagues';
app.use('/api/leagues', leaguesRouter);
```

**Step 5: Write test**

Create `backend-express/src/routes/__tests__/leagues.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../../index';

let mongo: MongoMemoryServer;
let token: string;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGO_URL = mongo.getUri();
  process.env.MONGO_DB = 'test';
  process.env.JWT_SECRET = 'test-secret';
  const { connectDB } = await import('../../db');
  await connectDB();
  // Register a user
  const res = await request(app)
    .post('/api/auth/register')
    .send({ username: 'alice', display_name: 'Alice', password: 'pass123' });
  token = res.body.token;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe('League CRUD', () => {
  it('creates a league and joins creator as member', async () => {
    const res = await request(app)
      .post('/api/leagues')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test League' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Test League');
    expect(res.body.created_by).toBe('alice');
  });

  it('lists my leagues', async () => {
    const res = await request(app)
      .get('/api/leagues')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('renames a league', async () => {
    const create = await request(app)
      .post('/api/leagues')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Old Name' });
    const id = create.body.id;
    const res = await request(app)
      .patch(`/api/leagues/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Name' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('New Name');
  });

  it('rejects non-member from renaming', async () => {
    const create = await request(app)
      .post('/api/leagues')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Protected League' });
    // Register another user
    const bobRes = await request(app)
      .post('/api/auth/register')
      .send({ username: 'bob', display_name: 'Bob', password: 'pass123' });
    const res = await request(app)
      .patch(`/api/leagues/${create.body.id}`)
      .set('Authorization', `Bearer ${bobRes.body.token}`)
      .send({ name: 'Hacked' });
    expect(res.status).toBe(403);
  });
});
```

**Step 6: Run tests — expect PASS**

```bash
npm test
```

**Step 7: Commit**

```bash
git add backend-express/src/
git commit -m "feat: league create/list/get/rename routes"
```

---

### Task 9: Membership routes (list members, self-leave)

**Files:**
- Create: `backend-express/src/routes/membership.ts`
- Modify: `backend-express/src/index.ts`

**Step 1: Create `src/routes/membership.ts`**

```typescript
import { Router } from 'express';
import mongoose from 'mongoose';
import { LeagueMember } from '../models/LeagueMember';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const membershipRouter = Router({ mergeParams: true });
membershipRouter.use(requireAuth);

async function assertActiveMember(leagueId: string, username: string) {
  if (!mongoose.isValidObjectId(leagueId)) throw new AppError(404, 'league_not_found');
  const member = await LeagueMember.findOne({ league_id: leagueId, user_id: username, is_active: true });
  if (!member) throw new AppError(403, 'not_a_member');
  return member;
}

// GET /leagues/:id/members
membershipRouter.get('/', async (req: AuthRequest, res, next) => {
  try {
    await assertActiveMember(req.params.id, req.username!);
    const members = await LeagueMember.find({ league_id: req.params.id, is_active: true });
    res.json(members.map(m => ({ user_id: m.user_id, joined_at: m.joined_at })));
  } catch (err) {
    next(err);
  }
});

// POST /leagues/:id/leave
membershipRouter.post('/leave', async (req: AuthRequest, res, next) => {
  try {
    const member = await assertActiveMember(req.params.id, req.username!);
    await LeagueMember.findByIdAndUpdate(member._id, {
      is_active: false,
      left_at: new Date(),
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
```

**Step 2: Mount in `src/index.ts`**

```typescript
import { membershipRouter } from './routes/membership';
app.use('/api/leagues/:id', membershipRouter);
```

**Step 3: Commit**

```bash
git add backend-express/src/
git commit -m "feat: membership list and self-leave routes"
```

---

### Task 10: Personal invites routes

**Files:**
- Create: `backend-express/src/models/LeagueInvite.ts`
- Create: `backend-express/src/routes/invites.ts`
- Modify: `backend-express/src/index.ts`

**Step 1: Create `src/models/LeagueInvite.ts`**

```typescript
import mongoose, { Document, Schema } from 'mongoose';

export interface ILeagueInvite extends Document {
  league_id: mongoose.Types.ObjectId;
  invited_by: string;
  invitee_username: string;
  token: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  expires_at: Date;
  created_at: Date;
}

const LeagueInviteSchema = new Schema<ILeagueInvite>({
  league_id: { type: Schema.Types.ObjectId, required: true, ref: 'League' },
  invited_by: { type: String, required: true },
  invitee_username: { type: String, required: true },
  token: { type: String, required: true, unique: true },
  status: { type: String, enum: ['pending', 'accepted', 'revoked', 'expired'], default: 'pending' },
  expires_at: { type: Date, required: true },
  created_at: { type: Date, default: Date.now },
});

LeagueInviteSchema.index({ league_id: 1, status: 1 });

export const LeagueInvite = mongoose.model<ILeagueInvite>('LeagueInvite', LeagueInviteSchema);
```

**Step 2: Create `src/routes/invites.ts`**

```typescript
import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { LeagueInvite } from '../models/LeagueInvite';
import { LeagueMember } from '../models/LeagueMember';
import { User } from '../models/User';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const invitesRouter = Router({ mergeParams: true });
invitesRouter.use(requireAuth);

async function assertActiveMember(leagueId: string, username: string) {
  if (!mongoose.isValidObjectId(leagueId)) throw new AppError(404, 'league_not_found');
  const m = await LeagueMember.findOne({ league_id: leagueId, user_id: username, is_active: true });
  if (!m) throw new AppError(403, 'not_a_member');
}

// POST /leagues/:id/invites — create personal invite
invitesRouter.post('/', async (req: AuthRequest, res, next) => {
  try {
    await assertActiveMember(req.params.id, req.username!);
    const { invitee_username } = z.object({ invitee_username: z.string().min(1) }).parse(req.body);

    const invitee = await User.findOne({ username: invitee_username.toLowerCase() });
    if (!invitee) throw new AppError(404, 'user_not_found');

    const token = crypto.randomBytes(24).toString('hex');
    const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invite = await LeagueInvite.create({
      league_id: req.params.id,
      invited_by: req.username,
      invitee_username: invitee_username.toLowerCase(),
      token,
      expires_at,
    });

    res.status(201).json({ token: invite.token, expires_at: invite.expires_at });
  } catch (err) {
    next(err);
  }
});

// GET /leagues/:id/invites — my sent invites
invitesRouter.get('/', async (req: AuthRequest, res, next) => {
  try {
    await assertActiveMember(req.params.id, req.username!);
    const statusFilter = (req.query.status as string) ?? 'pending';
    const invites = await LeagueInvite.find({
      league_id: req.params.id,
      invited_by: req.username,
      status: statusFilter,
    });
    res.json(invites.map(i => ({
      token: i.token,
      invitee_username: i.invitee_username,
      status: i.status,
      expires_at: i.expires_at,
    })));
  } catch (err) {
    next(err);
  }
});

// POST /invites/:token/accept — accept an invite (standalone route, not nested)
export const acceptInviteRouter = Router();
acceptInviteRouter.use(requireAuth);

acceptInviteRouter.post('/:token/accept', async (req: AuthRequest, res, next) => {
  try {
    const invite = await LeagueInvite.findOne({ token: req.params.token });
    if (!invite) throw new AppError(404, 'invite_not_found');
    if (invite.status !== 'pending') throw new AppError(409, 'invite_not_pending');
    if (invite.expires_at < new Date()) {
      await LeagueInvite.findByIdAndUpdate(invite._id, { status: 'expired' });
      throw new AppError(410, 'invite_expired');
    }
    if (invite.invitee_username !== req.username) throw new AppError(403, 'invite_not_for_you');

    // Reactivate or create membership
    const existing = await LeagueMember.findOne({ league_id: invite.league_id, user_id: req.username });
    if (existing) {
      await LeagueMember.findByIdAndUpdate(existing._id, {
        is_active: true,
        rejoined_at: new Date(),
        left_at: null,
      });
    } else {
      await LeagueMember.create({ league_id: invite.league_id, user_id: req.username });
    }

    await LeagueInvite.findByIdAndUpdate(invite._id, { status: 'accepted' });
    res.json({ ok: true, league_id: invite.league_id });
  } catch (err) {
    next(err);
  }
});
```

**Step 3: Mount in `src/index.ts`**

```typescript
import { invitesRouter, acceptInviteRouter } from './routes/invites';
app.use('/api/leagues/:id/invites', invitesRouter);
app.use('/api/invites', acceptInviteRouter);
```

**Step 4: Commit**

```bash
git add backend-express/src/
git commit -m "feat: league invite create, list, and accept routes"
```

---

### Task 11: Join codes routes

**Files:**
- Create: `backend-express/src/models/LeagueJoinCode.ts`
- Create: `backend-express/src/routes/joinCodes.ts`
- Modify: `backend-express/src/index.ts`

**Step 1: Create `src/models/LeagueJoinCode.ts`**

```typescript
import mongoose, { Document, Schema } from 'mongoose';

export interface ILeagueJoinCode extends Document {
  league_id: mongoose.Types.ObjectId;
  code: string;       // plaintext — stored directly (revocable temporary token, not a password)
  code_hash: string;  // sha256 for lookup without exposing plaintext in queries
  status: 'active' | 'revoked' | 'expired';
  expires_at: Date;
  created_by: string;
  created_at: Date;
}

const LeagueJoinCodeSchema = new Schema<ILeagueJoinCode>({
  league_id: { type: Schema.Types.ObjectId, required: true, ref: 'League' },
  code: { type: String, required: true },
  code_hash: { type: String, required: true },
  status: { type: String, enum: ['active', 'revoked', 'expired'], default: 'active' },
  expires_at: { type: Date, required: true },
  created_by: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
});

// Enforce one active code per league
LeagueJoinCodeSchema.index(
  { league_id: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } }
);

export const LeagueJoinCode = mongoose.model<ILeagueJoinCode>('LeagueJoinCode', LeagueJoinCodeSchema);
```

**Step 2: Create `src/routes/joinCodes.ts`**

```typescript
import { Router } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { LeagueJoinCode } from '../models/LeagueJoinCode';
import { LeagueMember } from '../models/LeagueMember';
import { League } from '../models/League';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';

export const joinCodesRouter = Router({ mergeParams: true });
joinCodesRouter.use(requireAuth);

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

async function assertActiveMember(leagueId: string, username: string) {
  if (!mongoose.isValidObjectId(leagueId)) throw new AppError(404, 'league_not_found');
  const m = await LeagueMember.findOne({ league_id: leagueId, user_id: username, is_active: true });
  if (!m) throw new AppError(403, 'not_a_member');
}

// GET /leagues/:id/join-code
joinCodesRouter.get('/', async (req: AuthRequest, res, next) => {
  try {
    await assertActiveMember(req.params.id, req.username!);
    const active = await LeagueJoinCode.findOne({ league_id: req.params.id, status: 'active' });
    if (!active) return res.status(404).json({ error: 'no_active_code' });
    res.json({ code: active.code, expires_at: active.expires_at });
  } catch (err) {
    next(err);
  }
});

// POST /leagues/:id/join-code — create or rotate
joinCodesRouter.post('/', async (req: AuthRequest, res, next) => {
  try {
    await assertActiveMember(req.params.id, req.username!);
    // Revoke existing active code
    await LeagueJoinCode.updateMany(
      { league_id: req.params.id, status: 'active' },
      { status: 'revoked' }
    );
    const code = crypto.randomBytes(4).toString('hex').toUpperCase(); // e.g. "A1B2C3D4"
    const expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    const doc = await LeagueJoinCode.create({
      league_id: req.params.id,
      code,
      code_hash: hashCode(code),
      expires_at,
      created_by: req.username,
    });
    res.status(201).json({ code: doc.code, expires_at: doc.expires_at });
  } catch (err) {
    next(err);
  }
});

// DELETE /leagues/:id/join-code — revoke
joinCodesRouter.delete('/', async (req: AuthRequest, res, next) => {
  try {
    await assertActiveMember(req.params.id, req.username!);
    await LeagueJoinCode.updateMany({ league_id: req.params.id, status: 'active' }, { status: 'revoked' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Standalone join routes (not nested under league)
export const joinRouter = Router();
joinRouter.use(requireAuth);

// POST /leagues/join/preview
joinRouter.post('/preview', async (req: AuthRequest, res, next) => {
  try {
    const { code } = z.object({ code: z.string() }).parse(req.body);
    const codeHash = hashCode(code.toUpperCase());
    const joinCode = await LeagueJoinCode.findOne({ code_hash: codeHash, status: 'active' });
    if (!joinCode || joinCode.expires_at < new Date()) {
      throw new AppError(404, 'code_not_found');
    }
    const league = await League.findById(joinCode.league_id);
    if (!league) throw new AppError(404, 'league_not_found');
    const memberCount = await LeagueMember.countDocuments({ league_id: joinCode.league_id, is_active: true });
    res.json({
      league_id: league._id,
      league_name: league.name,
      member_count: memberCount,
      expires_at: joinCode.expires_at,
    });
  } catch (err) {
    next(err);
  }
});

// POST /leagues/join — confirm join
joinRouter.post('/confirm', async (req: AuthRequest, res, next) => {
  try {
    const { code } = z.object({ code: z.string() }).parse(req.body);
    const codeHash = hashCode(code.toUpperCase());
    const joinCode = await LeagueJoinCode.findOne({ code_hash: codeHash, status: 'active' });
    if (!joinCode || joinCode.expires_at < new Date()) {
      throw new AppError(404, 'code_not_found');
    }
    const existing = await LeagueMember.findOne({ league_id: joinCode.league_id, user_id: req.username });
    if (existing) {
      if (existing.is_active) throw new AppError(409, 'already_a_member');
      await LeagueMember.findByIdAndUpdate(existing._id, { is_active: true, rejoined_at: new Date(), left_at: null });
    } else {
      await LeagueMember.create({ league_id: joinCode.league_id, user_id: req.username });
    }
    res.json({ ok: true, league_id: joinCode.league_id });
  } catch (err) {
    next(err);
  }
});
```

**Step 3: Mount in `src/index.ts`**

```typescript
import { joinCodesRouter, joinRouter } from './routes/joinCodes';
app.use('/api/leagues/:id/join-code', joinCodesRouter);
app.use('/api/leagues/join', joinRouter);
```

**Step 4: Commit**

```bash
git add backend-express/src/
git commit -m "feat: join code create/rotate/revoke/preview/confirm routes"
```

---

### Task 12: Update render.yaml + deploy Phase 1

**Files:**
- Modify: `render.yaml`

**Step 1: Update `render.yaml`**

```yaml
services:
  - type: web
    name: captin-calc-backend
    runtime: node
    rootDir: backend-express
    buildCommand: npm install && npm run build
    startCommand: node dist/index.js
    envVars:
      - key: MONGO_URL
        sync: false
      - key: MONGO_DB
        value: captincalc
      - key: JWT_SECRET
        sync: false
      - key: JWT_EXPIRE_MINUTES
        value: "10080"
      - key: CORS_ORIGINS
        sync: false
      - key: PORT
        value: "3000"
```

**Step 2: Commit**

```bash
git add render.yaml
git commit -m "chore: update render.yaml for Express backend"
```

**Step 3: Push and verify deploy on Render**

```bash
git push origin main
```

Check Render dashboard — wait for green deploy. Test:
```bash
curl https://<your-render-url>/health
# Expected: {"ok":true}
```

---

### Task 13: Frontend auth screen (login + register)

**Files:**
- Modify: `src/screens/AuthScreen.tsx`
- Modify: `src/api.ts`

**Step 1: Add register endpoint to `src/api.ts`**

```typescript
// Add to api object:
register: (username: string, display_name: string, password: string) =>
  request<{ token: string; display_name: string }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, display_name, password }),
  }),

me: () => request<{ username: string; display_name: string }>('/auth/me'),
```

**Step 2: Implement `src/screens/AuthScreen.tsx`**

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { saveAuth } from '../auth';

type Mode = 'login' | 'register';

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let token: string, display_name: string;
      if (mode === 'login') {
        ({ token, display_name } = await api.login(username, password));
      } else {
        ({ token, display_name } = await api.register(username, displayName, password));
      }
      saveAuth(token, display_name);
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">Captain Calculator</h1>
        <div className="flex gap-2 mb-6">
          {(['login', 'register'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2 rounded-lg capitalize ${mode === m ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              {m}
            </button>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Username"
            required
            className="border rounded-lg px-3 py-2"
          />
          {mode === 'register' && (
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Display name"
              required
              className="border rounded-lg px-3 py-2"
            />
          )}
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="border rounded-lg px-3 py-2"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white py-2 rounded-lg disabled:opacity-50"
          >
            {loading ? 'Loading...' : mode === 'login' ? 'Log in' : 'Register'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/
git commit -m "feat: auth screen with login and register"
```

---

## Phase 2: League Game Sessions

### Task 14: League game session + player lock models

**Files:**
- Create: `backend-express/src/models/LeagueGameSession.ts`
- Create: `backend-express/src/models/LeaguePlayerLock.ts`

**Step 1: Create `src/models/LeaguePlayerLock.ts`**

```typescript
import mongoose, { Document, Schema } from 'mongoose';

export interface ILeaguePlayerLock extends Document {
  league_id: mongoose.Types.ObjectId;
  user_id: string;
  game_id: mongoose.Types.ObjectId;
  status: 'active' | 'released';
  locked_at: Date;
  expires_at: Date;
}

const LeaguePlayerLockSchema = new Schema<ILeaguePlayerLock>({
  league_id: { type: Schema.Types.ObjectId, required: true },
  user_id: { type: String, required: true },
  game_id: { type: Schema.Types.ObjectId, required: true },
  status: { type: String, enum: ['active', 'released'], default: 'active' },
  locked_at: { type: Date, default: Date.now },
  expires_at: { type: Date, required: true },
});

// One active lock per (league, user) pair
LeaguePlayerLockSchema.index(
  { league_id: 1, user_id: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } }
);
LeaguePlayerLockSchema.index({ expires_at: 1 });

export const LeaguePlayerLock = mongoose.model<ILeaguePlayerLock>(
  'LeaguePlayerLock',
  LeaguePlayerLockSchema
);
```

**Step 2: Create `src/models/LeagueGameSession.ts`**

```typescript
import mongoose, { Document, Schema } from 'mongoose';

interface RoundDoc {
  round_number: number;
  active_participant_user_ids: string[];
  captain_user_id: string;
  representative_user_id: string;
  winner_side: 'captain' | 'teamB';
  win_type: 'normal' | 'mars' | 'turkish';
  final_per_player_stake: number;
  removed_user_ids: string[];
  balance_changes: Record<string, number>;
}

interface RosterEventDoc {
  type: 'join';
  user_id: string;
  requested_at_round: number;
  effective_from_round: number;
  requested_by: string;
  created_at: Date;
}

export interface ILeagueGameSession extends Document {
  league_id: mongoose.Types.ObjectId;
  created_by: string;
  status: 'active' | 'finished' | 'aborted';
  started_at: Date;
  finished_at: Date | null;
  aborted_at: Date | null;
  aborted_reason: 'manual' | 'idle_timeout' | null;
  last_activity_at: Date;
  participant_user_ids: string[];
  rounds: RoundDoc[];
  roster_events: RosterEventDoc[];
}

const RoundSchema = new Schema<RoundDoc>({
  round_number: Number,
  active_participant_user_ids: [String],
  captain_user_id: String,
  representative_user_id: String,
  winner_side: { type: String, enum: ['captain', 'teamB'] },
  win_type: { type: String, enum: ['normal', 'mars', 'turkish'] },
  final_per_player_stake: Number,
  removed_user_ids: [String],
  balance_changes: { type: Map, of: Number },
}, { _id: false });

const RosterEventSchema = new Schema<RosterEventDoc>({
  type: { type: String, enum: ['join'] },
  user_id: String,
  requested_at_round: Number,
  effective_from_round: Number,
  requested_by: String,
  created_at: { type: Date, default: Date.now },
}, { _id: false });

const LeagueGameSessionSchema = new Schema<ILeagueGameSession>({
  league_id: { type: Schema.Types.ObjectId, required: true, ref: 'League' },
  created_by: { type: String, required: true },
  status: { type: String, enum: ['active', 'finished', 'aborted'], default: 'active' },
  started_at: { type: Date, default: Date.now },
  finished_at: { type: Date, default: null },
  aborted_at: { type: Date, default: null },
  aborted_reason: { type: String, enum: ['manual', 'idle_timeout', null], default: null },
  last_activity_at: { type: Date, default: Date.now },
  participant_user_ids: [String],
  rounds: [RoundSchema],
  roster_events: [RosterEventSchema],
});

LeagueGameSessionSchema.index({ league_id: 1, started_at: -1 });
LeagueGameSessionSchema.index({ participant_user_ids: 1 });
LeagueGameSessionSchema.index({ status: 1, league_id: 1 });

export const LeagueGameSession = mongoose.model<ILeagueGameSession>(
  'LeagueGameSession',
  LeagueGameSessionSchema
);
```

**Step 3: Commit**

```bash
git add backend-express/src/models/
git commit -m "feat: add LeagueGameSession and LeaguePlayerLock models"
```

---

### Task 15: Lock service (atomic multi-player lock acquisition)

**Files:**
- Create: `backend-express/src/services/lockService.ts`

**Step 1: Write the test**

Create `backend-express/src/services/__tests__/lockService.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
// Note: Use MongoMemoryReplSet (not MongoMemoryServer) for transaction support
import { acquireLocks, releaseLocks } from '../lockService';

let mongo: MongoMemoryReplSet;

beforeAll(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.MONGO_URL = mongo.getUri();
  process.env.MONGO_DB = 'test';
  const { connectDB } = await import('../../db');
  await connectDB();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe('lockService', () => {
  it('acquires locks for all users', async () => {
    const leagueId = new mongoose.Types.ObjectId();
    const gameId = new mongoose.Types.ObjectId();
    await acquireLocks(leagueId.toString(), gameId.toString(), ['alice', 'bob']);
    // Should not throw
  });

  it('throws 409 if any user already has an active lock', async () => {
    const leagueId = new mongoose.Types.ObjectId();
    const gameId1 = new mongoose.Types.ObjectId();
    const gameId2 = new mongoose.Types.ObjectId();
    await acquireLocks(leagueId.toString(), gameId1.toString(), ['charlie', 'dave']);
    await expect(
      acquireLocks(leagueId.toString(), gameId2.toString(), ['charlie', 'eve'])
    ).rejects.toMatchObject({ status: 409 });
  });

  it('releases locks after finish', async () => {
    const leagueId = new mongoose.Types.ObjectId();
    const gameId = new mongoose.Types.ObjectId();
    await acquireLocks(leagueId.toString(), gameId.toString(), ['frank', 'grace']);
    await releaseLocks(gameId.toString());
    // Acquiring same users again should succeed
    const gameId2 = new mongoose.Types.ObjectId();
    await expect(
      acquireLocks(leagueId.toString(), gameId2.toString(), ['frank', 'grace'])
    ).resolves.not.toThrow();
  });
});
```

**Step 2: Run test — expect FAIL**

```bash
npm install -D @types/mongodb-memory-server && npm test
```

**Step 3: Create `src/services/lockService.ts`**

```typescript
import mongoose from 'mongoose';
import { LeaguePlayerLock } from '../models/LeaguePlayerLock';
import { AppError } from '../middleware/errorHandler';

const LOCK_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

export async function acquireLocks(
  leagueId: string,
  gameId: string,
  userIds: string[]
): Promise<void> {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      // Check for existing active locks
      const existing = await LeaguePlayerLock.find({
        league_id: leagueId,
        user_id: { $in: userIds },
        status: 'active',
      }).session(session);

      if (existing.length > 0) {
        const busy = existing.map(l => l.user_id);
        throw new AppError(409, `players_busy:${busy.join(',')}`);
      }

      const expires_at = new Date(Date.now() + LOCK_TTL_MS);
      const docs = userIds.map(user_id => ({
        league_id: new mongoose.Types.ObjectId(leagueId),
        user_id,
        game_id: new mongoose.Types.ObjectId(gameId),
        expires_at,
      }));

      await LeaguePlayerLock.insertMany(docs, { session });
    });
  } finally {
    await session.endSession();
  }
}

export async function releaseLocks(gameId: string): Promise<void> {
  await LeaguePlayerLock.updateMany(
    { game_id: gameId, status: 'active' },
    { status: 'released' }
  );
}
```

**Step 4: Run test — expect PASS**

```bash
npm test
```

**Step 5: Commit**

```bash
git add backend-express/src/
git commit -m "feat: lock service with MongoDB transaction support"
```

---

### Task 16: League game routes (start, finish, abort, resume, heartbeat)

**Files:**
- Create: `backend-express/src/routes/leagueGames.ts`
- Modify: `backend-express/src/index.ts`

**Step 1: Create `src/routes/leagueGames.ts`**

```typescript
import { Router } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { LeagueGameSession } from '../models/LeagueGameSession';
import { LeagueMember } from '../models/LeagueMember';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { acquireLocks, releaseLocks } from '../services/lockService';

export const leagueGamesRouter = Router({ mergeParams: true });
leagueGamesRouter.use(requireAuth);

async function assertActiveMember(leagueId: string, username: string) {
  if (!mongoose.isValidObjectId(leagueId)) throw new AppError(404, 'league_not_found');
  const m = await LeagueMember.findOne({ league_id: leagueId, user_id: username, is_active: true });
  if (!m) throw new AppError(403, 'not_a_member');
}

async function assertGameParticipant(gameId: string, username: string) {
  const game = await LeagueGameSession.findById(gameId);
  if (!game) throw new AppError(404, 'game_not_found');
  if (!game.participant_user_ids.includes(username)) throw new AppError(403, 'not_a_participant');
  return game;
}

const StartSchema = z.object({
  participant_user_ids: z.array(z.string()).min(2),
});

const RoundSchema = z.object({
  round_number: z.number(),
  active_participant_user_ids: z.array(z.string()),
  captain_user_id: z.string(),
  representative_user_id: z.string(),
  winner_side: z.enum(['captain', 'teamB']),
  win_type: z.enum(['normal', 'mars', 'turkish']),
  final_per_player_stake: z.number(),
  removed_user_ids: z.array(z.string()),
  balance_changes: z.record(z.number()),
});

const FinishSchema = z.object({
  rounds: z.array(RoundSchema),
});

// POST /leagues/:id/games/start
leagueGamesRouter.post('/start', async (req: AuthRequest, res, next) => {
  try {
    await assertActiveMember(req.params.id, req.username!);
    const { participant_user_ids } = StartSchema.parse(req.body);

    // Verify all participants are active members
    const members = await LeagueMember.find({
      league_id: req.params.id,
      user_id: { $in: participant_user_ids },
      is_active: true,
    });
    if (members.length !== participant_user_ids.length) {
      throw new AppError(400, 'some_participants_not_active_members');
    }

    const game = await LeagueGameSession.create({
      league_id: req.params.id,
      created_by: req.username,
      participant_user_ids,
    });

    await acquireLocks(req.params.id, String(game._id), participant_user_ids);
    res.status(201).json({ game_id: game._id });
  } catch (err) {
    next(err);
  }
});

// POST /leagues/:id/games/:gameId/finish
leagueGamesRouter.post('/:gameId/finish', async (req: AuthRequest, res, next) => {
  try {
    const game = await assertGameParticipant(req.params.gameId, req.username!);
    if (game.status !== 'active') throw new AppError(409, 'game_not_active');

    const { rounds } = FinishSchema.parse(req.body);

    await LeagueGameSession.findByIdAndUpdate(req.params.gameId, {
      status: 'finished',
      finished_at: new Date(),
      rounds,
      last_activity_at: new Date(),
    });
    await releaseLocks(req.params.gameId);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /leagues/:id/games/:gameId/abort
leagueGamesRouter.post('/:gameId/abort', async (req: AuthRequest, res, next) => {
  try {
    const game = await assertGameParticipant(req.params.gameId, req.username!);
    if (game.status !== 'active') throw new AppError(409, 'game_not_active');

    await LeagueGameSession.findByIdAndUpdate(req.params.gameId, {
      status: 'aborted',
      aborted_at: new Date(),
      aborted_reason: 'manual',
      last_activity_at: new Date(),
    });
    await releaseLocks(req.params.gameId);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /leagues/:id/games/:gameId/heartbeat
leagueGamesRouter.post('/:gameId/heartbeat', async (req: AuthRequest, res, next) => {
  try {
    const game = await assertGameParticipant(req.params.gameId, req.username!);
    if (game.status !== 'active') throw new AppError(409, 'game_not_active');
    await LeagueGameSession.findByIdAndUpdate(req.params.gameId, { last_activity_at: new Date() });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /leagues/:id/games/:gameId/resume
leagueGamesRouter.post('/:gameId/resume', async (req: AuthRequest, res, next) => {
  try {
    const game = await LeagueGameSession.findById(req.params.gameId);
    if (!game) throw new AppError(404, 'game_not_found');
    if (!game.participant_user_ids.includes(req.username!)) throw new AppError(403, 'not_a_participant');
    if (game.status !== 'aborted' || game.aborted_reason !== 'idle_timeout') {
      throw new AppError(409, 'game_not_resumable');
    }

    await acquireLocks(req.params.id, req.params.gameId, game.participant_user_ids);
    await LeagueGameSession.findByIdAndUpdate(req.params.gameId, {
      status: 'active',
      aborted_at: null,
      aborted_reason: null,
      last_activity_at: new Date(),
    });

    const lastRound = game.rounds.length > 0 ? game.rounds[game.rounds.length - 1] : null;
    res.json({
      ok: true,
      last_committed_round_number: lastRound?.round_number ?? 0,
      had_discarded_in_progress_round: false,
      resume_mode: 'restart_round',
    });
  } catch (err) {
    next(err);
  }
});

// POST /leagues/:id/games/:gameId/participants
leagueGamesRouter.post('/:gameId/participants', async (req: AuthRequest, res, next) => {
  try {
    const game = await assertGameParticipant(req.params.gameId, req.username!);
    if (game.status !== 'active') throw new AppError(409, 'game_not_active');
    const { target_user_id } = z.object({ target_user_id: z.string() }).parse(req.body);

    const member = await LeagueMember.findOne({
      league_id: req.params.id,
      user_id: target_user_id,
      is_active: true,
    });
    if (!member) throw new AppError(400, 'target_not_active_member');

    await acquireLocks(req.params.id, req.params.gameId, [target_user_id]);

    const currentRound = game.rounds.length;
    await LeagueGameSession.findByIdAndUpdate(req.params.gameId, {
      $push: {
        participant_user_ids: target_user_id,
        roster_events: {
          type: 'join',
          user_id: target_user_id,
          requested_at_round: currentRound,
          effective_from_round: currentRound + 1,
          requested_by: req.username,
          created_at: new Date(),
        },
      },
      last_activity_at: new Date(),
    });

    res.json({ ok: true, effective_from_round: currentRound + 1 });
  } catch (err) {
    next(err);
  }
});

// GET /leagues/:id/games
leagueGamesRouter.get('/', async (req: AuthRequest, res, next) => {
  try {
    await assertActiveMember(req.params.id, req.username!);
    const games = await LeagueGameSession.find(
      { league_id: req.params.id },
      { rounds: 0, roster_events: 0 } // exclude heavy arrays from list
    ).sort({ started_at: -1 }).limit(50);
    res.json(games);
  } catch (err) {
    next(err);
  }
});

// GET /leagues/:id/games/:gameId
leagueGamesRouter.get('/:gameId', async (req: AuthRequest, res, next) => {
  try {
    await assertActiveMember(req.params.id, req.username!);
    const game = await LeagueGameSession.findById(req.params.gameId);
    if (!game) throw new AppError(404, 'game_not_found');
    res.json(game);
  } catch (err) {
    next(err);
  }
});
```

**Step 2: Mount in `src/index.ts`**

```typescript
import { leagueGamesRouter } from './routes/leagueGames';
app.use('/api/leagues/:id/games', leagueGamesRouter);
```

**Step 3: Commit**

```bash
git add backend-express/src/
git commit -m "feat: league game start/finish/abort/resume/heartbeat/participants routes"
```

---

### Task 17: Auto-abort sweeper

**Files:**
- Create: `backend-express/src/services/abortSweeper.ts`
- Modify: `backend-express/src/index.ts`

**Step 1: Create `src/services/abortSweeper.ts`**

```typescript
import cron from 'node-cron';
import { LeagueGameSession } from '../models/LeagueGameSession';
import { releaseLocks } from './lockService';

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export async function runSweep(): Promise<number> {
  const cutoff = new Date(Date.now() - IDLE_TIMEOUT_MS);
  const stale = await LeagueGameSession.find({
    status: 'active',
    last_activity_at: { $lt: cutoff },
  });

  for (const game of stale) {
    // Conditional update: only abort if still active (idempotent)
    const result = await LeagueGameSession.findOneAndUpdate(
      { _id: game._id, status: 'active' },
      {
        status: 'aborted',
        aborted_at: new Date(),
        aborted_reason: 'idle_timeout',
      }
    );
    if (result) {
      await releaseLocks(String(game._id));
    }
  }

  return stale.length;
}

export function startSweeper() {
  // Run every 60 seconds
  cron.schedule('*/1 * * * *', async () => {
    const count = await runSweep();
    if (count > 0) console.log(`[sweeper] auto-aborted ${count} idle games`);
  });
}
```

**Step 2: Start sweeper in `src/index.ts`**

```typescript
import { startSweeper } from './services/abortSweeper';

// Inside start():
startSweeper();
```

**Step 3: Commit**

```bash
git add backend-express/src/
git commit -m "feat: auto-abort sweeper for idle league games"
```

---

## Phase 3: Standings

### Task 18: Standings aggregation pipeline

**Files:**
- Create: `backend-express/src/services/standingsService.ts`
- Create: `backend-express/src/routes/standings.ts`
- Modify: `backend-express/src/index.ts`

**Step 1: Create `src/services/standingsService.ts`**

```typescript
import { LeagueGameSession } from '../models/LeagueGameSession';
import { User } from '../models/User';

export interface StandingsRow {
  user_id: string;
  display_name: string;
  is_active: boolean;
  points: number;
  wins_captain_normal: number;
  wins_captain_mars: number;
  wins_captain_turkish: number;
  wins_representative_normal: number;
  wins_representative_mars: number;
  wins_representative_turkish: number;
}

export async function computeStandings(
  leagueId: string,
  includeInactive: boolean
): Promise<StandingsRow[]> {
  const games = await LeagueGameSession.find({
    league_id: leagueId,
    status: 'finished',
  });

  const stats = new Map<string, Omit<StandingsRow, 'display_name' | 'is_active'>>();

  function ensure(userId: string) {
    if (!stats.has(userId)) {
      stats.set(userId, {
        user_id: userId,
        points: 0,
        wins_captain_normal: 0,
        wins_captain_mars: 0,
        wins_captain_turkish: 0,
        wins_representative_normal: 0,
        wins_representative_mars: 0,
        wins_representative_turkish: 0,
      });
    }
    return stats.get(userId)!;
  }

  for (const game of games) {
    for (const round of game.rounds) {
      const changes = round.balance_changes instanceof Map
        ? Object.fromEntries(round.balance_changes)
        : (round.balance_changes as Record<string, number>);

      for (const [userId, change] of Object.entries(changes)) {
        const s = ensure(userId);
        s.points += change;
      }

      // Captain win counters
      if (round.winner_side === 'captain') {
        const s = ensure(round.captain_user_id);
        if (round.win_type === 'normal') s.wins_captain_normal++;
        else if (round.win_type === 'mars') s.wins_captain_mars++;
        else if (round.win_type === 'turkish') s.wins_captain_turkish++;
      }

      // Representative win counters (teamB wins)
      if (round.winner_side === 'teamB') {
        const s = ensure(round.representative_user_id);
        if (round.win_type === 'normal') s.wins_representative_normal++;
        else if (round.win_type === 'mars') s.wins_representative_mars++;
        else if (round.win_type === 'turkish') s.wins_representative_turkish++;
      }
    }
  }

  // Attach display names and is_active from DB
  const userIds = Array.from(stats.keys());
  const users = await User.find({ username: { $in: userIds } });
  const userMap = new Map(users.map(u => [u.username, u.display_name]));

  const { LeagueMember } = await import('../models/LeagueMember');
  const members = await LeagueMember.find({ league_id: leagueId });
  const memberMap = new Map(members.map(m => [m.user_id, m.is_active]));

  let rows: StandingsRow[] = Array.from(stats.values()).map(s => ({
    ...s,
    display_name: userMap.get(s.user_id) ?? s.user_id,
    is_active: memberMap.get(s.user_id) ?? false,
  }));

  if (!includeInactive) {
    rows = rows.filter(r => r.is_active);
  }

  // Deterministic sort
  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const bTurkish = b.wins_captain_turkish + b.wins_representative_turkish;
    const aTurkish = a.wins_captain_turkish + a.wins_representative_turkish;
    if (bTurkish !== aTurkish) return bTurkish - aTurkish;
    const bMars = b.wins_captain_mars + b.wins_representative_mars;
    const aMars = a.wins_captain_mars + a.wins_representative_mars;
    if (bMars !== aMars) return bMars - aMars;
    const bNormal = b.wins_captain_normal + b.wins_representative_normal;
    const aNormal = a.wins_captain_normal + a.wins_representative_normal;
    if (bNormal !== aNormal) return bNormal - aNormal;
    if (a.display_name !== b.display_name) return a.display_name.localeCompare(b.display_name);
    return a.user_id.localeCompare(b.user_id);
  });

  return rows;
}
```

**Step 2: Write test for standings**

Create `backend-express/src/services/__tests__/standingsService.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { computeStandings } from '../standingsService';
import { LeagueGameSession } from '../../models/LeagueGameSession';
import { User } from '../../models/User';
import { LeagueMember } from '../../models/LeagueMember';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGO_URL = mongo.getUri();
  process.env.MONGO_DB = 'test';
  process.env.JWT_SECRET = 'test-secret';
  const { connectDB } = await import('../../db');
  await connectDB();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

it('computes standings from finished games', async () => {
  const leagueId = new mongoose.Types.ObjectId();
  await User.create([
    { username: 'alice', display_name: 'Alice', password_hash: 'x' },
    { username: 'bob', display_name: 'Bob', password_hash: 'x' },
  ]);
  await LeagueMember.create([
    { league_id: leagueId, user_id: 'alice' },
    { league_id: leagueId, user_id: 'bob' },
  ]);
  await LeagueGameSession.create({
    league_id: leagueId,
    created_by: 'alice',
    status: 'finished',
    participant_user_ids: ['alice', 'bob'],
    rounds: [{
      round_number: 1,
      active_participant_user_ids: ['alice', 'bob'],
      captain_user_id: 'alice',
      representative_user_id: 'bob',
      winner_side: 'captain',
      win_type: 'normal',
      final_per_player_stake: 2,
      removed_user_ids: [],
      balance_changes: { alice: 2, bob: -2 },
    }],
    roster_events: [],
  });

  const rows = await computeStandings(String(leagueId), false);
  expect(rows[0].user_id).toBe('alice');
  expect(rows[0].points).toBe(2);
  expect(rows[0].wins_captain_normal).toBe(1);
  expect(rows[1].user_id).toBe('bob');
  expect(rows[1].points).toBe(-2);
});
```

**Step 3: Run test — expect PASS**

```bash
npm test
```

**Step 4: Create `src/routes/standings.ts`**

```typescript
import { Router } from 'express';
import mongoose from 'mongoose';
import { LeagueMember } from '../models/LeagueMember';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { computeStandings } from '../services/standingsService';

export const standingsRouter = Router({ mergeParams: true });
standingsRouter.use(requireAuth);

standingsRouter.get('/', async (req: AuthRequest, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw new AppError(404, 'league_not_found');
    const member = await LeagueMember.findOne({
      league_id: req.params.id,
      user_id: req.username,
      is_active: true,
    });
    if (!member) throw new AppError(403, 'not_a_member');

    const includeInactive = req.query.include_inactive === 'true';
    const rows = await computeStandings(req.params.id, includeInactive);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});
```

**Step 5: Mount in `src/index.ts`**

```typescript
import { standingsRouter } from './routes/standings';
app.use('/api/leagues/:id/standings', standingsRouter);
```

**Step 6: Commit**

```bash
git add backend-express/src/
git commit -m "feat: standings aggregation with sorting"
```

---

## Phase 3: Frontend League Screens

### Task 19: Add league API calls to `src/api.ts`

**Files:**
- Modify: `src/api.ts`

**Step 1: Add all league API methods**

```typescript
// Leagues
createLeague: (name: string) =>
  request<{ id: string; name: string }>('/leagues', { method: 'POST', body: JSON.stringify({ name }) }),

getLeagues: () =>
  request<{ id: string; name: string; created_by: string }[]>('/leagues'),

getLeague: (id: string) =>
  request<{ id: string; name: string }>(`/leagues/${id}`),

renameLeague: (id: string, name: string) =>
  request<{ id: string; name: string }>(`/leagues/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) }),

// Membership
getMembers: (leagueId: string) =>
  request<{ user_id: string; joined_at: string }[]>(`/leagues/${leagueId}/members`),

leaveLeague: (leagueId: string) =>
  request<{ ok: boolean }>(`/leagues/${leagueId}/leave`, { method: 'POST' }),

// Invites
createInvite: (leagueId: string, invitee_username: string) =>
  request<{ token: string; expires_at: string }>(`/leagues/${leagueId}/invites`, {
    method: 'POST', body: JSON.stringify({ invitee_username }),
  }),

acceptInvite: (token: string) =>
  request<{ ok: boolean; league_id: string }>(`/invites/${token}/accept`, { method: 'POST' }),

// Join code
getJoinCode: (leagueId: string) =>
  request<{ code: string; expires_at: string }>(`/leagues/${leagueId}/join-code`),

createJoinCode: (leagueId: string) =>
  request<{ code: string; expires_at: string }>(`/leagues/${leagueId}/join-code`, { method: 'POST' }),

previewJoin: (code: string) =>
  request<{ league_id: string; league_name: string; member_count: number; expires_at: string }>(
    '/leagues/join/preview', { method: 'POST', body: JSON.stringify({ code }) }
  ),

confirmJoin: (code: string) =>
  request<{ ok: boolean; league_id: string }>('/leagues/join/confirm', {
    method: 'POST', body: JSON.stringify({ code }),
  }),

// Standings
getStandings: (leagueId: string, includeInactive = false) =>
  request<import('./types').StandingsRow[]>(
    `/leagues/${leagueId}/standings?include_inactive=${includeInactive}`
  ),

// Games
startGame: (leagueId: string, participant_user_ids: string[]) =>
  request<{ game_id: string }>(`/leagues/${leagueId}/games/start`, {
    method: 'POST', body: JSON.stringify({ participant_user_ids }),
  }),

finishGame: (leagueId: string, gameId: string, rounds: unknown[]) =>
  request<{ ok: boolean }>(`/leagues/${leagueId}/games/${gameId}/finish`, {
    method: 'POST', body: JSON.stringify({ rounds }),
  }),

abortGame: (leagueId: string, gameId: string) =>
  request<{ ok: boolean }>(`/leagues/${leagueId}/games/${gameId}/abort`, { method: 'POST' }),

getGameHistory: (leagueId: string) =>
  request<unknown[]>(`/leagues/${leagueId}/games`),
```

**Step 2: Add `StandingsRow` to `src/types.ts`**

```typescript
export interface StandingsRow {
  user_id: string;
  display_name: string;
  is_active: boolean;
  points: number;
  wins_captain_normal: number;
  wins_captain_mars: number;
  wins_captain_turkish: number;
  wins_representative_normal: number;
  wins_representative_mars: number;
  wins_representative_turkish: number;
}
```

**Step 3: Commit**

```bash
git add src/
git commit -m "feat: add league API methods and StandingsRow type"
```

---

### Task 20: League home screen

**Files:**
- Modify: `src/screens/LeagueModeScreen.tsx`
- Create: `src/screens/LeagueDetailScreen.tsx`
- Modify: `src/router.tsx`

**Step 1: Implement `src/screens/LeagueModeScreen.tsx`**

```typescript
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function LeagueModeScreen() {
  const [leagues, setLeagues] = useState<{ id: string; name: string }[]>([]);
  const [newName, setNewName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [preview, setPreview] = useState<{ league_id: string; league_name: string; member_count: number } | null>(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.getLeagues().then(setLeagues).catch(console.error);
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const league = await api.createLeague(newName);
      setNewName('');
      setLeagues(prev => [...prev, league]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  }

  async function handlePreview(e: React.FormEvent) {
    e.preventDefault();
    try {
      const p = await api.previewJoin(joinCode);
      setPreview(p);
    } catch {
      setError('Invalid or expired code');
    }
  }

  async function handleConfirmJoin() {
    if (!preview) return;
    try {
      const res = await api.confirmJoin(joinCode);
      navigate(`/league/${res.league_id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  }

  return (
    <div className="min-h-screen p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">League Mode</h1>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">My Leagues</h2>
        {leagues.length === 0 && <p className="text-gray-400">No leagues yet.</p>}
        {leagues.map(l => (
          <button
            key={l.id}
            onClick={() => navigate(`/league/${l.id}`)}
            className="w-full text-left p-3 border rounded-lg mb-2 hover:bg-gray-50"
          >
            {l.name}
          </button>
        ))}
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Create League</h2>
        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="League name"
            required
            className="flex-1 border rounded-lg px-3 py-2"
          />
          <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg">Create</button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Join via Code</h2>
        {!preview ? (
          <form onSubmit={handlePreview} className="flex gap-2">
            <input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Enter code"
              required
              className="flex-1 border rounded-lg px-3 py-2 uppercase"
            />
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg">Preview</button>
          </form>
        ) : (
          <div className="border rounded-lg p-4">
            <p className="font-semibold">{preview.league_name}</p>
            <p className="text-gray-500 text-sm">{preview.member_count} members</p>
            <div className="flex gap-2 mt-3">
              <button onClick={handleConfirmJoin} className="flex-1 bg-green-600 text-white py-2 rounded-lg">Join</button>
              <button onClick={() => setPreview(null)} className="flex-1 bg-gray-100 py-2 rounded-lg">Cancel</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
```

**Step 2: Create `src/screens/LeagueDetailScreen.tsx`** (standings + history + members)

```typescript
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { StandingsRow } from '../types';

type Tab = 'standings' | 'history' | 'members';

export default function LeagueDetailScreen() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('standings');
  const [league, setLeague] = useState<{ id: string; name: string } | null>(null);
  const [standings, setStandings] = useState<StandingsRow[]>([]);
  const [members, setMembers] = useState<{ user_id: string }[]>([]);

  useEffect(() => {
    if (!leagueId) return;
    api.getLeague(leagueId).then(setLeague).catch(console.error);
    api.getStandings(leagueId).then(setStandings).catch(console.error);
    api.getMembers(leagueId).then(setMembers).catch(console.error);
  }, [leagueId]);

  if (!league || !leagueId) return <div className="p-6">Loading...</div>;

  return (
    <div className="min-h-screen p-6 max-w-lg mx-auto">
      <button onClick={() => navigate('/league')} className="text-blue-600 mb-4">← Back</button>
      <h1 className="text-2xl font-bold mb-4">{league.name}</h1>

      <button
        onClick={() => navigate(`/quick-game?league=${leagueId}`)}
        className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold mb-6"
      >
        Start League Game
      </button>

      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1">
        {(['standings', 'history', 'members'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-md capitalize text-sm font-medium ${tab === t ? 'bg-white shadow' : 'text-gray-500'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'standings' && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="pb-2">Player</th>
              <th className="pb-2 text-right">Pts</th>
              <th className="pb-2 text-right">W(C)</th>
              <th className="pb-2 text-right">W(R)</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row, i) => (
              <tr key={row.user_id} className="border-b last:border-0">
                <td className="py-2">{i + 1}. {row.display_name}</td>
                <td className="py-2 text-right font-mono">{row.points}</td>
                <td className="py-2 text-right text-gray-500">
                  {row.wins_captain_normal}/{row.wins_captain_mars}/{row.wins_captain_turkish}
                </td>
                <td className="py-2 text-right text-gray-500">
                  {row.wins_representative_normal}/{row.wins_representative_mars}/{row.wins_representative_turkish}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === 'members' && (
        <ul className="space-y-2">
          {members.map(m => (
            <li key={m.user_id} className="p-3 border rounded-lg">{m.user_id}</li>
          ))}
        </ul>
      )}

      {tab === 'history' && (
        <p className="text-gray-400">Game history coming in Phase 4.</p>
      )}
    </div>
  );
}
```

**Step 3: Add route to `src/router.tsx`**

```typescript
import LeagueDetailScreen from './screens/LeagueDetailScreen';

// Add to router:
{
  path: '/league/:leagueId',
  element: <RequireAuth><LeagueDetailScreen /></RequireAuth>,
},
```

**Step 4: Commit**

```bash
git add src/
git commit -m "feat: league home and detail screens"
```

---

### Task 21: Final deploy + smoke test

**Step 1: Build and verify frontend**

```bash
npm run build
# Should complete with no TypeScript errors
```

**Step 2: Push and verify backend deploy**

```bash
git push origin main
```

**Step 3: Smoke test checklist**

- [ ] Register a new user → lands on home screen
- [ ] Create a league → appears in "My Leagues"
- [ ] Generate a join code → code appears
- [ ] Second user registers, joins via code with preview → member list updates
- [ ] Start a league game from detail screen → continues into existing game flow
- [ ] Finish game → standings table updates
- [ ] Leave league → league disappears from "My Leagues"

**Step 4: Commit any fixes, then tag**

```bash
git tag v0.2.0-league-mvp
git push origin v0.2.0-league-mvp
```

---

## What comes after (Phase 4)

- Game history tab with round-by-round breakdown
- Spectator link integration with `league_id` metadata
- Between-rounds "add player" UI in active game
- Invite by username UI on league detail screen
- Profile stats expansion (losses, per-role breakdowns)

---

## Notes carried from design review

1. `code_encrypted` was replaced with `code` (plaintext) in `LeagueJoinCode` model — join codes are revocable temporary tokens, not passwords.
2. Resume auth checks `participant_user_ids` array, not "active" status — documented in `leagueGames.ts`.
3. `GET /join-code` returns `404` with `{ error: "no_active_code" }` when no active code exists.
