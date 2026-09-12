import { userRepository } from "../repositories/userRepository";
import { authService } from "./authService";
import { AppError } from "../utils/AppError";
import { Role } from "@prisma/client";

export const userService = {
  list: () => userRepository.list(),

  async getById(id: string) {
    const user = await userRepository.findById(id);
    if (!user) throw AppError.notFound("User not found");
    return { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt };
  },

  create: (data: { name: string; email: string; password: string; role: Role }) =>
    authService.createUser(data),

  async update(id: string, data: Partial<{ name: string; email: string; role: Role }>) {
    await this.getById(id);
    const user = await userRepository.update(id, data);
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  },

  async remove(id: string) {
    await this.getById(id);
    return userRepository.remove(id);
  },
};
