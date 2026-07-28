type CountAdjustmentHandler = (postId: string, delta: number) => void;

let countAdjustmentHandler: CountAdjustmentHandler = () => undefined;

export const postCommentCountCoordinator = {
  configure(handler: CountAdjustmentHandler): void {
    countAdjustmentHandler = handler;
  },

  adjust(postId: string, delta: number): void {
    countAdjustmentHandler(postId, delta);
  },
};
