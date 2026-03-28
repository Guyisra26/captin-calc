const TOKEN_KEY = 'captainCalc_jwt';
const NAME_KEY = 'captainCalc_displayName';

export function saveAuth(token: string, displayName: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(NAME_KEY, displayName);
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(NAME_KEY);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getDisplayName(): string | null {
  return localStorage.getItem(NAME_KEY);
}

export function isLoggedIn(): boolean {
  return !!getToken();
}
