// Wrong-code lockout rules: 5 wrong codes lock the app for 30 seconds,
// each repeated lockout doubles the wait (30s, 60s, 2m, 4m ...), capped at 1 hour.

export const MAX_ATTEMPTS = 5;
export const BASE_LOCK_SECONDS = 30;
export const MAX_LOCK_SECONDS = 60 * 60;

export interface LockoutState {
  failed: number; // wrong codes since the last lock / success
  lockLevel: number; // how many lockouts have happened in a row
  lockedUntil: number; // epoch ms, 0 when not locked
}

export const emptyLockout: LockoutState = { failed: 0, lockLevel: 0, lockedUntil: 0 };

export function lockSecondsForLevel(level: number): number {
  // level 1 = first lockout
  const secs = BASE_LOCK_SECONDS * Math.pow(2, Math.max(0, level - 1));
  return Math.min(secs, MAX_LOCK_SECONDS);
}

export function isLocked(state: LockoutState, now: number): boolean {
  return state.lockedUntil > now;
}

export function registerFailure(state: LockoutState, now: number): LockoutState {
  const failed = state.failed + 1;
  if (failed >= MAX_ATTEMPTS) {
    const lockLevel = state.lockLevel + 1;
    return { failed: 0, lockLevel, lockedUntil: now + lockSecondsForLevel(lockLevel) * 1000 };
  }
  return { ...state, failed };
}

export function registerSuccess(): LockoutState {
  return { ...emptyLockout };
}

export function attemptsLeft(state: LockoutState): number {
  return MAX_ATTEMPTS - state.failed;
}
