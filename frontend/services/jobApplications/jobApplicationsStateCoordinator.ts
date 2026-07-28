type Handler = () => void;
let handler: Handler = () => undefined;

export const jobApplicationsStateCoordinator = {
  configure(next: Handler): void {
    handler = next;
  },
  clearPrivate(): void {
    handler();
  },
};
