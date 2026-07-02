# League Mode — Design Document

**Date:** 2026-05-05

---

## Goal

Keep existing game/reducer logic unchanged and add persistent league functionality.

League mode should provide:
- Account-based usage.
- League creation and joining.
- League-scoped game sessions.
- League standings that are statistics-only.

---

## Core Principles

1. **Gameplay and standings are separate concerns**
- Active game state is the calculator session.
- League standings are post-game statistics only.

2. **Standings update only on `Finish Game`**
- No standings update during active game.
- `aborted` games do not update standings.

3. **No game-logic rewrite**
- Same round flow, same scoring rules, same reducer behavior.

---

## Final MVP Decisions

1. **Authenticated-only app**
- No guest access to the app.
- User must login/register before using Quick Game or League Mode.

2. **Entry split (after login)**
- `Quick Game`
- `League Mode`

3. **Quick Game policy**
- Session-only.
- No history persistence.
- No league standings impact.

4. **League equality model**
- All users are `member` in MVP.
- No owner gameplay advantage.
- A member may leave league, but members cannot remove other members.
- Any active member can rename league display name in MVP.

5. **Membership removal policy**
- Supported action is `self-leave` only.
- No "remove another user" endpoint in MVP.
- Self-leave is reversible: rejoin reactivates the same membership record (`is_active=true`) instead of creating a new row.

6. **Join methods**
- Personal invite by username (registered users only).
- League join code.

7. **Register-first policy**
- If friend is not registered, they cannot accept personal invite yet.
- They register first, then join (invite or code).

8. **Join code preview before commit**
- User sees league info before confirming join.

9. **Start game permission**
- Any active member can start league game.

10. **Concurrency safety**
- A user can be in only one active league game per league.
- Server locks enforce this.

11. **Mid-game participant additions**
- Allowed only between rounds.
- Effective from next round.

12. **Finished games are immutable**
- Finished league games are append-only (no edit/delete in MVP).

13. **Auto-abort behavior**
- Stale active games can auto-abort.
- Auto-abort releases locks and does not update standings.

14. **Resume after idle auto-abort**
- If abort reason is `idle_timeout`, game can be resumed by reacquiring locks.
- If any required player is busy, resume fails with `409`.

---

## Standings Metrics (MVP)

At `Finish Game`, standings aggregation updates per user with:

1. `points`
2. `wins_captain_normal`
3. `wins_captain_mars`
4. `wins_captain_turkish`
5. `wins_representative_normal`
6. `wins_representative_mars`
7. `wins_representative_turkish`

- `losses_*` counters are intentionally out of MVP scope and deferred to a later phase.

Important clarification:
- `teamB` is a side.
- `representative` is one specific player.
- Representative-win counters are credited only to the actual representative in that round.

Personal profile stats can be expanded later, after core MVP implementation.

---

## Data Model (MongoDB)

### 1) `users`

```json
{
  "_id": "ObjectId",
  "username": "string (unique)",
  "display_name": "string",
  "password_hash": "string",
  "created_at": "datetime"
}
```

### 2) `leagues`

```json
{
  "_id": "ObjectId",
  "name": "string",
  "created_by": "ObjectId(user)",
  "created_at": "datetime",
  "status": "active"
}
```

### 3) `league_members`

```json
{
  "_id": "ObjectId",
  "league_id": "ObjectId(league)",
  "user_id": "ObjectId(user)",
  "joined_at": "datetime",
  "left_at": "datetime | null",
  "rejoined_at": "datetime | null",
  "is_active": true
}
```

Indexes:
- unique `(league_id, user_id)`

Rejoin behavior:
- Rejoin updates existing membership row (`is_active=false -> true`) rather than inserting a new row.

### 4) `league_invites` (personal invites)

```json
{
  "_id": "ObjectId",
  "league_id": "ObjectId(league)",
  "invited_by": "ObjectId(user)",
  "invitee_username": "string",
  "token": "string (unique)",
  "status": "pending | accepted | revoked | expired",
  "expires_at": "datetime",
  "created_at": "datetime"
}
```

Rule:
- `POST /invites/{token}/accept` requires JWT, must verify `auth.username == invitee_username`, and reactivates inactive membership if membership already exists.

### 5) `league_join_codes`

