# Firebase Auth Gate — Design Document

**Date:** 2026-07-03

## Goal
Stop unauthorized people from using the app (a friends-only tool whose link spread).
Gate the ENTIRE app behind Firebase Authentication (Google sign-in) + an email
allowlist, and lock the Realtime Database so room sync requires auth.

## Threat model / honesty
The app is a static SPA — its JS always loads; a determined attacker can bypass a
client-side React gate. Real server-side enforcement lives in the Realtime Database
Security Rules (room + log data requires `auth != null`). The client gate + allowlist
stops all casual/normal use, which is the actual problem here. Game state itself is
local-first (localStorage) — nothing sensitive is server-side except the shared rooms.

## Two layers
1. **Client gate (blocks the UI):** on load, resolve Firebase auth state.
   - not signed in → sign-in screen (Google one-tap / popup, redirect fallback).
   - signed in but email not in allowlist → "no access" screen + sign out.
   - signed in + allowlisted → the app renders as today (incl. spectator mode).
2. **Server enforcement (locks the data):** Realtime Database rules require
   `auth != null` at the root. All REST sync calls (rooms + logs) attach the user's
   Firebase ID token via `?auth=<token>`.

## Allowlist
A lowercase-email constant in the client (`ALLOWLIST`). Adding a friend = one line +
redeploy. Initial: `guyisr234@gmail.com`. (Server rules enforce only "authenticated";
the allowlist is enforced in the client. This keeps the list in one place; if stricter
server-side allowlisting is wanted later, mirror the emails into the DB rules.)

## Files
- `src/firebase.ts` — export `app`; add `getAuth(app)`.
- `src/authGate.ts` (new) — `auth`, `ALLOWLIST`, `isAllowed(user)`, `signInWithGoogle()`
  (popup + redirect fallback + `getRedirectResult`), `signOutUser()`, `subscribeAuth(cb)`,
  `getIdToken()`.
- `src/components/AuthGate.tsx` (new) — dark-premium sign-in and no-access screens.
- `src/App.tsx` — outermost auth gate (loading → signin → denied → app).
- `src/firebaseSync.ts`, `src/firebaseLog.ts` — attach `?auth=<idToken>` to REST calls.
- `src/components/GameScreen.tsx` — "Sign out" item in the menu.
- `database.rules.json` (new) + `firebase.json` — root `auth != null` rules.

## Manual (Firebase Console, user-only)
1. Authentication → Sign-in method → enable Google.
2. Authentication → Settings → Authorized domains: `captin-calculator.web.app`, `localhost`.
Rules are deployed via `firebase deploy --only database` by us.

## Verification
- `npm run build` + `npx vitest run` (8 tests) pass.
- Unauthed load shows the sign-in screen; the game is not reachable.
- After enabling the Google provider (manual): allowlisted email → app; other Google
  account → no-access screen; sign out returns to the sign-in screen.
- With DB rules deployed, an unauthenticated REST read of `/rooms` is denied.
