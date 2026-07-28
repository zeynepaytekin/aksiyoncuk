type Handler = (authenticated: boolean) => void;
let handler: Handler = () => undefined;

export const networkStateCoordinator = {
  configure(next: Handler): void {
    handler = next;
  },
  authenticationChanged(authenticated: boolean): void {
    handler(authenticated);
  },
};
