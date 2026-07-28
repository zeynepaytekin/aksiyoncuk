type AuthenticationHandler = () => void;
type PostDeletedHandler = (postId: string) => void;

let authenticationHandler: AuthenticationHandler = () => undefined;
let postDeletedHandler: PostDeletedHandler = () => undefined;

export const commentsStateCoordinator = {
  configure(
    onAuthenticationChanged: AuthenticationHandler,
    onPostDeleted: PostDeletedHandler,
  ): void {
    authenticationHandler = onAuthenticationChanged;
    postDeletedHandler = onPostDeleted;
  },

  authenticationChanged(): void {
    authenticationHandler();
  },

  postDeleted(postId: string): void {
    postDeletedHandler(postId);
  },
};
