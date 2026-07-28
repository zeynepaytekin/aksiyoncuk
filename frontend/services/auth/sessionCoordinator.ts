type RefreshHandler = () => Promise<string | null>;
type ClearHandler = () => void;

let accessToken: string | null = null;
let refreshHandler: RefreshHandler | null = null;
let clearHandler: ClearHandler | null = null;
let refreshPromise: Promise<string | null> | null = null;

export const sessionCoordinator = {
  getAccessToken(): string | null {
    return accessToken;
  },

  setAccessToken(token: string | null): void {
    accessToken = token;
  },

  configure(refresh: RefreshHandler, clear: ClearHandler): void {
    refreshHandler = refresh;
    clearHandler = clear;
  },

  async refreshAccessToken(): Promise<string | null> {
    if (!refreshHandler) return null;
    if (!refreshPromise) {
      refreshPromise = refreshHandler().finally(() => {
        refreshPromise = null;
      });
    }
    return refreshPromise;
  },

  clearSession(): void {
    accessToken = null;
    clearHandler?.();
  },
};
