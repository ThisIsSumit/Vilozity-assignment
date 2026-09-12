export type Role = "ADMIN" | "PROJECT_MANAGER" | "DEVELOPER";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export type AuthenticatedUser = User;

export interface AccessTokenPayload {
  sub: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export interface Client {
  id: string;
  name: string;
  email: string;
  company: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  clientId: string;
  createdById: string;
  createdAt: string;
  client: { id: string; name: string; company: string };
  createdBy: { id: string; name: string; email: string };
  _count: { tasks: number };
}

export interface Task {
  id: string;
  number: number;
  projectId: string;
  title: string;
  description?: string | null;
  assignedDeveloperId?: string | null;
  status: TaskStatus;
  priority: Priority;
  dueDate?: string | null;
  isOverdue: boolean;
  createdAt: string;
  updatedAt: string;
  project: { id: string; name: string; createdById: string };
  assignedDeveloper?: { id: string; name: string; email: string } | null;
}

export interface ActivityItem {
  activityId: string;
  projectId: string;
  taskId: string | null;
  taskNumber: number | null;
  taskTitle: string | null;
  userId: string;
  userName: string;
  action: string;
  oldValue?: string | null;
  newValue?: string | null;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface DashboardSummary {
  totalProjects: number;
  totalTasks: number;
  tasksByStatus: Record<TaskStatus, number>;
  overdueCount: number;
  tasksByPriority?: Record<Priority, number>;
  upcomingDueThisWeek?: number;
}