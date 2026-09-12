export const queryKeys = {
  me: ["me"] as const,
  projects: (params: unknown) => ["projects", params] as const,
  project: (id: string) => ["project", id] as const,
  tasks: (params: unknown) => ["tasks", params] as const,
  task: (id: string) => ["task", id] as const,
  activity: (scope?: string) => ["activity", scope] as const,
  notifications: (params: unknown) => ["notifications", params] as const,
  unreadCount: ["notifications", "unread-count"] as const,
  clients: ["clients"] as const,
  users: ["users"] as const,
};
