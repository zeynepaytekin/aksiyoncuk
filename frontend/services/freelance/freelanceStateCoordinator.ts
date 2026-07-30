type Listener = (authenticated: boolean) => void;
let listener: Listener | null = null;
export const freelanceStateCoordinator = {
  configure(value: Listener) { listener = value; },
  authenticationChanged(authenticated: boolean) { listener?.(authenticated); },
};