```json
{
  "_id": "ObjectId",
  "league_id": "ObjectId(league)",
  "code_hash": "string",
  "code_encrypted": "string",
  "status": "active | revoked | expired",
  "expires_at": "datetime",
  "created_by": "ObjectId(user)",
  "created_at": "datetime"
}
```


Indexes:
- unique partial index on `(league_id)` where `status='active'` (enforces one active join code per league)

Rotation behavior:
- `create/rotate` revokes the current active code, then creates the new active code in one transaction.

Read behavior:
- `GET /leagues/{league_id}/join-code` returns the active plaintext code from `code_encrypted` (decrypted server-side) and `expires_at`.

### 6) `league_game_sessions`

```json
{
  "_id": "ObjectId",
  "league_id": "ObjectId(league)",
  "created_by": "ObjectId(user)",
  "status": "active | finished | aborted",
  "started_at": "datetime",
  "finished_at": "datetime | null",
  "aborted_at": "datetime | null",
  "aborted_reason": "manual | idle_timeout | null",
  "last_activity_at": "datetime",
  "participant_user_ids": ["ObjectId(user)"],
  "rounds": [
    {
      "round_number": 1,
      "active_participant_user_ids": ["ObjectId(user)"],
      "captain_user_id": "ObjectId(user)",
      "representative_user_id": "ObjectId(user)",
      "winner_side": "captain | teamB",
      "win_type": "normal | mars | turkish",
      "final_per_player_stake": 4,
      "removed_user_ids": ["ObjectId(user)"],
      "balance_changes": { "<user_id>": -4, "<user_id>": 4 }
    }
  ],
  "roster_events": [
    {
      "type": "join",
      "user_id": "ObjectId(user)",
      "requested_at_round": 3,
      "effective_from_round": 4,
      "requested_by": "ObjectId(user)",
      "created_at": "datetime"
    }
  ]
}
```

### 7) `league_player_locks`

```json
{
  "_id": "ObjectId",
  "league_id": "ObjectId(league)",
  "user_id": "ObjectId(user)",
  "game_id": "ObjectId(league_game_session)",
  "status": "active | released",
  "locked_at": "datetime",
  "expires_at": "datetime"
}
```

Indexes:
- partial unique `(league_id, user_id)` where `status='active'`

---

## Backend API Design

Base prefix: `/api`

### Auth
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

### Leagues
- `POST /leagues`
- `GET /leagues`
- `GET /leagues/{league_id}`
- `PATCH /leagues/{league_id}` (name updates only in MVP; allowed for any active league member)

### Membership
- `GET /leagues/{league_id}/members`
- `POST /leagues/{league_id}/leave` (self only)

### Personal Invites
- `POST /leagues/{league_id}/invites`
- `GET /leagues/{league_id}/invites` (returns invites created by caller only; default `status=pending`; supports optional `status` filter)
- `POST /invites/{token}/accept` (reactivates inactive membership if membership already exists)

### Join Code
- `GET /leagues/{league_id}/join-code` (returns current active join code + expires_at to active league member)
- `POST /leagues/{league_id}/join-code` (create/rotate)
- `DELETE /leagues/{league_id}/join-code` (revoke)
- `POST /leagues/join/preview` (returns league name + member count + expiry)
- `POST /leagues/join` (confirm join; reactivates inactive membership if membership already exists)

### League Gameplay
- `POST /leagues/{league_id}/games/start`
- `POST /leagues/{league_id}/games/{game_id}/participants` (between rounds only; requested by an active current participant to add `target_user_id`)
- `POST /leagues/{league_id}/games/{game_id}/heartbeat`
- `POST /leagues/{league_id}/games/{game_id}/finish`
- `POST /leagues/{league_id}/games/{game_id}/abort`
- `POST /leagues/{league_id}/games/{game_id}/resume` (idle-timeout aborts only)
- `GET /leagues/{league_id}/games`
- `GET /leagues/{league_id}/games/{game_id}`
- `GET /leagues/{league_id}/standings` (default `include_inactive=false`; optional `include_inactive=true`)

Authorization:
- Must be active member for league actions.
- Any active member can rename league, start games, read/create invites, and read/rotate join codes in MVP equality model.
- `finish`/`abort`/`resume`/`heartbeat` are allowed only for active participants of that specific game.
- `participants` (add-player) is requested by an active current participant and targets a league member passed as `target_user_id`.

---

