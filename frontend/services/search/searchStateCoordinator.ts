type Handler = (authenticated: boolean) => void;
let handler: Handler = () => undefined;

export const searchStateCoordinator = {
  configure(next: Handler) {
    handler = next;
  },
  authenticationChanged(authenticated: boolean) {
    handler(authenticated);
  },
};
