export const rooms = {
  project: (projectId: string) => `project:${projectId}`,
  user: (userId: string) => `user:${userId}`,
  globalActivity: "global:activity",
  presence: "presence",
};