## Concurrency and Auto-Abort Spec

### Locking
- On `start`, acquire locks for all participants.
- On add-participant, acquire lock for added user.
- On `finish`/`abort`, release all game locks.

### Atomicity
- Multi-player lock acquisition runs inside Mongo transaction.
- Requires transaction-capable deployment (Replica Set / Atlas).

### Inactivity definition
A game is `inactive` if:
- `status='active'` and
- `now - last_activity_at > idle_timeout_seconds`.

`last_activity_at` updates on:
- start
- round commit
- add participant
- heartbeat
- finish
- abort

### Timeout value
- MVP default: `idle_timeout_seconds = 900` (15 minutes)

### Abort trigger mechanism
- Background sweeper every 60 seconds marks stale games as `aborted` with reason `idle_timeout`.
- Request-time guard also checks staleness before mutating an active game.

### Auto-abort effects
- Set `status='aborted'`, `aborted_reason='idle_timeout'`, `aborted_at`.
- Release locks.
- Do not modify standings.

### Resume behavior
- Allowed only for `aborted` games with `aborted_reason='idle_timeout'`.
- Resume tries to reacquire required locks.
- If lock collision exists, return `409 Conflict`.

### Resume state restoration
- Only committed rounds are durable checkpoints.
- If timeout happened mid-round (round started but not committed), that in-progress round is discarded on resume.
- Resume continues from the last committed round state; frontend starts a fresh next round from that checkpoint.
- Recommended response fields for resume/get-game: `last_committed_round_number`, `had_discarded_in_progress_round`, `resume_mode=restart_round`.

---

## Standings Computation

Source:
- Only games with `status='finished'`.

Rules:
- `points` from sum of per-round `balance_changes`.
- `wins_captain_*` increments when round winner is captain side for the current round captain.
- `wins_representative_*` increments when round winner is teamB side for the current round representative.
- Non-representative Team B players do not receive win counters in MVP; they only affect `points`.

Sorting (deterministic):
1. `points` desc
2. `(wins_captain_turkish + wins_representative_turkish)` desc
3. `(wins_captain_mars + wins_representative_mars)` desc
4. `(wins_captain_normal + wins_representative_normal)` desc
5. `display_name` asc
6. `user_id` asc

Excluded:
- active games
- aborted games

Departed-member visibility:
- Historical stats for departed members are retained.
- `GET /leagues/{league_id}/standings` hides inactive members by default (`include_inactive=false`).
- With `include_inactive=true`, response includes both active and departed members with `is_active` flag.

---

## Frontend Flow

1. User lands on auth screen (`login/register`).
2. After login, user chooses `Quick Game` or `League Mode`.
3. `Quick Game`: local session only, no saved history.
4. `League Mode`: create/join/select league.
5. Join by code uses preview + confirm flow.
6. League game runs with existing gameplay behavior.
7. Finish game updates league standings.

---

## Delivery Phases

### Phase 1
- Unified auth gating
- League create/list
- Membership list + self-leave
- Personal invites + join code preview/confirm

### Phase 2
- Game start/finish/abort
- Lock lifecycle + race prevention
- Heartbeat + auto-abort + resume

### Phase 3
- Standings aggregation with captain/representative win counters
- Between-round participant add flow
- League history UX

### Phase 4
- Spectator/read-only integration polish
- Additional profile statistics

---

## Open Questions

None.

---

## Acceptance Criteria (MVP)

- Unauthenticated users cannot use the app.
- Registered user can login and access Quick Game or League Mode.
- Quick Game is playable but not persisted.
- User can create league and join league (invite or code with preview).
- User can leave league themselves; cannot remove other users.
- Rejoin reactivates the existing membership row (`is_active=true`) rather than creating a duplicate.
- Any active member can start a league game.
- Overlapping participation is blocked by server locks.
- Add player works only between rounds and starts next round.
- Idle active game can auto-abort and can be resumed if locks are available.
- Resume restarts from last committed round checkpoint; uncommitted in-progress round is discarded.
- Standings update only on `Finish Game`.
- Standings endpoint returns deterministic ordering by the defined tie-break sort.
- Departed members are hidden by default and can be included with `include_inactive=true`.
- Aborted games do not affect standings.
- Finished league games cannot be edited/deleted.

---

## Implementation Note

Planning-only document. No code implementation in this phase.
