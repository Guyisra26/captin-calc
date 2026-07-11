import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { app } from "./firebase";

export const auth = getAuth(app);

// Allowlist of permitted emails (lowercase). Add a friend = add a line + redeploy.
const ALLOWLIST = [
  "guyisr234@gmail.com",
  "yardenbla1@gmail.com",
  "adirpoldian5443@gmail.com",
  "benhanono2@gmail.com",
  "nissfarchi29@gmail.com",
  "guyisraeli08@gmail.com",
].map((e) => e.toLowerCase());

export function isAllowed(user: User | null): boolean {
  const email = user?.email?.toLowerCase();
  return !!email && ALLOWLIST.includes(email);
}

const provider = new GoogleAuthProvider();

export async function signInWithGoogle(): Promise<void> {
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    const code = (e as { code?: string })?.code ?? "";
    if (
      code === "auth/popup-closed-by-user" ||
      code === "auth/cancelled-popup-request"
    ) {
      return; // user aborted — no-op
    }
    if (
      code === "auth/popup-blocked" ||
      code === "auth/operation-not-supported-in-this-environment"
    ) {
      await signInWithRedirect(auth, provider);
      return;
    }
    throw e;
  }
}

export function signOutUser(): Promise<void> {
  return signOut(auth);
}

export function subscribeAuth(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, cb);
}

export async function getIdToken(): Promise<string | null> {
  return auth.currentUser ? auth.currentUser.getIdToken() : null;
}

// Complete any pending redirect sign-in on load.
getRedirectResult(auth).catch(() => {});

export type { User } from "firebase/auth";
