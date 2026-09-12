import { Role } from "@prisma/client";
import { projectRepository } from "../repositories/projectRepository";
import { AppError } from "../utils/AppError";
import { AuthenticatedUser } from "../types";
import { projectScopeFor } from "./scopes";

// scopeFor is now shared as projectScopeFor() in ./scopes — see that file
// for why this exists as a single choke point.

export const projectService = {
  async list(user: AuthenticatedUser, page: number, limit: number) {
    const [items, total] = await projectRepository.list(projectScopeFor(user), (page - 1) * limit, limit);
    return { items, total, page, limit };
  },

  // Fetches a project AND enforces ownership in one step: a PM asking for
  // another PM's project, or a developer asking for a project they have no
  // task in, gets 404 — not "here's the project but you can't edit it" —
  // so IDs can't be used to enumerate other people's data either.
  async getForUser(id: string, user: AuthenticatedUser) {
    const project = await projectRepository.findById(id);
    if (!project) throw AppError.notFound("Project not found");

    if (user.role === Role.ADMIN) return project;
    if (user.role === Role.PROJECT_MANAGER) {
      if (project.createdById !== user.id) throw AppError.notFound("Project not found");
      return project;
    }
    // DEVELOPER
    const hasAccess = await projectRepository.hasDeveloperTask(id, user.id);
    if (!hasAccess) throw AppError.notFound("Project not found");
    return project;
  },

  async create(user: AuthenticatedUser, data: { name: string; description?: string; clientId: string }) {
    // Only Admin/PM may create — enforced additionally by route middleware,
    // this is the ownership stamp that later scoping relies on.
    return projectRepository.create({ ...data, createdById: user.id });
  },

  async update(
    id: string,
    user: AuthenticatedUser,
    data: Partial<{ name: string; description: string; clientId: string }>
  ) {
    const project = await this.assertMutable(id, user);
    return projectRepository.update(project.id, data);
  },

  async remove(id: string, user: AuthenticatedUser) {
    const project = await this.assertMutable(id, user);
    return projectRepository.remove(project.id);
  },

  // Admin can mutate any project. A PM can only mutate a project THEY
  // created — a PM can never edit/delete another PM's project even with a
  // valid, unforged token and a correct-shaped request.
  async assertMutable(id: string, user: AuthenticatedUser) {
    const project = await projectRepository.findById(id);
    if (!project) throw AppError.notFound("Project not found");
    if (user.role === Role.ADMIN) return project;
    if (user.role === Role.PROJECT_MANAGER && project.createdById === user.id) return project;
    throw AppError.forbidden("You do not have access to this project");
  },

  // Used by the socket layer when a client asks to join project:{id} — must
  // independently re-verify access server-side; never trust the client's
  // claim that it's allowed to see this project.
  async userCanAccessProject(id: string, user: AuthenticatedUser) {
    try {
      await this.getForUser(id, user);
      return true;
    } catch {
      return false;
    }
  },
};