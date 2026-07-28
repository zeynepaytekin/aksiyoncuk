type Handler = (jobId: string, delta: number) => void;
let handler: Handler = () => undefined;

export const jobApplicationCountCoordinator = {
  configure(next: Handler): void {
    handler = next;
  },
  adjust(jobId: string, delta: number): void {
    handler(jobId, delta);
  },
};
