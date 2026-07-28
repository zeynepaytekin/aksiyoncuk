let clearPrivateProfile: (() => void) | null = null;

export const profileStateCoordinator = {
  configure(clear: () => void): void {
    clearPrivateProfile = clear;
  },

  clearPrivate(): void {
    clearPrivateProfile?.();
  },
};
