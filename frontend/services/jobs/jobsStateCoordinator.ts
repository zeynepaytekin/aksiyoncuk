type Handler = (authenticated: boolean) => void;
let handler: Handler = () => undefined;

export const jobsStateCoordinator = {
  configure(next: Handler): void { handler = next; },
  authenticationChanged(authenticated: boolean): void { handler(authenticated); },
};
