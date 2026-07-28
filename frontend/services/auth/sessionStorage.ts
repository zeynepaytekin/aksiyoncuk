import { STORAGE_KEYS } from "@/constants/storage";
import {
  readStorage,
  removeStorage,
  writeStorage,
} from "@/services/storage/clientStorage";

export type PersistedSession = {
  refreshToken: string;
  refreshTokenExpiresAt: string;
};

function isPersistedSession(value: unknown): value is PersistedSession {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.refreshToken === "string" &&
    typeof candidate.refreshTokenExpiresAt === "string"
  );
}

export const sessionStorage = {
  read(): PersistedSession | null {
    const value = readStorage<unknown>(STORAGE_KEYS.authSession, null);
    return isPersistedSession(value) ? value : null;
  },

  write(session: PersistedSession): void {
    writeStorage(STORAGE_KEYS.authSession, session);
  },

  clear(): void {
    removeStorage(STORAGE_KEYS.authSession);
    removeStorage(STORAGE_KEYS.legacyUser);
  },
};
