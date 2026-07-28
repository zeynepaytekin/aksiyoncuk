type AuthenticationChangeHandler = (authenticated: boolean) => void;

let handler: AuthenticationChangeHandler = () => undefined;

export const worksStateCoordinator = {
  configure(nextHandler: AuthenticationChangeHandler): void {
    handler = nextHandler;
  },

  authenticationChanged(authenticated: boolean): void {
    handler(authenticated);
  },
};
