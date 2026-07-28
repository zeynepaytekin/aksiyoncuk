type AuthenticationChangeHandler = (authenticated: boolean) => void;

let authenticationChangeHandler: AuthenticationChangeHandler = () => undefined;

export const postsStateCoordinator = {
  configure(handler: AuthenticationChangeHandler): void {
    authenticationChangeHandler = handler;
  },

  authenticationChanged(authenticated: boolean): void {
    authenticationChangeHandler(authenticated);
  },
};
